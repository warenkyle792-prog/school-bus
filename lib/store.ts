/**
 * Persisted fleet registry.
 *
 * In production this is a Postgres table (with RLS scoped per school). Here it
 * is a JSON file on disk so registrations survive a server restart, plus an
 * shared cache so the hot snapshot path never re-parses the file.
 *
 * Writes are serialised through a promise chain: two tabs submitting at once
 * can't interleave a read-modify-write.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type RegisteredDriver = {
  id: string;
  name: string;
  phone: string;
  licence: string;
  yearsExp: number;
  createdAt: string;
};

export type RegisteredBus = {
  id: string;
  plate: string;
  model: string;
  capacity: number;
  routeId: string;
  /** assigned driver; null until the school assigns one */
  driverId: string | null;
  attendantName: string;
  trackerId: string;
  note: string;
  status: "active" | "maintenance";
  /** latitude/longitude override — most schools place the bus on its route */
  createdAt: string;
  createdBy: string;
};

type Registry = {
  version: 1;
  buses: RegisteredBus[];
  drivers: RegisteredDriver[];
};

const DATA_DIR = process.env.SAFIRI_DATA_DIR ?? path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "fleet.json");

const empty: Registry = { version: 1, buses: [], drivers: [] };

/**
 * The cache lives on globalThis, not in module scope.
 *
 * Next bundles server code per route, so `/api/fleet` and `/console` each get
 * their own copy of this module. A module-level cache meant the console cached
 * an empty registry at boot and never saw a bus registered through the API —
 * the bus persisted to disk and appeared in the API, but not on the screen.
 * Sharing one cache (and revalidating it against the file's mtime) fixes that.
 */
type CachedRegistry = { mtimeMs: number; data: Registry };
type GlobalWithStore = typeof globalThis & { __safiri_registry__?: CachedRegistry | null };

const g = globalThis as GlobalWithStore;
let writeChain: Promise<unknown> = Promise.resolve();

async function readRegistry(): Promise<Registry> {
  try {
    const stat = await fs.stat(DATA_FILE);
    const cached = g.__safiri_registry__;
    // Another route bundle may have written since we last looked; the file's
    // mtime is the cheap, authoritative signal.
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.data;

    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Registry;
    const data =
      Array.isArray(parsed.buses) && Array.isArray(parsed.drivers) ? parsed : empty;
    g.__safiri_registry__ = { mtimeMs: stat.mtimeMs, data };
    return data;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      // A corrupt file must not take the whole console down — start clean and
      // let the next write heal it.
      console.warn(`[store] could not read ${DATA_FILE}:`, code ?? err);
    }
    g.__safiri_registry__ = null;
    return empty;
  }
}

async function persist(next: Registry): Promise<void> {
  const run = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Write to a temp file then rename: a crash mid-write can't truncate the
    // registry, which would lose every bus the school registered.
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
    await fs.rename(tmp, DATA_FILE);
    const stat = await fs.stat(DATA_FILE);
    g.__safiri_registry__ = { mtimeMs: stat.mtimeMs, data: next };
  };
  writeChain = writeChain.then(run, run);
  await writeChain;
}

export async function listRegistry(): Promise<Registry> {
  return readRegistry();
}

export type CreateBusInput = Omit<RegisteredBus, "id" | "createdAt" | "createdBy">;
export type CreateDriverInput = Omit<RegisteredDriver, "id" | "createdAt">;

export async function registerBus(input: CreateBusInput, createdBy = "Nadia Karemi") {
  const current = await readRegistry();
  const plate = input.plate.trim().toUpperCase().replace(/\s+/g, " ");

  // A plate is the physical identity of a vehicle — duplicates break GPS routing.
  if (current.buses.some((b) => b.plate.toUpperCase() === plate)) {
    throw new Error(`A bus with plate ${plate} is already registered.`);
  }
  if (input.driverId && current.buses.some((b) => b.driverId === input.driverId && b.status === "active")) {
    throw new Error("That driver is already assigned to an active bus.");
  }

  const bus: RegisteredBus = {
    ...input,
    plate,
    id: `bus-${randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    createdBy,
  };
  await persist({ ...current, buses: [...current.buses, bus] });
  return bus;
}

export async function registerDriver(input: CreateDriverInput) {
  const current = await readRegistry();
  const phone = input.phone.trim();
  if (current.drivers.some((d) => d.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""))) {
    throw new Error("A driver with that phone number is already registered.");
  }
  const driver: RegisteredDriver = {
    ...input,
    phone,
    name: input.name.trim(),
    licence: input.licence.trim().toUpperCase(),
    id: `drv-${randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
  };
  await persist({ ...current, drivers: [...current.drivers, driver] });
  return driver;
}

/** Registers a driver and immediately puts them on a bus, so "add a driver"
 *  never leaves the school with a roster entry they then can't dispatch. */
export async function registerDriverForBus(busId: string, input: CreateDriverInput) {
  const driver = await registerDriver(input);
  const bus = await assignDriver(busId, driver.id);
  return { driver, bus };
}

export async function assignDriver(busId: string, driverId: string | null) {
  const current = await readRegistry();
  const target = current.buses.find((b) => b.id === busId);
  if (!target) throw new Error("Bus not found.");
  if (driverId) {
    if (!current.drivers.some((d) => d.id === driverId)) throw new Error("Driver not found.");
    const taken = current.buses.find(
      (b) => b.id !== busId && b.driverId === driverId && b.status === "active"
    );
    if (taken) throw new Error(`That driver is already on ${taken.plate}.`);
  }
  const buses = current.buses.map((b) => (b.id === busId ? { ...b, driverId } : b));
  await persist({ ...current, buses });
  return buses.find((b) => b.id === busId)!;
}

export async function setBusStatus(busId: string, status: RegisteredBus["status"]) {
  const current = await readRegistry();
  const buses = current.buses.map((b) => (b.id === busId ? { ...b, status } : b));
  if (!buses.some((b) => b.id === busId)) throw new Error("Bus not found.");
  await persist({ ...current, buses });
  return buses.find((b) => b.id === busId)!;
}

export async function removeBus(busId: string) {
  const current = await readRegistry();
  const buses = current.buses.filter((b) => b.id !== busId);
  if (buses.length === current.buses.length) throw new Error("Bus not found.");
  await persist({ ...current, buses });
}

/** Test helper — drops the in-memory cache so the next read hits disk. */
export function __resetCache() {
  g.__safiri_registry__ = null;
}

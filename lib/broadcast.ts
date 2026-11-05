/**
 * School → guardians broadcasts.
 *
 * The transport desk composes one message for a route; every guardian with a
 * child on that bus receives it in the parent app. Stored server-side so the
 * message is still there after a reload, and so a delivery channel (SMS/push)
 * can be attached in one place later.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type BroadcastPriority = "emergency" | "delay" | "info";

export type Broadcast = {
  id: string;
  routeId: string;
  busId: string;
  title: string;
  body: string;
  priority: BroadcastPriority;
  sentBy: string;
  sentAtMs: number;
  /** how many guardians this reached */
  recipients: number;
  channel: "in-app";
};

type Store = { version: 1; broadcasts: Broadcast[] };

const DATA_DIR = process.env.SAFIRI_DATA_DIR ?? path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "broadcasts.json");

let cache: Store | null = null;
let chain: Promise<unknown> = Promise.resolve();

async function read(): Promise<Store> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Store;
    cache = Array.isArray(parsed.broadcasts) ? parsed : { version: 1, broadcasts: [] };
  } catch {
    cache = { version: 1, broadcasts: [] };
  }
  return cache;
}

async function persist(next: Store) {
  cache = next;
  const run = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
    await fs.rename(tmp, DATA_FILE);
  };
  chain = chain.then(run, run);
  await chain;
}

export async function listBroadcasts(routeId?: string): Promise<Broadcast[]> {
  const store = await read();
  const all = [...store.broadcasts].sort((a, b) => b.sentAtMs - a.sentAtMs);
  return routeId ? all.filter((b) => b.routeId === routeId) : all;
}

export async function createBroadcast(input: {
  routeId: string;
  busId: string;
  title: string;
  body: string;
  priority: BroadcastPriority;
  sentBy: string;
  recipients: number;
}): Promise<Broadcast> {
  const store = await read();
  const message: Broadcast = {
    ...input,
    id: `bc-${randomUUID().slice(0, 8)}`,
    sentAtMs: Date.now(),
    channel: "in-app",
  };
  // keep the last 200 per school; this is an operational log, not an archive
  const broadcasts = [message, ...store.broadcasts].slice(0, 200);
  await persist({ version: 1, broadcasts });
  return message;
}

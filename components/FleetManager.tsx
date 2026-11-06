"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, StatusPill } from "./ui";
import { cx } from "@/lib/format";
import type { Snapshot } from "@/lib/types";

type RegisteredDriver = {
  id: string;
  name: string;
  phone: string;
  licence: string;
  yearsExp: number;
  createdAt: string;
};

type RegisteredBus = {
  id: string;
  plate: string;
  model: string;
  capacity: number;
  routeId: string;
  driverId: string | null;
  attendantName: string;
  trackerId: string;
  note: string;
  status: "active" | "maintenance";
  createdAt: string;
  createdBy: string;
};

type Registry = { buses: RegisteredBus[]; drivers: RegisteredDriver[] };

type Props = {
  snapshot: Snapshot;
  onShowOnMap: (busId: string) => void;
};

const PLATE_HINT = "KDL 412X";

export default function FleetManager({ snapshot, onShowOnMap }: Props) {
  const [registry, setRegistry] = useState<Registry>({ buses: [], drivers: [] });
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"list" | "bus" | "driver">("list");

  const refresh = async () => {
    const res = await fetch("/api/fleet", { cache: "no-store" });
    if (res.ok) setRegistry(await res.json());
    setLoaded(true);
  };

  useEffect(() => {
    refresh();
  }, []);

  // A registered bus only counts as "on GPS" while it appears in the live snapshot.
  const liveIds = useMemo(() => new Set(snapshot.buses.map((b) => b.id)), [snapshot.buses]);
  const liveBuses = registry.buses.filter((b) => liveIds.has(b.id));
  const unassigned = registry.buses.filter((b) => !b.driverId);
  const driverBusy = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of registry.buses) if (b.driverId) map.set(b.driverId, b.plate);
    return map;
  }, [registry.buses]);

  return (
    <div className="space-y-2.5">
      {/* summary */}
      <div className="card p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="label">Registered fleet</p>
            <p className="num mt-1 text-[20px] leading-none font-semibold">
              {registry.buses.length}
              <span className="ml-1 text-[11px] font-normal text-ink-500">buses</span>
            </p>
          </div>
          <div className="text-right">
            <p className="num text-[12px] font-semibold text-brand-600">{liveBuses.length} on GPS</p>
            <p className="text-[10.5px] text-ink-500">
              {unassigned.length > 0 ? `${unassigned.length} without a driver` : "all drivers assigned"}
            </p>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode(mode === "bus" ? "list" : "bus")}
            className={cx(
              "rounded-full py-2 text-[11.5px] font-bold transition",
              mode === "bus"
                ? "bg-brand-600 text-canvas"
                : "bg-brand-600 text-canvas hover:bg-brand-500"
            )}
          >
            + Register bus
          </button>
          <button
            onClick={() => setMode(mode === "driver" ? "list" : "driver")}
            className="rounded-full border border-line bg-paper-2 py-2 text-[11.5px] font-semibold text-ink-800 transition hover:border-ink-300"
          >
            + Add driver
          </button>
        </div>
      </div>

      {mode === "bus" && (
        <BusForm
          drivers={registry.drivers}
          routes={snapshot.routes}
          onDone={async () => {
            await refresh();
            setMode("list");
          }}
          onCancel={() => setMode("list")}
        />
      )}

      {mode === "driver" && (
        <DriverForm
          onDone={async () => {
            await refresh();
            setMode("list");
          }}
          onCancel={() => setMode("list")}
        />
      )}

      {mode === "list" && !loaded && (
        <p className="px-2 py-6 text-center text-[11.5px] text-ink-500">Loading fleet registry…</p>
      )}

      {mode === "list" && loaded && registry.buses.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-4 text-center">
          <p className="text-[12px] font-semibold text-ink-800">No buses registered yet</p>
        </div>
      )}

      {mode === "list" &&
        registry.buses.map((bus) => {
          const live = snapshot.buses.find((b) => b.id === bus.id);
          const driver = registry.drivers.find((d) => d.id === bus.driverId);
          const route = snapshot.routes.find((r) => r.id === bus.routeId);
          return (
            <div key={bus.id} className="card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="num text-[12.5px] font-semibold">{bus.plate}</span>
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: route?.color ?? "#8b8f96" }}
                    />
                    <span className="truncate text-[10.5px] text-ink-500">{route?.code}</span>
                  </div>
                  <p className="truncate text-[11px] text-ink-500">
                    {bus.model} · {bus.capacity} seats
                  </p>
                </div>
                {live ? (
                  <StatusPill status={live.status} size="sm" />
                ) : (
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                    Off GPS
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2 rounded-lg bg-ink-50 px-2 py-1.5">
                {driver ? (
                  <>
                    <Avatar name={driver.name} hue={30} size={20} />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-ink-700">{driver.name}</span>
                    <span className="num text-[10px] text-ink-500">{driver.licence}</span>
                  </>
                ) : (
                  <span className="text-[11px] font-medium text-sun-600">No driver assigned</span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-1.5">
                <select
                  value={bus.driverId ?? ""}
                  onChange={async (e) => {
                    const driverId = e.target.value || null;
                    await fetch(`/api/fleet/${bus.id}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ driverId }),
                    });
                    refresh();
                  }}
                  className="min-w-0 flex-1 rounded-md border border-line bg-paper px-1.5 py-1 text-[10.5px] text-ink-800 outline-none focus:border-brand-400"
                >
                  <option value="">Assign driver…</option>
                  {registry.drivers.map((d) => (
                    <option key={d.id} value={d.id} disabled={driverBusy.has(d.id) && driverBusy.get(d.id) !== bus.plate}>
                      {d.name}
                      {driverBusy.has(d.id) && driverBusy.get(d.id) !== bus.plate ? " (on duty)" : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onShowOnMap(bus.id)}
                  className="rounded-md border border-line bg-paper-2 px-2 py-1 text-[10.5px] font-semibold text-ink-700 hover:border-brand-300"
                >
                  Show on map
                </button>
                <button
                  onClick={async () => {
                    await fetch(`/api/fleet/${bus.id}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ status: bus.status === "active" ? "maintenance" : "active" }),
                    });
                    refresh();
                  }}
                  title={bus.status === "active" ? "Send to maintenance" : "Return to service"}
                  className="rounded-md border border-line bg-paper-2 px-1.5 py-1 text-[10.5px] text-ink-500 hover:border-ink-300"
                >
                  {bus.status === "active" ? "🛠" : "✓"}
                </button>
              </div>

              {!bus.trackerId && (
                <p className="mt-1.5 text-[10px] font-medium text-sun-600">No tracker paired</p>
              )}
            </div>
          );
        })}

      {mode === "list" && registry.drivers.length > 0 && (
        <div className="card p-3">
          <p className="label">Drivers on file · {registry.drivers.length}</p>
          <div className="mt-2 space-y-1.5">
            {registry.drivers.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <Avatar name={d.name} hue={40} size={22} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-ink-800">{d.name}</p>
                  <p className="num truncate text-[9.5px] text-ink-500">{d.phone}</p>
                </div>
                <span
                  className={cx(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                    driverBusy.has(d.id) ? "bg-brand-100 text-brand-600" : "bg-ink-100 text-ink-500"
                  )}
                >
                  {driverBusy.get(d.id) ?? "available"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Register bus ─────────────────────────────────────────────────────── */

function BusForm({
  drivers,
  routes,
  onDone,
  onCancel,
}: {
  drivers: RegisteredDriver[];
  routes: Snapshot["routes"];
  onDone: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    plate: "",
    model: "Toyota Coaster",
    capacity: "33",
    routeId: routes[0]?.id ?? "",
    driverId: "",
    attendantName: "",
    trackerId: "",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/fleet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "bus", ...form, capacity: Number(form.capacity), driverId: form.driverId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not register the bus.");
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the bus.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card rise p-3.5">
      <div className="flex items-center justify-between">
        <p className="label">Register a bus</p>
        <button type="button" onClick={onCancel} className="text-[10.5px] text-ink-500 hover:text-ink-800">
          Cancel
        </button>
      </div>

      <div className="mt-2.5 space-y-2">
        <Field label="Number plate">
          <input
            required
            value={form.plate}
            onChange={(e) => set("plate", e.target.value.toUpperCase())}
            placeholder={PLATE_HINT}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Model">
            <input value={form.model} onChange={(e) => set("model", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Seats">
            <input
              type="number"
              min={8}
              max={90}
              value={form.capacity}
              onChange={(e) => set("capacity", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Route">
          <select value={form.routeId} onChange={(e) => set("routeId", e.target.value)} className={inputCls}>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} · {r.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Assign driver" hint={drivers.length === 0 ? "Add a driver first" : undefined}>
          <select value={form.driverId} onChange={(e) => set("driverId", e.target.value)} className={inputCls}>
            <option value="">Unassigned</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.licence}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Attendant">
            <input
              value={form.attendantName}
              onChange={(e) => set("attendantName", e.target.value)}
              placeholder="Optional"
              className={inputCls}
            />
          </Field>
          <Field label="GPS tracker ID">
            <input
              value={form.trackerId}
              onChange={(e) => set("trackerId", e.target.value)}
              placeholder="TRK-0091"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {error && <p className="mt-2 rounded-md bg-berry-100 px-2 py-1.5 text-[10.5px] text-berry-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-3 w-full rounded-full bg-brand-600 py-2 text-[11.5px] font-bold text-canvas transition hover:bg-brand-500 disabled:opacity-60"
      >
        {saving ? "Registering…" : "Register bus"}
      </button>
    </form>
  );
}

/* ── Add driver ───────────────────────────────────────────────────────── */

function DriverForm({ onDone, onCancel }: { onDone: () => Promise<void> | void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", licence: "", yearsExp: "5" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/fleet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "driver", ...form, yearsExp: Number(form.yearsExp) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not register the driver.");
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the driver.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card rise p-3.5">
      <div className="flex items-center justify-between">
        <p className="label">Add a driver</p>
        <button type="button" onClick={onCancel} className="text-[10.5px] text-ink-500 hover:text-ink-800">
          Cancel
        </button>
      </div>
      <div className="mt-2.5 space-y-2">
        <Field label="Full name">
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Alice Wanjiku" />
        </Field>
        <Field label="Phone">
          <input required value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="+254 712 345 678" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Licence no.">
            <input required value={form.licence} onChange={(e) => set("licence", e.target.value)} className={inputCls} placeholder="DL-998811" />
          </Field>
          <Field label="Years driving">
            <input type="number" min={0} max={50} value={form.yearsExp} onChange={(e) => set("yearsExp", e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>
      {error && <p className="mt-2 rounded-md bg-berry-100 px-2 py-1.5 text-[10.5px] text-berry-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-3 w-full rounded-full bg-brand-600 py-2 text-[11.5px] font-bold text-canvas transition hover:bg-brand-500 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save driver"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-line bg-paper px-2 py-1.5 text-[11.5px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 flex items-baseline justify-between">
        <span className="text-[9.5px] font-semibold tracking-wide text-ink-500 uppercase">{label}</span>
        {hint && <span className="text-[9px] text-ink-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

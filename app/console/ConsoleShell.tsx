"use client";

import { useMemo, useState } from "react";
import AppBar from "@/components/AppBar";
import FleetMap from "@/components/FleetMap";
import BusDetail from "@/components/BusDetail";
import { useLiveSnapshot } from "@/lib/useLiveSnapshot";
import { Avatar, LiveBadge, OccupancyBar, Ring, RouteChip, StatusPill } from "@/components/ui";
import { cx, fmtDuration, relTime, signedMin } from "@/lib/format";
import type { Bus, Snapshot } from "@/lib/types";

export default function ConsoleShell() {
  const { snapshot, error } = useLiveSnapshot(1300);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [focusRouteId, setFocusRouteId] = useState<string | null>(null);
  const [detailBusId, setDetailBusId] = useState<string | null>(null);
  const [tab, setTab] = useState<"fleet" | "alerts" | "log">("fleet");

  if (!snapshot) return <ConsoleSkeleton error={error} />;

  const selected = snapshot.buses.find((b) => b.id === selectedBusId) ?? null;
  const detailBus = snapshot.buses.find((b) => b.id === detailBusId) ?? null;

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <AppBar
        clock={snapshot.clockLabel}
        right={
          <div className="flex items-center gap-2">
            <LiveBadge label="GPS live" />
            <div className="hidden items-center gap-2 rounded-full border border-line bg-paper-2 py-1 pr-3 pl-1 sm:flex">
              <Avatar name="Nadia Karemi" hue={150} size={22} />
              <span className="text-[12px] font-medium text-ink-700">Nadia</span>
            </div>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[300px_minmax(0,1fr)_330px] lg:overflow-hidden">
        {/* ── Fleet rail ───────────────────────────────────────────── */}
        <aside className="flex min-h-0 max-h-[42vh] flex-col border-b border-line lg:max-h-none lg:border-r lg:border-b-0">
          <div className="shrink-0 px-4 pt-4 pb-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="label">Fleet</p>
                <p className="mt-1 text-2xl leading-none font-semibold tracking-tight">
                  {snapshot.kpis.busesActive}
                  <span className="text-sm font-normal text-ink-400"> / {snapshot.kpis.busesTotal} out</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setFocusRouteId(null);
                  setSelectedBusId(null);
                }}
                className={cx(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  focusRouteId
                    ? "border-line bg-paper-2 text-ink-600 hover:border-ink-300"
                    : "border-transparent bg-ink-900 text-paper-2"
                )}
              >
                All routes
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
            {snapshot.buses.map((bus) => (
              <BusRow
                key={bus.id}
                bus={bus}
                snapshot={snapshot}
                active={selectedBusId === bus.id}
                onClick={() => {
                  setSelectedBusId(bus.id === selectedBusId ? null : bus.id);
                  setFocusRouteId(bus.routeId);
                }}
                onOpen={() => setDetailBusId(bus.id)}
              />
            ))}

            <div className="mx-1 mt-4 rounded-xl border border-dashed border-line bg-paper-2/50 p-3">
              <p className="label">Next departure</p>
              <p className="mt-1.5 text-[13px] font-semibold">Afternoon run · 15:40</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">
                5 buses assigned. Driver confirmations open at 15:10.
              </p>
            </div>
          </div>
        </aside>

        {/* ── Map ──────────────────────────────────────────────────── */}
        <main className="relative flex min-h-[440px] flex-col p-3 lg:min-h-0 lg:p-4">
          <KpiStrip snapshot={snapshot} />

          <div className="relative mt-3 min-h-0 flex-1 overflow-hidden rounded-[1.35rem] border border-line">
            <FleetMap
              snapshot={snapshot}
              selectedBusId={selectedBusId}
              onSelect={setSelectedBusId}
              focusRouteId={focusRouteId}
              onFocusRoute={setFocusRouteId}
              onOpenBus={setDetailBusId}
            />

            {/* map overlay: route filter */}
            <div className="absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
              {snapshot.routes.map((r) => (
                <RouteChip
                  key={r.id}
                  code={r.code}
                  color={r.color}
                  active={focusRouteId === r.id}
                  onClick={() => setFocusRouteId(focusRouteId === r.id ? null : r.id)}
                />
              ))}
            </div>

            {/* map overlay: legend + scale */}
            <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-full border border-line/80 bg-paper-2/90 px-3 py-1.5 backdrop-blur">
              <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-ink-600">
                <span className="size-1.5 rounded-full bg-brand-500" /> Moving
              </span>
              <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-ink-600">
                <span className="size-1.5 rounded-full bg-sun-500" /> Delayed
              </span>
              <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-ink-600">
                <span className="size-1.5 rounded-full bg-berry-500" /> Incident
              </span>
              <span className="num text-[10.5px] text-ink-400">2 km</span>
            </div>

            {selected && (
              <div className="absolute right-3 bottom-3 left-3 sm:left-auto sm:w-[330px]">
                <SelectedBusCard
                  bus={selected}
                  snapshot={snapshot}
                  onClose={() => setSelectedBusId(null)}
                  onOpen={() => setDetailBusId(selected.id)}
                />
              </div>
            )}
          </div>
        </main>

        {/* ── Activity / alerts ───────────────────────────────────── */}
        <aside className="flex min-h-[360px] flex-col border-t border-line lg:min-h-0 lg:border-t-0 lg:border-l">
          <div className="flex shrink-0 gap-1 border-b border-line p-2">
            {(["fleet", "alerts", "log"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cx(
                  "flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold capitalize transition",
                  tab === t ? "bg-ink-100 text-ink-900" : "text-ink-500 hover:text-ink-800"
                )}
              >
                {t === "fleet" ? "Readiness" : t === "alerts" ? "Alerts" : "Activity"}
                {t === "alerts" && snapshot.kpis.openAlerts > 0 && (
                  <span className="ml-1.5 rounded-full bg-berry-500 px-1.5 text-[10px] font-bold text-white">
                    {snapshot.kpis.openAlerts}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {tab === "fleet" && <Readiness snapshot={snapshot} />}
            {tab === "alerts" && <Alerts snapshot={snapshot} onOpenBus={setDetailBusId} />}
            {tab === "log" && <ActivityLog snapshot={snapshot} />}
          </div>
        </aside>
      </div>

      {detailBus && (
        <BusDetail
          bus={detailBus}
          snapshot={snapshot}
          onClose={() => setDetailBusId(null)}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

function KpiStrip({ snapshot }: { snapshot: Snapshot }) {
  const { kpis } = snapshot;
  const items = [
    {
      label: "Students on board",
      value: kpis.studentsOnBoard,
      suffix: `/ ${kpis.studentsTotal}`,
      ring: Math.round((kpis.studentsOnBoard / kpis.studentsTotal) * 100),
    },
    {
      label: "On time",
      value: `${kpis.onTimePct}%`,
      suffix: kpis.avgDelaySec > 0 ? `avg +${Math.round(kpis.avgDelaySec / 60)} min` : "no delays",
      ring: kpis.onTimePct,
      tone: kpis.onTimePct >= 80 ? "brand" : "sun",
    },
    {
      label: "Open alerts",
      value: kpis.openAlerts,
      suffix: kpis.openAlerts === 0 ? "all clear" : kpis.openAlerts === 1 ? "needs action" : "need action",
      ring: kpis.openAlerts === 0 ? 100 : 100 - kpis.openAlerts * 22,
      tone: kpis.openAlerts > 0 ? "berry" : "brand",
    },
    {
      label: "Attendance",
      value: `${kpis.attendancePct}%`,
      suffix: "confirmed today",
      ring: kpis.attendancePct,
    },
  ] as const;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="card flex items-center gap-3 px-3.5 py-2.5">
          <Ring
            value={it.ring}
            size={38}
            stroke={4}
            color={
              ("tone" in it && it.tone === "berry") ? "#cf2f52" : ("tone" in it && it.tone === "sun") ? "#e08210" : "#0e7c5a"
            }
          />
          <div className="min-w-0">
            <p className="truncate text-[10.5px] font-semibold tracking-wide text-ink-500 uppercase">{it.label}</p>
            <p className="num text-[17px] leading-tight font-semibold">
              {it.value}
              <span className="ml-1 text-[11px] font-normal text-ink-400">{it.suffix}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BusRow({
  bus,
  snapshot,
  active,
  onClick,
  onOpen,
}: {
  bus: Bus;
  snapshot: Snapshot;
  active: boolean;
  onClick: () => void;
  onOpen: () => void;
}) {
  const route = snapshot.routes.find((r) => r.id === bus.routeId)!;
  const driver = snapshot.drivers.find((d) => d.id === bus.driverId)!;
  const nextStop = route.stops.find((s) => s.id === bus.nextStopId);

  return (
    <div
      className={cx(
        "group mb-1 rounded-xl border px-2.5 py-2.5 transition",
        active ? "border-ink-900/12 bg-paper-2 shadow-sm" : "border-transparent hover:bg-paper-2/70"
      )}
    >
      <button onClick={onClick} className="flex w-full items-start gap-2.5 text-left">
        <span
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-white"
          style={{ background: bus.status === "breakdown" ? "#cf2f52" : route.color }}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 16V8a2 2 0 0 1 2-2h8l2 3v7" strokeLinecap="round" />
            <circle cx="8" cy="16.6" r="1.2" />
            <circle cx="15" cy="16.6" r="1.2" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-semibold">{route.code}</span>
            <StatusPill status={bus.status} size="sm" />
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-ink-500">{driver.name}</span>
        </span>
      </button>

      <div className="mt-2 flex items-center gap-2 pl-[42px]">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-[10.5px] text-ink-500">
            <span className="num">
              {bus.onBoard}/{bus.capacity}
            </span>
            <span className="num">{bus.speedKph} kph</span>
          </div>
          <OccupancyBar bus={bus} />
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between pl-[42px]">
        <span className="truncate text-[10.5px] text-ink-400">
          {bus.status === "breakdown" ? "Stopped · recovery en route" : `Next · ${nextStop?.name ?? "—"}`}
        </span>
        <span className="flex items-center gap-1">
          <span className="num text-[10.5px] font-medium text-ink-500">
            {bus.delaySec > 120 ? signedMin(bus.delaySec) : fmtDuration(bus.etaSec)}
          </span>
          <button
            onClick={onOpen}
            className="rounded p-0.5 text-ink-300 opacity-0 transition group-hover:opacity-100 hover:bg-ink-100 hover:text-ink-700"
            aria-label="Open bus detail"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </span>
      </div>
    </div>
  );
}

function SelectedBusCard({
  bus,
  snapshot,
  onClose,
  onOpen,
}: {
  bus: Bus;
  snapshot: Snapshot;
  onClose: () => void;
  onOpen: () => void;
}) {
  const route = snapshot.routes.find((r) => r.id === bus.routeId)!;
  const driver = snapshot.drivers.find((d) => d.id === bus.driverId)!;
  const attendant = snapshot.attendants.find((a) => a.id === bus.attendantId)!;
  const idx = route.stops.findIndex((s) => s.id === bus.nextStopId);

  return (
    <div className="rise card overflow-hidden p-3.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: route.color }}>
            <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 16V8a2 2 0 0 1 2-2h8l2 3v7" strokeLinecap="round" />
              <circle cx="8" cy="16.6" r="1.2" />
              <circle cx="15" cy="16.6" r="1.2" />
            </svg>
          </span>
          <div>
            <p className="text-[13.5px] leading-tight font-semibold">
              {route.code} · {bus.plate}
            </p>
            <p className="text-[11.5px] text-ink-500">{route.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusPill status={bus.status} size="sm" />
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-y border-line py-2.5">
        <Stat label="On board" value={`${bus.onBoard}`} sub={`/ ${bus.capacity}`} />
        <Stat label="Speed" value={`${bus.speedKph}`} sub="kph" />
        <Stat label="To school" value={fmtDuration(bus.etaSec)} sub={bus.direction === "afternoon" ? "drop-off" : "pickup"} />
      </div>

      <div className="mt-2.5 space-y-1.5">
        <Row label="Next stop" value={route.stops[idx]?.name ?? "—"} />
        <Row label="Driver" value={driver.name} extra={driver.phone} />
        <Row label="Attendant" value={attendant.name} />
        <Row label="Last ping" value={`${bus.lastPingSec}s ago`} />
      </div>

      <button
        onClick={onOpen}
        className="mt-3 w-full rounded-lg bg-ink-900 py-2 text-[12px] font-semibold text-paper-2 transition hover:bg-ink-800"
      >
        Open live trip sheet
      </button>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wide text-ink-400 uppercase">{label}</p>
      <p className="num text-[15px] leading-tight font-semibold">
        {value}
        {sub && <span className="ml-0.5 text-[10.5px] font-normal text-ink-400">{sub}</span>}
      </p>
    </div>
  );
}

function Row({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-[11px] text-ink-400">{label}</span>
      <span className="truncate text-right text-[11.5px] font-medium text-ink-800">
        {value}
        {extra && <span className="num ml-1.5 text-[10.5px] font-normal text-ink-400">{extra}</span>}
      </span>
    </div>
  );
}

function Alerts({ snapshot, onOpenBus }: { snapshot: Snapshot; onOpenBus: (id: string) => void }) {
  const [ack, setAck] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-2">
      {snapshot.alerts.map((a) => {
        const bus = snapshot.buses.find((b) => b.id === a.busId);
        const route = snapshot.routes.find((r) => r.id === a.routeId);
        const done = a.acknowledged || ack[a.id];
        const tone =
          a.severity === "critical"
            ? { bg: "bg-berry-100", text: "text-berry-600", dot: "bg-berry-500", label: "Critical" }
            : a.severity === "warning"
              ? { bg: "bg-sun-100", text: "text-sun-600", dot: "bg-sun-500", label: "Warning" }
              : { bg: "bg-ink-100", text: "text-ink-600", dot: "bg-ink-400", label: "Info" };

        return (
          <div key={a.id} className={cx("rounded-xl border p-2.5", done ? "border-line/70 bg-paper-2/60" : "border-berry-500/25 bg-berry-100/40")}>
            <div className="flex items-center justify-between gap-2">
              <span className={cx("inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase", tone.bg, tone.text)}>
                <span className={cx("size-1.5 rounded-full", tone.dot)} />
                {tone.label}
              </span>
              <span className="num text-[10px] text-ink-400">{relTime(a.atSec, snapshot.simSec)}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-snug font-semibold">{a.title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{a.body}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <button
                onClick={() => onOpenBus(a.busId)}
                className="rounded-md border border-line bg-paper-2 px-2 py-1 text-[10.5px] font-semibold text-ink-700 hover:border-ink-300"
              >
                {route?.code ?? "Bus"} trip sheet
              </button>
              {!done && (
                <button
                  onClick={() => setAck((p) => ({ ...p, [a.id]: true }))}
                  className="rounded-md bg-ink-900 px-2 py-1 text-[10.5px] font-semibold text-paper-2 hover:bg-ink-800"
                >
                  Acknowledge
                </button>
              )}
              {done && <span className="text-[10.5px] text-ink-400">Acknowledged</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityLog({ snapshot }: { snapshot: Snapshot }) {
  return (
    <ol className="relative space-y-0.5">
      {snapshot.events.map((ev, i) => {
        const bus = snapshot.buses.find((b) => b.id === ev.busId);
        const route = snapshot.routes.find((r) => r.id === bus?.routeId);
        const tone =
          ev.kind === "board" ? "bg-brand-500" : ev.kind === "drop" ? "bg-sky-500" : ev.kind === "alert" ? "bg-berry-500" : "bg-ink-300";
        return (
          <li key={`${ev.id}-${i}`} className="relative flex gap-2.5 pb-3 pl-1">
            <span className="relative mt-1.5 flex w-2 shrink-0 justify-center">
              {i !== snapshot.events.length - 1 && (
                <span className="absolute top-2 bottom-[-14px] w-px bg-line" />
              )}
              <span className={cx("size-1.5 rounded-full", tone)} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] leading-snug text-ink-800">{ev.text}</p>
              <p className="num mt-0.5 text-[10px] text-ink-400">
                {route?.code} · {relTime(ev.atSec, snapshot.simSec)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Readiness({ snapshot }: { snapshot: Snapshot }) {
  const fuel = snapshot.buses.reduce((a, b) => a + b.fuelPct, 0) / snapshot.buses.length;
  return (
    <div className="space-y-2.5">
      <div className="card p-3">
        <p className="label">Fleet readiness</p>
        <div className="mt-2.5 space-y-2.5">
          {snapshot.buses.map((b) => {
            const route = snapshot.routes.find((r) => r.id === b.routeId)!;
            return (
              <div key={b.id}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-ink-800">{route.code}</span>
                  <span className="num text-ink-500">{b.fuelPct}% fuel</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={cx("h-full rounded-full", b.fuelPct < 45 ? "bg-sun-500" : "bg-brand-500")}
                    style={{ width: `${b.fuelPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 border-t border-line pt-2 text-[10.5px] text-ink-500">
          Average tank {Math.round(fuel)}% · all vehicles serviced this term
        </p>
      </div>

      <div className="card p-3">
        <p className="label">Crew on duty</p>
        <div className="mt-2 space-y-2">
          {snapshot.drivers.map((d) => {
            const att = snapshot.attendants.find((a) => a.id === snapshot.buses.find((b) => b.driverId === d.id)?.attendantId);
            return (
              <div key={d.id} className="flex items-center gap-2">
                <Avatar name={d.name} hue={d.avatarHue} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-semibold text-ink-800">{d.name}</p>
                  <p className="truncate text-[10px] text-ink-400">
                    {d.yearsExp} yrs · ⭐ {d.rating.toFixed(1)} {att ? `· ${att.name.split(" ")[0]}` : ""}
                  </p>
                </div>
                <span className="size-1.5 shrink-0 rounded-full bg-brand-500" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ConsoleSkeleton({ error }: { error: string | null }) {
  return (
    <div className="grid h-dvh place-items-center bg-paper">
      <div className="text-center">
        <div className="mx-auto grid size-11 animate-pulse place-items-center rounded-xl bg-brand-700/10">
          <svg viewBox="0 0 24 24" className="size-5 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 17V7a2 2 0 0 1 2-2h9l3 4v8" strokeLinecap="round" />
            <circle cx="7.5" cy="17.5" r="1.6" />
            <circle cx="16.5" cy="17.5" r="1.6" />
          </svg>
        </div>
        <p className="mt-3 text-[13px] font-medium text-ink-700">
          {error ? "Live feed interrupted" : "Connecting to fleet GPS…"}
        </p>
        <p className="mt-1 text-[11.5px] text-ink-400">{error ?? "Fetching positions for 5 buses"}</p>
      </div>
    </div>
  );
}

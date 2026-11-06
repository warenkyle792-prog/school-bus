"use client";

import { useState } from "react";
import AppBar from "@/components/AppBar";
import FleetMap from "@/components/FleetMap";
import BusDetail from "@/components/BusDetail";
import FleetManager from "@/components/FleetManager";
import { LoadingState, StaleBanner } from "@/components/LoadState";
import { useLiveSnapshot } from "@/lib/useLiveSnapshot";
import { ThemeBoot } from "@/components/ThemePicker";
import { Avatar, LiveBadge, OccupancyBar, RouteChip, StatusPill } from "@/components/ui";
import { cx, fmtDuration, relTime, signedMin } from "@/lib/format";
import type { Bus, Snapshot } from "@/lib/types";

export default function ConsoleShell({ initial }: { initial?: Snapshot }) {
  const { snapshot, error, stale, lastOkMs, retry } = useLiveSnapshot(1300, initial);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [focusRouteId, setFocusRouteId] = useState<string | null>(null);
  const [detailBusId, setDetailBusId] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  if (!snapshot) {
    return (
      <>
        <ThemeBoot />
        <div className="flex h-dvh flex-col bg-paper">
          <AppBar clock="--:--" />
          <LoadingState
            title="Connecting to the live fleet"
            error={error}
            onRetry={retry}
          />
        </div>
      </>
    );
  }

  const selected = snapshot.buses.find((b) => b.id === selectedBusId) ?? null;
  const detailBus = snapshot.buses.find((b) => b.id === detailBusId) ?? null;

  return (
    <div className="relative flex h-dvh flex-col bg-paper">
      <ThemeBoot />
      <AppBar
        clock={snapshot.clockLabel}
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRegisterOpen(true)}
              className="rounded-full bg-brand-600 px-3 py-1.5 text-[12px] font-bold text-canvas transition hover:bg-brand-700"
            >
              Add bus
            </button>
            <LiveBadge label="GPS live" />
            <div className="hidden items-center gap-2 rounded-full border border-line bg-paper-2 py-1 pr-3 pl-1 sm:flex">
              <Avatar name="Nadia Karemi" hue={150} size={22} />
              <span className="text-[12px] font-medium text-ink-700">Nadia</span>
            </div>
          </div>
        }
      />

      <div className="relative min-h-0 flex-1">
        {/* ── Map stage: fills the screen, first thing you see ─────── */}
        <div className="absolute inset-0">
          <FleetMap
            snapshot={snapshot}
            selectedBusId={selectedBusId}
            onSelect={setSelectedBusId}
            focusRouteId={focusRouteId}
            onFocusRoute={setFocusRouteId}
            onOpenBus={setDetailBusId}
          />
        </div>

        {/* map overlay: route filter, top-left on desktop (top on mobile) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex max-w-full flex-wrap gap-1.5 p-3 lg:left-[340px] lg:max-w-none lg:p-4">
          <div className="pointer-events-auto flex flex-wrap gap-1.5">
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
        </div>

        {stale && (
          <div className="absolute inset-x-3 top-14 z-30 lg:left-[340px] lg:right-3 lg:top-16">
            <StaleBanner lastOkMs={lastOkMs} onRetry={retry} />
          </div>
        )}

        {/* map overlay: legend, bottom-right so it clears the rail */}
        <div className="pointer-events-none absolute right-3 bottom-3 z-20 hidden items-center gap-3 rounded-full border border-line/80 bg-paper-2/90 px-3 py-1.5 backdrop-blur sm:flex lg:right-4 lg:bottom-4">
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
          <div className="absolute right-3 bottom-3 left-3 z-20 sm:left-auto sm:w-[330px] lg:right-4 lg:bottom-16">
            <SelectedBusCard
              bus={selected}
              snapshot={snapshot}
              onClose={() => setSelectedBusId(null)}
              onOpen={() => setDetailBusId(selected.id)}
            />
          </div>
        )}

        {/* ── Fleet rail: floating glass column over the map ────────── */}
        <aside className="absolute top-0 bottom-0 left-0 z-20 hidden w-[320px] flex-col border-r border-line/70 bg-paper/88 backdrop-blur-xl lg:flex">
          <div className="shrink-0 px-4 pt-4 pb-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="label">Fleet</p>
                <p className="mt-1 text-2xl leading-none font-semibold tracking-tight">
                  {snapshot.kpis.busesActive}
                  <span className="text-sm font-normal text-ink-500"> / {snapshot.kpis.busesTotal} on the road</span>
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
                    : "border-transparent bg-brand-600 text-canvas"
                )}
              >
                All routes
              </button>
            </div>
          </div>

          <div className="mx-2.5 mb-2 shrink-0 rounded-xl border border-line bg-paper-2 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span
                className={cx(
                  "size-1.5 rounded-full",
                  snapshot.phase.current === "pickup" || snapshot.phase.current === "dropoff"
                    ? "bg-brand-600"
                    : "bg-ink-400"
                )}
              />
              <p className="text-[10.5px] font-bold tracking-wide text-ink-700 uppercase">
                {snapshot.phase.label}
              </p>
            </div>
            <p className="mt-0.5 text-[10.5px] leading-snug text-ink-600">{snapshot.phase.detail}</p>
            <p className="num mt-1 text-[9.5px] text-ink-500">{snapshot.phase.nextEvent}</p>
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

          </div>
        </aside>

      </div>

      {registerOpen && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-canvas/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex max-h-[88vh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[1.4rem] border border-line bg-paper sm:rounded-[1.4rem]">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
              <p className="text-[13px] font-semibold">Fleet</p>
              <button
                onClick={() => setRegisterOpen(false)}
                className="rounded-full border border-line bg-paper-2 px-2.5 py-1 text-[11px] font-semibold text-ink-600"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <FleetManager
                snapshot={snapshot}
                onShowOnMap={(busId) => {
                  setRegisterOpen(false);
                  setSelectedBusId(busId);
                  const b = snapshot.buses.find((x) => x.id === busId);
                  if (b) setFocusRouteId(b.routeId);
                }}
              />
            </div>
          </div>
        </div>
      )}

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
  const driver = snapshot.drivers.find((d) => d.id === bus.driverId);
  const nextStop = route.stops.find((s) => s.id === bus.nextStopId);

  return (
    <div
      className={cx(
        "group mb-1 rounded-xl border px-2.5 py-2.5 transition",
        active ? "border-ink-900/15 bg-paper-3" : "border-transparent hover:bg-paper-2/70"
      )}
    >
      <button onClick={onClick} className="flex w-full items-start gap-2.5 text-left">
        <span
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg text-canvas"
          style={{ background: bus.status === "breakdown" ? "#ec4d68" : route.color }}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 16V8a2 2 0 0 1 2-2h8l2 3v7" strokeLinecap="round" />
            <circle cx="8" cy="16.6" r="1.2" />
            <circle cx="15" cy="16.6" r="1.2" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[13px] font-semibold">{route.code}</span>
              {bus.registered && (
                <span className="shrink-0 rounded-full bg-brand-100 px-1 text-[8.5px] font-bold tracking-wide text-brand-600 uppercase">
                  new
                </span>
              )}
            </span>
            <StatusPill status={bus.status} size="sm" />
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-ink-500">
            {driver?.name ?? <span className="text-sun-600">No driver assigned</span>}
          </span>
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
          {bus.status === "breakdown"
            ? "Stopped · recovery en route"
            : bus.status === "offline"
              ? (bus.offlineReason ?? "No GPS fix")
              : `Next · ${nextStop?.name ?? "—"}`}
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
  const driver = snapshot.drivers.find((d) => d.id === bus.driverId);
  const attendant = snapshot.attendants.find((a) => a.id === bus.attendantId);
  const attendantName = attendant?.name ?? bus.attendantOnDuty ?? "—";
  const idx = route.stops.findIndex((s) => s.id === bus.nextStopId);

  return (
    <div className="rise card overflow-hidden p-3.5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl text-canvas" style={{ background: route.color }}>
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
        <Row label="Driver" value={driver?.name ?? "Unassigned"} extra={driver?.phone} />
        <Row label="Attendant" value={attendantName} />
        <Row label="Last ping" value={`${bus.lastPingSec}s ago`} />
      </div>

      <button
        onClick={onOpen}
        className="mt-3 w-full rounded-full bg-brand-600 py-2 text-[12px] font-bold text-canvas transition hover:bg-brand-500"
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


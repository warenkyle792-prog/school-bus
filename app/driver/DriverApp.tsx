"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveSnapshot } from "@/lib/useLiveSnapshot";
import type { Snapshot as LiveSnapshot } from "@/lib/types";
import { Avatar } from "@/components/ui";
import ThemePicker, { ThemeBoot } from "@/components/ThemePicker";
import CommsBox from "@/components/CommsBox";
import { LoadingState, StaleBanner } from "@/components/LoadState";
import { DRIVER_TEMPLATES, type CommMessage } from "@/lib/messages";
import { cx, fmtDuration } from "@/lib/format";

/** Signed-in driver for this session: R-01. */
const DEMO_DRIVER_ID = "d-01";

export default function DriverApp({ initial }: { initial?: LiveSnapshot }) {
  const { snapshot, error, stale, lastOkMs, retry } = useLiveSnapshot(1800, initial);
  const [tab, setTab] = useState<"run" | "manifest" | "messages" | "report">("run");
  const [boarded, setBoarded] = useState<Record<string, boolean>>({});
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [sos, setSos] = useState(false);
  const [sent, setSent] = useState<CommMessage[]>([]);
  const [broadcast, setBroadcast] = useState<string | null>(null);

  const bus = snapshot?.buses.find((b) => b.driverId === DEMO_DRIVER_ID) ?? null;
  const route = useMemo(
    () => (snapshot && bus ? snapshot.routes.find((r) => r.id === bus.routeId) ?? null : null),
    [snapshot, bus]
  );

  if (!snapshot || !bus || !route) {
    return (
      <Shell>
        <LoadingState
          title="Loading your run sheet"
          error={error}
          onRetry={retry}
        />
      </Shell>
    );
  }

  const driver = snapshot.drivers.find((d) => d.id === bus.driverId);
  const attendant = snapshot.attendants.find((a) => a.id === bus.attendantId);
  const attendantName = attendant?.name ?? bus.attendantOnDuty ?? "No attendant assigned";
  const manifest = snapshot.students.filter((s) => s.busId === bus.id);
  const matchedStop = route.stops.find((s) => s.id === bus.nextStopId) ?? route.stops[0];
  const stopIdx = route.stops.findIndex((s) => s.id === matchedStop.id);
  const stopKids = manifest.filter((s) => s.stopId === matchedStop.id);
  const checkedIn = stopKids.filter((k) => boarded[k.id]).length;
  // the live manifest is the source of truth; local taps are visual confirmation
  const totalBoarded = Math.min(bus.capacity, Math.max(bus.onBoard, stopKids.filter((k) => boarded[k.id]).length + bus.onBoard - checkedIn));

  const confirmStop = (id: string) =>
    setConfirmed((prev) => (prev.includes(id) ? prev : [...prev, id]));

  return (
    <Shell>
      {/* run header */}
      <div className="shrink-0 border-b border-line bg-paper-2 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg text-canvas" style={{ background: route.color }}>
              <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 16V8a2 2 0 0 1 2-2h8l2 3v7" strokeLinecap="round" />
                <circle cx="8" cy="16.6" r="1.2" />
                <circle cx="15" cy="16.6" r="1.2" />
              </svg>
            </span>
            <div>
              <p className="text-[13.5px] leading-tight font-semibold">
                {route.code} · {bus.direction === "morning" ? "Pickup run" : "Drop-off run"}
              </p>
              <p className="num text-[10.5px] text-ink-500">{bus.plate} · {snapshot.clockLabel} · {bus.speedKph} kph</p>
            </div>
          </div>
          <button
            onClick={() => setSos(true)}
            className={cx(
              "rounded-full px-3.5 py-2 text-[11.5px] font-bold tracking-wide uppercase transition",
              sos ? "bg-berry-500 text-canvas" : "border border-berry-500/40 bg-berry-100 text-berry-600"
            )}
          >
            {sos ? "SOS sent" : "SOS"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-24">
        {stale && (
          <div className="px-4 pt-3">
            <StaleBanner lastOkMs={lastOkMs} onRetry={retry} />
          </div>
        )}
        {tab === "run" && (
          <div className="space-y-3 p-4">
            {/* next stop hero */}
            <div className="rounded-2xl border border-brand-200 bg-brand-100 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-widest text-brand-800/70 uppercase">
                  {confirmed.includes(matchedStop.id) ? "Last confirmed stop" : "Next stop"}
                </p>
                <p className="num text-[10.5px] font-semibold text-brand-800/70">
                  {stopIdx + 1} of {route.stops.length}
                </p>
              </div>
              <p className="mt-1 text-[19px] leading-tight font-semibold text-brand-900">{matchedStop.name}</p>
              <p className="text-[11.5px] text-brand-800/70">
                {matchedStop.area} · {stopKids.length} expected · {fmtDuration(bus.etaSec)} to school
              </p>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-paper-2/80 px-3 py-2">
                <span className="text-[11px] font-medium text-ink-500">Awaiting boarding</span>
                <span className="num text-[14px] font-bold text-ink-900">
                  {stopKids.length - checkedIn} <span className="text-[10.5px] font-medium text-ink-400">of {stopKids.length}</span>
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => confirmStop(matchedStop.id)}
                  disabled={confirmed.includes(matchedStop.id)}
                  className={cx(
                    "rounded-xl py-2.5 text-[12.5px] font-bold transition",
                    confirmed.includes(matchedStop.id)
                      ? "bg-brand-100 text-brand-700"
                      : "bg-brand-600 text-canvas hover:bg-brand-500"
                  )}
                >
                  {confirmed.includes(matchedStop.id) ? "✓ Stop confirmed" : "Confirm boarding"}
                </button>
                <a
                  href={`https://maps.google.com/?q=${matchedStop.coord.lat},${matchedStop.coord.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid place-items-center rounded-xl border border-brand-300 bg-paper-2 py-2.5 text-[12.5px] font-bold text-brand-800"
                >
                  Navigate
                </a>
              </div>
            </div>

            {/* quick manifest tap-to-board */}
            <div className="card p-3.5">
              <div className="flex items-center justify-between">
                <p className="label">Tap to mark on board</p>
                <span className="num text-[11px] font-semibold text-ink-600">{checkedIn}/{stopKids.length}</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {stopKids.map((k) => {
                  const on = !!boarded[k.id];
                  return (
                    <button
                      key={k.id}
                      onClick={() => setBoarded((p) => ({ ...p, [k.id]: !p[k.id] }))}
                      className={cx(
                        "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition",
                        on ? "border-brand-300 bg-brand-100" : "border-line bg-paper-2 hover:border-ink-300"
                      )}
                    >
                      <Avatar name={k.name} hue={k.avatarHue} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold">{k.name}</span>
                        <span className="block truncate text-[10px] text-ink-400">{k.grade} {k.class}</span>
                      </span>
                      <span
                        className={cx(
                          "grid size-6 shrink-0 place-items-center rounded-full border-2 transition",
                          on ? "border-brand-600 bg-brand-600 text-canvas" : "border-ink-200 text-transparent"
                        )}
                      >
                        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* run stats */}
            <div className="grid grid-cols-3 gap-2">
              <Stat label="On board" value={`${totalBoarded}`} sub={`/ ${bus.capacity}`} />
              <Stat label="Delay" value={bus.delaySec > 60 ? `+${Math.round(bus.delaySec / 60)}` : "0"} sub="min" />
              <Stat label="Fuel" value={`${bus.fuelPct}`} sub="%" />
            </div>

            <div className="card flex items-center gap-3 p-3.5">
              <Avatar name={attendantName} hue={attendant?.avatarHue ?? 200} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold">{attendantName}{attendant ? " · attendant" : ""}</p>
                <p className="num text-[10.5px] text-ink-500">{attendant?.phone ?? "—"}</p>
              </div>
              <span className="size-1.5 rounded-full bg-brand-500" />
            </div>
          </div>
        )}

        {tab === "manifest" && (
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="label">Full manifest · {manifest.length} students</p>
              <p className="num text-[11px] text-ink-500">{bus.capacity} seats</p>
            </div>
            <div className="card-flush divide-y divide-line">
              {route.stops.map((stop) => {
                const kids = manifest.filter((s) => s.stopId === stop.id);
                return (
                  <div key={stop.id}>
                    <div className="flex items-center justify-between bg-ink-50 px-3 py-1.5">
                      <p className="text-[10.5px] font-bold tracking-wide text-ink-500 uppercase">
                        {stopIdx >= route.stops.findIndex((s) => s.id === stop.id) ? "✓ " : ""}
                        {stop.name}
                      </p>
                      <p className="num text-[10px] text-ink-400">{kids.length}</p>
                    </div>
                    {kids.map((k) => (
                      <button
                        key={k.id}
                        onClick={() => setBoarded((p) => ({ ...p, [k.id]: !p[k.id] }))}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
                      >
                        <Avatar name={k.name} hue={k.avatarHue} size={26} />
                        <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{k.name}</span>
                        <span
                          className={cx(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            boarded[k.id] ? "bg-brand-100 text-brand-800" : "bg-ink-100 text-ink-500"
                          )}
                        >
                          {boarded[k.id] ? "On board" : k.boardStatus === "dropped" ? "Dropped" : "Waiting"}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
            </div>
        )}

        {tab === "messages" && (
          <div className="space-y-3 p-4">
            <div>
              <p className="label">Quick messages to parents</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {DRIVER_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => {
                      setSent((prev) => [
                        {
                          id: `msg-driver-${Date.now()}`,
                          routeId: route.id,
                          from: "driver",
                          authorName: driver?.name ?? "Driver",
                          body: t.body,
                          atSec: snapshot.simSec,
                          priority: t.priority,
                          seenBy: [],
                        },
                        ...prev,
                      ]);
                      setBroadcast(t.label);
                      setTimeout(() => setBroadcast(null), 4000);
                    }}
                    className={cx(
                      "rounded-xl border px-2.5 py-2 text-left text-[11px] font-semibold transition",
                      t.priority === "emergency"
                        ? "border-berry-500/40 bg-berry-100 text-berry-600 hover:bg-berry-100/80"
                        : "border-line bg-paper-2 text-ink-800 hover:border-ink-300"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {broadcast && (
                <p className="mt-2 rounded-lg bg-brand-100 px-2 py-1.5 text-[10.5px] font-medium text-brand-600">
                  ✓ "{broadcast}" sent to all parents on {route.code}
                </p>
              )}
            </div>

            <CommsBox
              routeId={route.id}
              routeCode={route.code}
              guardianName={driver?.name ?? "Driver"}
              driverName="Parents on this route"
              simSec={snapshot.simSec}
              canMessage={false}
              seed={sent}
            />
            {sent.length === 0 && (
              <p className="px-1 text-[9.5px] leading-relaxed text-ink-500">
                Messages you send here appear in every parent's Driver tab for {route.code}.
              </p>
            )}
          </div>
        )}

        {tab === "report" && (
          <div className="space-y-3 p-4">
            <div className="card p-4">
              <p className="label">Report an issue</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {["Breakdown", "Heavy traffic", "Student absent", "Route change", "Accident", "Other"].map((r) => (
                  <button
                    key={r}
                    className="rounded-xl border border-line bg-paper-2 px-3 py-2.5 text-left text-[12px] font-semibold text-ink-700 transition hover:border-ink-300"
                  >
                    {r}
                  </button>
                ))}
              </div>
</div>

            <div className="card p-4">
              <p className="label">Emergency</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="rounded-xl bg-berry-500 py-3 text-[12.5px] font-bold text-canvas">Panic button</button>
                <button className="rounded-xl border border-line bg-paper-2 py-3 text-[12.5px] font-bold text-ink-700">
                  Call desk
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* driver bottom nav */}
      <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 px-5 py-2 backdrop-blur">
        <div className="flex justify-between">
          {([
            ["run", "My run", "M4 17V7a2 2 0 0 1 2-2h9l3 4v8"],
            ["manifest", "Manifest", "M7 3h7l4 4v14H7zM10 12h8M10 16h5"],
            ["messages", "Parents", "M4 5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"],
            ["report", "Report", "M12 4v9M12 17v.5"],
          ] as const).map(([key, label, path]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cx(
                "flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold transition",
                tab === key ? "text-brand-700" : "text-ink-400"
              )}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d={path} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {sos && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-canvas/80 p-6 backdrop-blur-sm">
          <div className="w-full rounded-2xl bg-paper p-5 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-berry-100 text-berry-600">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l9 16H3L12 3Z" strokeLinejoin="round" />
                <path d="M12 9v4M12 16v.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mt-3 text-[15px] font-semibold">Emergency alert sent</p>
            <button
              onClick={() => setSos(false)}
              className="mt-4 w-full rounded-full bg-paper-3 py-2.5 text-[12.5px] font-semibold text-ink-900"
            >
              Stand down
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-canvas p-0 sm:p-8">
      <ThemeBoot />
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-paper sm:h-[860px] sm:max-h-[calc(100dvh-4rem)] sm:rounded-[2rem] sm:border sm:border-line sm:shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
        <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5">
          <p className="text-[11px] font-semibold tracking-wider text-ink-400 uppercase">Safiri driver</p>
          <div className="flex items-center gap-2">
            <ThemePicker />
            <Link href="/console" className="text-[11px] font-medium text-ink-500 underline decoration-line underline-offset-2">
              Console
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card px-2.5 py-2">
      <p className="text-[9.5px] font-semibold tracking-wide text-ink-400 uppercase">{label}</p>
      <p className="num text-[15px] leading-tight font-semibold">
        {value}
        <span className="ml-0.5 text-[9.5px] font-normal text-ink-400">{sub}</span>
      </p>
    </div>
  );
}

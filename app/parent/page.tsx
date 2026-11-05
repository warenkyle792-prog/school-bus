"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MapCanvas from "@/components/MapCanvas";
import { useLiveSnapshot } from "@/lib/useLiveSnapshot";
import { Avatar, LiveBadge, StatusPill } from "@/components/ui";
import ThemePicker, { ThemeBoot } from "@/components/ThemePicker";
import { cx, fmtDuration } from "@/lib/format";

/**
 * The demo signs in as a guardian with two children on different routes.
 * Both are mid-route stops so the live ETA always has something to say.
 */
const DEMO_CHILD_IDS = ["st-013", "st-076"];

export default function ParentPage() {
  const { snapshot, error } = useLiveSnapshot(1500);
  const [activeChild, setActiveChild] = useState(DEMO_CHILD_IDS[0]);
  const [tab, setTab] = useState<"today" | "alerts" | "profile">("today");

  // children may be on different buses — resolve after data arrives
  const children = useMemo(() => {
    if (!snapshot) return [];
    return DEMO_CHILD_IDS.map((id) => snapshot.students.find((s) => s.id === id)).filter(Boolean);
  }, [snapshot]);

  useEffect(() => {
    if (children.length && !children.some((c) => c?.id === activeChild)) {
      setActiveChild(children[0]!.id);
    }
  }, [children, activeChild]);

  if (!snapshot) {
    return (
      <Shell schoolName="Riverside Academy">
        <div className="grid flex-1 place-items-center p-8 text-center">
          <div>
            <div className="mx-auto size-9 animate-pulse rounded-full bg-brand-200" />
            <p className="mt-3 text-[13px] font-medium text-ink-700">
              {error ? "Can't reach the bus right now" : "Finding your child's bus…"}
            </p>
            <p className="mt-1 text-[11.5px] text-ink-400">{error ?? "Connecting to live GPS"}</p>
          </div>
        </div>
      </Shell>
    );
  }

  const child = snapshot.students.find((s) => s.id === activeChild) ?? children[0]!;
  const bus = snapshot.buses.find((b) => b.id === child.busId)!;
  const route = snapshot.routes.find((r) => r.id === child.routeId)!;
  const driver = snapshot.drivers.find((d) => d.id === bus.driverId)!;
  const stop = route.stops.find((s) => s.id === child.stopId)!;
  const nextStop = route.stops.find((s) => s.id === bus.nextStopId) ?? stop;

  // Live countdown to this child's own stop, not just to the school.
  const elapsedSec = bus.direction === "morning" ? route.durationSec - bus.etaSec : bus.etaSec;
  const stopIsAhead = bus.direction === "morning" ? elapsedSec < stop.offsetSec : elapsedSec > stop.offsetSec;
  const etaMin = stopIsAhead
    ? Math.max(1, Math.round(Math.max(0, Math.abs(stop.offsetSec - elapsedSec) + bus.delaySec) / 60))
    : 0;

  const childEvents = snapshot.events.filter((e) => e.busId === bus.id).slice(0, 5);
  const routeAlerts = snapshot.alerts.filter((a) => a.busId === bus.id).slice(0, 6);

  return (
    <Shell clock={snapshot.clockLabel} schoolName={snapshot.school.shortName}>
      {/* child switcher */}
      <div className="flex gap-2 px-5 pt-4">
        {children.map((c) => {
          const active = c!.id === activeChild;
          return (
            <button
              key={c!.id}
              onClick={() => setActiveChild(c!.id)}
              className={cx(
                "flex flex-1 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition",
                active ? "border-brand-600/30 bg-paper-3" : "border-transparent bg-paper-2/40 hover:bg-paper-2"
              )}
            >
              <Avatar name={c!.name} hue={c!.avatarHue} size={28} />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold">{c!.name.split(" ")[0]}</span>
                <span className="block truncate text-[10px] text-ink-400">{c!.grade}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-24">
        {tab === "today" && (
          <div className="space-y-3">
            {/* hero card */}
            <div className="card overflow-hidden">
              <div className="h-[190px]">
                <MapCanvas view={{ center: bus.position, zoom: 3.1 }} labels={false} className="h-full w-full">
                  {(project) => {
                    const b = project(bus.position);
                    const s = project(stop.coord);
                    const school = project(snapshot.school.coord);
                    const d = route.path
                      .map((pt, i) => {
                        const p = project(pt);
                        return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                      })
                      .join(" ");
                    return (
                      <svg width="100%" height="100%" className="absolute inset-0">
                        <path d={d} fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeOpacity="0.85" />
                        <path d={d} fill="none" stroke={route.color} strokeWidth="4" strokeLinecap="round" strokeOpacity="0.85" />
                        <line x1={b.x} y1={b.y} x2={s.x} y2={s.y} stroke={route.color} strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.55" />
                        <g>
                          <circle cx={s.x} cy={s.y} r="12" fill="#10150e" stroke={route.color} strokeWidth="2.5" />
                          <text x={s.x} y={s.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill={route.color}>
                            {child.name[0]}
                          </text>
                        </g>
                        <g>
                          <circle cx={school.x} cy={school.y} r="7" fill="#c9f27a" stroke="#10150e" strokeWidth="2" />
                        </g>
                        <circle cx={b.x} cy={b.y} r="15" fill={route.color} opacity="0.18" />
                        <circle cx={b.x} cy={b.y} r="8.5" fill={route.color} stroke="#10150e" strokeWidth="2.5" />
                      </svg>
                    );
                  }}
                </MapCanvas>
              </div>

              <div className="border-t border-line px-4 py-3.5">
                {/* ETA ticket, mirroring the reference's "Arriving in 4m" panel */}
                <div className="rounded-2xl border border-brand-600/25 bg-brand-100/60 px-3.5 py-3">
                  <div className="flex items-center justify-between">
                    <LiveBadge label="Live tracking" />
                    <span className="num text-[10px] font-medium text-brand-700/80">
                      {route.code} · {bus.plate}
                    </span>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-brand-700/80 uppercase">
                      {!stopIsAhead
                        ? child.boardStatus === "onboard"
                          ? "Your child is on the bus"
                          : "Picked up"
                        : bus.direction === "morning"
                          ? "Arrives at your stop"
                          : "Reaches your stop"}
                    </p>
                    <p className="num text-[30px] leading-none font-semibold text-brand-700">
                      {stopIsAhead ? etaMin : "--"}
                      <span className="ml-1 text-[13px] font-medium">{stopIsAhead ? "min" : ""}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10.5px] font-medium text-ink-600">{stop.name}</p>
                    <p className="num text-[11px] font-semibold text-brand-700">
                      {bus.delaySec > 120 ? `+${Math.round(bus.delaySec / 60)} min late` : "on schedule"}
                    </p>
                  </div>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={driver.name} hue={driver.avatarHue} size={24} />
                    <p className="text-[11px] text-ink-500">
                      {driver.name} · {snapshot.attendants.find((a) => a.id === bus.attendantId)?.name.split(" ")[0]}
                    </p>
                  </div>
                  <StatusPill status={bus.status} size="sm" />
                </div>
              </div>
            </div>

            {/* child status */}
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={child.name} hue={child.avatarHue} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">{child.name}</p>
                  <p className="text-[11.5px] text-ink-500">
                    {child.grade} {child.class} · {stop.name}
                  </p>
                </div>
                <span
                  className={cx(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    child.boardStatus === "onboard"
                      ? "bg-brand-100 text-brand-800"
                      : child.boardStatus === "dropped"
                        ? "bg-sky-100 text-sky-600"
                        : "bg-ink-100 text-ink-600"
                  )}
                >
                  {child.boardStatus === "onboard" ? "On the bus" : child.boardStatus === "dropped" ? "Dropped off" : "Waiting pickup"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
                <MiniStat label="Next stop" value={nextStop.name.split(" ")[0]} />
                <MiniStat label="To school" value={fmtDuration(bus.etaSec)} />
                <MiniStat label="Speed" value={`${bus.speedKph} kph`} />
              </div>
            </div>

            {/* safety promise */}
            <div className="card flex items-start gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sun-100 text-sun-600">
                <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3Z" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-[12.5px] font-semibold">Boarding confirmation is on</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">
                  You'll get a message the moment {child.name.split(" ")[0]} taps in, and again at handover
                  to the class teacher.
                </p>
              </div>
            </div>

            <p className="px-1 pt-1 text-[10.5px] text-ink-400">
              Times are estimates based on live GPS, traffic and stop dwell.
            </p>
          </div>
        )}

        {tab === "alerts" && (
          <div className="space-y-2">
            {routeAlerts.length === 0 && (
              <p className="px-2 py-8 text-center text-[12px] text-ink-400">No alerts for this route today.</p>
            )}
            {routeAlerts.map((a) => (
              <div key={a.id} className="card p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wide text-ink-400 uppercase">
                    {a.kind.replace("_", " ")}
                  </span>
                  <span className="num text-[10px] text-ink-400">{a.severity}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] font-semibold">{a.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">{a.body}</p>
              </div>
            ))}

            <div className="card p-3.5">
              <p className="label">Today's trip log</p>
              <ul className="mt-2 space-y-2">
                {childEvents.map((e, i) => (
                  <li key={`${e.id}-${i}`} className="flex gap-2">
                    <span className={cx("mt-1.5 size-1.5 shrink-0 rounded-full", e.kind === "board" ? "bg-brand-500" : "bg-ink-300")} />
                    <p className="text-[11.5px] leading-snug text-ink-600">{e.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "profile" && (
          <div className="space-y-3">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={snapshot.guardians[0].name} hue={snapshot.guardians[0].avatarHue} size={44} />
                <div>
                  <p className="text-[14px] font-semibold">{snapshot.guardians[0].name}</p>
                  <p className="num text-[11px] text-ink-400">{snapshot.guardians[0].phone}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2 border-t border-line pt-3 text-[11.5px]">
                <PrefRow label="Boarding alerts" on />
                <PrefRow label="10-minute ETA warning" on />
                <PrefRow label="Speed & route deviation" on />
                <PrefRow label="Weekly trip summary" on />
              </div>
            </div>

            <div className="card p-4">
              <p className="label">School desk</p>
              <p className="mt-1.5 text-[12.5px] font-semibold">{snapshot.school.name}</p>
              <p className="text-[11.5px] text-ink-500">{snapshot.school.city} · {snapshot.school.term}</p>
              <button className="mt-3 w-full rounded-full bg-brand-600 py-2.5 text-[12px] font-bold text-canvas">
                Call transport desk
              </button>
            </div>

            <Link href="/console" className="block rounded-xl border border-dashed border-line p-3 text-center text-[11.5px] font-medium text-ink-500">
              Switch to the school console →
            </Link>
          </div>
        )}
      </div>

      {/* bottom nav */}
      <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 px-6 py-2 backdrop-blur">
        <div className="flex justify-between">
          {([
            ["today", "Today", "M12 3l8 6v10a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1V9l8-6Z"],
            ["alerts", "Alerts", "M12 4a6 6 0 0 0-6 6v4l-1.5 3h15L18 14V10a6 6 0 0 0-6-6Zm-2 13a2 2 0 0 0 4 0"],
            ["profile", "Profile", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0"],
          ] as const).map(([key, label, path]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cx(
                "flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold transition",
                tab === key ? "text-brand-700" : "text-ink-400"
              )}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d={path} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </Shell>
  );
}

function Shell({
  children,
  clock,
  schoolName,
}: {
  children: React.ReactNode;
  clock?: string;
  schoolName: string;
}) {
  return (
    <div className="flex min-h-dvh justify-center bg-canvas p-0 sm:p-8">
      <ThemeBoot />
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-paper sm:h-[860px] sm:max-h-[calc(100dvh-4rem)] sm:rounded-[2rem] sm:border sm:border-line sm:shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
        <header className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Safiri</p>
            <p className="text-[13px] leading-tight font-semibold">{schoolName}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemePicker />
            {clock && <span className="num rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">{clock}</span>}
            <Link href="/console" className="grid size-7 place-items-center rounded-full border border-line bg-paper-2 text-ink-500">
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2.5" y="3" width="11" height="8" rx="1.4" />
                <path d="M6 13.5h4" strokeLinecap="round" />
              </svg>
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9.5px] font-semibold tracking-wide text-ink-400 uppercase">{label}</p>
      <p className="num text-[12.5px] font-semibold text-ink-800">{value}</p>
    </div>
  );
}

function PrefRow({ label, on }: { label: string; on: boolean }) {
  const [enabled, setEnabled] = useState(on);
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-700">{label}</span>
      <button
        onClick={() => setEnabled((v) => !v)}
        className={cx("relative h-4.5 w-8 rounded-full transition", enabled ? "bg-brand-600" : "bg-ink-200")}
      >
        <span
          className={cx(
            "absolute top-0.5 size-3.5 rounded-full bg-canvas shadow transition-all",
            enabled ? "left-4" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

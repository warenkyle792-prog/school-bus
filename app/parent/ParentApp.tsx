"use client";

import { useEffect, useMemo, useState } from "react";
import RouteMap from "@/components/RouteMap";
import { useLiveSnapshot } from "@/lib/useLiveSnapshot";
import type { Snapshot as LiveSnapshot } from "@/lib/types";
import { Avatar, LiveBadge, StatusPill } from "@/components/ui";
import ThemePicker, { ThemeBoot } from "@/components/ThemePicker";
import { cx, fmtDuration } from "@/lib/format";
import { etaMinutes, etaToStop } from "@/lib/eta";
import CommsBox from "@/components/CommsBox";
import { LoadingState, StaleBanner } from "@/components/LoadState";
import { DEMO_GUARDIAN_ID } from "@/lib/data";

/**
 * The signed-in session belongs to household g-01: three children across two routes.
 * Everything below is derived from those children — a parent never sees the
 * rest of the fleet, and every ETA is scoped to their own stop.
 */


type Reminder = {
  childId: string;
  leadMin: number;
  state: "unscheduled" | "scheduled" | "due" | "fired" | "passed" | "offline";
  firesInSec: number | null;
  etaSec: number | null;
  distanceM: number;
  message: string;
};

const LEAD_OPTIONS = [5, 10, 15];

export default function ParentApp({ initial }: { initial?: LiveSnapshot }) {
  const { snapshot, error, stale, lastOkMs, retry } = useLiveSnapshot(1500, initial);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [tab, setTab] = useState<"today" | "chat" | "alerts">("today");

  /** lead time per child, in minutes */
  const [leadByChild, setLeadByChild] = useState<Record<string, number>>({});
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  // ── scope: only this guardian's children ───────────────────────────────
  const myChildren = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.students.filter((s) => s.guardianId === DEMO_GUARDIAN_ID);
  }, [snapshot]);

  const guardian = snapshot?.guardians.find((g) => g.id === DEMO_GUARDIAN_ID);

  useEffect(() => {
    if (myChildren.length && !myChildren.some((c) => c.id === activeChildId)) {
      setActiveChildId(myChildren[0].id);
    }
  }, [myChildren, activeChildId]);

  // Only the buses these children actually ride.
  const myBuses = useMemo(() => {
    if (!snapshot) return [];
    const ids = new Set(myChildren.map((c) => c.busId));
    return snapshot.buses.filter((b) => ids.has(b.id));
  }, [snapshot, myChildren]);

  // ── reminders ──────────────────────────────────────────────────────────
  const reminders = useMemo<Reminder[]>(() => {
    if (!snapshot) return [];
    const out: Reminder[] = [];
    for (const child of myChildren) {
      const leadMin = leadByChild[child.id];
      if (!leadMin) continue;
      const bus = snapshot.buses.find((b) => b.id === child.busId);
      const route = snapshot.routes.find((r) => r.id === child.routeId);
      const stop = route?.stops.find((s) => s.id === child.stopId);
      if (!bus || !route || !stop) continue;

      const eta = etaToStop(bus, route, stop);

      if (bus.status === "offline") {
        out.push({
          childId: child.id,
          leadMin,
          state: "offline",
          firesInSec: null,
          etaSec: null,
          distanceM: eta.distanceM,
          message: "Bus is not reporting GPS",
        });
        continue;
      }

      if (!eta.ahead || eta.etaSec === null) {
        out.push({
          childId: child.id,
          leadMin,
          state: notified[child.id] ? "fired" : "passed",
          firesInSec: null,
          etaSec: null,
          distanceM: eta.distanceM,
          message:
            child.boardStatus === "onboard" ? "Child is on the bus" : "Bus already passed this stop",
        });
        continue;
      }

      const firesInSec = eta.etaSec - leadMin * 60;
      const due = firesInSec <= 0;
      out.push({
        childId: child.id,
        leadMin,
        state: due ? (notified[child.id] ? "fired" : "due") : "scheduled",
        firesInSec,
        etaSec: eta.etaSec,
        distanceM: eta.distanceM,
        message: due
          ? `Leave now · ${Math.max(1, Math.round(eta.etaSec / 60))} min`
          : `Reminder in ${Math.max(1, Math.ceil(firesInSec / 60))} min`,
      });
    }
    return out;
  }, [snapshot, myChildren, leadByChild, notified]);

  // Fire the reminder once when it becomes due, and drift it 1s at a time so
  // the countdown feels live between polls.
  const dueKeys = reminders
    .filter((r) => r.state === "due")
    .map((r) => r.childId)
    .join(",");

  useEffect(() => {
    if (!dueKeys) return;
    const ids = dueKeys.split(",");
    setNotified((n) => {
      const next = { ...n };
      for (const id of ids) next[id] = true;
      return next;
    });
    const child = myChildren.find((c) => c.id === ids[0]);
    setToast(
      child
        ? `Pickup reminder · ${child.name.split(" ")[0]}'s bus is close`
        : "Pickup reminder sent"
    );
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [dueKeys, myChildren]);

  if (!snapshot) {
    return (
      <Shell schoolName="Riverside Academy" guardianName="…">
        <LoadingState
          title="Finding your child's bus"
          error={error}
          onRetry={retry}
        />
      </Shell>
    );
  }

  const child = myChildren.find((c) => c.id === activeChildId) ?? myChildren[0];
  if (!child) {
    return (
      <Shell schoolName={snapshot.school.shortName} guardianName={guardian?.name ?? ""}>
        <div className="grid flex-1 place-items-center p-8 text-center">
          <p className="text-[12.5px] text-ink-600">No children linked to this account yet.</p>
        </div>
      </Shell>
    );
  }

  const bus = snapshot.buses.find((b) => b.id === child.busId);
  const route = snapshot.routes.find((r) => r.id === child.routeId)!;
  const stop = route.stops.find((s) => s.id === child.stopId)!;
  const driver = snapshot.drivers.find((d) => d.id === bus?.driverId);
  const attendantName =
    snapshot.attendants.find((a) => a.id === bus?.attendantId)?.name ?? bus?.attendantOnDuty;
  const reminder = reminders.find((r) => r.childId === child.id);
  const lead = leadByChild[child.id];

  const eta = bus ? etaToStop(bus, route, stop) : null;
  const mins = etaMinutes(eta?.etaSec ?? null);

  const routeAlerts = snapshot.alerts.filter((a) => a.busId === bus?.id).slice(0, 8);

  // Children boarding at this guardian's own stop — the "to be picked up" number.
  const atMyStop = snapshot.students.filter(
    (s) => s.busId === bus?.id && s.stopId === stop.id && s.boardStatus !== "absent"
  );
  const kidsAtStop = atMyStop.filter((s) => s.boardStatus === "waiting");

  return (
    <Shell clock={snapshot.clockLabel} schoolName={snapshot.school.shortName} guardianName={guardian?.name ?? ""}>
      {/* child switcher — only this guardian's children */}
      <div className="flex gap-2 px-5 pt-4">
        {myChildren.map((c) => {
          const active = c.id === child.id;
          const cBus = snapshot.buses.find((b) => b.id === c.busId);
          return (
            <button
              key={c.id}
              onClick={() => setActiveChildId(c.id)}
              className={cx(
                "flex flex-1 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition",
                active ? "border-brand-600/30 bg-paper-3" : "border-transparent bg-paper-2/40 hover:bg-paper-2"
              )}
            >
              <Avatar name={c.name} hue={c.avatarHue} size={28} />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold">{c.name.split(" ")[0]}</span>
                <span className="block truncate text-[10px] text-ink-500">
                  {c.grade} · {cBus?.plate ?? "no bus"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Map first: it owns the top of the screen ─────────────── */}
      <div className="relative min-h-[45%] flex-1 overflow-hidden">
        {bus ? (
          <>
            <RouteMap
              bus={bus}
              path={route.path}
              color={route.color}
              stops={route.stops}
              school={snapshot.school.coord}
              nextStopId={bus.nextStopId}
              highlight={[{ stopId: stop.id, count: atMyStop.length, label: "My stop" }]}
              distanceLabels={{ [stop.id]: `${Math.round((eta?.distanceM ?? 0) / 10) * 10} m away` }}
            />

            {/* ETA + reminder float over the map */}
            <div className="absolute inset-x-3 bottom-3 z-10">
                <div className="rounded-2xl border border-brand-600/25 bg-brand-100 px-3.5 py-3">
                  <div className="flex items-center justify-between">
                    <LiveBadge label={bus.status === "offline" ? "Off GPS" : "Live tracking"} />
                    <span className="num text-[10px] font-medium text-brand-600">
                      {route.code} · {bus.plate}
                    </span>
                  </div>

                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold tracking-wide text-brand-600 uppercase">
                        {!eta?.ahead
                          ? child.boardStatus === "onboard"
                            ? "Your child is on the bus"
                            : "Picked up"
                          : `Arrives ${stop.name}`}
                      </p>
                      <p className="num text-[30px] leading-none font-semibold text-brand-600">
                        {mins ?? "--"}
                        <span className="ml-1 text-[13px] font-medium">{mins ? "min" : ""}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="num text-[11px] font-semibold text-ink-700">
                        {eta?.distanceM ? `${(eta.distanceM / 1000).toFixed(1)} km away` : "at your stop"}
                      </p>
                      <p className="num text-[10.5px] text-ink-600">
                        {bus.delaySec > 120 ? `+${Math.round(bus.delaySec / 60)} min late` : "on schedule"}
                      </p>
                    </div>
                  </div>
                </div>
                {/* ── reminder control ─────────────────────────────── */}
                <div className="mt-2.5 rounded-2xl border border-line bg-paper px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BellIcon className="size-3.5 text-brand-600" />
                      <p className="text-[10.5px] font-bold tracking-wide text-ink-700 uppercase">
                        Pickup reminder
                      </p>
                    </div>
                    {lead && (
                      <button
                        onClick={() => {
                          setLeadByChild((p) => {
                            const n = { ...p };
                            delete n[child.id];
                            return n;
                          });
                          setNotified((p) => ({ ...p, [child.id]: false }));
                        }}
                        className="text-[10px] text-ink-500 underline decoration-line underline-offset-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {!lead ? (
                    <>
                      <div className="mt-2 flex gap-1.5">
                        {LEAD_OPTIONS.map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              setLeadByChild((p) => ({ ...p, [child.id]: m }));
                              setNotified((p) => ({ ...p, [child.id]: false }));
                              setToast(`Reminder set for ${m} min before arrival.`);
                              setTimeout(() => setToast(null), 5000);
                            }}
                            className="flex-1 rounded-full border border-brand-600/30 bg-brand-100 py-1.5 text-[11px] font-bold text-brand-600 transition hover:bg-brand-200"
                          >
                            {m} min
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="mt-1.5">
                      <p className="text-[11.5px] leading-snug font-semibold text-ink-900">
                        {reminder?.state === "due" || reminder?.state === "fired"
                          ? "🔔 Go to the pickup point"
                          : reminder?.state === "offline"
                            ? "Paused — bus offline"
                            : reminder?.state === "passed"
                              ? "Bus passed this stop"
                              : `${reminder?.message ?? "Scheduled"}`}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {LEAD_OPTIONS.map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              setLeadByChild((p) => ({ ...p, [child.id]: m }));
                              setNotified((p) => ({ ...p, [child.id]: false }));
                            }}
                            className={cx(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold transition",
                              m === lead
                                ? "bg-brand-600 text-canvas"
                                : "border border-line text-ink-600 hover:border-ink-300"
                            )}
                          >
                            {m} min
                          </button>
                        ))}
                        <span className="ml-auto num text-[10px] text-ink-500">
                          {reminder?.state === "scheduled" && reminder.firesInSec !== null
                            ? `fires in ${Math.max(1, Math.ceil(reminder.firesInSec / 60))}m`
                            : ""}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={driver?.name ?? "Unassigned"} hue={driver?.avatarHue ?? 30} size={24} />
                    <p className="text-[11px] text-ink-600">
                      {driver?.name ?? "Driver not assigned"}
                      {attendantName ? ` · ${attendantName.split(" ")[0]}` : ""}
                    </p>
                  </div>
                  <StatusPill status={bus.status} size="sm" />
                </div>
              </div>
          </>
        ) : (
          <div className="grid h-full place-items-center bg-paper-2/40 p-6 text-center">
            <p className="text-[12.5px] font-semibold text-ink-600">No bus assigned</p>
          </div>
        )}

        {stale && (
          <div className="absolute inset-x-3 top-3 z-20">
            <StaleBanner lastOkMs={lastOkMs} onRetry={retry} />
          </div>
        )}
      </div>

      {/* ── Details below the map ─────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-24">
        {tab === "today" && (
          <div className="space-y-3">
            {snapshot.phase.current === "after_service" && (
              <div className="card px-4 py-2.5">
                <p className="text-[12px] font-semibold">Today's runs are finished</p>
              </div>
            )}
            {/* child status */}
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={child.name} hue={child.avatarHue} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">{child.name}</p>
                  <p className="text-[11.5px] text-ink-600">
                    {child.grade} {child.class} · {stop.name}
                  </p>
                </div>
                <span
                  className={cx(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    child.boardStatus === "onboard"
                      ? "bg-brand-100 text-brand-600"
                      : child.boardStatus === "dropped"
                        ? "bg-sky-100 text-sky-600"
                        : "bg-ink-100 text-ink-600"
                  )}
                >
                  {child.boardStatus === "onboard"
                    ? "On the bus"
                    : child.boardStatus === "dropped"
                      ? "Dropped off"
                      : "Waiting pickup"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
                <MiniStat label="Pickup stop" value={stop.name.split(" ").slice(0, 2).join(" ")} />
                <MiniStat
                  label="Bus from stop"
                  value={eta?.distanceM ? `${(eta.distanceM / 1000).toFixed(1)} km` : "here"}
                />
                <MiniStat label="Bus" value={bus?.plate ?? "None"} />
              </div>
            </div>

            {/* students still to be picked up at this household's stop */}
            <div className="card p-3.5">
              <div className="flex items-center justify-between">
                <p className="label">To be picked up</p>
                <span className="num text-[10px] text-ink-500">{kidsAtStop.length} waiting · {stop.name}</span>
              </div>
              {kidsAtStop.length === 0 ? (
                <p className="mt-1.5 text-[11.5px] text-ink-600">
                  {child.boardStatus === "waiting"
                    ? `${child.name.split(" ")[0]} is waiting`
                    : child.boardStatus === "onboard"
                      ? `${child.name.split(" ")[0]} is on the bus`
                      : `${child.name.split(" ")[0]} was dropped off`}
                </p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {kidsAtStop.map((k) => {
                    const mine = k.guardianId === DEMO_GUARDIAN_ID;
                    return (
                      <div key={k.id} className="flex items-center gap-2 rounded-lg bg-ink-50 px-2 py-1.5">
                        <Avatar name={k.name} hue={k.avatarHue} size={24} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11.5px] font-semibold text-ink-800">{k.name}</span>
                          <span className="block truncate text-[10px] text-ink-500">
                            {k.grade} {k.class}
                          </span>
                        </span>
                        {mine && (
                          <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[9px] font-bold text-brand-600 uppercase">
                            yours
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="num mt-2 text-[10px] text-ink-500">
                {eta?.distanceM ? `${Math.round((eta.distanceM / 10) * 10)} m from this stop` : "bus at this stop"}
              </p>
            </div>

            {/* buses on this household only */}
            <div className="card p-3.5">
              <div className="flex items-center justify-between">
                <p className="label">Your buses</p>
                <span className="num text-[10px] text-ink-500">{myBuses.length} assigned</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {myBuses.map((b) => {
                  const r = snapshot.routes.find((x) => x.id === b.routeId)!;
                  const owners = myChildren.filter((c) => c.busId === b.id);
                  return (
                    <div key={b.id} className="flex items-center gap-2 rounded-lg bg-ink-50 px-2 py-1.5">
                      <span className="size-2 rounded-full" style={{ background: r.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="num truncate text-[11px] font-semibold text-ink-800">{b.plate}</p>
                        <p className="truncate text-[10px] text-ink-500">
                          {r.code} · {owners.map((o) => o.name.split(" ")[0]).join(", ")}
                        </p>
                      </div>
                      <StatusPill status={b.status} size="sm" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "chat" && (
      <CommsBox
        routeId={route.id}
        routeCode={route.code}
        guardianName={guardian?.name ?? "Parent"}
        driverName={driver?.name ?? "Driver"}
        simSec={snapshot.simSec}
        canMessage
      />
    )}

    {tab === "alerts" && (
      <div className="space-y-2">
        {routeAlerts.length === 0 && (
          <p className="px-2 py-8 text-center text-[12px] text-ink-500">
            No alerts for this route today.
          </p>
        )}
        {routeAlerts.map((a) => (
          <div key={a.id} className="card p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wide text-ink-500 uppercase">
                {a.kind.replace("_", " ")}
              </span>
              <span className="num text-[10px] text-ink-500">{a.severity}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] font-semibold">{a.title}</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-600">{a.body}</p>
          </div>
        ))}

        <div className="card p-3.5">
          <p className="label">Today's trip log</p>
          <ul className="mt-2 space-y-2">
            {snapshot.events
              .filter((e) => e.busId === child.busId)
              .slice(0, 6)
              .map((e, i) => (
                <li key={`${e.id}-${i}`} className="flex gap-2">
                  <span
                    className={cx(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      e.kind === "board" ? "bg-brand-500" : "bg-ink-400"
                    )}
                  />
                  <p className="text-[11.5px] leading-snug text-ink-600">{e.text}</p>
                </li>
              ))}
          </ul>
        </div>
          </div>
        )}

      </div>

      {/* toast */}
      {toast && (
        <div className="absolute inset-x-3 bottom-[74px] z-30 rise">
          <div className="rounded-xl border border-brand-600/30 bg-paper-3 px-3 py-2 shadow-xl">
            <p className="text-[11px] leading-snug font-medium text-ink-800">{toast}</p>
          </div>
        </div>
      )}

      {/* bottom nav */}
      <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 px-6 py-2 backdrop-blur">
        <div className="flex justify-between">
          {(
            [
              ["today", "Today", "M12 3l8 6v10a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1V9l8-6Z"],
              ["chat", "Driver", "M4 5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"],
              ["alerts", "Alerts", "M12 4a6 6 0 0 0-6 6v4l-1.5 3h15L18 14V10a6 6 0 0 0-6-6Zm-2 13a2 2 0 0 0 4 0"],
            ] as const
          ).map(([key, label, path]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cx(
                "relative flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold transition",
                tab === key ? "text-brand-600" : "text-ink-400"
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
  guardianName,
}: {
  children: React.ReactNode;
  clock?: string;
  schoolName: string;
  guardianName: string;
}) {
  return (
    <div className="flex min-h-dvh justify-center bg-canvas p-0 sm:p-8">
      <ThemeBoot />
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-paper sm:h-[860px] sm:max-h-[calc(100dvh-4rem)] sm:rounded-[2rem] sm:border sm:border-line sm:shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
        <header className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-ink-500 uppercase">Safiri</p>
            <p className="text-[13px] leading-tight font-semibold">{schoolName}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemePicker />
            {clock && (
              <span className="num rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">
                {clock}
              </span>
            )}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 4a5.5 5.5 0 0 0-5.5 5.5V13L5 16h14l-1.5-3V9.5A5.5 5.5 0 0 0 12 4Z" strokeLinejoin="round" />
      <path d="M10 18.5a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] font-semibold tracking-wide text-ink-500 uppercase">{label}</p>
      <p className="num truncate text-[12.5px] font-semibold text-ink-800">{value}</p>
    </div>
  );
}

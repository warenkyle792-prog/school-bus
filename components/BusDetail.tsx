"use client";

import { useState } from "react";
import MapCanvas from "./MapCanvas";
import { Avatar, StatusPill } from "./ui";
import { cx, fmtDuration, initials, relTime } from "@/lib/format";
import type { Bus, Snapshot } from "@/lib/types";

export default function BusDetail({
  bus,
  snapshot,
  onClose,
}: {
  bus: Bus;
  snapshot: Snapshot;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"trip" | "manifest" | "crew">("trip");
  const route = snapshot.routes.find((r) => r.id === bus.routeId)!;
  const driver = snapshot.drivers.find((d) => d.id === bus.driverId)!;
  const attendant = snapshot.attendants.find((a) => a.id === bus.attendantId)!;
  const manifest = snapshot.students.filter((s) => s.busId === bus.id);
  const elapsed =
    bus.direction === "morning" ? route.durationSec - bus.etaSec : bus.etaSec;
  const nextIdx = route.stops.findIndex((s) => s.id === bus.nextStopId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/25 backdrop-blur-[2px]"
      />
      <section className="relative flex h-full w-full max-w-[460px] flex-col border-l border-line bg-paper shadow-2xl">
        {/* header */}
        <div className="border-b border-line px-5 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span
                className="grid size-11 place-items-center rounded-xl text-white"
                style={{ background: bus.status === "breakdown" ? "#cf2f52" : route.color }}
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M5 16V8a2 2 0 0 1 2-2h8l2 3v7" strokeLinecap="round" />
                  <path d="M5 11h14" strokeLinecap="round" />
                  <circle cx="8" cy="16.6" r="1.2" />
                  <circle cx="15" cy="16.6" r="1.2" />
                </svg>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] leading-tight font-semibold tracking-tight">
                    {route.code} · {bus.plate}
                  </h2>
                  <StatusPill status={bus.status} size="sm" />
                </div>
                <p className="mt-0.5 text-[12px] text-ink-500">
                  {route.name} · {bus.direction === "morning" ? "Morning pickup" : "Afternoon drop-off"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-line bg-paper-2 p-1.5 text-ink-500 transition hover:text-ink-900"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <Metric label="On board" value={`${bus.onBoard}`} sub={`of ${bus.capacity}`} />
            <Metric label="Speed" value={`${bus.speedKph}`} sub="kph" />
            <Metric label="To school" value={fmtDuration(bus.etaSec)} sub={bus.delaySec > 120 ? "delayed" : "est."} />
            <Metric label="Ping" value={`${bus.lastPingSec}s`} sub="ago" />
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-line px-3 py-2">
          {([
            ["trip", "Stop timeline"],
            ["manifest", `Manifest ${manifest.length}`],
            ["crew", "Crew & actions"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cx(
                "flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition",
                tab === k ? "bg-ink-100 text-ink-900" : "text-ink-500 hover:text-ink-800"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "trip" && (
            <div>
              <div className="h-[150px] border-b border-line">
                <MapCanvas
                  view={{ center: bus.position, zoom: 3.4 }}
                  labels={false}
                  className="h-full w-full"
                >
                  {(project) => {
                    const p = project(bus.position);
                    return (
                      <svg width="100%" height="100%" className="absolute inset-0">
                        {route.path.map((pt, i) => {
                          const a = project(pt);
                          const b = project(route.path[Math.min(route.path.length - 1, i + 1)]);
                          return (
                            <line
                              key={i}
                              x1={a.x}
                              y1={a.y}
                              x2={b.x}
                              y2={b.y}
                              stroke={route.color}
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeOpacity="0.5"
                            />
                          );
                        })}
                        <circle cx={p.x} cy={p.y} r="7" fill={route.color} stroke="#fffefa" strokeWidth="2.5" />
                      </svg>
                    );
                  }}
                </MapCanvas>
              </div>

              <ol className="px-5 py-4">
                {route.stops.map((stop, i) => {
                  const passed = bus.direction === "morning" ? stop.offsetSec <= elapsed : stop.offsetSec >= elapsed;
                  const isNext = i === nextIdx;
                  const kids = manifest.filter((s) => s.stopId === stop.id);
                  return (
                    <li key={stop.id} className="relative flex gap-3 pb-5">
                      {i < route.stops.length - 1 && (
                        <span
                          className={cx(
                            "absolute top-4 bottom-0 left-[5.5px] w-px",
                            passed ? "bg-brand-300" : "bg-line"
                          )}
                        />
                      )}
                      <span className="relative mt-0.5 flex size-3 shrink-0 justify-center">
                        <span
                          className={cx(
                            "size-3 rounded-full border-2",
                            isNext
                              ? "border-brand-600 bg-paper-2 ring-4 ring-brand-100"
                              : passed
                                ? "border-brand-500 bg-brand-500"
                                : "border-ink-300 bg-paper-2"
                          )}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={cx("text-[12.5px] font-semibold", passed ? "text-ink-800" : "text-ink-600")}>
                            {stop.name}
                          </p>
                          <span className="num shrink-0 text-[10.5px] text-ink-400">
                            {stop.offsetSec === 0 ? "start" : `+${Math.round(stop.offsetSec / 60)}m`}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10.5px] text-ink-400">
                          {stop.area} · {kids.length} student{kids.length === 1 ? "" : "s"}
                          {isNext && <span className="ml-1.5 font-semibold text-brand-600">next stop</span>}
                        </p>
                        {passed && kids.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {kids.slice(0, 5).map((k) => (
                              <span
                                key={k.id}
                                className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-800"
                              >
                                {k.name.split(" ")[0]}
                              </span>
                            ))}
                            {kids.length > 5 && (
                              <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-500">
                                +{kids.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
                <li className="flex gap-3">
                  <span className="mt-0.5 grid size-3 shrink-0 place-items-center">
                    <span className="size-3 rounded-sm bg-brand-700" />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold">{snapshot.school.name}</p>
                    <p className="text-[10.5px] text-ink-400">Gate handover · {manifest.length} students on manifest</p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {tab === "manifest" && (
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="label">Student manifest</p>
                <p className="num text-[11px] text-ink-500">
                  {manifest.filter((m) => m.boardStatus === "onboard").length} on board
                </p>
              </div>
              <div className="card-flush divide-y divide-line">
                {manifest.map((s) => {
                  const stop = route.stops.find((st) => st.id === s.stopId);
                  return (
                    <div key={s.id} className="flex items-center gap-2.5 px-3 py-2">
                      <Avatar name={s.name} hue={s.avatarHue} size={26} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-ink-800">{s.name}</p>
                        <p className="truncate text-[10px] text-ink-400">
                          {s.grade} {s.class} · {stop?.name}
                        </p>
                      </div>
                      <BoardTag status={s.boardStatus} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "crew" && (
            <div className="space-y-3 p-4">
              <div className="card p-4">
                <p className="label">Driver</p>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar name={driver.name} hue={driver.avatarHue} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold">{driver.name}</p>
                    <p className="text-[11.5px] text-ink-500">
                      {driver.yearsExp} yrs experience · ⭐ {driver.rating.toFixed(1)}
                    </p>
                    <p className="num mt-0.5 text-[11px] text-ink-400">{driver.phone}</p>
                  </div>
                  <CallButton />
                </div>
              </div>

              <div className="card p-4">
                <p className="label">Attendant</p>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar name={attendant.name} hue={attendant.avatarHue} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold">{attendant.name}</p>
                    <p className="text-[11.5px] text-ink-500">Boarding & handover</p>
                    <p className="num mt-0.5 text-[11px] text-ink-400">{attendant.phone}</p>
                  </div>
                  <CallButton />
                </div>
              </div>

              <div className="card p-4">
                <p className="label">Vehicle</p>
                <dl className="mt-2 grid grid-cols-2 gap-y-2 text-[11.5px]">
                  <dt className="text-ink-500">Plate</dt>
                  <dd className="num text-right font-medium">{bus.plate}</dd>
                  <dt className="text-ink-500">Capacity</dt>
                  <dd className="num text-right font-medium">{bus.capacity} seats</dd>
                  <dt className="text-ink-500">Fuel</dt>
                  <dd className="num text-right font-medium">{bus.fuelPct}%</dd>
                  <dt className="text-ink-500">Odometer</dt>
                  <dd className="num text-right font-medium">{bus.odometerKm.toLocaleString()} km</dd>
                  <dt className="text-ink-500">Route length</dt>
                  <dd className="num text-right font-medium">{route.distanceKm} km</dd>
                  <dt className="text-ink-500">Last ping</dt>
                  <dd className="num text-right font-medium">{relTime(snapshot.simSec - bus.lastPingSec, snapshot.simSec)}</dd>
                </dl>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ActionButton label="Notify parents" tone="brand" />
                <ActionButton label="Log incident" tone="neutral" />
                <ActionButton label="Reassign bus" tone="neutral" />
                <ActionButton label="Call driver" tone="neutral" />
              </div>
              <p className="px-1 text-[10.5px] leading-relaxed text-ink-400">
                Actions in this demo surface a confirmation only — wire them to your SMS/push provider
                and they become real notifications to guardians.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper-2 px-2 py-1.5">
      <p className="text-[9.5px] font-semibold tracking-wide text-ink-400 uppercase">{label}</p>
      <p className="num text-[15px] leading-tight font-semibold">{value}</p>
      <p className="text-[9.5px] text-ink-400">{sub}</p>
    </div>
  );
}

function BoardTag({ status }: { status: "waiting" | "onboard" | "dropped" | "absent" }) {
  const map = {
    onboard: ["On board", "bg-brand-100 text-brand-800"],
    waiting: ["Waiting", "bg-ink-100 text-ink-500"],
    dropped: ["Dropped", "bg-sky-100 text-sky-600"],
    absent: ["Absent", "bg-berry-100 text-berry-600"],
  } as const;
  const [label, cls] = map[status];
  return <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", cls)}>{label}</span>;
}

function CallButton() {
  return (
    <button className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-paper-2 text-brand-700 transition hover:border-brand-300 hover:bg-brand-100">
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path
          d="M4.2 2.5h1.9l1.1 2.6-1.4 1a7.3 7.3 0 0 0 3.7 3.7l1-1.4 2.6 1.1v1.9c0 .8-.7 1.5-1.5 1.4A11.2 11.2 0 0 1 2.8 4c-.1-.8.6-1.5 1.4-1.5Z"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function ActionButton({ label, tone }: { label: string; tone: "brand" | "neutral" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        setDone(true);
        setTimeout(() => setDone(false), 2200);
      }}
      className={cx(
        "rounded-lg px-3 py-2 text-[11.5px] font-semibold transition",
        tone === "brand"
          ? "bg-brand-700 text-paper-2 hover:bg-brand-800"
          : "border border-line bg-paper-2 text-ink-700 hover:border-ink-300",
        done && "!bg-brand-100 !text-brand-800"
      )}
    >
      {done ? `✓ ${label}` : label}
    </button>
  );
}

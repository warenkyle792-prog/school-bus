import {
  ATTENDANTS,
  BUSES,
  DRIVERS,
  GUARDIANS,
  ROUTE_PHASES,
  ROUTES,
  SCHOOL,
  SCRIPTED_ALERTS,
  STUDENTS,
} from "./data";
import { bearing, haversineKm, projectOntoPath } from "./geo";
import type { Alert, Bus, Route, Snapshot, Stop, TripEvent } from "./types";

/**
 * How fast simulated time runs compared with wall clock.
 * Higher = buses move more on screen. 1 would be real time.
 */
export const TIME_SCALE = 10;

const PARK_STOP_SEC = 200;
const PARK_SCHOOL_SEC = 240;

/** Breakdown window, expressed as a fraction of a bus's round trip. */
const BREAKDOWN = { busId: "b-04", from: 0.1, to: 0.26, atProgress: 0.46 };

const stopFractions = new Map<string, number[]>();
function stopFractionsFor(route: Route): number[] {
  const cached = stopFractions.get(route.id);
  if (cached) return cached;
  const t = route.stops.map((s) => Math.max(0.001, Math.min(0.999, projectOntoPath(route.path, s.coord).t)));
  t.sort((a, b) => a - b);
  stopFractions.set(route.id, t);
  return t;
}

/** Fraction along the drawn path for a given elapsed run time. */
export function progressFor(route: Route, elapsedSec: number): number {
  const ts = stopFractionsFor(route);
  const stops = route.stops;
  if (elapsedSec <= 0) return 0;
  const lastStop = stops[stops.length - 1];
  if (elapsedSec >= lastStop.offsetSec) {
    const tail = Math.max(1, route.durationSec - lastStop.offsetSec);
    const f = Math.min(1, (elapsedSec - lastStop.offsetSec) / tail);
    return ts[ts.length - 1] + (1 - ts[ts.length - 1]) * f;
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (elapsedSec >= a.offsetSec && elapsedSec < b.offsetSec) {
      const span = Math.max(1, b.offsetSec - a.offsetSec);
      const f = (elapsedSec - a.offsetSec) / span;
      const eased = f < 0.07 ? 0 : (f - 0.07) / 0.93;
      const from = ts[i];
      const to = ts[i + 1] ?? 1;
      return from + (to - from) * eased;
    }
  }
  return 0;
}

/** Inverse of progressFor: elapsed seconds that produce a given progress. */
export function elapsedForProgress(route: Route, progress: number): number {
  let lo = 0;
  let hi = route.durationSec;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (progressFor(route, mid) < progress) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function noise(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function pointAt(route: Route, progress: number) {
  const n = route.path.length - 1;
  const idx = Math.max(0, Math.min(n, progress * n));
  const i = Math.floor(idx);
  const f = idx - i;
  const a = route.path[i];
  const b = route.path[Math.min(n, i + 1)];
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
}

export type BusRun = {
  tripIndex: number;
  direction: "morning" | "afternoon";
  /** run-local elapsed seconds, morning only (0 = departure from first stop) */
  elapsedSec: number;
  progress: number;
  parked: "none" | "at_stop" | "at_school";
  frac: number;
};

/**
 * Each bus loops a full round trip:
 *   park at first stop → morning run to school → park at school → afternoon run back out → repeat.
 * Position is continuous at both turnarounds, so nothing teleports.
 */
export function busRun(route: Route, phase: number, simSec: number): BusRun {
  const trip = route.durationSec;
  const legLen = trip + PARK_STOP_SEC + PARK_SCHOOL_SEC;
  const roundLen = legLen * 2 + PARK_STOP_SEC + PARK_SCHOOL_SEC;
  const local = (((simSec + phase * roundLen) % roundLen) + roundLen) % roundLen;

  // 1. parked at first stop (boarding)
  let cursor = PARK_STOP_SEC;
  if (local < cursor) {
    return { tripIndex: Math.floor((simSec + phase * roundLen) / roundLen), direction: "morning", elapsedSec: 0, progress: 0, parked: "at_stop", frac: local / roundLen };
  }
  // 2. morning run out to school
  if (local < cursor + trip) {
    const elapsed = local - cursor;
    return { tripIndex: Math.floor((simSec + phase * roundLen) / roundLen), direction: "morning", elapsedSec: elapsed, progress: progressFor(route, elapsed), parked: "none", frac: local / roundLen };
  }
  cursor += trip;
  // 3. parked at school (handover)
  if (local < cursor + PARK_SCHOOL_SEC) {
    return { tripIndex: Math.floor((simSec + phase * roundLen) / roundLen), direction: "morning", elapsedSec: trip, progress: 1, parked: "at_school", frac: local / roundLen };
  }
  cursor += PARK_SCHOOL_SEC;
  // 4. afternoon run back out, visiting stops in reverse
  if (local < cursor + trip) {
    const elapsed = local - cursor;
    return { tripIndex: Math.floor((simSec + phase * roundLen) / roundLen), direction: "afternoon", elapsedSec: trip - elapsed, progress: progressFor(route, trip - elapsed), parked: "none", frac: local / roundLen };
  }
  cursor += trip;
  // 5. parked back at the first stop
  return { tripIndex: Math.floor((simSec + phase * roundLen) / roundLen), direction: "morning", elapsedSec: 0, progress: 0, parked: "at_stop", frac: local / roundLen };
}

export type SnapshotOptions = { scale?: number; startedAtMs?: number };

export function snapshotAt(nowMs: number, opts: SnapshotOptions = {}): Snapshot {
  const scale = opts.scale ?? TIME_SCALE;
  const startedAtMs = opts.startedAtMs ?? 0;
  const simSec = Math.floor(((nowMs - startedAtMs) / 1000) * scale);

  // A believable school-day clock that only ever moves forward.
  const DAY_START = 6 * 3600 + 40 * 60;
  const clockSec = (DAY_START + simSec) % 86400;
  const clockLabel = `${String(Math.floor(clockSec / 3600)).padStart(2, "0")}:${String(
    Math.floor((clockSec % 3600) / 60)
  ).padStart(2, "0")}`;

  const buses: Bus[] = BUSES.map((b) => {
    const route = ROUTES.find((r) => r.id === b.routeId)!;
    const phase = ROUTE_PHASES[route.id] ?? 0;
    const run = busRun(route, phase, simSec);

    const isBroken =
      b.id === BREAKDOWN.busId && run.frac >= BREAKDOWN.from && run.frac <= BREAKDOWN.to;

    let progress = run.progress;
    let status: Bus["status"] = "on_time";
    if (run.parked === "at_school") status = "finished";
    if (isBroken) {
      progress = Math.min(progress, BREAKDOWN.atProgress);
      status = "breakdown";
    }

    const idx = Math.round(progress * (route.path.length - 1));
    const coord = isBroken && progress < run.progress ? pointAt(route, progress) : pointAt(route, progress);
    const ahead = route.path[Math.min(route.path.length - 1, idx + 2)];
    const behind = route.path[Math.max(0, idx - 2)];

    const wobble = noise(Math.floor(simSec / 15) + route.id.charCodeAt(3));
    const baseDelay = Math.round(noise(route.id.charCodeAt(3) + 2) * 240);
    const delaySec = isBroken
      ? 840 + Math.round(wobble * 180)
      : Math.round(baseDelay + Math.sin(simSec / 140 + route.id.charCodeAt(3)) * 55) - 60;

    if (!isBroken && delaySec > 200) status = "delayed";

    const elapsed = run.elapsedSec;
    const nextStop: Stop =
      run.direction === "morning"
        ? (route.stops.find((s) => s.offsetSec > elapsed) ?? route.stops[route.stops.length - 1])
        : ([...route.stops].reverse().find((s) => s.offsetSec < elapsed) ?? route.stops[0]);

    const assigned = STUDENTS.filter((s) => s.busId === b.id);
    const morningShare = Math.min(1, progress * 1.15);
    const onBoard =
      run.direction === "morning"
        ? Math.round(assigned.length * (run.parked === "at_school" ? 1 : morningShare))
        : Math.round(assigned.length * (1 - morningShare));

    const moving = run.parked === "none" && !isBroken;
    const remainingSec =
      run.direction === "morning"
        ? Math.max(0, route.durationSec - elapsed)
        : elapsed;

    return {
      ...b,
      onBoard,
      status,
      delaySec: Math.max(-150, delaySec),
      speedKph: moving ? Math.round(15 + wobble * 26) : 0,
      heading: bearing(behind, ahead),
      position: coord,
      coord,
      lastPingSec: 1 + Math.round(wobble * 5),
      fuelPct: Math.round(34 + noise(route.id.charCodeAt(3) + 9) * 58),
      odometerKm: Math.round(2400 + noise(route.id.charCodeAt(3) + 21) * 8000),
      nextStopId: nextStop.id,
      progress,
      direction: run.direction,
      parkState: isBroken ? "stopped" : run.parked,
      etaSec: isBroken ? remainingSec + 600 : Math.max(0, remainingSec + (isBroken ? 0 : delaySec)),
      tripIndex: run.tripIndex,
    };
  });

  const students = STUDENTS.map((s) => {
    const bus = buses.find((b) => b.id === s.busId)!;
    const route = ROUTES.find((r) => r.id === s.routeId)!;
    const stop = route.stops.find((st) => st.id === s.stopId)!;
    const elapsed = bus.direction === "morning" ? route.durationSec - bus.etaSec : bus.etaSec;
    const passed = elapsed >= stop.offsetSec;
    let boardStatus: Snapshot["students"][number]["boardStatus"];
    if (bus.direction === "morning") {
      boardStatus = bus.parkState === "at_school" ? "onboard" : passed ? "onboard" : "waiting";
    } else {
      boardStatus = passed ? "dropped" : "onboard";
    }
    return { ...s, boardStatus };
  });

  const events = buildEvents(buses, students, simSec);
  const alerts = buildAlerts(buses, simSec, events);

  const activeBuses = buses.filter((b) => b.status !== "finished");
  const onTime = activeBuses.filter((b) => b.delaySec <= 180).length;
  const totalStudents = students.length;
  const onBoard = students.filter((s) => s.boardStatus === "onboard").length;
  const dropped = students.filter((s) => s.boardStatus === "dropped").length;

  return {
    serverTimeMs: nowMs,
    simSec,
    clockLabel,
    school: SCHOOL,
    routes: ROUTES,
    buses,
    drivers: DRIVERS,
    attendants: ATTENDANTS,
    students,
    guardians: GUARDIANS,
    alerts,
    events,
    kpis: {
      busesActive: activeBuses.length,
      busesTotal: buses.length,
      studentsOnBoard: onBoard,
      studentsTotal: totalStudents,
      onTimePct: activeBuses.length ? Math.round((onTime / activeBuses.length) * 100) : 100,
      avgDelaySec: activeBuses.length
        ? Math.round(activeBuses.reduce((a, b) => a + Math.max(0, b.delaySec), 0) / activeBuses.length)
        : 0,
      openAlerts: alerts.filter((a) => !a.acknowledged && a.severity !== "info").length,
      attendancePct: totalStudents ? Math.round(((onBoard + dropped) / totalStudents) * 100) : 0,
    },
  };
}

function buildEvents(buses: Bus[], students: Snapshot["students"], simSec: number): TripEvent[] {
  const out: TripEvent[] = [];
  for (const bus of buses) {
    if (bus.parkState === "at_stop" || bus.status === "breakdown") {
      out.push({
        id: `ev-${bus.id}-wait`,
        atSec: simSec - 20,
        kind: bus.status === "breakdown" ? "alert" : "note",
        busId: bus.id,
        text:
          bus.status === "breakdown"
            ? `${bus.plate} stopped with a mechanical fault, recovery en route`
            : `${bus.plate} waiting at the first stop`,
      });
      continue;
    }
    const route = ROUTES.find((r) => r.id === bus.routeId)!;
    const elapsed = bus.direction === "morning" ? route.durationSec - bus.etaSec : bus.etaSec;
    const assigned = students.filter((s) => s.busId === bus.id);

    for (const stop of route.stops) {
      if (stop.offsetSec > elapsed) continue;
      const kids = assigned.filter((s) => s.stopId === stop.id).length;
      const count = Math.max(1, Math.round(kids * 0.8));
      out.push({
        id: `ev-${bus.id}-${stop.id}-${bus.direction}-${bus.tripIndex}`,
        atSec: simSec - Math.round((elapsed - stop.offsetSec)) - 30,
        kind: bus.direction === "morning" ? "board" : "drop",
        stopId: stop.id,
        busId: bus.id,
        text:
          bus.direction === "morning"
            ? `${count} student${count === 1 ? "" : "s"} boarded at ${stop.name}`
            : `${count} student${count === 1 ? "" : "s"} dropped at ${stop.name}`,
      });
    }
  }
  out.sort((a, b) => b.atSec - a.atSec);
  return out.slice(0, 40);
}

function buildAlerts(buses: Bus[], simSec: number, events: TripEvent[]): Alert[] {
  const alerts: Alert[] = [];

  for (const seed of SCRIPTED_ALERTS) {
    if (seed.kind === "breakdown") {
      const bus = buses.find((b) => b.id === seed.busId);
      if (bus?.status === "breakdown") alerts.push({ ...seed, atSec: simSec - 240, acknowledged: false });
      continue;
    }
    if (simSec % 7 < 4 || seed.severity === "info") {
      alerts.push({ ...seed, atSec: simSec - 600, acknowledged: true });
    }
  }

  for (const ev of events.slice(0, 4)) {
    const bus = buses.find((b) => b.id === ev.busId);
    if (!bus || ev.kind === "alert") continue;
    alerts.push({
      id: `al-live-${ev.id}`,
      kind: ev.kind === "board" ? "boarding" : ev.kind === "drop" ? "dropoff" : "geofence",
      busId: ev.busId,
      routeId: bus.routeId,
      title: ev.kind === "board" ? "Boarding confirmed" : ev.kind === "drop" ? "Drop-off confirmed" : "Route update",
      body: ev.text,
      atSec: ev.atSec,
      severity: "info",
      acknowledged: true,
    });
  }

  return alerts.sort((a, b) => b.atSec - a.atSec).slice(0, 14);
}

/** Straight-line distance from a bus to the school gate, in km. */
export function distanceToSchoolKm(bus: Bus): number {
  return Math.round(haversineKm(bus.position, SCHOOL.coord) * 10) / 10;
}

export { projectOntoPath };

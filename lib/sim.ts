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
import type { Alert, Bus, Driver, Route, Snapshot, Stop, TripEvent } from "./types";
import type { RegisteredBus, RegisteredDriver } from "./store";

/**
 * How fast simulated time runs compared with wall clock.
 * Higher = buses move more on screen. 1 would be real time.
 */
export const TIME_SCALE = 60;

/** Kenya is UTC+3 year-round (no daylight saving). */
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;


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

/** The school day the simulator plays out, in local clock seconds. */
export const DAY = {
  /** buses begin boarding at their first stop */
  pickupStart: 6 * 3600 + 40 * 60,
  /** handover at school */
  arriveAt: 7 * 3600 + 40 * 60,
  /** buses leave school on the drop-off run */
  dropoffStart: 15 * 3600 + 30 * 60,
  /** back at the last stop */
  dropoffEnd: 16 * 3600 + 40 * 60,
  /**
   * How long a bus sits at each stop collecting or dropping children. A real
   * run dwells at a stop; without it the pickup run is one continuous sweep and
   * a guardian never sees a bus arrive.
   */
  stopDwellSec: 3 * 60,
};

const hhmm = (sec: number) => {
  const s = ((sec % 86400) + 86400) % 86400;
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
};

/**
 * Where a bus is at a given clock time.
 *
 * Driven by time of day rather than by how long the server has been running:
 * a school bus is on the road at 07:10 and parked overnight, and the console
 * clock must agree with the leg a bus claims to be on. Every route shares the
 * same departure envelope and stretches its own timetable to fit.
 *
 *   boarding → pickup run → handover → parked at school
 *            → drop-off run → parked at the last stop (overnight)
 */
export function busRun(route: Route, clockSec: number): BusRun {
  const trip = route.durationSec;

  // 1. overnight and early morning: parked at the first stop, children waiting
  if (clockSec < DAY.pickupStart) {
    return { tripIndex: -1, direction: "morning", elapsedSec: 0, progress: 0, parked: "at_stop", frac: 0 };
  }

  // 2. pickup run, stretched so the slowest route still arrives on time.
  //    A run is not one continuous sweep: the bus dwells at every stop while
  //    children board, which is exactly the window a guardian is watching for.
  const pickupSpan = DAY.arriveAt - DAY.pickupStart;
  if (clockSec < DAY.arriveAt) {
    const dwell = DAY.stopDwellSec;
    const drivingSpan = Math.max(1, pickupSpan - dwell * route.stops.length);
    const scale = drivingSpan / trip;
    const ridingSec = Math.max(0, clockSec - DAY.pickupStart);

    // wall time spent for a given amount of driving: driving + dwell at the
    // stops already reached. Invert it so the bus actually holds at a stop.
    const wallAt = (drivingSec: number) =>
      drivingSec * scale + dwell * route.stops.filter((st) => drivingSec >= st.offsetSec).length;

    let lo = 0;
    let hi = trip;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (wallAt(mid) < ridingSec) lo = mid;
      else hi = mid;
    }
    const elapsed = (lo + hi) / 2;

    return {
      tripIndex: 0,
      direction: "morning",
      elapsedSec: elapsed,
      progress: progressFor(route, elapsed),
      parked: "none",
      frac: Math.min(1, ridingSec / pickupSpan),
    };
  }

  // 3. parked at school through the school day
  if (clockSec < DAY.dropoffStart) {
    const f = (clockSec - DAY.arriveAt) / (DAY.dropoffStart - DAY.arriveAt);
    return { tripIndex: 0, direction: "morning", elapsedSec: trip, progress: 1, parked: "at_school", frac: f };
  }

  // 4. drop-off run, stops visited in reverse
  const dropSpan = DAY.dropoffEnd - DAY.dropoffStart;
  if (clockSec < DAY.dropoffEnd) {
    const f = (clockSec - DAY.dropoffStart) / dropSpan;
    const elapsed = trip - f * trip;
    return {
      tripIndex: 1,
      direction: "afternoon",
      elapsedSec: elapsed,
      progress: progressFor(route, elapsed),
      parked: "none",
      frac: f,
    };
  }

  // 5. parked at the last stop until tomorrow
  return { tripIndex: 1, direction: "afternoon", elapsedSec: 0, progress: 0, parked: "at_stop", frac: 1 };
}

export type SnapshotOptions = {
  scale?: number;
  startedAtMs?: number;
  /** buses and drivers the school registered through the console */
  registeredBuses?: RegisteredBus[];
  registeredDrivers?: RegisteredDriver[];
};

/** Deterministic pseudo-random in [0,1) from a string, so a registered bus
 *  keeps the same "character" (fuel, odometer, phase) across requests. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** A tracker that was registered but never sent a fix is 'offline', which is a
 *  different fact from "broken down" — schools need to chase the hardware. */
function isOffline(bus: RegisteredBus): boolean {
  return !bus.trackerId || bus.trackerId.trim().length < 3;
}

export function snapshotAt(nowMs: number, opts: SnapshotOptions = {}): Snapshot {
  const scale = opts.scale ?? TIME_SCALE;
  const startedAtMs = opts.startedAtMs ?? 0;
  const simSec = Math.floor(((nowMs - startedAtMs) / 1000) * scale);

  // The console clock is the real time of day (Nairobi, UTC+3), advanced by the
  // same speed-up as the buses. It never wraps into an impossible hour.
  const kenyaNowSec = Math.floor((nowMs + EAT_OFFSET_MS) / 1000);
  const clockSec = (kenyaNowSec + simSec) % 86400;
  const clockLabel = hhmm(clockSec);

  const buses: Bus[] = BUSES.map((b) => {
    const route = ROUTES.find((r) => r.id === b.routeId)!;
    // A small per-route phase keeps buses from hitting every stop in lockstep
    // without breaking the time-of-day contract.
    const phase = (ROUTE_PHASES[route.id] ?? 0) * 90;
    const run = busRun(route, clockSec + phase);

    // One scripted incident during the pickup run, so the console has a real
    // emergency to handle rather than a random status flicker.
    const isBroken =
      b.id === BREAKDOWN.busId &&
      run.direction === "morning" &&
      run.parked === "none" &&
      clockSec >= DAY.pickupStart + 900 &&
      clockSec <= DAY.pickupStart + 3300;

    let progress = run.progress;
    let status: Bus["status"] = "on_time";
    // "finished" means: not on the road right now (handover, or parked overnight).
    if (run.parked === "at_school" || run.parked === "at_stop") status = "finished";
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
      : run.parked !== "none"
        ? 0
        : Math.round(baseDelay + Math.sin(simSec / 140 + route.id.charCodeAt(3)) * 55) - 60;

    // Only a bus that is actually moving can be running late.
    if (!isBroken && run.parked === "none" && delaySec > 200) status = "delayed";

    const elapsed = run.elapsedSec;
    const nextStop: Stop =
      run.direction === "morning"
        ? (route.stops.find((s) => s.offsetSec > elapsed) ?? route.stops[route.stops.length - 1])
        : ([...route.stops].reverse().find((s) => s.offsetSec < elapsed) ?? route.stops[0]);

    const assigned = STUDENTS.filter((s) => s.busId === b.id);
    // Occupancy is the direct read of the leg:
    //  boarding/pickup  → fills up as stops are served
    //  at school        → everyone aboard (handover)
    //  drop-off         → empties as stops are served in reverse
    //  overnight        → empty
    // Occupancy reads straight off the drawn position, because progress is
    // 0 at the outer stops and 1 at school on both legs:
    //   pickup  → fills as the bus travels outward to school
    //   drop-off→ empties as it travels back out from school
    const share = Math.min(1, progress * 1.15);
    let onBoard: number;
    if (run.parked === "at_school") onBoard = assigned.length;
    else if (run.parked === "at_stop") onBoard = run.direction === "morning" ? 0 : 0;
    else onBoard = Math.round(assigned.length * share);

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

  // How many vehicles already sit on each route, so the Nth one can be nudged
  // aside instead of landing on top of the first.
  const perRoute = new Map<string, number>();
  for (const b of buses) perRoute.set(b.routeId, (perRoute.get(b.routeId) ?? 0) + 1);

  for (const reg of opts.registeredBuses ?? []) {
    const route = ROUTES.find((r) => r.id === reg.routeId);
    if (!route) continue;
    const run = busRun(route, clockSec);
    // A second bus on the same route must not render on top of the first, or
    // the manager registers a vehicle and never sees it. Each registered bus is
    // nudged back along its own path by a stable, per-vehicle amount.
    const ordinal = perRoute.get(reg.routeId) ?? 1;
    perRoute.set(reg.routeId, ordinal + 1);
    const ownProgress = run.progress;
    // ~55 m sideways per extra vehicle on the route, stable per bus.
    const side = (ordinal % 2 === 0 ? 1 : -1) * 0.0005 * Math.ceil(ordinal / 2);
    const base = pointAt(route, ownProgress);
    const coord = { lat: base.lat + side, lng: base.lng + side * 0.8 };
    const idx = Math.round(ownProgress * (route.path.length - 1));
    const jitter = noise(hash(reg.id) * 1000 + Math.floor(simSec / 15));
    const offline = isOffline(reg);

    const delaySec = Math.round(noise(hash(reg.id) * 100 + 7) * 210) - 50;
    const nextStop =
      run.direction === "morning"
        ? (route.stops.find((s) => s.offsetSec > run.elapsedSec) ?? route.stops[route.stops.length - 1])
        : ([...route.stops].reverse().find((s) => s.offsetSec < run.elapsedSec) ?? route.stops[0]);

    buses.push({
      id: reg.id,
      plate: reg.plate,
      name: `${reg.plate} · ${reg.model}`,
      routeId: reg.routeId,
      driverId: reg.driverId ?? `unassigned-${reg.id}`,
      attendantId: "",
      capacity: reg.capacity,
      onBoard: Math.round(reg.capacity * 0.55 * Math.min(1, run.progress * 1.2)),
      status: offline
        ? "offline"
        : reg.status === "maintenance"
          ? "breakdown"
          : delaySec > 200
            ? "delayed"
            : run.parked === "at_school"
              ? "finished"
              : "on_time",
      delaySec,
      speedKph: offline || run.parked !== "none" ? 0 : Math.round(16 + jitter * 24),
      heading: bearing(route.path[Math.max(0, idx - 2)], route.path[Math.min(route.path.length - 1, idx + 2)]),
      position: coord,
      coord,
      lastPingSec: offline ? 0 : 1 + Math.round(jitter * 5),
      fuelPct: Math.round(40 + hash(reg.id + "f") * 55),
      odometerKm: Math.round(1200 + hash(reg.id + "o") * 9000),
      nextStopId: nextStop.id,
      progress: offline ? 0 : ownProgress,
      direction: run.direction,
      parkState: offline ? "stopped" : run.parked,
      etaSec: Math.max(0, run.direction === "morning" ? route.durationSec - run.elapsedSec : run.elapsedSec),
      tripIndex: run.tripIndex,
      registered: true,
      model: reg.model,
      trackerId: reg.trackerId,
      attendantOnDuty: reg.attendantName,
      offlineReason: offline
        ? "No GPS tracker paired yet — add a tracker ID to start streaming"
        : reg.status === "maintenance"
          ? "In maintenance — reporting to the workshop"
          : undefined,
    });
  }

  const students = STUDENTS.map((s) => {
    const bus = buses.find((b) => b.id === s.busId)!;
    const route = ROUTES.find((r) => r.id === s.routeId)!;
    const stop = route.stops.find((st) => st.id === s.stopId)!;
    const elapsed = bus.direction === "morning" ? route.durationSec - bus.etaSec : bus.etaSec;
    const passed = elapsed >= stop.offsetSec;
    let boardStatus: Snapshot["students"][number]["boardStatus"];
    if (bus.parkState === "at_school") {
      // handover done — they are in class
      boardStatus = "dropped";
    } else if (bus.parkState === "at_stop" && (bus.tripIndex === -1 || bus.tripIndex === 1)) {
      // Parked overnight in the bay: the day's trip has not started, so nobody
      // is aboard. Without this a parked bus reports a full load every night.
      boardStatus = "waiting";
    } else if (bus.direction === "morning") {
      boardStatus = passed ? "onboard" : "waiting";
    } else {
      boardStatus = passed ? "dropped" : "onboard";
    }
    return { ...s, boardStatus };
  });

  const events = buildEvents(buses, students, simSec);
  const alerts = buildAlerts(buses, simSec, events);

  const rosterDrivers: Driver[] = [
    ...DRIVERS,
    ...(opts.registeredDrivers ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      licence: d.licence,
      rating: 4.5,
      yearsExp: d.yearsExp,
      avatarHue: Math.round(hash(d.id) * 360),
    })),
  ];

  const activeBuses = buses.filter((b) => b.status !== "finished" && b.status !== "offline");
  const onTime = activeBuses.filter((b) => b.delaySec <= 180).length;
  const totalStudents = students.length;
  const onBoard = students.filter((s) => s.boardStatus === "onboard").length;
  const dropped = students.filter((s) => s.boardStatus === "dropped").length;
  const accounted = students.filter((s) => s.boardStatus !== "waiting").length;

  const phase = ((): Snapshot["phase"] => {
    if (clockSec < DAY.pickupStart) {
      return {
        current: "before_service",
        label: "Before service",
        detail: "Buses parked",
        nextEvent: `First departures ${hhmm(DAY.pickupStart)}`,
      };
    }
    if (clockSec < DAY.arriveAt) {
      return {
        current: "pickup",
        label: "Morning pickup run",
        detail: "Collecting students",
        nextEvent: `Handover at school ${hhmm(DAY.arriveAt)}`,
      };
    }
    if (clockSec < DAY.dropoffStart) {
      return {
        current: "in_session",
        label: "In session",
        detail: "All students handed over",
        nextEvent: `Afternoon run ${hhmm(DAY.dropoffStart)}`,
      };
    }
    if (clockSec < DAY.dropoffEnd) {
      return {
        current: "dropoff",
        label: "Afternoon drop-off run",
        detail: "Taking students home",
        nextEvent: `Run completes ${hhmm(DAY.dropoffEnd)}`,
      };
    }
    return {
      current: "after_service",
      label: "Service finished",
      detail: "All students delivered",
      nextEvent: `Morning run tomorrow ${hhmm(DAY.pickupStart)}`,
    };
  })();

  return {
    serverTimeMs: nowMs,
    simSec,
    clockLabel,
    phase,
    school: SCHOOL,
    routes: ROUTES,
    buses,
    drivers: rosterDrivers,
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
      attendancePct: totalStudents ? Math.round((accounted / totalStudents) * 100) : 0,
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

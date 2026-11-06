import { haversineKm } from "./geo";
import type { Bus, Route, Stop } from "./types";

export type StopEta = {
  /** true when the bus still has to reach this stop on this leg */
  ahead: boolean;
  /** seconds until the bus reaches the stop; null when it already passed */
  etaSec: number | null;
  /** metres from the bus to the stop, straight line */
  distanceM: number;
  /** scheduled offset of the stop, for the "should have been here" case */
  scheduledOffsetSec: number;
  /** how late the bus is against the schedule at this point */
  delaySec: number;
};

/**
 * Time until a bus reaches a specific stop on its current leg.
 *
 * The snapshot's `etaSec` is time-to-school (morning) or time-since-leaving-
 * school (afternoon); `elapsedSec` is the run-local clock that stop offsets are
 * measured against. Getting this wrong is what makes a parent's countdown jump.
 */
export function etaToStop(bus: Bus, route: Route, stop: Stop): StopEta {
  const elapsedSec = bus.direction === "morning" ? route.durationSec - bus.etaSec : bus.etaSec;
  const ahead = bus.direction === "morning" ? elapsedSec < stop.offsetSec : elapsedSec > stop.offsetSec;

  const distanceM = Math.round(haversineKm(bus.position, stop.coord) * 1000);

  if (!ahead) {
    return {
      ahead: false,
      etaSec: null,
      distanceM,
      scheduledOffsetSec: stop.offsetSec,
      delaySec: bus.delaySec,
    };
  }

  const remainingSec = Math.abs(stop.offsetSec - elapsedSec);
  // Traffic delay is additive, but a bus can also run early — never promise
  // a negative arrival.
  const etaSec = Math.max(15, remainingSec + bus.delaySec);

  return {
    ahead: true,
    etaSec,
    distanceM,
    scheduledOffsetSec: stop.offsetSec,
    delaySec: bus.delaySec,
  };
}

/** Round to the nearest minute, but never show "0 min" while the bus is coming. */
export function etaMinutes(etaSec: number | null): number | null {
  if (etaSec === null) return null;
  return Math.max(1, Math.round(etaSec / 60));
}

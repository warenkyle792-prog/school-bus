import { snapshotAt, TIME_SCALE } from "./sim";
import { SERVER_START_MS } from "./serverClock";
import { listRegistry } from "./store";
import type { Snapshot } from "./types";

/**
 * The single source of live data.
 *
 * Used by both `GET /api/snapshot` and the server-rendered page shells, so the
 * console paints populated on first byte instead of showing a spinner while the
 * browser waits for its first fetch.
 */
export async function getSnapshot(): Promise<Snapshot & { timeScale: number }> {
  const registry = await listRegistry();
  const snap = snapshotAt(Date.now(), {
    startedAtMs: SERVER_START_MS,
    scale: TIME_SCALE,
    registeredBuses: registry.buses,
    registeredDrivers: registry.drivers,
  });
  return { ...snap, timeScale: TIME_SCALE };
}

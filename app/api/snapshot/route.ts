import { NextResponse } from "next/server";
import { snapshotAt, TIME_SCALE } from "@/lib/sim";
import { listRegistry } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Process start acts as t=0 so every request sees the same timeline. */
const START = Date.now();

export async function GET() {
  // Registered buses/drivers are merged into the same live snapshot, so a bus
  // added in the console shows up on the GPS map on the next tick.
  const registry = await listRegistry();
  const snap = snapshotAt(Date.now(), {
    startedAtMs: START,
    scale: TIME_SCALE,
    registeredBuses: registry.buses,
    registeredDrivers: registry.drivers,
  });
  return NextResponse.json(
    { ...snap, timeScale: TIME_SCALE },
    { headers: { "Cache-Control": "no-store" } }
  );
}

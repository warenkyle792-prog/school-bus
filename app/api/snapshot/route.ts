import { NextResponse } from "next/server";
import { snapshotAt, TIME_SCALE } from "@/lib/sim";

export const dynamic = "force-dynamic";

/** Process start acts as t=0 so every request sees the same timeline. */
const START = Date.now();

export async function GET() {
  const snap = snapshotAt(Date.now(), { startedAtMs: START, scale: TIME_SCALE });
  return NextResponse.json(
    { ...snap, timeScale: TIME_SCALE },
    { headers: { "Cache-Control": "no-store" } }
  );
}

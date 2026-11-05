import { NextResponse } from "next/server";
import { createBroadcast, listBroadcasts } from "@/lib/broadcast";
import { snapshotAt, TIME_SCALE } from "@/lib/sim";
import { SERVER_START_MS } from "@/lib/serverClock";
import { listRegistry } from "@/lib/store";

export const dynamic = "force-dynamic";

const START = SERVER_START_MS;

export async function GET(request: Request) {
  const routeId = new URL(request.url).searchParams.get("route") ?? undefined;
  return NextResponse.json(
    { broadcasts: await listBroadcasts(routeId) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const routeId = String(body.routeId ?? "");
  const message = String(body.body ?? "").trim();
  const priority = body.priority === "emergency" || body.priority === "delay" ? body.priority : "info";

  if (!routeId) return NextResponse.json({ error: "Choose a route." }, { status: 400 });
  if (message.length < 5) return NextResponse.json({ error: "Message is too short." }, { status: 400 });
  if (message.length > 500) return NextResponse.json({ error: "Keep it under 500 characters." }, { status: 400 });

  const registry = await listRegistry();
  const snap = snapshotAt(Date.now(), {
    startedAtMs: START,
    scale: TIME_SCALE,
    registeredBuses: registry.buses,
    registeredDrivers: registry.drivers,
  });

  const bus = snap.buses.find((b) => b.routeId === routeId);
  if (!bus) return NextResponse.json({ error: "No bus is running that route." }, { status: 404 });

  // Recipients are the households with a child on this bus — the same set the
  // parent app filters by, so what we count is what actually gets it.
  const recipients = new Set(
    snap.students.filter((s) => s.busId === bus.id).map((s) => s.guardianId)
  ).size;

  const broadcast = await createBroadcast({
    routeId,
    busId: bus.id,
    title: String(body.title ?? "").trim() || "Message from the school",
    body: message,
    priority,
    sentBy: String(body.sentBy ?? "Transport desk"),
    recipients,
  });

  return NextResponse.json({ broadcast }, { status: 201 });
}

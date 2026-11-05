import { NextResponse } from "next/server";
import { etaToStop } from "@/lib/eta";
import { seedMessages } from "@/lib/messages";
import { snapshotAt, TIME_SCALE } from "@/lib/sim";
import { listRegistry } from "@/lib/store";

export const dynamic = "force-dynamic";

const START = Date.now();

/**
 * Pickup reminders.
 *
 * A guardian picks a lead time (5 or 10 minutes). The school's job is to fire
 * the reminder *before* that, so the parent can walk to the pickup point. We
 * persist the choice on the client and compute the due state here, from the
 * same ETA the app shows — one source of truth, so the notification never
 * disagrees with the screen.
 */
export type ReminderStatus = {
  childId: string;
  leadMin: number;
  busId: string;
  stopId: string;
  etaSec: number | null;
  distanceM: number;
  /** seconds until the reminder fires; <= 0 means "go now" */
  firesInSec: number | null;
  state: "unscheduled" | "scheduled" | "due" | "fired" | "passed" | "offline";
  message: string;
};

export function computeReminder(
  childId: string,
  leadMin: number,
  snapshot: ReturnType<typeof snapshotAt>
): ReminderStatus {
  const child = snapshot.students.find((s) => s.id === childId);
  if (!child) {
    return {
      childId,
      leadMin,
      busId: "",
      stopId: "",
      etaSec: null,
      distanceM: 0,
      firesInSec: null,
      state: "unscheduled",
      message: "Child not found",
    };
  }
  const bus = snapshot.buses.find((b) => b.id === child.busId);
  const route = snapshot.routes.find((r) => r.id === child.routeId);
  const stop = route?.stops.find((s) => s.id === child.stopId);

  if (!bus || !route || !stop) {
    return {
      childId,
      leadMin,
      busId: child.busId,
      stopId: child.stopId,
      etaSec: null,
      distanceM: 0,
      firesInSec: null,
      state: "unscheduled",
      message: "No live bus for this stop",
    };
  }

  const eta = etaToStop(bus, route, stop);

  if (bus.status === "offline") {
    return {
      childId,
      leadMin,
      busId: bus.id,
      stopId: stop.id,
      etaSec: null,
      distanceM: eta.distanceM,
      firesInSec: null,
      state: "offline",
      message: "Bus is not reporting GPS — reminders resume when it reconnects",
    };
  }

  if (!eta.ahead || eta.etaSec === null) {
    return {
      childId,
      leadMin,
      busId: bus.id,
      stopId: stop.id,
      etaSec: null,
      distanceM: eta.distanceM,
      firesInSec: null,
      state: "passed",
      message:
        child.boardStatus === "onboard"
          ? "Your child is already on the bus"
          : "The bus has already passed this stop",
    };
  }

  const leadSec = leadMin * 60;
  const firesInSec = eta.etaSec - leadSec;

  return {
    childId,
    leadMin,
    busId: bus.id,
    stopId: stop.id,
    etaSec: eta.etaSec,
    distanceM: eta.distanceM,
    firesInSec,
    state: firesInSec <= 0 ? "due" : "scheduled",
    message:
      firesInSec <= 0
        ? `Leave now — ${stop.name} is ${Math.max(1, Math.round(eta.etaSec / 60))} min away`
        : `Reminder in ${Math.max(1, Math.ceil(firesInSec / 60))} min · bus ${Math.max(1, Math.round(eta.etaSec / 60))} min away`,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const childIds = (url.searchParams.get("children") ?? "").split(",").filter(Boolean);
  const leadMin = Math.max(1, Math.min(30, Number(url.searchParams.get("lead") ?? 10)));

  const registry = await listRegistry();
  const snapshot = snapshotAt(Date.now(), {
    startedAtMs: START,
    scale: TIME_SCALE,
    registeredBuses: registry.buses,
    registeredDrivers: registry.drivers,
  });

  return NextResponse.json(
    {
      leadMin,
      reminders: childIds.map((id) => computeReminder(id, leadMin, snapshot)),
      messages: seedMessages(snapshot.routes, snapshot.simSec),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

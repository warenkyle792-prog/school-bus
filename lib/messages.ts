/**
 * Driver ↔ parent emergency comms.
 *
 * A single thread per route, so a driver's "bus 15 minutes late, stuck at
 * Nyayo" reaches every guardian on that run at once. Threads are seeded with a
 * short, realistic history so the feature reads correctly on first load.
 */

export type MessagePriority = "emergency" | "delay" | "info";

export type CommMessage = {
  id: string;
  routeId: string;
  /** author */
  from: "driver" | "attendant" | "school" | "parent";
  authorName: string;
  body: string;
  atSec: number;
  priority: MessagePriority;
  /** guardians who have confirmed */
  seenBy: string[];
  mine?: boolean;
};

/** Quick messages a driver can fire from the road in one tap. */
export const DRIVER_TEMPLATES: Array<{ priority: MessagePriority; label: string; body: string }> = [
  {
    priority: "emergency",
    label: "Delayed at a stop",
    body: "We are held up at a stop and the run is delayed. All children are safe on board. I will update you in 10 minutes.",
  },
  {
    priority: "delay",
    label: "Heavy traffic",
    body: "Heavy traffic ahead. Expect the bus about 10 minutes later than scheduled — please stay near your pickup point.",
  },
  {
    priority: "info",
    label: "Almost there",
    body: "Approaching the next stops. Please be at your pickup point in the next 5 minutes.",
  },
  {
    priority: "emergency",
    label: "Breakdown",
    body: "The bus has stopped with a mechanical issue. All children are safe and a recovery bus is on the way.",
  },
];

export function seedMessages(routes: Array<{ id: string; code: string }>, simSec: number): CommMessage[] {
  const out: CommMessage[] = [];
  for (const [i, route] of routes.entries()) {
    out.push({
      id: `msg-${route.id}-1`,
      routeId: route.id,
      from: "attendant",
      authorName: "Bus attendant",
      body: `Good morning. ${route.code} has started its run — please have the children ready at the pickup point.`,
      atSec: Math.max(0, simSec - 900 - i * 60),
      priority: "info",
      seenBy: ["g-01", "g-02"],
    });
    if (i % 2 === 0) {
      out.push({
        id: `msg-${route.id}-2`,
        routeId: route.id,
        from: "driver",
        authorName: "Driver",
        body: "Slight delay on our route this morning. All children on board are safe and accounted for.",
        atSec: Math.max(0, simSec - 420 - i * 90),
        priority: "delay",
        seenBy: ["g-01"],
      });
    }
  }
  return out.sort((a, b) => b.atSec - a.atSec);
}

/** Applied when a parent replies from the app. */
export function parentReply(routeId: string, guardianName: string, body: string, simSec: number): CommMessage {
  return {
    id: `msg-${routeId}-${Date.now()}`,
    routeId,
    from: "parent",
    authorName: guardianName,
    body,
    atSec: simSec,
    priority: "info",
    seenBy: [],
    mine: true,
  };
}

/** Applied when a driver fires a quick message. */
export function driverMessage(
  routeId: string,
  authorName: string,
  body: string,
  priority: MessagePriority,
  simSec: number
): CommMessage {
  return {
    id: `msg-${routeId}-${Date.now()}`,
    routeId,
    from: "driver",
    authorName,
    body,
    atSec: simSec,
    priority,
    seenBy: [],
  };
}

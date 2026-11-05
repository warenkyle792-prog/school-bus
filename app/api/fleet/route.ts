import { NextResponse } from "next/server";
import { listRegistry, registerBus, registerDriver } from "@/lib/store";
import { ROUTES } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const registry = await listRegistry();
  return NextResponse.json(registry, { headers: { "Cache-Control": "no-store" } });
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("Expected a JSON body.");
  }

  const kind = body.kind;
  try {
    if (kind === "bus") {
      const plate = String(body.plate ?? "").trim();
      const capacity = Number(body.capacity);

      // Validate on the server, not just in the form: this endpoint is the
      // actual security boundary once real auth is in place.
      if (!/^[A-Za-z]{3}\s?\d{3}[A-Za-z]?$/.test(plate)) {
        return bad("Plate must look like KDL 412X.");
      }
      if (!Number.isFinite(capacity) || capacity < 8 || capacity > 90) {
        return bad("Capacity must be between 8 and 90 seats.");
      }
      const routeId = String(body.routeId ?? "");
      if (!ROUTES.some((r) => r.id === routeId)) return bad("Choose a valid route.");

      const bus = await registerBus({
        plate,
        model: String(body.model ?? "").trim() || "School bus",
        capacity: Math.round(capacity),
        routeId,
        driverId: body.driverId ? String(body.driverId) : null,
        attendantName: String(body.attendantName ?? "").trim(),
        trackerId: String(body.trackerId ?? "").trim(),
        note: String(body.note ?? "").trim().slice(0, 240),
        status: body.status === "maintenance" ? "maintenance" : "active",
      });
      return NextResponse.json({ bus }, { status: 201 });
    }

    if (kind === "driver") {
      const name = String(body.name ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      const licence = String(body.licence ?? "").trim();

      if (name.length < 3) return bad("Enter the driver's full name.");
      if (!/^\+?[\d\s()-]{9,18}$/.test(phone)) return bad("Enter a valid phone number.");
      if (licence.length < 4) return bad("Enter the driving licence number.");

      const driver = await registerDriver({
        name,
        phone,
        licence,
        yearsExp: Math.max(0, Math.min(50, Number(body.yearsExp) || 0)),
      });
      return NextResponse.json({ driver }, { status: 201 });
    }

    return bad("Unknown record type.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed.";
    // Duplicate plate / phone / busy driver are conflicts, not bad requests.
    const status = /already/i.test(message) ? 409 : 500;
    return bad(message, status);
  }
}

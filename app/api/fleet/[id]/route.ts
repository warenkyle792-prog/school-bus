import { NextResponse } from "next/server";
import { assignDriver, removeBus, setBusStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  try {
    if ("driverId" in body) {
      const driverId = body.driverId === null ? null : String(body.driverId);
      const bus = await assignDriver(id, driverId || null);
      return NextResponse.json({ bus });
    }
    if (body.status === "active" || body.status === "maintenance") {
      const bus = await setBusStatus(id, body.status);
      return NextResponse.json({ bus });
    }
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: /already/i.test(message) ? 409 : 404 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await removeBus(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

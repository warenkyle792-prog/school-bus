import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/getSnapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  const snap = await getSnapshot();
  return NextResponse.json(snap, { headers: { "Cache-Control": "no-store" } });
}

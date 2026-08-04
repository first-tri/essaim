import { NextResponse } from "next/server";
import { fetchCurrentState } from "@/lib/opensky";
import { insertTrackpoint } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await fetchCurrentState();
    if (!state) {
      return NextResponse.json({ ok: true, inserted: false, reason: "no_current_state" });
    }
    const inserted = await insertTrackpoint(state);
    return NextResponse.json({ ok: true, inserted, point: state });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown_error" },
      { status: 502 },
    );
  }
}

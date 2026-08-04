import { NextResponse } from "next/server";
import { getAllTrackpoints, getLatestTrackpoint } from "@/lib/db";
import { AIRCRAFT } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [points, latest] = await Promise.all([getAllTrackpoints(), getLatestTrackpoint()]);

  let status: "en_vol" | "au_sol" | "aucune_donnee" = "aucune_donnee";
  if (latest) {
    const ageSeconds = Date.now() / 1000 - latest.time;
    if (ageSeconds < 15 * 60) {
      status = latest.on_ground ? "au_sol" : "en_vol";
    }
  }

  return NextResponse.json({
    aircraft: AIRCRAFT,
    status,
    latest: latest ?? null,
    points,
  });
}

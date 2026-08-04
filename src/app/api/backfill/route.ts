import { NextResponse } from "next/server";
import { fetchFlights, fetchTrack } from "@/lib/opensky";
import { insertTrackpoints } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OpenSky rejects any single query spanning more than 2 UTC calendar days, so wider
// backfills are done in safe 36h chunks and the results are concatenated.
async function fetchFlightsChunked(hoursBack: number, end: number) {
  const CHUNK_HOURS = 23; // strictly under 24h so a chunk can never span 3 UTC calendar days
  const all = [] as Awaited<ReturnType<typeof fetchFlights>>;
  let chunkEnd = end;
  let remaining = hoursBack;
  while (remaining > 0) {
    const chunk = Math.min(CHUNK_HOURS, remaining);
    const chunkBegin = chunkEnd - chunk * 3600;
    all.push(...(await fetchFlights(chunkBegin, chunkEnd)));
    chunkEnd = chunkBegin;
    remaining -= chunk;
  }
  return all;
}

/** Backfills already-completed flights (OpenSky live states only cover the present).
 *  Call once after deploying, or whenever a flight was missed while nobody had the page open. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hoursBack = Number(searchParams.get("hours") ?? "24");
  const end = Math.floor(Date.now() / 1000);

  try {
    const flights = await fetchFlightsChunked(hoursBack, end);
    let totalInserted = 0;
    const results: { firstSeen: number; lastSeen: number; points: number }[] = [];

    for (const flight of flights) {
      const track = await fetchTrack(flight.firstSeen);
      const inserted = await insertTrackpoints(track);
      totalInserted += inserted;
      results.push({ firstSeen: flight.firstSeen, lastSeen: flight.lastSeen, points: inserted });
    }

    return NextResponse.json({ ok: true, flights: flights.length, totalInserted, results });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown_error" },
      { status: 502 },
    );
  }
}

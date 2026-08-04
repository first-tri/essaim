import { createClient } from "@supabase/supabase-js";
import type { Trackpoint } from "./types";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

interface TrackpointRow {
  time: number;
  lat: number;
  lon: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  on_ground: boolean;
}

function mapRow(row: TrackpointRow): Trackpoint {
  return {
    time: row.time,
    lat: row.lat,
    lon: row.lon,
    altitude: row.altitude,
    speed: row.speed,
    heading: row.heading,
    on_ground: row.on_ground ? 1 : 0,
  };
}

export async function insertTrackpoint(point: Trackpoint): Promise<boolean> {
  const { error, count } = await supabase.from("trackpoints").upsert(
    {
      time: point.time,
      lat: point.lat,
      lon: point.lon,
      altitude: point.altitude,
      speed: point.speed,
      heading: point.heading,
      on_ground: !!point.on_ground,
    },
    { onConflict: "time", ignoreDuplicates: true, count: "exact" },
  );
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function insertTrackpoints(points: Trackpoint[]): Promise<number> {
  if (points.length === 0) return 0;
  const { error, count } = await supabase.from("trackpoints").upsert(
    points.map((point) => ({
      time: point.time,
      lat: point.lat,
      lon: point.lon,
      altitude: point.altitude,
      speed: point.speed,
      heading: point.heading,
      on_ground: !!point.on_ground,
    })),
    { onConflict: "time", ignoreDuplicates: true, count: "exact" },
  );
  if (error) throw error;
  return count ?? 0;
}

export async function getAllTrackpoints(): Promise<Trackpoint[]> {
  const { data, error } = await supabase
    .from("trackpoints")
    .select("*")
    .order("time", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getLatestTrackpoint(): Promise<Trackpoint | undefined> {
  const { data, error } = await supabase
    .from("trackpoints")
    .select("*")
    .order("time", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : undefined;
}

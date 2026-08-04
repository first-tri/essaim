import { AIRCRAFT } from "./constants";
import type { Trackpoint } from "./types";

interface OpenSkyResponse {
  time: number;
  states: unknown[][] | null;
}

/** Column indices per the OpenSky /states/all schema. */
const COL = {
  icao24: 0,
  callsign: 1,
  originCountry: 2,
  timePosition: 3,
  lastContact: 4,
  longitude: 5,
  latitude: 6,
  baroAltitude: 7,
  onGround: 8,
  velocity: 9,
  trueTrack: 10,
} as const;

const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.value;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`OpenSky auth failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchCurrentState(): Promise<Trackpoint | null> {
  const res = await fetch(
    `https://opensky-network.org/api/states/all?icao24=${AIRCRAFT.icao24}`,
    { cache: "no-store", headers: await authHeaders() },
  );
  if (!res.ok) throw new Error(`OpenSky request failed: ${res.status}`);

  const data = (await res.json()) as OpenSkyResponse;
  const state = data.states?.[0];
  if (!state) return null;

  const lat = state[COL.latitude] as number | null;
  const lon = state[COL.longitude] as number | null;
  const timePosition = (state[COL.timePosition] as number | null) ?? data.time;
  if (lat == null || lon == null) return null;

  return {
    time: timePosition,
    lat,
    lon,
    altitude: (state[COL.baroAltitude] as number | null) ?? null,
    speed: (state[COL.velocity] as number | null) ?? null,
    heading: (state[COL.trueTrack] as number | null) ?? null,
    on_ground: state[COL.onGround] ? 1 : 0,
  };
}

export interface FlightSummary {
  icao24: string;
  firstSeen: number;
  lastSeen: number;
  estDepartureAirport: string | null;
  estArrivalAirport: string | null;
}

/** Requires an authenticated OpenSky client (OPENSKY_CLIENT_ID / OPENSKY_CLIENT_SECRET). */
export async function fetchFlights(begin: number, end: number): Promise<FlightSummary[]> {
  const headers = await authHeaders();
  if (!("Authorization" in headers)) {
    throw new Error("OpenSky credentials required to fetch flight history");
  }
  const res = await fetch(
    `https://opensky-network.org/api/flights/aircraft?icao24=${AIRCRAFT.icao24}&begin=${begin}&end=${end}`,
    { cache: "no-store", headers },
  );
  if (res.status === 404) return []; // OpenSky returns 404 when no flights are found, not an error
  if (!res.ok) throw new Error(`OpenSky flights request failed: ${res.status}`);
  return (await res.json()) as FlightSummary[];
}

/** Detailed waypoint track for a single flight. `time` should be the flight's firstSeen. */
export async function fetchTrack(time: number): Promise<Trackpoint[]> {
  const headers = await authHeaders();
  if (!("Authorization" in headers)) {
    throw new Error("OpenSky credentials required to fetch a flight track");
  }
  const res = await fetch(
    `https://opensky-network.org/api/tracks/all?icao24=${AIRCRAFT.icao24}&time=${time}`,
    { cache: "no-store", headers },
  );
  if (!res.ok) throw new Error(`OpenSky track request failed: ${res.status}`);
  const json = (await res.json()) as {
    path: [number, number, number, number | null, number | null, boolean][];
  };
  return json.path.map(([t, lat, lon, altitude, heading, onGround]) => ({
    time: t,
    lat,
    lon,
    altitude,
    speed: null,
    heading,
    on_ground: onGround ? 1 : 0,
  }));
}

export interface Trackpoint {
  time: number;
  lat: number;
  lon: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  on_ground: number;
}

export type FlightStatus = "en_vol" | "au_sol" | "aucune_donnee";

export interface TrackResponse {
  aircraft: {
    registration: string;
    icao24: string;
    type: string;
    typeCode: string;
  };
  status: FlightStatus;
  latest: Trackpoint | null;
  points: Trackpoint[];
}

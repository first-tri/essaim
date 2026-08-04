"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapLibreMap,
  Marker,
  NavigationControl,
  LngLatBounds,
  type GeoJSONSource,
} from "maplibre-gl";
import type { TrackResponse } from "@/lib/types";
import { createPlaneElement } from "./planeMarker";
import StatusPanel from "./StatusPanel";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const FRANCE_CENTER: [number, number] = [2.4, 46.6];
const POLL_INTERVAL_MS = 20_000;

const ROUTE_SOURCE_ID = "route";

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const hasFitBoundsRef = useRef(false);
  const didInitRef = useRef(false);

  const [data, setData] = useState<TrackResponse | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard against React Strict Mode's mount→cleanup→mount cycle: MapLibre's WebGL
    // context and style/tile loading don't tolerate being torn down mid-flight, so we
    // create the map exactly once per page and never remove it on the fake cleanup.
    if (didInitRef.current || !containerRef.current) return;
    didInitRef.current = true;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: FRANCE_CENTER,
      zoom: 5,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setMapReady(true));
    mapRef.current = map;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function pollAndFetch() {
      try {
        await fetch("/api/poll").catch(() => {});
        const res = await fetch("/api/track", { cache: "no-store" });
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const json = (await res.json()) as TrackResponse;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Impossible de contacter le serveur de suivi.");
      }
    }

    pollAndFetch();
    const id = setInterval(pollAndFetch, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !data) return;

    const coords = data.points.map((p) => [p.lon, p.lat] as [number, number]);

    if (map.getSource(ROUTE_SOURCE_ID)) {
      (map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords },
      });
    } else if (coords.length >= 2) {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
      });
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ff6b35", "line-width": 7, "line-opacity": 0.18, "line-blur": 2 },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ff6b35", "line-width": 2.5, "line-opacity": 0.9 },
      });
    }

    if (data.latest) {
      const lngLat: [number, number] = [data.latest.lon, data.latest.lat];
      if (!markerRef.current) {
        const el = createPlaneElement();
        markerRef.current = new Marker({ element: el, rotationAlignment: "map" })
          .setLngLat(lngLat)
          .addTo(map);
      } else {
        markerRef.current.setLngLat(lngLat);
      }
      markerRef.current.setRotation(data.latest.heading ?? 0);
    }

    if (!hasFitBoundsRef.current) {
      if (coords.length >= 2) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new LngLatBounds(coords[0], coords[0]),
        );
        map.fitBounds(bounds, { padding: 80, maxZoom: 10, duration: 0 });
        hasFitBoundsRef.current = true;
      } else if (data.latest) {
        map.easeTo({ center: [data.latest.lon, data.latest.lat], zoom: 8, duration: 0 });
        hasFitBoundsRef.current = true;
      }
    }
  }, [data, mapReady]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <StatusPanel data={data} error={error} />
    </div>
  );
}

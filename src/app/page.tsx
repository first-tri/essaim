"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted">
      Chargement de la carte…
    </div>
  ),
});

export default function Home() {
  return (
    <div className="h-full w-full">
      <MapView />
    </div>
  );
}

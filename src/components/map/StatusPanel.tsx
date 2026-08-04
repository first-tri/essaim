"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type { TrackResponse } from "@/lib/types";

const STATUS_LABEL: Record<TrackResponse["status"], string> = {
  en_vol: "En vol",
  au_sol: "Au sol",
  aucune_donnee: "Aucune donnée récente",
};

const STATUS_COLOR: Record<TrackResponse["status"], string> = {
  en_vol: "var(--color-accent)",
  au_sol: "var(--color-muted)",
  aucune_donnee: "var(--color-muted)",
};

function formatRelativeTime(unixSeconds: number, now: number): string {
  const diff = Math.max(0, Math.round(now - unixSeconds));
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.round(diff / 3600)} h`;
  return `il y a ${Math.round(diff / 86400)} j`;
}

export default function StatusPanel({
  data,
  error,
}: {
  data: TrackResponse | null;
  error: string | null;
}) {
  const [now, setNow] = useState(() => Date.now() / 1000);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(id);
  }, []);

  const status = data?.status ?? "aucune_donnee";
  const latest = data?.latest ?? null;

  return (
    <div className="glass pointer-events-none absolute left-3 top-3 max-w-[min(92vw,340px)] rounded-2xl p-4 shadow-lg sm:left-5 sm:top-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold tracking-tight">
            {data?.aircraft.registration ?? "F-HDAC"}
          </p>
          <p className="text-xs text-muted">{data?.aircraft.type ?? "Diamond DA20-C1 Katana"}</p>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium"
          style={{ color: STATUS_COLOR[status] }}
        >
          <span
            className={clsx("h-1.5 w-1.5 rounded-full", status === "en_vol" && "pulse-dot")}
            style={{ background: STATUS_COLOR[status] }}
          />
          {STATUS_LABEL[status]}
        </span>
      </div>

      {latest ? (
        <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm">
          <Metric
            label="Altitude"
            value={latest.altitude != null ? `${Math.round(latest.altitude * 3.28084).toLocaleString("fr-FR")} ft` : "—"}
          />
          <Metric
            label="Vitesse"
            value={latest.speed != null ? `${Math.round(latest.speed * 3.6).toLocaleString("fr-FR")} km/h` : "—"}
          />
          <Metric label="Cap" value={latest.heading != null ? `${Math.round(latest.heading)}°` : "—"} />
          <Metric label="Dernière position" value={formatRelativeTime(latest.time, now)} />
        </div>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Pas encore de position enregistrée. La carte se mettra à jour dès que l&apos;avion sera en vol.
        </p>
      )}

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="font-mono text-[13px] font-medium">{value}</p>
    </div>
  );
}

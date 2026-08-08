"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

type Album = { id: string; albumName: string; assetCount: number };

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500";

export function ImageInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  const source: string = cfg.immichSource ?? "global";
  const albumId: string = cfg.immichAlbumId ?? "";
  const fit: string = cfg.fit ?? "cover";
  const intervalSec: number = cfg.intervalSec ?? 30;
  const cornerRadius: number = cfg.cornerRadius ?? 16;

  // Editor-Pfad ist /editor/views/<dashboardId> — letztes Segment ist die View-ID.
  const pathname = usePathname();
  const dashboardId = (pathname ?? "").split("/").filter(Boolean).pop() ?? "";

  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function loadAlbums() {
    setLoading(true);
    setError("");
    fetch(
      `/api/immich-widget?mode=albums&source=${source}&dashboardId=${encodeURIComponent(dashboardId)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.albums)) setAlbums(d.albums);
        else setError(d.error || "Fehler beim Laden");
      })
      .catch(() => setError("Verbindung fehlgeschlagen"))
      .finally(() => setLoading(false));
  }

  // Bei Quellenwechsel die Albenliste neu laden (global vs. View kann
  // unterschiedliche Immich-Instanzen sein).
  useEffect(() => {
    loadAlbums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Immich-Quelle")}</label>
        <select
          value={source}
          onChange={(e) => updateConfig(widget.i, "immichSource", e.target.value)}
          className={INPUT}
        >
          <option value="global">{t("Global (Einstellungen)")}</option>
          <option value="view">{t("Vom View (Wallpaper)")}</option>
        </select>
        <p className="text-xs text-[var(--mf-fg)]/40 mt-1.5 px-1 leading-relaxed">
          {source === "view"
            ? t("Nutzt die Immich-Daten aus dem Wallpaper dieses Views.")
            : t("Nutzt die globale Immich-Verbindung (Einstellungen → Integrationen).")}
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex items-center justify-between">
          <span>{t("Album")}</span>
          <button
            type="button"
            onClick={loadAlbums}
            disabled={loading}
            className="text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] inline-flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {t("Neu laden")}
          </button>
        </label>
        {albums && albums.length > 0 ? (
          <select
            value={albumId}
            onChange={(e) => updateConfig(widget.i, "immichAlbumId", e.target.value)}
            className={INPUT}
          >
            <option value="">{t("— Album wählen —")}</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.albumName} ({a.assetCount} {t("Fotos")})
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-[var(--mf-fg)]/40 px-1">
            {loading
              ? t("Lade Alben…")
              : error
                ? t(error)
                : source === "view"
                  ? t("Keine Alben gefunden — ist im Wallpaper dieses Views Immich hinterlegt?")
                  : t("Keine Alben gefunden — ist Immich global konfiguriert?")}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Bildanzeige")}</label>
        <select
          value={fit}
          onChange={(e) => updateConfig(widget.i, "fit", e.target.value)}
          className={INPUT}
        >
          <option value="cover">{t("Füllen (Ausschnitt, Standard)")}</option>
          <option value="contain">{t("Einpassen (ganzes Bild)")}</option>
          <option value="blur">{t("Einpassen + Blur-Rand")}</option>
          <option value="fill">{t("Strecken (verzerrt)")}</option>
          <option value="none">{t("Zentriert (Originalgröße)")}</option>
        </select>
        {fit === "blur" && (
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-2">
            {t("Zeigt das ganze Bild und füllt die Ränder mit einer unscharfen Kopie statt mit Schwarz — gut für Hochformat in einer breiten Kachel.")}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
          <span>{t("Bildwechsel Intervall (Sekunden)")}</span>
          <span className="text-blue-400">{intervalSec}s</span>
        </label>
        <input
          type="range"
          min="5"
          max="600"
          step="5"
          value={intervalSec}
          onChange={(e) => updateConfig(widget.i, "intervalSec", parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
          <span>{t("Ecken-Rundung")}</span>
          <span className="text-blue-400">{cornerRadius}px</span>
        </label>
        <input
          type="range"
          min="0"
          max="40"
          step="2"
          value={cornerRadius}
          onChange={(e) => updateConfig(widget.i, "cornerRadius", parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
        />
        <p className="text-xs text-[var(--mf-fg)]/40 mt-1.5 px-1">{t("0 = eckig. Passt das Bild an die runden Widget-Ecken an.")}</p>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import type { WidgetLayoutItem } from "../_types";
import HAEntityInput from "../_components/HAEntityInput";
import { useT } from "@/lib/i18n/LocaleProvider";

type CameraInspectorProps = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

const REFRESH_OPTIONS = [
  { value: 1, label: "1s" },
  { value: 2, label: "2s" },
  { value: 5, label: "5s" },
  { value: 10, label: "10s" },
  { value: 30, label: "30s" },
];

const ASPECT_OPTIONS: Array<{
  value: "auto" | "16:9" | "4:3" | "1:1";
  label: string;
}> = [
  { value: "auto", label: "Auto" },
  { value: "16:9", label: "16 : 9" },
  { value: "4:3", label: "4 : 3" },
  { value: "1:1", label: "1 : 1" },
];

export default function CameraInspector({
  widget: activeWidget,
  updateConfig,
}: CameraInspectorProps) {
  const t = useT();
  const cfg = (activeWidget.config as any) || {};
  const source: "ha" | "url" = cfg.source === "url" ? "url" : "ha";
  const streamUrl: string = cfg.streamUrl ?? "";
  const streamMode: "snapshot" | "mjpeg" | "webrtc" = cfg.streamMode || "snapshot";
  const refreshSec: number = typeof cfg.refreshIntervalSec === "number" ? cfg.refreshIntervalSec : 5;
  const aspect: "auto" | "16:9" | "4:3" | "1:1" = cfg.aspectRatio ?? "auto";
  const clickFullscreen: boolean = cfg.clickFullscreen !== false;
  const caption: string = cfg.caption ?? "";
  // #41: HA-triggered fullscreen. Without an own trigger entity the widget's
  // visibility rule (Sichtbarkeit tab → showWhenEntity) is what fires it.
  const fullscreenOnTrigger: boolean = cfg.fullscreenOnTrigger === true;
  const fsEntity: string = cfg.fullscreenTriggerEntity ?? "";
  const visibilityEntity: string = (cfg.showWhenEntity ?? "").trim();
  const hasOwnFsEntity = fsEntity.trim() !== "";

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
          {t("Quelle")}
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => updateConfig(activeWidget.i, "source", "ha")}
            className={`h-11 rounded-lg text-xs font-medium border transition-colors ${
              source === "ha"
                ? "bg-blue-500/15 border-blue-500/40 text-blue-100"
                : "bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)]"
            }`}
          >
            {t("Home Assistant")}
          </button>
          <button
            type="button"
            onClick={() => {
              updateConfig(activeWidget.i, "source", "url");
              // WebRTC is HA-only; fall back to MJPEG for a direct URL.
              if (streamMode === "webrtc") updateConfig(activeWidget.i, "streamMode", "mjpeg");
            }}
            className={`h-11 rounded-lg text-xs font-medium border transition-colors ${
              source === "url"
                ? "bg-blue-500/15 border-blue-500/40 text-blue-100"
                : "bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)]"
            }`}
          >
            {t("Direkte URL")}
          </button>
        </div>
      </div>

      {source === "ha" ? (
        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
            {t("HA-Kamera-Entity")}
          </label>
          <HAEntityInput
            value={cfg.entityId || ""}
            onChange={(v) => updateConfig(activeWidget.i, "entityId", v)}
            domains={["camera"]}
            placeholder="camera.front_door"
          />
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
            {t("Liste enthält nur Kamera-Entities aus deiner verbundenen HA-Instanz.")}
          </p>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
            {t("Stream- / Snapshot-URL")}
          </label>
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => updateConfig(activeWidget.i, "streamUrl", e.target.value)}
            placeholder="http://192.168.1.50:8080/video"
            className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-2 font-mono focus:outline-none focus:border-blue-500"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
            {t("Direkte Kamera-URL ohne HA — ein Snapshot-JPEG (wird im Intervall neu geladen) oder ein MJPEG-Stream. RTSP kann der Browser nicht abspielen; dafür HA/go2rtc nutzen.")}
          </p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
          {t("Anzeige-Modus")}
        </label>
        <div className={`grid gap-1.5 ${source === "ha" ? "grid-cols-3" : "grid-cols-2"}`}>
          <button
            type="button"
            onClick={() => updateConfig(activeWidget.i, "streamMode", "snapshot")}
            className={`h-14 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center justify-center gap-0.5 px-1 ${
              streamMode === "snapshot"
                ? "bg-blue-500/15 border-blue-500/40 text-blue-100"
                : "bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)]"
            }`}
          >
            <span>{t("Snapshot")}</span>
            <span className="text-[10px] opacity-60 text-center leading-tight">{t("alle paar Sekunden")}</span>
          </button>
          <button
            type="button"
            onClick={() => updateConfig(activeWidget.i, "streamMode", "mjpeg")}
            className={`h-14 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center justify-center gap-0.5 px-1 ${
              streamMode === "mjpeg"
                ? "bg-blue-500/15 border-blue-500/40 text-blue-100"
                : "bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)]"
            }`}
          >
            <span>MJPEG</span>
            <span className="text-[10px] opacity-60 text-center leading-tight">{t("flüssig, mehr BW")}</span>
          </button>
          {source === "ha" && (
          <button
            type="button"
            onClick={() => updateConfig(activeWidget.i, "streamMode", "webrtc")}
            className={`h-14 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center justify-center gap-0.5 px-1 ${
              streamMode === "webrtc"
                ? "bg-blue-500/15 border-blue-500/40 text-blue-100"
                : "bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)]"
            }`}
          >
            <span>WebRTC</span>
            <span className="text-[10px] opacity-60 text-center leading-tight">{t("HD, niedrige Latenz")}</span>
          </button>
          )}
        </div>
        <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
          {t("Snapshot ist bandbreitenfreundlich. MJPEG ist flüssig. WebRTC liefert HD mit niedriger Latenz, braucht aber eine WebRTC-fähige HA-Konfiguration (go2rtc bzw. eine Kamera-Integration mit eigenem WebRTC-Provider).")}
        </p>
      </div>

      {streamMode === "snapshot" && (
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
          {t("Aktualisierungs-Intervall")}
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {REFRESH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateConfig(activeWidget.i, "refreshIntervalSec", opt.value)}
              className={`h-9 rounded-lg text-xs font-medium border transition-colors ${
                refreshSec === opt.value
                  ? "bg-blue-500/15 border-blue-500/40 text-blue-100"
                  : "bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
          {t("Wie oft das Vorschaubild neu geholt wird. Schneller = mehr Bandbreite + HA-Last.")}
        </p>
      </div>
      )}

      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
          {t("Seitenverhältnis")}
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateConfig(activeWidget.i, "aspectRatio", opt.value)}
              className={`h-9 rounded-lg text-xs font-medium border transition-colors ${
                aspect === opt.value
                  ? "bg-blue-500/15 border-blue-500/40 text-blue-100"
                  : "bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
          {t("„Auto“ passt sich an die Quelle an. Fixe Werte beschneiden das Bild, füllen aber das Widget vollständig.")}
        </p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={clickFullscreen}
            onChange={(e) => updateConfig(activeWidget.i, "clickFullscreen", e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500" />
        </div>
        <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">
          {t("Bei Klick auf Bild Vollbild öffnen")}
        </span>
      </label>

      <div className="rounded-xl border border-[var(--mf-bdr)]/10 bg-[var(--mf-elev)]/[0.02] p-3.5 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={fullscreenOnTrigger}
              onChange={(e) => updateConfig(activeWidget.i, "fullscreenOnTrigger", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500" />
          </div>
          <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">
            {t("Bei HA-Auslöser automatisch Vollbild öffnen")}
          </span>
        </label>
        <p className="text-[11px] text-[var(--mf-fg)]/40 leading-relaxed">
          {t("Türklingel, Bewegung oder Personenerkennung poppen die Kamera von selbst über Wallpaper und Galerie — ohne Antippen. Danach geht das Display wieder in die ruhige Ansicht zurück.")}
        </p>

        {fullscreenOnTrigger && (
          <>
            <div>
              <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
                {t("Auslöser-Entity (leer = Sichtbarkeits-Trigger)")}
              </label>
              <HAEntityInput
                value={fsEntity}
                onChange={(v) => updateConfig(activeWidget.i, "fullscreenTriggerEntity", v)}
                placeholder="binary_sensor.doorbell"
                clearable
              />
              <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1 leading-relaxed">
                {visibilityEntity && !hasOwnFsEntity
                  ? `${t("Nutzt gerade den Sichtbarkeits-Trigger aus dem Tab „Layout“:")} ${visibilityEntity}`
                  : t("Leer = die Kamera folgt dem Trigger aus dem Tab „Layout“ (Sichtbarkeit → Automatisch über Home Assistant). Eine eigene Entity hier ist für Kameras gedacht, die dauerhaft auf dem Display liegen und nur ins Vollbild springen sollen.")}
              </p>
            </div>

            {hasOwnFsEntity && (
              <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
                  {t("Status (leer = sobald aktiv / an)")}
                </label>
                <input
                  type="text"
                  value={cfg.fullscreenTriggerState ?? ""}
                  onChange={(e) => updateConfig(activeWidget.i, "fullscreenTriggerState", e.target.value)}
                  placeholder="on"
                  className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
                {t("Vollbild-Dauer in Sek. (0 = solange aktiv)")}
              </label>
              <input
                type="number"
                min="0"
                value={cfg.fullscreenSeconds ?? cfg.autoHideSeconds ?? 0}
                onChange={(e) =>
                  updateConfig(activeWidget.i, "fullscreenSeconds", Math.max(0, parseInt(e.target.value) || 0))
                }
                placeholder="0"
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-2 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1 leading-relaxed">
                {t("Türklingeln sind oft nur einen Moment „an“ — mit einer Dauer bleibt das Vollbild trotzdem so lange stehen. 0 = Vollbild bleibt, solange die Entity aktiv ist. Antippen schließt es jederzeit von Hand.")}
              </p>
            </div>

            {!hasOwnFsEntity && !visibilityEntity && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[11px] text-amber-200/80 leading-relaxed">
                {t("Noch kein Auslöser gesetzt: entweder hier eine Entity wählen oder im Tab „Layout“ unter Sichtbarkeit einen HA-Trigger hinterlegen.")}
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
          {t("Beschriftung (optional)")}
        </label>
        <input
          type="text"
          value={caption}
          onChange={(e) => updateConfig(activeWidget.i, "caption", e.target.value)}
          placeholder={t("z.B. Haustür")}
          className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-2 focus:outline-none focus:border-blue-500"
        />
        <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
          {t("Kleiner Hinweis-Chip unten-links im Widget. Leer = kein Chip.")}
        </p>
      </div>

      <div className="mt-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[11px] text-amber-200/80 leading-relaxed">
        {t("WebRTC braucht eine HA-Instanz mit go2rtc-Setup (Standard bei Frigate, UniFi Protect via go2rtc, ESPHome cams etc.). Bei nicht-WebRTC-fähigen Kameras zeigt das Widget einen Fehler — dann auf MJPEG zurückschalten. Qualität von Snapshot und MJPEG hängt am HA-Stream-Profil der Kamera.")}
      </div>
    </div>
  );
}

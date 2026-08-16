"use client";

import React from "react";
import type { WidgetLayoutItem } from "../_types";
import HAEntityInput from "../_components/HAEntityInput";
import { useT } from "@/lib/i18n/LocaleProvider";
import { cameraFullscreenEnabled, cameraFullscreenWrites } from "@/lib/widgets/camera-fullscreen";

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

      {/* #41: derselbe config-Schlüssel wie im Layout-Reiter unter Sichtbarkeit
          — EIN Wert, zwei Sichten. Er steht auch hier, weil man Kamera-Optionen
          im Kamera-Reiter sucht und nicht hinter der Trigger-Entity im
          Layout-Reiter. Ohne Trigger ist der Schalter aus gutem Grund gesperrt:
          er täte nichts, und ein Schalter, der nichts tut, sieht aus wie kaputt. */}
      {(() => {
        // Der Schalter ist NICHT mehr gesperrt, wenn keine Sichtbarkeitsregel
        // steht: seit PR #83 kann eine eigene Auslöser-Entity hier drunter
        // gesetzt werden, und genau der Fall — Kamera liegt dauerhaft auf dem
        // Display, springt nur beim Klingeln gross — wäre sonst unerreichbar.
        const on = cameraFullscreenEnabled(cfg);
        const visibilityEntity = ((cfg.showWhenEntity as string) || "").trim();
        const ownEntity = ((cfg.fullscreenTriggerEntity as string) || "").trim();
        return (
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-3 group cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      cameraFullscreenWrites(cfg, e.target.checked).forEach(([k, val]) =>
                        updateConfig(activeWidget.i, k, val),
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500" />
                </div>
                <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">
                  {t("Beim Auslösen sofort im Vollbild öffnen")}
                </span>
              </label>
              <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1 leading-relaxed">
                {t("Türklingel, Bewegung oder Personenerkennung poppen die Kamera von selbst über Wallpaper und Galerie — ohne Antippen. Danach geht das Display wieder in die ruhige Ansicht zurück.")}
              </p>
            </div>

            {on && (
              <div className="space-y-3 border-l-2 border-purple-500/20 ml-[18px] pl-4">
                <div>
                  <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
                    {t("Auslöser-Entity (leer = Sichtbarkeits-Trigger)")}
                  </label>
                  <HAEntityInput
                    value={(cfg.fullscreenTriggerEntity as string) ?? ""}
                    onChange={(v: string) => updateConfig(activeWidget.i, "fullscreenTriggerEntity", v)}
                    placeholder="binary_sensor.tuerklingel"
                  />
                  <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1 leading-relaxed">
                    {visibilityEntity && !ownEntity
                      ? `${t("Nutzt gerade den Sichtbarkeits-Trigger aus dem Reiter „Layout“:")} ${visibilityEntity}`
                      : t("Leer = die Kamera folgt ihrer Sichtbarkeitsregel im Reiter „Layout“. Eine eigene Entity ist für Kameras gedacht, die dauerhaft auf dem Display liegen und nur ins Vollbild springen sollen.")}
                  </p>
                </div>

                {ownEntity !== "" && (
                  <div>
                    <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
                      {t("Status (leer = sobald aktiv / an)")}
                    </label>
                    <input
                      type="text"
                      value={(cfg.fullscreenTriggerState as string) ?? ""}
                      onChange={(e) => updateConfig(activeWidget.i, "fullscreenTriggerState", e.target.value)}
                      placeholder="on"
                      className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-base sm:text-sm rounded-lg p-2 focus:outline-none focus:border-purple-500"
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
                    value={(cfg.fullscreenSeconds as number) ?? (cfg.autoHideSeconds as number) ?? 0}
                    onChange={(e) =>
                      updateConfig(activeWidget.i, "fullscreenSeconds", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-base sm:text-sm rounded-lg p-2 focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1 leading-relaxed">
                    {t("Türklingeln sind oft nur einen Moment „an“ — mit einer Dauer bleibt das Vollbild trotzdem so lange stehen. 0 = Vollbild bleibt, solange die Entity aktiv ist. Antippen schliesst es jederzeit von Hand.")}
                  </p>
                </div>

                {ownEntity === "" && visibilityEntity === "" && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[11px] text-amber-200/80 leading-relaxed">
                    {t("Noch kein Auslöser gesetzt: entweder hier eine Entity wählen oder im Reiter „Layout“ unter „Sichtbarkeit“ einen HA-Trigger hinterlegen.")}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

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

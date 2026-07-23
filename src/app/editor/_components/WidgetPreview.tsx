"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { renderWidget } from "@/components/widgets/renderWidget";
import { useT } from "@/lib/i18n/LocaleProvider";

// #42: Live-Vorschau für JEDES Widget, oben im Inspector. Rendert über die
// geteilte Render-Map exakt dieselbe Komponente wie der Live-View — mit
// echten Daten (SSE läuft im Editor mit). Die Kachel-Hülle ist 1:1 aus dem
// View übernommen (container-type: size → responsive Schrift rechnet nativ).

type Display = { clientId: string; width: number; height: number; dpr: number };

// Vorschau-Overrides: Widgets, die sich "verstecken, wenn nichts los ist",
// sollen in der Vorschau trotzdem etwas zeigen.
function previewConfig(type: string, config: any): any {
  if (type === "StatusWidget.tsx") return { ...config, alwaysShow: true };
  if (type === "MediaPlayerWidget.tsx") return { ...config, hideWhenIdle: false };
  return config;
}

export default function WidgetPreview({ type, config, bgOpacity, gridW = 12, gridH = 6 }: {
  type: string;
  config: any;
  bgOpacity?: number;
  gridW?: number;
  gridH?: number;
}) {
  const t = useT();
  const pathname = usePathname();
  const dashboardId = (pathname ?? "").split("/").filter(Boolean).pop() ?? "";

  // Verbundene Displays (Heartbeat-Registry) — 1:1-Chips nur wenn vorhanden.
  const [displays, setDisplays] = useState<Display[]>([]);
  const [selected, setSelected] = useState<string>("manual");
  useEffect(() => {
    if (!dashboardId) return;
    fetch(`/api/view-clients?dashboardId=${encodeURIComponent(dashboardId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.displays)) setDisplays(d.displays); })
      .catch(() => {});
  }, [dashboardId]);
  const display = displays.find((d) => d.clientId === selected) || null;

  // Manuelle Vorschau-Maße (rein visuell) + verfügbare Spaltenbreite messen.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [availPx, setAvailPx] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setAvailPx(el.clientWidth);
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, []);
  const [widthPct, setWidthPct] = useState(100);
  const [manualH, setManualH] = useState<number | null>(null);
  // Beispieldaten: leerer Kalender / kein Alert / nichts spielt → die Widgets
  // erzeugen Demo-Inhalte AUS DER EIGENEN CONFIG (Regeln, Formate, Farben).
  const [demoMode, setDemoMode] = useState(false);
  const defaultH = Math.max(120, Math.min(600, Math.round((gridH / 24) * 900)));
  const effManualH = manualH ?? defaultH;

  // 1:1-Modus: Kachel-Maße direkt aus Display × Raster, dann eingepasst.
  const tileW = display ? Math.max(40, Math.round(display.width * (gridW / 24))) : 0;
  const tileH = display ? Math.max(40, Math.round(display.height * (gridH / 24))) : 0;
  const scale = display && tileW > 0 ? Math.min(1, (availPx - 32) / tileW) : 1;

  if (typeof type === "string" && type.startsWith("custom:")) {
    return (
      <p className="text-xs text-[var(--mf-fg)]/40 px-1 leading-relaxed">
        {t("Für Community-Module gibt es hier noch keine Live-Vorschau.")}
      </p>
    );
  }

  // ── Kachel-Hülle: 1:1 aus dem Live-View übernommen (siehe view/[id]) ──
  const isCardBased =
    type === "HomeAssistantWidget.tsx" ||
    type === "HANotificationWidget.tsx" ||
    (type === "CalendarWidget.tsx");
  const outerBgOpacity = isCardBased ? 0 : (bgOpacity ?? 0) / 100;
  const hasOuterBox = !isCardBased && (bgOpacity ?? 0) > 0;
  const paddingClass = isCardBased ? "p-0" : hasOuterBox ? "p-4 md:p-6" : "p-0";
  const justifyClass = isCardBased ? "justify-start" : "justify-center";
  const cfg = { ...previewConfig(type, config), ...(demoMode ? { __demo: true } : {}) };

  const tile = (w: number | string, h: number) => (
    <div
      className={`flex ${justifyClass} flex-col ${paddingClass} rounded-3xl overflow-hidden pointer-events-none select-none`}
      style={{
        width: w,
        height: h,
        containerType: "size",
        backgroundColor: `rgba(0,0,0, ${outerBgOpacity})`,
        backdropFilter: outerBgOpacity > 0 ? "blur(12px)" : "none",
        border: outerBgOpacity > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
      }}
    >
      <div
        className="w-full h-full flex flex-col justify-center"
        style={{
          fontSize: cfg?.responsiveText
            ? `${(cfg.fontSize || 20) / 2}${["HomeAssistantWidget.tsx", "HANotificationWidget.tsx"].includes(type) ? "cqw" : "cqmin"}`
            : cfg?.fontSize ? `${cfg.fontSize}px` : "20px",
          fontFamily: `${cfg?.fontFamily || "var(--font-geist-sans)"}, sans-serif`,
          color: cfg?.color || "#fff",
          fontWeight: cfg?.fontWeight ? parseInt(cfg.fontWeight) : "inherit",
          textShadow:
            (cfg?.textShadowBlur ?? 0) > 0 || (cfg?.textShadowX ?? 0) !== 0 || (cfg?.textShadowY ?? 0) !== 0
              ? `${cfg?.textShadowX ?? 0}px ${cfg?.textShadowY ?? 4}px ${cfg?.textShadowBlur ?? 0}px rgba(0,0,0,0.8)`
              : "none",
        }}
      >
        {renderWidget(type, cfg, { dashboardId, onVisibilityChange: () => {} })}
      </div>
    </div>
  );

  return (
    <div>
      {/* Live vs. Beispieldaten — für Widgets, die ohne Ereignis leer wären */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        <button type="button" onClick={() => setDemoMode(false)}
          className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${!demoMode ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-[var(--mf-bdr)]/15 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"}`}>
          {t("Live")}
        </button>
        <button type="button" onClick={() => setDemoMode(true)}
          className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${demoMode ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-[var(--mf-bdr)]/15 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"}`}>
          {t("Beispieldaten")}
        </button>
      </div>
      {displays.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <button type="button" onClick={() => setSelected("manual")}
            className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${selected === "manual" ? "border-sky-500 bg-sky-500/10 text-sky-400" : "border-[var(--mf-bdr)]/15 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"}`}>
            {t("Manuell")}
          </button>
          {displays.map((d) => (
            <button key={d.clientId} type="button" onClick={() => setSelected(d.clientId)}
              className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors tabular-nums ${selected === d.clientId ? "border-sky-500 bg-sky-500/10 text-sky-400" : "border-[var(--mf-bdr)]/15 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"}`}>
              {d.width}×{d.height}
            </button>
          ))}
        </div>
      )}
      <div ref={wrapRef}
        className="rounded-2xl p-4 bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-black/50 border border-[var(--mf-bdr)]/10 flex items-center justify-center overflow-hidden"
        style={{ minHeight: "7em" }}>
        {display ? (
          <div style={{ width: tileW * scale, height: tileH * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
              {tile(tileW, tileH)}
            </div>
          </div>
        ) : (
          tile(`${widthPct}%`, effManualH)
        )}
      </div>
      {display ? (
        <p className="text-[10px] text-[var(--mf-fg)]/40 mt-1.5 px-1 leading-relaxed">
          {t("1:1 vom Display gerechnet")} ({display.width}×{display.height}, {t("Maßstab")} {Math.round(scale * 100)}%)
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-2.5">
          <div>
            <label className="text-[10px] text-[var(--mf-fg)]/40 mb-1 px-1 flex justify-between">
              <span>{t("Breite")}</span><span className="text-sky-400">{widthPct}%</span>
            </label>
            <input type="range" min={40} max={100} step={5} value={widthPct}
              onChange={(e) => setWidthPct(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--mf-elev)]/10" />
          </div>
          <div>
            <label className="text-[10px] text-[var(--mf-fg)]/40 mb-1 px-1 flex justify-between">
              <span>{t("Höhe")}</span><span className="text-sky-400">{effManualH}px</span>
            </label>
            <input type="range" min={100} max={700} step={10} value={effManualH}
              onChange={(e) => setManualH(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--mf-elev)]/10" />
          </div>
        </div>
      )}
    </div>
  );
}

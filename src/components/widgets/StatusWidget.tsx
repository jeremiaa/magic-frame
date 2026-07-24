"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./WidgetIcon";
import { Activity } from "lucide-react";
import { useHaLiveStates } from "@/lib/ha/useHaLiveStates";
import { useGlassStyle } from "@/lib/ui/glass";
import { useT } from "@/lib/i18n/LocaleProvider";

// Status-Karte: "Gerät X macht gerade was" — Auto lädt, Drucker druckt,
// Toniebox spielt. Bild aus jeder Entität mit entity_picture (über den
// Artwork-Proxy), aus HAs www-Ordner (/local/…) oder eigener URL; Details
// (Ladestand, Restzeit, …) live über SSE. Läuft eigenständig als Widget UND
// eingebettet als Karte im Notification-Stack (frameRadius gesetzt = Host-
// Modus, der Host zeichnet dann Karte/Rand — wie beim Media-Widget).

// Zustände, die ohne explizite Liste als "nichts los" gelten.
const INACTIVE_STATES = new Set(["off", "idle", "unavailable", "unknown", "standby", "none", ""]);

type Detail = { entity?: string; label?: string };

// Freigestellte PNGs haben oft dicke unsichtbare Ränder — die drücken Layout
// und Größen-Regler weg. Einmalig per Canvas die Bounding-Box der sichtbaren
// Pixel ermitteln und die transparenten Ränder abschneiden. Externe URLs mit
// tainted Canvas fallen still aufs Original zurück; Ergebnis wird gecacht.
const trimCache = new Map<string, string>();
function useTrimmedImage(src: string): string {
  // Bis der Trim entschieden ist, "" liefern — das ungetrimmte Original darf
  // nie rendern, sonst springt das Bild sichtbar von klein (unsichtbarer
  // Rand) auf groß, sobald der Beschnitt fertig ist.
  const [out, setOut] = useState(() => (src ? trimCache.get(src) ?? "" : ""));
  useEffect(() => {
    if (!src) { setOut(""); return; }
    const cached = trimCache.get(src);
    if (cached) { setOut(cached); return; }
    setOut("");
    let cancelled = false;
    const im = new window.Image();
    // Jeder Ausgang MUSS done() rufen — sonst bliebe das Bild ewig unsichtbar.
    // Cache deckeln: entity_pictures rotieren ihre Tokens → ohne Limit würden
    // sich Daten-URLs (je ~300 KB) unbegrenzt ansammeln.
    const done = (url: string) => {
      if (trimCache.size > 30) trimCache.clear();
      trimCache.set(src, url);
      if (!cancelled) setOut(url);
    };
    im.onerror = () => { if (!cancelled) setOut(src); }; // nicht cachen; <img> onError regelt den Icon-Fallback
    im.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = im.naturalWidth; c.height = im.naturalHeight;
        const ctx = c.getContext("2d");
        if (!ctx || !c.width || !c.height) return done(src);
        ctx.drawImage(im, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
        let minX = width, minY = height, maxX = -1, maxY = -1;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 8) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < 0) return done(src); // komplett transparent
        const pad = Math.round(Math.max(width, height) * 0.02);
        minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
        maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
        const w = maxX - minX + 1, h = maxY - minY + 1;
        if (w >= width - 2 && h >= height - 2) return done(src); // nichts zu trimmen (Foto)
        const oc = document.createElement("canvas");
        oc.width = w; oc.height = h;
        oc.getContext("2d")!.drawImage(im, minX, minY, w, h, 0, 0, w, h);
        done(oc.toDataURL("image/png"));
      } catch { done(src); } // tainted (externe URL) → Original
    };
    im.src = src;
    return () => { cancelled = true; };
  }, [src]);
  return out;
}

export default function StatusWidget({ config, onVisibilityChange }: {
  config?: any;
  onVisibilityChange?: (isVisible: boolean) => void;
}) {
  const t = useT();

  const statusEntity: string = (config?.statusEntity || "").trim();
  const statusStates: string[] = (config?.statusStates || "")
    .split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  // Alarm-Zustände: bei diesen wird die Karte markant (Akzent-Tönung, Puls,
  // fettes Badge) — damit "fertig" auch wirklich niemand übersieht.
  const alertStates: string[] = (config?.alertStates || "")
    .split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  const alertPulse = config?.alertPulse !== false; // Tönung pulsiert (Default an)
  const alertRing = config?.alertRing !== false;   // Akzent-Ring um die Karte (Default an)
  // Tipp-Aktion: Antippen der Karte löst diese Entität aus (Taste drücken /
  // Schalter toggeln / Skript starten) — z. B. Wäsche-quittiert direkt per Karte.
  const tapEntity: string = (config?.tapEntity || "").trim();
  const handleTap = async () => {
    if (!tapEntity) return;
    try {
      await fetch("/api/ha/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: tapEntity, service: "toggle" }),
      });
    } catch { /* Aktion fehlgeschlagen — Karte bleibt einfach stehen */ }
  };
  const layout: "bar" | "stack" | "center" = config?.statusLayout === "stack" || config?.statusLayout === "center" ? config.statusLayout : "bar";
  const imageMode: "entity" | "url" | "icon" = config?.imageMode === "url" || config?.imageMode === "icon" ? config.imageMode : "entity";
  const imageStyle: "box" | "free" = config?.imageStyle === "free" ? "free" : "box";
  const imgScale = Math.max(0.5, Math.min(2.5, (Number(config?.imageScale) || 100) / 100));
  const imageEntity: string = (config?.imageEntity || "").trim() || statusEntity;
  const imageUrl: string = (config?.imageUrl || "").trim();
  const icon: string = config?.icon || "mdi:information-outline";
  const details: Detail[] = Array.isArray(config?.statusDetails)
    ? (config.statusDetails as Detail[]).filter((d) => d && d.entity)
    : [];
  const progressEntity: string = (config?.progressEntity || "").trim();
  const progressStyle: "bar" | "ring" = config?.progressStyle === "ring" ? "ring" : "bar";
  const ringPercent = config?.progressShowPercent !== false;
  const alwaysShow = config?.alwaysShow === true;
  const showState = config?.showState !== false;
  const artworkBg = config?.artworkAsTileBg !== false;
  const bgBlur = Math.max(4, Math.min(60, Number(config?.bgBlur) || 16));
  const bgZoom = Math.max(1, Math.min(3, (Number(config?.bgZoom) || 120) / 100));
  const glass = useGlassStyle(config);
  const isLight = glass.isLight;
  // Host-Modus (Notification-Karte): Host zeichnet Karte/Rand, wir nur Inhalt.
  const hostRadius = typeof config?.frameRadius === "number" ? config.frameRadius : null;
  const embedded = hostRadius !== null;
  // Akzent hat ein eigenes Feld. Vorher lag er auf config.color — genau dem
  // Feld, das der Text-&-Farbe-Tab als Schriftfarbe beschreibt. Der Rückfall
  // darauf gilt nur für EINGEBETTETE Karten: die haben kein eigenes
  // Schriftfarbfeld und speichern ihren Akzent dort. Eigenständig wäre es
  // dieselbe Doppelbelegung wie bei RSS und Media.
  const accent: string = config?.statusAccent || (embedded ? config?.color : "") || "#0ea5e9";
  const tileRadius = hostRadius ?? 24;

  // ── Live-Zustände (eine SSE-Subscription für alles) ──
  const ids = useMemo(() => {
    const set = new Set<string>();
    if (statusEntity) set.add(statusEntity);
    if (imageMode === "entity" && imageEntity) set.add(imageEntity);
    if (progressEntity) set.add(progressEntity);
    for (const d of details) if (d.entity) set.add(d.entity!);
    return Array.from(set);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusEntity, imageEntity, imageMode, progressEntity, JSON.stringify(details)]);
  const live = useHaLiveStates(ids, ids.length > 0);

  const state = statusEntity ? live.states[statusEntity] : null;
  const cur = (state?.state || "").toLowerCase();
  const active = statusEntity
    ? (statusStates.length ? statusStates.includes(cur) : !INACTIVE_STATES.has(cur))
    : false;
  const visible = alwaysShow || active;
  const isAlert = alertStates.length > 0 && alertStates.includes(cur);

  // Sichtbarkeit mit Gnadenfrist (wie Media-Karte): kurze Zustands-Flackerer
  // beim Gerät klappen die Karte nicht pro Sekunde auf und zu. Wichtig: der
  // INHALT bleibt gerendert, bis der Host fertig zugeklappt hat — sonst stünde
  // während Frist + Klapp-Animation eine leere schwarze Glas-Karte da.
  const visCbRef = useRef(onVisibilityChange);
  visCbRef.current = onVisibilityChange;
  const graceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rendered, setRendered] = useState(false);
  useEffect(() => {
    if (visible) {
      if (graceRef.current) { clearTimeout(graceRef.current); graceRef.current = null; }
      if (unmountRef.current) { clearTimeout(unmountRef.current); unmountRef.current = null; }
      setRendered(true);
      visCbRef.current?.(true);
    } else if (rendered && !graceRef.current && !unmountRef.current) {
      graceRef.current = setTimeout(() => {
        graceRef.current = null;
        visCbRef.current?.(false); // Host beginnt zuzuklappen (500 ms)
        unmountRef.current = setTimeout(() => {
          unmountRef.current = null;
          setRendered(false); // Inhalt erst NACH der Klapp-Animation entfernen
        }, 650);
      }, 5000);
    }
  }, [visible, rendered]);
  useEffect(() => () => {
    if (graceRef.current) clearTimeout(graceRef.current);
    if (unmountRef.current) clearTimeout(unmountRef.current);
  }, []);

  // ── Kachel vermessen → Schriftgröße aus der echten Höhe ──
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure); // Tizen-Fallback
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── Bild: Entität → Proxy (Cache-Bust bei Änderung), /local/… → www-Proxy ──
  const imgState = imageMode === "entity" && imageEntity ? live.states[imageEntity] : null;
  const picAttr: string = imgState?.attributes?.entity_picture || imgState?.attributes?.entity_picture_local || "";
  const resolvedUrl = imageUrl.startsWith("/local/")
    ? `/api/ha/local/${imageUrl.slice("/local/".length)}`
    : imageUrl;
  const imgSrc = imageMode === "url"
    ? resolvedUrl
    : imageMode === "entity" && imageEntity && picAttr
      ? `/api/ha/media/${encodeURIComponent(imageEntity)}/artwork?ts=${encodeURIComponent(picAttr)}`
      : "";
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => { setImgOk(true); }, [imgSrc]);
  // Transparente PNG-Ränder automatisch wegschneiden (einmalig, gecacht).
  const displaySrc = useTrimmedImage(imgSrc);
  const hasImg = Boolean(imgSrc) && imgOk;
  const imgReady = hasImg && Boolean(displaySrc);

  if (!statusEntity) {
    return (
      <div ref={boxRef} className="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-2"
        style={{ fontSize: 13, color: isLight ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.4)" }}>
        <Activity size={18} className="opacity-60" />{t("Entität im Inspector wählen")}
      </div>
    );
  }
  // Eigenständig: bei "nichts los" komplett leer (onVisibilityChange blendet
  // die Kachel aus). Eingebettet klappt der Host die Karte über die Höhe zu —
  // `rendered` hält den Inhalt, bis Frist + Klapp-Animation durch sind.
  if (!rendered) return <div ref={boxRef} className="w-full h-full" />;

  const H = box.h || 120;
  const fs = Math.max(13, Math.min((layout === "bar" ? H * 0.15 : H * 0.105), 26));

  const title: string = (config?.label || "").trim() || state?.attributes?.friendly_name || statusEntity;
  const stateText: string = state?.attributes?.status_text || state?.state || "";

  // Fortschritt (0–100) — Ladestand, Druck-% …
  const progState = progressEntity ? live.states[progressEntity] : null;
  const progRaw = Number(progState?.state);
  const progress = Number.isFinite(progRaw) ? Math.max(0, Math.min(100, progRaw)) : null;

  const fg = isLight ? "rgba(15,23,42,0.92)" : "#ffffff";
  const fgDim = isLight ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.65)";

  const detailChips = details.map((d, i) => {
    const s = d.entity ? live.states[d.entity] : null;
    if (!s) return null;
    const unit = s.attributes?.unit_of_measurement || "";
    const label = (d.label || "").trim() || s.attributes?.friendly_name || "";
    const value = s.state === "unavailable" || s.state === "unknown" ? "—" : s.state;
    return (
      <span key={`${d.entity}-${i}`} className="whitespace-nowrap" style={{ color: fgDim }}>
        {label && <span className="opacity-75">{label} </span>}
        <span className="font-semibold tabular-nums" style={{ color: fg }}>{value}{unit ? ` ${unit}` : ""}</span>
      </span>
    );
  }).filter(Boolean);

  // Bild/Icon-Element — "free" = freigestelltes PNG ohne Kasten/Schatten,
  // "box" = abgerundete Kachel mit Cover-Crop (Fotos, Cover).
  const mediaEl = (sizeEm: number) => hasImg ? (
    !displaySrc ? (
      // Trim läuft noch: Platz reservieren statt das ungetrimmte Original zu
      // zeigen — verhindert den sichtbaren Größensprung nach dem Beschnitt.
      <div className="shrink-0 self-center" style={{ width: `${imageStyle === "free" ? sizeEm * 1.25 : sizeEm}em`, height: `${sizeEm}em` }} />
    ) : imageStyle === "free" ? (
      <img src={displaySrc} alt="" decoding="async" onError={() => setImgOk(false)}
        className="shrink-0 self-center object-contain mf-rss-fade"
        style={{ width: `${sizeEm * 1.25}em`, height: `${sizeEm}em`, filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.35))" }} />
    ) : (
      <img src={displaySrc} alt="" decoding="async" onError={() => setImgOk(false)}
        className="shrink-0 self-center object-cover rounded-[0.55em] mf-rss-fade"
        style={{ width: `${sizeEm}em`, height: `${sizeEm}em`, boxShadow: "0 4px 14px rgba(0,0,0,0.3)" }} />
    )
  ) : (
    <div className="shrink-0 self-center rounded-[0.55em] flex items-center justify-center"
      style={{ width: `${sizeEm}em`, height: `${sizeEm}em`, backgroundColor: `${accent}26` }}>
      <Icon icon={icon} style={{ color: accent, fontSize: `${sizeEm * 0.52}em` }} />
    </div>
  );

  const titleRow = (center: boolean) => (
    <div className={`flex items-baseline gap-[0.5em] min-w-0 ${center ? "justify-center" : ""}`}>
      <span className="font-bold tracking-tight leading-tight truncate" style={{ fontSize: "0.95em" }}>{title}</span>
      {(showState || isAlert) && stateText && (
        isAlert ? (
          // Alarm: fettes Pill statt dezentem Text — muss aus 5 m Entfernung lesbar sein.
          <span className="uppercase tracking-widest font-extrabold whitespace-nowrap shrink-0 rounded-full self-center"
            style={{ fontSize: "0.72em", backgroundColor: accent, color: "#ffffff", padding: "0.14em 0.65em", boxShadow: `0 2px 12px ${accent}80` }}>
            {stateText}
          </span>
        ) : (
          <span className="uppercase tracking-wider font-medium whitespace-nowrap shrink-0" style={{ fontSize: "0.58em", color: accent }}>{stateText}</span>
        )
      )}
    </div>
  );
  const chipsRow = (center: boolean) => detailChips.length > 0 ? (
    <div className={`flex flex-wrap items-baseline gap-x-[0.9em] gap-y-[0.15em] leading-snug ${center ? "justify-center" : ""}`} style={{ fontSize: "0.68em" }}>
      {detailChips}
    </div>
  ) : null;
  // Fortschritt als Balken unten — oder als Ring (rechts bzw. im Layout).
  const showBar = progress !== null && progressStyle === "bar";
  const showRing = progress !== null && progressStyle === "ring";
  const progressBar = showBar ? (
    <div className="absolute left-[0.9em] right-[0.9em]" style={{ bottom: "0.45em" }}>
      <div className="w-full rounded-full overflow-hidden" style={{ height: "0.22em", backgroundColor: isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.18)" }}>
        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: accent, transition: "width 1s linear" }} />
      </div>
    </div>
  ) : null;
  const RING_R = 15.5;
  const RING_C = 2 * Math.PI * RING_R;
  const ringEl = (sizeEm: number) => showRing ? (
    <div className="shrink-0 self-center relative" style={{ width: `${sizeEm}em`, height: `${sizeEm}em` }}>
      <svg viewBox="0 0 36 36" width="100%" height="100%" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="18" cy="18" r={RING_R} fill="none" strokeWidth="3.4"
          stroke={isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.18)"} />
        <circle cx="18" cy="18" r={RING_R} fill="none" strokeWidth="3.4" strokeLinecap="round"
          stroke={accent} strokeDasharray={`${((progress ?? 0) / 100) * RING_C} ${RING_C}`}
          style={{ transition: "stroke-dasharray 1s linear" }} />
      </svg>
      {ringPercent && (
        <div className="absolute inset-0 flex items-center justify-center font-semibold tabular-nums"
          style={{ fontSize: `${sizeEm * (Math.round(progress ?? 0) >= 100 ? 0.22 : 0.28)}em` }}>
          {Math.round(progress ?? 0)}%
        </div>
      )}
    </div>
  ) : null;

  // Eigenständig: eigene Glas-Karte (wie Media-Widget); eingebettet zeichnet
  // der Host Karte + Rand, wir liefern nur den Inhalt.
  const cardChrome: React.CSSProperties = embedded
    ? { borderRadius: tileRadius }
    : config?.showBorder === false
      ? { ...glass.cardStyle, border: "none", borderRadius: tileRadius }
      : config?.borderColor
        ? { ...glass.cardStyle, border: `1.5px solid ${config.borderColor}`, borderRadius: tileRadius }
        : { ...glass.cardStyle, borderRadius: tileRadius };

  const inner = layout === "bar" ? (
    <div className="relative w-full h-full flex items-center gap-[0.8em] px-[0.75em]" style={{ paddingBottom: showBar ? "0.55em" : undefined }}>
      {mediaEl(2.9 * imgScale)}
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-[0.22em] overflow-hidden">
        {titleRow(false)}
        {chipsRow(false)}
      </div>
      {ringEl(2.6)}
    </div>
  ) : layout === "stack" ? (
    <div className="relative w-full h-full flex flex-col px-[0.9em] pt-[0.7em]" style={{ paddingBottom: showBar ? "1.1em" : "0.7em" }}>
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {hasImg && imageStyle === "free" ? (
          displaySrc ? (
            <img src={displaySrc} alt="" decoding="async" onError={() => setImgOk(false)}
              className="object-contain mf-rss-fade" style={{ maxWidth: `${100 * imgScale}%`, maxHeight: `${100 * imgScale}%`, filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.35))" }} />
          ) : null
        ) : mediaEl(4.6 * imgScale)}
      </div>
      <div className="shrink-0 flex items-center gap-[0.7em] pt-[0.5em]">
        <div className="min-w-0 flex-1 flex flex-col gap-[0.22em]">
          {titleRow(false)}
          {chipsRow(false)}
        </div>
        {ringEl(2.4)}
      </div>
    </div>
  ) : (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-[0.4em] px-[0.9em]" style={{ paddingBottom: showBar ? "0.9em" : undefined }}>
      {mediaEl(3.6 * imgScale)}
      <div className="flex flex-col gap-[0.22em] items-center min-w-0 max-w-full">
        {titleRow(true)}
        {chipsRow(true)}
      </div>
      {ringEl(2.2)}
    </div>
  );

  return (
    <div ref={boxRef}
      className={`relative w-full h-full overflow-hidden ${tapEntity ? "cursor-pointer active:scale-[0.99] transition-transform duration-100" : ""}`}
      style={{ fontSize: fs, color: fg, ...cardChrome }}
      onClick={tapEntity ? handleTap : undefined}>
      {/* Bild als weicher Hintergrund (wie die Media-Karte) */}
      {artworkBg && imgReady && (
        <>
          <img src={displaySrc} alt="" decoding="async" onError={() => setImgOk(false)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: `blur(${bgBlur}px)`, transform: `scale(${bgZoom})`, opacity: isLight ? 0.5 : 0.55 }} />
          <div className="absolute inset-0" style={{ backgroundColor: isLight ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }} />
        </>
      )}
      {/* Alarm-Zustand: Akzent-Tönung (optional pulsierend) + optionaler Ring */}
      {isAlert && (
        <>
          <div className={`absolute inset-0 pointer-events-none ${alertPulse ? "mf-status-alert" : ""}`}
            style={{ background: `linear-gradient(90deg, ${accent}, ${accent}55 45%, transparent 80%)`, ...(alertPulse ? {} : { opacity: 0.55 }) }} />
          {alertRing && (
            <div className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: `inset 0 0 0 2px ${accent}`, borderRadius: "inherit" }} />
          )}
        </>
      )}
      {inner}
      {progressBar}
    </div>
  );
}

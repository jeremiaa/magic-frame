"use client";

import { useEffect, useLayoutEffect, useState, useRef, useMemo } from "react";
import { useGlassStyle } from "@/lib/ui/glass";
import { useHaLiveStates } from "@/lib/ha/useHaLiveStates";

/* ------------------------------------------------------------------ */
/* Pure helpers — module scope, no hooks, no React.                    */
/* Ported from the Flex Horseshoe custom module (custom:flex-horseshoe) */
/* and made type-safe for the core widget.                             */
/* ------------------------------------------------------------------ */

const BAD_STATES = new Set(["unavailable", "unknown", "none", ""]);

export type RingStyle = "fixed" | "colorstop" | "interpolated" | "segments" | "gradient";

export interface EntityDef {
  entityId: string; // supports entity_id@attribute
  label?: string;
  color?: string;
}

export interface RingDef {
  entityId: string;
  min: number;
  max: number;
  style: RingStyle;
  /** "0:#2196f3,60:#ff9800" — ordered numeric value → hex colour pairs */
  stops?: string;
  thicknessPct?: number; // of the outer radius
}

/** "sensor.x@attribute" -> { id, attr } */
function parseEntityRef(ref: string): { id: string; attr: string | null } {
  const at = ref.indexOf("@");
  if (at > 0) return { id: ref.slice(0, at), attr: ref.slice(at + 1) };
  return { id: ref, attr: null };
}

/** HA state object -> number (state or attribute) or null when unusable. */
function toNumber(st: any, attr: string | null): number | null {
  if (!st) return null;
  let raw: any;
  if (attr) raw = st.attributes ? st.attributes[attr] : undefined;
  else raw = st.state;
  raw = raw == null ? "" : String(raw).trim().toLowerCase();
  if (BAD_STATES.has(raw)) return null;
  const v = parseFloat(raw);
  return isFinite(v) ? v : null;
}

/** Unit of measurement for the entity state (empty for attributes). */
function unitOf(st: any, attr: string | null): string {
  if (attr || !st || !st.attributes) return "";
  return String(st.attributes.unit_of_measurement || "").trim();
}

function friendlyName(st: any, fallback: string): string {
  return st?.attributes?.friendly_name || fallback;
}

/* ---- colour maths ---- */

function hexToRgb(hex: string): [number, number, number] | null {
  let s = String(hex || "").trim();
  if (s[0] === "#") s = s.slice(1);
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s.slice(0, 6), 16);
  if (!isFinite(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbStr(rgb: [number, number, number]): string {
  return `rgb(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])})`;
}

/** "0:#2196f3,60:#ff9800" -> [{v, colour}] sorted by v */
function parseStops(str: string | undefined): { v: number; colour: string }[] {
  const stops: { v: number; colour: string }[] = [];
  for (const tok of String(str || "").split(",")) {
    const t = tok.trim();
    if (!t) continue;
    const ci = t.indexOf(":");
    if (ci < 1) continue;
    const v = parseFloat(t.slice(0, ci).trim());
    const colour = t.slice(ci + 1).trim();
    if (isFinite(v) && colour) stops.push({ v, colour });
  }
  stops.sort((a, b) => a.v - b.v);
  return stops;
}

/** Value colour stops -> [v, r, g, b] list. Unparsable colours are dropped. */
function stopsToRgb(stops: { v: number; colour: string }[]): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (const s of stops) {
    const rgb = hexToRgb(s.colour);
    if (rgb) out.push([s.v, rgb[0], rgb[1], rgb[2]]);
  }
  return out;
}

/** Blend between neighbouring stops at value v. */
function lerpStops(stops: [number, number, number, number][], v: number): [number, number, number] | null {
  if (!stops.length) return null;
  if (v <= stops[0][0]) return [stops[0][1], stops[0][2], stops[0][3]];
  const last = stops[stops.length - 1];
  if (v >= last[0]) return [last[1], last[2], last[3]];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const t = (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0] || 1);
      const a = stops[i - 1];
      const b = stops[i];
      return [
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
        a[3] + (b[3] - a[3]) * t,
      ];
    }
  }
  return [last[1], last[2], last[3]];
}

/** Discrete stop colour: the band that contains v. */
function stopColour(stops: [number, number, number, number][], v: number): [number, number, number] | null {
  if (!stops.length) return null;
  let c = stops[0];
  for (const s of stops) {
    if (v >= s[0]) c = s;
  }
  return [c[1], c[2], c[3]];
}

/**
 * Value colour for a ring, by style. Returns "rgb(...)" or "#hex" or null.
 * Only used when the entity doesn't set its own colour.
 */
function valueColour(ring: ResolvedRing, v: number): string | null {
  const rgbStops = stopsToRgb(ring.stopsList);
  if (ring.style === "fixed" || rgbStops.length === 0) return ring.fallbackColour || null;
  if (ring.style === "colorstop") {
    const c = stopColour(rgbStops, v);
    return c ? rgbStr(c) : null;
  }
  const c = lerpStops(rgbStops, v); // interpolated + gradient value colour
  return c ? rgbStr(c) : null;
}

/* ---- geometry ---- */

/**
 * Point on a circle, angle in degrees measured CLOCKWISE from 12 o'clock.
 * (SVG y grows downward, so 90° = 3 o'clock, 180° = bottom.)
 */
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

/** Clockwise arc path from a0 to a1 (degrees, a1 >= a0). Full circles split in two. */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  if (r <= 0) return "";
  const sweep = a1 - a0;
  if (sweep <= 0) return "";
  const [x0, y0] = polar(cx, cy, r, a0);
  if (sweep >= 359.9) {
    const [xm, ym] = polar(cx, cy, r, a0 + 180);
    const [x1, y1] = polar(cx, cy, r, a0 + 359.9);
    return (
      `M ${x0.toFixed(2)} ${y0.toFixed(2)}` +
      ` A ${r} ${r} 0 1 1 ${xm.toFixed(2)} ${ym.toFixed(2)}` +
      ` A ${r} ${r} 0 1 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
    );
  }
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = sweep > 180 ? 1 : 0;
  return (
    `M ${x0.toFixed(2)} ${y0.toFixed(2)}` +
    ` A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
  );
}

/** Fraction of the scale a value represents (clamped 0..1). */
function valueFrac(min: number, max: number, v: number): number {
  const span = max - min;
  if (!(span > 0)) return v >= max ? 1 : 0;
  return Math.max(0, Math.min(1, (v - min) / span));
}

interface ResolvedRing {
  id: string;
  attr: string | null;
  min: number;
  max: number;
  style: RingStyle;
  stopsList: { v: number; colour: string }[];
  thicknessPct: number | null;
  value: number | null;
  unit: string;
  fallbackColour: string | null;
}

interface Arc {
  key: string;
  d: string;
  fill: string;
  fillOpacity: number;
  strokeWidth?: number;
  strokeLinecap?: "round";
}

/**
 * Layout: pure function from resolved rings + box size to drawable pieces.
 */
function computeLayout(
  P: {
    w: number;
    h: number;
    cx: number;
    cy: number;
    rings: ResolvedRing[];
    sweep: number;
    ringWidthPct: number;
    ringGapPct: number;
    trackColor: string;
    fixedColor: string;
    showTicks: boolean;
    tickCount: number;
    tickSize: number;
    showMarker: boolean;
    markerColor: string;
    showCentre: boolean;
    showUnit: boolean;
    centreScale: number;
    decimals: number;
  },
): {
  cx: number;
  cy: number;
  r0: number;
  arcs: Arc[];
  ticks: { key: string; x1: number; y1: number; x2: number; y2: number }[];
  markers: { key: string; x: number; y: number; r: number; fill: string }[];
  centre: { valueText: string; unitText: string; colour: string | null; valuePx: number; unitPx: number } | null;
  ringCount: number;
} {
  const { w, h } = P;
  const sweep = Math.max(1, Math.min(360, P.sweep));
  const startDeg = 180 + (360 - sweep) / 2; // gap centred at the bottom

  const pad = 6;
  const tickLen = P.showTicks ? Math.max(3, (Math.min(w, h) / 2) * (P.tickSize / 100)) : 0;
  const r0 = Math.max(10, Math.min(w, h) / 2 - pad - (tickLen > 0 ? tickLen + 2 : 0));

  // Stack rings from the outside in.
  const geoms: { ring: ResolvedRing; r: number; thick: number }[] = [];
  let r = r0;
  for (const ring of P.rings) {
    const thick = Math.max(4, r0 * ((ring.thicknessPct != null ? ring.thicknessPct : P.ringWidthPct) / 100));
    if (r - thick / 2 <= 2) break; // no room left — stop stacking
    geoms.push({ ring, r, thick });
    r -= thick + Math.max(2, r0 * (P.ringGapPct / 100));
  }

  const arcs: Arc[] = [];
  const markers: { key: string; x: number; y: number; r: number; fill: string }[] = [];
  let centre: { valueText: string; unitText: string; colour: string | null; valuePx: number; unitPx: number } | null = null;
  let innerR = r0;

  geoms.forEach((g, i) => {
    const { ring, r: rr, thick } = g;
    innerR = Math.min(innerR, rr - thick);
    const v = ring.value;
    const has = v != null;

    // full track
    arcs.push({
      key: "track-" + i,
      d: arcPath(P.cx, P.cy, rr, startDeg, startDeg + sweep),
      fill: P.trackColor,
      fillOpacity: 0.38,
      strokeWidth: thick,
    });

    if (!has) return;

    const frac = valueFrac(ring.min, ring.max, v);
    const rgbStops = stopsToRgb(ring.stopsList);
    const stroke = { strokeWidth: thick, strokeLinecap: "round" as const };

    if (ring.style === "segments" && rgbStops.length) {
      // The whole scale painted in solid stop-colour ranges.
      for (let s = 0; s < rgbStops.length; s++) {
        const v0 = rgbStops[s][0];
        const v1 = s + 1 < rgbStops.length ? rgbStops[s + 1][0] : ring.max;
        const span = ring.max - ring.min || 1;
        const a0 = startDeg + (sweep * (v0 - ring.min)) / span;
        const a1 = startDeg + (sweep * (Math.min(v1, ring.max) - ring.min)) / span;
        if (a1 - a0 < 0.5) continue;
        arcs.push({
          key: `seg-${i}-${s}`,
          d: arcPath(P.cx, P.cy, rr, a0, a1),
          fill: rgbStr([rgbStops[s][1], rgbStops[s][2], rgbStops[s][3]]),
          fillOpacity: 1,
          ...stroke,
        });
      }
    } else if (ring.style === "gradient" && rgbStops.length) {
      // Smooth gradient along the progress: many thin interpolated slices.
      const N = 64;
      for (let s = 0; s < N; s++) {
        const f0 = (frac * s) / N;
        const f1 = (frac * (s + 1)) / N;
        if (f1 - f0 <= 0) continue;
        const a0 = startDeg + sweep * f0;
        const a1 = startDeg + sweep * f1;
        const v0 = ring.min + (ring.max - ring.min) * f0;
        const v1 = ring.min + (ring.max - ring.min) * f1;
        const c1 = lerpStops(rgbStops, v1);
        arcs.push({
          key: `grad-${i}-${s}`,
          d: arcPath(P.cx, P.cy, rr, a0, a1),
          fill: c1 ? rgbStr(c1) : P.fixedColor,
          fillOpacity: 1,
          strokeWidth: thick,
        });
      }
    } else if (frac > 0) {
      // fixed / colorstop / interpolated: one progress arc in a single colour
      let fill = P.fixedColor;
      if (ring.style === "colorstop" && rgbStops.length) {
        const c = stopColour(rgbStops, v as number);
        if (c) fill = rgbStr(c);
      } else if (ring.style === "interpolated" && rgbStops.length) {
        const c = lerpStops(rgbStops, v as number);
        if (c) fill = rgbStr(c);
      } else if (ring.fallbackColour) {
        fill = ring.fallbackColour;
      }
      arcs.push({
        key: "prog-" + i,
        d: arcPath(P.cx, P.cy, rr, startDeg, startDeg + sweep * frac),
        fill,
        fillOpacity: 1,
        ...stroke,
      });
    }

    // value marker dot at the current angle
    if (P.showMarker && frac > 0 && frac < 1) {
      const [mx, my] = polar(P.cx, P.cy, rr, startDeg + sweep * frac);
      markers.push({ key: "mark-" + i, x: mx, y: my, r: Math.max(2.5, thick * 0.22), fill: P.markerColor });
    }

    // centre value from the FIRST ring only
    if (i === 0 && P.showCentre) {
      const c = has ? valueColour(ring, v as number) : null;
      centre = {
        valueText: has ? (v as number).toFixed(P.decimals) : "—",
        unitText: P.showUnit ? ring.unit : "",
        colour: c,
        valuePx: Math.max(10, Math.min(72, innerR * 0.62)) * P.centreScale,
        unitPx: Math.max(8, Math.min(28, innerR * 0.26)) * P.centreScale,
      };
    }
  });

  // tick marks outside the outermost ring
  const ticks: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  if (P.showTicks && geoms.length) {
    const n = Math.max(2, Math.round(P.tickCount));
    const rT0 = r0 + 2;
    for (let i = 0; i < n; i++) {
      const a = startDeg + (sweep * i) / (n - 1);
      const [x1, y1] = polar(P.cx, P.cy, rT0, a);
      const [x2, y2] = polar(P.cx, P.cy, rT0 + tickLen, a);
      ticks.push({ key: "tick-" + i, x1, y1, x2, y2 });
    }
  }

  return { cx: P.cx, cy: P.cy, r0, arcs, ticks, markers, centre, ringCount: geoms.length };
}

/* ---- emoji icon mapping ---- */

const ICON_KEYWORDS: [RegExp, string][] = [
  [/battery|charge/, "🔋"],
  [/solar|sun/, "☀️"],
  [/temperature|temp|thermostat|climate|heat/, "🌡️"],
  [/humid/, "💧"],
  [/pressure|baro/, "🌀"],
  [/co2|carbon|air-quality|airquality|particulate|pm2|pm10|pollen|dust/, "🫧"],
  [/power|watt|energy|electric|meter|grid/, "⚡"],
  [/gas/, "🔥"],
  [/water|rain|moisture/, "🌊"],
  [/wind|gust/, "🌬️"],
  [/uv|illuminance|light|lux|brightness/, "💡"],
  [/door|window|opening|garage/, "🚪"],
  [/motion|occupancy|presence/, "👤"],
  [/\bev\b|car|vehicle/, "🚗"],
  [/outdoor|outside|exterior/, "🌤️"],
  [/indoor|inside|room|area/, "🏠"],
];

function iconFor(st: any, entityId: string): string {
  const iconAttr = String(st?.attributes?.icon || "");
  const hay = (iconAttr + " " + (entityId || "")).toLowerCase();
  for (const [re, emoji] of ICON_KEYWORDS) {
    if (re.test(hay)) return emoji;
  }
  return "•";
}

/* ------------------------------------------------------------------ */
/* The widget.                                                          */
/* ------------------------------------------------------------------ */

interface Sized {
  w: number;
  h: number;
}

export default function FlexHorseshoeWidget({ config }: { config?: any }) {
  const glass = useGlassStyle(config);
  const isLight = glass.isLight;
  const textMain = isLight ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.95)";

  const trackColor = config?.trackColor || "#6b7280";
  const fixedColor = config?.fixedColor || "#4dd0e1";
  const tickColor = config?.tickColor || "#8a9099";
  const markerColor = config?.markerColor || "#ffffff";
  const sweep = Math.max(1, Math.min(360, Number(config?.arcDegrees) || 260));
  const ringWidthPct = Math.max(4, Math.min(60, Number(config?.ringWidth) || 18));
  const ringGapPct = Math.max(0, Math.min(30, Number(config?.ringGap) || 5));
  const tickCount = Math.max(2, Math.min(60, Number(config?.tickCount) || 11));
  const tickSize = Math.max(1, Math.min(30, Number(config?.tickSize) || 6));
  const decimals = Math.max(0, Math.min(3, Math.round(Number(config?.decimals ?? 1))));
  const centreScale = Math.max(0.3, Math.min(4, Number(config?.centreScale) || 1));
  const showTicks = config?.showTicks === true;
  const showMarker = config?.showMarker === true;
  const showCentreValue = config?.showCentreValue !== false;
  const showUnit = config?.showUnit !== false;
  const showEntityList = config?.showEntityList !== false;
  const showIcons = config?.showIcons !== false;

  const entities: EntityDef[] = Array.isArray(config?.entities) ? config.entities : [];
  const ringDefs: RingDef[] = Array.isArray(config?.rings) ? config.rings : [];

  // entity ids for the shared HA stream (rows + rings)
  const ids = useMemo(() => {
    const set = new Set<string>();
    for (const e of entities) {
      const { id } = parseEntityRef(e.entityId || "");
      if (id) set.add(id);
    }
    for (const r of ringDefs) {
      const { id } = parseEntityRef(r.entityId || "");
      if (id) set.add(id);
    }
    return [...set];
  }, [entities, ringDefs]);

  const live = useHaLiveStates(ids, ids.length > 0);
  const statesDict: Record<string, any> = live?.states ?? {};
  const connected = live?.connected ?? false;

  const [size, setSize] = useState<Sized | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Measure the content box. Runs EVERY render (no dep array) with an
  // equality guard — the early-return trap: early-return states render
  // without the ref div, so a mount-only effect never re-measures once
  // data/config makes the SVG appear.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) return false;
      const nw = Math.round(r.width);
      const nh = Math.round(r.height);
      setSize((prev) => (prev && prev.w === nw && prev.h === nh ? prev : { w: nw, h: nh }));
      return true;
    };
    measure();
    const raf = requestAnimationFrame(() => {
      measure();
    });
    return () => cancelAnimationFrame(raf);
  });

  /* ---- resolve live rows ---- */

  const rows = useMemo(() => {
    // rows = configured entities PLUS any ring entity not already listed
    const seen = new Set<string>();
    const out: {
      key: string;
      id: string;
      attr: string | null;
      label: string;
      color?: string;
      value: number | null;
      unit: string;
      raw: string | null;
    }[] = [];
    const push = (entityId: string, label: string, color?: string, ring?: RingDef) => {
      const { id, attr } = parseEntityRef(entityId);
      if (!id || seen.has(id + (attr ? "@" + attr : ""))) return;
      seen.add(id + (attr ? "@" + attr : ""));
      const st = statesDict[id];
      const v = toNumber(st, attr);
      out.push({
        key: id + (attr ? "@" + attr : ""),
        id,
        attr,
        label: label || friendlyName(st, id),
        color,
        value: v,
        unit: unitOf(st, attr),
        raw: st ? String(attr ? (st.attributes ? st.attributes[attr] : "") : st.state) : null,
      });
    };
    for (const e of entities) push(e.entityId, e.label || "", e.color);
    for (const r of ringDefs) push(r.entityId, "", undefined, r);
    return out;
  }, [entities, ringDefs, statesDict]);

  const resolvedRings: ResolvedRing[] = useMemo(() => {
    return ringDefs.map((r) => {
      const { id, attr } = parseEntityRef(r.entityId || entities[0]?.entityId || "");
      const st = statesDict[id];
      const v = toNumber(st, attr);
      const stopsList = parseStops(r.stops);
      return {
        id,
        attr,
        min: isFinite(Number(r.min)) ? Number(r.min) : 0,
        max: isFinite(Number(r.max)) ? Number(r.max) : 100,
        style: r.style || (stopsList.length ? "colorstop" : "fixed"),
        stopsList,
        thicknessPct: isFinite(Number(r.thicknessPct)) && Number(r.thicknessPct) > 0 ? Number(r.thicknessPct) : null,
        value: v,
        unit: unitOf(st, attr),
        fallbackColour:
          (r.style === "fixed" || stopsList.length === 0
            ? entities.find((e) => parseEntityRef(e.entityId).id === id)?.color || fixedColor
            : null),
      };
    });
  }, [ringDefs, entities, statesDict, fixedColor]);

  const L = useMemo(() => {
    if (!size || size.w < 20 || size.h < 20) return null;
    return computeLayout({
      w: size.w,
      h: size.h,
      cx: size.w / 2,
      cy: size.h / 2,
      rings: resolvedRings,
      sweep,
      ringWidthPct,
      ringGapPct,
      trackColor,
      fixedColor,
      showTicks,
      tickCount,
      tickSize,
      showMarker,
      markerColor,
      showCentre: showCentreValue,
      showUnit,
      centreScale,
      decimals,
    });
  }, [size, resolvedRings, sweep, ringWidthPct, ringGapPct, trackColor, fixedColor, showTicks, tickCount, tickSize, showMarker, markerColor, showCentreValue, centreScale, decimals]);

  const configured = entities.length > 0 || ringDefs.length > 0;

  if (!configured) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: textMain,
        }}
      >
        <div style={{ fontSize: "0.85em", fontWeight: 700, opacity: 0.75, textAlign: "center", padding: "0.5em" }}>
          🧲 Flex Horseshoe
          <div style={{ fontWeight: 400, fontSize: "0.8em", marginTop: "0.4em" }}>
            Add entities and gauge rings in the Content tab.
          </div>
        </div>
      </div>
    );
  }

  // Error guard: only a full-tile error BEFORE any data has ever arrived.
  const hasData = Object.keys(statesDict).length > 0;
  if (live?.error && !hasData) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: textMain }}>
        <div style={{ fontSize: "0.7em", textAlign: "center", padding: "0.5em" }}>
          {live.error}
          <div style={{ opacity: 0.6, marginTop: "0.3em" }}>{ids.length} entity(s) configured</div>
        </div>
      </div>
    );
  }

  const fmt = (v: number) => v.toFixed(decimals);

  // Entity rows under the gauge. Font shrinks when many rows share the tile.
  const rowScale = rows.length <= 5 ? 1 : Math.max(0.7, 5 / rows.length);

  const listEl = showEntityList ? (
    <div
      style={{
        flex: "0 0 auto",
        padding: "0.2em 0.7em 0.35em",
        maxHeight: "45%",
        overflow: "hidden",
        fontSize: `${rowScale}em`,
      }}
    >
      {rows.map((e) => {
        const ringFor = resolvedRings.find((r) => r.id === e.id);
        const dotColour =
          e.color ||
            (ringFor && e.value != null
              ? valueColour(ringFor, e.value as number)
              : null) ||
            fixedColor;
        const numeric = e.value != null;
        const rawLower = String(e.raw ?? "").toLowerCase();
        const valText = numeric
          ? fmt(e.value as number) + (showUnit && e.unit ? " " + e.unit : "")
          : e.raw != null && e.raw !== "" && !BAD_STATES.has(rawLower)
            ? String(e.raw)
            : "—";
        return (
          <div
            key={e.key}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.45em",
              lineHeight: 1.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              color: textMain,
            }}
          >
            <span style={{ fontSize: "0.95em", flex: "0 0 auto" }}>{showIcons ? iconFor(statesDict[e.id], e.id) : ""}</span>
            <span style={{ fontSize: "0.62em", opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis" }}>{e.label}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: "0.68em", fontWeight: 700, color: numeric ? dotColour : undefined, whiteSpace: "nowrap" }}>
              {valText}
            </span>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", color: textMain }}>
      {config?.title ? (
        <div style={{ fontSize: "0.75em", fontWeight: 700, padding: "0.3em 0.5em 0", flex: "0 0 auto" }}>{config.title}</div>
      ) : null}
      <div ref={boxRef} style={{ position: "relative", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
        {!L ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7em", opacity: 0.5 }}>
            …
          </div>
        ) : (
          <>
            <svg width={size!.w} height={size!.h} style={{ position: "absolute", left: 0, top: 0 }}>
              {L.arcs.map((a) => (
                <path
                  key={a.key}
                  d={a.d}
                  fill={a.fill}
                  fillOpacity={a.fillOpacity}
                  stroke="none"
                  strokeWidth={a.strokeWidth}
                  strokeLinecap={a.strokeLinecap}
                />
              ))}
              {L.ticks.map((t) => (
                <line
                  key={t.key}
                  x1={t.x1}
                  y1={t.y1}
                  x2={t.x2}
                  y2={t.y2}
                  stroke={tickColor}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              ))}
              {L.markers.map((m) => (
                <circle key={m.key} cx={m.x} cy={m.y} r={m.r} fill={m.fill} stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
              ))}
            </svg>
            {L.centre ? (
              <div
                style={{
                  position: "absolute",
                  left: L.cx,
                  top: L.cy,
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  lineHeight: 1.05,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontSize: `${L.centre.valuePx}px`, fontWeight: 700, color: L.centre.colour || textMain }}>
                  {L.centre.valueText}
                </div>
                {L.centre.unitText ? (
                  <div style={{ fontSize: `${L.centre.unitPx}px`, opacity: 0.65 }}>{L.centre.unitText}</div>
                ) : null}
              </div>
            ) : null}
            {!connected ? (
              <div style={{ position: "absolute", right: 6, top: 4, fontSize: "0.55em", opacity: 0.5 }}>offline</div>
            ) : null}
          </>
        )}
      </div>
      {listEl}
    </div>
  );
}

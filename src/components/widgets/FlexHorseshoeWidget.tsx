"use client";

import { useLayoutEffect, useState, useRef, useMemo, type ReactElement, type CSSProperties } from "react";
import { useGlassStyle } from "@/lib/ui/glass";
import { useHaLiveStates } from "@/lib/ha/useHaLiveStates";

/* ------------------------------------------------------------------ */
/* Pure helpers — module scope, no hooks, no React.                    */
/* Ported from the Flex Horseshoe custom module (custom:flex-horseshoe) */
/* and made type-safe for the core widget.                             */
/* ------------------------------------------------------------------ */

const BAD_STATES = new Set(["unavailable", "unknown", "none", ""]);

export type RingStyle = "fixed" | "colorstop" | "interpolated" | "segments" | "gradient";

/**
 * Where an icon/value sits in the entity row: pinned to a row edge
 * ("far-left"/"far-right") or beside the name ("before-name"/"after-name").
 */
export type RowPlacement = "far-left" | "before-name" | "after-name" | "far-right";

/** Justification of the entity row's content (its name cluster). */
export type RowAlign = "left" | "center" | "right";

const PLACEMENTS: readonly RowPlacement[] = ["far-left", "before-name", "after-name", "far-right"];
const ROW_ALIGNS: readonly RowAlign[] = ["left", "center", "right"];

/**
 * Entity = gauge ring. Max TWO entities:
 *   entity 0 (mandatory) = MAIN entity, drawn on the OUTSIDE ring
 *   entity 1 (optional)  = second entity, drawn on the INSIDE ring
 */
export interface EntityCfg {
  entityId: string; // supports entity_id@attribute
  label?: string;
  color?: string;
  min?: number;
  max?: number;
  style?: RingStyle;
  /** "0:#2196f3,60:#ff9800" — ordered numeric value → hex colour pairs */
  stops?: string;
  thicknessPct?: number; // ring width, % of the outer radius
  showRing?: boolean; // draw the horseshoe arc (default on)
  showMarker?: boolean; // draw the tick/value marker dot
  unitOverride?: string; // "" = no override
  showUnit?: boolean;
  decimals?: number;
  /* ---- entity-row display, per entity ---- */
  showRowIcon?: boolean; // icon in the entity row
  showRowName?: boolean; // name in the entity row
  showRowValue?: boolean; // value in the entity row
  /** icon position in the row: row edge or beside the name */
  iconPlacement?: RowPlacement;
  /** value position in the row: row edge or beside the name */
  valuePlacement?: RowPlacement;
  /** row justification: positions the name cluster left/centre/right */
  rowAlign?: RowAlign;
}

/** Legacy config shape: rings were configured separately from entities. */
interface LegacyRingDef {
  entityId: string;
  min: number;
  max: number;
  style: RingStyle;
  stops?: string;
  thicknessPct?: number;
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

/** Row placement validation with fallback (config values are user input). */
function normPlacement(v: unknown, d: RowPlacement): RowPlacement {
  return PLACEMENTS.includes(v as RowPlacement) ? (v as RowPlacement) : d;
}

function normRowAlign(v: unknown, d: RowAlign): RowAlign {
  return ROW_ALIGNS.includes(v as RowAlign) ? (v as RowAlign) : d;
}

/* ---- entity-row zone layout ---- */

/** Which element occupies a slot in the entity row. */
export type RowSlot = "icon" | "value" | "name";

/**
 * Row layout: [far-left zone] [name cluster, rowAlign] [far-right zone].
 * far-left/far-right pin to the row edges; before-name/after-name sit
 * beside the name inside the cluster, which the row justification
 * (rowAlign) positions within whatever space the edge zones leave. With
 * nothing pinned to an edge the cluster takes the whole row and rowAlign
 * justifies the entire row.
 *
 * Zone arrays list slots outermost→innermost (left) / innermost→outermost
 * (right), so the value ends up as the outermost element on either edge —
 * matching the legacy layouts.
 */
export interface RowZones {
  left: RowSlot[];
  center: RowSlot[];
  right: RowSlot[];
}

/** Pure placement logic for one entity row. Hidden elements take no slot. */
export function buildRowZones(P: {
  showRowIcon: boolean;
  showRowName: boolean;
  showRowValue: boolean;
  iconPlacement: RowPlacement;
  valuePlacement: RowPlacement;
}): RowZones {
  const left: RowSlot[] = [];
  const center: RowSlot[] = [];
  const right: RowSlot[] = [];
  const icon: RowSlot | null = P.showRowIcon ? "icon" : null;
  const value: RowSlot | null = P.showRowValue ? "value" : null;
  const name: RowSlot | null = P.showRowName ? "name" : null;

  // left edge, value outermost (legacy "left" had the value leftmost)
  if (value && P.valuePlacement === "far-left") left.push(value);
  if (icon && P.iconPlacement === "far-left") left.push(icon);
  // name cluster in reading order: icon · value · name · value · icon
  if (icon && P.iconPlacement === "before-name") center.push(icon);
  if (value && P.valuePlacement === "before-name") center.push(value);
  if (name) center.push(name);
  if (value && P.valuePlacement === "after-name") center.push(value);
  if (icon && P.iconPlacement === "after-name") center.push(icon);
  // right edge, value outermost (legacy "right" had the value rightmost)
  if (icon && P.iconPlacement === "far-right") right.push(icon);
  if (value && P.valuePlacement === "far-right") right.push(value);

  return { left, center, right };
}

export interface ResolvedRing {
  idx: number; // entity index (0 = outer/main, 1 = inner)
  id: string;
  attr: string | null;
  label: string;
  min: number;
  max: number;
  style: RingStyle;
  stopsList: { v: number; colour: string }[];
  thicknessPct: number | null;
  value: number | null;
  unit: string;
  showUnit: boolean;
  decimals: number;
  showRing: boolean;
  showMarker: boolean;
  entColor: string | null;
  fallbackColour: string | null;
  /* entity-row display (resolved) */
  showRowIcon: boolean;
  showRowName: boolean;
  showRowValue: boolean;
  iconPlacement: RowPlacement;
  valuePlacement: RowPlacement;
  rowAlign: RowAlign;
}

/** A stroked arc piece. Rendered with fill="none" + stroke so that the
 *  ring width (strokeWidth) actually controls the thickness of the arc. */
interface Arc {
  key: string;
  d: string;
  fill: string;
  opacity: number;
  strokeWidth?: number;
  strokeLinecap?: "round";
}

/**
 * Layout: pure function from resolved rings + box size to drawable pieces.
 */
export function computeLayout(
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
    markerColor: string;
    showCentre: boolean;
    centreEntity: number;
    centreShowUnit: boolean;
    centreScale: number;
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

  // Stack rings from the outside in. Rings with neither horseshoe nor marker
  // are invisible and don't consume radial space.
  const geoms: { ring: ResolvedRing; r: number; thick: number }[] = [];
  let r = r0;
  for (const ring of P.rings) {
    if (!ring.showRing && !(ring.showMarker && ring.value != null)) continue;
    const thick = Math.max(4, r0 * ((ring.thicknessPct != null ? ring.thicknessPct : P.ringWidthPct) / 100));
    if (r - thick / 2 <= 2) break; // no room left — stop stacking
    geoms.push({ ring, r, thick });
    r -= thick + Math.max(2, r0 * (P.ringGapPct / 100));
  }

  const arcs: Arc[] = [];
  const markers: { key: string; x: number; y: number; r: number; fill: string }[] = [];
  let innerR = r0;

  geoms.forEach((g) => {
    const { ring, r: rr, thick } = g;
    innerR = Math.min(innerR, rr - thick);
    const v = ring.value;
    const has = v != null;

    if (ring.showRing) {
      // full track
      arcs.push({
        key: "track-" + ring.idx,
        d: arcPath(P.cx, P.cy, rr, startDeg, startDeg + sweep),
        fill: P.trackColor,
        opacity: 0.38,
        strokeWidth: thick,
      });

      if (has) {
        const frac = valueFrac(ring.min, ring.max, v as number);
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
              key: `seg-${ring.idx}-${s}`,
              d: arcPath(P.cx, P.cy, rr, a0, a1),
              fill: rgbStr([rgbStops[s][1], rgbStops[s][2], rgbStops[s][3]]),
              opacity: 1,
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
            const v1 = ring.min + (ring.max - ring.min) * f1;
            const c1 = lerpStops(rgbStops, v1);
            arcs.push({
              key: `grad-${ring.idx}-${s}`,
              d: arcPath(P.cx, P.cy, rr, a0, a1),
              fill: c1 ? rgbStr(c1) : P.fixedColor,
              opacity: 1,
              strokeWidth: thick,
            });
          }
        } else if (frac > 0) {
          // fixed / colorstop / interpolated: one progress arc in a single colour
          let fill = ring.fallbackColour || P.fixedColor;
          if (ring.style === "colorstop" && rgbStops.length) {
            const c = stopColour(rgbStops, v as number);
            if (c) fill = rgbStr(c);
          } else if (ring.style === "interpolated" && rgbStops.length) {
            const c = lerpStops(rgbStops, v as number);
            if (c) fill = rgbStr(c);
          }
          arcs.push({
            key: "prog-" + ring.idx,
            d: arcPath(P.cx, P.cy, rr, startDeg, startDeg + sweep * frac),
            fill,
            opacity: 1,
            ...stroke,
          });
        }
      }
    }

    // tick/value marker dot at the current angle
    if (ring.showMarker && has) {
      const frac = valueFrac(ring.min, ring.max, v as number);
      const [mx, my] = polar(P.cx, P.cy, rr, startDeg + sweep * frac);
      markers.push({ key: "mark-" + ring.idx, x: mx, y: my, r: Math.max(2.5, thick * 0.22), fill: P.markerColor });
    }
  });

  // Big centre value: the user-chosen entity (default: first entity)
  let centre: { valueText: string; unitText: string; colour: string | null; valuePx: number; unitPx: number } | null =
    null;
  const cIdx = Math.max(0, Math.min(1, Math.round(P.centreEntity)));
  const cRing = P.rings[cIdx] ?? P.rings[0];
  if (P.showCentre && cRing) {
    const v = cRing.value;
    const has = v != null;
    const c = has ? valueColour(cRing, v as number) : null;
    centre = {
      valueText: has ? (v as number).toFixed(cRing.decimals) : "—",
      unitText: P.centreShowUnit && cRing.showUnit ? cRing.unit : "",
      colour: c,
      valuePx: Math.max(10, Math.min(72, innerR * 0.62)) * P.centreScale,
      unitPx: Math.max(8, Math.min(28, innerR * 0.26)) * P.centreScale,
    };
  }

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
  [/power|watt|energy|electric|grid/, "⚡"],
  [/gas/, "🔥"],
  [/water|rain|moisture/, "🌊"],
  [/wind|gust/, "🌬️"],
  [/uv|illuminance|light|brightness/, "💡"],
  [/door|window|opening|garage/, "🚪"],
  [/motion|occupancy|presence/, "👤"],
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
  const centreScale = Math.max(0.3, Math.min(4, Number(config?.centreScale) || 1));
  const showTicks = config?.showTicks === true;

  // Title: justification + position
  const title: string = String(config?.title || "");
  const titleAlign = ["left", "center", "right"].includes(config?.titleAlign) ? config.titleAlign : "left";
  const titlePosition = config?.titlePosition === "bottom" ? "bottom" : "top";

  // Entity rows: visibility (icon/name/value), icon & value placement and the
  // row justification now live inside each entity (showRowIcon, showRowName,
  // showRowValue, iconPlacement, valuePlacement, rowAlign). A row renders
  // whenever any of those three visibility flags is on — there is no global
  // "show rows" toggle any more. The legacy global keys (showEntityList,
  // showEntityName, showIcons, valuePlacement) are honoured as per-entity
  // fallbacks during resolution. Only the rows-above/below choice stays here.
  const entityListPosition = config?.entityListPosition === "above" ? "above" : "below";

  // Big centre value
  const showCentreValue = config?.showCentreValue !== false;
  const centreEntity = Number(config?.centreEntity) === 1 ? 1 : 0;
  const showCentreIcon = config?.showCentreIcon === true;
  const centreShowUnit = config?.centreShowUnit !== false;

  const ents: EntityCfg[] = Array.isArray(config?.entities)
    ? (config.entities as EntityCfg[]).slice(0, 2)
    : [];
  // Legacy configs stored ring defs separately from entity rows.
  const legacyRings: LegacyRingDef[] =
    ents.length === 0 && Array.isArray(config?.rings) ? (config.rings as LegacyRingDef[]) : [];

  // entity ids for the shared HA stream (rows + rings)
  const ids = useMemo(() => {
    const set = new Set<string>();
    for (const e of ents) {
      const { id } = parseEntityRef(e.entityId || "");
      if (id) set.add(id);
    }
    for (const r of legacyRings) {
      const { id } = parseEntityRef(r.entityId || "");
      if (id) set.add(id);
    }
    return [...set];
  }, [ents, legacyRings]);

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

  /* ---- resolve one ring per entity (legacy: one per old ring def) ---- */

  const resolvedRings: ResolvedRing[] = useMemo(() => {
    const sources: (EntityCfg | LegacyRingDef)[] =
      ents.length > 0 ? ents : legacyRings;
    // Legacy fallbacks from the old global settings (config-level, passthrough).
    const legacyShowUnit = config?.showUnit !== false;
    const legacyDecimals = Math.max(0, Math.min(3, Math.round(Number(config?.decimals ?? 1))));
    // Legacy global entity-row settings → per-entity fallbacks.
    const legacyRowOn = config?.showEntityList !== false;
    const legacyShowIcons = config?.showIcons !== false;
    const legacyShowName = config?.showEntityName !== false;
    // Old value placement → new (value, icon) placement pair. The old layouts
    // always sat the icon beside the name, with the value at a row edge or
    // beside the name itself.
    const legacyValuePlacement: RowPlacement =
      config?.valuePlacement === "left"
        ? "far-left"
        : config?.valuePlacement === "beforeName"
          ? "before-name"
          : config?.valuePlacement === "afterName"
            ? "after-name"
            : "far-right";
    const out: ResolvedRing[] = [];
    sources.forEach((e, i) => {
      const { id, attr } = parseEntityRef(e.entityId || "");
      if (!id) return;
      const st = statesDict[id];
      const stopsList = parseStops(e.stops);
      const style = e.style || (stopsList.length ? "colorstop" : "fixed");
      const unitOverride = String((e as EntityCfg).unitOverride ?? "").trim();
      const unit = unitOverride || unitOf(st, attr);
      out.push({
        idx: i,
        id,
        attr,
        label: (e as EntityCfg).label || friendlyName(st, id),
        min: isFinite(Number(e.min)) ? Number(e.min) : 0,
        max: isFinite(Number(e.max)) ? Number(e.max) : 100,
        style,
        stopsList,
        thicknessPct: isFinite(Number(e.thicknessPct)) && Number(e.thicknessPct) > 0 ? Number(e.thicknessPct) : null,
        value: toNumber(st, attr),
        unit,
        showUnit: (e as EntityCfg).showUnit ?? legacyShowUnit,
        decimals: Math.max(0, Math.min(3, Math.round(Number((e as EntityCfg).decimals ?? legacyDecimals)))),
        showRing: (e as EntityCfg).showRing !== false,
        showMarker: (e as EntityCfg).showMarker === true,
        entColor: (e as EntityCfg).color || null,
        fallbackColour: (e as EntityCfg).color || fixedColor,
        showRowIcon: (e as EntityCfg).showRowIcon ?? (legacyShowIcons && legacyRowOn),
        showRowName: (e as EntityCfg).showRowName ?? (legacyShowName && legacyRowOn),
        showRowValue: (e as EntityCfg).showRowValue ?? legacyRowOn,
        iconPlacement: normPlacement((e as EntityCfg).iconPlacement, "before-name"),
        valuePlacement: normPlacement((e as EntityCfg).valuePlacement, legacyValuePlacement),
        rowAlign: normRowAlign((e as EntityCfg).rowAlign, "left"),
      });
    });
    return out;
  }, [ents, legacyRings, statesDict, fixedColor, config]);

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
      markerColor,
      showCentre: showCentreValue,
      centreEntity,
      centreShowUnit,
      centreScale,
    });
  }, [size, resolvedRings, sweep, ringWidthPct, ringGapPct, trackColor, fixedColor, showTicks, tickCount, tickSize, markerColor, showCentreValue, centreEntity, centreShowUnit, centreScale]);

  const configured = ents.length > 0 || legacyRings.length > 0;

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
            Add up to two entities in the Content tab.
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

  /* ---- big centre value ---- */

  const cIdx = resolvedRings[centreEntity] ? centreEntity : 0;
  const cRing = resolvedRings[cIdx];
  const centreIcon = showCentreIcon && cRing ? iconFor(statesDict[cRing.id], cRing.id) : "";

  /* ---- entity rows ---- */

  // Per-entity rows: show each entity's row when any of its icon/name/value
  // flags is on.
  const rowRings = resolvedRings.filter((r) => r.showRowIcon || r.showRowName || r.showRowValue);

  const listEl = rowRings.length > 0 ? (
    <div
      style={{
        flex: "0 0 auto",
        padding: entityListPosition === "above" ? "0.2em 0.7em 0.2em" : "0.2em 0.7em 0.35em",
        maxHeight: "45%",
        overflow: "hidden",
      }}
    >
      {rowRings.map((r) => {
        const st = statesDict[r.id];
        const numeric = r.value != null;
        const dotColour = numeric
          ? r.entColor || valueColour(r, r.value as number) || fixedColor
          : undefined;
        const unitText = r.showUnit ? r.unit : "";
        const rawLower = String(
          st ? String(r.attr ? (st.attributes ? st.attributes[r.attr] : "") : st.state) : "",
        ).toLowerCase();
        const valText = numeric
          ? (r.value as number).toFixed(r.decimals) + (unitText ? " " + unitText : "")
          : st && String(r.attr ? (st.attributes ? st.attributes[r.attr] : "") : st.state) !== "" && !BAD_STATES.has(rawLower)
            ? String(r.attr ? (st.attributes ? st.attributes[r.attr] : "") : st.state)
            : "—";

        const valEl = r.showRowValue ? (
          <span style={{ fontSize: "0.68em", fontWeight: 700, color: dotColour, whiteSpace: "nowrap", flex: "0 0 auto" }}>
            {valText}
          </span>
        ) : null;
        const nameEl = r.showRowName ? (
          <span
            style={{
              fontSize: "0.62em",
              opacity: 0.75,
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
              flexShrink: 1,
            }}
          >
            {r.label}
          </span>
        ) : null;
        const iconEl = r.showRowIcon ? (
          <span style={{ fontSize: "0.95em", flex: "0 0 auto" }}>{iconFor(st, r.id)}</span>
        ) : null;

        /* Row layout: [far-left zone] [name cluster, rowAlign] [far-right
         * zone] — pure logic lives in buildRowZones, this maps slots to the
         * rendered elements. */
        const zones = buildRowZones({
          showRowIcon: r.showRowIcon,
          showRowName: r.showRowName,
          showRowValue: r.showRowValue,
          iconPlacement: r.iconPlacement,
          valuePlacement: r.valuePlacement,
        });
        const slotEl = (s: RowSlot): ReactElement | null =>
          s === "icon" ? iconEl : s === "value" ? valEl : nameEl;
        const leftZone = zones.left.map(slotEl);
        const centerZone = zones.center.map(slotEl);
        const rightZone = zones.right.map(slotEl);

        const justify =
          r.rowAlign === "center" ? "center" : r.rowAlign === "right" ? "flex-end" : "flex-start";
        const zoneStyle: CSSProperties = {
          display: "flex",
          alignItems: "baseline",
          gap: "0.45em",
          minWidth: 0,
        };

        return (
          <div
            key={r.id + (r.attr ? "@" + r.attr : "")}
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
            {leftZone.some(Boolean) ? (
              <div style={{ ...zoneStyle, flex: "0 0 auto" }}>{leftZone.filter(Boolean)}</div>
            ) : null}
            <div
              style={{
                ...zoneStyle,
                flex: "1 1 auto",
                justifyContent: justify,
                overflow: "hidden",
              }}
            >
              {centerZone.filter(Boolean)}
            </div>
            {rightZone.some(Boolean) ? (
              <div style={{ ...zoneStyle, flex: "0 0 auto" }}>{rightZone.filter(Boolean)}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  ) : null;

  const titleEl = title ? (
    <div
      style={{
        fontSize: "0.75em",
        fontWeight: 700,
        flex: "0 0 auto",
        padding: titlePosition === "top" ? "0.3em 0.7em 0" : "0 0.7em 0.3em",
        textAlign: titleAlign as any,
      }}
    >
      {title}
    </div>
  ) : null;

  const gaugeBox = (
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
                fill="none"
                stroke={a.fill}
                strokeOpacity={a.opacity}
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
              {centreIcon ? (
                <div style={{ fontSize: `${Math.max(10, Math.min(30, L.centre.valuePx * 0.38))}px`, marginBottom: "0.15em" }}>
                  {centreIcon}
                </div>
              ) : null}
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
  );

  // Compose the tile: title top/bottom, entity rows above/below the gauge.
  const children: ReactElement[] = [];
  if (titleEl && titlePosition === "top") children.push(titleEl);
  if (listEl && entityListPosition === "above") children.push(listEl);
  children.push(gaugeBox);
  if (listEl && entityListPosition === "below") children.push(listEl);
  if (titleEl && titlePosition === "bottom") children.push(titleEl);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", color: textMain }}>
      {children}
    </div>
  );
}

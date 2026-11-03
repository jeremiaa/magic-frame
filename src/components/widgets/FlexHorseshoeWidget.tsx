"use client";

import { useLayoutEffect, useState, useRef, useMemo, type ReactElement, type CSSProperties } from "react";
import { useGlassStyle } from "@/lib/ui/glass";
import { useHaLiveStates } from "@/lib/ha/useHaLiveStates";
import { Icon } from "./WidgetIcon";

/* ------------------------------------------------------------------ */
/* Pure helpers - module scope, no hooks, no React.                    */
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

/** Where the big centre value's unit sits relative to the value. */
export type CentreUnitPos = "below" | "above" | "before" | "after";

const CENTRE_UNIT_POS: readonly CentreUnitPos[] = ["below", "above", "before", "after"];

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
  /** "0:#2196f3,60:#ff9800" - ordered numeric value → hex colour pairs */
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
  /** custom mdi icon for this entity (same picker as the Sensor widget);
   *  blank = use the icon Home Assistant provides (attributes.icon) */
  icon?: string;
  /** colour for the entity's MDI/Lucide icon (emoji glyphs ignore it);
   *  blank = inherit the widget text colour */
  iconColor?: string;
  /** explicit colour for this entity's row value; blank = the automatic
   *  chain (entity colour → value colour → fixed colour) */
  rowValueColor?: string;
  /** explicit colour for this entity's row name; blank = widget text colour
   *  at reduced opacity (the previous look) */
  rowNameColor?: string;
  /** scale multiplier for the entity row's icon, name and value (default 1) */
  rowScale?: number;
  /* ---- attention state, per entity ---- */
  /** watch an entity for the attention state; the icon recolours while it
   *  holds the active state (blank watch = the entity itself) */
  attentionOn?: boolean;
  /** watch this entity for the attention state (blank = the entity itself) */
  attentionEntity?: string;
  /** the state value that activates attention (blank = any state except off-ish) */
  attentionState?: string;
  /** icon colour while attention is active; blank = keep the normal icon colour */
  attentionColor?: string;
  /** show a status text while attention is active */
  attentionShowText?: boolean;
  /** what the status text shows: the watched state or custom text */
  attentionTextMode?: "state" | "custom";
  /** custom status text (used when attentionTextMode is custom) */
  attentionText?: string;
  /** justification of the status text at its anchor point */
  attentionTextAlign?: "left" | "center" | "right";
  /** horizontal anchor of the status text, 0-100 % of the widget width */
  attentionTextX?: number;
  /** vertical anchor of the status text, 0-100 % of the widget height */
  attentionTextY?: number;
  /** pulse the status text (like the notifications widget pulses a status card) */
  attentionTextPulse?: boolean;
}

/** Resolved attention state for one entity. */
export interface AttentionInfo {
  on: boolean;
  /** entity id watched for the attention state (blank = none) */
  watchId: string;
  /** attribute watched (entity@attr), null = the state itself */
  watchAttr: string | null;
  /** attention is active right now */
  active: boolean;
  /** raw state string of the watched entity (original case, "" = none) */
  stateText: string;
  /** icon colour while active (null = keep the normal icon colour) */
  color: string | null;
  showText: boolean;
  textMode: "state" | "custom";
  text: string;
  align: "left" | "center" | "right";
  x: number;
  y: number;
  pulse: boolean;
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

/** Centre unit position validation with fallback (config values are user input). */
export type CentreIconPos = "above" | "below";

/** Centre icon position: above the value (default) or below the block. */
export function normCentreIconPos(v: unknown): CentreIconPos {
  return String(v || "").trim().toLowerCase() === "below" ? "below" : "above";
}

export function normCentreUnitPos(v: unknown, d: CentreUnitPos = "below"): CentreUnitPos {
  return CENTRE_UNIT_POS.includes(v as CentreUnitPos) ? (v as CentreUnitPos) : d;
}

/** "#rrggbb" + alpha 0..1 -> "rgba(r,g,b,a)". Falls back to a neutral grey. */
export function hexA(hex: string, a: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(127,127,127,${a})`;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

/** left/centre/right validation with fallback (config values are user input). */
export function normAlign(v: unknown, d: "left" | "center" | "right"): "left" | "center" | "right" {
  return v === "left" || v === "center" || v === "right" ? v : d;
}

/** States that never count as "active" when no match state is configured. */
const ATTENTION_OFFISH = new Set(["off", "closed", "standby", "idle", "none", "unavailable", "unknown", ""]);

/**
 * Attention state (active-on-sensor) for one entity. Pure: given the entity's
 * config, its own id (blank watch = itself) and the live state dict, resolve
 * whether attention is active and everything the status text needs. While
 * active the icon takes attentionColor (null = keep its own colour).
 */
export function resolveAttention(
  a: EntityCfg,
  selfId: string,
  statesDict: Record<string, any>,
): AttentionInfo {
  const on = a.attentionOn === true;
  const watch = parseEntityRef(on ? a.attentionEntity || selfId || "" : "");
  const wSt = on && watch.id ? statesDict[watch.id] : null;
  const wRaw = wSt
    ? String(
        watch.attr
          ? wSt.attributes
            ? wSt.attributes[watch.attr]
            : ""
          : wSt.state,
      ).trim()
    : "";
  const wLower = wRaw.toLowerCase();
  const matchState = String(a.attentionState ?? "").trim().toLowerCase();
  const active =
    on &&
    wSt != null &&
    wRaw !== "" &&
    !BAD_STATES.has(wLower) &&
    (matchState ? wLower === matchState : !ATTENTION_OFFISH.has(wLower));
  return {
    on,
    watchId: watch.id,
    watchAttr: watch.attr,
    active,
    stateText: wRaw,
    color: a.attentionColor || null,
    showText: a.attentionShowText === true,
    textMode: a.attentionTextMode === "custom" ? "custom" : "state",
    text: String(a.attentionText ?? ""),
    align: normAlign(a.attentionTextAlign, "center"),
    x: clampNum(a.attentionTextX, 0, 100, 50),
    y: clampNum(a.attentionTextY, 0, 100, 50),
    pulse: a.attentionTextPulse !== false,
  };
}

/** Finite-number clamp with fallback (config values are user input). */
export function clampNum(v: unknown, min: number, max: number, d: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return d;
  return Math.min(max, Math.max(min, n));
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
 * (right), so the value ends up as the outermost element on either edge -
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
  /** resolved custom icon ("" = none, fall back to HA / emoji) */
  icon: string;
  /** resolved icon colour (null = inherit widget text colour) */
  iconColor: string | null;
  /** resolved explicit row value colour (null = automatic chain) */
  rowValueColor: string | null;
  /** resolved explicit row name colour (null = dimmed widget text) */
  rowNameColor: string | null;
  /** resolved row scale multiplier (icon + name + value) */
  rowScale: number;
  /** resolved attention state (active-on-sensor) */
  attention: AttentionInfo;
  /** icon colour in use right now: the attention colour while attention is
   *  active and one is picked, otherwise the entity's own icon colour */
  effectiveIconColor: string | null;
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
    /** per-item scale multipliers on top of centreScale (icon/value/unit) */
    centreIconScale: number;
    centreValueScale: number;
    centreUnitScale: number;
    /** vertical position of the centre icon, 0..100 (50 = its natural spot
     *  above the value; the ends shift half the gauge height) */
    centreIconY: number;
    /** vertical position of the centre value + unit block, 0..100 (50 =
     *  centred on the arc middle; the ends shift half the gauge height) */
    centreValueY: number;
    showTrack: boolean;
    /** track arc opacity, 0..1 (drawn only when showTrack) */
    trackOpacity: number;
    /** when true, the track arc follows the entity's gradient colours along
     *  the whole sweep (gradient/interpolated styles) instead of one solid
     *  track colour */
    trackGradient: boolean;
  },
): {
  cx: number;
  cy: number;
  r0: number;
  arcs: Arc[];
  ticks: { key: string; x1: number; y1: number; x2: number; y2: number }[];
  markers: { key: string; x: number; y: number; r: number; fill: string }[];
  centre: { valueText: string; unitText: string; colour: string | null; valuePx: number; unitPx: number; iconPx: number; iconDy: number; valueDy: number } | null;
  ringCount: number;
  /** stroke width of the outermost drawn ring (for the rows anchor) */
  outerThick: number;
  /** y of the arc ends' lower edge: entity rows below the gauge anchor here
   *  so offset 0 = snug against the horseshoe, not the tile bottom */
  rowsTopY: number;
} {
  const { w, h } = P;
  const sweep = Math.max(1, Math.min(360, P.sweep));
  const startDeg = 180 + (360 - sweep) / 2; // gap centred at the bottom

  const pad = 6;
  const tickLen = P.showTicks ? Math.max(3, (Math.min(w, h) / 2) * (P.tickSize / 100)) : 0;

  // Stack rings from the outside in. Rings with neither horseshoe nor marker
  // are invisible and don't consume radial space.
  const radial = P.rings.filter(
    (ring) => ring.showRing || (ring.showMarker && ring.value != null),
  );

  // The outermost drawn ring's stroke extends r0 + thick/2 from the centre, so
  // half of it is reserved up front: the arc never crops off the widget while
  // the content offsets are 0. (Offsets != 0 can still push it out - that is
  // the user's explicit nudge.)
  const rBase = Math.max(10, Math.min(w, h) / 2 - pad - (tickLen > 0 ? tickLen + 2 : 0));
  const outerPct = radial.length
    ? (radial[0].thicknessPct != null ? radial[0].thicknessPct : P.ringWidthPct)
    : P.ringWidthPct;
  const outerThick = Math.max(4, rBase * (Math.min(100, Math.max(4, outerPct)) / 100));
  const r0 = Math.max(10, rBase - outerThick / 2);

  const geoms: { ring: ResolvedRing; r: number; thick: number }[] = [];
  let r = r0;
  for (const ring of radial) {
    const thick = Math.max(4, r0 * ((ring.thicknessPct != null ? ring.thicknessPct : P.ringWidthPct) / 100));
    if (r - thick / 2 <= 2) break; // no room left - stop stacking
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
      // full track: the shaded remainder of the scale behind the progress
      if (P.showTrack) {
        // when trackGradient is on and the ring uses a smooth colour scale,
        // the whole sweep is painted as the gradient itself (thin slices,
        // same interpolation as the progress arc) at the track's opacity;
        // otherwise it is one solid track-colour arc.
        const rgbStops = stopsToRgb(ring.stopsList);
        const smoothScale =
          P.trackGradient &&
          (ring.style === "gradient" || ring.style === "interpolated") &&
          rgbStops.length > 1;
        if (smoothScale) {
          const N = 64;
          for (let s = 0; s < N; s++) {
            const f1 = (s + 1) / N;
            const a0 = startDeg + sweep * (s / N);
            const a1 = startDeg + sweep * f1;
            const v1 = ring.min + (ring.max - ring.min) * f1;
            const c1 = lerpStops(rgbStops, v1);
            arcs.push({
              key: `trackgrad-${ring.idx}-${s}`,
              d: arcPath(P.cx, P.cy, rr, a0, a1),
              fill: c1 ? rgbStr(c1) : P.trackColor,
              opacity: P.trackOpacity,
              strokeWidth: thick,
            });
          }
        } else {
          arcs.push({
            key: "track-" + ring.idx,
            d: arcPath(P.cx, P.cy, rr, startDeg, startDeg + sweep),
            fill: P.trackColor,
            opacity: P.trackOpacity,
            strokeWidth: thick,
          });
        }
      }

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
  let centre: { valueText: string; unitText: string; colour: string | null; valuePx: number; unitPx: number; iconPx: number; iconDy: number; valueDy: number } | null =
    null;
  const cIdx = Math.max(0, Math.min(1, Math.round(P.centreEntity)));
  const cRing = P.rings[cIdx] ?? P.rings[0];
  if (P.showCentre && cRing) {
    const v = cRing.value;
    const has = v != null;
    const c = has ? valueColour(cRing, v as number) : null;
    // The master scale (centreScale) sizes the whole block; the per-item
    // scales multiply on top of it (all default 1 = the previous look).
    // The icon follows the master scale only, never the value's own scale.
    const masterValuePx = Math.max(10, Math.min(72, innerR * 0.62)) * P.centreScale;
    centre = {
      valueText: has ? (v as number).toFixed(cRing.decimals) : "-",
      unitText: P.centreShowUnit && cRing.showUnit ? cRing.unit : "",
      colour: c,
      valuePx: masterValuePx * P.centreValueScale,
      unitPx: Math.max(8, Math.min(28, innerR * 0.26)) * P.centreScale * P.centreUnitScale,
      iconPx: Math.max(10, Math.min(30, masterValuePx * 0.38)) * P.centreIconScale,
      // 50 = the natural spot above the value; 0 / 100 slide the icon
      // half the gauge height up / down (relative shift, layout intact)
      iconDy: ((P.centreIconY - 50) / 100) * P.h,
      // centreValueY shifts the value + unit block together the same way;
      // the icon above is unaffected (it has its own slider)
      valueDy: ((P.centreValueY - 50) / 100) * P.h,
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

  // Where the entity rows anchor when they sit below the gauge: the lower
  // edge of the arc ends. The horseshoe gap is centred at the bottom, so the
  // ends sit cos(halfGap) below the centre (clamped to the centre line for
  // small sweeps, where the ends rise above it).
  const halfGapDeg = (360 - sweep) / 2;
  const arcEndY = P.cy + r0 * Math.cos((halfGapDeg * Math.PI) / 180);
  const rowsTopY = Math.max(arcEndY, P.cy) + (geoms.length ? geoms[0].thick : 0) / 2 + 2;

  return {
    cx: P.cx,
    cy: P.cy,
    r0,
    arcs,
    ticks,
    markers,
    centre,
    ringCount: geoms.length,
    outerThick: geoms.length ? geoms[0].thick : 0,
    rowsTopY,
  };
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

/** Icon content for one entity: custom picker icon first (same selector as the
 *  Sensor widget), then the icon Home Assistant provides (attributes.icon),
 *  then the emoji keyword fallback. Rendered via the shared <Icon> so mdi ids
 *  display natively instead of being keyword-mapped to an emoji. */
function iconNode(cfgIcon: string, st: any, entityId: string): ReactElement {
  const custom = (cfgIcon || "").trim();
  if (custom) return <Icon icon={custom} />;
  const attr = String(st?.attributes?.icon || "").trim();
  if (attr) return <Icon icon={attr} />;
  return <>{iconFor(st, entityId)}</>;
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
  // whenever any of those three visibility flags is on - there is no global
  // "show rows" toggle any more. The legacy global keys (showEntityList,
  // showEntityName, showIcons, valuePlacement) are honoured as per-entity
  // fallbacks during resolution. Only the rows-above/below choice stays here.
  const entityListPosition = config?.entityListPosition === "above" ? "above" : "below";

  // Big centre value
  const showCentreValue = config?.showCentreValue !== false;
  const centreEntity = Number(config?.centreEntity) === 1 ? 1 : 0;
  const showCentreIcon = config?.showCentreIcon === true;
  const centreShowUnit = config?.centreShowUnit !== false;
  // Unit placement around the big centre value: below/above stack it; before/
  // after set it inline beside the value. centreUnitOffset (em) fine-tunes the
  // unit's vertical position relative to the value row in every mode.
  const centreUnitPos = normCentreUnitPos(config?.centreUnitPosition, "below");
  const centreUnitOffset = clampNum(config?.centreUnitOffset, -2, 2, 0);
  const unitDy = -centreUnitOffset; // positive offset = raised (CSS top goes negative)

  // Centre icon justification (left/centre/right around the value block) and
  // where the centre value's colour comes from: the value colour along the
  // arc/gradient (default) or the widget's default text colour.
  const centreIconAlign = normAlign(config?.centreIconAlign, "center");
  const centreIconPos = normCentreIconPos(config?.centreIconPos);
  const centreColourMode = config?.centreColourMode === "text" ? "text" : "value";

  // Per-item centre scales (0.1-3, default 1) multiply on top of the master
  // centreScale; centreIconY (0-100, default 50) slides the icon vertically
  // the same way the attention status text slider moves its text.
  const centreIconScale = clampNum(config?.centreIconScale, 0.1, 3, 1);
  const centreValueScale = clampNum(config?.centreValueScale, 0.1, 3, 1);
  const centreUnitScale = clampNum(config?.centreUnitScale, 0.1, 3, 1);
  const centreIconY = clampNum(config?.centreIconY, 0, 100, 50);
  const centreValueY = clampNum(config?.centreValueY, 0, 100, 50);

  // Whole-widget content fine-tune: nudges everything the widget draws
  // (title, rows, gauge) in pixels, inside the tile.
  const contentOffsetX = clampNum(config?.contentOffsetX, -100, 100, 0);
  const contentOffsetY = clampNum(config?.contentOffsetY, -100, 100, 0);

  // The shaded remainder of the scale behind the progress arc.
  const showTrack = config?.showTrack !== false;
  const trackOpacity = clampNum(config?.trackOpacity, 0, 100, 38) / 100;
  const trackGradient = config?.trackGradient === true;

  const ents: EntityCfg[] = Array.isArray(config?.entities)
    ? (config.entities as EntityCfg[]).slice(0, 2)
    : [];
  // Legacy configs stored ring defs separately from entity rows.
  const legacyRings: LegacyRingDef[] =
    ents.length === 0 && Array.isArray(config?.rings) ? (config.rings as LegacyRingDef[]) : [];

  // entity ids for the shared HA stream (rows + rings + attention watches)
  const ids = useMemo(() => {
    const set = new Set<string>();
    for (const e of ents) {
      const { id } = parseEntityRef(e.entityId || "");
      if (id) set.add(id);
      // attention watches its own entity (blank = the entity itself)
      if ((e as EntityCfg).attentionOn === true) {
        const w = parseEntityRef((e as EntityCfg).attentionEntity || e.entityId || "");
        if (w.id) set.add(w.id);
      }
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
  // equality guard - the early-return trap: early-return states render
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
      const rawIcon = (e as EntityCfg).icon;
      const iconCfg = typeof rawIcon === "string" ? rawIcon : "";

      /* ---- attention state (active-on-sensor), per entity ---- */
      const a = e as EntityCfg;
      const attention = resolveAttention(a, id, statesDict);
      const effectiveIconColor =
        attention.active && attention.color ? attention.color : (a.iconColor || null);
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
        thicknessPct:
          isFinite(Number(e.thicknessPct)) && Number(e.thicknessPct) > 0
            ? Math.min(60, Number(e.thicknessPct))
            : null,
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
        icon: iconCfg.trim(),
        iconColor: (e as EntityCfg).iconColor || null,
        rowValueColor: (e as EntityCfg).rowValueColor || null,
        rowNameColor: (e as EntityCfg).rowNameColor || null,
        rowScale: clampNum((e as EntityCfg).rowScale, 0.5, 2, 1),
        attention,
        effectiveIconColor,
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
      centreIconScale,
      centreValueScale,
      centreUnitScale,
      centreIconY,
      centreValueY,
      showTrack,
      trackOpacity,
      trackGradient,
    });
  }, [size, resolvedRings, sweep, ringWidthPct, ringGapPct, trackColor, fixedColor, showTicks, tickCount, tickSize, markerColor, showCentreValue, centreEntity, centreShowUnit, centreScale, centreIconScale, centreValueScale, centreUnitScale, centreIconY, centreValueY, showTrack, trackOpacity, trackGradient]);

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
  const centreIcon = showCentreIcon && cRing ? iconNode(cRing.icon, statesDict[cRing.id], cRing.id) : null;
  // Centre value colour: the value's colour along the arc/gradient (default),
  // or the widget's default text colour. Both modes fall back through the
  // Text & colour tab colour (config.color) before the theme text colour.
  const centreValueColour =
    centreColourMode === "text"
      ? config?.color || textMain
      : L?.centre?.colour || config?.color || textMain;

  /* ---- entity rows ---- */

  // Per-entity rows: show each entity's row when any of its icon/name/value
  // flags is on. entityListOffset (em) moves the row block relative to the
  // arc: positive pushes it further away, negative pulls it closer (can
  // overlap the horseshoe).
  const rowRings = resolvedRings.filter((r) => r.showRowIcon || r.showRowName || r.showRowValue);
  const entityListOffset = clampNum(config?.entityListOffset, -3, 3, 0);

  // Rows BELOW the gauge anchor at the arc ends (L.rowsTopY), so offset 0
  // sits the rows snug under the horseshoe - not 3 em lower at the tile
  // bottom. Rows ABOVE keep the flow layout: they already sit at 0 em
  // against the top of the arc. While the gauge has no measured layout yet
  // (!L) the rows fall back to the flow layout.
  const rowsOverlayBelow = entityListPosition === "below" && !!L && rowRings.length > 0;
  const listEl = rowRings.length > 0 ? (
    <div
      style={
        rowsOverlayBelow
          ? {
              position: "absolute",
              left: 0,
              right: 0,
              top: `${L!.rowsTopY}px`,
              transform: entityListOffset !== 0 ? `translateY(${entityListOffset}em)` : undefined,
              padding: "0.15em 0.7em 0",
              maxHeight: "45%",
              overflow: "hidden",
              pointerEvents: "none",
            }
          : {
              flex: "0 0 auto",
              padding: "0.2em 0.7em 0.35em",
              ...(entityListPosition === "above" && entityListOffset !== 0
                ? { marginBottom: `${entityListOffset}em` }
                : {}),
              maxHeight: "45%",
              overflow: "hidden",
            }
      }
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
            : "-";

        const valEl = r.showRowValue ? (
          <span
            style={{
              fontSize: `${0.68 * r.rowScale}em`,
              fontWeight: 700,
              // explicit per-entity colour wins; otherwise the automatic
              // chain (entity colour → value colour → fixed colour)
              color: r.rowValueColor || dotColour,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            {valText}
          </span>
        ) : null;
        const nameEl = r.showRowName ? (
          <span
            style={{
              fontSize: `${0.62 * r.rowScale}em`,
              // explicit colour renders exactly as picked; without one the
              // name stays the dimmed (0.75) widget text of the old look
              ...(r.rowNameColor ? { color: r.rowNameColor } : { opacity: 0.75 }),
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
          // alignSelf center: the row aligns items on the text baseline, and a
          // flex item that is itself a flex container falls back to its bottom
          // margin edge there - which parked the whole icon above the baseline,
          // visibly raised. Centring it on the row's cross axis lines it up
          // with the text/value instead. lineHeight 1 keeps the emoji fallback
          // from inheriting the row's 1.5 line-height and stretching the row.
          <span
            style={{
              fontSize: `${0.95 * r.rowScale}em`,
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              alignSelf: "center",
              lineHeight: 1,
              // MDI/Lucide icons draw with currentColor, so colouring the
              // span colours the glyph; emoji glyphs simply ignore it.
              // Attention active + a picked colour overrides the icon's own.
              ...(r.effectiveIconColor ? { color: r.effectiveIconColor } : {}),
            }}
          >
            {iconNode(r.icon, st, r.id)}
          </span>
        ) : null;

        /* Row layout: [far-left zone] [name cluster, rowAlign] [far-right
         * zone] - pure logic lives in buildRowZones, this maps slots to the
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

  /* ---- attention status texts (one per active entity) ---- */

  const attentionEls = resolvedRings
    .map((r) => {
      const a = r.attention;
      if (!a.on || !a.active || !a.showText) return null;
      const text = (a.textMode === "custom" ? a.text : a.stateText).trim();
      if (!text) return null;
      const transform =
        a.align === "left"
          ? "translate(0, -50%)"
          : a.align === "right"
            ? "translate(-100%, -50%)"
            : "translate(-50%, -50%)";
      return (
        <div
          key={"attn-" + r.id + (r.attr ? "@" + r.attr : "")}
          style={{
            position: "absolute",
            left: `${a.x}%`,
            top: `${a.y}%`,
            transform,
            fontSize: "0.7em",
            fontWeight: 700,
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            // the attention colour tints the text and its pill; without one
            // both fall back to the widget text colour / a neutral tint
            color: a.color || "inherit",
            backgroundColor: a.color ? hexA(a.color, 0.22) : "rgba(127,127,127,0.25)",
            padding: "0.22em 0.55em",
            borderRadius: "0.6em",
            // pulse like the notifications widget pulses a status card
            animation: a.pulse ? "mf-status-alert 2.4s ease-in-out infinite" : undefined,
          }}
        >
          {text}
        </div>
      );
    })
    .filter(Boolean);

  const attentionOverlay =
    attentionEls.length > 0 ? (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {attentionEls}
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
              {centreIcon && centreIconPos === "above" ? (
                <div
                  style={{
                    fontSize: `${L.centre.iconPx}px`,
                    marginBottom: "0.15em",
                    // centreIconY slider: 50 = the natural spot above the
                    // value; the ends slide the icon half the gauge height.
                    // Relative shift only - the value/unit layout stays put.
                    position: "relative",
                    top: `${L.centre.iconDy}px`,
                    // the entity's icon colour applies here too (MDI/Lucide),
                    // the attention colour overriding it while active
                    ...(cRing?.effectiveIconColor ? { color: cRing.effectiveIconColor } : {}),
                    // justify the icon left/centre/right within the value block
                    display: "flex",
                    justifyContent:
                      centreIconAlign === "left"
                        ? "flex-start"
                        : centreIconAlign === "right"
                          ? "flex-end"
                          : "center",
                  }}
                >
                  {centreIcon}
                </div>
              ) : null}
              {/* centreValueY slider: one vertical shift for the value +
                  unit block; the icon keeps its own centreIconY slider */}
              <div style={{ position: "relative", top: `${L.centre.valueDy}px` }}>
              {centreUnitPos === "above" && L.centre.unitText ? (
                <div style={{ fontSize: `${L.centre.unitPx}px`, opacity: 0.65, marginBottom: "0.08em", position: "relative", top: `${unitDy}em` }}>{L.centre.unitText}</div>
              ) : null}
              {centreUnitPos === "before" || centreUnitPos === "after" ? (
                <>
                  {centreUnitPos === "before" && L.centre.unitText ? (
                    <span style={{ fontSize: `${L.centre.unitPx}px`, opacity: 0.65, fontWeight: 600, position: "relative", top: `${unitDy}em`, marginRight: "0.06em" }}>
                      {L.centre.unitText}
                    </span>
                  ) : null}
                  <span style={{ fontSize: `${L.centre.valuePx}px`, fontWeight: 700, color: centreValueColour }}>
                    {L.centre.valueText}
                  </span>
                  {centreUnitPos === "after" && L.centre.unitText ? (
                    <span style={{ fontSize: `${L.centre.unitPx}px`, opacity: 0.65, fontWeight: 600, position: "relative", top: `${unitDy}em`, marginLeft: "0.06em" }}>
                      {L.centre.unitText}
                    </span>
                  ) : null}
                </>
              ) : (
                <div style={{ fontSize: `${L.centre.valuePx}px`, fontWeight: 700, color: centreValueColour }}>
                  {L.centre.valueText}
                </div>
              )}
              {centreUnitPos === "below" && L.centre.unitText ? (
                <div style={{ fontSize: `${L.centre.unitPx}px`, opacity: 0.65, position: "relative", top: `${unitDy}em` }}>{L.centre.unitText}</div>
              ) : null}
              </div>
              {/* same icon, drawn under the value + unit block instead; the
                  centreIconY slider and justification apply identically */}
              {centreIcon && centreIconPos === "below" ? (
                <div
                  style={{
                    fontSize: `${L.centre.iconPx}px`,
                    marginTop: "0.15em",
                    position: "relative",
                    top: `${L.centre.iconDy}px`,
                    ...(cRing?.effectiveIconColor ? { color: cRing.effectiveIconColor } : {}),
                    display: "flex",
                    justifyContent:
                      centreIconAlign === "left"
                        ? "flex-start"
                        : centreIconAlign === "right"
                          ? "flex-end"
                          : "center",
                  }}
                >
                  {centreIcon}
                </div>
              ) : null}
            </div>
          ) : null}
          {rowsOverlayBelow ? listEl : null}
          {!connected ? (
            <div style={{ position: "absolute", right: 6, top: 4, fontSize: "0.55em", opacity: 0.5 }}>offline</div>
          ) : null}
        </>
      )}
    </div>
  );

  // Compose the tile: title top/bottom, entity rows above/below the gauge.
  // Rows below the gauge render as an overlay INSIDE the gauge box (anchored
  // at the arc ends - see listEl), so they no longer consume flex height and
  // the arc keeps the full tile. Rows above keep the flow layout.
  const children: ReactElement[] = [];
  if (titleEl && titlePosition === "top") children.push(titleEl);
  if (listEl && entityListPosition === "above") children.push(listEl);
  children.push(gaugeBox);
  if (listEl && !rowsOverlayBelow) children.push(listEl);
  if (titleEl && titlePosition === "bottom") children.push(titleEl);

  return (
    // Honours the shared Text & colour tab: the view wrapper sets config.color
    // on the tile, but hard-setting textMain here would stomp it - the title
    // (and everything inheriting the root) would ignore the user's colour.
    // textMain stays as the fallback for tiles with no colour configured.
    // contentOffsetX/Y fine-tune everything this widget draws, in pixels;
    // attentionOverlay floats the status texts anywhere over the tile.
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        color: config?.color || textMain,
        ...(contentOffsetX !== 0 || contentOffsetY !== 0
          ? { transform: `translate(${contentOffsetX}px, ${contentOffsetY}px)` }
          : {}),
      }}
    >
      {children}
      {attentionOverlay}
    </div>
  );
}

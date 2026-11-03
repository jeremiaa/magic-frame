"use client";

import { useEffect, useLayoutEffect, useState, useRef, useMemo } from "react";
import { useGlassStyle } from "@/lib/ui/glass";

/* ------------------------------------------------------------------ */
/* Pure helpers - module scope, no hooks, no React.                    */
/* ------------------------------------------------------------------ */

const BAD_STATES = new Set(["unavailable", "unknown", "none", ""]);

export function toWatts(st: any): number | null {
  if (!st) return null;
  const raw = String(st.state ?? "").trim().toLowerCase();
  if (BAD_STATES.has(raw)) return null;
  const v = parseFloat(raw);
  if (!isFinite(v)) return null;
  const unit = String(st.attributes?.unit_of_measurement || "W").trim().toUpperCase();
  if (unit === "KW") return v * 1000;
  if (unit === "MW") return v * 1e6;
  if (unit === "GW") return v * 1e9;
  return v;
}

export function toPercent(st: any): number | null {
  if (!st) return null;
  const raw = String(st.state ?? "").trim().toLowerCase();
  if (BAD_STATES.has(raw)) return null;
  const v = parseFloat(raw);
  if (!isFinite(v)) return null;
  const unit = String(st.attributes?.unit_of_measurement || "").trim();
  let p: number = v;
  if (unit !== "%" && v >= 0 && v <= 1) p = v * 100;
  return Math.max(0, Math.min(100, p));
}

function fmtW(w: number): string {
  const a = Math.abs(w);
  if (a < 1000) return `${Math.round(w)} W`;
  const kW = w / 1000;
  if (a < 10000) return `${kW.toFixed(1)} kW`;
  return `${Math.round(kW)} kW`;
}

function friendlyName(st: any, fallback: string): string {
  return st?.attributes?.friendly_name || fallback;
}

const ICON_KEYWORDS: [RegExp, string][] = [
  [/battery/, "🔋"],
  [/solar|sun/, "☀️"],
  [/transmission|tower|grid|meter/, "⚡"],
  [/power-plug|socket|plug/, "🔌"],
  [/air-?cond|aircond|cool/, "❄️"],
  [/heat-pump|heater|heat/, "🌡️"],
  [/\bev\b|ev-?station|car|vehicle/, "🚗"],
  [/oven|cook|stove/, "🔥"],
  [/fridge|freezer/, "🧊"],
  [/wash/, "👕"],
  [/tumble|dryer|dry-/, "🧺"],
  [/dish/, "🍽️"],
  [/tv|television/, "📺"],
  [/light|lamp|bulb/, "💡"],
  [/water|pump|shower/, "💧"],
  [/pool/, "🏊"],
  [/server|compute|desktop|\bpc\b/, "💻"],
  [/kettle|coffee/, "☕"],
  [/microwave/, "🍳"],
  [/speaker|audio|music|entertain/, "🔊"],
  [/fan/, "🌀"],
  [/home|house/, "🏠"],
];

function iconFor(st: any, entityId: string, fallback?: string): string | null {
  const iconAttr = String(st?.attributes?.icon || "");
  const hay = (iconAttr + " " + (entityId || "")).toLowerCase();
  for (const [re, emoji] of ICON_KEYWORDS) {
    if (re.test(hay)) return emoji;
  }
  return fallback ?? null;
}

function bandPath(x1: number, y0a: number, y1a: number, x2: number, y0b: number, y1b: number): string {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y0a} C ${cx} ${y0a}, ${cx} ${y0b}, ${x2} ${y0b} L ${x2} ${y1b} C ${cx} ${y1b}, ${cx} ${y1a}, ${x1} ${y1a} Z`;
}

/* ------------------------------------------------------------------ */
/* Overlap resolver - forward+backward+forward pass                    */
/* ------------------------------------------------------------------ */

function resolveOverlaps(centres: number[], heights: number[], top: number, bottom: number, gap: number): number[] {
  const ys = centres.map((c, i) => c - heights[i] / 2);
  const n = ys.length;
  for (let i = 0; i < n; i++) {
    const minTop = i === 0 ? top : ys[i - 1] + heights[i - 1] + gap;
    if (ys[i] < minTop) ys[i] = minTop;
  }
  for (let i = n - 1; i >= 0; i--) {
    const maxTop = (i === n - 1 ? bottom : ys[i + 1] - gap - heights[i + 1]) - heights[i];
    if (ys[i] > maxTop) ys[i] = maxTop;
  }
  for (let i = 0; i < n; i++) {
    const minTop = i === 0 ? top : ys[i - 1] + heights[i - 1] + gap;
    if (ys[i] < minTop) ys[i] = minTop;
  }
  return ys;
}

/**
 * Position a side's node bars so the WHOLE stack fits [top, bottom].
 * resolveOverlaps only ever pushes nodes apart, so a side with many
 * small flows (MIN_NODE inflation) stacks taller than the box and the
 * tail renders past the bottom edge, where the svg silently clips it.
 * Here the heights and the gap shrink by one factor first, then the
 * overlap resolution places a stack that is guaranteed to fit.
 */
function fitSide(
  nodes: { centre: number; h: number; top: number }[],
  top: number,
  bottom: number,
  gap: number,
) {
  const n = nodes.length;
  if (!n) return;
  const availH = bottom - top;
  let hs = nodes.map((x) => x.h);
  let g = gap;
  const needed = hs.reduce((a, b) => a + b, 0) + (n - 1) * g;
  if (needed > availH && needed > 0) {
    const f = availH / needed;
    hs = hs.map((h) => Math.max(2, h * f));
    g = Math.max(2, g * f);
  }
  const ys = resolveOverlaps(
    nodes.map((x) => x.centre),
    hs,
    top,
    bottom,
    g,
  );
  nodes.forEach((node, i) => {
    node.h = hs[i];
    node.top = ys[i];
  });
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface FlowDef {
  entityId: string;
  label?: string;
  color?: string;
  type: "grid" | "solar" | "battery" | "consumer";
  /** Battery flows only: a second entity holding the battery level (% or 0-1). */
  levelId?: string;
  /** Grid and battery flows: flip the sensor's sign convention. */
  invert?: boolean;
  /** Grid flows: the export band colour (import band uses `color`). */
  exportColor?: string;
  /** Battery flows: the charge band colour (discharge band uses `color`). */
  chargeColor?: string;
  /** Name / value label colours on this flow's node. */
  nameColor?: string;
  valueColor?: string;
}

interface Sized { w: number; h: number }

interface ComputedFlow {
  gi: number; ge: number; solar: number; bd: number; bc: number;
  battLevel: number | null; homeLoad: number; cons: ConsumerFlow[];
  otherV: number; hasGrid: boolean; hasBattery: boolean;
}

interface ConsumerFlow {
  entityId: string; label: string; colour: string; v: number;
}

interface SrcNode {
  key: string; colour: string; h: number; centre: number;
  flows: { import: [number, number] | null; export: [number, number] | null };
  top: number;
}

interface ConNode {
  key: string; label: string; v: number; colour: string; entityId?: string;
  h: number; centre: number; top: number; isGridExport?: boolean;
  /** Battery charging node: drawn on the right, fed by the Home bar. */
  isBattCharge?: boolean;
}

interface Bar { key: string; x: number; y: number; h: number; colour: string; }

interface Band { key: string; d: string; colour: string; }

interface LabelLine { text: string; big?: boolean; scale?: number; style?: React.CSSProperties; }

interface LabelPx { w: number; h: number }

interface Layout {
  bands: Band[]; nodeBars: Bar[];
  leftBarX: number; homeBarX: number; rightBarX: number; bw: number;
  srcNodes: SrcNode[]; conNodes: ConNode[]; gridOnRight: boolean;
  home: { x: number; y: number; h: number; cx: number }; contentH: number;
  /** Per-node label text scale (1 = full size): each label pair is scaled to
   * fit the vertical slot between its node and the next, so a tall stack
   * shrinks its labels instead of cropping them. */
  srcLabelScale: number[]; conLabelScale: number[];
}

/* ------------------------------------------------------------------ */
/* Layout engine                                                        */
/* ------------------------------------------------------------------ */

export function computeLayout(
  size: Sized,
  C: Record<string, string>,
  F: ComputedFlow,
  otherLabel: string,
  homeLabel: string,
  gridId: string,
  /**
   * Measured label text per side: w = widest line in px (sizes the side
   * gutters so responsive fonts never crop), h = tallest stacked label
   * pair in px at full scale (drives the per-node label scale so a tall
   * stack shrinks labels instead of cropping them). Null until the probe
   * has measured once - the fixed-formula fallbacks then apply.
   */
  labelPx?: { src: LabelPx; con: LabelPx } | null,
): Layout | null {
  const { w, h } = size;
  const MIN_BAND = 2;
  const NODE_GAP = 8;
  const MIN_NODE = 12;
  const gridOnRight = F.ge > 0;

  const pad = 8;
  const bw = Math.max(5, Math.min(12, w * 0.012));
  // Per-side budget: both gutters plus the three bars must fit the box,
  // or the bars would cross in the middle.
  const fitMax = Math.max(24, (w - 2 * pad - 3 * bw) / 2);
  const fallbackSpace = Math.min(
    Math.max(w * 0.22, 70),
    150,
    Math.max(20, (w - 2 * pad - 6 * bw) / 2),
  );
  const labelSpaceL = labelPx
    ? Math.min(Math.max(labelPx.src.w + 8, 40), Math.max(40, fitMax))
    : fallbackSpace;
  const labelSpaceR = labelPx
    ? Math.min(Math.max(labelPx.con.w + 8, 40), Math.max(40, fitMax))
    : fallbackSpace;
  const leftBarX = pad + labelSpaceL;
  const homeBarX = w / 2 - bw / 2;
  const rightBarX = w - pad - labelSpaceR - bw;
  const contentTop = pad;
  const contentBottom = h - pad;
  const contentH = contentBottom - contentTop;

  const leftW = F.gi + F.solar + F.bd;
  const rightW =
    (gridOnRight ? F.ge : 0) +
    (F.hasBattery ? F.bc : 0) +
    F.cons.reduce((a, c) => a + c.v, 0) +
    F.otherV;
  const maxFlow = Math.max(leftW, rightW, 1);
  const s = (contentH - 30) / maxFlow;
  const th = (v: number) => (v > 0 ? Math.max(v * s, MIN_BAND) : 0);

  // Discharge feeds the Home bar from the left; charging pulls FROM the
  // Home bar on the right, exactly like a consumer. A battery doing both
  // at once (AC-coupled bypass) shows on both sides.
  const homeLeftFlows = [
    { v: F.gi, c: C.import, k: "grid-in" },
    { v: F.solar, c: C.solar, k: "solar" },
    { v: F.bd, c: C.battOut, k: "batt-out" },
  ].filter((f) => f.v > 0);

  const homeRightFlows = [
    ...(gridOnRight ? [{ v: F.ge, c: C.export, k: "grid-out" }] : []),
    ...(F.hasBattery && F.bc > 0 ? [{ v: F.bc, c: C.battIn, k: "battery-charge" }] : []),
    ...F.cons.map((c, i) => ({ v: c.v, c: c.colour, k: "con" + i })),
    ...(F.otherV > 0 ? [{ v: F.otherV, c: C.consumer, k: "other" }] : []),
  ];

  const leftSum = homeLeftFlows.reduce((a, f) => a + th(f.v), 0);
  const rightSum = homeRightFlows.reduce((a, f) => a + th(f.v), 0);
  const homeH = Math.max(leftSum, rightSum, MIN_NODE);
  const homeTop = contentTop + (contentH - homeH) / 2;

  const attachL: Record<string, [number, number]> = {};
  let y = homeTop;
  for (const f of homeLeftFlows) {
    const t = th(f.v);
    attachL[f.k] = [y, y + t];
    y += t;
  }
  const attachR: Record<string, [number, number]> = {};
  y = homeTop;
  for (const f of homeRightFlows) {
    const t = th(f.v);
    attachR[f.k] = [y, y + t];
    y += t;
  }

  const midOf = (r: [number, number] | null): number | null => (r ? (r[0] + r[1]) / 2 : null);

  const srcNodes: SrcNode[] = [];
  if (F.hasGrid && F.gi > 0 && !gridOnRight) {
    const giR = attachL["grid-in"];
    srcNodes.push({
      key: "grid",
      colour: C.import,
      h: Math.max(th(F.gi), MIN_NODE),
      centre: midOf(giR) ?? contentTop + contentH * 0.2,
      flows: { import: giR ?? null, export: null },
      top: 0,
    });
  }
  if (F.solar > 0) {
    srcNodes.push({
      key: "solar",
      colour: C.solar,
      h: Math.max(th(F.solar), MIN_NODE),
      centre: midOf(attachL["solar"])!,
      flows: { import: attachL["solar"] ?? null, export: null },
      top: 0,
    });
  }
  if (F.hasBattery && F.bd > 0) {
    const bdR = attachL["batt-out"];
    srcNodes.push({
      key: "battery",
      colour: C.battOut,
      h: Math.max(th(F.bd), MIN_NODE),
      centre: midOf(bdR) ?? contentTop + contentH * 0.8,
      flows: { import: bdR ?? null, export: null },
      top: 0,
    });
  }

  fitSide(srcNodes, contentTop, contentBottom, NODE_GAP);

  const conNodes: ConNode[] = [];
  if (gridOnRight) {
    conNodes.push({
      key: "grid-out",
      label: "Grid",
      v: F.ge,
      colour: C.export,
      entityId: gridId,
      h: Math.max(th(F.ge), MIN_NODE),
      centre: midOf(attachR["grid-out"])!,
      top: 0,
      isGridExport: true,
    });
  }
  if (F.hasBattery && F.bc > 0) {
    conNodes.push({
      key: "battery-charge",
      label: "Battery",
      v: F.bc,
      colour: C.battIn,
      h: Math.max(th(F.bc), MIN_NODE),
      centre: midOf(attachR["battery-charge"])!,
      top: 0,
      isBattCharge: true,
    });
  }
  for (let i = 0; i < F.cons.length; i++) {
    const c = F.cons[i];
    if (c.v <= 0) continue;
    conNodes.push({
      key: "con" + i,
      label: c.label,
      v: c.v,
      colour: c.colour,
      entityId: c.entityId,
      h: Math.max(th(c.v), MIN_NODE),
      centre: midOf(attachR["con" + i])!,
      top: 0,
    });
  }
  if (F.otherV > 0) {
    conNodes.push({
      key: "other",
      label: otherLabel,
      v: F.otherV,
      colour: C.consumer,
      h: Math.max(th(F.otherV), MIN_NODE),
      centre: midOf(attachR["other"])!,
      top: 0,
    });
  }
  fitSide(conNodes, contentTop, contentBottom, NODE_GAP);

  // Per-node label slots and scales: a label pair must fit the vertical
  // space between its node and the next (or the box bottom), or a tall
  // stack would crop its labels. The measured pair height sizes the text.
  const slotOf = (nodes: { top: number }[], i: number) =>
    i < nodes.length - 1 ? nodes[i + 1].top - nodes[i].top : contentBottom - nodes[i].top;
  const clampS = (v: number) => Math.max(0.45, Math.min(1, v));
  const srcLabelScale = srcNodes.map((_, i) =>
    labelPx && labelPx.src.h > 0 ? clampS(slotOf(srcNodes, i) / labelPx.src.h) : 1);
  const conLabelScale = conNodes.map((_, i) =>
    labelPx && labelPx.con.h > 0 ? clampS(slotOf(conNodes, i) / labelPx.con.h) : 1);

  const bands: Band[] = [];
  for (const n of srcNodes) {
    if (n.flows.import) {
      const [hy0, hy1] = n.flows.import;
      bands.push({
        key: n.key + "-in",
        d: bandPath(leftBarX + bw, n.top, n.top + n.h, homeBarX, hy0, hy1),
        colour: n.key === "grid" ? C.import : n.key === "solar" ? C.solar : C.battOut,
      });
    }
  }
  for (const n of conNodes) {
    const [hy0, hy1] = attachR[n.key];
    bands.push({
      key: n.key + "-band",
      d: bandPath(homeBarX + bw, hy0, hy1, rightBarX, n.top, n.top + n.h),
      colour: n.colour,
    });
  }

  return {
    bands,
    nodeBars: [
      ...srcNodes.map((n) => ({ key: n.key, x: leftBarX, y: n.top, h: n.h, colour: n.colour })),
      { key: "home", x: homeBarX, y: homeTop, h: homeH, colour: C.home || "#ffffff" },
      ...conNodes.map((n) => ({ key: n.key, x: rightBarX, y: n.top, h: n.h, colour: n.colour })),
    ],
    leftBarX, homeBarX, rightBarX, bw,
    srcNodes, conNodes, gridOnRight,
    home: { x: homeBarX, y: homeTop, h: homeH, cx: homeBarX + bw / 2 },
    contentH,
    srcLabelScale,
    conLabelScale,
  };
}

/* ------------------------------------------------------------------ */
/* Widget component                                                     */
/* ------------------------------------------------------------------ */

export default function PowerSankeyWidget({ config }: { config?: any }) {
  const glass = useGlassStyle(config);
  const isLight = glass.isLight;

  // Labels honour the Style tab: base text colour, font weight and text
  // shadow all apply, and nothing dims the configured colours further.
  const textMain = config?.color || (isLight ? "rgba(0,0,0,0.92)" : "rgba(255,255,255,1)");
  const textSub = isLight ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.85)";
  const cfgWeight =
    config?.fontWeight != null && String(config.fontWeight).trim() !== ""
      ? parseInt(String(config.fontWeight), 10)
      : NaN;
  const bigWeight = Number.isFinite(cfgWeight) ? cfgWeight : 700;
  const smallWeight = Number.isFinite(cfgWeight) ? cfgWeight : 400;
  const shadowNum = (v: unknown) => (v == null || v === "" ? 0 : Number(v));
  const tsBlur = shadowNum(config?.textShadowBlur);
  const tsX = shadowNum(config?.textShadowX);
  const tsYCond = shadowNum(config?.textShadowY);
  const tsY = config?.textShadowY == null ? 4 : shadowNum(config?.textShadowY);
  const textShadow =
    tsBlur > 0 || tsX !== 0 || tsYCond !== 0
      ? `${tsX}px ${tsY}px ${tsBlur}px rgba(0,0,0,0.8)`
      : "none";

  // Flows are the single source of truth: the first grid, solar and battery
  // flow each feeds the left side; consumer flows draw their own bands on the
  // right, in flows-array order. There are no legacy sensor fields - old
  // configs must be re-created as typed flows.
  const flows: FlowDef[] = Array.isArray(config?.flows) ? config.flows : [];
  const gridFlow = flows.find((f) => f.type === "grid");
  const solarFlow = flows.find((f) => f.type === "solar");
  const battFlow = flows.find((f) => f.type === "battery");
  const gridId = (gridFlow?.entityId || "").trim();
  const solarId = (solarFlow?.entityId || "").trim();
  const battPwrId = (battFlow?.entityId || "").trim();
  const battLvlId = (battFlow?.levelId || "").trim();
  const invertGrid = gridFlow?.invert === true;
  const invertBattery = battFlow?.invert === true;

  // Colours live on the flows: grid carries import + export, battery carries
  // discharge + charge, and every flow carries its own band, name and value
  // colour. The Home bar and the untracked remainder stay on the widget.
  const C: Record<string, string> = {
    import: gridFlow?.color || "#7986cb",
    export: gridFlow?.exportColor || "#66bb6a",
    solar: solarFlow?.color || "#ffca28",
    battOut: battFlow?.color || "#26c6da",
    battIn: battFlow?.chargeColor || "#ab47bc",
    consumer: config?.otherColor || "#90a4ae",
    home: config?.homeBarColor || "#ffffff",
  };

  const homeLabel = config?.homeLabel || "Home";
  const homeLabelOffsetY = Math.max(-80, Math.min(80, Number(config?.homeLabelOffsetY) || 0));
  const otherLabel = config?.otherLabel || "Other";
  const showOther = config?.showOther !== false;
  const minFlow = isFinite(Number(config?.minFlowW)) ? Number(config?.minFlowW) : 5;
  const sourceLabelFirst = config?.sourceLabelFirst !== false;
  const consumerLabelFirst = config?.consumerLabelFirst !== false;
  const srcIconOnly = config?.iconOnlySources === true;
  const srcShowIcons = config?.showSourceIcons !== false;
  const srcMode: 0 | 1 | 2 = srcIconOnly ? 1 : srcShowIcons ? 2 : 0;
  const conIconOnly = config?.iconOnlyConsumers === true;
  const conShowIcons = config?.showConsumerIcons !== false;
  const conMode: 0 | 1 | 2 = conIconOnly ? 1 : conShowIcons ? 2 : 0;
  const battScale = Math.max(0.5, Math.min(4, Number(config?.batteryIconScale) ||1));

  const allIds = useMemo(() => {
    const ids = [gridId, solarId, battPwrId, battLvlId];
    for (const f of flows) { if (f.entityId) ids.push(f.entityId); }
    // /api/ha/state expects comma-separated ids - semicolons silently return no data.
    return ids.filter(Boolean).join(",");
  }, [gridId, solarId, battPwrId, battLvlId, flows]);

  const [statesDict, setStatesDict] = useState<Record<string, any>>({});
  const [error, setError] = useState("");
  const [size, setSize] = useState< Sized | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Widest measured label text per side (px). The layout hugs these so
  // responsive font sizes never crop; null until the probe measures once.
  const [labelPx, setLabelPx] = useState<{ src: LabelPx; con: LabelPx } | null>(null);
  const probeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!allIds) {
      setStatesDict({});
      return;
    }
    let cancelled = false;
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/ha/state?ids=${encodeURIComponent(allIds)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HA ${res.status}`);
        const dict = await res.json();
        if (!cancelled) {
          setStatesDict(dict ?? {});
          setError("");
        }
      } catch {
        if (!cancelled) setError("Connection failed");
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [allIds]);

  useEffect(() => {
    if (!boxRef.current || typeof ResizeObserver === "undefined") return;
    const el = boxRef.current;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 0 && r.height > 0) {
        setSize({ w: Math.round(r.width), h: Math.round(r.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure the hidden label probe after every render: the gutters follow
  // the real text widths. No deps on purpose - state updates above bail
  // out when nothing changed, so this settles instead of looping.
  useLayoutEffect(() => {
    const el = probeRef.current;
    if (!el) return;
    const wS: Record<string, number> = {};
    const hS: Record<string, number> = {};
    let srcW = 0;
    let conW = 0;
    el.querySelectorAll<HTMLElement>("span[data-side]").forEach((s) => {
      const side = s.dataset.side === "src" ? "src" : "con";
      const node = s.dataset.node || "";
      const r = s.getBoundingClientRect();
      if (side === "src") srcW = Math.max(srcW, r.width);
      else conW = Math.max(conW, r.width);
      // stacked pair height per node: sum its lines, keep the tallest node
      const k = side + "|" + node;
      hS[k] = (hS[k] || 0) + r.height;
    });
    const pairH = (side: string) =>
      Math.max(0, ...Object.entries(hS).filter(([k]) => k.startsWith(side + "|")).map(([, v]) => v));
    setLabelPx((prev) => {
      const next = { src: { w: srcW, h: pairH("src") }, con: { w: conW, h: pairH("con") } };
      return prev &&
        Math.abs(prev.src.w - next.src.w) < 0.5 && Math.abs(prev.con.w - next.con.w) < 0.5 &&
        Math.abs(prev.src.h - next.src.h) < 0.5 && Math.abs(prev.con.h - next.con.h) < 0.5
        ? prev
        : next;
    });
  });

  // Webfont swap changes label widths after first paint - remeasure once
  // the fonts settle.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (!fonts?.ready) return;
    let alive = true;
    fonts.ready.then(() => {
      if (alive) setLabelPx(null);
    });
    return () => { alive = false; };
  }, []);

  const F = useMemo((): ComputedFlow | null => {
    if (!allIds) return null;

    const pw = (id: string, invert: boolean): number => {
      const w = toWatts(statesDict[id]);
      if (w == null) return 0;
      return invert ? -w : w;
    };
    const quiet = (v: number) => (Math.abs(v) < minFlow ? 0 : v);

    let gi = 0, ge = 0;
    const hasGrid = !!gridId;
    if (hasGrid) {
      const g = quiet(pw(gridId, invertGrid));
      gi = Math.max(0, g);
      ge = Math.max(0, -g);
    }
    const solar = solarId ? Math.max(0, quiet(pw(solarId, false))) : 0;
    const hasBattery = !!battPwrId || !!battLvlId;
    let bd = 0, bc = 0;
    if (battPwrId) {
      const b = quiet(pw(battPwrId, invertBattery));
      bd = Math.max(0, b);
      bc = Math.max(0, -b);
    }
    const battLevel = battLvlId ? toPercent(statesDict[battLvlId]) : null;
    const homeLoad = Math.max(0, gi + solar + bd - ge - bc);

    const cons: ConsumerFlow[] = flows
      .filter((f) => f.type === "consumer")
      .map((f) => {
      const st = statesDict[f.entityId];
      const w = toWatts(st);
      const v = w == null ? 0 : Math.max(0, quiet(w));
      return {
        entityId: f.entityId,
        label: f.label || friendlyName(st, f.entityId),
        colour: f.color || "#90a4ae",
        v,
      };
    });
    const consSum = cons.reduce((a, c) => a + c.v, 0);
    const otherV = showOther && flows.length > 0 ? Math.max(0, homeLoad - consSum) : 0;

    return { gi, ge, solar, bd, bc, battLevel, homeLoad, cons, otherV, hasGrid, hasBattery };
  }, [statesDict, gridId, solarId, battPwrId, battLvlId, flows, minFlow, showOther, invertGrid, invertBattery, allIds]);

  const L = useMemo((): Layout | null => {
    if (!size || !F) return null;
    return computeLayout(size, C, F, otherLabel, homeLabel, gridId, labelPx);
  }, [size, F, C, otherLabel, homeLabel, gridId, labelPx]);

  if (!allIds) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-[0.8em] gap-[0.4em] text-center p-[0.5em]" style={{ color: textSub }}>
        ⚡ Power Sankey
        <span className="text-[0.75em] opacity-60">
          Set your Home Assistant sensors in the Inspector.
        </span>
      </div>
    );
  }

  if (error && Object.keys(statesDict).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400/70 text-[0.7em] text-center p-[0.5em]">
        {error}
      </div>
    );
  }

  const anyFlow = F ? (F.gi + F.ge + F.solar + F.bd + F.bc + F.homeLoad) > 0 : false;
  const consumerFlows = flows.filter((f) => f.type === "consumer");

  /* ---- inline render helpers ---- */

  const nameLine = (
    entityState: any,
    entityKey: string,
    fallbackName: string,
    fallbackIcon: string | null,
    mode: 0 | 1 | 2,
  ): { text: string; style?: React.CSSProperties } => {
    if (mode === 1) {
      const icon = iconFor(entityState, entityKey, fallbackIcon || undefined);
      if (icon) return { text: icon, style: { fontSize: "1.1em", opacity: 0.9 } };
      return { text: fallbackName };
    }
    if (mode === 2) {
      const icon = iconFor(entityState, entityKey, fallbackIcon || undefined);
      return icon ? { text: `${icon} ${fallbackName}` } : { text: fallbackName };
    }
    return { text: fallbackName };
  };

  const flowForSrc = (key: string): FlowDef | undefined =>
    key === "grid" ? gridFlow : key === "solar" ? solarFlow : key === "battery" ? battFlow : undefined;

  const srcLabel = (n: SrcNode): { text: string; big?: boolean; scale?: number; style?: React.CSSProperties }[] => {
    let value: string;
    let name: string;
    let nameKey = gridId;
    let fallbackIcon: string | null = "⚡";
    if (n.key === "grid") {
      value = F!.gi > 0 ? fmtW(F!.gi) : "0 W";
      name = "Grid";
    } else if (n.key === "solar") {
      value = fmtW(F!.solar);
      name = "Solar";
      nameKey = solarId;
      fallbackIcon = "☀️";
    } else {
      // Charging draws on the right of the Home bar, so the left battery
      // label only ever reports its discharge.
      value = F!.bd > 0 ? fmtW(F!.bd) : "0 W";
      name = "Battery";
      nameKey = battPwrId || battLvlId;
      fallbackIcon = "🔋";
    }
    const srcFlow = flowForSrc(n.key);
    const nameLn = nameLine(statesDict[nameKey], nameKey, name, fallbackIcon, srcMode);
    if (srcFlow?.nameColor) nameLn.style = { ...nameLn.style, color: srcFlow.nameColor };
    const valueLn: { text: string; big?: boolean; scale?: number; style?: React.CSSProperties } = { text: value, big: true };
    if (srcFlow?.valueColor) valueLn.style = { color: srcFlow.valueColor };
    const lines: { text: string; big?: boolean; scale?: number; style?: React.CSSProperties }[] = sourceLabelFirst ? [nameLn, valueLn] : [valueLn, nameLn];
    if (n.key === "battery" && F!.battLevel != null) {
      const battIcon = iconFor(statesDict[battLvlId || nameKey], battLvlId || nameKey, "🔋");
      lines.push({
        text: `${battIcon} ${Math.round(F!.battLevel)} %`,
        scale: battScale,
      });
    }
    return lines;
  };

  // Per-node label scale straight from the layout (1 when roomy, shrinking
  // only when a label pair would not fit its slot between stacked nodes).
  const srcScaleAt = (i: number) => (L && L.srcLabelScale[i] != null ? L.srcLabelScale[i] : 1);
  const conScaleAt = (i: number) => (L && L.conLabelScale[i] != null ? L.conLabelScale[i] : 1);

  // Shared label-line css: weight, shadow and colour follow the Style tab,
  // at full brightness. `scale` shrinks the text into its node slot.
  const srcLineCss = (ln: LabelLine, scale = 1): React.CSSProperties => ({
    fontSize: `${(ln.big ? 0.78 : 0.6) * scale * (ln.scale ?? 1)}em`,
    fontWeight: ln.big ? bigWeight : smallWeight,
    color: ln.big ? textMain : textSub,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    textShadow,
    ...ln.style,
  });

  const conLineCss = (ln: LabelLine, scale: number): React.CSSProperties => ({
    fontSize: `${(ln.big ? 0.78 : 0.6) * scale * (ln.scale ?? 1)}em`,
    fontWeight: ln.big ? bigWeight : smallWeight,
    color: ln.big ? textMain : textSub,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    textShadow,
    ...ln.style,
  });

  // Label lines for a right-side node - shared by the visible labels and
  // the hidden width probe. The charging battery carries its percentage
  // line here, like the discharging one does on the left.
  const conLabelLines = (n: ConNode): LabelLine[] => {
    const isGrid = n.key === "grid-out";
    const isBatt = n.key === "battery-charge";
    const valueText = isGrid || isBatt ? `↑ ${fmtW(n.v)}` : fmtW(n.v);
    const flow =
      isBatt ? battFlow
      : isGrid ? gridFlow
      : n.key.startsWith("con") ? consumerFlows[Number(n.key.slice(3))]
      : undefined;
    const nameLn = isBatt
      ? nameLine(statesDict[battPwrId || battLvlId], battPwrId || battLvlId, "Battery", "🔋", srcMode)
      : isGrid
        ? nameLine(statesDict[gridId], gridId, "Grid", "⚡", srcMode)
        : nameLine(statesDict[n.entityId || ""], n.entityId || "", n.label, null, conMode);
    if (flow?.nameColor) nameLn.style = { ...nameLn.style, color: flow.nameColor };
    const valueLn: LabelLine = {
      text: valueText,
      big: true,
      style: { color: flow?.valueColor || n.colour },
    };
    const lines: LabelLine[] = isGrid || isBatt
      ? (sourceLabelFirst ? [nameLn, valueLn] : [valueLn, nameLn])
      : (consumerLabelFirst ? [nameLn, valueLn] : [valueLn, nameLn]);
    if (isBatt && F?.battLevel != null) {
      const battIcon = iconFor(statesDict[battLvlId || battPwrId], battLvlId || battPwrId, "🔋");
      lines.push({ text: `${battIcon} ${Math.round(F.battLevel)} %`, scale: battScale });
    }
    return lines;
  };

  return (
    <div className="w-full h-full flex flex-col">
      {config?.title && (
        <div className="text-[0.75em] font-bold px-[0.5em] pt-[0.3em] pb-0 flex-shrink-0" style={{ color: textMain }}>
          {config.title}
        </div>
      )}
      <div ref={boxRef} className="relative flex-1 min-h-0 overflow-hidden">
        {(!size || !L) ? (
          <div className="absolute inset-0 flex items-center justify-center text-[0.7em]" style={{ opacity: 0.5 }}>
            …
          </div>
        ) : (
          <>
            <svg
              width={size.w}
              height={size.h}
              className="absolute left-0 top-0"
            >
              {L.bands.map((b) => (
                <path key={b.key} d={b.d} fill={b.colour} fillOpacity={0.45} stroke="none" />
              ))}
              {L.nodeBars.map((n) => (
                <rect
                  key={n.key}
                  x={n.x}
                  y={n.y}
                  width={L.bw}
                  height={n.h}
                  rx={Math.min(4, L.bw / 2)}
                  fill={n.colour}
                  fillOpacity={0.9}
                />
              ))}
            </svg>

            {/* source labels: right-aligned, left of their bars */}
            {L.srcNodes.map((n, nIdx) => (
              <div
                key={"lbl-" + n.key}
                className="absolute text-right"
                style={{
                  right: size.w - L.leftBarX + 6,
                  top: n.top + n.h / 2,
                  transform: "translateY(-50%)",
                }}
              >
                {srcLabel(n).map((ln, i) => (
                  <div key={i} style={srcLineCss(ln, srcScaleAt(nIdx))}>
                    {ln.text}
                  </div>
                ))}
              </div>
            ))}

            {/* consumer (right) labels: left-aligned, right of their bars */}
            {L.conNodes.map((n, nIdx) => {
              const scale = conScaleAt(nIdx);
              const lines = conLabelLines(n);
              return (
                <div
                  key={"lbl-" + n.key}
                  className="absolute"
                  style={{
                    left: L.rightBarX + L.bw + 6,
                    top: n.top + n.h / 2,
                    transform: "translateY(-50%)",
                    maxWidth: size.w - L.rightBarX - L.bw - 12,
                    overflow: "hidden",
                  }}
                >
                  {lines.map((ln, i) => (
                    <div key={i} style={conLineCss(ln, scale)}>
                      {ln.text}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* home label */}
            {(() => {
              const labelHest = 24;
              const belowRoom = size.h - (L.home.y + L.home.h + 4);
              const below = belowRoom > labelHest + 4;
              const top = Math.max(0,
                (below ? L.home.y + L.home.h + 4 : Math.max(6, L.home.y - labelHest - 4)) +
                homeLabelOffsetY);
              return (
                <div
                  key="lbl-home"
                  className="absolute text-center"
                  style={{
                    left: L.home.cx,
                    top,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div style={{ fontSize: "0.6em", fontWeight: smallWeight, color: textSub, lineHeight: 1.2, whiteSpace: "nowrap", textShadow }}>
                    {homeLabel}
                  </div>
                  <div style={{ fontSize: "0.78em", fontWeight: bigWeight, color: textMain, lineHeight: 1.2, whiteSpace: "nowrap", textShadow }}>
                    {fmtW(F!.homeLoad)}
                  </div>
                </div>
              );
            })()}

            {/* Label-width probe: the same label lines as above, hidden
                and non-interactive. Measured after every render so the
                side gutters hug the real text - nothing crops, not even
                with responsive font sizes. */}
            <div
              ref={probeRef}
              aria-hidden="true"
              style={{ position: "absolute", left: 0, top: 0, visibility: "hidden", pointerEvents: "none" }}
            >
              {L.srcNodes.map((n) =>
                srcLabel(n).map((ln, i) => (
                  <span
                    key={n.key + "-" + i}
                    data-side="src"
                    data-node={n.key}
                    style={{ ...srcLineCss(ln, 1), position: "absolute" }}
                  >
                    {ln.text}
                  </span>
                )),
              )}
              {L.conNodes.map((n) =>
                conLabelLines(n).map((ln, i) => (
                  <span
                    key={n.key + "-" + i}
                    data-side="con"
                    data-node={n.key}
                    style={{ ...conLineCss(ln, 1), position: "absolute" }}
                  >
                    {ln.text}
                  </span>
                )),
              )}
            </div>

            {/* no-flow hint */}
            {!anyFlow && (
              <div
                className="absolute left-1/2 bottom-[0.3em] translate-x-[-50%] text-[0.6em] whitespace-nowrap"
                style={{ color: textSub, opacity: 0.7 }}
              >
                No power flowing
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
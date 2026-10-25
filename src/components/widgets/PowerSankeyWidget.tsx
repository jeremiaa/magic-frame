"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useGlassStyle } from "@/lib/ui/glass";

/* ------------------------------------------------------------------ */
/* Pure helpers — module scope, no hooks, no React.                    */
/* ------------------------------------------------------------------ */

const BAD_STATES = new Set(["unavailable", "unknown", "none", ""]);

function toWatts(st: any): number | null {
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

function toPercent(st: any): number | null {
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
/* Overlap resolver — forward+backward+forward pass                    */
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

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface FlowDef {
  entityId: string;
  levelId?: string;
  invert?: boolean;
  label?: string;
  color?: string;
  type: "grid" | "solar" | "battery" | "consumer";
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
}

interface Bar { key: string; x: number; y: number; h: number; colour: string; }

interface Band { key: string; d: string; colour: string; }

interface Layout {
  bands: Band[]; nodeBars: Bar[];
  leftBarX: number; homeBarX: number; rightBarX: number; bw: number;
  srcNodes: SrcNode[]; conNodes: ConNode[]; gridOnRight: boolean;
  home: { x: number; y: number; h: number; cx: number }; contentH: number;
}

/* ------------------------------------------------------------------ */
/* Layout engine                                                        */
/* ------------------------------------------------------------------ */

function singleFlowNode(n: SrcNode): boolean {
  return !n.flows.export;
}

function computeLayout(
  size: Sized,
  C: Record<string, string>,
  F: ComputedFlow,
  otherLabel: string,
  homeLabel: string,
  gridId: string,
): Layout | null {
  const { w, h } = size;
  const MIN_BAND = 2;
  const NODE_GAP = 8;
  const MIN_NODE = 12;
  const gridOnRight = F.ge > 0;

  const pad = 8;
  const bw = Math.max(5, Math.min(12, w * 0.012));
  const labelSpace = Math.min(
    Math.max(w * 0.22, 70),
    150,
    Math.max(20, (w - 2 * pad - 6 * bw) / 2),
  );
  const leftBarX = pad + labelSpace;
  const homeBarX = w / 2 - bw / 2;
  const rightBarX = w - pad - labelSpace - bw;
  const contentTop = pad;
  const contentBottom = h - pad;
  const contentH = contentBottom - contentTop;

  const leftW = F.gi + F.solar + F.bd + F.bc;
  const rightW =
    (gridOnRight ? F.ge : 0) +
    F.cons.reduce((a, c) => a + c.v, 0) +
    F.otherV;
  const maxFlow = Math.max(leftW, rightW, 1);
  const s = (contentH - 30) / maxFlow;
  const th = (v: number) => (v > 0 ? Math.max(v * s, MIN_BAND) : 0);

  const homeLeftFlows = [
    { v: F.gi, c: C.import, k: "grid-in" },
    { v: F.solar, c: C.solar, k: "solar" },
    { v: F.bd, c: C.battOut, k: "batt-out" },
    { v: F.bc, c: C.battIn, k: "batt-in" },
  ].filter((f) => f.v > 0);

  const homeRightFlows = [
    ...(gridOnRight ? [{ v: F.ge, c: C.export, k: "grid-out" }] : []),
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
  if (F.hasGrid && !gridOnRight) {
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
  if (F.hasBattery) {
    const bdR = attachL["batt-out"];
    const bcR = attachL["batt-in"];
    srcNodes.push({
      key: "battery",
      colour: C.battOut,
      h: Math.max(th(F.bd) + th(F.bc), MIN_NODE),
      centre:
        bdR && bcR ? (bdR[0] + bcR[1]) / 2 : midOf(bdR) ?? midOf(bcR) ?? contentTop + contentH * 0.8,
      flows: { import: bdR ?? null, export: bcR ?? null },
      top: 0,
    });
  }

  const srcYs = resolveOverlaps(
    srcNodes.map((n) => n.centre),
    srcNodes.map((n) => n.h),
    contentTop,
    contentBottom,
    NODE_GAP,
  );
  srcNodes.forEach((n, i) => (n.top = srcYs[i]));

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
  const conYs = resolveOverlaps(
    conNodes.map((n) => n.centre),
    conNodes.map((n) => n.h),
    contentTop,
    contentBottom,
    NODE_GAP,
  );
  conNodes.forEach((n, i) => (n.top = conYs[i]));

  const bands: Band[] = [];
  for (const n of srcNodes) {
    if (n.flows.import) {
      const [hy0, hy1] = n.flows.import;
      const t = th(n.key === "grid" ? F.gi : n.key === "solar" ? F.solar : F.bd);
      const srcSpan: [number, number] = singleFlowNode(n)
        ? [n.top, n.top + n.h]
        : [n.top, n.top + t];
      bands.push({
        key: n.key + "-in",
        d: bandPath(leftBarX + bw, srcSpan[0], srcSpan[1], homeBarX, hy0, hy1),
        colour: n.key === "grid" ? C.import : n.key === "solar" ? C.solar : C.battOut,
      });
    }
    if (n.flows.export) {
      const [hy0, hy1] = n.flows.export;
      const t = th(n.key === "grid" ? F.ge : F.bc);
      const srcSpan: [number, number] = singleFlowNode(n)
        ? [n.top, n.top + n.h]
        : [n.top + n.h - t, n.top + n.h];
      bands.push({
        key: n.key + "-out",
        d: bandPath(homeBarX, hy0, hy1, leftBarX + bw, srcSpan[0], srcSpan[1]),
        colour: n.key === "grid" ? C.export : C.battIn,
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
      { key: "home", x: homeBarX, y: homeTop, h: homeH, colour: "#ffffff" },
      ...conNodes.map((n) => ({ key: n.key, x: rightBarX, y: n.top, h: n.h, colour: n.colour })),
    ],
    leftBarX, homeBarX, rightBarX, bw,
    srcNodes, conNodes, gridOnRight,
    home: { x: homeBarX, y: homeTop, h: homeH, cx: homeBarX + bw / 2 },
    contentH,
  };
}

/* ------------------------------------------------------------------ */
/* Widget component                                                     */
/* ------------------------------------------------------------------ */

export default function PowerSankeyWidget({ config }: { config?: any }) {
  const glass = useGlassStyle(config);
  const isLight = glass.isLight;

  const textMain = isLight ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.95)";
  const textSub = isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.55)";

  const C: Record<string, string> = {
    import: config?.importColor || "#7986cb",
    export: config?.exportColor || "#66bb6a",
    solar: config?.solarColor || "#ffca28",
    battOut: config?.batteryOutColor || "#26c6da",
    battIn: config?.batteryInColor || "#ab47bc",
    consumer: config?.consumerColor || "#90a4ae",
  };

  const homeLabel = config?.homeLabel || "Home";
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

  const flows: FlowDef[] = Array.isArray(config?.flows) ? config.flows : [];

  // Derive source IDs from typed flow array (no legacy sensor fields).
  const gridId   = (flows.find(f => f.type === "grid")   ?.entityId || "").trim();
  const solarId  = (flows.find(f => f.type === "solar")  ?.entityId || "").trim();
  const battFlow = flows.find(f => f.type === "battery");
  const battPwrId = battFlow?.entityId?.trim() || "";
  const battLvlId = battFlow?.levelId?.trim() || "";
  const invertGrid = (flows.find(f => f.type === "grid")?.invert) ?? false;
  const invertBattery = battFlow?.invert ?? false;

  const allIds = useMemo(() => {
    const ids = [];
    for (const f of flows) {
      if (f.entityId) ids.push(f.entityId);
      if (f.levelId) ids.push(f.levelId);
    }
    return ids.filter(Boolean).join(",");
  }, [flows]);

  const [statesDict, setStatesDict] = useState<Record<string, any>>({});
    const [error, setError] = useState("");
    const [renderError, setRenderError] = useState("");
    const [size, setSize] = useState<Sized | null>(null);
    const [probe, setProbe] = useState("");
    const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!allIds) {
      setStatesDict({});
      return;
    }
    let cancelled = false;
    const fetchState = async () => {
      try {
        const url = `/api/ha/state?ids=${encodeURIComponent(allIds)}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HA ${res.status}`);
        const dict = await res.json();
        if (!cancelled) {
          setStatesDict(dict ?? {});
          setError("");
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Connection failed");
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [allIds]);

  const needsMeasure = !size;
  useEffect(() => {
    if (!needsMeasure || !boxRef.current) return;
    const el = boxRef.current;

    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setSize({ w: Math.round(r.width), h: Math.round(r.height) });
        return true;
      }
      return false;
    };

    // Layout may settle late (grid allocation) — retry across frames
    let tries = 0;
    let raf = 0;
    const retry = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setSize({ w: Math.round(r.width), h: Math.round(r.height) });
        setProbe("");
        return;
      }
      tries++;
      const note = `try ${tries}: ${Math.round(r.width)}x${Math.round(r.height)}`;
      if (tries > 60) { setProbe(`measuring gave up — ${note}`); return; }
      if (tries % 10 === 0) setProbe(note);
      raf = requestAnimationFrame(retry);
    };
    retry();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => measure());
      ro.observe(el);
      return () => { ro.disconnect(); cancelAnimationFrame(raf); };
    }
    return () => cancelAnimationFrame(raf);
  }, [needsMeasure]);

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
    let homeLoad = Math.max(0, gi + solar + bd - ge - bc);

    const cons: ConsumerFlow[] = flows.map((f) => {
      const st = statesDict[f.entityId];
      const w = toWatts(st);
      const v = w == null ? 0 : Math.max(0, quiet(w));
      return {
        entityId: f.entityId,
        label: f.label || friendlyName(st, f.entityId),
        colour: f.color || C.consumer,
        v,
      };
    });
    const consSum = cons.reduce((a, c) => a + c.v, 0);
    const otherV = showOther && flows.length > 0 ? Math.max(0, homeLoad - consSum) : 0;

    return { gi, ge, solar, bd, bc, battLevel, homeLoad, cons, otherV, hasGrid, hasBattery };
  }, [statesDict, gridId, solarId, battPwrId, battLvlId, flows, minFlow, showOther, C.consumer, invertGrid, invertBattery, allIds]);

  const L = useMemo((): Layout | null => {
    if (!size || !F) return null;
    return computeLayout(size, C, F, otherLabel, homeLabel, gridId);
  }, [size, F, C, otherLabel, homeLabel, gridId]);

  if (!allIds) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-[0.8em] gap-[0.4em] text-center p-[0.5em]" style={{ color: textMain }}>
        <span style={{ fontSize: "1.5em" }}>⚡</span>
        <span style={{ fontWeight: 700 }}>Power Sankey</span>
        <span className="text-[0.75em]" style={{ color: textSub }}>
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

  /* ---- Show a skeleton when configured but no flow yet ---- */
  if (!anyFlow && allIds) {
      const entityNames = flows.map(f => f.label || f.entityId).filter(Boolean);
      const fetchedCount = Object.keys(statesDict).length;
      const sampleKeys = Object.keys(statesDict).slice(0, 4);
      const sampleVals = sampleKeys.map(k => {
        const st = statesDict[k];
        return st ? `${st.state || "?"} ${st.attributes?.unit_of_measurement || ""}`.trim() : "—";
      });
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-[0.7em] gap-[0.2em] text-center p-[0.5em] overflow-hidden">
          <span style={{ fontSize: "1.3em" }}>⚡</span>
          <span style={{ fontWeight: 700, color: textMain }}>No power flowing</span>
          <span style={{ color: textSub }}>
            {fetchedCount} sensor(s) ok · gi={F?.gi ?? 0} so={F?.solar ?? 0} bd={F?.bd ?? ""} bc={F?.bc ?? ""} hl={F?.homeLoad ?? 0}
          </span>
          {sampleVals.map((v, i) => (
            <span key={i} className="text-[0.85em]" style={{ color: textSub, opacity: 0.6 }}>
              {sampleKeys[i].substring(0, 30)} = {v}
            </span>
          ))}
          {error && (
            <span style={{ color: "#f87171" }}>{error}</span>
          )}
        </div>
      );
    }

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
      value =
        F!.bd > 0 && F!.bc > 0
          ? `↓ ${fmtW(F!.bd)}  ↑ ${fmtW(F!.bc)}`
          : F!.bd > 0
            ? fmtW(F!.bd)
            : F!.bc > 0
              ? `↑ ${fmtW(F!.bc)}`
              : "0 W";
      name = "Battery";
      nameKey = battPwrId || battLvlId;
      fallbackIcon = "🔋";
    }
    const nameLn = nameLine(statesDict[nameKey], nameKey, name, fallbackIcon, srcMode);
    const valueLn = { text: value, big: true };
    const lines = sourceLabelFirst ? [nameLn, valueLn] : [valueLn, nameLn];
    if (n.key === "battery" && F!.battLevel != null) {
      const battIcon = iconFor(statesDict[battLvlId || nameKey], battLvlId || nameKey, "🔋");
      lines.push({
        text: `${battIcon} ${Math.round(F!.battLevel)} %`,
        scale: battScale,
        style: { opacity: 0.8 },
      });
    }
    return lines;
  };

  const rightScaleFor = (count: number): number => {
    if (!L) return 1;
    const availH = L.contentH ? L.contentH - 24 : (size?.h || 200);
    const perNode = availH / Math.max(count, 1);
    return count <=4 ? 1 : Math.max(0.55, Math.min(1, perNode / 40));
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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[0.7em] gap-[0.3em]" style={{ opacity: 0.6 }}>
            <span>…</span>
            <span style={{ fontSize: "0.8em", color: textSub }}>
              {!size ? (probe || "measuring…") : !L ? `layout failed: gi=${F?.gi} so=${F?.solar} bd=${F?.bd} bc=${F?.bc}` : ""}
            </span>
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
            {L.srcNodes.map((n) => (
              <div
                key={"lbl-" + n.key}
                className="absolute text-right"
                style={{
                  right: size.w - L.leftBarX + 6,
                  top: n.top + n.h / 2,
                  transform: "translateY(-50%)",
                }}
              >
                {srcLabel(n).map((ln, i) => {
                  const base = ln.big ?0.78 : 0.6;
                  const fs = ln.scale ? `${base * ln.scale}em` : `${base}em`;
                  return (
                    <div
                      key={i}
                      style={{
                        fontSize: fs,
                        fontWeight: ln.big ?700 : 400,
                        color: ln.big ? textMain : textSub,
                        opacity: ln.big ?1 : 0.65,
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        ...ln.style,
                      }}
                    >
                      {ln.text}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* consumer (right) labels: left-aligned, right of their bars */}
            {L.conNodes.map((n, idx, arr) => {
              const count = arr.length;
              const rightScale = rightScaleFor(count);
              const isGrid = n.key === "grid-out";
              const valueText = isGrid ? `↑ ${fmtW(n.v)}` : fmtW(n.v);
              const nameLn = isGrid
                ? nameLine(statesDict[gridId], gridId, "Grid", "⚡", srcMode)
                : nameLine(statesDict[n.entityId || ""], n.entityId || "", n.label, null, conMode);
              const valueLn: { text: string; big?: boolean; style?: React.CSSProperties } = {
                text: valueText,
                big: true,
                style: { color: n.colour },
              };
              const lines = isGrid
                ? (sourceLabelFirst ? [nameLn, valueLn] : [valueLn, nameLn])
                : (consumerLabelFirst ? [nameLn, valueLn] : [valueLn, nameLn]);

              const availH = L.contentH ? L.contentH - 24 : (size?.h || 200);
              const perNode = availH / Math.max(count, 1);

              return (
                <div
                  key={"lbl-" + n.key}
                  className="absolute"
                  style={{
                    left: L.rightBarX + L.bw + 6,
                    top: n.top + n.h / 2,
                    transform: "translateY(-50%)",
                    maxWidth: size.w - L.rightBarX - L.bw - 12,
                    maxHeight: perNode,
                    overflow: "hidden",
                  }}
                >
                  {lines.map((ln, i) => {
                    const base = ln.big ? 0.78 :0.6;
                    const fs = `${base * rightScale}em`;
                    return (
                      <div
                        key={i}
                        style={{
                          fontSize: fs,
                          fontWeight: ln.big ? 700 :400,
                          color: ln.big ? textMain : textSub,
                          opacity: ln.big ? 1 :0.65,
                          lineHeight: 1.2,
                          whiteSpace: "nowrap",
                          ...ln.style,
                        }}
                      >
                        {ln.text}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* home label */}
            {(() => {
              const labelHest = 24;
              const belowRoom = size.h - (L.home.y + L.home.h + 4);
              const below = belowRoom > labelHest + 4;
              const top = below
                ? L.home.y + L.home.h + 4
                : Math.max(6, L.home.y - labelHest - 4);
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
                  <div style={{ fontSize: "0.6em", color: textSub, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                    {homeLabel}
                  </div>
                  <div style={{ fontSize: "0.78em", fontWeight: 700, color: textMain, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                    {fmtW(F!.homeLoad)}
                  </div>
                </div>
              );
            })()}

            {/* no-flow hint */}
            {!anyFlow && (
              <div
                className="absolute left-1/2 bottom-[0.3em] translate-x-[-50%] text-[0.6em] whitespace-nowrap"
                style={{ color: textSub, opacity: 0.55 }}
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
#!/usr/bin/env node
/**
 * Geometry + config smoke test for FlexHorseshoeWidget.
 *
 * Bundles src/components/widgets/FlexHorseshoeWidget.tsx with esbuild
 * (client hooks stubbed) and asserts computeLayout behaviour against the
 * rework spec: per-entity thickness, outside/inside stacking, ring/marker
 * toggles, centre-value entity/unit/decimals handling.
 *
 * Run: node scripts/test-flex-horseshoe.mjs
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const RUNNER = /* ts */ `
import {
  computeLayout, buildRowZones, normCentreUnitPos, clampNum,
  resolveAttention, hexA, normAlign,
  type ResolvedRing,
} from "@/components/widgets/FlexHorseshoeWidget";
import assert from "node:assert";

function ring(o: Partial<ResolvedRing>): ResolvedRing {
  return {
    idx: 0, id: "sensor.demo", attr: null, label: "Demo", min: 0, max: 100,
    style: "fixed", stopsList: [], thicknessPct: null, value: 50, unit: "kW",
    showUnit: true, decimals: 1, showRing: true, showMarker: false,
    entColor: null, fallbackColour: null,
    showRowIcon: true, showRowName: true, showRowValue: true,
    iconPlacement: "before-name", valuePlacement: "far-right", rowAlign: "left",
    icon: "",
    iconColor: null, rowValueColor: null, rowNameColor: null, rowScale: 1,
    ...o,
  };
}
const base = {
  w: 200, h: 200, cx: 100, cy: 100,
  sweep: 260, ringWidthPct: 20, ringGapPct: 5,
  trackColor: "#6b7280", fixedColor: "#4dd0e1",
  showTicks: false, tickCount: 11, tickSize: 6,
  markerColor: "#ffffff",
  showCentre: true, centreEntity: 0, centreShowUnit: true, centreScale: 1,
  centreIconScale: 1, centreValueScale: 1, centreUnitScale: 1, centreIconY: 50, centreValueY: 50,
  showTrack: true, trackOpacity: 0.38,
  rings: [],
};

// Replicates the widget's radius math exactly (same expression tree, so the
// floats stay bit-identical): rBase shrinks by pad, then the outermost
// drawn ring's half stroke is reserved so the arc never crops off the box.
const HALF = Math.min(200, 200) / 2;
const PAD = 6;
const RBASE = Math.max(10, HALF - PAD); // 94 (no ticks)
const OUTER_THICK = Math.max(4, RBASE * (Math.min(100, Math.max(4, 20)) / 100)); // 18.8
const R0 = Math.max(10, RBASE - OUTER_THICK / 2); // 84.6
const TH0 = Math.max(4, R0 * (20 / 100));
const GAP0 = Math.max(2, R0 * (5 / 100));

let pass = 0, fail = 0;
function check(name: string, fn: () => void) {
  try { fn(); pass++; console.log("ok - " + name); }
  catch (e: any) { fail++; console.log("FAIL - " + name + ": " + e.message); }
}

// ---- 1. thickness: global ringWidthPct drives stroke width ----
check("global ringWidthPct sets track stroke width", () => {
  const L = computeLayout({ ...base, rings: [ring({})] });
  const track = L.arcs.find((a) => a.key === "track-0");
  assert.ok(track, "track arc missing");
  assert.equal(track!.strokeWidth, TH0); // 16.92
});

// ---- 2. thickness: per-entity thicknessPct overrides global ----
check("per-entity thicknessPct overrides global", () => {
  // outer ring reserves its own half stroke: rBase 94 - 94*0.4/2 = 75.2
  const r0_40 = Math.max(10, RBASE - Math.max(4, RBASE * (40 / 100)) / 2);
  const L = computeLayout({ ...base, rings: [ring({ thicknessPct: 40 })] });
  const track = L.arcs.find((a) => a.key === "track-0");
  assert.equal(track!.strokeWidth, Math.max(4, r0_40 * (40 / 100)));
});

// ---- 3. stacking: entity 0 outside, entity 1 inside ----
check("two rings stack outside-in", () => {
  const L = computeLayout({ ...base, rings: [ring({ idx: 0 }), ring({ idx: 1 })] });
  assert.equal(L.ringCount, 2);
  const t0 = L.arcs.find((a) => a.key === "track-0")!;
  const t1 = L.arcs.find((a) => a.key === "track-1")!;
  assert.equal(t0.strokeWidth, TH0);
  assert.equal(t1.strokeWidth, TH0);
  const d0 = t0.d, d1 = t1.d;
  assert.notEqual(d0, d1, "arcs must sit at different radii");
  // inner ring radius: R0 - TH0 - GAP0 = 84.6 - 16.92 - 4.23 = 63.45
  const innerR = R0 - TH0 - GAP0;
  const gotR = parseFloat(d1.match(/A ([\\d.]+) /)![1]);
  assert.ok(Math.abs(gotR - innerR) < 0.01, "inner radius looks wrong: " + d1);
});

// ---- 4. invisible ring (no ring, no marker) does not consume space ----
check("ring with showRing=false && showMarker=false is skipped", () => {
  const L = computeLayout({
    ...base,
    rings: [ring({ idx: 0, showRing: false, showMarker: false }), ring({ idx: 1, thicknessPct: 40 })],
  });
  assert.equal(L.ringCount, 1);
  const t = L.arcs.find((a) => a.key === "track-1");
  assert.ok(t, "second ring should still render (and take outer slot)");
  // the surviving ring becomes the outer one: reserve its own half stroke
  const r0_40 = Math.max(10, RBASE - Math.max(4, RBASE * (40 / 100)) / 2);
  assert.equal(t!.strokeWidth, Math.max(4, r0_40 * (40 / 100)));
});

// ---- 5. marker-only ring: no arcs, marker at value angle ----
// Widget convention: angles measured CLOCKWISE from 12 o'clock
// (x = cx + r*sin(a), y = cy - r*cos(a)).
function polarCw(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}
check("marker-only ring emits marker dot, no arcs", () => {
  const L = computeLayout({ ...base, rings: [ring({ showRing: false, showMarker: true, value: 50 })] });
  assert.equal(L.arcs.length, 0);
  assert.equal(L.markers.length, 1);
  // frac 0.5 → startDeg 230 + sweep 260*0.5 = 360 ≡ 0° (12 o'clock)
  const m = L.markers[0];
  const [mx, my] = polarCw(100, 100, R0, 360);
  assert.ok(Math.abs(m.x - mx) < 1e-6, "marker x off: " + m.x);
  assert.ok(Math.abs(m.y - my) < 1e-6, "marker y off: " + m.y);
});

// ---- 6. ring + marker together both present ----
check("ring + marker both rendered when both enabled", () => {
  const L = computeLayout({ ...base, rings: [ring({ showRing: true, showMarker: true, value: 25 })] });
  assert.ok(L.arcs.some((a) => a.key === "track-0"));
  assert.ok(L.arcs.some((a) => a.key === "prog-0"));
  assert.equal(L.markers.length, 1);
});

// ---- 7. marker hidden when value missing ----
check("marker omitted for null value", () => {
  const L = computeLayout({ ...base, rings: [ring({ showRing: false, showMarker: true, value: null })] });
  assert.equal(L.ringCount, 0);
  assert.equal(L.markers.length, 0);
});

// ---- 8. centre value: entity selection + per-entity decimals/unit ----
check("centre honours centreEntity=1 and that entity's decimals/unit", () => {
  const L = computeLayout({
    ...base,
    centreEntity: 1,
    rings: [
      ring({ idx: 0, value: 11.111, unit: "A", decimals: 2 }),
      ring({ idx: 1, value: 22.222, unit: "V", decimals: 0, showUnit: true }),
    ],
  });
  assert.ok(L.centre, "centre missing");
  assert.equal(L.centre!.valueText, "22");
  assert.equal(L.centre!.unitText, "V");
});

// ---- 9. centre unit: per-entity showUnit=false suppresses unit ----
check("centre unit suppressed when entity showUnit=false", () => {
  const L = computeLayout({
    ...base,
    centreShowUnit: true,
    rings: [ring({ idx: 0, showUnit: false, unit: "kW" })],
  });
  assert.equal(L.centre!.valueText, "50.0");
  assert.equal(L.centre!.unitText, "");
});

// ---- 10. centre unit: centreShowUnit=false overrides entity ----
check("centreShowUnit=false suppresses unit even when entity allows it", () => {
  const L = computeLayout({ ...base, centreShowUnit: false, rings: [ring({})] });
  assert.equal(L.centre!.unitText, "");
});

// ---- 11. centre null value shows em dash ----
check("centre value of null renders em dash", () => {
  const L = computeLayout({ ...base, rings: [ring({ value: null })] });
  assert.equal(L.centre!.valueText, "-");
  assert.equal(L.centre!.unitText, "kW");
});

// ---- 12. ticks ----
check("ticks rendered at requested count outside r0", () => {
  const L = computeLayout({ ...base, showTicks: true, tickCount: 5, rings: [ring({})] });
  assert.equal(L.ticks.length, 5);
  const t = L.ticks[0];
  const len = Math.max(3, (Math.min(200, 200) / 2) * (6 / 100));
  // with ticks enabled rBase shrinks first: 100 - 6 - (len + 2) = 86,
  // then the outer ring's half stroke is reserved: 86 - 86*0.2/2 = 77.4
  const rBaseT = Math.max(10, 100 - 6 - (len + 2));
  const r0T = Math.max(10, rBaseT - Math.max(4, rBaseT * (Math.min(100, Math.max(4, 20)) / 100)) / 2);
  const a0 = 180 + (360 - 260) / 2; // 230° clockwise from 12 o'clock
  const [x1, y1] = polarCw(100, 100, r0T + 2, a0);
  const [x2, y2] = polarCw(100, 100, r0T + 2 + len, a0);
  assert.ok(Math.abs(t.x1 - x1) < 1e-6, "tick x1 off: " + t.x1);
  assert.ok(Math.abs(t.y1 - y1) < 1e-6, "tick y1 off: " + t.y1);
  assert.ok(Math.abs(t.x2 - x2) < 1e-6, "tick x2 off: " + t.x2);
  assert.ok(Math.abs(t.y2 - y2) < 1e-6, "tick y2 off: " + t.y2);
});

// ---- 13. ticks off → none ----
check("showTicks=false → no ticks", () => {
  const L = computeLayout({ ...base, showTicks: false, rings: [ring({})] });
  assert.equal(L.ticks.length, 0);
});

// ---- 14. track arc has no strokeLinecap, progress arc does ----
check("progress arc uses round cap; track does not", () => {
  const L = computeLayout({ ...base, rings: [ring({ value: 30 })] });
  const track = L.arcs.find((a) => a.key === "track-0")!;
  const prog = L.arcs.find((a) => a.key === "prog-0")!;
  assert.equal(track.strokeLinecap, undefined);
  assert.equal(prog.strokeLinecap, "round");
  assert.equal(track.strokeWidth, prog.strokeWidth);
});

// ---- 15. invalid centreEntity clamps to 0 ----
check("centreEntity out of range clamps", () => {
  const L = computeLayout({ ...base, centreEntity: 5, rings: [ring({ value: 7.5, decimals: 1 })] });
  assert.equal(L.centre!.valueText, "7.5");
});

// ---- 16. entity-row zone layout (per-entity icon/name/value + placements) ----
const rowBase = {
  showRowIcon: true, showRowName: true, showRowValue: true,
  iconPlacement: "before-name", valuePlacement: "far-right",
};
check("default layout: value pinned right, icon+name in centre cluster", () => {
  const z = buildRowZones({ ...rowBase });
  assert.deepEqual(z.left, []);
  assert.deepEqual(z.center, ["icon", "name"]);
  assert.deepEqual(z.right, ["value"]);
});
check("value far-left: value pinned left, cluster keeps icon+name", () => {
  const z = buildRowZones({ ...rowBase, valuePlacement: "far-left" });
  assert.deepEqual(z.left, ["value"]);
  assert.deepEqual(z.center, ["icon", "name"]);
  assert.deepEqual(z.right, []);
});
check("hidden elements occupy no slot", () => {
  const z = buildRowZones({ ...rowBase, showRowValue: false });
  assert.deepEqual(z.right, []);
  assert.deepEqual(z.center, ["icon", "name"]);
  const z2 = buildRowZones({ ...rowBase, showRowName: false, showRowIcon: false });
  assert.deepEqual(z2, { left: [], center: [], right: ["value"] });
});
check("icon far-left + value far-right: name centred between edge pins", () => {
  const z = buildRowZones({ ...rowBase, iconPlacement: "far-left" });
  assert.deepEqual(z.left, ["icon"]);
  assert.deepEqual(z.center, ["name"]);
  assert.deepEqual(z.right, ["value"]);
});
check("value after-name stays in the cluster, after the name", () => {
  const z = buildRowZones({ ...rowBase, valuePlacement: "after-name" });
  assert.deepEqual(z.center, ["icon", "name", "value"]);
  assert.deepEqual(z.right, []);
});
check("value before-name: cluster reads icon, value, name", () => {
  const z = buildRowZones({ ...rowBase, valuePlacement: "before-name" });
  assert.deepEqual(z.center, ["icon", "value", "name"]);
  assert.deepEqual(z.right, []);
});
check("both far-left: value outermost on the left edge", () => {
  const z = buildRowZones({ ...rowBase, valuePlacement: "far-left", iconPlacement: "far-left" });
  assert.deepEqual(z.left, ["value", "icon"]);
  assert.deepEqual(z.center, ["name"]);
});
check("both far-right: value outermost on the right edge", () => {
  const z = buildRowZones({ ...rowBase, valuePlacement: "far-right", iconPlacement: "far-right" });
  assert.deepEqual(z.right, ["icon", "value"]);
  assert.deepEqual(z.center, ["name"]);
});
check("icon after-name: cluster reads name, icon", () => {
  const z = buildRowZones({ ...rowBase, iconPlacement: "after-name" });
  assert.deepEqual(z.center, ["name", "icon"]);
  assert.deepEqual(z.right, ["value"]);
});
check("name only: single centre slot", () => {
  const z = buildRowZones({
    showRowIcon: false, showRowName: true, showRowValue: false,
    iconPlacement: "before-name", valuePlacement: "far-right",
  });
  assert.deepEqual(z, { left: [], center: ["name"], right: [] });
});

// ---- 17. centre unit position validation ----
check("normCentreUnitPos passes valid values through", () => {
  assert.equal(normCentreUnitPos("below"), "below");
  assert.equal(normCentreUnitPos("above"), "above");
  assert.equal(normCentreUnitPos("before"), "before");
  assert.equal(normCentreUnitPos("after"), "after");
});
check("normCentreUnitPos falls back on junk (default below)", () => {
  assert.equal(normCentreUnitPos(undefined), "below");
  assert.equal(normCentreUnitPos("side"), "below");
  assert.equal(normCentreUnitPos(""), "below");
  assert.equal(normCentreUnitPos(5), "below");
});

// ---- 18. numeric offset clamping (unit + rows sliders) ----
check("clampNum clamps to range and falls back on junk", () => {
  assert.equal(clampNum(1.4, -2, 2, 0), 1.4);
  assert.equal(clampNum(9, -2, 2, 0), 2);
  assert.equal(clampNum(-9, -2, 2, 0), -2);
  assert.equal(clampNum(0, -2, 2, 0), 0);
  assert.equal(clampNum(undefined, -2, 2, 0), 0);
  assert.equal(clampNum("abc", -2, 2, 0), 0);
  assert.equal(clampNum(null, -2, 2, 0), 0);
  assert.equal(clampNum("1.2", -2, 2, 0), 1.2);
  assert.equal(clampNum(4, -3, 3, 0), 3);
});

// ---- 19. track toggle + visibility ----
check("showTrack=false drops the shaded remainder, progress stays", () => {
  const L = computeLayout({ ...base, showTrack: false, rings: [ring({ value: 30 })] });
  assert.ok(!L.arcs.some((a) => a.key === "track-0"), "track must be gone");
  assert.ok(L.arcs.some((a) => a.key === "prog-0"), "progress arc must remain");
});
check("trackVisibility passes through as the track arc opacity", () => {
  const L = computeLayout({ ...base, trackOpacity: 0.55, rings: [ring({})] });
  const track = L.arcs.find((a) => a.key === "track-0")!;
  assert.equal(track.opacity, 0.55);
  const L2 = computeLayout({ ...base, trackOpacity: 0, rings: [ring({})] });
  assert.equal(L2.arcs.find((a: any) => a.key === "track-0")!.opacity, 0);
});

// ---- 20. gradient-follow track toggle (trackGradient) ----
const smoothStops = [{ v: 0, colour: "#ff0000" }, { v: 100, colour: "#0000ff" }];

check("trackGradient=true with gradient style paints 64 slices, no solid track", () => {
  const L = computeLayout({
    ...base,
    trackGradient: true,
    rings: [ring({ value: 30, style: "gradient", stopsList: smoothStops })],
  });
  const slices = L.arcs.filter((a) => a.key.startsWith("trackgrad-"));
  assert.equal(slices.length, 64, "expected 64 gradient slices");
  assert.ok(!L.arcs.some((a) => a.key === "track-0"), "solid track must be replaced by slices");
  assert.ok(slices.every((a) => a.opacity === base.trackOpacity), "slices use the track opacity");
  assert.ok(slices[0].fill !== slices[63].fill, "slice colours vary along the scale");
});

check("trackGradient=true with interpolated style also slices", () => {
  const L = computeLayout({
    ...base,
    trackGradient: true,
    rings: [ring({ value: 30, style: "interpolated", stopsList: smoothStops })],
  });
  assert.equal(L.arcs.filter((a) => a.key.startsWith("trackgrad-")).length, 64);
});

check("trackGradient=true with fixed style stays a single solid track", () => {
  const L = computeLayout({ ...base, trackGradient: true, rings: [ring({ value: 30 })] });
  assert.ok(L.arcs.some((a) => a.key === "track-0"), "solid track remains for non-smooth styles");
  assert.equal(L.arcs.filter((a) => a.key.startsWith("trackgrad-")).length, 0);
});

check("trackGradient=false with gradient style stays a single solid track", () => {
  const L = computeLayout({
    ...base,
    rings: [ring({ value: 30, style: "gradient", stopsList: smoothStops })],
  });
  assert.ok(L.arcs.some((a) => a.key === "track-0"), "solid track remains when toggle is off");
  assert.equal(L.arcs.filter((a) => a.key.startsWith("trackgrad-")).length, 0);
});

// ---- 21. the arc never crops off the widget (stroke reservation) ----
check("outer stroke fits the box: r0 + thick/2 <= rBase, ticks or not", () => {
  for (const cfg of [
    { ...base, rings: [ring({})] },
    { ...base, rings: [ring({ thicknessPct: 60 })] },
    { ...base, showTicks: true, rings: [ring({})] },
    { ...base, sweep: 360, rings: [ring({})] },
  ]) {
    const L = computeLayout(cfg);
    assert.ok(L.outerThick > 0, "outerThick missing");
    // extent of the outer stroke from centre, vs the box half minus pad
    const half = Math.min(cfg.w, cfg.h) / 2;
    const len = cfg.showTicks ? Math.max(3, (half) * (cfg.tickSize / 100)) : 0;
    const rBase = Math.max(10, half - 6 - (len > 0 ? len + 2 : 0));
    assert.ok(
      L.r0 + L.outerThick / 2 <= rBase + 1e-9,
      "arc crops the box: r0 " + L.r0 + " + thick/2 " + L.outerThick / 2 + " > rBase " + rBase,
    );
    // ticks sit between r0+2 and r0+2+len, also inside rBase
    if (cfg.showTicks) {
      assert.ok(L.r0 + 2 + len <= rBase + 1e-9, "ticks crop the box");
    }
  }
});

// ---- 21. rows anchor: 0 em = snug under the arc ends ----
check("rowsTopY anchors at the arc ends for a bottom-gapped sweep", () => {
  const L = computeLayout({ ...base, rings: [ring({})] });
  // sweep 260 -> halfGap 50 deg, arc ends cos(50) below centre
  const halfGap = (360 - 260) / 2;
  const arcEndY = 100 + R0 * Math.cos((halfGap * Math.PI) / 180);
  const want = Math.max(arcEndY, 100) + TH0 / 2 + 2;
  assert.ok(Math.abs(L.rowsTopY - want) < 1e-9, "rowsTopY " + L.rowsTopY + " != " + want);
});
check("rowsTopY clamps to the centre line when the ends rise above it", () => {
  const L = computeLayout({ ...base, sweep: 90, rings: [ring({})] });
  assert.ok(Math.abs(L.rowsTopY - (100 + TH0 / 2 + 2)) < 1e-9, "expected centre-line anchor");
});

// ---- 22. attention state (active-on-sensor) ----
const st = (state: string, extra: any = {}) => ({ state, attributes: extra });
check("attention off by default; icon keeps its own colour", () => {
  const a = resolveAttention({ entityId: "sensor.batt" }, "sensor.batt", { "sensor.batt": st("on") });
  assert.equal(a.on, false);
  assert.equal(a.active, false);
  assert.equal(a.color, null);
});
check("attention active on a matching state, colour picked up", () => {
  const a = resolveAttention(
    { entityId: "sensor.batt", attentionOn: true, attentionState: "on", attentionColor: "#ff5252" },
    "sensor.batt",
    { "sensor.batt": st("on") },
  );
  assert.equal(a.active, true);
  assert.equal(a.stateText, "on");
  assert.equal(a.color, "#ff5252");
});
check("blank match state: any but off-ish counts as active", () => {
  const f = (state: string) => resolveAttention(
    { entityId: "sensor.batt", attentionOn: true }, "sensor.batt", { "sensor.batt": st(state) });
  assert.equal(f("open").active, true);
  assert.equal(f("charging").active, true);
  assert.equal(f("off").active, false);
  assert.equal(f("closed").active, false);
  assert.equal(f("unavailable").active, false);
  assert.equal(f("").active, false);
});
check("match is case-insensitive; state text keeps original case", () => {
  const a = resolveAttention(
    { entityId: "sensor.batt", attentionOn: true, attentionState: "Charging" },
    "sensor.batt",
    { "sensor.batt": st("charging") },
  );
  assert.equal(a.active, true);
  assert.equal(a.stateText, "charging");
  assert.equal(resolveAttention(
    { entityId: "sensor.batt", attentionOn: true, attentionState: "on" },
    "sensor.batt", { "sensor.batt": st("Charging") }).active, false);
});
check("watches another entity (entity@attribute supported)", () => {
  const dict = {
    "sensor.batt": st("88"),
    "binary_sensor.door": st("on"),
    "sensor.charger": st("ok", { charging: "yes" }),
  };
  const a = resolveAttention(
    { entityId: "sensor.batt", attentionOn: true, attentionEntity: "binary_sensor.door", attentionState: "on" },
    "sensor.batt", dict);
  assert.equal(a.watchId, "binary_sensor.door");
  assert.equal(a.active, true);
  assert.equal(a.stateText, "on");
  const b = resolveAttention(
    { entityId: "sensor.batt", attentionOn: true, attentionEntity: "sensor.charger@charging", attentionState: "yes" },
    "sensor.batt", dict);
  assert.equal(b.watchAttr, "charging");
  assert.equal(b.active, true);
  assert.equal(b.stateText, "yes");
});
check("status text defaults clamp into range", () => {
  const a = resolveAttention({ entityId: "s", attentionOn: true, attentionTextX: 500, attentionTextY: -20, attentionTextAlign: "diagonal", attentionTextMode: "junk" } as any, "s", { s: st("on") });
  assert.equal(a.x, 100);
  assert.equal(a.y, 0);
  assert.equal(a.align, "center");
  assert.equal(a.textMode, "state");
  assert.equal(a.pulse, true); // default on
  assert.equal(a.showText, false); // default off
});

// ---- 23. hexA + normAlign ----
check("hexA renders #rrggbb with alpha, junk falls back neutral", () => {
  assert.equal(hexA("#ff0000", 0.5), "rgba(255,0,0,0.5)");
  assert.equal(hexA("#26c6da", 0.22), "rgba(38,198,218,0.22)");
  assert.equal(hexA("nope", 0.5), "rgba(127,127,127,0.5)");
});
check("normAlign validates left/centre/right", () => {
  assert.equal(normAlign("left", "center"), "left");
  assert.equal(normAlign("right", "center"), "right");
  assert.equal(normAlign(undefined, "center"), "center");
  assert.equal(normAlign("LEFT", "center"), "center");
});

// ---- 24. centre per-item scales + icon vertical position ----
check("per-item centre scales multiply on top of the master", () => {
  const r = ring({ value: 50 });
  const L1 = computeLayout({ ...base, rings: [r] });
  const L2 = computeLayout({
    ...base,
    centreValueScale: 2, centreUnitScale: 3, centreIconScale: 0.5,
    rings: [r],
  });
  assert.ok(L1.centre && L2.centre, "centre missing");
  assert.ok(Math.abs(L2.centre!.valuePx - L1.centre!.valuePx * 2) < 1e-9, "value scale off");
  assert.ok(Math.abs(L2.centre!.unitPx - L1.centre!.unitPx * 3) < 1e-9, "unit scale off");
  assert.ok(Math.abs(L2.centre!.iconPx - L1.centre!.iconPx * 0.5) < 1e-9, "icon scale off");
});

check("iconPx default still matches the legacy valuePx * 0.38 clamp", () => {
  const L = computeLayout({ ...base, centreScale: 2, rings: [ring({ value: 50 })] });
  const legacy = Math.max(10, Math.min(30, L.centre!.valuePx * 0.38));
  assert.equal(L.centre!.iconPx, legacy);
});

check("centreIconY: 50 keeps the natural spot, ends shift half the gauge", () => {
  const r = ring({ value: 50 });
  const mid = computeLayout({ ...base, rings: [r] });
  assert.equal(mid.centre!.iconDy, 0);
  const up = computeLayout({ ...base, centreIconY: 0, rings: [r] });
  assert.equal(up.centre!.iconDy, -100); // h = 200: half up
  const down = computeLayout({ ...base, centreIconY: 100, rings: [r] });
  assert.equal(down.centre!.iconDy, 100); // half down
});

// ---- 25. centre value+unit vertical slider (centreValueY) ----
check("centreValueY: 50 centred, ends shift half the gauge, icon independent", () => {
  const r = ring({ value: 50 });
  const mid = computeLayout({ ...base, rings: [r] });
  assert.equal(mid.centre!.valueDy, 0);
  const up = computeLayout({ ...base, centreValueY: 0, rings: [r] });
  assert.equal(up.centre!.valueDy, -100); // h = 200: half up
  assert.equal(up.centre!.iconDy, 0); // the value slider never moves the icon
  const dn = computeLayout({ ...base, centreValueY: 100, centreIconY: 100, rings: [r] });
  assert.equal(dn.centre!.valueDy, 100);
  assert.equal(dn.centre!.iconDy, 100); // both sliders stack independently
});

console.log("\\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
`;

const tmp = await mkdtemp(join(tmpdir(), "fh-smoke-"));
const entry = join(tmp, "entry.ts");
await writeFile(entry, RUNNER);

await build({
  entryPoints: [entry],
  outfile: join(tmp, "bundle.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  absWorkingDir: root,
  tsconfig: join(root, "tsconfig.json"),
  jsx: "automatic",
  alias: {
    "@/lib/ui/glass": join(root, "scripts/__stubs__/glass.ts"),
    "@/lib/ha/useHaLiveStates": join(root, "scripts/__stubs__/useHaLiveStates.ts"),
  },
  logLevel: "silent",
});

const { execFileSync } = await import("node:child_process");
const out = execFileSync(process.execPath, [join(tmp, "bundle.mjs")], {
  encoding: "utf8",
  env: { ...process.env, NODE_OPTIONS: "" },
});

console.log(out);
await rm(tmp, { recursive: true, force: true });

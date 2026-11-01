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
import { computeLayout, buildRowZones, type ResolvedRing } from "@/components/widgets/FlexHorseshoeWidget";
import assert from "node:assert";

function ring(o: Partial<ResolvedRing>): ResolvedRing {
  return {
    idx: 0, id: "sensor.demo", attr: null, label: "Demo", min: 0, max: 100,
    style: "fixed", stopsList: [], thicknessPct: null, value: 50, unit: "kW",
    showUnit: true, decimals: 1, showRing: true, showMarker: false,
    entColor: null, fallbackColour: null,
    showRowIcon: true, showRowName: true, showRowValue: true,
    iconPlacement: "before-name", valuePlacement: "far-right", rowAlign: "left",
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
  rings: [],
};

// pad(6) + min(200,200)/2 - 6 = 94 (no ticks)
const R0 = 94;

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
  assert.equal(track!.strokeWidth, Math.max(4, R0 * 0.20)); // 18.8
});

// ---- 2. thickness: per-entity thicknessPct overrides global ----
check("per-entity thicknessPct overrides global", () => {
  const L = computeLayout({ ...base, rings: [ring({ thicknessPct: 40 })] });
  const track = L.arcs.find((a) => a.key === "track-0");
  assert.equal(track!.strokeWidth, Math.max(4, R0 * 0.40)); // 37.6
});

// ---- 3. stacking: entity 0 outside, entity 1 inside ----
check("two rings stack outside-in", () => {
  const L = computeLayout({ ...base, rings: [ring({ idx: 0 }), ring({ idx: 1 })] });
  assert.equal(L.ringCount, 2);
  const t0 = L.arcs.find((a) => a.key === "track-0")!;
  const t1 = L.arcs.find((a) => a.key === "track-1")!;
  // radius must differ: r1 = r0 - thick0 - gap
  const th0 = Math.max(4, R0 * 0.2), gap = Math.max(2, R0 * 0.05);
  assert.equal(t0.strokeWidth, th0);
  assert.equal(t1.strokeWidth, th0);
  const d0 = t0.d, d1 = t1.d;
  assert.notEqual(d0, d1, "arcs must sit at different radii");
  // outer arc path radius ~ R0, inner ~ R0 - th0 - gap = 94 - 18.8 - 4.7 = 70.5
  assert.ok(d1.includes(Math.round(R0 - th0 - gap - 1) + ""), "inner radius looks wrong: " + d1);
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
  assert.equal(t!.strokeWidth, Math.max(4, R0 * 0.4));
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
  assert.equal(L.centre!.valueText, "—");
  assert.equal(L.centre!.unitText, "kW");
});

// ---- 12. ticks ----
check("ticks rendered at requested count outside r0", () => {
  const L = computeLayout({ ...base, showTicks: true, tickCount: 5, rings: [ring({})] });
  assert.equal(L.ticks.length, 5);
  const t = L.ticks[0];
  const len = Math.max(3, 100 * 0.06);
  // with ticks enabled r0 shrinks: min(w,h)/2 - pad - (tickLen + 2) = 86
  const r0T = 100 - 6 - (len + 2);
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

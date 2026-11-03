// Power Sankey geometry smoke test - esbuild-bundle the widget (pure helpers
// only, no DOM) and assert on computeLayout output. No jsdom needed.
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const temp = await mkdtemp(join(tmpdir(), "mf-sankey-"));

try {
  const outfile = join(temp, "bundle.mjs");

  await build({
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    absWorkingDir: root,
    tsconfig: join(root, "tsconfig.json"),
    jsx: "automatic",
    alias: {
      // A default export must exist on the stub side or the bundle fails.
      "@/lib/ui/glass": join(root, "scripts/__stubs__/glass.ts"),
    },
    logLevel: "silent",
    stdin: {
      // sanity: the widget component must also bundle (React "use client").
      contents: `
        export { computeLayout, toWatts, toPercent } from "@/components/widgets/PowerSankeyWidget";
        export { default as Widget } from "@/components/widgets/PowerSankeyWidget";
      `,
      resolveDir: root,
      loader: "ts",
      sourcefile: "sankey-entry.ts",
    },
  });

  const src = `
    import { computeLayout, toWatts, toPercent, Widget } from ${JSON.stringify(outfile)};
    let ok = 0, fail = 0;
    const check = (name, cond) => {
      if (cond) { ok++; console.log("ok   " + name); }
      else { fail++; console.log("FAIL " + name); }
    };

    // --- unit conversion -------------------------------------------------
    check("kW state converts to watts", toWatts({ state: "2.5", attributes: { unit_of_measurement: "kW" } }) === 2500);
    check("unavailable state reads as null", toWatts({ state: "unavailable" }) === null);
    check("unknown state reads as null", toWatts({ state: "unknown" }) === null);
    check("MW state converts to watts", toWatts({ state: "0.002", attributes: { unit_of_measurement: "MW" } }) === 2000);
    check("W state passes through", toWatts({ state: "150", attributes: { unit_of_measurement: "W" } }) === 150);
    check("percent 0-83 reads as 83", toPercent({ state: "0.83" }) === 83);
    check("percent 83 reads as 83", toPercent({ state: "83" }) === 83);
    check("percent clamps above 100", toPercent({ state: "140" }) === 100);

    // --- layout ----------------------------------------------------------
    const C = { import: "#7986cb", export: "#66bb6a", solar: "#ffca28", battOut: "#26c6da", battIn: "#ab47bc", consumer: "#90a4ae" };
    const size = { w: 400, h: 300 };
    const Fbase = { gi: 0, ge: 0, solar: 0, bd: 0, bc: 0, battLevel: null, homeLoad: 0, cons: [], otherV: 0, hasGrid: true, hasBattery: true };
    const keys = (L) => [...L.bands.map((b) => b.key), ...L.nodeBars.map((n) => n.key)];

    // 1. importing: grid + solar on the left, two consumers on the right
    const L1 = computeLayout(size, C, { ...Fbase, gi: 1000, solar: 2000, homeLoad: 3000,
      cons: [{ entityId: "sensor.fridge", label: "Fridge", colour: "#ef4444", v: 200 }, { entityId: "sensor.other", label: "Other", colour: "#90a4ae", v: 800 }], otherV: 2000 },
      "Other", "Home", "sensor.grid");
    check("importing: grid node on the left", L1.srcNodes.some((n) => n.key === "grid"));
    check("importing: solar node on the left", L1.srcNodes.some((n) => n.key === "solar"));
    check("importing: no grid-out node", !L1.conNodes.some((n) => n.key === "grid-out"));
    check("importing: grid-in band drawn", L1.bands.some((b) => b.key === "grid-in"));
    check("importing: solar band drawn", L1.bands.some((b) => b.key === "solar-in"));
    check("importing: two consumer bands", L1.bands.filter((b) => b.key.startsWith("con")).length === 2);
    check("importing: other band drawn", L1.bands.some((b) => b.key === "other-band"));
    check("importing: home bar taller than zero", L1.home.h > 0);

    // 2. exporting: grid moves to the right side
    const L2 = computeLayout(size, C, { ...Fbase, gi: 0, ge: 1500, solar: 2500, homeLoad: 1000, cons: [], otherV: 0 },
      "Other", "Home", "sensor.grid");
    check("exporting: grid-out node on the right", L2.conNodes.some((n) => n.key === "grid-out" && n.isGridExport));
    check("exporting: no grid node on the left", !L2.srcNodes.some((n) => n.key === "grid"));
    check("exporting: grid-out band drawn", L2.bands.some((b) => b.key === "grid-out-band"));

    // 3. all flows zero: sources and consumers disappear entirely
    const L3 = computeLayout(size, C, Fbase, "Other", "Home", "sensor.grid");
    check("zero flow: no source nodes", L3.srcNodes.length === 0);
    check("zero flow: no bands", L3.bands.length === 0);
    check("zero flow: only the home bar remains", L3.nodeBars.length === 1 && L3.nodeBars[0].key === "home");

    // 4. battery charging draws on the RIGHT, discharging on the left
    const L4 = computeLayout(size, C, { ...Fbase, bd: 300, bc: 500, battLevel: 64, homeLoad: 300, cons: [], otherV: 300 },
      "Other", "Home", "sensor.grid");
    check("battery: discharge node on the left", L4.srcNodes.some((n) => n.key === "battery"));
    check("battery: discharge band drawn", L4.bands.some((b) => b.key === "battery-in"));
    check("battery: charge node on the right", L4.conNodes.some((n) => n.key === "battery-charge" && n.isBattCharge));
    check("battery: charge band drawn on the right", L4.bands.some((b) => b.key === "battery-charge-band"));
    check("battery: no charge band on the left", !L4.bands.some((b) => b.key === "battery-out"));
    check("battery: right order is battery-charge then other", L4.conNodes.map((n) => n.key).join(",") === "battery-charge,other");

    // 4b. charging only: nothing on the left, charge on the right
    const L4b = computeLayout(size, C, { ...Fbase, bd: 0, bc: 800, homeLoad: 200, cons: [], otherV: 200 },
      "Other", "Home", "sensor.grid");
    check("charge only: no battery node on the left", !L4b.srcNodes.some((n) => n.key === "battery"));
    check("charge only: battery-charge on the right", L4b.conNodes.some((n) => n.key === "battery-charge"));

    // 4c. measured label sizes drive the gutters and the label scales
    const Lp = computeLayout(size, C, { ...Fbase, gi: 1000, homeLoad: 1000,
      cons: [{ entityId: "sensor.s", label: "S", colour: "#c", v: 400 }], otherV: 600 },
      "Other", "Home", "sensor.grid", { src: { w: 120, h: 30 }, con: { w: 60, h: 30 } });
    check("label gutters: left hugs measured src width", Math.abs(Lp.leftBarX - (8 + 128)) < 0.001);
    check("label gutters: right hugs measured con width", Math.abs(Lp.rightBarX - (400 - 8 - 68 - Lp.bw)) < 0.001);
    check("label scales: roomy box keeps full size", Lp.conLabelScale.every((s) => s === 1) && Lp.srcLabelScale.every((s) => s === 1));
    const Ld = computeLayout(size, C, { ...Fbase, gi: 1000, homeLoad: 1000, cons: [], otherV: 1000 },
      "Other", "Home", "sensor.grid");
    const fallback = Math.min(Math.max(400 * 0.22, 70), 150, Math.max(20, (400 - 16 - 6 * Ld.bw) / 2));
    check("label gutters: fixed-formula fallback without measurements", Math.abs(Ld.leftBarX - (8 + fallback)) < 0.001);
    check("label scales: unmeasured defaults to full size", Ld.conLabelScale.every((s) => s === 1));

    // 4d. a tall stack shrinks to fit the box instead of clipping past it
    const cons13 = Array.from({ length: 13 }, (_, i) => ({ entityId: "sensor.c" + i, label: "C" + i, colour: "#c", v: 100 }));
    const shortBox = { w: 715, h: 162 };
    const Lf = computeLayout(shortBox, C, { ...Fbase, gi: 11000, solar: 1800, bc: 9000, battLevel: 64, homeLoad: 3900, cons: cons13, otherV: 1300 },
      "Other", "Home", "sensor.grid", { src: { w: 80, h: 54 }, con: { w: 90, h: 36 } });
    const cTop = Math.min(...Lf.conNodes.map((n) => n.top));
    const cBot = Math.max(...Lf.conNodes.map((n) => n.top + n.h));
    check("fit: 14-node stack stays inside the box", cBot <= 162 - 8 + 0.5 && cTop >= 8 - 0.5);
    check("fit: no source node clips either", Math.max(...Lf.srcNodes.map((n) => n.top + n.h)) <= 162 - 8 + 0.5);
    check("fit: tight slots shrink labels, never below 0.45", Lf.conLabelScale.every((s) => s >= 0.45 && s <= 1));
    check("fit: battery-charge leads the right stack", Lf.conNodes[0].key === "battery-charge");
    // roomy box with EVEN flows: equal bands give 48px slots, pair 36px fits
    const consEven = Array.from({ length: 13 }, (_, i) => ({ entityId: "sensor.e" + i, label: "E" + i, colour: "#c", v: 200 }));
    const Lbig = computeLayout({ w: 715, h: 700 }, C, { ...Fbase, gi: 2600, homeLoad: 2600, cons: consEven, otherV: 0 },
      "Other", "Home", "sensor.grid", { src: { w: 80, h: 54 }, con: { w: 90, h: 36 } });
    check("fit: roomy even box keeps every label at full size", Lbig.conLabelScale.every((s) => s === 1));

    // 5. every band path is a closed cubic curve
    const L5 = computeLayout(size, C, { ...Fbase, gi: 500, solar: 500, homeLoad: 1000, cons: [{ entityId: "s", label: "S", colour: "#c", v: 400 }], otherV: 600 },
      "Other", "Home", "sensor.grid");
    check("bands: all paths start with M and close with Z", L5.bands.every((b) => /^M /.test(b.d) && b.d.trim().endsWith("Z")));
    check("bands: paths carry finite coordinates", L5.bands.every((b) => !/(NaN|Infinity|-Infinity)/.test(b.d)));

    // 6. consumers render in flows-array order (never sorted by value)
    const cons3 = [
      { entityId: "sensor.a", label: "A", colour: "#111111", v: 300 },
      { entityId: "sensor.b", label: "B", colour: "#222222", v: 100 },
      { entityId: "sensor.c", label: "C", colour: "#333333", v: 200 },
    ];
    const L6 = computeLayout(size, C, { ...Fbase, gi: 600, homeLoad: 600, cons: cons3 }, "Other", "Home", "sensor.grid");
    const conNs = L6.conNodes.filter((n) => n.key.startsWith("con"));
    check("order: consumer nodes follow the flows array", conNs.map((n) => n.key).join(",") === "con0,con1,con2");
    check("order: consumers stack top-to-bottom in array order", conNs[0].top < conNs[1].top && conNs[1].top < conNs[2].top);
    check("order: each consumer band keeps its own colour", L6.bands.find((b) => b.key === "con0-band").colour === "#111111" && L6.bands.find((b) => b.key === "con2-band").colour === "#333333");

    // 7. Home bar colour comes from C.home, white when absent
    const L7 = computeLayout(size, { ...C, home: "#ff0000" }, { ...Fbase, gi: 500, homeLoad: 500 }, "Other", "Home", "sensor.grid");
    check("home bar: colour follows C.home", L7.nodeBars.find((n) => n.key === "home").colour === "#ff0000");
    check("home bar: white fallback when C.home unset", L3.nodeBars.find((n) => n.key === "home").colour === "#ffffff");

    // 8. band colours follow the C dict (per-flow colours land in C upstream)
    check("other: band colour follows C.consumer", L1.bands.find((b) => b.key === "other-band").colour === C.consumer);
    check("exporting: grid-out band uses C.export", L2.bands.find((b) => b.key === "grid-out-band").colour === C.export);
    check("battery: discharge band uses C.battOut", L4.bands.find((b) => b.key === "battery-in").colour === C.battOut);
    check("battery: charge band uses C.battIn", L4.bands.find((b) => b.key === "battery-charge-band").colour === C.battIn);

    console.log(fail === 0 ? "ALL PASS (" + ok + ")" : "FAILURES: " + fail);
    process.exit(fail === 0 ? 0 : 1);
  `;
  const testFile = join(temp, "run.mjs");
  const { writeFile } = await import("node:fs/promises");
  await writeFile(testFile, src);

  try {
    const out = execFileSync(process.execPath, [testFile], {
      env: { ...process.env, NODE_OPTIONS: "" },
      encoding: "utf8",
    });
    console.log(out);
  } catch (e) {
    console.log("SMOKE TEST FAILED (exit " + e.status + ")");
    console.log(e.stdout || "");
    console.error(e.stderr || "");
    process.exitCode = 1;
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
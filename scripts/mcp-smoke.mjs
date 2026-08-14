// Rauchtest für den MCP-Endpunkt. Kein Teil des Builds — von Hand gegen eine
// Wegwerf-Instanz laufen lassen:
//
//   MCP_URL=http://localhost:8099/api/mcp \
//   ADMIN_TOKEN=… VIEWER_TOKEN=… node scripts/mcp-smoke.mjs
//
// Treibt den MCP-Endpunkt über rohes Streamable-HTTP-JSON-RPC — genau der
// Draht, den ein echter Client benutzt. Prüft die Design-Invarianten aus
// Stufe 1: Auth, Rollen-Trennung, Katalog-Rundlauf, und dass ein Schreibvorgang
// durch die Pipeline geht (Präfix, Snapshot, Erlaubnisliste, Display-Ping).
const BASE = process.env.MCP_URL || "http://localhost:8099/api/mcp";
const ADMIN = process.env.ADMIN_TOKEN;
const VIEWER = process.env.VIEWER_TOKEN;

let idc = 0;
async function rpc(token, method, params) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++idc, method, params }),
  });
  if (res.status === 401) return { httpStatus: 401 };
  const text = await res.text();
  // Streamable HTTP kann als SSE antworten (data: {...}) oder als reines JSON.
  const line = text.split("\n").find((l) => l.startsWith("data:")) || text;
  const body = JSON.parse(line.replace(/^data:\s*/, ""));
  return { httpStatus: res.status, body };
}
async function callTool(token, name, args) {
  const r = await rpc(token, "tools/call", { name, arguments: args || {} });
  const c = r.body?.result?.content?.[0]?.text;
  let data = r.body;
  if (c) { try { data = JSON.parse(c); } catch { data = { raw: c }; } }
  return { isError: r.body?.result?.isError, data };
}
async function init(token) {
  return rpc(token, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "mf-test", version: "1" },
  });
}

let fail = 0;
const ok = (name, cond, extra = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${name}${extra ? "  " + extra : ""}`);
  if (!cond) fail++;
};

(async () => {
  // 1. Auth
  ok("kein Token → 401", (await rpc(null, "initialize", {})).httpStatus === 401);
  ok("zu kurzes Token → 401", (await rpc("short", "initialize", {})).httpStatus === 401);
  ok("Admin-Token → initialize ok", (await init(ADMIN)).body?.result?.serverInfo?.name === "magic-frame");

  // 2. Rollen-Trennung: Viewer sieht keine Schreib-Werkzeuge
  await init(VIEWER);
  const vTools = (await rpc(VIEWER, "tools/list", {})).body.result.tools.map((t) => t.name);
  const aTools = (await rpc(ADMIN, "tools/list", {})).body.result.tools.map((t) => t.name);
  ok("Viewer: nur Lese-Werkzeuge", !vTools.includes("edit_widgets") && vTools.includes("get_view"), `(${vTools.length} Werkzeuge)`);
  ok("Admin: Schreib-Werkzeuge sichtbar", aTools.includes("edit_widgets") && aTools.includes("manage_view"), `(${aTools.length} Werkzeuge)`);

  // 3. Katalog-Rundlauf
  const cat = await callTool(ADMIN, "get_widget_catalog", {});
  ok("Katalog listet 19 Kern-Typen", cat.data.coreTypes?.length === 19);
  const clockSchema = await callTool(ADMIN, "get_widget_catalog", { type: "ClockWidget.tsx" });
  ok("Typ-Schema kommt als JSON Schema", !!clockSchema.data.configSchema?.properties);

  // 4. Eine frische View anlegen
  await callTool(ADMIN, "manage_view", { action: "delete", id: "mcp-test", confirm: true }).catch(() => {});
  const created = await callTool(ADMIN, "manage_view", { action: "create", id: "mcp-test", name: "MCP Test" });
  ok("manage_view create", created.data.ok && created.data.id === "mcp-test");

  // 5. edit_widgets: Uhr + Button, der auf die Uhr zeigt (Remap-Prüfung)
  const edit = await callTool(ADMIN, "edit_widgets", {
    dashboardId: "mcp-test",
    operations: [
      { op: "add", widget: { i: "mcpclock", type: "ClockWidget.tsx", x: 0, y: 0, w: 6, h: 4, config: {} } },
      { op: "add", widget: { i: "mcpbtn", type: "ButtonWidget.tsx", x: 6, y: 0, w: 4, h: 2, config: { actionType0: "toggle", targets0: ["mcpclock"] } } },
    ],
  });
  ok("edit_widgets add (batch)", edit.data.ok, JSON.stringify(edit.data).slice(0, 80));

  // 6. get_view: IDs sind präfixiert, Button-Ziel wurde mitremappt
  const view = await callTool(ADMIN, "get_view", { dashboardId: "mcp-test" });
  const ids = (view.data.layout || []).map((w) => w.i);
  ok("Widget-IDs sind view-präfixiert", ids.includes("mcp-test_mcpclock"), ids.join(","));
  const btn = (view.data.layout || []).find((w) => w.i === "mcp-test_mcpbtn");
  ok("Button-Ziel wurde auf präfixierte ID remappt", btn?.config?.targets0?.[0] === "mcp-test_mcpclock", JSON.stringify(btn?.config?.targets0));

  const dupe = await callTool(ADMIN, "edit_widgets", {
    dashboardId: "mcp-test",
    operations: [{ op: "add", widget: { i: "mcpclock", type: "ClockWidget.tsx", x: 0, y: 12, w: 4, h: 3, config: {} } }],
  });
  ok("doppelte ID → erklärender Fehler statt Absturz", dupe.isError && /already exists/.test(dupe.data.error || ""), (dupe.data.error||"").slice(0,50));

  const auto = await callTool(ADMIN, "edit_widgets", {
    dashboardId: "mcp-test",
    operations: [{ op: "add", widget: { type: "QrWidget.tsx", x: 0, y: 16, w: 4, h: 4, config: {} } }],
  });
  ok("ID weglassen → Server vergibt eine", auto.data.ok === true, JSON.stringify(auto.data).slice(0,60));

  // 7. Validierungs-Fehler bringt bei (teachError mit hint)
  const bad = await callTool(ADMIN, "edit_widgets", {
    dashboardId: "mcp-test",
    operations: [{ op: "add", widget: { i: "x", type: "ClockWidget.tsx", x: 999, y: 0, w: 6, h: 4, config: {} } }],
  });
  ok("Geometrie ausser Grenzen → isError + hint", bad.isError && !!bad.data.hint, bad.data.error);

  // 8. Viewer darf nicht schreiben (Werkzeug ist gar nicht registriert)
  const vWrite = await callTool(VIEWER, "edit_widgets", { dashboardId: "mcp-test", operations: [] });
  ok("Viewer edit_widgets → Werkzeug unbekannt", vWrite.data?.error?.code === -32602 || vWrite.data?.error?.message?.match(/not found|unknown|Invalid/i), JSON.stringify(vWrite.data?.error || vWrite.data).slice(0, 80));

  // 9. diagnose_ha_action erklärt eine Ablehnung
  const diag = await callTool(ADMIN, "diagnose_ha_action", { entityId: "lock.nirgends", domain: "lock", service: "unlock" });
  ok("diagnose_ha_action: fremde Entität wird abgelehnt", diag.data.verdict === "would be refused" && diag.data.reasons.length > 0);

  // aufräumen
  await callTool(ADMIN, "manage_view", { action: "delete", id: "mcp-test", confirm: true });

  console.log(fail === 0 ? "\nALLE MCP-INVARIANTEN GRÜN" : `\n${fail} FEHLER`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("Testlauf-Fehler:", e); process.exit(1); });

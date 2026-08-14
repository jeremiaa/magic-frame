import { createMcpHandler } from "@modelcontextprotocol/server";
import { authenticateMcp } from "@/lib/mcp/auth";
import { buildMcpServer } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";

/**
 * Der MCP-Endpunkt. Streamable HTTP, zustandslos: pro Anfrage ein frischer
 * Server, aller Zustand liegt in Postgres — passt zur replicas:1-Natur der App.
 *
 * Er sitzt hier als App-Router-Route und nicht als Zweig in server.js, weil er
 * dieselbe In-Prozess-Plumbing braucht wie jede andere Route: global.LIVE_SYNC_IO
 * fürs Display-Ping, den Erlaubnislisten-Cache, die Snapshot-Pipeline. Der
 * Middleware-Matcher fasst nur /editor und /login — /api/mcp bewacht sich also
 * wie jede andere API-Route selbst, hier über den Bearer-Token.
 */
export async function POST(req: Request) {
  const auth = await authenticateMcp(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer", "content-type": "application/json" },
    });
  }
  const handler = createMcpHandler(() => buildMcpServer(auth));
  return handler.fetch(req);
}

// Kein SSE-Stream und keine Wiederaufnahme in v1 — zustandslos, also gibt es
// keinen Kanal, den ein GET/DELETE öffnen oder schliessen könnte.
export function GET() {
  return new Response(null, { status: 405 });
}
export const DELETE = GET;

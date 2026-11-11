import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdmin,
  UnauthorizedError,
  unauthorizedResponse,
  ForbiddenError,
  forbiddenResponse,
} from "@/lib/auth/dal";
import {
  getTunnelStatus,
  startTunnel,
  stopTunnel,
  forgetTunnelToken,
  TunnelError,
} from "@/lib/tunnel/manager";

export const dynamic = "force-dynamic";

/**
 * Der eingebaute Fernzugriff (Cloudflare-Tunnel). Nur für Admins — auch das
 * Lesen: die Antwort enthält die öffentliche Adresse der Installation.
 * Das Tunnel-Token geht nie hinaus, nur ob eines hinterlegt ist.
 */
export async function GET() {
  try {
    await verifyAdmin();
    return NextResponse.json(await getTunnelStatus());
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    console.error("tunnel GET error", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
    const body = (await req.json().catch(() => ({}))) as { action?: unknown; token?: unknown };
    const action = typeof body.action === "string" ? body.action : "";
    try {
      if (action === "start-quick") await startTunnel("quick");
      else if (action === "start-token") await startTunnel("token", typeof body.token === "string" ? body.token : undefined);
      else if (action === "stop") await stopTunnel();
      else if (action === "forget-token") await forgetTunnelToken();
      else return NextResponse.json({ error: "unknown-action" }, { status: 400 });
    } catch (err) {
      if (err instanceof TunnelError) {
        return NextResponse.json({ error: err.problem.code, detail: err.problem.detail, status: await getTunnelStatus() }, { status: 400 });
      }
      throw err;
    }
    return NextResponse.json({ ok: true, status: await getTunnelStatus() });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    console.error("tunnel POST error", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

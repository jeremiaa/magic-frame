import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdmin,
  ForbiddenError,
  forbiddenResponse,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { getTodoistConfig, setTodoistConfig } from "@/lib/todoist/store";
import { listProjects, verifyToken, TodoistError } from "@/lib/todoist/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await verifyAdmin();
    const cfg = await getTodoistConfig();
    let projects: Array<{ id: string; name: string; isInbox?: boolean }> = [];
    let connected = false;
    let error: string | null = null;
    if (cfg.apiToken) {
      try {
        const list = await listProjects();
        projects = list.map((p) => ({ id: p.id, name: p.name, isInbox: p.inbox_project }));
        connected = true;
      } catch (e: any) {
        error = e?.message ?? "Verbindung fehlgeschlagen";
      }
    }
    return NextResponse.json({
      config: { apiToken: cfg.apiToken ? "•".repeat(10) : "" },
      hasToken: !!cfg.apiToken,
      connected,
      error,
      projects,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

/** POST { apiToken } — speichert + testet sofort */
export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
    const body = await req.json().catch(() => ({}));
    const token = typeof body.apiToken === "string" ? body.apiToken.trim() : "";
    if (!token) {
      await setTodoistConfig({ apiToken: "" });
      return NextResponse.json({ ok: true, cleared: true });
    }
    const result = await verifyToken(token);
    if (!result.ok) {
      const detail = result.message || "Todoist hat den Token abgelehnt.";
      return NextResponse.json(
        { error: result.status ? `${detail} (HTTP ${result.status})` : detail },
        { status: 400 },
      );
    }
    await setTodoistConfig({ apiToken: token });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    if (err instanceof TodoistError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

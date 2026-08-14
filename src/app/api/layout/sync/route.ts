import { NextRequest, NextResponse } from "next/server";
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { layoutSyncBodySchema } from "@/lib/widgets/schemas";
import { applyLayoutSync } from "@/lib/layout/apply";

// Die eigentliche Pipeline lebt in src/lib/layout/apply.ts — eine Quelle für
// Editor UND MCP, damit Snapshot, Button-Remap, Erlaubnisliste und
// Display-Ping nie in zwei Kopien auseinanderlaufen.
export async function POST(req: NextRequest) {
  try {
    await verifySession();
    const raw = await req.json();

    const parsed = layoutSyncBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid layout payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await applyLayoutSync(parsed.data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("[sync] error:", error);
    return NextResponse.json(
      {
        error: "Failed to save layout",
        details: {
          message: error?.message,
          code: error?.code,
          meta: error?.meta,
        },
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdmin,
  ForbiddenError,
  forbiddenResponse,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { setModuleEnabled, deleteModule } from "@/lib/modules/store";
import { forgetAllowedEntities } from "@/lib/ha/action-policy";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { enabled: boolean } */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await verifyAdmin();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const enabled = !!body.enabled;
    const row = await setModuleEnabled(id, enabled);
    // What a module's code names only counts while it runs (#147).
    forgetAllowedEntities();
    return NextResponse.json({ ok: true, module: row });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  try {
    await verifyAdmin();
    const { id } = await ctx.params;
    await deleteModule(id);
    forgetAllowedEntities();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

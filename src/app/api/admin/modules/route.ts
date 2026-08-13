import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdmin,
  ForbiddenError,
  forbiddenResponse,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import {
  listModules,
  upsertModule,
  parseManifest,
} from "@/lib/modules/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await verifyAdmin();
    const modules = await listModules();
    return NextResponse.json({ modules });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

/** POST { manifest, bundleJs } — Upload eines neuen oder Update eines bestehenden Moduls. */
export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();
    const body = await req.json().catch(() => ({}));
    const manifest = parseManifest(body.manifest);
    const bundleJs = typeof body.bundleJs === "string" ? body.bundleJs : "";
    const row = await upsertModule({ manifest, bundleJs });
    return NextResponse.json({ ok: true, module: row });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json(
      { error: err?.message || "failed" },
      { status: 400 },
    );
  }
}

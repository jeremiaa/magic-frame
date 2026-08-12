import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdmin,
  ForbiddenError,
  forbiddenResponse,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import {
  getSecurityConfig,
  setSecurityConfig,
  listLockouts,
  listRecentAttempts,
  clearLockout,
} from "@/lib/auth/lockout";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await verifyAdmin();
    const [config, lockouts, attempts] = await Promise.all([
      getSecurityConfig(),
      listLockouts(),
      listRecentAttempts(50),
    ]);
    return NextResponse.json({ config, lockouts, attempts });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

/** PATCH — Security-Config updaten. */
export async function PATCH(req: NextRequest) {
  try {
    await verifyAdmin();
    const body = await req.json().catch(() => ({}));
    const next = await setSecurityConfig(body);
    return NextResponse.json({ ok: true, config: next });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

/** DELETE ?scope=ip:1.2.3.4 — einzelnen Lockout freigeben. */
export async function DELETE(req: NextRequest) {
  try {
    await verifyAdmin();
    const scope = req.nextUrl.searchParams.get("scope");
    if (!scope) {
      return NextResponse.json({ error: "scope param required" }, { status: 400 });
    }
    await clearLockout(scope);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

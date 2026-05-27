import { NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { setDefaultLocale, getDefaultLocale } from "@/lib/i18n/default-locale";

export const dynamic = "force-dynamic";

// Reads + writes the installation's default UI locale. Live-Views inherit
// this through the public /api/locale-default endpoint. Editor users can
// still override per-browser via the locale switcher.

export async function GET() {
  try {
    await verifySession();
    return NextResponse.json({ locale: (await getDefaultLocale()) ?? null });
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "Failed to read locale" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await verifySession();
    const body = await req.json().catch(() => ({}));
    const raw = body?.locale;
    const next = raw === "de" || raw === "en" ? raw : null;
    await setDefaultLocale(next);
    return NextResponse.json({ ok: true, locale: next });
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "Failed to save locale" }, { status: 500 });
  }
}

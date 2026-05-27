import { NextResponse } from "next/server";
import { getDefaultLocale } from "@/lib/i18n/default-locale";

export const dynamic = "force-dynamic";

// Public endpoint — Live-Views (no auth) fetch this on first load so a
// fresh browser inherits the installation's preferred locale instead of
// the global "en" fallback.
//
// Reveals only the locale choice itself ("de" | "en" | null), nothing
// sensitive. Cheap enough to call on every page mount.
export async function GET() {
  try {
    const locale = await getDefaultLocale();
    return NextResponse.json(
      { locale: locale ?? null },
      {
        headers: {
          // Short cache so multiple widgets on the same page reuse the
          // response, but still picks up a change within ~30 s of admin
          // updating it in Settings.
          "Cache-Control": "public, max-age=30",
        },
      },
    );
  } catch {
    return NextResponse.json({ locale: null });
  }
}

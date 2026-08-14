import { NextRequest, NextResponse } from "next/server";
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import {
  normalizeServerUrl,
  verifyCaldavAccount,
  invalidateCaldavDiscovery,
} from "@/lib/calendar-auth/caldav";
import { upsertCaldavAccount } from "@/lib/calendar-auth/store";

export const dynamic = "force-dynamic";

// CalDAV kennt keinen OAuth-Redirect — statt start/callback reicht ein POST mit
// Server, Benutzer und (App-)Passwort. Die Zugangsdaten werden erst gespeichert,
// wenn der Server sie akzeptiert und mindestens einen Kalender liefert; sonst
// stünde ein totes Konto in der Liste.
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    const body = await req.json().catch(() => ({}));

    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const accountName = String(body.accountName ?? "").trim();
    if (!body.serverUrl || !username || !password) {
      return NextResponse.json({ error: "caldav_missing_fields" }, { status: 400 });
    }

    let serverUrl: string;
    try {
      serverUrl = normalizeServerUrl(String(body.serverUrl));
    } catch {
      return NextResponse.json({ error: "caldav_invalid_url" }, { status: 400 });
    }

    // Alte Discovery für dieselbe Kombination wegwerfen — sonst würde ein
    // korrigiertes Passwort gegen einen gecachten Stand geprüft.
    invalidateCaldavDiscovery({ serverUrl, username });

    let calendars;
    try {
      ({ calendars } = await verifyCaldavAccount({ serverUrl, username, password }));
    } catch (err: any) {
      const code = String(err?.message ?? "caldav_failed");
      // 401/403 sind Nutzerfehler (falsches Passwort), kein Serverfehler.
      const status = code.startsWith("caldav_unauthorized") || code.startsWith("caldav_forbidden")
        ? 401
        : 400;
      return NextResponse.json({ error: code }, { status });
    }

    if (calendars.length === 0) {
      return NextResponse.json({ error: "caldav_no_calendars" }, { status: 400 });
    }

    const account = await upsertCaldavAccount({
      userId: session.userId!,
      serverUrl,
      username,
      password,
      accountName: accountName || null,
    });

    return NextResponse.json({
      ok: true,
      accountId: account.id,
      calendars: calendars.map((c) => ({ id: c.id, summary: c.summary })),
    });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("[caldav-connect]", err);
    return NextResponse.json({ error: "caldav_failed" }, { status: 500 });
  }
}

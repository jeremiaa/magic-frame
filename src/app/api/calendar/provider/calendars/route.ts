import { NextRequest, NextResponse } from "next/server";
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { fetchGoogleCalendars, fetchMicrosoftCalendars } from "@/lib/calendar-auth/providers";
import { discoverCaldavCalendars } from "@/lib/calendar-auth/caldav";
import { getCaldavCredentials } from "@/lib/calendar-auth/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession();
    const provider = req.nextUrl.searchParams.get("provider");
    const accountId = req.nextUrl.searchParams.get("accountId");
    if (!provider || !accountId) {
      return NextResponse.json({ error: "Missing provider or accountId" }, { status: 400 });
    }

    if (provider === "google") {
      const calendars = await fetchGoogleCalendars({ userId: session.userId!, accountId });
      return NextResponse.json({ calendars });
    }
    if (provider === "microsoft") {
      const calendars = await fetchMicrosoftCalendars({ userId: session.userId!, accountId });
      return NextResponse.json({ calendars });
    }
    if (provider === "caldav") {
      const creds = await getCaldavCredentials(accountId, session.userId!);
      if (!creds) {
        return NextResponse.json({ error: "CalDAV account not found" }, { status: 404 });
      }
      const calendars = await discoverCaldavCalendars(creds);
      return NextResponse.json({ calendars });
    }
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("[calendars-list]", err);
    return NextResponse.json({ error: err?.message ?? "Failed" }, { status: 500 });
  }
}

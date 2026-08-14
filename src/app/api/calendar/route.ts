import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  fetchGoogleEvents,
  fetchMicrosoftEvents,
  fetchHomeAssistantEvents,
} from "@/lib/calendar-auth/providers";
import { expandIcsEvents } from "@/lib/calendar-auth/ics";
import { fetchCaldavEvents } from "@/lib/calendar-auth/caldav";
import { getCaldavCredentials } from "@/lib/calendar-auth/store";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

type FeedInput = {
  id?: string;
  label?: string;
  color?: string;
  type?: "ical" | "google" | "microsoft" | "homeassistant" | "caldav";
  url?: string;
  accountId?: string;
  calendarId?: string;
};

type FeedResult = {
  feedId: string;
  feedLabel: string;
  feedColor?: string;
  events: any[];
  error?: string;
};

async function fetchIcal(
  rawUrl: string,
  windowStart: Date,
  windowEnd: Date,
  limitPerFeed: number,
): Promise<any[]> {
  let url = rawUrl.trim();
  if (url.startsWith("webcal://")) url = "https://" + url.substring(9);

  // Keyed on the actual start date (not just the window's length) — two
  // requests with the same duration but different start dates (e.g. "30
  // days from today" vs "30 days starting in the past") would otherwise
  // collide on the same cache entry, silently serving one caller's data
  // for a completely different date range. This only becomes reachable
  // once callers can pass a custom `start` (see the `range` mode below),
  // but is a more correct cache key regardless.
  const cacheKey = `${url}-s${windowStart.getTime()}-d${windowEnd.getTime() - windowStart.getTime()}-l${limitPerFeed}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
      Accept: "text/calendar",
    },
  });

  if (!res.ok) {
    throw new Error(`Downstream calendar status ${res.status}`);
  }

  const unparsedData = await res.text();
  // Parsing, recurrence expansion and all-day handling live in
  // lib/calendar-auth/ics.ts — CalDAV feeds run the exact same code over the
  // ICS documents a REPORT hands back.
  const sliced = expandIcsEvents(unparsedData, windowStart, windowEnd, limitPerFeed);
  cache.set(cacheKey, { data: sliced, timestamp: now });
  return sliced;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get("limit");
  const daysParam = searchParams.get("days");
  const startParam = searchParams.get("start");
  const modeParam = searchParams.get("mode"); // "agenda" (default) | "range"
  const limit = limitParam ? parseInt(limitParam, 10) : 5;
  const days = daysParam ? parseInt(daysParam, 10) : 30;

  const feedsParam = searchParams.get("feeds");
  const singleUrl = searchParams.get("url");

  let feeds: FeedInput[] = [];

  if (feedsParam) {
    try {
      feeds = JSON.parse(feedsParam);
    } catch {
      return NextResponse.json(
        { error: "Invalid feeds JSON in query string" },
        { status: 400 },
      );
    }
  } else if (singleUrl) {
    feeds = [{ url: singleUrl, label: "Kalender", type: "ical" }];
  } else {
    return NextResponse.json(
      { error: "Missing feeds or url parameter" },
      { status: 400 },
    );
  }

  // `start` (YYYY-MM-DD), combined with `mode=range`, lets a caller fetch a
  // window that begins in the past relative to "today" — e.g. a month-grid
  // view that wants to render days earlier in the current month too, not
  // just from today onward. Without `mode=range`, behaviour is unchanged
  // (window always begins today, matching the original agenda behaviour).
  let windowStart = new Date();
  if (modeParam === "range" && startParam) {
    const parsed = new Date(`${startParam}T00:00:00`);
    if (!isNaN(parsed.getTime())) windowStart = parsed;
  }
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + days);

  const needsAuth = feeds.some(
    (f) => f.type === "google" || f.type === "microsoft" || f.type === "caldav",
  );
  let userId: string | null = null;
  if (needsAuth) {
    const session = await getSession();
    userId = session.userId ?? null;
  }

  try {
    const perFeedLimit = Math.max(limit, 10);
    const feedResults: FeedResult[] = await Promise.all(
      feeds.map(async (feed, idx): Promise<FeedResult> => {
        const id = feed.id ?? `feed-${idx}`;
        const label = feed.label ?? id;
        const color = feed.color;
        const type = feed.type ?? "ical";

        try {
          let events: any[] = [];
          if (type === "google") {
            // #43: kein Session-Zwang mehr — der Token hängt an der accountId
            // (PK der CalendarAuth-Zeile), nicht an der Viewer-Session. Nur so
            // funktionieren Google/MS-Feeds auf der öffentlichen /view.
            if (!feed.accountId) throw new Error("missing_accountId");
            events = await fetchGoogleEvents({
              userId,
              accountId: feed.accountId,
              calendarId: feed.calendarId || "primary",
              windowStart,
              windowEnd,
              limit: perFeedLimit,
            });
          } else if (type === "microsoft") {
            if (!feed.accountId) throw new Error("missing_accountId");
            events = await fetchMicrosoftEvents({
              userId,
              accountId: feed.accountId,
              calendarId: feed.calendarId || "",
              windowStart,
              windowEnd,
              limit: perFeedLimit,
            });
          } else if (type === "caldav") {
            // Wie Google/MS hängen die Zugangsdaten an der accountId, nicht an
            // der Viewer-Session — sonst blieben CalDAV-Feeds auf der
            // öffentlichen /view leer (#43). calendarId hält die Collection-URL;
            // leer = erster Kalender des Kontos.
            if (!feed.accountId) throw new Error("missing_accountId");
            const creds = await getCaldavCredentials(feed.accountId, userId);
            if (!creds) throw new Error("caldav_account_missing");
            events = await fetchCaldavEvents({
              creds,
              calendarUrl: feed.calendarId || "",
              windowStart,
              windowEnd,
              limit: perFeedLimit,
            });
          } else if (type === "homeassistant") {
            if (!feed.calendarId) throw new Error("missing_entityId");
            events = await fetchHomeAssistantEvents({
              entityId: feed.calendarId,
              windowStart,
              windowEnd,
              limit: perFeedLimit,
            });
          } else {
            if (!feed.url) throw new Error("missing_url");
            events = await fetchIcal(feed.url, windowStart, windowEnd, perFeedLimit);
          }
          return {
            feedId: id,
            feedLabel: label,
            feedColor: color,
            events: events.map((e) => ({ ...e, feedId: id, feedColor: color })),
          };
        } catch (err: any) {
          return {
            feedId: id,
            feedLabel: label,
            feedColor: color,
            events: [],
            error: err?.message,
          };
        }
      }),
    );

    const now = new Date();
    // The original agenda-style behaviour only ever wants upcoming events,
    // so it filters out anything already finished relative to the real
    // current moment. A `mode=range` caller explicitly wants a fixed date
    // window instead (which can include past days), so only the
    // windowStart/windowEnd bounds should apply there, not an additional
    // "must still be upcoming" filter.
    const keepPastEvents = modeParam === "range";
    const allEvents = feedResults
      .flatMap((f) => f.events)
      .filter((e) => keepPastEvents || new Date(e.end) > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, limit);

    return NextResponse.json({
      events: allEvents,
      feeds: feedResults.map((f) => ({
        id: f.feedId,
        label: f.feedLabel,
        color: f.feedColor,
        count: f.events.length,
        error: f.error,
      })),
    });
  } catch (error: any) {
    console.error("Failed to fetch/parse calendar:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

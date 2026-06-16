import { NextRequest, NextResponse } from "next/server";
import ICAL from "ical.js";
import { getSession } from "@/lib/auth/session";
import { fetchGoogleEvents, fetchMicrosoftEvents } from "@/lib/calendar-auth/providers";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

type FeedInput = {
  id?: string;
  label?: string;
  color?: string;
  type?: "ical" | "google" | "microsoft";
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

  const cacheKey = `${url}-d${windowEnd.getTime() - windowStart.getTime()}-l${limitPerFeed}`;
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
  const jcalData = ICAL.parse(unparsedData);
  const comp = new ICAL.Component(jcalData);
  const vevents = comp.getAllSubcomponents("vevent");

  const events: any[] = [];
  const windowStartIcal = ICAL.Time.fromJSDate(windowStart);
  const windowEndIcal = ICAL.Time.fromJSDate(windowEnd);

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    try {
      if (event.isRecurring()) {
        const expand = event.iterator();
        let next;
        let iterations = 0;
        while ((next = expand.next()) && iterations < limitPerFeed + 10) {
          iterations++;
          if (next.compare(windowStartIcal) < 0) continue;
          if (next.compare(windowEndIcal) > 0) break;

          const occurrence = event.getOccurrenceDetails(next);
          events.push({
            id: `${event.uid}-${next.toUnixTime()}`,
            title: event.summary,
            start: occurrence.startDate.toJSDate().toISOString(),
            end: occurrence.endDate.toJSDate().toISOString(),
            isAllDay: event.startDate.isDate,
          });
        }
      } else {
        const startJS = event.startDate.toJSDate();
        const endJS = event.endDate.toJSDate();
        if (endJS >= windowStart && startJS <= windowEnd) {
          events.push({
            id: event.uid || Math.random().toString(),
            title: event.summary,
            start: startJS.toISOString(),
            end: endJS.toISOString(),
            isAllDay: event.startDate.isDate,
          });
        }
      }
    } catch (err) {
      console.error("Skipped malformed calendar event", err);
    }
  }

  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const sliced = events.slice(0, limitPerFeed);
  cache.set(cacheKey, { data: sliced, timestamp: now });
  return sliced;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get("limit");
  const daysParam = searchParams.get("days");
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

  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + days);

  const needsAuth = feeds.some((f) => f.type === "google" || f.type === "microsoft");
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
            if (!userId) throw new Error("not_authenticated");
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
            if (!userId) throw new Error("not_authenticated");
            if (!feed.accountId) throw new Error("missing_accountId");
            events = await fetchMicrosoftEvents({
              userId,
              accountId: feed.accountId,
              calendarId: feed.calendarId || "",
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
    const allEvents = feedResults
      .flatMap((f) => f.events)
      .filter((e) => new Date(e.end) > now)
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

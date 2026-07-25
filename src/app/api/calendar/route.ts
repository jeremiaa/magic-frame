import { NextRequest, NextResponse } from "next/server";
import ICAL from "ical.js";
import { getSession } from "@/lib/auth/session";
import { fetchGoogleEvents, fetchMicrosoftEvents, plainText, floatingAllDay } from "@/lib/calendar-auth/providers";
import { getAppSettings } from "@/lib/settings/store";

// #65: Home-Assistant-Kalender (calendar.* Entitäten) als Feed-Quelle. HA hat
// eine REST-API dafür: GET /api/calendars/<entity>?start=&end= → Termine im
// Fenster. Token/URL kommen aus den App-Einstellungen (wie die anderen
// HA-Routen). Kein Session-Zwang → funktioniert auch auf der öffentlichen /view.
async function fetchHaCalendar(
  entity: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<any[]> {
  const settings = await getAppSettings();
  if (!settings.haUrl || !settings.haToken) throw new Error("Home Assistant not configured");
  const base = settings.haUrl.replace(/\/+$/, "");
  const url = `${base}/api/calendars/${encodeURIComponent(entity)}?start=${encodeURIComponent(windowStart.toISOString())}&end=${encodeURIComponent(windowEnd.toISOString())}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${settings.haToken}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Home Assistant returned ${res.status}`);
  const items = (await res.json()) as any[];
  return (Array.isArray(items) ? items : []).map((ev, i) => {
    // Ganztägig: HA liefert start.date (ohne Uhrzeit); sonst start.dateTime.
    const startStr: string = ev?.start?.dateTime || ev?.start?.date || "";
    const endStr: string = ev?.end?.dateTime || ev?.end?.date || startStr;
    const isAllDay = !ev?.start?.dateTime && !!ev?.start?.date;
    const start = new Date(startStr);
    const end = new Date(endStr);
    return {
      id: ev?.uid || `${entity}-${startStr}-${i}`,
      title: ev?.summary || "(ohne Titel)",
      // #70: ganztägig ohne Zeitzone ausliefern, sonst rutscht der Termin
      // westlich von UTC auf den Vortag.
      start: (isAllDay ? floatingAllDay(startStr) : null)
        ?? (isNaN(start.getTime()) ? startStr : start.toISOString()),
      end: (isAllDay ? floatingAllDay(endStr) : null)
        ?? (isNaN(end.getTime()) ? endStr : end.toISOString()),
      isAllDay,
      description: plainText(ev?.description),
      location: plainText(ev?.location, 120),
    };
  });
}

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

type FeedInput = {
  id?: string;
  label?: string;
  color?: string;
  type?: "ical" | "google" | "microsoft" | "homeassistant";
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
  const jcalData = ICAL.parse(unparsedData);
  const comp = new ICAL.Component(jcalData);
  const vevents = comp.getAllSubcomponents("vevent");

  // BUG FIX 1: a recurring series that's had one occurrence edited/moved in
  // the source calendar (Google/iCloud/etc.) isn't stored as a single
  // VEVENT — it's a "master" VEVENT (the RRULE) plus a separate override
  // VEVENT sharing the same UID but carrying a RECURRENCE-ID, holding the
  // edited date/title. The code below previously treated every VEVENT as
  // independent, so the master's plain iterator had no idea an override
  // existed and still generated the original, now-stale occurrence — while
  // the override VEVENT was *also* added as its own event, producing two
  // visible entries for what is really one edited event.
  //
  // ical.js resolves this correctly via relateException() — but that state
  // lives on the specific Event *instance* you call it on, so the exact
  // same instance must be the one used later for expansion.
  const masters = new Map<string, ICAL.Event>();
  const exceptionsByUid = new Map<string, ICAL.Component[]>();
  const singles: ICAL.Component[] = [];

  for (const vevent of vevents) {
    try {
      const ev = new ICAL.Event(vevent);
      if (ev.isRecurrenceException()) {
        const list = exceptionsByUid.get(ev.uid) ?? [];
        list.push(vevent);
        exceptionsByUid.set(ev.uid, list);
      } else if (ev.isRecurring()) {
        masters.set(ev.uid, ev);
      } else {
        singles.push(vevent);
      }
    } catch (err) {
      // BUG FIX 3: a single malformed/unusual VEVENT (common in large,
      // years-old calendars) must not take down parsing for the entire
      // feed — skip just this one entry and keep going.
      console.error("Skipped malformed calendar event during classification", err);
    }
  }

  // Relate each exception to its master (same instance stored above, so the
  // relation actually sticks for later expansion). If a master can't be
  // found in this feed (edge case — e.g. the series master got deleted but
  // an override survived), fall back to treating it as its own standalone
  // event using its own edited date, rather than silently dropping it.
  const orphanExceptions: ICAL.Component[] = [];
  for (const [uid, list] of exceptionsByUid) {
    const master = masters.get(uid);
    if (master) {
      for (const exVevent of list) master.relateException(exVevent);
    } else {
      orphanExceptions.push(...list);
    }
  }

  const events: any[] = [];
  const windowStartIcal = ICAL.Time.fromJSDate(windowStart);
  const windowEndIcal = ICAL.Time.fromJSDate(windowEnd);

  // #70: Bei DATE-Werten (ganztägig) NICHT über toJSDate()/toISOString gehen —
  // das bindet den Tag an die Server-Zeitzone. Die Y-M-D-Felder der ICAL.Time
  // sind bereits der gemeinte Kalendertag.
  const stamp = (t: any): string => {
    if (t?.isDate) {
      const p = (n: number) => String(n).padStart(2, "0");
      return `${t.year}-${p(t.month)}-${p(t.day)}T00:00:00`;
    }
    return t.toJSDate().toISOString();
  };

  const pushStandalone = (event: ICAL.Event) => {
    try {
      const startJS = event.startDate.toJSDate();
      const endJS = event.endDate.toJSDate();
      if (endJS >= windowStart && startJS <= windowEnd) {
        events.push({
          id: event.uid || Math.random().toString(),
          title: event.summary,
          start: stamp(event.startDate),
          end: stamp(event.endDate),
          isAllDay: event.startDate.isDate,
          description: plainText(event.description),
          location: plainText(event.location, 120),
        });
      }
    } catch (err) {
      console.error("Skipped malformed calendar event", err);
    }
  };

  // Recurring series — exceptions (if any) are already related on these
  // exact instances, so getOccurrenceDetails() below transparently returns
  // the edited data for an overridden date instead of the stale original,
  // with no separate entry needed for the override itself.
  for (const event of masters.values()) {
    try {
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
          title: occurrence.item.summary,
          start: stamp(occurrence.startDate),
          end: stamp(occurrence.endDate),
          isAllDay: occurrence.startDate.isDate,
          description: plainText(occurrence.item.description),
          location: plainText(occurrence.item.location, 120),
        });
      }
    } catch (err) {
      console.error("Skipped malformed calendar event", err);
    }
  }

  // Plain one-off events (never recurring, never an exception).
  for (const vevent of singles) {
    pushStandalone(new ICAL.Event(vevent));
  }

  // Orphaned exceptions — no master found in this feed, so show the edited
  // occurrence on its own rather than dropping it.
  for (const vevent of orphanExceptions) {
    pushStandalone(new ICAL.Event(vevent));
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
          } else if (type === "homeassistant") {
            if (!feed.calendarId) throw new Error("missing_entity");
            events = await fetchHaCalendar(feed.calendarId, windowStart, windowEnd);
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

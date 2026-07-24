import "server-only";
import { getFreshAccessToken } from "./store";
import { getAppSettings } from "@/lib/settings/store";

export type ProviderEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
};

export type ProviderCalendar = {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
};

export async function fetchGoogleEvents(params: {
  userId?: string | null; // optional seit #43 — public views haben keine Session
  accountId: string;
  calendarId: string;
  windowStart: Date;
  windowEnd: Date;
  limit: number;
}): Promise<ProviderEvent[]> {
  const token = await getFreshAccessToken(params.accountId, params.userId);
  if (!token) throw new Error("no_token");

  const cal = encodeURIComponent(params.calendarId || "primary");
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${cal}/events`);
  url.searchParams.set("timeMin", params.windowStart.toISOString());
  url.searchParams.set("timeMax", params.windowEnd.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", String(Math.max(params.limit, 25)));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`google_http_${res.status}:${body.slice(0, 120)}`);
  }
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((ev: any) => {
    const isAllDay = !!ev.start?.date;
    const start = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00` : null);
    const end = ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00` : null);
    return {
      id: ev.id,
      title: ev.summary ?? "(kein Titel)",
      start: start ? new Date(start).toISOString() : new Date().toISOString(),
      end: end ? new Date(end).toISOString() : new Date().toISOString(),
      isAllDay,
    };
  });
}

export async function fetchGoogleCalendars(params: {
  userId?: string | null; // optional seit #43 — public views haben keine Session
  accountId: string;
}): Promise<ProviderCalendar[]> {
  const token = await getFreshAccessToken(params.accountId, params.userId);
  if (!token) throw new Error("no_token");

  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`google_http_${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((c: any) => ({
    id: c.id,
    summary: c.summaryOverride || c.summary || c.id,
    primary: !!c.primary,
    backgroundColor: c.backgroundColor,
  }));
}

export async function fetchMicrosoftEvents(params: {
  userId?: string | null; // optional seit #43 — public views haben keine Session
  accountId: string;
  calendarId: string;
  windowStart: Date;
  windowEnd: Date;
  limit: number;
}): Promise<ProviderEvent[]> {
  const token = await getFreshAccessToken(params.accountId, params.userId);
  if (!token) throw new Error("no_token");

  const calPath = params.calendarId
    ? `me/calendars/${encodeURIComponent(params.calendarId)}/calendarView`
    : `me/calendarView`;
  const url = new URL(`https://graph.microsoft.com/v1.0/${calPath}`);
  url.searchParams.set("startDateTime", params.windowStart.toISOString());
  url.searchParams.set("endDateTime", params.windowEnd.toISOString());
  url.searchParams.set("$top", String(Math.max(params.limit, 25)));
  url.searchParams.set("$orderby", "start/dateTime");
  url.searchParams.set(
    "$select",
    "id,subject,start,end,isAllDay,showAs",
  );

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ms_http_${res.status}:${body.slice(0, 120)}`);
  }
  const data = await res.json();
  const items = Array.isArray(data.value) ? data.value : [];
  return items.map((ev: any) => {
    const start = ev.start?.dateTime ? `${ev.start.dateTime}Z` : null;
    const end = ev.end?.dateTime ? `${ev.end.dateTime}Z` : null;
    return {
      id: ev.id,
      title: ev.subject ?? "(kein Titel)",
      start: start ? new Date(start).toISOString() : new Date().toISOString(),
      end: end ? new Date(end).toISOString() : new Date().toISOString(),
      isAllDay: !!ev.isAllDay,
    };
  });
}

export async function fetchMicrosoftCalendars(params: {
  userId?: string | null; // optional seit #43 — public views haben keine Session
  accountId: string;
}): Promise<ProviderCalendar[]> {
  const token = await getFreshAccessToken(params.accountId, params.userId);
  if (!token) throw new Error("no_token");

  const res = await fetch("https://graph.microsoft.com/v1.0/me/calendars", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`ms_http_${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data.value) ? data.value : [];
  return items.map((c: any) => ({
    id: c.id,
    summary: c.name ?? c.id,
    primary: !!c.isDefaultCalendar,
    backgroundColor: c.hexColor,
  }));
}

// Home Assistant has no per-user OAuth account — the same global haUrl/haToken
// from Integrations (see src/app/api/ha/entities/route.ts) is used for every
// feed, keyed by the calendar entity id instead of an accountId.
export async function fetchHomeAssistantEvents(params: {
  entityId: string;
  windowStart: Date;
  windowEnd: Date;
  limit: number;
}): Promise<ProviderEvent[]> {
  const settings = await getAppSettings();
  if (!settings.haUrl || !settings.haToken) throw new Error("ha_not_configured");

  const base = settings.haUrl.replace(/\/+$/, "");
  const url = new URL(`${base}/api/calendars/${encodeURIComponent(params.entityId)}`);
  url.searchParams.set("start", params.windowStart.toISOString());
  url.searchParams.set("end", params.windowEnd.toISOString());

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${settings.haToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ha_http_${res.status}:${body.slice(0, 120)}`);
  }
  const items = await res.json();
  if (!Array.isArray(items)) return [];

  // HA serializes CalendarEvent.start/end as either {dateTime: "..."} for
  // timed events or {date: "YYYY-MM-DD"} for all-day ones (same shape as the
  // Google feed above) — but older/customized integrations have been known
  // to return a plain ISO string instead of the nested object, so accept both.
  const pick = (v: any): { value: string | null; isDate: boolean } => {
    if (typeof v === "string") return { value: v, isDate: false };
    if (v?.dateTime) return { value: v.dateTime, isDate: false };
    if (v?.date) return { value: `${v.date}T00:00:00`, isDate: true };
    return { value: null, isDate: false };
  };

  return items.slice(0, params.limit).map((ev: any) => {
    const start = pick(ev.start);
    const end = pick(ev.end);
    return {
      id: ev.uid || `${params.entityId}-${start.value ?? Math.random()}`,
      title: ev.summary ?? "(no title)",
      start: start.value ? new Date(start.value).toISOString() : new Date().toISOString(),
      end: end.value ? new Date(end.value).toISOString() : new Date().toISOString(),
      isAllDay: start.isDate,
    };
  });
}

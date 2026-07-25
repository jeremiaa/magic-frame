import "server-only";
import { getFreshAccessToken } from "./store";
import { getAppSettings } from "@/lib/settings/store";

export type ProviderEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  // Optional — nur gefüllt, wenn der Anbieter sie liefert. Die Monatsansicht
  // kann Beschreibung/Ort pro Termin einblenden (opt-in im Inspector).
  description?: string;
  location?: string;
};

// Ganztags-Termine sind SCHWEBENDE Datumsangaben ohne Zeitzone ("2026-07-25"
// heißt überall auf der Welt der 25.). Sie in einen absoluten Zeitpunkt zu
// verwandeln (…T00:00:00Z) war Issue #70: der Browser rechnet den Zeitpunkt in
// seine eigene Zone zurück, und westlich von UTC landet Mitternacht auf dem
// VORTAG — Nutzer in den USA sahen jeden Ganztags-Termin einen Tag zu früh.
// Darum bewusst OHNE "Z"/Offset ausliefern: Date/parseISO lesen das als lokale
// Zeit, und der Kalendertag stimmt in jeder Zeitzone.
export function floatingAllDay(dateLike: string | null | undefined): string | null {
  const day = String(dateLike ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day}T00:00:00` : null;
}

// Beschreibungen kommen als HTML (Google) oder mit CRLF/Escapes (iCal) —
// für eine Kalenderzelle brauchen wir eine kurze, saubere Textzeile.
export function plainText(input: unknown, max = 300): string | undefined {
  if (typeof input !== "string" || !input.trim()) return undefined;
  const txt = input
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return txt ? txt.slice(0, max) : undefined;
}

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
      // #70: ganztägig bleibt schwebend, sonst echter UTC-Zeitpunkt.
      start: (isAllDay ? floatingAllDay(ev.start?.date) : null)
        ?? (start ? new Date(start).toISOString() : new Date().toISOString()),
      end: (isAllDay ? floatingAllDay(ev.end?.date) : null)
        ?? (end ? new Date(end).toISOString() : new Date().toISOString()),
      isAllDay,
      description: plainText(ev.description),
      location: plainText(ev.location, 120),
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
    // bodyPreview + location: Graph liefert sie nur, wenn sie im $select
    // stehen — sonst kommen die Felder schlicht nicht mit.
    "id,subject,start,end,isAllDay,showAs,bodyPreview,location",
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
      description: plainText(ev.bodyPreview),
      location: plainText(ev.location?.displayName, 120),
      // #70: Graph liefert auch ganztägig ein dateTime — davon nur den
      // Datumsanteil nehmen und schwebend lassen (kein Z).
      start: (ev.isAllDay ? floatingAllDay(ev.start?.dateTime) : null)
        ?? (start ? new Date(start).toISOString() : new Date().toISOString()),
      end: (ev.isAllDay ? floatingAllDay(ev.end?.dateTime) : null)
        ?? (end ? new Date(end).toISOString() : new Date().toISOString()),
      isAllDay: !!ev.isAllDay,
    };
  });
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
      // #70: all-day stays floating (no Z) so the calendar day is the same in
      // every timezone; timed events keep their absolute instant.
      start: (start.isDate ? floatingAllDay(start.value) : null)
        ?? (start.value ? new Date(start.value).toISOString() : new Date().toISOString()),
      end: (end.isDate ? floatingAllDay(end.value) : null)
        ?? (end.value ? new Date(end.value).toISOString() : new Date().toISOString()),
      isAllDay: start.isDate,
      description: plainText(ev.description),
      location: plainText(ev.location, 120),
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

import "server-only";
import { getFreshAccessToken } from "./store";

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

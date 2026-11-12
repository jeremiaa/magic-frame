import "server-only";
import { prisma } from "@/lib/companion/prisma";
import { getDefaultLocale } from "@/lib/i18n/default-locale";
import { forecastWeekday, intlDateLocale, uses12HourClock, type Locale } from "@/lib/i18n/locales";
import { translate } from "@/lib/i18n/translate";
import { wmoToText } from "@/lib/weather/wmo";
import {
  calendarExclusions,
  clampInt,
  getScheduleInfo,
  isoDate,
  parseExclusions,
  parseIsoDate,
  parseReminders,
  parseSchedules,
  remindersFor,
} from "@/lib/widgets/school-rotation";

// Ein Digest als Text (#131): die Widgets, die jemand ausgewählt hat, in der
// Reihenfolge, die er festgelegt hat — für SMS, Push und Automationen.
//
// Was hier steht, muss dasselbe sagen wie die Kachel an der Wand. Deshalb
// holen die Texte ihre Daten über dieselben Routen wie die Displays:
// dieselbe Anbieterwahl, dieselben Caches, dieselben Freigaben. Und deshalb
// rechnet die Schulrotation mit derselben Funktion und denselben Ferien.

export type DigestTextOptions = {
  SchoolRotation?: { kidFilter?: string; includeReminders?: boolean };
  Calendar?: { range?: "today" | "tomorrow" | "next3h" | "next6h" | "next12h" | "next24h" };
  Todos?: { dueFilter?: "all" | "today" | "overdue" };
  Weather?: { detail?: "oneliner" | "highlow" | "full" | "hourly" };
  ShoppingList?: { filter?: "unchecked" | "all" };
};

type Ctx = {
  locale: Locale;
  t: (de: string) => string;
  now: Date;
  /** Heute, 00:00 Ortszeit — so zählt auch die Kachel. Mit Uhrzeit wäre der
   *  letzte Schultag schon "nach dem Schuljahr". */
  today: Date;
};

type StoredWidget = { id: string; type: string; dashboardId: string; config: any };

export async function renderDigest(
  slug: string,
  options: { locale?: Locale; now?: Date } = {},
): Promise<{ text: string; lines: string[] } | null> {
  const digest = await prisma.digest.findUnique({
    where: { slug },
    include: { entries: { orderBy: { order: "asc" } } },
  });
  if (!digest) return null;

  const locale = options.locale ?? (await getDefaultLocale()) ?? "en";
  const now = options.now ?? new Date();
  const ctx: Ctx = { locale, t: (de) => translate(locale, de), now, today: parseIsoDate(isoDate(now))! };

  const widgets = await prisma.widget.findMany({
    where: { id: { in: digest.entries.map((e) => e.widgetId) } },
    select: { id: true, type: true, dashboardId: true, config: true },
  });
  const byId = new Map<string, StoredWidget>(widgets.map((w) => [w.id, w as StoredWidget]));

  // Nebeneinander statt nacheinander: jede Quelle darf bis zu zehn Sekunden
  // brauchen, und eine Automation wartet nicht ewig.
  const parts = await Promise.all(
    digest.entries.map(async (entry) => {
      const widget = byId.get(entry.widgetId);
      // Gelöscht oder verschoben: still überspringen, der Rest kommt trotzdem.
      if (!widget || widget.dashboardId !== entry.dashboardId) return [];
      try {
        return await widgetToText(widget, (entry.textOptions as any) ?? {}, ctx);
      } catch {
        return [];
      }
    }),
  );
  const lines = parts.flat();
  return { text: lines.join("\n"), lines };
}

async function widgetToText(widget: StoredWidget, opts: any, ctx: Ctx): Promise<string[]> {
  const config = widget.config ?? {};
  switch (widget.type) {
    case "SchoolRotationWidget.tsx":
      return schoolRotationToText(config, opts, ctx);
    case "CalendarWidget.tsx":
      return calendarToText(config, opts, ctx);
    case "TodosWidget.tsx":
      return todosToText(config, opts, ctx);
    case "ShoppingListWidget.tsx":
      return shoppingListToText(config, opts, ctx);
    case "WeatherWidget.tsx":
      return weatherToText(config, opts, ctx);
    case "SensorWidget.tsx":
      return sensorToText(config, ctx);
    case "EnvironmentWidget.tsx":
      return environmentToText(config, ctx);
    case "TextWidget.tsx":
      return textWidgetToText(config);
    default:
      return [];
  }
}

// Immer über die Schleife im Container. APP_BASE_URL ist die Adresse von
// draußen — von innen ist die oft gar nicht erreichbar (Proxy, Tunnel,
// Zertifikat), und der Digest bliebe leer, ohne dass jemand sieht, warum.
async function getJson(path: string, params: Record<string, string> = {}): Promise<any | null> {
  const url = new URL(path, `http://127.0.0.1:${process.env.PORT || 3000}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// "5:00 PM", aber "17:00" und "08:30" — wie die Uhrzeiten in der Kachel.
function clock(d: Date, ctx: Ctx, override?: string): string {
  const twelve = uses12HourClock(ctx.locale, override);
  return new Intl.DateTimeFormat(intlDateLocale(ctx.locale), {
    hour: twelve ? "numeric" : "2-digit",
    minute: "2-digit",
    hour12: twelve,
  }).format(d);
}

function unavailable(what: string, ctx: Ctx): string[] {
  return [`${ctx.t(what)}: ${ctx.t("nicht erreichbar")}`];
}

// ── Schulrotation ───────────────────────────────────────────────────────────

async function schoolRotationToText(config: any, opts: any, ctx: Ctx): Promise<string[]> {
  const start = parseIsoDate(config.startDate);
  const end = parseIsoDate(config.endDate);
  const kids = parseSchedules(config.schedules);
  if (!start || !end || start > end || !kids) return [];
  const cycle = clampInt(config.cycleDays, 1, 30, 6);

  // Dieselben schulfreien Tage wie in der Kachel: der Kalender aus Home
  // Assistant, dazu die Liste. Ist der Kalender nicht da, lieber das sagen als
  // einen falschen Tag schicken — Ferien als Schultage gezählt verschieben
  // jeden folgenden Tag.
  const excl = new Map<string, string>();
  const calendarEntity = typeof config.noSchoolCalendar === "string" ? config.noSchoolCalendar.trim() : "";
  if (calendarEntity) {
    const data = await getJson("/api/calendar", {
      feeds: JSON.stringify([{ type: "homeassistant", calendarId: calendarEntity }]),
      mode: "range",
      start: isoDate(start),
      days: String(Math.round((end.getTime() - start.getTime()) / 86400000) + 1),
      limit: "500",
    });
    if (!Array.isArray(data?.events) || (data?.feeds ?? []).some((f: any) => f?.error)) {
      return [`${ctx.t("Schulrotation")}: ${ctx.t("Ferienkalender nicht erreichbar")}`];
    }
    for (const [day, reason] of calendarExclusions(data.events)) excl.set(day, reason);
  }
  for (const [day, reason] of parseExclusions(config.noSchoolDates)) excl.set(day, reason || excl.get(day) || "");

  const info = getScheduleInfo(ctx.today, start, end, excl, cycle, 1);
  if (info.status === "after-end") return [ctx.t("Schuljahr vorbei")];
  if (info.status === "before-start") {
    const first = info.upcoming[0]?.date;
    return [first ? `${ctx.t("Schule beginnt")}: ${dateLabel(first, ctx)}` : ctx.t("Schule beginnt")];
  }

  const kidFilter = typeof opts.kidFilter === "string" ? opts.kidFilter.trim().toLowerCase() : "";
  const shown = kidFilter ? kids.filter((k) => k.name.toLowerCase() === kidFilter) : kids;
  const lines: string[] = [];

  if (info.status === "school-day" && info.todayRotation !== null) {
    const day = String(info.todayRotation);
    const parts = shown.map((kid) => `${kid.name}: ${(kid.days[day] ?? []).join(", ") || "—"}`);
    lines.push([`${ctx.t("Tag")} ${day}`, ...parts].join(" — "));
    // Erinnerungen gelten nur an Schultagen — so zeigt sie auch die Kachel.
    if (opts.includeReminders !== false) {
      for (const r of remindersFor(parseReminders(config.reminders), ctx.today, info.todayRotation)) {
        if (kidFilter && r.kid && r.kid.toLowerCase() !== kidFilter) continue;
        lines.push(`${r.icon ? `${r.icon} ` : ""}${r.text}${r.kid ? ` (${r.kid})` : ""}`);
      }
    }
  } else {
    const label = info.status === "weekend" ? ctx.t("Wochenende") : ctx.t("Schulfrei");
    lines.push(info.reason ? `${label} — ${info.reason}` : label);
    const next = info.upcoming[0];
    if (next) lines.push(`${ctx.t("Nächster Schultag")}: ${dateLabel(next.date, ctx)}, ${ctx.t("Tag")} ${next.rotDay}`);
  }
  return lines;
}

function dateLabel(d: Date, ctx: Ctx): string {
  return new Intl.DateTimeFormat(intlDateLocale(ctx.locale), { weekday: "short", day: "numeric", month: "short" }).format(d);
}

// ── Kalender ────────────────────────────────────────────────────────────────

const HOURS: Record<string, number> = { next3h: 3, next6h: 6, next12h: 12, next24h: 24 };

async function calendarToText(config: any, opts: any, ctx: Ctx): Promise<string[]> {
  // Wie die Kachel: das feeds-Array, sonst die alte einzelne icalUrl.
  const feeds = Array.isArray(config.feeds) && config.feeds.length > 0
    ? config.feeds
    : config.icalUrl
      ? [{ type: "ical", url: config.icalUrl, label: "Kalender" }]
      : [];
  if (feeds.length === 0) return [];

  const range: string = opts.range || "today";
  const hours = HOURS[range] ?? null;
  const first = new Date(ctx.today);
  if (range === "tomorrow") first.setDate(first.getDate() + 1);

  const data = await getJson("/api/calendar", {
    feeds: JSON.stringify(feeds),
    mode: "range",
    start: isoDate(first),
    // "Nächste 3 Stunden" um 22 Uhr reicht in den nächsten Tag.
    days: hours ? "2" : "1",
    limit: "100",
  });
  if (!Array.isArray(data?.events)) return unavailable("Kalender", ctx);

  const until = hours ? new Date(ctx.now.getTime() + hours * 3600_000) : null;
  const lines: string[] = [];
  for (const ev of data.events) {
    const start = new Date(ev.start);
    const end = new Date(ev.end ?? ev.start);
    if (until && (end <= ctx.now || start > until)) continue;
    const title = ev.title && ev.title !== "(kein Titel)" ? ev.title : ctx.t("(kein Titel)");
    const when = ev.isAllDay ? ctx.t("Ganztägig") : clock(start, ctx, config.calendarTimeFormat);
    lines.push(`${when} ${title}`);
  }
  return lines;
}

// ── Listen ──────────────────────────────────────────────────────────────────
//
// Dieselbe Quelle wie die Kachel: die eingebaute Liste, eine Home-Assistant-
// Liste oder ein Todoist-Projekt. Eine Kachel, die Todoist zeigt, darf im
// Digest nicht plötzlich die eingebaute Liste vorlesen.

type ListItem = { title: string; done: boolean; due: Date | null };

// Ein reines Datum ("2026-10-27") ist ein Kalendertag, kein Zeitpunkt. new Date()
// läse es als Mitternacht UTC — westlich von Greenwich wäre das schon gestern
// und die Aufgabe "überfällig".
function dueDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const day = parseIsoDate(v);
  if (day) return day;
  const at = new Date(v);
  return isNaN(at.getTime()) ? null : at;
}

async function remoteList(config: any): Promise<ListItem[] | null | undefined> {
  if (config.listSource === "ha" && config.haListEntity) {
    const d = await getJson(`/api/ha-lists/${encodeURIComponent(config.haListEntity)}/items`);
    if (!Array.isArray(d?.items)) return null;
    return d.items.map((it: any) => ({
      title: String(it.summary ?? ""),
      done: it.status === "completed",
      due: dueDate(it.due),
    }));
  }
  if (config.listSource === "todoist" && config.todoistProjectId) {
    const d = await getJson(`/api/todoist/tasks/${encodeURIComponent(config.todoistProjectId)}`);
    if (!Array.isArray(d?.tasks)) return null;
    return d.tasks.map((task: any) => ({
      title: String(task.content ?? ""),
      done: !!task.isCompleted,
      due: dueDate(task.due?.datetime ?? task.due?.date),
    }));
  }
  return undefined; // die eingebaute Liste
}

async function todosToText(config: any, opts: any, ctx: Ctx): Promise<string[]> {
  let items = await remoteList(config);
  if (items === null) return unavailable("Todos", ctx);
  if (items === undefined) {
    const assignee = typeof config.assignee === "string" && config.assignee.trim() ? config.assignee.trim() : undefined;
    const rows = await prisma.todo.findMany({
      where: { completedAt: null, ...(assignee ? { assignee } : {}) },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      take: 50,
    });
    items = rows.map((r) => ({ title: r.title, done: false, due: r.dueDate }));
  }

  // "Fällig bis heute" schließt Überfälliges ein; Aufgaben ohne Datum zählen
  // dort nicht. "Alle offenen" ist der Normalfall — an der Wand angelegte
  // Aufgaben haben gar kein Datum.
  const filter: string = opts.dueFilter || "all";
  const endOfToday = new Date(ctx.today.getTime() + 86400000);
  return items
    .filter((it) => !it.done)
    .filter((it) =>
      filter === "today" ? !!it.due && it.due < endOfToday
        : filter === "overdue" ? !!it.due && it.due < ctx.today
          : true,
    )
    .slice(0, 20)
    .map((it) => `☐ ${it.title}${it.due ? ` (${dateLabel(it.due, ctx)})` : ""}`);
}

async function shoppingListToText(config: any, opts: any, ctx: Ctx): Promise<string[]> {
  let items = await remoteList(config);
  if (items === null) return unavailable("Einkaufsliste", ctx);
  if (items === undefined) {
    const rows = await prisma.shoppingItem.findMany({
      where: opts.filter === "all" ? {} : { checked: false },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    items = rows.map((r) => ({ title: r.text, done: r.checked, due: null }));
  }
  return items
    .filter((it) => opts.filter === "all" || !it.done)
    .slice(0, 50)
    .map((it) => `${it.done ? "✓" : "•"} ${it.title}`);
}

// ── Wetter ──────────────────────────────────────────────────────────────────

const WIND_UNIT: Record<string, string> = { kmh: "km/h", mph: "mph", ms: "m/s", kn: "kn" };

async function weatherToText(config: any, opts: any, ctx: Ctx): Promise<string[]> {
  const provider: string = config.provider || "open-meteo";
  const params: Record<string, string> = {
    provider,
    temperature_unit: config.unitTemp === "fahrenheit" ? "fahrenheit" : "celsius",
    wind_speed_unit: WIND_UNIT[config.unitWind] ? config.unitWind : "kmh",
  };
  if (config.lat) params.lat = String(config.lat);
  if (config.lon) params.lon = String(config.lon);
  if (config.haEntity) params.haEntity = String(config.haEntity);
  if (config.wuStation) params.wuStation = String(config.wuStation);

  const data = await getJson("/api/weather", params);
  const cur = data?.current;
  if (!cur) return unavailable("Wetter", ctx);

  const deg = config.unitTemp === "fahrenheit" ? "°F" : "°C";
  const temp = Math.round(cur.temperature_2m ?? 0);
  const feels = Math.round(cur.apparent_temperature ?? temp);
  const now = `${wmoToText(cur.weather_code ?? 0, ctx.locale)}, ${temp}${deg}`;
  const detail: string = opts.detail || "oneliner";

  if (detail === "oneliner") {
    return [Math.abs(feels - temp) >= 2 ? `${now} (${ctx.t("gefühlt")} ${feels}${deg})` : now];
  }
  if (detail === "highlow") {
    const hi = data.daily?.temperature_2m_max?.[0];
    const lo = data.daily?.temperature_2m_min?.[0];
    return [hi != null && lo != null ? `${now} (${Math.round(lo)}–${Math.round(hi)}${deg})` : now];
  }
  if (detail === "hourly") {
    const hourly = hourlyLines(data, deg, ctx);
    return hourly.length ? hourly : [now];
  }

  const lines = [now];
  if (Math.abs(feels - temp) >= 2) lines.push(`${ctx.t("Gefühlt")} ${feels}${deg}`);
  if (cur.relative_humidity_2m != null) lines.push(`${ctx.t("Luftfeuchtigkeit")}: ${Math.round(cur.relative_humidity_2m)}%`);
  if (cur.wind_speed_10m != null) lines.push(`${ctx.t("Wind")}: ${Math.round(cur.wind_speed_10m)} ${WIND_UNIT[params.wind_speed_unit]}`);
  const daily = data.daily;
  for (let i = 1; i <= 3 && i < (daily?.temperature_2m_max?.length ?? 0); i++) {
    const day = daily.time?.[i] ? forecastWeekday(daily.time[i], ctx.locale) : "";
    const lo = Math.round(daily.temperature_2m_min[i]);
    const hi = Math.round(daily.temperature_2m_max[i]);
    lines.push(`${day}: ${lo}–${hi}${deg} ${wmoToText(daily.weather_code?.[i] ?? 0, ctx.locale)}`);
  }
  return lines;
}

function hourlyLines(data: any, deg: string, ctx: Ctx): string[] {
  const h = data.hourly;
  if (!Array.isArray(h?.time)) return [];
  const endOfToday = new Date(ctx.today.getTime() + 86400000);
  const lines: string[] = [];
  for (let i = 0; i < h.time.length; i++) {
    const at = new Date(h.time[i]);
    if (at.getTime() < ctx.now.getTime() - 3600_000) continue;
    if (at >= endOfToday) break;
    const pop = h.precipitation_probability?.[i];
    lines.push(
      `${clock(at, ctx)} ${Math.round(h.temperature_2m?.[i] ?? 0)}${deg} ${wmoToText(h.weather_code?.[i] ?? 0, ctx.locale)}` +
        (typeof pop === "number" && pop > 0 ? ` ${pop}%` : ""),
    );
  }
  return lines;
}

// ── Home Assistant ──────────────────────────────────────────────────────────

type Slot = { entityId?: string; label?: string; unit?: string; decimals?: number };

async function haStateLines(slots: Slot[]): Promise<string[] | null> {
  const wanted = slots.filter((s) => s.entityId);
  if (wanted.length === 0) return [];
  const states = await getJson("/api/ha/state", { ids: wanted.map((s) => s.entityId!).join(",") });
  if (!states) return null;
  const lines: string[] = [];
  for (const slot of wanted) {
    const entity = states[slot.entityId!];
    const raw = entity?.state;
    if (raw == null || raw === "unavailable" || raw === "unknown") continue;
    const num = parseFloat(raw);
    const value = typeof slot.decimals === "number" && !isNaN(num) ? num.toFixed(slot.decimals) : String(raw);
    const label = slot.label || entity.attributes?.friendly_name || slot.entityId;
    const unit = slot.unit || entity.attributes?.unit_of_measurement || "";
    lines.push(`${label}: ${value}${unit ? ` ${unit}` : ""}`);
  }
  return lines;
}

async function sensorToText(config: any, ctx: Ctx): Promise<string[]> {
  const lines = await haStateLines(Array.isArray(config.entities) ? config.entities : []);
  return lines ?? unavailable("Sensor", ctx);
}

// ── Umwelt ──────────────────────────────────────────────────────────────────

const POLLEN: [key: string, de: string][] = [
  ["alder", "Erle"], ["birch", "Birke"], ["grass", "Gräser"],
  ["mugwort", "Beifuß"], ["olive", "Olive"], ["ragweed", "Ambrosia"],
];

async function environmentToText(config: any, ctx: Ctx): Promise<string[]> {
  const lines: string[] = [];
  if (config.lat && config.lon) {
    const data = await getJson("/api/environment", {
      lat: String(config.lat),
      lon: String(config.lon),
      wind_speed_unit: WIND_UNIT[config.unitWind] ? config.unitWind : "kmh",
    });
    if (!data || data.error) return unavailable("Umwelt", ctx);

    const us = config.aqiScale === "us";
    const aqi = us ? data.aqi?.us : data.aqi?.european;
    if (config.showAqi !== false && aqi != null) lines.push(`AQI (${us ? "US" : "EU"}): ${aqi}`);
    const p = data.pollutants ?? {};
    if (config.showPm25 !== false && p.pm2_5 != null) lines.push(`PM2.5: ${p.pm2_5} µg/m³`);
    if (config.showPm10 && p.pm10 != null) lines.push(`PM10: ${p.pm10} µg/m³`);
    if (config.showOzone && p.ozone != null) lines.push(`${ctx.t("Ozon")}: ${p.ozone} µg/m³`);
    if (config.showNo2 && p.nitrogen_dioxide != null) lines.push(`NO₂: ${p.nitrogen_dioxide} µg/m³`);
    if (config.showPollen !== false && data.pollen) {
      const pollen = POLLEN
        .filter(([key]) => data.pollen[key] != null && !(config.hidePollenZero && data.pollen[key] === 0))
        .map(([key, de]) => `${ctx.t(de)} ${data.pollen[key]}`);
      if (pollen.length) lines.push(`${ctx.t("Pollen")}: ${pollen.join(", ")}`);
    }
    if (config.showUv && data.uv != null) lines.push(`UV: ${data.uv}`);
    if (config.showWind && data.wind?.speed != null) {
      lines.push(`${ctx.t("Wind")}: ${Math.round(data.wind.speed)} ${WIND_UNIT[data.wind.unit] ?? data.wind.unit ?? "km/h"}`);
    }
    if (config.showSolar && data.solar?.shortwave != null) lines.push(`${ctx.t("Solar")}: ${Math.round(data.solar.shortwave)} W/m²`);
  }
  const ha = await haStateLines(Array.isArray(config.haEntities) ? config.haEntities : []);
  if (ha) lines.push(...ha);
  return lines;
}

// ── Text ────────────────────────────────────────────────────────────────────

function textWidgetToText(config: any): string[] {
  return [config.text, config.subtext]
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .map((s) => s.trim());
}

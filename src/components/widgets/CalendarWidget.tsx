"use client";

import { useEffect, useState } from "react";
import { parseISO, isToday, isTomorrow, isSameDay, addDays, isValid, format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  feedId?: string;
  feedColor?: string;
};

type FeedConfig = {
  id?: string;
  label?: string;
  color?: string;
  type?: "ical" | "google" | "microsoft" | "homeassistant";
  url?: string;
  accountId?: string;
  calendarId?: string;
};

const isValidFeed = (f: any): boolean => {
  if (!f || typeof f !== "object") return false;
  const type = f.type ?? "ical";
  if (type === "ical") return typeof f.url === "string" && f.url.trim() !== "";
  if (type === "homeassistant") return typeof f.calendarId === "string" && f.calendarId.trim() !== "";
  return typeof f.accountId === "string" && f.accountId.trim() !== "";
};

// Agenda fija (showEmptyDays): cuántos eventos se piden a la API para la
// ventana de 3 días, independiente del límite por día que configura el
// usuario. Tiene que ser un valor fijo y generoso, no `limit * 3` — si
// dependiera del límite por día, un valor bajo (p.ej. 1) haría que un solo
// día con varios eventos agote el cupo global y los días siguientes se
// muestren como vacíos aunque tengan eventos reales (route.ts sigue
// cortando globalmente, no por día). El corte por día sigue siendo 100%
// client-side, usando `limit`.
const EMPTY_DAYS_FETCH_LIMIT = 60;

export default function CalendarWidget({ config, onVisibilityChange }: { config?: any, onVisibilityChange?: (isVisible: boolean) => void }) {
  const { locale, t } = useLocale();
  const dfLocale = locale === "en" ? enUS : de;
  // Feeds-Array bevorzugen, Legacy icalUrl als Single-Feed fallback.
  const rawFeeds: FeedConfig[] = Array.isArray(config?.feeds)
    ? config.feeds.filter(isValidFeed)
    : [];
  const feeds: FeedConfig[] =
    rawFeeds.length > 0
      ? rawFeeds
      : config?.icalUrl
        ? [{ type: "ical", url: config.icalUrl, label: "Kalender", color: config?.color || config?.accentColor }]
        : [];

  const limit = config?.limit ? Number(config.limit) : 5;
  const days = config?.days ? Number(config.days) : 30;
  const showEmptyDays = config?.showEmptyDays || false;
  const feedsKey = JSON.stringify(feeds);
  const accentColor = config?.color || config?.accentColor || "#ffffff";
  const hideOnEmpty = config?.hideOnEmpty || false;

  const [fetchedEvents, setEvents] = useState<CalendarEvent[]>([]);
  // Vorschau-Beispieldaten (#42): Der Editor injiziert __demo. Echte Termine
  // bleiben stehen und werden bis zur KONFIGURIERTEN Anzahl mit Beispielen
  // aufgefüllt — so sieht man das Layout bei voller Liste, auch wenn der
  // Kalender gerade nur einen Termin hat. Im Live-View existiert das nie.
  const events: CalendarEvent[] = !config?.__demo
    ? fetchedEvents
    : (() => {
        // Agenda-Modus zeigt genau die nächsten 3 Tage, sonst gilt `limit`.
        const want = Math.max(1, Math.min(showEmptyDays ? 3 : limit, 12));
        const missing = want - fetchedEvents.length;
        if (missing <= 0) return fetchedEvents;
        const pool = [
          { title: t("Fußballtraining"), h: 18, m: 0, dur: 90, allDay: false },
          { title: t("Geburtstag Oma"), h: 0, m: 0, dur: 0, allDay: true },
          { title: t("Zahnarzt-Termin"), h: 9, m: 30, dur: 30, allDay: false },
          { title: t("Team-Meeting"), h: 11, m: 0, dur: 60, allDay: false },
          { title: t("Yoga-Kurs"), h: 19, m: 0, dur: 60, allDay: false },
          { title: t("Elternabend"), h: 19, m: 30, dur: 90, allDay: false },
          { title: t("Kino mit Freunden"), h: 20, m: 0, dur: 150, allDay: false },
          { title: t("Müllabfuhr"), h: 0, m: 0, dur: 0, allDay: true },
        ];
        const at = (offsetDays: number, h: number, m: number, plusMin = 0) => {
          const x = new Date();
          x.setDate(x.getDate() + offsetDays);
          x.setHours(h, m + plusMin, 0, 0);
          return x.toISOString();
        };
        const demo: CalendarEvent[] = Array.from({ length: missing }, (_, i) => {
          const p = pool[i % pool.length];
          return {
            id: `demo-${i}`,
            title: p.title,
            start: at(i, p.h, p.m),
            end: p.allDay ? at(i, 23, 59) : at(i, p.h, p.m, p.dur),
            isAllDay: p.allDay,
          };
        });
        return [...fetchedEvents, ...demo].sort((a, b) => a.start.localeCompare(b.start));
      })();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (feeds.length === 0) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        const url = new URL("/api/calendar", window.location.origin);
        url.searchParams.set("feeds", JSON.stringify(feeds));
        // Agenda fija (showEmptyDays): ventana siempre de 3 días (hoy/+1/+2).
        const effectiveDays = showEmptyDays ? 3 : days;
        const effectiveLimit = showEmptyDays ? EMPTY_DAYS_FETCH_LIMIT : limit;
        url.searchParams.set("limit", String(effectiveLimit));
        url.searchParams.set("days", String(effectiveDays));
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (cancelled) return;
        const evts: CalendarEvent[] = data.events || [];
        setEvents(evts);
        setError(null);

        if (showEmptyDays) {
          onVisibilityChange?.(true);
        } else if (hideOnEmpty && evts.length === 0) {
          onVisibilityChange?.(false);
        } else {
          onVisibilityChange?.(true);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (!cancelled) {
          setError(t("Kalender konnte nicht geladen werden"));
          onVisibilityChange?.(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedsKey, limit, days, hideOnEmpty, showEmptyDays]);

  // Beide Hinweise überspringen, wenn die Editor-Vorschau Beispieldaten will —
  // sonst sieht man beim frisch angelegten Widget nur "URL hinterlegen".
  if (feeds.length === 0 && !config?.__demo) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-white/50 text-[0.8em] text-center p-4">
        {t("Bitte Kalender-URL(s) im Editor hinterlegen")}
      </div>
    );
  }

  if (loading && !config?.__demo) {
     return (
        <div className="flex flex-col items-center justify-center w-full h-full text-white/50 text-[0.8em] animate-pulse">
           {t("Kalender wird gesammelt...")}
        </div>
     );
  }

  const renderEmptyDay = (day: Date) => {
    const monthLabel = format(day, "MMM", { locale: dfLocale });
    let weekdayLabel: string;
    if (isToday(day)) weekdayLabel = t("Heute");
    else if (isTomorrow(day)) weekdayLabel = t("Morgen");
    else weekdayLabel = format(day, "eee", { locale: dfLocale });
    const dateLabel = format(day, "d");
    const hideWeekday = (config as any)?.hideWeekday === true;
    const cardOpacity = config?.cardOpacity !== undefined ? config.cardOpacity : 40;
    const hasBg = cardOpacity > 0;
    const isMinimal = config?.design === 'minimal';
    const key = `empty-${day.toISOString()}`;

    if (isMinimal) {
      return (
        <div key={key} className="flex gap-[0.8em] items-end mb-[0.6em] opacity-50">
          <span className="shrink-0 w-[4px] bg-white rounded-full self-stretch my-1"></span>
          <div className="flex flex-col min-w-0 shrink-0" style={{ width: '2.4em' }}>
            <span className="opacity-80 leading-tight uppercase font-medium tracking-wider" style={{ fontSize: '0.7em' }}>{monthLabel}</span>
            <span className="font-bold leading-none tracking-tighter" style={{ fontSize: '1.8em' }}>{dateLabel}</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-bold leading-tight truncate" style={{ fontSize: '1em' }}>{t("Keine Termine an diesem Tag")}</span>
            {!hideWeekday && (
              <span className="text-white/50 text-[0.8em] leading-tight uppercase tracking-wider">{weekdayLabel}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={key}
           className={`flex items-center justify-start gap-[0.8em] w-full rounded-3xl p-[0.6em] shrink-0 mb-[0.8em] opacity-50 ${hasBg ? 'backdrop-blur-md border border-white/10 shadow-xl' : ''}`}
           style={{ backgroundColor: `rgba(0,0,0,${cardOpacity / 100})` }}
      >
        <div
          className={`shrink-0 w-[3.2em] h-[3.2em] rounded-[0.8em] flex flex-col items-center justify-center relative overflow-hidden ${hasBg ? 'border border-white/5' : ''}`}
          style={{ backgroundColor: `rgba(0,0,0,${cardOpacity / 100})` }}
        >
          <span className="relative z-10 text-[0.6em] uppercase tracking-wider opacity-80">{monthLabel}</span>
          <span className="relative z-10 text-[1.4em] font-bold tracking-tight leading-none">{dateLabel}</span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-bold tracking-tight text-[0.9em] leading-tight">{t("Keine Termine an diesem Tag")}</span>
          {!hideWeekday && (
            <span className="text-white/50 text-[0.7em] font-mono tracking-wider uppercase mt-[0.2em]">{weekdayLabel}</span>
          )}
        </div>
      </div>
    );
  };

  const renderEvent = (ev: CalendarEvent) => {
    const startDate = parseISO(ev.start);
    if (!isValid(startDate)) return null;

    // Layout: small month label above the big day number, with the
    // weekday rendered inline next to the number (baseline-aligned).
    //   JUNI
    //   11  DO.
    // The weekday can be hidden via config.hideWeekday (Inspector toggle).
    const monthLabel = format(startDate, "MMM", { locale: dfLocale });
    let weekdayLabel: string;
    if (isToday(startDate)) weekdayLabel = t("Heute");
    else if (isTomorrow(startDate)) weekdayLabel = t("Morgen");
    else weekdayLabel = format(startDate, "eee", { locale: dfLocale });
    const dateLabel = format(startDate, "d");
    const hideWeekday = (config as any)?.hideWeekday === true;
    // Time format (#33): "auto" follows the app language (12h EN / 24h DE),
    // matching the Clock + Weather widgets. "12h"/"24h" is a fixed override.
    // Default "auto" keeps existing layouts exactly as before.
    const timeFmt = config?.calendarTimeFormat || "auto";
    const timePattern =
      timeFmt === "24h" ? "HH:mm"
      : timeFmt === "12h" ? "h:mm a"
      : locale === "en" ? "h:mm a" : "HH:mm";
    const timeStr = ev.isAllDay
      ? t("Ganztägig")
      : format(startDate, timePattern);
    const cardOpacity = config?.cardOpacity !== undefined ? config.cardOpacity : 40;
    const hasBg = cardOpacity > 0;
    const isMinimal = config?.design === 'minimal';
    const eventColor = ev.feedColor || accentColor;
    const accentColorForEvent = eventColor;

    if (isMinimal) {
      return (
        // items-end: Inhalt-Spalte (Titel + Subtitle) wird an die
        // UNTERKANTE des Datum-Blocks angesetzt — Subtitle-Zeile sitzt
        // bündig mit der Unterkante der großen Tageszahl, Titel sitzt
        // direkt darüber. Vorher items-baseline → Titel klebte an
        // der Monatszeile, sah optisch top-lastig aus.
        <div key={ev.id} className="flex gap-[0.8em] items-end mb-[0.6em]">
          <span className="shrink-0 w-[4px] bg-white rounded-full self-stretch my-1" style={{ backgroundColor: accentColorForEvent }}></span>
          {/* Datum-Spalte: Monat klein oben, Tageszahl groß. Schmaler
              fester Block für saubere vertikale Ausrichtung über
              mehrere Events hinweg. Der Wochentag steckt jetzt rechts
              bei der Uhrzeit (siehe unten) — wirkt aufgeräumter. */}
          <div className="flex flex-col min-w-0 shrink-0" style={{ width: '2.4em' }}>
            <span className="opacity-80 leading-tight uppercase font-medium tracking-wider" style={{ fontSize: '0.7em' }}>{monthLabel}</span>
            <span className="font-bold leading-none tracking-tighter" style={{ fontSize: '1.8em' }}>{dateLabel}</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-bold leading-tight truncate" style={{ fontSize: '1em' }}>{ev.title}</span>
            <span className="text-white/50 text-[0.8em] leading-tight">
              {!hideWeekday && <span className="uppercase tracking-wider">{weekdayLabel} · </span>}
              {timeStr}
            </span>
          </div>
        </div>
      );
    }

    // Ensure color uses proper parsing if needed, but styling allows raw hex
    return (
      <div key={ev.id}
           className={`flex items-center justify-start gap-[0.8em] w-full rounded-3xl p-[0.6em] transform transition-all hover:scale-[1.02] shrink-0 mb-[0.8em] ${hasBg ? 'backdrop-blur-md border border-white/10 shadow-xl' : ''}`}
           style={{ backgroundColor: `rgba(0,0,0,${cardOpacity / 100})`, boxShadow: hasBg ? `0 8px 32px ${accentColorForEvent}15` : 'none', borderLeft: hasBg ? `0.3em solid ${accentColorForEvent}` : 'none' }}
      >
        <div
          className={`shrink-0 w-[3.2em] h-[3.2em] rounded-[0.8em] flex flex-col items-center justify-center relative overflow-hidden ${hasBg ? 'border border-white/5' : ''}`}
          style={{ backgroundColor: `rgba(0,0,0,${cardOpacity / 100})` }}
        >
          <div className="absolute inset-0 opacity-20 blur-md" style={{ backgroundColor: accentColorForEvent }}></div>
          {/* Card-Box: Monat klein oben, große Zahl unten. Wochentag
              wandert in die Subtitle bei der Uhrzeit (rechts neben
              der Box) — wie bei Apple Calendar / Fantastical. */}
          <span className="relative z-10 text-[0.6em] uppercase tracking-wider opacity-80" style={{ color: accentColorForEvent }}>{monthLabel}</span>
          <span className="relative z-10 text-[1.4em] font-bold tracking-tight leading-none">{dateLabel}</span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-bold tracking-tight text-[0.9em] leading-tight text-ellipsis whitespace-nowrap overflow-hidden">
            {ev.title}
          </span>
          <span className="text-white/50 text-[0.7em] font-mono tracking-wider uppercase mt-[0.2em]">
            {!hideWeekday && <>{weekdayLabel} · </>}{timeStr}
          </span>
        </div>
      </div>
    );
  };

  const renderAgenda = () => {
    const today = new Date();
    return [0, 1, 2].map((offset) => {
      const day = addDays(today, offset);
      const dayEvents = events
        .filter((ev) => {
          const startDate = parseISO(ev.start);
          return isValid(startDate) && isSameDay(startDate, day);
        })
        .slice(0, limit);
      return dayEvents.length > 0 ? dayEvents.map(renderEvent) : renderEmptyDay(day);
    });
  };

  return (
    <div className="flex flex-col drop-shadow-md mt-[1em] w-full h-full justify-center overflow-hidden relative">
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col justify-start" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {error && (
          <div className="text-red-400/80 text-[0.8em] mt-2">{error}</div>
        )}

        {!error && showEmptyDays && renderAgenda()}

        {!error && !showEmptyDays && events.length === 0 && !hideOnEmpty && (
          <div className="opacity-50 text-[0.8em] mt-2">{t("Keine anstehenden Termine")}</div>
        )}

        {!error && !showEmptyDays && events.map(renderEvent)}
      </div>
    </div>
  );
}

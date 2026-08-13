"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  parseISO, isToday, isTomorrow, isSameDay, addDays, isValid, format,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, differenceInCalendarDays, getISOWeek,
} from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useGlassStyle } from "@/lib/ui/glass";
import { calendarOwnSurface } from "@/lib/widgets/calendar-surface";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  feedId?: string;
  feedColor?: string;
  description?: string;
  location?: string;
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
  // HA-Kalender identifiziert sich über die Entität (calendarId), nicht accountId.
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

export default function CalendarWidget({ config, dashboardId, onVisibilityChange }: { config?: any, dashboardId?: string, onVisibilityChange?: (isVisible: boolean) => void }) {
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

  // Ansicht auflösen: explizites calendarView gewinnt. Ohne das gilt der alte
  // showEmptyDays=true als "legacy-agenda" (bisheriges 3-Tage-Verhalten bleibt
  // damit unverändert), sonst "list". So ändert sich für kein bestehendes
  // Layout etwas — die neuen Ansichten sind rein opt-in.
  const legacyAgenda = !config?.calendarView && showEmptyDays;
  const view: "list" | "agenda" | "month" =
    config?.calendarView === "agenda" || config?.calendarView === "month" || config?.calendarView === "list"
      ? config.calendarView
      : legacyAgenda
        ? "agenda"
        : "list";
  const isMonth = view === "month";
  // Eigene Karten-Fläche nur bei EXPLIZIT gewählter Agenda-/Monatsansicht —
  // die Legacy-Agenda rendert wie vor dem Karten-Umbau ohne Panel. Muss
  // dieselbe Antwort geben wie Host (view/[id]) und Editor-Vorschau.
  const ownSurface = calendarOwnSurface(config);

  // Monatsgitter: sichtbares Fenster = ganze Wochen um den aktuellen Monat.
  const weekStartsOn = locale === "en" ? 0 : 1; // So (EN) / Mo (DE)
  const monthAnchor = startOfMonth(new Date());
  const gridStart = startOfWeek(monthAnchor, { weekStartsOn });
  const gridEnd = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn });
  // Monats-Extras: Titel default AN (View ist neu, bricht niemanden),
  // Kalenderwochen opt-in, Termin-Schrift als Feinregler (50–200 %) auf die
  // gemessene Basis.
  const showMonthTitle = config?.showMonthTitle !== false;
  const showWeekNumbers = config?.showWeekNumbers === true;
  const monthTextScale = Math.max(0.5, Math.min(2, Number(config?.monthTextScale) || 1));
  // Was pro Termin in der Zelle steht — alles einzeln schaltbar. Die Uhrzeit
  // kostet bei ~1/7 Spaltenbreite rund 40 % der Zeile, darum abschaltbar.
  const monthShowTime = config?.monthShowTime !== false;
  const monthShowDescription = config?.monthShowDescription === true;
  const monthShowLocation = config?.monthShowLocation === true;
  // Termine pro Tag: "auto" füllt die gemessene Zellenhöhe, "all" zeigt jeden
  // Termin (Zelle scrollt), eine Zahl deckelt hart.
  const monthPerDayCfg = config?.monthPerDay ?? "auto";
  const monthShowAll = monthPerDayCfg === "all";
  const monthFixedPerDay =
    typeof monthPerDayCfg === "number" && monthPerDayCfg > 0 ? Math.min(50, monthPerDayCfg) : null;

  // Zeilen pro Zelle aus der ECHTEN Zellenhöhe rechnen statt fix 3. Gemessen
  // wird der Gitter-Container (6 Wochenzeilen) + seine berechnete Schriftgröße;
  // daraus ergibt sich, wie viele Termin-Zeilen tatsächlich reinpassen.
  const monthGridRef = useRef<HTMLDivElement | null>(null);
  const [monthMetrics, setMonthMetrics] = useState<{ cell: number; colW: number; font: number }>({ cell: 0, colW: 0, font: 0 });
  useEffect(() => {
    const el = monthGridRef.current;
    if (!el || !isMonth) return;
    const measure = () => {
      const font = parseFloat(getComputedStyle(el).fontSize) || 0;
      const cell = Math.max(0, el.clientHeight / 6); // flaches Raster, kein gap
      const colW = Math.max(0, el.clientWidth / (showWeekNumbers ? 7.5 : 7));
      setMonthMetrics((p) =>
        Math.abs(p.cell - cell) < 0.5 && Math.abs(p.colW - colW) < 0.5 && p.font === font
          ? p
          : { cell, colW, font },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMonth, showWeekNumbers]);

  // Termin-Schrift im Monat in PIXELN, abgeleitet aus der gemessenen Zelle —
  // NICHT per em aus der Widget-Schriftgröße. Genau dieselbe Falle wie damals
  // bei den Wetter-Stats: die em-Kette (Widget-fontSize × Raster × Termin)
  // machte den Text bei großen fontSize-Werten riesig, sodass in einer Zeile
  // kaum Text stand. Gängige Kalender-Apps rendern solche Zeilen bei ~11 px —
  // die Zellenhöhe
  // bestimmt, wie viele Zeilen sinnvoll sind, die Spaltenbreite deckelt nach
  // oben, damit der Titel nicht sofort abgeschnitten wird.
  const monthFontPx = (() => {
    const { cell, colW } = monthMetrics;
    if (!cell || !colW) return 11 * monthTextScale;
    const byHeight = cell * 0.135;
    const byWidth = colW * 0.09;
    return Math.max(7, Math.min(22, Math.min(byHeight, byWidth))) * monthTextScale;
  })();
  const monthSubPx = monthFontPx * 0.88;   // Ort / Beschreibung
  const monthDayNumPx = Math.max(9, Math.min(26, monthFontPx * 1.25));
  const monthHeadPx = Math.max(8, Math.min(20, monthFontPx * 1.05));

  // Höhe einer Termin-Einheit: Titelzeile + optional Ort + optional Beschreibung.
  const monthExtraLines = (monthShowLocation ? 1 : 0) + (monthShowDescription ? 1 : 0);
  const autoPerDay = (() => {
    const { cell } = monthMetrics;
    if (!cell) return 3; // bis zur ersten Messung: bisheriger Wert
    // Muss zu den Werten im Rendering passen (Zeilenhöhen 1.55 / 1.35, 1 px Gap).
    const unit = monthFontPx * 1.55 + monthExtraLines * monthSubPx * 1.35 + 1;
    const usable = cell - monthDayNumPx * 1.45 - 4; // Tageszahl + Zellen-Padding
    return Math.max(1, Math.floor(usable / unit));
  })();
  const monthPerDay = monthShowAll
    ? Number.MAX_SAFE_INTEGER
    : (monthFixedPerDay ?? autoPerDay);

  // Karten-Fläche wie bei allen anderen Karten-Widgets (Status/Media/Notify):
  // EINE Fläche über useGlassStyle — dieselbe Deckkraft, dasselbe Hell/Dunkel
  // (cardTheme, folgt auch der zentralen View-Steuerung), dieselben runden
  // Ecken. Keine konkurrierenden Hintergrund-Systeme mehr.
  const glass = useGlassStyle(config);
  // Auto-Hell (zentrale View-Steuerung) greift NUR, wo der Kalender selbst
  // eine helle Fläche zeichnet: Agenda/Monat-Panel mit Deckkraft > 0. Die
  // Listen-Ansicht lebt direkt auf dem Wallpaper — dort bleibt die Schrift
  // bei "auto" immer weiß (+Schatten), sonst kippt sie tagsüber bei hellem
  // View-Theme ins Unsichtbare (dunkle Schrift auf dunklem Wallpaper).
  // Explizites cardTheme="light" bleibt eine bewusste Entscheidung und gewinnt.
  const autoLightOk = ownSurface && glass.cardOpacity > 0;
  const isLight = config?.cardTheme === "light" ? true : glass.isLight && autoLightOk;
  // Explizite Schriftfarbe aus dem "Text & Farbe"-Tab gewinnt IMMER — das
  // Theme (hell/dunkel) liefert nur den Default, wenn keine Farbe gesetzt ist.
  // (Vor dem Karten-Umbau wurde config.color vom Tile geerbt — das hier stellt
  // genau das wieder her.)
  const customColor = typeof config?.color === "string" ? config.color.trim() : "";
  const withAlpha = (c: string, a: number): string => {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
    if (!m) return c;
    let h = m[1];
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const fg = customColor || (isLight ? "rgba(15,23,42,0.92)" : "#ffffff");
  const fgDim = customColor ? withAlpha(customColor, 0.55) : isLight ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.5)";
  const cardRgb = isLight ? "255,255,255" : "0,0,0";
  // Haarlinien des Monatsrasters — dezent, folgt hell/dunkel.
  const gridLine = isLight ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.07)";
  const borderCls = isLight ? "border-black/10" : "border-white/10";

  const [fetchedEvents, setEvents] = useState<CalendarEvent[]>([]);
  // Vorschau-Beispieldaten (#42): Der Editor injiziert __demo. Echte Termine
  // bleiben stehen und werden bis zur KONFIGURIERTEN Anzahl mit Beispielen
  // aufgefüllt — so sieht man das Layout bei voller Liste, auch wenn der
  // Kalender gerade nur einen Termin hat. Im Live-View existiert das nie.
  const events: CalendarEvent[] = !config?.__demo
    ? fetchedEvents
    : (() => {
        // Wie viele Beispieltermine die Vorschau auffüllt — je Ansicht anders.
        const want = Math.max(1, Math.min(isMonth ? 8 : view === "agenda" ? 6 : limit, 12));
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
        if (isMonth) {
          // Monatsgitter: festes Fenster (ganze Wochen um den Monat), auch
          // vergangene Tage. Das Backend kann das über mode=range schon (#…).
          const span = differenceInCalendarDays(gridEnd, gridStart) + 1;
          url.searchParams.set("mode", "range");
          url.searchParams.set("start", format(gridStart, "yyyy-MM-dd"));
          url.searchParams.set("days", String(span));
          url.searchParams.set("limit", "500"); // alle Termine des Monats
        } else if (legacyAgenda) {
          // Legacy-Agenda (altes showEmptyDays): 3-Tage-Fenster, unverändert.
          url.searchParams.set("limit", String(EMPTY_DAYS_FETCH_LIMIT));
          url.searchParams.set("days", "3");
        } else {
          // list + neue Agenda: gemeinsames „kommende Termine"-Fenster.
          url.searchParams.set("limit", String(limit));
          url.searchParams.set("days", String(days));
        }
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (cancelled) return;
        const evts: CalendarEvent[] = data.events || [];
        setEvents(evts);

        // Die Route liefert pro Feed ein error-Feld und trotzdem HTTP 200 —
        // ein einzelner kaputter Kalender (abgelaufenes Token, Tippfehler in
        // der URL) war deshalb komplett unsichtbar: die Karte zeigte einfach
        // die Termine der anderen Feeds und sah gesund aus.
        const broken = (data.feeds || []).filter((f: any) => f?.error);
        if (broken.length > 0) {
          const names = broken.map((f: any) => f.label || f.id).filter(Boolean);
          setError(
            broken.length === (data.feeds || []).length
              ? t("Kalender konnte nicht geladen werden")
              : `${t("Ein Kalender antwortet nicht")}: ${names.join(", ")}`,
          );
        } else {
          setError(null);
        }

        // hideOnEmpty gilt nur für die Listen-Ansicht; Agenda/Monat zeigen
        // ihr Gerüst auch ohne Termine.
        if (view === "list" && hideOnEmpty && evts.length === 0) {
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
  }, [feedsKey, limit, days, hideOnEmpty, showEmptyDays, view]);

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
              <span className="text-[0.8em] leading-tight uppercase tracking-wider" style={{ color: fgDim }}>{weekdayLabel}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={key}
           className={`flex items-center justify-start gap-[0.8em] w-full rounded-3xl p-[0.6em] shrink-0 mb-[0.8em] opacity-50 ${hasBg ? `backdrop-blur-md border ${borderCls} shadow-xl` : ''}`}
           style={{ backgroundColor: `rgba(${cardRgb},${cardOpacity / 100})` }}
      >
        <div
          className={`shrink-0 w-[3.2em] h-[3.2em] rounded-[0.8em] flex flex-col items-center justify-center relative overflow-hidden ${hasBg ? (isLight ? 'border border-black/5' : 'border border-white/5') : ''}`}
          style={{ backgroundColor: `rgba(${cardRgb},${cardOpacity / 100})` }}
        >
          <span className="relative z-10 text-[0.6em] uppercase tracking-wider opacity-80">{monthLabel}</span>
          <span className="relative z-10 text-[1.4em] font-bold tracking-tight leading-none">{dateLabel}</span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-bold tracking-tight text-[0.9em] leading-tight">{t("Keine Termine an diesem Tag")}</span>
          {!hideWeekday && (
            <span className="text-[0.7em] font-mono tracking-wider uppercase mt-[0.2em]" style={{ color: fgDim }}>{weekdayLabel}</span>
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
            <span className="text-[0.8em] leading-tight" style={{ color: fgDim }}>
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
           className={`flex items-center justify-start gap-[0.8em] w-full rounded-3xl p-[0.6em] transform transition-all hover:scale-[1.02] shrink-0 mb-[0.8em] ${hasBg ? `backdrop-blur-md border ${borderCls} shadow-xl` : ''}`}
           style={{ backgroundColor: `rgba(${cardRgb},${cardOpacity / 100})`, boxShadow: hasBg ? `0 8px 32px ${accentColorForEvent}15` : 'none', borderLeft: hasBg ? `0.3em solid ${accentColorForEvent}` : 'none' }}
      >
        <div
          className={`shrink-0 w-[3.2em] h-[3.2em] rounded-[0.8em] flex flex-col items-center justify-center relative overflow-hidden ${hasBg ? (isLight ? 'border border-black/5' : 'border border-white/5') : ''}`}
          style={{ backgroundColor: `rgba(${cardRgb},${cardOpacity / 100})` }}
        >
          <div className="absolute inset-0 opacity-20 blur-md" style={{ backgroundColor: accentColorForEvent }}></div>
          {/* Card-Box: Monat klein oben, große Zahl unten. Wochentag
              wandert in die Subtitle bei der Uhrzeit (rechts neben
              der Box) — wie in den etablierten Kalender-Apps. */}
          <span className="relative z-10 text-[0.6em] uppercase tracking-wider opacity-80" style={{ color: accentColorForEvent }}>{monthLabel}</span>
          <span className="relative z-10 text-[1.4em] font-bold tracking-tight leading-none">{dateLabel}</span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-bold tracking-tight text-[0.9em] leading-tight text-ellipsis whitespace-nowrap overflow-hidden">
            {ev.title}
          </span>
          <span className="text-[0.7em] font-mono tracking-wider uppercase mt-[0.2em]" style={{ color: fgDim }}>
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

  // Gemeinsames Uhrzeit-Muster (auch für Agenda/Monat).
  const timeFmt = config?.calendarTimeFormat || "auto";
  const timePattern =
    timeFmt === "24h" ? "HH:mm"
    : timeFmt === "12h" ? "h:mm a"
    : locale === "en" ? "h:mm a" : "HH:mm";

  // Neue Agenda (DAKboard-Stil): nach Tag gruppiert mit fetter Tages-Überschrift
  // (Heute / Morgen / Wochentag + Datum), darunter schlanke Zeilen.
  const renderAgendaGrouped = () => {
    const groups = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = parseISO(ev.start);
      if (!isValid(d)) continue;
      const key = format(d, "yyyy-MM-dd");
      const list = groups.get(key);
      if (list) list.push(ev);
      else groups.set(key, [ev]);
    }
    const dayKeys = [...groups.keys()].sort();
    if (dayKeys.length === 0) {
      return <div className="opacity-50 text-[0.8em] mt-2">{t("Keine anstehenden Termine")}</div>;
    }
    const isMinimal = config?.design === "minimal";
    return dayKeys.map((key) => {
      const day = parseISO(`${key}T00:00:00`);
      const head = isToday(day) ? t("Heute")
        : isTomorrow(day) ? t("Morgen")
        : format(day, "eee, d. MMM", { locale: dfLocale });
      const dayEvents = groups.get(key)!.slice(0, limit);
      return (
        <div key={key} className="mb-[0.9em]">
          <div className="uppercase tracking-wider font-semibold text-[0.72em] mb-[0.45em]" style={{ color: fgDim }}>{head}</div>
          <div className="flex flex-col gap-[0.4em]">
            {dayEvents.map((ev) => {
              const start = parseISO(ev.start);
              const end = parseISO(ev.end);
              const color = ev.feedColor || accentColor;
              const showRange = isValid(start) && isValid(end) && +end !== +start;
              const timeStr = showRange
                ? `${format(start, timePattern)} – ${format(end, timePattern)}`
                : isValid(start) ? format(start, timePattern) : "";
              return (
                <div key={ev.id} className="flex items-start gap-[0.6em]">
                  <span className="shrink-0 w-[0.25em] self-stretch rounded-full mt-[0.15em]" style={{ backgroundColor: color }} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className={`font-semibold leading-tight truncate ${isMinimal ? "text-[0.95em]" : "text-[0.9em]"}`} style={{ color: fg }}>{ev.title}</span>
                    <span className="text-[0.72em] leading-tight" style={{ color: fgDim }}>
                      {ev.isAllDay
                        ? <span className={`uppercase tracking-wider text-[0.9em] rounded px-[0.35em] py-[0.05em] ${isLight ? "bg-black/10" : "bg-white/10"}`}>{t("Ganztägig")}</span>
                        : timeStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  // Monatsgitter (DAKboard „Full monthly view"): Wochentag-Kopf + 6 Wochen,
  // Termine in den Tageszellen. Ganztägig = farbiger Balken, mit Uhrzeit =
  // Punkt + Titel. Heute hervorgehoben, Tage außerhalb des Monats gedimmt.
  const renderMonth = () => {
    const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const byDay = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = parseISO(ev.start);
      if (!isValid(d)) continue;
      const key = format(d, "yyyy-MM-dd");
      const list = byDay.get(key);
      if (list) list.push(ev);
      else byDay.set(key, [ev]);
    }
    const weekdayHead = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 6) });
    const perCell = monthPerDay; // gemessen, fest eingestellt oder "alle"
    // Optionale KW-Spalte: schmale erste Spalte vor den 7 Wochentagen.
    const colsTemplate = showWeekNumbers ? "1.6em repeat(7, minmax(0,1fr))" : "repeat(7, minmax(0,1fr))";
    return (
      <div className="w-full h-full flex flex-col text-[0.9em]">
        {/* Monatsname + Jahr — gibt dem Gitter den Kalender-Kontext */}
        {showMonthTitle && (
          <div className="flex items-baseline gap-[0.4em] shrink-0 mb-[0.35em] px-[0.15em]">
            <span className="font-semibold text-[1.05em] leading-none capitalize" style={{ color: fg }}>
              {format(monthAnchor, "LLLL", { locale: dfLocale })}
            </span>
            <span className="text-[0.8em] leading-none" style={{ color: fgDim }}>
              {format(monthAnchor, "yyyy")}
            </span>
          </div>
        )}
        {/* Wochentage */}
        <div className="grid shrink-0 pb-[0.2em]" style={{ gridTemplateColumns: colsTemplate }}>
          {showWeekNumbers && (
            <div className="text-center uppercase tracking-wider font-medium" style={{ color: fgDim, fontSize: `${monthHeadPx * 0.85}px` }}>
              {locale === "en" ? "Wk" : "KW"}
            </div>
          )}
          {weekdayHead.map((d) => (
            <div key={+d} className="text-center uppercase tracking-wider font-medium" style={{ color: fgDim, fontSize: `${monthHeadPx}px` }}>
              {format(d, "eee", { locale: dfLocale })}
            </div>
          ))}
        </div>
        {/* 6 Wochen */}
        {/* Flaches Raster mit Haarlinien statt gerundeter Kacheln mit Abstand
            (klassisches Kalender-App-Prinzip): das spart pro Zelle Padding + Lücke und
            bringt bei gleicher Widget-Größe spürbar mehr Termine unter. */}
        <div ref={monthGridRef} className="grid grid-rows-6 flex-1 min-h-0"
             style={{ gridTemplateColumns: colsTemplate, borderTop: `1px solid ${gridLine}`, borderLeft: `1px solid ${gridLine}` }}>
          {gridDays.flatMap((d, i) => {
            const key = format(d, "yyyy-MM-dd");
            const inMonth = isSameMonth(d, monthAnchor);
            const today = isToday(d);
            const dayEvents = (byDay.get(key) || []).slice().sort((a, b) => a.start.localeCompare(b.start));
            const shown = dayEvents.slice(0, perCell);
            const extra = dayEvents.length - shown.length;
            const cells: ReactNode[] = [];
            if (showWeekNumbers && i % 7 === 0) {
              cells.push(
                <div key={`kw-${key}`} className="flex items-start justify-center pt-[0.3em]"
                     style={{ borderRight: `1px solid ${gridLine}`, borderBottom: `1px solid ${gridLine}` }}>
                  <span className="font-medium tabular-nums leading-none" style={{ color: fgDim, fontSize: `${monthHeadPx * 0.85}px` }}>
                    {getISOWeek(d)}
                  </span>
                </div>,
              );
            }
            cells.push(
              <div key={key} className="flex flex-col min-h-0 overflow-hidden px-[0.1em] pt-[0.12em]"
                   style={{
                     borderRight: `1px solid ${gridLine}`,
                     borderBottom: `1px solid ${gridLine}`,
                     // Fremdmonat leicht abgesetzt statt der Eigenmonat-Kachel —
                     // so bleibt das Raster ruhig und die Zellen randlos.
                     backgroundColor: inMonth ? "transparent" : `rgba(${isLight ? "0,0,0" : "255,255,255"},0.025)`,
                   }}>
                <div className="flex justify-end shrink-0 pr-[0.15em]">
                  <span className={`font-semibold leading-none tabular-nums rounded-full min-w-[1.45em] h-[1.45em] flex items-center justify-center ${today ? "bg-red-500 text-white" : ""}`}
                        style={{ fontSize: `${monthDayNumPx}px`, ...(today ? {} : { color: inMonth ? fg : (isLight ? "rgba(15,23,42,0.35)" : "rgba(255,255,255,0.28)") }) }}>
                    {format(d, "d")}
                  </span>
                </div>
                <div className="flex flex-col mt-[0.1em] min-h-0 flex-1">
                <div className={`flex flex-col gap-[1px] min-h-0 flex-1 ${monthShowAll ? "overflow-y-auto no-scrollbar" : "overflow-hidden"}`}
                     style={monthShowAll ? { scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties : undefined}>
                  {shown.map((ev) => {
                    const color = ev.feedColor || accentColor;
                    // Zusatzzeilen (Ort/Beschreibung) hängen unter dem Titel und
                    // sind bewusst kleiner + gedimmt, damit der Titel führt.
                    const subLines = (
                      <>
                        {monthShowLocation && ev.location && (
                          <div className="truncate leading-[1.35]" style={{ color: fgDim, fontSize: `${monthSubPx}px` }}>
                            {ev.location}
                          </div>
                        )}
                        {monthShowDescription && ev.description && (
                          <div className="truncate leading-[1.35]" style={{ color: fgDim, fontSize: `${monthSubPx}px` }}>
                            {ev.description}
                          </div>
                        )}
                      </>
                    );
                    // Schmaler Farbbalken statt Punkt — kostet weniger Breite
                    // und ordnet den Termin trotzdem eindeutig einem Feed zu.
                    const bar = (
                      <span className="shrink-0 rounded-[1px] w-[2px] h-[0.85em]" style={{ backgroundColor: color }} />
                    );
                    if (ev.isAllDay) {
                      return (
                        <div key={ev.id} className="min-w-0">
                          <div className="flex items-center gap-[0.22em] rounded-[0.2em] px-[0.18em] leading-[1.55] mx-[1px]"
                               style={{ backgroundColor: `${color}33`, fontSize: `${monthFontPx}px` }}>
                            {bar}
                            <span className="flex-1 min-w-0 truncate" style={{ color: fg }}>{ev.title}</span>
                          </div>
                          <div className="pl-[0.45em]">{subLines}</div>
                        </div>
                      );
                    }
                    const start = parseISO(ev.start);
                    const time = monthShowTime && isValid(start) ? format(start, timePattern) : "";
                    return (
                      <div key={ev.id} className="min-w-0">
                        {/* Uhrzeit RECHTS in eigener Spalte (Kalender-App-Prinzip):
                            der Titel bekommt einen zusammenhängenden Block
                            statt hinter dem Zeit-Präfix abgeschnitten zu
                            werden, und die Zeiten stehen scanbar untereinander. */}
                        <div className="flex items-center gap-[0.22em] leading-[1.55] px-[0.12em]" style={{ fontSize: `${monthFontPx}px` }}>
                          {bar}
                          <span className="flex-1 min-w-0 truncate" style={{ color: fg }}>{ev.title}</span>
                          {time && (
                            <span className="shrink-0 tabular-nums" style={{ color: fgDim, fontSize: "0.92em" }}>{time}</span>
                          )}
                        </div>
                        <div className="pl-[0.45em]">{subLines}</div>
                      </div>
                    );
                  })}
                </div>
                {extra > 0 && (
                  // Überlauf: farbige Punkte der restlichen Termine + Anzahl —
                  // zeigt auf einen Blick, wie voll der Tag noch ist ("+15"
                  // allein sagt darüber nichts). Als Geschwister der Terminliste
                  // (nicht darin), damit die Reihe auch dann sichtbar bleibt,
                  // wenn die Termine die Zelle exakt ausfüllen.
                  <div className="flex items-center gap-[0.16em] pl-[0.2em] shrink-0 leading-[1.5]" style={{ fontSize: `${monthFontPx * 0.95}px` }}>
                    {dayEvents.slice(perCell, perCell + 7).map((ev) => (
                      <span key={`d-${ev.id}`} className="shrink-0 rounded-full w-[0.34em] h-[0.34em]"
                            style={{ backgroundColor: ev.feedColor || accentColor }} />
                    ))}
                    <span className="ml-[0.15em] leading-none" style={{ color: fgDim, fontSize: "0.9em" }}>+{extra}</span>
                  </div>
                )}
                </div>
              </div>,
            );
            return cells;
          })}
        </div>
      </div>
    );
  };

  const content = error ? (
    <div className="text-red-400/80 text-[0.8em] mt-2">{error}</div>
  ) : isMonth ? (
    renderMonth()
  ) : (
    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col justify-start" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
      {legacyAgenda && renderAgenda()}
      {view === "agenda" && !legacyAgenda && renderAgendaGrouped()}
      {view === "list" && events.length === 0 && !hideOnEmpty && (
        // fgDim IST schon die 50%-Variante — keine zusätzliche opacity-Klasse,
        // sonst wird der Leer-Text doppelt gedimmt (25 % statt 50 %).
        <div className="text-[0.8em] mt-2" style={{ color: fgDim }}>{t("Keine anstehenden Termine")}</div>
      )}
      {view === "list" && events.map(renderEvent)}
    </div>
  );

  // Fläche = EINE Glass-Karte (useGlassStyle) für die explizite Agenda-/
  // Monatsansicht; bei Liste UND Legacy-Agenda liefern die Termin-Kacheln
  // selbst die Fläche, darum außen transparent (= Verhalten vor dem Umbau).
  const usePanel = ownSurface;
  return (
    <div className="w-full h-full overflow-hidden relative rounded-3xl flex flex-col"
         // Radius folgt dem View: normal 1.5rem, im Randlos-Modus 0 (CSS-Var
         // vom Canvas — DAKboard-Mosaik ohne schwarze Eck-Lücken).
         style={{ ...(usePanel ? glass.cardStyle : {}), color: fg, borderRadius: "var(--mf-tile-radius, 1.5rem)" }}>
      <div className={`relative flex flex-col w-full h-full overflow-hidden ${usePanel ? (isMonth ? "p-[0.6em]" : "p-[0.7em]") : (isMonth ? "" : "mt-[1em] justify-center")} ${!usePanel && !isLight ? "drop-shadow-md" : ""}`}>
        {content}
      </div>
    </div>
  );
}

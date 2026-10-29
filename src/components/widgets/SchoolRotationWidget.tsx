"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { dateFnsLocale } from "@/lib/i18n/date-locale";
import { shortDatePattern } from "@/lib/i18n/locales";
import {
  parseSchedules,
  parseReminders,
  remindersFor,
  parseExclusions,
  calendarExclusions,
  parseIsoDate,
  isoDate,
  clampInt,
  getScheduleInfo,
  type ChildSchedule,
} from "@/lib/widgets/school-rotation";

type SchoolRotationConfig = {
  startDate?: string;
  endDate?: string;
  cycleDays?: number;
  schedules?: string;
  noSchoolDates?: string;
  noSchoolCalendar?: string;
  reminders?: string;
  showUpcoming?: boolean;
  upcomingCount?: number;
  accentColor?: string;
};

const ACTIVITY_ICONS: Record<string, string> = {
  gym: "🏃", sport: "🏃", turnen: "🏃", pe: "🏃",
  art: "🎨", kunst: "🎨",
  music: "🎵", musik: "🎵",
  library: "📚", bibliothek: "📚", bücherei: "📚",
  chinese: "🈸", chinesisch: "🈸",
  spanish: "🇪🇸", spanisch: "🇪🇸",
  french: "🇫🇷", französisch: "🇫🇷",
  english: "🇬🇧", englisch: "🇬🇧",
  "play space": "🎪", comedy: "🎭", theater: "🎭",
  stem: "🔬", science: "🔬", sachkunde: "🔬", sachunterricht: "🔬", naturwissenschaften: "🔬",
  computer: "💻", "computer lab": "💻", informatik: "💻",
  math: "🔢", mathe: "🔢", mathematik: "🔢",
  reading: "📖", lesen: "📖", deutsch: "📖",
  writing: "✏️", schreiben: "✏️",
  swimming: "🏊", schwimmen: "🏊",
  werken: "🔨", religion: "🕊️", ethik: "🕊️",
};

function actIcon(activity: string) {
  const key = activity.toLowerCase();
  if (ACTIVITY_ICONS[key]) return ACTIVITY_ICONS[key];
  for (const part of key.split(/\s*\/\s*/)) {
    if (ACTIVITY_ICONS[part]) return ACTIVITY_ICONS[part];
  }
  return "·";
}

const KID_COLORS = [
  "#4f8ef7", "#f76fa1", "#50c878", "#f7b84f",
  "#a87ff7", "#4fd1c5", "#f75f5f", "#7fb8f7",
];

// Alle sechs Stunden: so kommen nachgetragene Ferien an, ohne Home Assistant
// mit jedem Display im Minutentakt zu befragen.
const CALENDAR_REFRESH_MS = 6 * 60 * 60 * 1000;

export default function SchoolRotationWidget({ config }: { config?: SchoolRotationConfig }) {
  const c = config ?? {};
  const { locale, t } = useLocale();
  const fmtShort = (d: Date) =>
    format(d, `EEE ${shortDatePattern(locale)}`, { locale: dateFnsLocale(locale) });

  const [dateKey, setDateKey] = useState(() => isoDate(new Date()));
  useEffect(() => {
    const interval = setInterval(() => {
      const now = isoDate(new Date());
      if (now !== dateKey) setDateKey(now);
    }, 30000);
    return () => clearInterval(interval);
  }, [dateKey]);

  const start = useMemo(() => parseIsoDate(c.startDate), [c.startDate]);
  const end = useMemo(() => parseIsoDate(c.endDate), [c.endDate]);
  const yearOk = !!start && !!end && start <= end;
  const cycle = clampInt(c.cycleDays, 1, 30, 6);
  const showUpcoming = c.showUpcoming !== false;
  const lookahead = clampInt(c.upcomingCount, 1, 14, 3);
  const accent = typeof c.accentColor === "string" && c.accentColor.trim() ? c.accentColor.trim() : "#4f8ef7";
  const calendarEntity = typeof c.noSchoolCalendar === "string" ? c.noSchoolCalendar.trim() : "";

  const kids = useMemo<ChildSchedule[] | null>(() => parseSchedules(c.schedules), [c.schedules]);
  const reminders = useMemo(() => parseReminders(c.reminders), [c.reminders]);

  // Schulfreie Tage aus einem Home-Assistant-Kalender, zusätzlich zur Liste.
  const [calExcl, setCalExcl] = useState<Map<string, string>>(() => new Map());
  const [calError, setCalError] = useState(false);
  useEffect(() => {
    if (!calendarEntity || !yearOk) {
      setCalExcl(new Map());
      setCalError(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const url = new URL("/api/calendar", window.location.origin);
        url.searchParams.set("feeds", JSON.stringify([{ type: "homeassistant", calendarId: calendarEntity }]));
        url.searchParams.set("mode", "range");
        url.searchParams.set("start", isoDate(start!));
        url.searchParams.set("days", String(Math.round((end!.getTime() - start!.getTime()) / 86400000) + 1));
        url.searchParams.set("limit", "500");
        const res = await fetch(url.toString(), { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const failed = !res.ok || !Array.isArray(data?.events) || (data?.feeds ?? []).some((f: any) => f?.error);
        setCalError(failed);
        if (!failed) setCalExcl(calendarExclusions(data.events));
      } catch {
        if (!cancelled) setCalError(true);
      }
    };
    load();
    const timer = setInterval(load, CALENDAR_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [calendarEntity, yearOk, start, end, dateKey]);

  const excl = useMemo(() => {
    const merged = new Map(calExcl);
    for (const [day, reason] of parseExclusions(c.noSchoolDates)) merged.set(day, reason || merged.get(day) || "");
    return merged;
  }, [calExcl, c.noSchoolDates]);

  const today = useMemo(() => parseIsoDate(dateKey)!, [dateKey]);
  const info = useMemo(
    () => (yearOk ? getScheduleInfo(today, start!, end!, excl, cycle, lookahead) : null),
    [yearOk, today, start, end, excl, cycle, lookahead],
  );

  const notice = (icon: string, title: string, sub?: string, error = false) => (
    <div className={`w-full h-full flex flex-col items-center justify-center gap-[0.3em] text-center ${error ? "" : "opacity-60"}`}>
      <div className="text-[1.5em]">{icon}</div>
      <div className="text-[1em] font-semibold" style={error ? { color: "#ff6b6b" } : undefined}>{title}</div>
      {sub && <div className="text-[0.8em] opacity-70">{sub}</div>}
    </div>
  );

  if (kids === null) {
    return notice("⚠", t("Stundenplan unlesbar"), t("In den Einstellungen unter Inhalt prüfen."), true);
  }
  if (!info) {
    return notice("📅", t("Schuljahr fehlt"), t("Ersten und letzten Schultag in den Einstellungen eintragen."));
  }
  if (info.status === "after-end") return notice("☀️", t("Schuljahr vorbei"));
  if (info.status === "before-start") return notice("📅", t("Schule beginnt"), fmtShort(start!));

  const isSchool = info.status === "school-day";
  const dayLabel = (n: number) => `${t("Tag")} ${n}`;

  function renderKidLine(rotDay: number, colorize: boolean) {
    return kids!.map((kid, i) => {
      const color = KID_COLORS[i % KID_COLORS.length];
      const acts = kid.days[String(rotDay)] || [];
      const label = acts.length > 0 ? acts.map((a) => `${actIcon(a)} ${a}`).join(", ") : "—";
      const style = colorize ? { color } : { color, opacity: 0.6 };
      return <span key={`${kid.name}-${i}`} style={style}>{kid.name}: {label}</span>;
    });
  }

  const activeReminders = isSchool ? remindersFor(reminders, today) : [];

  return (
    <div className="w-full h-full flex flex-col" style={{ gap: "0.2em", padding: "0.3em" }}>
      {/* Header badge */}
      <div className="flex flex-col items-center">
        {isSchool ? (
          <div
            className="font-bold text-[1.1em]"
            style={{ background: accent, color: "#fff", borderRadius: "0.35em", padding: "0.1em 0.5em" }}
          >
            {dayLabel(info.todayRotation!)}
          </div>
        ) : (
          <div
            className="font-semibold text-[0.9em]"
            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", borderRadius: "0.35em", padding: "0.1em 0.5em" }}
          >
            {t("Schulfrei")}
          </div>
        )}
        {!isSchool && info.reason && <div className="text-[0.75em] opacity-50 italic">{info.reason}</div>}
        {calError && <div className="text-[0.65em] opacity-60" style={{ color: "#fbbf24" }}>{t("Ferienkalender nicht erreichbar")}</div>}
      </div>

      {/* Today's activities */}
      {isSchool && kids.length > 0 && (
        <div className="flex justify-center flex-wrap" style={{ gap: "0.3em", fontSize: "0.85em" }}>
          {renderKidLine(info.todayRotation!, true)}
        </div>
      )}

      {/* Weekly reminders */}
      {activeReminders.length > 0 && (
        <div className="flex flex-col" style={{ gap: "0.15em" }}>
          {activeReminders.map((r, ri) => {
            const idx = r.kid ? kids.findIndex((k) => k.name.toLowerCase() === r.kid!.toLowerCase()) : -1;
            const kidColor = idx >= 0 ? KID_COLORS[idx % KID_COLORS.length] : "#fbbf24";
            return (
              <div
                key={ri}
                className="flex items-center"
                style={{
                  gap: "0.35em", background: "rgba(251, 191, 36, 0.15)",
                  border: "1px solid rgba(251, 191, 36, 0.3)", borderRadius: "0.3em",
                  padding: "0.2em 0.4em", fontSize: "0.8em",
                }}
              >
                <span style={{ fontSize: "0.95em", flexShrink: 0 }}>{r.icon || "🔔"}</span>
                <span style={{ fontWeight: 500, color: "#fbbf24" }}>{r.text}</span>
                {r.kid && (
                  <span style={{ fontWeight: 600, color: kidColor, marginLeft: "auto", fontSize: "0.9em", flexShrink: 0 }}>
                    {r.kid}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tomorrow / next school day */}
      {info.upcoming.length > 0 && kids.length > 0 && (
        <div className="flex flex-col" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.2em", gap: "0.1em" }}>
          <div className="uppercase font-semibold" style={{ fontSize: "0.65em", letterSpacing: "0.1em", opacity: 0.35 }}>
            {isSchool
              ? `${t("Morgen")} · ${dayLabel(info.upcoming[0].rotDay)}`
              : `${t("Nächster Schultag")} · ${dayLabel(info.upcoming[0].rotDay)} · ${fmtShort(info.upcoming[0].date)}`}
          </div>
          <div className="flex flex-wrap" style={{ gap: "0.3em", fontSize: "0.75em" }}>
            {renderKidLine(info.upcoming[0].rotDay, false)}
          </div>
        </div>
      )}

      {/* Additional upcoming days */}
      {showUpcoming && info.upcoming.length > 1 && (
        <div className="flex flex-col" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.2em", gap: "0.15em" }}>
          <div className="uppercase font-semibold" style={{ fontSize: "0.65em", letterSpacing: "0.1em", opacity: 0.35 }}>
            {t("Demnächst")}
          </div>
          {info.upcoming.slice(1).map((u) => (
            <div key={isoDate(u.date)} className="flex items-baseline" style={{ gap: "0.3em", fontSize: "0.75em" }}>
              <span className="font-semibold whitespace-nowrap" style={{ color: accent, opacity: 0.8, minWidth: "5em" }}>
                {fmtShort(u.date)} · {dayLabel(u.rotDay)}
              </span>
              {kids.length > 0 && (
                <span className="truncate" style={{ opacity: 0.5 }}>
                  {kids
                    .map((kid) => {
                      const acts = kid.days[String(u.rotDay)] || [];
                      return acts.length > 0 ? `${kid.name}: ${acts.join(", ")}` : "";
                    })
                    .filter(Boolean)
                    .join("  ·  ")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

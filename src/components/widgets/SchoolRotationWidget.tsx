"use client";

import React, { useState, useEffect, useMemo } from "react";

type ChildSchedule = {
  name: string;
  days: Record<string, string[]>;
};

type Reminder = {
  day: string;
  text: string;
  icon?: string;
  kid?: string;
};

type SchoolRotationConfig = {
  startDate?: string;
  endDate?: string;
  cycleDays?: number;
  schedules?: string;
  noSchoolDates?: string;
  reminders?: string;
  showUpcoming?: boolean;
  upcomingCount?: number;
  accentColor?: string;
};

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isWeekday(d: Date) {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

function parseExclusions(text: string | undefined) {
  const map = new Map<string, string>();
  if (!text) return map;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s*(.*)/);
    if (match) map.set(match[1], match[2].replace(/^[:\-–—]\s*/, "").trim());
  }
  return map;
}

function isSchoolDay(d: Date, excl: Map<string, string>) {
  return isWeekday(d) && !excl.has(fmtDate(d));
}

function walkForward(
  after: Date,
  start: Date,
  end: Date,
  excl: Map<string, string>,
  cycle: number,
  count: number,
  schoolDaysSoFar: number,
) {
  const result: { date: Date; rotDay: number }[] = [];
  const cur = new Date(after);
  cur.setDate(cur.getDate() + 1);
  while (result.length < count && cur <= end) {
    if (isSchoolDay(cur, excl)) {
      schoolDaysSoFar++;
      result.push({
        date: new Date(cur),
        rotDay: ((schoolDaysSoFar - 1) % cycle) + 1,
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

type ScheduleInfo = {
  status: "before-start" | "after-end" | "school-day" | "weekend" | "no-school";
  todayRotation: number | null;
  reason: string;
  upcoming: { date: Date; rotDay: number }[];
};

function getScheduleInfo(
  today: Date,
  start: Date,
  end: Date,
  excl: Map<string, string>,
  cycle: number,
  lookahead: number,
): ScheduleInfo {
  const todayStr = fmtDate(today);

  if (today < start) {
    const upcoming = walkForward(
      new Date(start.getTime() - 86400000),
      start, end, excl, cycle, lookahead, 0,
    );
    return { status: "before-start", todayRotation: null, reason: "", upcoming };
  }
  if (today > end) {
    return { status: "after-end", todayRotation: null, reason: "", upcoming: [] };
  }

  let schoolDays = 0;
  let todayRotation: number | null = null;
  const current = new Date(start);

  while (current <= today) {
    if (isSchoolDay(current, excl)) schoolDays++;
    if (fmtDate(current) === todayStr) {
      if (isSchoolDay(current, excl)) {
        todayRotation = ((schoolDays - 1) % cycle) + 1;
      }
      break;
    }
    current.setDate(current.getDate() + 1);
  }

  const upcoming = walkForward(today, start, end, excl, cycle, lookahead, schoolDays);

  if (todayRotation !== null) {
    return { status: "school-day", todayRotation, reason: "", upcoming };
  }

  const reason = excl.get(todayStr) || "";
  const status = !isWeekday(today) ? "weekend" : "no-school";
  return { status, todayRotation: null, reason, upcoming };
}

const ACTIVITY_ICONS: Record<string, string> = {
  gym: "🏃", art: "🎨", music: "🎵", library: "📚",
  chinese: "🈸", spanish: "🇪🇸", "play space": "🎪",
  comedy: "🎭", stem: "🔬", computer: "💻",
  "computer lab": "💻", science: "🔬", math: "🔢",
  reading: "📖", writing: "✏️",
};

function actIcon(activity: string) {
  return ACTIVITY_ICONS[activity.toLowerCase()] || "▸";
}

const DAY_NAMES_LOWER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function parseReminders(text: string | undefined): Reminder[] {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter((r: any) => r.day && r.text) : [];
  } catch {
    return [];
  }
}

function getRemindersForDay(reminders: Reminder[], date: Date, isSchool: boolean) {
  if (!isSchool) return [];
  const dayName = DAY_NAMES_LOWER[date.getDay()];
  return reminders.filter((r) => r.day.toLowerCase() === dayName);
}

const KID_COLORS = [
  "#4f8ef7", "#f76fa1", "#50c878", "#f7b84f",
  "#a87ff7", "#4fd1c5", "#f75f5f", "#7fb8f7",
];

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtShort(d: Date) {
  return `${SHORT_DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export default function SchoolRotationWidget({ config }: { config?: SchoolRotationConfig }) {
  const c = config ?? {};

  const [dateKey, setDateKey] = useState(() => fmtDate(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      const now = fmtDate(new Date());
      if (now !== dateKey) setDateKey(now);
    }, 30000);
    return () => clearInterval(interval);
  }, [dateKey]);

  const start = useMemo(() => parseDate(c.startDate || "2026-09-02"), [c.startDate]);
  const end = useMemo(() => parseDate(c.endDate || "2027-06-25"), [c.endDate]);
  const cycle = c.cycleDays || 6;
  const showUpcoming = c.showUpcoming !== false;
  const lookahead = c.upcomingCount || 3;
  const accent = c.accentColor || "#4f8ef7";

  const kids = useMemo<ChildSchedule[] | null>(() => {
    try {
      const parsed = JSON.parse(c.schedules || "[]");
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [c.schedules]);

  const reminders = useMemo(() => parseReminders(c.reminders), [c.reminders]);
  const excl = useMemo(() => parseExclusions(c.noSchoolDates), [c.noSchoolDates]);
  const today = useMemo(() => parseDate(dateKey), [dateKey]);
  const info = useMemo(
    () => getScheduleInfo(today, start, end, excl, cycle, lookahead),
    [today, start, end, excl, cycle, lookahead],
  );

  if (kids === null) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-[0.3em]">
        <div className="text-[1.5em]">⚠</div>
        <div style={{ color: "#ff6b6b" }}>Invalid schedule JSON</div>
        <div className="text-[0.8em] opacity-60">Check the Schedules field in widget settings</div>
      </div>
    );
  }

  if (info.status === "after-end") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-[0.3em] opacity-50">
        <div className="text-[1.5em]">☀️</div>
        <div className="text-[1em] font-semibold">School&apos;s Out</div>
      </div>
    );
  }

  if (info.status === "before-start") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-[0.3em] opacity-50">
        <div className="text-[1.5em]">📅</div>
        <div className="text-[1em] font-semibold">School starts</div>
        <div className="text-[0.85em]">{fmtShort(start)}</div>
      </div>
    );
  }

  const isSchool = info.status === "school-day";

  function renderKidLine(rotDay: number, colorize: boolean) {
    return kids!.map((kid, i) => {
      const color = KID_COLORS[i % KID_COLORS.length];
      const acts = kid.days?.[String(rotDay)] || [];
      const label = acts.length > 0
        ? acts.map((a) => `${actIcon(a)} ${a}`).join(", ")
        : "—";
      const style = colorize ? { color } : { color, opacity: 0.6 };
      return <span key={kid.name} style={style}>{kid.name}: {label}</span>;
    });
  }

  const activeReminders = getRemindersForDay(reminders, today, isSchool);

  return (
    <div className="w-full h-full flex flex-col" style={{ gap: "0.2em", padding: "0.3em" }}>
      {/* Header badge */}
      <div className="flex flex-col items-center">
        {isSchool ? (
          <div
            className="font-bold text-[1.1em]"
            style={{ background: accent, color: "#fff", borderRadius: "0.35em", padding: "0.1em 0.5em" }}
          >
            Day {info.todayRotation}
          </div>
        ) : (
          <div
            className="font-semibold text-[0.9em]"
            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", borderRadius: "0.35em", padding: "0.1em 0.5em" }}
          >
            No School
          </div>
        )}
        {!isSchool && info.reason && (
          <div className="text-[0.75em] opacity-50 italic">{info.reason}</div>
        )}
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
            const kidColor = r.kid && kids
              ? (() => {
                  const idx = kids.findIndex((k) => k.name.toLowerCase() === r.kid!.toLowerCase());
                  return idx >= 0 ? KID_COLORS[idx % KID_COLORS.length] : "#fbbf24";
                })()
              : null;
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
                  <span style={{ fontWeight: 600, color: kidColor || "#fbbf24", marginLeft: "auto", fontSize: "0.9em", flexShrink: 0 }}>
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
              ? `Tomorrow · Day ${info.upcoming[0].rotDay}`
              : `Next · Day ${info.upcoming[0].rotDay} · ${fmtShort(info.upcoming[0].date)}`}
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
            Upcoming
          </div>
          {info.upcoming.slice(1).map((u) => (
            <div key={fmtDate(u.date)} className="flex items-baseline" style={{ gap: "0.3em", fontSize: "0.75em" }}>
              <span className="font-semibold whitespace-nowrap" style={{ color: accent, opacity: 0.8, minWidth: "5em" }}>
                {fmtShort(u.date)} · Day {u.rotDay}
              </span>
              {kids.length > 0 && (
                <span className="truncate" style={{ opacity: 0.5 }}>
                  {kids.map((kid) => {
                    const acts = kid.days?.[String(u.rotDay)] || [];
                    return acts.length > 0 ? `${kid.name}: ${acts.join(", ")}` : "";
                  }).filter(Boolean).join("  ·  ")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

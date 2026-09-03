/**
 * School Rotation Schedule module.
 * Tracks a 6-day (configurable) rotating school schedule per child,
 * with holiday and snow day support that pauses the rotation.
 *
 * Build:  node scripts/build-module.mjs examples/modules/school-rotation/school-rotation.js examples/modules/school-rotation/dist
 * Upload: module.json + bundle.js via /editor/modules
 */

export const manifest = {
  type: "school-rotation",
  label: "School Rotation",
  description: "Rotating school schedule with per-child activities and holiday support.",
  iconEmoji: "🏫",
  version: "1.0.0",
  author: "sth2258",
  fields: [
    {
      key: "startDate",
      label: "First Day of School",
      type: "text",
      default: "2026-09-02",
      help: "YYYY-MM-DD — this date is Day 1 of the rotation.",
    },
    {
      key: "endDate",
      label: "Last Day of School",
      type: "text",
      default: "2027-06-25",
      help: "YYYY-MM-DD — rotation stops after this date.",
    },
    {
      key: "cycleDays",
      label: "Rotation Cycle Length",
      type: "number",
      default: 6,
      help: "Number of days in the rotation (typically 6).",
    },
    {
      key: "schedules",
      label: "Schedules (JSON)",
      type: "textarea",
      default:
        '[\n  {\n    "name": "Child 1",\n    "days": {\n      "1": ["Gym"],\n      "2": ["Art"],\n      "3": ["Music"],\n      "4": ["Library"],\n      "5": ["Spanish"],\n      "6": ["STEM"]\n    }\n  },\n  {\n    "name": "Child 2",\n    "days": {\n      "1": ["Art"],\n      "2": ["Gym"],\n      "3": ["Library"],\n      "4": ["Music"],\n      "5": ["STEM"],\n      "6": ["Spanish"]\n    }\n  }\n]',
      help: "JSON array of children. Each has a name and days object mapping rotation day numbers (1-6) to arrays of activities.",
    },
    {
      key: "noSchoolDates",
      label: "No-School Dates",
      type: "textarea",
      default: "",
      help: "One per line: YYYY-MM-DD followed by optional reason. Lines starting with # are comments. These dates pause the rotation — add holidays, snow days, etc.",
    },
    {
      key: "showUpcoming",
      label: "Show Upcoming Days",
      type: "boolean",
      default: true,
    },
    {
      key: "upcomingCount",
      label: "Upcoming Days to Show",
      type: "number",
      default: 3,
      help: "Number of future school days to preview.",
    },
    {
      key: "accentColor",
      label: "Accent Color",
      type: "color",
      default: "#4f8ef7",
    },
  ],
};

// -- Helpers --

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isWeekday(d) {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

function parseExclusions(text) {
  const map = new Map();
  if (!text) return map;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s*(.*)/);
    if (match) map.set(match[1], match[2].replace(/^[:\-–—]\s*/, "").trim());
  }
  return map;
}

function isSchoolDay(d, excl) {
  return isWeekday(d) && !excl.has(fmtDate(d));
}

function walkForward(after, start, end, excl, cycle, count, schoolDaysSoFar) {
  const result = [];
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

function getScheduleInfo(today, start, end, excl, cycle, lookahead) {
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
  let todayRotation = null;
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

// -- Activity icons --

const ACTIVITY_ICONS = {
  gym: "🏃", art: "🎨", music: "🎵", library: "📚",
  chinese: "🈸", spanish: "🇪🇸", "play space": "🎪",
  comedy: "🎭", stem: "🔬", computer: "💻",
  "computer lab": "💻", science: "🔬", math: "🔢",
  reading: "📖", writing: "✏️",
};

function actIcon(activity) {
  return ACTIVITY_ICONS[activity.toLowerCase()] || "▸";
}

const KID_COLORS = [
  "#4f8ef7", "#f76fa1", "#50c878", "#f7b84f",
  "#a87ff7", "#4fd1c5", "#f75f5f", "#7fb8f7",
];

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtShort(d) {
  return `${SHORT_DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// -- Render --

export default function render(ctx) {
  const h = ctx.createElement;
  const { useState, useEffect, useMemo, config: c } = ctx;

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

  const kids = useMemo(() => {
    try {
      const parsed = JSON.parse(c.schedules || "[]");
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }, [c.schedules]);

  const excl = useMemo(() => parseExclusions(c.noSchoolDates), [c.noSchoolDates]);
  const today = useMemo(() => parseDate(dateKey), [dateKey]);
  const info = useMemo(
    () => getScheduleInfo(today, start, end, excl, cycle, lookahead),
    [today, start, end, excl, cycle, lookahead],
  );

  // Error: bad JSON
  if (kids === null) {
    return h("div", { className: "w-full h-full flex flex-col items-center justify-center gap-[0.3em]" },
      h("div", { className: "text-[1.5em]" }, "⚠"),
      h("div", { style: { color: "#ff6b6b" } }, "Invalid schedule JSON"),
      h("div", { className: "text-[0.8em] opacity-60" }, "Check the Schedules field in widget settings"),
    );
  }

  // After school year
  if (info.status === "after-end") {
    return h("div", { className: "w-full h-full flex flex-col items-center justify-center gap-[0.3em] opacity-50" },
      h("div", { className: "text-[1.5em]" }, "☀️"),
      h("div", { className: "text-[1em] font-semibold" }, "School's Out"),
    );
  }

  // Before school year
  if (info.status === "before-start") {
    return h("div", { className: "w-full h-full flex flex-col items-center justify-center gap-[0.3em] opacity-50" },
      h("div", { className: "text-[1.5em]" }, "📅"),
      h("div", { className: "text-[1em] font-semibold" }, "School starts"),
      h("div", { className: "text-[0.85em]" }, fmtShort(start)),
    );
  }

  const isSchool = info.status === "school-day";

  function renderKidLine(rotDay, colorize) {
    return kids.map((kid, i) => {
      const color = KID_COLORS[i % KID_COLORS.length];
      const acts = kid.days?.[String(rotDay)] || [];
      const label = acts.length > 0
        ? acts.map((a) => `${actIcon(a)} ${a}`).join(", ")
        : "—";
      const style = colorize ? { color } : { color, opacity: 0.6 };
      return h("span", { key: kid.name, style }, `${kid.name}: ${label}`);
    });
  }

  return h("div", {
    className: "w-full h-full flex flex-col",
    style: { gap: "0.2em", padding: "0.3em" },
  },
    // Header badge
    h("div", { className: "flex flex-col items-center" },
      isSchool
        ? h("div", {
            className: "font-bold text-[1.1em]",
            style: { background: accent, color: "#fff", borderRadius: "0.35em", padding: "0.1em 0.5em" },
          }, `Day ${info.todayRotation}`)
        : h("div", {
            className: "font-semibold text-[0.9em]",
            style: { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", borderRadius: "0.35em", padding: "0.1em 0.5em" },
          }, "No School"),
      !isSchool && info.reason &&
        h("div", { className: "text-[0.75em] opacity-50 italic" }, info.reason),
    ),

    // Today's activities
    isSchool && kids.length > 0 &&
      h("div", { className: "flex justify-center flex-wrap", style: { gap: "0.3em", fontSize: "0.85em" } },
        ...renderKidLine(info.todayRotation, true),
      ),

    // Tomorrow / next school day
    info.upcoming.length > 0 && kids.length > 0 &&
      h("div", { className: "flex flex-col", style: { borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.2em", gap: "0.1em" } },
        h("div", { className: "uppercase font-semibold", style: { fontSize: "0.65em", letterSpacing: "0.1em", opacity: 0.35 } },
          isSchool
            ? `Tomorrow · Day ${info.upcoming[0].rotDay}`
            : `Next · Day ${info.upcoming[0].rotDay} · ${fmtShort(info.upcoming[0].date)}`,
        ),
        h("div", { className: "flex flex-wrap", style: { gap: "0.3em", fontSize: "0.75em" } },
          ...renderKidLine(info.upcoming[0].rotDay, false),
        ),
      ),

    // Additional upcoming days
    showUpcoming && info.upcoming.length > 1 &&
      h("div", { className: "flex flex-col", style: { borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.2em", gap: "0.15em" } },
        h("div", { className: "uppercase font-semibold", style: { fontSize: "0.65em", letterSpacing: "0.1em", opacity: 0.35 } }, "Upcoming"),
        ...info.upcoming.slice(1).map((u) =>
          h("div", { key: fmtDate(u.date), className: "flex items-baseline", style: { gap: "0.3em", fontSize: "0.75em" } },
            h("span", { className: "font-semibold whitespace-nowrap", style: { color: accent, opacity: 0.8, minWidth: "5em" } },
              `${fmtShort(u.date)} · Day ${u.rotDay}`,
            ),
            kids.length > 0 &&
              h("span", { className: "truncate", style: { opacity: 0.5 } },
                kids.map((kid) => {
                  const acts = kid.days?.[String(u.rotDay)] || [];
                  return acts.length > 0 ? `${kid.name}: ${acts.join(", ")}` : "";
                }).filter(Boolean).join("  ·  "),
              ),
          ),
        ),
      ),
  );
}
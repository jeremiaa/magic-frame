"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";
import HAEntityInput from "../_components/HAEntityInput";
import { clampInt, WEEKDAYS } from "@/lib/widgets/school-rotation";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500";
const SMALL_INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-md px-2.5 h-9 focus:outline-none focus:border-blue-500";
const TEXTAREA =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500 font-mono";

const WEEKDAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
};

// Der Inspektor liest nachsichtiger als das Widget: ein Kind ohne Namen oder
// eine Erinnerung ohne Text ist hier ein Eintrag, den man gerade anlegt — das
// Widget lässt solche Einträge einfach weg. Die Tage bleiben Text mit Kommas,
// sonst verschluckte jede Umwandlung in eine Liste das Komma beim Tippen.
type EditKid = { name: string; days: Record<string, string> };
type EditReminder = { day: string; text: string; icon: string; kid: string };

function readArray(raw: unknown): unknown[] | null {
  if (raw === undefined || raw === null || raw === "") return [];
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

function editKids(raw: unknown): EditKid[] | null {
  const list = readArray(raw);
  if (!list) return null;
  return list
    .filter((k): k is Record<string, any> => !!k && typeof k === "object" && !Array.isArray(k))
    .map((k) => {
      const days: Record<string, string> = {};
      if (k.days && typeof k.days === "object") {
        for (const [d, v] of Object.entries(k.days)) {
          days[d] = Array.isArray(v) ? v.map(String).join(", ") : typeof v === "string" ? v : "";
        }
      }
      return { name: typeof k.name === "string" ? k.name : "", days };
    });
}

// Rotation days land in the form as number-text ("3") instead of a weekday —
// that way EditReminder.day stays a plain string everywhere, and the
// <select> below can carry either kind as its value.
function editReminders(raw: unknown): EditReminder[] | null {
  const list = readArray(raw);
  if (!list) return null;
  return list
    .filter((r): r is Record<string, any> => !!r && typeof r === "object" && !Array.isArray(r))
    .map((r) => {
      const lower = typeof r.day === "string" ? r.day.trim().toLowerCase() : "";
      const num = typeof r.day === "number" ? r.day : typeof r.day === "string" ? Number(r.day.trim()) : NaN;
      const day = (WEEKDAYS as readonly string[]).includes(lower)
        ? lower
        : Number.isInteger(num) && num >= 1
          ? String(num)
          : "monday";
      return {
        day,
        text: typeof r.text === "string" ? r.text : "",
        icon: typeof r.icon === "string" ? r.icon : "",
        kid: typeof r.kid === "string" ? r.kid : "",
      };
    });
}

const capitalized = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);

// Weekday -> text as before; rotation day -> number, so remindersFor checks
// it against todayRotation instead of the calendar day.
const serializeDay = (day: string): string | number =>
  (WEEKDAYS as readonly string[]).includes(day) ? capitalized(day) : Number(day);

export default function SchoolRotationInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  const set = (key: string, value: any) => updateConfig(widget.i, key, value);

  const cycle = clampInt(cfg.cycleDays, 2, 10, 6);
  const kids = editKids(cfg.schedules);
  const reminders = editReminders(cfg.reminders);
  const kidNames = (kids ?? []).map((k) => k.name.trim()).filter(Boolean);

  const saveKids = (next: EditKid[]) => set("schedules", JSON.stringify(next));
  const saveReminders = (next: EditReminder[]) =>
    set(
      "reminders",
      JSON.stringify(
        next.map((r) => ({
          day: serializeDay(r.day),
          text: r.text,
          ...(r.icon ? { icon: r.icon } : {}),
          ...(r.kid ? { kid: r.kid } : {}),
        })),
      ),
    );

  const sectionLabel = "text-sm font-medium text-[var(--mf-fg)]/80 block";
  const hint = "text-[11px] text-[var(--mf-fg)]/40 leading-relaxed";

  return (
    <div className="space-y-6">
      {/* Schuljahr */}
      <div className="space-y-2.5">
        <label className={sectionLabel}>{t("Schuljahr")}</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--mf-fg)]/50 mb-1 block">{t("Erster Schultag")}</label>
            <input type="date" value={cfg.startDate || ""} onChange={(e) => set("startDate", e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="text-xs text-[var(--mf-fg)]/50 mb-1 block">{t("Letzter Schultag")}</label>
            <input type="date" value={cfg.endDate || ""} onChange={(e) => set("endDate", e.target.value)} className={INPUT} />
          </div>
        </div>
      </div>

      {/* Zyklus */}
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 flex justify-between">
          <span>{t("Rotationszyklus")}</span>
          <span className="text-blue-400">{cycle} {t("Tage")}</span>
        </label>
        <input
          type="range"
          min={2}
          max={10}
          step={1}
          value={cycle}
          onChange={(e) => set("cycleDays", parseInt(e.target.value, 10))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
        />
      </div>

      {/* Kinder */}
      <div className="space-y-2.5">
        <label className={sectionLabel}>{t("Kinder")}</label>
        {kids === null ? (
          <p className="text-xs text-amber-400">
            {t("Der gespeicherte Stundenplan ist kein gültiges JSON. Unten unter „Als JSON bearbeiten“ korrigieren.")}
          </p>
        ) : (
          <>
            {kids.map((kid, ki) => (
              <div key={ki} className="rounded-xl border border-[var(--mf-bdr)]/10 bg-[var(--mf-elev)]/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={kid.name}
                    placeholder={t("Name")}
                    onChange={(e) => saveKids(kids.map((k, i) => (i === ki ? { ...k, name: e.target.value } : k)))}
                    className={SMALL_INPUT}
                  />
                  <button
                    type="button"
                    title={t("Entfernen")}
                    onClick={() => saveKids(kids.filter((_, i) => i !== ki))}
                    className="shrink-0 h-9 w-9 flex items-center justify-center rounded-md text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {Array.from({ length: cycle }, (_, d) => String(d + 1)).map((d) => (
                  <div key={d} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs text-[var(--mf-fg)]/50">{t("Tag")} {d}</span>
                    <input
                      type="text"
                      value={kid.days[d] ?? ""}
                      placeholder={t("z. B. Sport, Musik")}
                      onChange={(e) =>
                        saveKids(kids.map((k, i) => (i === ki ? { ...k, days: { ...k.days, [d]: e.target.value } } : k)))
                      }
                      className={SMALL_INPUT}
                    />
                  </div>
                ))}
              </div>
            ))}
            <button
              type="button"
              onClick={() => saveKids([...kids, { name: "", days: {} }])}
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-[var(--mf-bdr)]/20 text-sm text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5"
            >
              <Plus size={14} /> {t("Kind hinzufügen")}
            </button>
            <p className={hint}>{t("Pro Rotationstag die Fächer oder Aktivitäten, mit Komma getrennt.")}</p>
          </>
        )}
      </div>

      {/* Schulfreie Tage */}
      <div className="space-y-2.5">
        <label className={sectionLabel}>{t("Schulfreie Tage")}</label>
        <label className="text-xs text-[var(--mf-fg)]/50 block">{t("Ferienkalender aus Home Assistant")}</label>
        <HAEntityInput
          value={cfg.noSchoolCalendar ?? ""}
          onChange={(v) => set("noSchoolCalendar", v)}
          domains={["calendar"]}
          placeholder="calendar.schulferien"
          className={INPUT}
        />
        <p className={hint}>
          {t("Jeder ganztägige Termin in diesem Kalender pausiert die Zählung — Ferien, Feiertage, Brückentage.")}
        </p>
        <label className="text-xs text-[var(--mf-fg)]/50 block pt-1">{t("Weitere schulfreie Tage")}</label>
        <textarea
          value={cfg.noSchoolDates || ""}
          onChange={(e) => set("noSchoolDates", e.target.value)}
          rows={4}
          placeholder={t("2026-12-21 Weihnachtsferien")}
          className={TEXTAREA}
        />
        <p className={hint}>{t("Ein Datum pro Zeile als JJJJ-MM-TT, dahinter ein Grund. Zeilen mit # werden übersprungen.")}</p>
      </div>

      {/* Erinnerungen */}
      <div className="space-y-2.5">
        <label className={sectionLabel}>{t("Wöchentliche Erinnerungen")}</label>
        {reminders === null ? (
          <p className="text-xs text-amber-400">
            {t("Die gespeicherten Erinnerungen sind kein gültiges JSON. Unten unter „Als JSON bearbeiten“ korrigieren.")}
          </p>
        ) : (
          <>
            {reminders.map((r, ri) => (
              <div key={ri} className="rounded-xl border border-[var(--mf-bdr)]/10 bg-[var(--mf-elev)]/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={r.day}
                    onChange={(e) => saveReminders(reminders.map((x, i) => (i === ri ? { ...x, day: e.target.value } : x)))}
                    className={SMALL_INPUT}
                  >
                    <optgroup label={t("Wochentag")}>
                      {WEEKDAYS.map((d) => (
                        <option key={d} value={d}>{t(WEEKDAY_LABELS[d])}</option>
                      ))}
                    </optgroup>
                    <optgroup label={t("Rotationstag")}>
                      {Array.from({ length: cycle }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{t(`Tag ${n}`)}</option>
                      ))}
                    </optgroup>
                  </select>
                  <select
                    value={r.kid}
                    onChange={(e) => saveReminders(reminders.map((x, i) => (i === ri ? { ...x, kid: e.target.value } : x)))}
                    className={SMALL_INPUT}
                  >
                    <option value="">{t("Für alle")}</option>
                    {kidNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                    {r.kid && !kidNames.includes(r.kid) && <option value={r.kid}>{r.kid}</option>}
                  </select>
                  <button
                    type="button"
                    title={t("Entfernen")}
                    onClick={() => saveReminders(reminders.filter((_, i) => i !== ri))}
                    className="shrink-0 h-9 w-9 flex items-center justify-center rounded-md text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={r.icon}
                    placeholder="🎒"
                    onChange={(e) => saveReminders(reminders.map((x, i) => (i === ri ? { ...x, icon: e.target.value } : x)))}
                    className={`${SMALL_INPUT} !w-14 shrink-0 text-center`}
                  />
                  <input
                    type="text"
                    value={r.text}
                    placeholder={t("z. B. Turnbeutel mitnehmen")}
                    onChange={(e) => saveReminders(reminders.map((x, i) => (i === ri ? { ...x, text: e.target.value } : x)))}
                    className={SMALL_INPUT}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => saveReminders([...reminders, { day: "monday", text: "", icon: "", kid: "" }])}
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-[var(--mf-bdr)]/20 text-sm text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5"
            >
              <Plus size={14} /> {t("Erinnerung hinzufügen")}
            </button>
            <p className={hint}>
              {t("Erscheint am gewählten Wochentag, oder am gewählten Rotationstag — aber nur, wenn Schule ist.")}
            </p>
          </>
        )}
      </div>

      {/* Kommende Tage */}
      <div className="space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer group px-1">
          <input
            type="checkbox"
            checked={cfg.showUpcoming !== false}
            onChange={(e) => set("showUpcoming", e.target.checked)}
            className="appearance-none w-5 h-5 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-blue-500 checked:border-blue-500 transition-colors shrink-0"
          />
          <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)]">{t("Kommende Tage anzeigen")}</span>
        </label>
        {cfg.showUpcoming !== false && (
          <div>
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
              <span>{t("Anzahl kommender Tage")}</span>
              <span className="text-blue-400">{clampInt(cfg.upcomingCount, 1, 7, 3)}</span>
            </label>
            <input
              type="range"
              min={1}
              max={7}
              step={1}
              value={clampInt(cfg.upcomingCount, 1, 7, 3)}
              onChange={(e) => set("upcomingCount", parseInt(e.target.value, 10))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
            />
          </div>
        )}
      </div>

      {/* Akzentfarbe */}
      <div className="space-y-2.5">
        <label className={sectionLabel}>{t("Akzentfarbe")}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={cfg.accentColor || "#4f8ef7"}
            onChange={(e) => set("accentColor", e.target.value)}
            className="h-9 w-12 rounded border border-[var(--mf-bdr)]/10 bg-[var(--mf-surface)] cursor-pointer"
          />
          <input
            type="text"
            value={cfg.accentColor || "#4f8ef7"}
            onChange={(e) => set("accentColor", e.target.value)}
            placeholder="#4f8ef7"
            className="flex-1 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </div>

      {/* Für Fortgeschrittene: dieselben Daten als JSON, z. B. aus dem alten Beispiel-Modul */}
      <details className="rounded-xl border border-[var(--mf-bdr)]/10 p-3">
        <summary className="text-sm text-[var(--mf-fg)]/70 cursor-pointer">{t("Als JSON bearbeiten")}</summary>
        <div className="space-y-3 mt-3">
          <p className={hint}>{t("Zum Einfügen der Einstellungen aus dem früheren Beispiel-Modul. Dasselbe Format wie oben.")}</p>
          <label className="text-xs text-[var(--mf-fg)]/50 block">{t("Stundenpläne (JSON)")}</label>
          <textarea value={cfg.schedules || "[]"} onChange={(e) => set("schedules", e.target.value)} rows={6} className={TEXTAREA} />
          <label className="text-xs text-[var(--mf-fg)]/50 block">{t("Wöchentliche Erinnerungen (JSON)")}</label>
          <textarea value={cfg.reminders || "[]"} onChange={(e) => set("reminders", e.target.value)} rows={4} className={TEXTAREA} />
        </div>
      </details>
    </div>
  );
}

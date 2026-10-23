"use client";

import React from "react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500";
const TEXTAREA =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500 font-mono";

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group px-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="appearance-none w-5 h-5 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-blue-500 checked:border-blue-500 transition-colors shrink-0"
      />
      <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)]">{label}</span>
    </label>
  );
}

export default function SchoolRotationInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  const set = (key: string, value: any) => updateConfig(widget.i, key, value);

  return (
    <div className="space-y-5">
      {/* School year dates */}
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block">{t("Schuljahr")}</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--mf-fg)]/50 mb-1 block">{t("Erster Schultag")}</label>
            <input
              type="text"
              value={cfg.startDate || "2026-09-02"}
              onChange={(e) => set("startDate", e.target.value)}
              placeholder="YYYY-MM-DD"
              className={INPUT}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--mf-fg)]/50 mb-1 block">{t("Letzter Schultag")}</label>
            <input
              type="text"
              value={cfg.endDate || "2027-06-25"}
              onChange={(e) => set("endDate", e.target.value)}
              placeholder="YYYY-MM-DD"
              className={INPUT}
            />
          </div>
        </div>
      </div>

      {/* Cycle length */}
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 flex justify-between">
          <span>{t("Rotationszyklus")}</span>
          <span className="text-blue-400">{cfg.cycleDays || 6} {t("Tage")}</span>
        </label>
        <input
          type="range"
          min={2}
          max={10}
          step={1}
          value={cfg.cycleDays || 6}
          onChange={(e) => set("cycleDays", parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
        />
      </div>

      {/* Schedules JSON */}
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block">{t("Stundenpläne (JSON)")}</label>
        <textarea
          value={cfg.schedules || "[]"}
          onChange={(e) => set("schedules", e.target.value)}
          rows={8}
          className={TEXTAREA}
        />
        <p className="text-[11px] text-[var(--mf-fg)]/40 leading-relaxed">
          JSON array of children. Each has a <code>name</code> and <code>days</code> object mapping rotation day numbers to arrays of activities.
        </p>
      </div>

      {/* No-school dates */}
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block">{t("Schulfreie Tage")}</label>
        <textarea
          value={cfg.noSchoolDates || ""}
          onChange={(e) => set("noSchoolDates", e.target.value)}
          rows={6}
          className={TEXTAREA}
        />
        <p className="text-[11px] text-[var(--mf-fg)]/40 leading-relaxed">
          One date per line: <code>YYYY-MM-DD reason</code>. Lines starting with <code>#</code> are comments. These dates pause the rotation.
        </p>
      </div>

      {/* Reminders JSON */}
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block">{t("Wöchentliche Erinnerungen (JSON)")}</label>
        <textarea
          value={cfg.reminders || "[]"}
          onChange={(e) => set("reminders", e.target.value)}
          rows={4}
          className={TEXTAREA}
        />
        <p className="text-[11px] text-[var(--mf-fg)]/40 leading-relaxed">
          JSON array. Each has: <code>day</code> (Monday–Friday), <code>text</code>, and optional <code>icon</code> and <code>kid</code>.
        </p>
      </div>

      {/* Upcoming */}
      <div className="space-y-3">
        <Check
          label={t("Kommende Tage anzeigen")}
          checked={cfg.showUpcoming !== false}
          onChange={(v) => set("showUpcoming", v)}
        />
        {cfg.showUpcoming !== false && (
          <div>
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
              <span>{t("Anzahl kommender Tage")}</span>
              <span className="text-blue-400">{cfg.upcomingCount || 3}</span>
            </label>
            <input
              type="range"
              min={1}
              max={7}
              step={1}
              value={cfg.upcomingCount || 3}
              onChange={(e) => set("upcomingCount", parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
            />
          </div>
        )}
      </div>

      {/* Accent color */}
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block">{t("Akzentfarbe")}</label>
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
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import type { WidgetLayoutItem } from '../_types';
import { useT } from "@/lib/i18n/LocaleProvider";
import HAEntityInput from '../_components/HAEntityInput';

type CalendarInspectorProps = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

export default function CalendarInspector({
  widget: activeWidget,
  updateConfig,
}: CalendarInspectorProps) {
  const t = useT();
  const cfg = (activeWidget.config as any) || {};
  const showEmptyDays = cfg.showEmptyDays || false;
  // Ansicht: explizit gesetzt, sonst legacy showEmptyDays → agenda, sonst list.
  const view: "list" | "agenda" | "month" =
    cfg.calendarView === "agenda" || cfg.calendarView === "month" || cfg.calendarView === "list"
      ? cfg.calendarView
      : showEmptyDays ? "agenda" : "list";
  const setView = (v: "list" | "agenda" | "month") => {
    updateConfig(activeWidget.i, "calendarView", v);
    // Alten Migrations-Schalter räumen, sobald explizit gewählt wird.
    if (cfg.showEmptyDays) updateConfig(activeWidget.i, "showEmptyDays", false);
  };
  return (
    <div className="space-y-4">
       <FeedsEditor widget={activeWidget} updateConfig={updateConfig} />
       <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Ansicht")}</label>
          <div className="grid grid-cols-3 gap-1.5">
             {([
                ["list", t("Liste")],
                ["agenda", t("Agenda")],
                ["month", t("Monat")],
             ] as [typeof view, string][]).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setView(v)}
                   className={`h-9 rounded-lg text-xs font-medium border transition-colors ${view === v ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-[var(--mf-bdr)]/10 bg-[var(--mf-elev)]/5 text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)]"}`}>
                   {label}
                </button>
             ))}
          </div>
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1.5">
             {view === "list" ? t("Kommende Termine als Liste.")
              : view === "agenda" ? t("Nach Tagen gruppiert mit Überschriften.")
              : t("Volles Monatsgitter mit Terminen in den Tagen.")}
          </p>
          {view === "month" && (
             <div className="mt-3 rounded-xl border border-[var(--mf-bdr)]/10 bg-[var(--mf-surface)]/40 p-3 space-y-3">
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                   {([
                      ["showMonthTitle", t("Monatsname"), cfg.showMonthTitle !== false],
                      ["showWeekNumbers", t("Kalenderwochen"), cfg.showWeekNumbers === true],
                      ["monthShowTime", t("Uhrzeit"), cfg.monthShowTime !== false],
                      ["monthShowLocation", t("Ort"), cfg.monthShowLocation === true],
                      ["monthShowDescription", t("Beschreibung"), cfg.monthShowDescription === true],
                   ] as [string, string, boolean][]).map(([key, label, checked]) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer group">
                         <div className="relative">
                            <input type="checkbox" checked={checked}
                               onChange={(e) => updateConfig(activeWidget.i, key, e.target.checked)}
                               className="sr-only peer" />
                            <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
                         </div>
                         <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{label}</span>
                      </label>
                   ))}
                </div>
                <p className="text-[11px] text-[var(--mf-fg)]/40 -mt-1">
                   {t("Ohne Uhrzeit bleibt dem Titel deutlich mehr Platz in der Tages-Spalte.")}
                </p>
                <div className="pt-1 border-t border-[var(--mf-bdr)]/10" />
                <div>
                   <label className="text-xs font-medium text-[var(--mf-fg)]/60 block mb-1.5">{t("Termine pro Tag")}</label>
                   <div className="grid grid-cols-3 gap-1.5">
                      {([["auto", t("Automatisch")], ["all", t("Alle")], ["fixed", t("Feste Anzahl")]] as const).map(([val, lbl]) => {
                         const cur = cfg.monthPerDay ?? "auto";
                         const active = val === "fixed" ? typeof cur === "number" : cur === val;
                         return (
                            <button key={val} type="button"
                               onClick={() => updateConfig(activeWidget.i, "monthPerDay", val === "fixed" ? 3 : val)}
                               className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors border ${active ? "border-violet-500 bg-violet-500/10 text-[var(--mf-fg)]" : "border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"}`}>
                               {lbl}
                            </button>
                         );
                      })}
                   </div>
                   {typeof cfg.monthPerDay === "number" && (
                      <div className="mt-2">
                         <label className="text-xs font-medium text-[var(--mf-fg)]/60 mb-1.5 flex justify-between">
                            <span>{t("Anzahl")}</span>
                            <span className="text-violet-400">{cfg.monthPerDay}</span>
                         </label>
                         <input type="range" min={1} max={12} step={1} value={cfg.monthPerDay}
                            onChange={(e) => updateConfig(activeWidget.i, "monthPerDay", parseInt(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-violet-500 bg-[var(--mf-elev)]/10" />
                      </div>
                   )}
                   <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                      {(cfg.monthPerDay ?? "auto") === "all"
                         ? t("Zeigt jeden Termin — volle Tage werden in der Spalte scrollbar (Touch).")
                         : t("Automatisch füllt jeden Tag so weit, wie die Spalte hoch ist. Der Rest erscheint als Farbpunkte mit Anzahl.")}
                   </p>
                </div>
                <div>
                   <label className="text-xs font-medium text-[var(--mf-fg)]/60 mb-1.5 flex justify-between">
                      <span>{t("Termin-Schriftgröße")}</span>
                      <span className="text-violet-400">{Math.round((Number(cfg.monthTextScale) || 1) * 100)}%</span>
                   </label>
                   <input type="range" min={60} max={200} step={10}
                      value={Math.round((Number(cfg.monthTextScale) || 1) * 100)}
                      onChange={(e) => updateConfig(activeWidget.i, "monthTextScale", parseInt(e.target.value) / 100)}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-violet-500 bg-[var(--mf-elev)]/10" />
                   <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                      {t("Skaliert nur die Termine im Gitter — Datum und Wochentage bleiben.")}
                   </p>
                </div>
             </div>
          )}
       </div>
       <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Darstellungs-Design")}</label>
          <select
             value={activeWidget.config?.design || 'cards'}
             onChange={(e) => updateConfig(activeWidget.i, 'design', e.target.value)}
             className="w-full bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:border-[var(--mf-bdr)]/20"
          >
             <option value="cards">{t("Moderne Kacheln (Glassmorphism)")}</option>
             <option value="minimal">{t("Minimalistisch (Nur Linien)")}</option>
          </select>
       </div>
       <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Uhrzeit-Format")}</label>
          <select
             value={activeWidget.config?.calendarTimeFormat || 'auto'}
             onChange={(e) => updateConfig(activeWidget.i, 'calendarTimeFormat', e.target.value)}
             className="w-full bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:border-[var(--mf-bdr)]/20"
          >
             <option value="auto">{t("Automatisch (nach Sprache)")}</option>
             <option value="24h">{t("24 Stunden")}</option>
             <option value="12h">{t("12 Stunden (AM/PM)")}</option>
          </select>
       </div>
       <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
             <span>{view === "list" ? t("Max. Termine anzeigen") : t("Max. Termine pro Tag")}</span>
             <span className="text-blue-400">{activeWidget.config?.limit || 5}</span>
          </label>
          <input
             type="range" min="1" max="15" value={activeWidget.config?.limit || 5}
             onChange={(e) => updateConfig(activeWidget.i, 'limit', parseInt(e.target.value))}
             className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
          />
       </div>
       <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
             <span>{t("Hintergrund Kacheln (Deckkraft)")}</span>
             <span className="text-blue-400">{activeWidget.config?.cardOpacity !== undefined ? activeWidget.config.cardOpacity : 40}%</span>
          </label>
          <input
             type="range" min="0" max="100" value={activeWidget.config?.cardOpacity !== undefined ? activeWidget.config.cardOpacity : 40}
             onChange={(e) => updateConfig(activeWidget.i, 'cardOpacity', parseInt(e.target.value))}
             className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
          />
       </div>
       {view !== "month" && (
       <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
             <span>{t("Tage im Voraus (Zeitfenster)")}</span>
             <span className="text-green-400">{activeWidget.config?.days || 30}</span>
          </label>
          <input
             type="range" min="1" max="90" value={activeWidget.config?.days || 30}
             onChange={(e) => updateConfig(activeWidget.i, 'days', parseInt(e.target.value))}
             className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-green-500 bg-[var(--mf-elev)]/10"
          />
       </div>
       )}
       <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Akzentfarbe (Hex, z.B. #FF0055)")}</label>
          <div className="flex gap-3">
             <input
                type="color" value={activeWidget.config?.color || '#ffffff'}
                onChange={(e) => updateConfig(activeWidget.i, 'color', e.target.value)}
                className="h-10 w-10 rounded cursor-pointer shrink-0 border-0 bg-transparent p-0"
             />
             <input
                type="text" value={activeWidget.config?.color || '#ffffff'}
                onChange={(e) => updateConfig(activeWidget.i, 'color', e.target.value)}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg px-3 focus:outline-none"
             />
          </div>
       </div>

       {/* Helligkeit über das Standard-Karten-System (wie Status/Media/Notify):
           auto folgt der zentralen View-Steuerung, sonst fest hell/dunkel. */}
       <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Helligkeit")}</label>
          <div className="grid grid-cols-3 gap-1.5">
             {([
                ["auto", t("Automatisch")],
                ["dark", t("Dunkel")],
                ["light", t("Hell")],
             ] as [string, string][]).map(([v, label]) => (
                <button key={v} type="button" onClick={() => updateConfig(activeWidget.i, "cardTheme", v)}
                   className={`h-9 rounded-lg text-xs font-medium border transition-colors ${(cfg.cardTheme || "dark") === v ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-[var(--mf-bdr)]/10 bg-[var(--mf-elev)]/5 text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)]"}`}>
                   {label}
                </button>
             ))}
          </div>
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1.5">{t("Hell = helle Fläche + dunkler Text. Automatisch folgt der View-Einstellung.")}</p>
       </div>
       {view === "list" && (
       <label className="flex items-center gap-3 cursor-pointer mt-2 group">
          <div className="relative flex items-center justify-center">
             <input
                type="checkbox"
                checked={activeWidget.config?.hideOnEmpty || false}
                onChange={(e) => updateConfig(activeWidget.i, 'hideOnEmpty', e.target.checked)}
                className="appearance-none w-5 h-5 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-violet-500 checked:border-violet-500 transition-colors"
             />
             {activeWidget.config?.hideOnEmpty && (
                <svg className="w-3.5 h-3.5 text-[var(--mf-fg)] absolute pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
             )}
          </div>
          <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Widget kompett ausblenden, wenn leer")}</span>
       </label>
       )}

       <label className="flex items-center gap-3 cursor-pointer mt-2 group">
          <div className="relative flex items-center justify-center">
             <input
                type="checkbox"
                checked={(activeWidget.config as any)?.hideWeekday || false}
                onChange={(e) => updateConfig(activeWidget.i, 'hideWeekday', e.target.checked)}
                className="appearance-none w-5 h-5 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-violet-500 checked:border-violet-500 transition-colors"
             />
             {(activeWidget.config as any)?.hideWeekday && (
                <svg className="w-3.5 h-3.5 text-[var(--mf-fg)] absolute pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
             )}
          </div>
          <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Wochentag ausblenden")}</span>
       </label>
    </div>
  );
}

type FeedType = "ical" | "google" | "microsoft" | "homeassistant" | "caldav";

type Feed = {
  id?: string;
  label: string;
  color: string;
  type: FeedType;
  url?: string;
  accountId?: string;
  calendarId?: string;
};

type Account = {
  id: string;
  provider: "google" | "microsoft" | "caldav";
  accountEmail: string | null;
  accountName: string | null;
  serverUrl?: string | null;
};

type ProviderCalendar = {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function FeedsEditor({
  widget,
  updateConfig,
}: {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
}) {
  const t = useT();
  const raw: any[] = Array.isArray((widget.config as any)?.feeds)
    ? (widget.config as any).feeds
    : [];
  const legacyUrl = (widget.config as any)?.icalUrl;
  const legacyColor = (widget.config as any)?.color || "#8B5CF6";

  const feeds: Feed[] =
    raw.length > 0
      ? raw.map((f, i) => ({
          id: f.id ?? `feed-${i}`,
          label: f.label ?? `${t("Kalender")} ${i + 1}`,
          type: (f.type as FeedType) ?? "ical",
          url: f.url ?? "",
          accountId: f.accountId ?? "",
          calendarId: f.calendarId ?? "",
          color: f.color ?? legacyColor,
        }))
      : legacyUrl
        ? [{
            id: "feed-legacy",
            label: t("Kalender"),
            type: "ical",
            url: legacyUrl,
            color: legacyColor,
          }]
        : [];

  const [accounts, setAccounts] = useState<Account[] | null>(null);

  useEffect(() => {
    fetch("/api/auth/calendar/accounts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => setAccounts([]));
  }, []);

  const write = (next: Feed[]) => {
    updateConfig(widget.i, "feeds", next);
    if (legacyUrl) updateConfig(widget.i, "icalUrl", "");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--mf-fg)]/80 block text-violet-400">
        {t("Kalender-Quellen")}
      </label>

      {feeds.length === 0 && (
        <p className="text-[11px] text-[var(--mf-fg)]/40">
          {t("Noch kein Feed. Wähle unten einen Typ und klick hinzufügen.")}
        </p>
      )}

      {feeds.map((feed, idx) => (
        <div
          key={idx}
          className="bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10 rounded-xl p-3 space-y-2"
          style={{ borderLeft: `3px solid ${feed.color}` }}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={feed.label}
              placeholder={t("Label (z.B. Arbeit)")}
              onChange={(e) => {
                const next = [...feeds];
                next[idx] = { ...feed, label: e.target.value };
                write(next);
              }}
              className="flex-1 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-md px-3 h-9 focus:outline-none focus:border-violet-500"
            />
            <input
              type="color"
              value={feed.color}
              onChange={(e) => {
                const next = [...feeds];
                next[idx] = { ...feed, color: e.target.value };
                write(next);
              }}
              className="h-9 w-9 rounded-md cursor-pointer bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 p-0"
            />
            <button
              onClick={() => write(feeds.filter((_, i) => i !== idx))}
              title={t("Feed entfernen")}
              className="w-9 h-9 flex items-center justify-center rounded-md text-red-400 hover:bg-red-500/10"
            >
              ×
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={feed.type}
              onChange={(e) => {
                const next = [...feeds];
                next[idx] = { ...feed, type: e.target.value as FeedType };
                write(next);
              }}
              className="bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/80 text-xs rounded-md px-2 h-9 focus:outline-none focus:border-violet-500 shrink-0"
            >
              <option value="ical">{t("iCal / Webcal")}</option>
              <option value="google">{t("Google-Konto")}</option>
              <option value="microsoft">Microsoft 365</option>
              <option value="caldav">{t("CalDAV (Nextcloud & Co.)")}</option>
              <option value="homeassistant">Home Assistant</option>
            </select>
            <FeedBody
              feed={feed}
              accounts={accounts}
              onChange={(patch) => {
                const next = [...feeds];
                next[idx] = { ...feed, ...patch };
                write(next);
              }}
            />
          </div>
        </div>
      ))}

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() =>
            write([
              ...feeds,
              {
                id: `feed-${Date.now()}`,
                label: feeds.length === 0 ? t("iCal-Kalender") : `${t("Kalender")} ${feeds.length + 1}`,
                type: "ical",
                url: "",
                color: ["#8B5CF6", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#06B6D4"][feeds.length % 6],
              },
            ])
          }
          className="h-9 text-xs font-medium text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] border border-dashed border-[var(--mf-bdr)]/15 hover:border-violet-500/40 rounded-md transition-colors"
        >
          + iCal
        </button>
        <button
          onClick={() =>
            write([
              ...feeds,
              {
                id: `feed-${Date.now()}`,
                label: "Google",
                type: "google",
                accountId: "",
                calendarId: "primary",
                color: "#EF4444",
              },
            ])
          }
          className="h-9 text-xs font-medium text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] border border-dashed border-[var(--mf-bdr)]/15 hover:border-red-500/40 rounded-md transition-colors"
        >
          + Google
        </button>
        <button
          onClick={() =>
            write([
              ...feeds,
              {
                id: `feed-${Date.now()}`,
                label: "Microsoft",
                type: "microsoft",
                accountId: "",
                calendarId: "",
                color: "#0EA5E9",
              },
            ])
          }
          className="h-9 text-xs font-medium text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] border border-dashed border-[var(--mf-bdr)]/15 hover:border-sky-500/40 rounded-md transition-colors"
        >
          + Microsoft
        </button>
        <button
          onClick={() =>
            write([
              ...feeds,
              {
                id: `feed-${Date.now()}`,
                label: "CalDAV",
                type: "caldav",
                accountId: "",
                // Leer = erster Kalender des Kontos (wie "primary" bei Google).
                calendarId: "",
                color: "#A855F7",
              },
            ])
          }
          className="h-9 text-xs font-medium text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] border border-dashed border-[var(--mf-bdr)]/15 hover:border-purple-500/40 rounded-md transition-colors"
        >
          + CalDAV
        </button>
        <button
          onClick={() =>
            write([
              ...feeds,
              {
                id: `feed-${Date.now()}`,
                label: "Home Assistant",
                type: "homeassistant",
                calendarId: "",
                color: "#22C55E",
              },
            ])
          }
          className="col-span-2 h-9 text-xs font-medium text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] border border-dashed border-[var(--mf-bdr)]/15 hover:border-emerald-500/40 rounded-md transition-colors"
        >
          + Home Assistant
        </button>
      </div>
    </div>
  );
}

function FeedBody({
  feed,
  accounts,
  onChange,
}: {
  feed: Feed;
  accounts: Account[] | null;
  onChange: (patch: Partial<Feed>) => void;
}) {
  if (feed.type === "ical") {
    return (
      <input
        type="text"
        value={feed.url ?? ""}
        placeholder="https://p01-calendars.icloud.com/…"
        onChange={(e) => onChange({ url: e.target.value })}
        className="flex-1 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/80 text-xs font-mono rounded-md px-3 h-9 focus:outline-none focus:border-violet-500"
      />
    );
  }

  if (feed.type === "homeassistant") {
    return (
      <div className="flex-1">
        <HAEntityInput
          value={feed.calendarId ?? ""}
          onChange={(v) => onChange({ calendarId: v })}
          domains={["calendar"]}
          placeholder="calendar.familie"
          className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/80 text-xs rounded-md px-3 h-9 focus:outline-none focus:border-emerald-500"
        />
      </div>
    );
  }

  return <ProviderFeedBody feed={feed} accounts={accounts} onChange={onChange} />;
}

function ProviderFeedBody({
  feed,
  accounts,
  onChange,
}: {
  feed: Feed;
  accounts: Account[] | null;
  onChange: (patch: Partial<Feed>) => void;
}) {
  const t = useT();
  const providerAccounts =
    accounts?.filter((a) => a.provider === feed.type) ?? [];
  const [calendars, setCalendars] = useState<ProviderCalendar[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!feed.accountId) {
      setCalendars(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/calendar/provider/calendars?provider=${feed.type}&accountId=${encodeURIComponent(feed.accountId)}`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
        return d;
      })
      .then((d) => {
        if (cancelled) return;
        setCalendars(d.calendars ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? t("Fehler beim Laden"));
        setCalendars([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [feed.type, feed.accountId]);

  return (
    <div className="flex-1 space-y-2">
      {providerAccounts.length === 0 ? (
        <a
          href="/editor/integrations"
          className="block text-xs text-center text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)] bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-md h-9 leading-9 hover:border-violet-500/40"
        >
          {feed.type === "google"
            ? t("Noch kein Google-Konto verbunden → Integrationen öffnen")
            : feed.type === "caldav"
              ? t("Noch kein CalDAV-Konto verbunden → Integrationen öffnen")
              : t("Noch kein Microsoft-Konto verbunden → Integrationen öffnen")}
        </a>
      ) : (
        <select
          value={feed.accountId ?? ""}
          onChange={(e) => onChange({ accountId: e.target.value, calendarId: "" })}
          className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs rounded-md px-2 h-9 focus:outline-none focus:border-violet-500"
        >
          <option value="">{t("— Konto wählen —")}</option>
          {providerAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.accountName || acc.accountEmail || t("(unbenannt)")}
              {/* Derselbe Benutzername kann auf mehreren Servern liegen —
                  ohne den Host wären die Einträge nicht unterscheidbar. */}
              {acc.provider === "caldav" && acc.serverUrl ? ` · ${hostOf(acc.serverUrl)}` : ""}
            </option>
          ))}
        </select>
      )}

      {feed.accountId && (
        <select
          value={feed.calendarId ?? ""}
          onChange={(e) => onChange({ calendarId: e.target.value })}
          disabled={loading || !!error}
          className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs rounded-md px-2 h-9 focus:outline-none focus:border-violet-500 disabled:opacity-50"
        >
          <option value="">
            {loading
              ? t("Lade Kalender…")
              : error
                ? `${t("Fehler:")} ${error}`
                : feed.type === "microsoft"
                  ? t("— Standard-Kalender —")
                  : feed.type === "caldav"
                    ? t("— Erster Kalender —")
                    : t("— Primary —")}
          </option>
          {(calendars ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.summary}
              {c.primary ? " (primary)" : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

export function TimerInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const max = (widget.config as any)?.maxTimers ?? 4;
  const hideEmpty = (widget.config as any)?.hideWhenEmpty ?? false;
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
          <span>{t("Max. gleichzeitig angezeigte Timer")}</span>
          <span className="text-emerald-400">{max}</span>
        </label>
        <input
          type="range" min={1} max={6} value={max}
          onChange={(e) => updateConfig(widget.i, "maxTimers", parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 bg-[var(--mf-elev)]/10"
        />
      </div>
      <CheckboxRow
        checked={hideEmpty}
        onChange={(v) => updateConfig(widget.i, "hideWhenEmpty", v)}
        label="Widget komplett ausblenden wenn kein Timer läuft"
      />
      <Hint>
        {t("Timer werden per API/Shortcut gestartet.")}{" "}
        <code className="text-[var(--mf-fg)]/60">POST /api/timers?key=TOKEN&label=Pasta&minutes=10</code>
      </Hint>
    </div>
  );
}

export function MessagesInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const max = (widget.config as any)?.maxMessages ?? 5;
  const hideEmpty = (widget.config as any)?.hideWhenEmpty ?? false;
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
          <span>{t("Max. Nachrichten anzeigen")}</span>
          <span className="text-fuchsia-400">{max}</span>
        </label>
        <input
          type="range" min={1} max={10} value={max}
          onChange={(e) => updateConfig(widget.i, "maxMessages", parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 bg-[var(--mf-elev)]/10"
        />
      </div>
      <CheckboxRow
        checked={hideEmpty}
        onChange={(v) => updateConfig(widget.i, "hideWhenEmpty", v)}
        label="Widget komplett ausblenden wenn keine Nachrichten"
      />
      <Hint>
        {t("Nachrichten per API:")}{" "}
        <code className="text-[var(--mf-fg)]/60">POST /api/messages?key=TOKEN&text=Hallo&ttlSec=3600</code>
      </Hint>
    </div>
  );
}

export function ShoppingInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const title = (widget.config as any)?.title ?? "";
  const hideHeader = (widget.config as any)?.hideHeader ?? false;
  const hideCount = (widget.config as any)?.hideCount ?? false;
  const hideAdd = (widget.config as any)?.hideAddForm ?? false;
  return (
    <div className="space-y-4">
      <HASourceSelector widget={widget} updateConfig={updateConfig} />
      <CheckboxRow
        checked={hideHeader}
        onChange={(v) => updateConfig(widget.i, "hideHeader", v)}
        label="Titelzeile ausblenden"
      />
      {!hideHeader && (
        <>
          <div>
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
              {t("Titel der Liste (optional)")}
            </label>
            <input
              type="text"
              value={title}
              placeholder={t("leer = Standard")}
              onChange={(e) => updateConfig(widget.i, "title", e.target.value)}
              className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <CheckboxRow
            checked={hideCount}
            onChange={(v) => updateConfig(widget.i, "hideCount", v)}
            label="Anzahl ausblenden"
          />
        </>
      )}
      <CheckboxRow
        checked={hideAdd}
        onChange={(v) => updateConfig(widget.i, "hideAddForm", v)}
        label="Eingabe-Feld ausblenden (nur lesen)"
      />
      <Hint>
        {t("Gemeinsame Familien-Einkaufsliste. Abhaken auf dem Board syncet live auf Phone und andere Displays. Artikel per Shortcut:")}{" "}
        <code className="text-[var(--mf-fg)]/60">POST /api/shopping?key=TOKEN&items=Milch,Brot,Käse</code>
      </Hint>
    </div>
  );
}

export function TodosInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const title = (widget.config as any)?.title ?? "";
  const hideHeader = (widget.config as any)?.hideHeader ?? false;
  const hideCount = (widget.config as any)?.hideCount ?? false;
  const assignee = (widget.config as any)?.assignee ?? "";
  const hideAdd = (widget.config as any)?.hideAddForm ?? false;
  const listSource = (widget.config as any)?.listSource ?? "local";
  const groupBySections = (widget.config as any)?.todoistGroupBySections === true;
  return (
    <div className="space-y-4">
      <HASourceSelector widget={widget} updateConfig={updateConfig} />
      <CheckboxRow
        checked={hideHeader}
        onChange={(v) => updateConfig(widget.i, "hideHeader", v)}
        label="Titelzeile ausblenden"
      />
      {!hideHeader && (
        <>
          <div>
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
              {t("Titel der Liste (optional)")}
            </label>
            <input
              type="text"
              value={title}
              placeholder={t("leer = Standard")}
              onChange={(e) => updateConfig(widget.i, "title", e.target.value)}
              className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <CheckboxRow
            checked={hideCount}
            onChange={(v) => updateConfig(widget.i, "hideCount", v)}
            label="Anzahl ausblenden"
          />
        </>
      )}
      {listSource === "local" && (
        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
            {t("Filter auf Person (optional)")}
          </label>
          <input
            type="text"
            value={assignee}
            placeholder={t("z.B. Emma — leer = alle")}
            onChange={(e) => updateConfig(widget.i, "assignee", e.target.value)}
            className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-indigo-500"
          />
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
            {t("Nur Todos mit diesem Assignee werden angezeigt; neue Todos werden dieser Person zugewiesen.")}
          </p>
        </div>
      )}
      {listSource === "todoist" && (
        <div>
          <CheckboxRow
            checked={groupBySections}
            onChange={(v) => updateConfig(widget.i, "todoistGroupBySections", v)}
            label="Nach Abschnitten gruppieren"
          />
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
            {t("Zeigt die Abschnitte des Todoist-Projekts als Überschriften. Welche Aufgaben geladen werden, ändert sich dadurch nicht.")}
          </p>
        </div>
      )}
      <CheckboxRow
        checked={hideAdd}
        onChange={(v) => updateConfig(widget.i, "hideAddForm", v)}
        label="Eingabe-Feld ausblenden (nur lesen)"
      />
      <Hint>
        {t("Todos per Shortcut:")}{" "}
        <code className="text-[var(--mf-fg)]/60">POST /api/todos?key=TOKEN&title=Müll+raus&assignee=Emma&priority=high</code>
      </Hint>
    </div>
  );
}

type HAListEntity = { entityId: string; name: string; itemCount: number };
type TodoistProject = { id: string; name: string; isInbox?: boolean };
type ListSource = "local" | "ha" | "todoist";

function HASourceSelector({ widget, updateConfig }: Props) {
  const t = useT();
  const source: ListSource = (widget.config as any)?.listSource ?? "local";
  const haEntity: string = (widget.config as any)?.haListEntity ?? "";
  const todoistProject: string = (widget.config as any)?.todoistProjectId ?? "";

  const [lists, setLists] = useState<HAListEntity[] | null>(null);
  const [tdProjects, setTdProjects] = useState<TodoistProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadHa() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/ha-lists", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Konnte HA-Listen nicht laden."));
      setLists(d.lists ?? []);
    } catch (e: any) {
      setError(e.message);
      setLists([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadTodoist() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/todoist/projects", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Konnte Todoist-Projekte nicht laden."));
      setTdProjects(d.projects ?? []);
    } catch (e: any) {
      setError(e.message);
      setTdProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (source === "ha" && lists === null) loadHa();
    if (source === "todoist" && tdProjects === null) loadTodoist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  function btnCls(active: boolean) {
    return `px-3 h-8 rounded-md text-xs font-medium transition-colors ${
      active ? "bg-[var(--mf-elev)]/15 text-[var(--mf-fg)]" : "text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]"
    }`;
  }

  return (
    <div>
      <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Quelle")}</label>
      <div className="inline-flex rounded-lg bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 p-0.5 mb-2">
        <button
          type="button"
          onClick={() => updateConfig(widget.i, "listSource", "local")}
          className={btnCls(source === "local")}
        >
          {t("Lokal")}
        </button>
        <button
          type="button"
          onClick={() => {
            updateConfig(widget.i, "listSource", "ha");
            if (lists === null) loadHa();
          }}
          className={btnCls(source === "ha")}
        >
          {t("Home Assistant")}
        </button>
        <button
          type="button"
          onClick={() => {
            updateConfig(widget.i, "listSource", "todoist");
            if (tdProjects === null) loadTodoist();
          }}
          className={btnCls(source === "todoist")}
        >
          Todoist
        </button>
      </div>

      {source === "ha" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={haEntity}
              onChange={(e) => updateConfig(widget.i, "haListEntity", e.target.value)}
              className="flex-1 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="">{t("— Liste wählen —")}</option>
              {lists?.map((l) => (
                <option key={l.entityId} value={l.entityId}>
                  {l.name} ({l.entityId}) · {l.itemCount}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadHa}
              disabled={loading}
              className="text-xs bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/15 text-[var(--mf-fg)] rounded-md px-2 h-9 disabled:opacity-40"
            >
              {loading ? "…" : t("Aktualisieren")}
            </button>
          </div>
          {error && <p className="text-[11px] text-red-400">{t(error)}</p>}
          <p className="text-[11px] text-[var(--mf-fg)]/40">
            {t("Items werden direkt aus dem todo.* Entity gelesen/geschrieben.")}
          </p>
        </div>
      )}

      {source === "todoist" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={todoistProject}
              onChange={(e) => updateConfig(widget.i, "todoistProjectId", e.target.value)}
              className="flex-1 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="">{t("— Projekt wählen —")}</option>
              {tdProjects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.isInbox ? "📥 " : ""}
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadTodoist}
              disabled={loading}
              className="text-xs bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/15 text-[var(--mf-fg)] rounded-md px-2 h-9 disabled:opacity-40"
            >
              {loading ? "…" : t("Aktualisieren")}
            </button>
          </div>
          {error && <p className="text-[11px] text-red-400">{t(error)}</p>}
          <p className="text-[11px] text-[var(--mf-fg)]/40">
            {t("Aufgaben werden direkt via Todoist-REST-API gelesen + geschrieben. Token in Integrationen → Todoist setzen.")}
          </p>
        </div>
      )}
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const t = useT();
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="appearance-none w-5 h-5 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-emerald-500 checked:border-emerald-500"
      />
      <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)]">{t(label)}</span>
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-[var(--mf-fg)]/40 bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-md p-2 leading-relaxed">
      {children}
    </p>
  );
}

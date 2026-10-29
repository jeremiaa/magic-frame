"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Save,
  Eye,
  Clock as ClockIcon,
  CloudSun,
  Calendar as CalendarIcon,
  Zap,
  Bell,
  Power,
  Timer as TimerIcon,
  MessageSquare,
  ShoppingCart,
  ClipboardList,
  Image as ImageIcon,
  Gauge,
  Video,
  Music,
  Rss,
  QrCode,
  Activity,
  Leaf,
  Type as TypeIcon,
  GraduationCap,
  Copy,
  Layers,
  ExternalLink,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useT } from "@/lib/i18n/LocaleProvider";
import { widgetTitle } from "@/app/editor/_types";
import { parseSchedules } from "@/lib/widgets/school-rotation";

const WIDGET_META: Record<string, { color: string; Icon: any }> = {
  "ClockWidget.tsx":           { color: "rgba(59,130,246,0.55)",  Icon: ClockIcon },
  "WeatherWidget.tsx":         { color: "rgba(6,182,212,0.55)",   Icon: CloudSun },
  "CalendarWidget.tsx":        { color: "rgba(139,92,246,0.55)",  Icon: CalendarIcon },
  "HomeAssistantWidget.tsx":   { color: "rgba(34,197,94,0.55)",   Icon: Zap },
  "HANotificationWidget.tsx":  { color: "rgba(249,115,22,0.55)",  Icon: Bell },
  "ButtonWidget.tsx":          { color: "rgba(245,158,11,0.55)",  Icon: Power },
  "TimerWidget.tsx":           { color: "rgba(16,185,129,0.55)",  Icon: TimerIcon },
  "MessagesWidget.tsx":        { color: "rgba(217,70,239,0.55)",  Icon: MessageSquare },
  "ShoppingListWidget.tsx":    { color: "rgba(234,179,8,0.55)",   Icon: ShoppingCart },
  "TodosWidget.tsx":           { color: "rgba(99,102,241,0.55)",  Icon: ClipboardList },
  "ImageWidget.tsx":           { color: "rgba(168,85,247,0.55)",  Icon: ImageIcon },
  "SensorWidget.tsx":          { color: "rgba(20,184,166,0.55)",  Icon: Gauge },
  "EnvironmentWidget.tsx":     { color: "rgba(132,204,22,0.55)",  Icon: Leaf },
  "CameraWidget.tsx":          { color: "rgba(244,63,94,0.55)",   Icon: Video },
  "MediaPlayerWidget.tsx":     { color: "rgba(236,72,153,0.55)",  Icon: Music },
  "RssWidget.tsx":             { color: "rgba(245,158,11,0.55)",  Icon: Rss },
  "QrWidget.tsx":              { color: "rgba(6,182,212,0.55)",   Icon: QrCode },
  "StatusWidget.tsx":          { color: "rgba(14,165,233,0.55)",  Icon: Activity },
  "TextWidget.tsx":            { color: "rgba(14,165,233,0.55)",  Icon: TypeIcon },
  "SchoolRotationWidget.tsx":  { color: "rgba(59,130,246,0.55)",  Icon: GraduationCap },
};

const SUPPORTED_TYPES = new Set([
  "SchoolRotationWidget.tsx",
  "CalendarWidget.tsx",
  "TodosWidget.tsx",
  "ShoppingListWidget.tsx",
  "WeatherWidget.tsx",
  "SensorWidget.tsx",
  "EnvironmentWidget.tsx",
  "TextWidget.tsx",
]);

type ViewWidget = { id: string; type: string; label: string; config: any };
type DashboardWithWidgets = { id: string; name: string; widgets: ViewWidget[] };
type DigestEntryDraft = {
  dashboardId: string;
  widgetId: string;
  order: number;
  textOptions: Record<string, any>;
};
type DigestData = {
  id: string;
  slug: string;
  name: string;
  entries: DigestEntryDraft[];
};

function TextOptionsEditor({
  widgetType,
  widgetConfig,
  options,
  onChange,
}: {
  widgetType: string;
  widgetConfig: any;
  options: Record<string, any>;
  onChange: (opts: Record<string, any>) => void;
}) {
  const t = useT();

  switch (widgetType) {
    case "SchoolRotationWidget.tsx":
      return (
        <div className="space-y-3 pl-9">
          <label className="block">
            <span className="text-xs text-[var(--mf-fg)]/60 block mb-1">{t("Kind")}</span>
            <select
              value={options.kidFilter || ""}
              onChange={(e) => onChange({ ...options, kidFilter: e.target.value || undefined })}
              className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">{t("Alle Kinder")}</option>
              {(parseSchedules(widgetConfig?.schedules) ?? []).map((kid) => (
                <option key={kid.name} value={kid.name}>{kid.name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={options.includeReminders !== false}
              onChange={(e) =>
                onChange({ ...options, includeReminders: e.target.checked })
              }
              className="rounded"
            />
            <span className="text-[var(--mf-fg)]/70">{t("Erinnerungen anzeigen")}</span>
          </label>
        </div>
      );

    case "CalendarWidget.tsx":
      return (
        <div className="pl-9">
          <label className="block">
            <span className="text-xs text-[var(--mf-fg)]/60 block mb-1">{t("Zeitraum")}</span>
            <select
              value={options.range || "today"}
              onChange={(e) => onChange({ ...options, range: e.target.value })}
              className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="today">{t("Heute")}</option>
              <option value="tomorrow">{t("Morgen")}</option>
              <option value="next3h">{t("Nächste 3 Stunden")}</option>
              <option value="next6h">{t("Nächste 6 Stunden")}</option>
              <option value="next12h">{t("Nächste 12 Stunden")}</option>
              <option value="next24h">{t("Nächste 24 Stunden")}</option>
            </select>
          </label>
        </div>
      );

    case "TodosWidget.tsx":
      return (
        <div className="pl-9">
          <label className="block">
            <span className="text-xs text-[var(--mf-fg)]/60 block mb-1">{t("Filter")}</span>
            <select
              value={options.dueFilter || "all"}
              onChange={(e) => onChange({ ...options, dueFilter: e.target.value })}
              className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">{t("Alle offenen")}</option>
              <option value="today">{t("Fällig bis heute")}</option>
              <option value="overdue">{t("Überfällig")}</option>
            </select>
          </label>
        </div>
      );

    case "ShoppingListWidget.tsx":
      return (
        <div className="pl-9">
          <label className="block">
            <span className="text-xs text-[var(--mf-fg)]/60 block mb-1">{t("Anzeigen")}</span>
            <select
              value={options.filter || "unchecked"}
              onChange={(e) => onChange({ ...options, filter: e.target.value })}
              className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="unchecked">{t("Nur offene")}</option>
              <option value="all">{t("Alle Einträge")}</option>
            </select>
          </label>
        </div>
      );

    case "WeatherWidget.tsx":
      return (
        <div className="pl-9">
          <label className="block">
            <span className="text-xs text-[var(--mf-fg)]/60 block mb-1">{t("Detailgrad")}</span>
            <select
              value={options.detail || "oneliner"}
              onChange={(e) => onChange({ ...options, detail: e.target.value })}
              className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="oneliner">{t("Einzeiler")}</option>
              <option value="highlow">{t("Hoch/Tief")}</option>
              <option value="full">{t("Mehrtagesvorhersage")}</option>
              <option value="hourly">{t("Stündlich (heute)")}</option>
            </select>
          </label>
        </div>
      );

    default:
      return null;
  }
}

function WidgetIcon({ type, size = 16 }: { type: string; size?: number }) {
  const meta = WIDGET_META[type];
  if (!meta) return null;
  const { Icon, color } = meta;
  return (
    <span
      className="inline-flex items-center justify-center rounded-md shrink-0"
      style={{ background: color, width: size + 8, height: size + 8 }}
    >
      <Icon size={size} className="text-white" />
    </span>
  );
}

export default function DigestEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useT();
  const router = useRouter();
  const [digestId, setDigestId] = useState<string | null>(null);
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [dashboards, setDashboards] = useState<DashboardWithWidgets[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [entries, setEntries] = useState<DigestEntryDraft[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  useEffect(() => {
    params.then((p) => setDigestId(p.id));
  }, [params]);

  const loadDigest = useCallback(async () => {
    if (!digestId) return;
    const res = await fetch(`/api/admin/digests/${digestId}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data: DigestData = await res.json();
    setDigest(data);
    setName(data.name);
    setSlug(data.slug);
    setEntries(data.entries.map((e) => ({
      dashboardId: e.dashboardId,
      widgetId: e.widgetId,
      order: e.order,
      textOptions: (e as any).textOptions ?? {},
    })));
    setDirty(false);
  }, [digestId]);

  useEffect(() => { loadDigest(); }, [loadDigest]);

  useEffect(() => {
    fetch("/api/dashboards", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const ids = data.map((d: any) => d.id);
        Promise.all(
          ids.map((id: string) =>
            fetch(`/api/admin/views/${id}/widgets?t=${Date.now()}`, { cache: "no-store" })
              .then((r) => r.ok ? r.json() : [])
              .catch(() => [])
          ),
        ).then((widgetSets) => {
          setDashboards(
            data.map((d: any, i: number) => ({
              id: d.id,
              name: d.name,
              widgets: widgetSets[i] || [],
            })),
          );
        });
      })
      .catch(() => {});
  }, []);

  const allWidgets = new Map<string, ViewWidget & { dashboardId: string; dashboardName: string }>();
  for (const db of dashboards) {
    for (const w of db.widgets) {
      allWidgets.set(`${db.id}:${w.id}`, { ...w, dashboardId: db.id, dashboardName: db.name });
    }
  }

  const entryKeys = new Set(entries.map((e) => `${e.dashboardId}:${e.widgetId}`));

  function addWidget(dashboardId: string, widgetId: string) {
    setEntries((prev) => [
      ...prev,
      { dashboardId, widgetId, order: prev.length, textOptions: {} },
    ]);
    setExpanded((prev) => new Set(prev).add(`${dashboardId}:${widgetId}`));
    setDirty(true);
  }

  function removeWidget(dashboardId: string, widgetId: string) {
    setEntries((prev) =>
      prev.filter((e) => !(e.dashboardId === dashboardId && e.widgetId === widgetId)),
    );
    setDirty(true);
  }

  function updateTextOptions(dashboardId: string, widgetId: string, opts: Record<string, any>) {
    setEntries((prev) =>
      prev.map((e) =>
        e.dashboardId === dashboardId && e.widgetId === widgetId
          ? { ...e, textOptions: opts }
          : e,
      ),
    );
    setDirty(true);
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOver.current = index;
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOver.current === null) return;
    const from = dragItem.current;
    const to = dragOver.current;
    if (from === to) return;
    setEntries((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((e, i) => ({ ...e, order: i }));
    });
    setDirty(true);
    dragItem.current = null;
    dragOver.current = null;
  }

  async function save() {
    if (!digestId) return;
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/digests/${digestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          entries: entries.map((e, i) => ({
            dashboardId: e.dashboardId,
            widgetId: e.widgetId,
            order: i,
            textOptions: e.textOptions,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("Speichern fehlgeschlagen."));
        return;
      }
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(t("Netzwerkfehler."));
    } finally {
      setSaving(false);
    }
  }

  async function loadPreview() {
    if (!digest) return;
    setPreviewLoading(true);
    setPreview(null);

    await save();

    try {
      const res = await fetch(`/api/digest/${slug}?format=json&t=${Date.now()}`);
      if (!res.ok) {
        setPreview(`(${t("Fehler")}: ${res.status})`);
        return;
      }
      const data = await res.json();
      setPreview(data.text || t("(leer)"));
    } catch {
      setPreview(`(${t("Vorschau nicht verfügbar")})`);
    } finally {
      setPreviewLoading(false);
    }
  }

  if (!digest) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-8 py-10">
          <div className="text-[var(--mf-fg)]/40 text-sm">{t("Wird geladen…")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[900px] mx-auto px-8 py-10">
        <header className="mb-8">
          <Link
            href="/editor/digests"
            className="text-sm text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft size={14} /> {t("Alle Digests")}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--mf-fg)]/40 mb-2">
                {t("Digests")}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex-1">
                  <span className="text-xs text-[var(--mf-fg)]/60 block mb-1">{t("Name")}</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setDirty(true); }}
                    className="w-full bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-lg px-3 py-2 text-lg font-semibold outline-none focus:border-blue-500"
                  />
                </label>
                <label className="sm:w-60">
                  <span className="text-xs text-[var(--mf-fg)]/60 block mb-1">{t("Adresse")}</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                      setDirty(true);
                    }}
                    className="w-full bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-mono rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pb-1">
              <button
                onClick={loadPreview}
                disabled={previewLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] border border-[var(--mf-bdr)]/10 hover:border-[var(--mf-bdr)]/30"
              >
                <Eye size={14} /> {t("Vorschau")}
              </button>
              <button
                onClick={save}
                disabled={saving || !dirty}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm shadow-blue-500/30"
              >
                <Save size={14} />
                {saving ? t("Speichert…") : saved ? t("Gespeichert") : t("Speichern")}
              </button>
            </div>
          </div>
        </header>

        <DigestEndpointBar slug={slug} name={name} />

        {error && (
          <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {t(error)}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main: Selected entries */}
          <div className="lg:col-span-2">
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--mf-fg)]/40 mb-3">
              {t("Einträge")} ({entries.length})
            </div>

            {entries.length === 0 ? (
              <div className="bg-[var(--mf-surface-2)]/60 border border-[var(--mf-bdr)]/10 border-dashed rounded-2xl p-8 text-center">
                <p className="text-[var(--mf-fg)]/50 text-sm mb-2">{t("Noch keine Widgets ausgewählt.")}</p>
                <p className="text-[var(--mf-fg)]/30 text-xs">{t("Füge Widgets aus der Liste rechts hinzu.")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, index) => {
                  const key = `${entry.dashboardId}:${entry.widgetId}`;
                  const widgetInfo = allWidgets.get(key);
                  const widgetType = widgetInfo?.type || "";
                  const isExpanded = expanded.has(key);
                  const displayName = widgetInfo ? widgetTitle(widgetType, widgetInfo.label, t) : t("Widget nicht mehr da");
                  const viewName = widgetInfo?.dashboardName || entry.dashboardId;

                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className="bg-[var(--mf-surface-2)]/60 border border-[var(--mf-bdr)]/10 rounded-xl overflow-hidden"
                    >
                      <div className="flex items-center gap-2 p-3">
                        <GripVertical
                          size={14}
                          className="text-[var(--mf-fg)]/30 cursor-grab shrink-0"
                        />
                        <WidgetIcon type={widgetType} />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm truncate block">
                            {displayName}
                          </span>
                          <span className="text-[10px] text-[var(--mf-fg)]/40 flex items-center gap-1">
                            <Layers size={9} /> {viewName}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleExpand(key)}
                          className="text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)]/80 p-1"
                        >
                          {isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => removeWidget(entry.dashboardId, entry.widgetId)}
                          className="text-red-400/60 hover:text-red-300 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-[var(--mf-bdr)]/5 pt-3">
                          <TextOptionsEditor
                            widgetType={widgetType}
                            widgetConfig={widgetInfo?.config}
                            options={entry.textOptions}
                            onChange={(opts) =>
                              updateTextOptions(entry.dashboardId, entry.widgetId, opts)
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Preview panel */}
            {preview !== null && (
              <div className="mt-6">
                <div className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--mf-fg)]/40 mb-3">
                  {t("Vorschau")}
                </div>
                <div className="bg-[var(--mf-surface-2)]/60 border border-[var(--mf-bdr)]/10 rounded-xl p-4">
                  <pre className="text-sm text-[var(--mf-fg)]/80 whitespace-pre-wrap font-mono leading-relaxed">
                    {preview}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Available widgets grouped by view */}
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--mf-fg)]/40 mb-3">
              {t("Verfügbare Widgets")}
            </div>

            {dashboards.length === 0 ? (
              <div className="text-xs text-[var(--mf-fg)]/30 p-4">
                {t("Wird geladen…")}
              </div>
            ) : (
              <div className="space-y-4">
                {dashboards.map((db) => {
                  const supported = db.widgets.filter(
                    (w) => SUPPORTED_TYPES.has(w.type) && !entryKeys.has(`${db.id}:${w.id}`),
                  );
                  const unsupported = db.widgets.filter(
                    (w) => !SUPPORTED_TYPES.has(w.type) && !entryKeys.has(`${db.id}:${w.id}`),
                  );
                  if (supported.length === 0 && unsupported.length === 0) return null;

                  return (
                    <div key={db.id}>
                      <div className="text-[10px] uppercase tracking-widest text-[var(--mf-fg)]/40 px-1 pb-1.5 flex items-center gap-1.5">
                        <Layers size={10} /> {db.name}
                      </div>
                      <div className="space-y-0.5">
                        {supported.map((w) => {
                          const displayName = widgetTitle(w.type, w.label, t);
                          return (
                            <button
                              key={w.id}
                              onClick={() => addWidget(db.id, w.id)}
                              className="w-full flex items-center gap-2 p-2 rounded-lg text-sm hover:bg-[var(--mf-elev)]/5 border border-transparent hover:border-[var(--mf-bdr)]/10 transition-colors text-left"
                            >
                              <WidgetIcon type={w.type} size={13} />
                              <span className="flex-1 truncate text-[var(--mf-fg)]/80 text-xs">
                                {displayName}
                              </span>
                              <Plus
                                size={13}
                                className="text-[var(--mf-fg)]/30 shrink-0"
                              />
                            </button>
                          );
                        })}
                        {unsupported.map((w) => {
                          const displayName = widgetTitle(w.type, w.label, t);
                          return (
                            <div
                              key={w.id}
                              title={t("Für dieses Widget gibt es noch keinen Text.")}
                              className="flex items-center gap-2 p-2 rounded-lg text-xs opacity-25 cursor-not-allowed"
                            >
                              <WidgetIcon type={w.type} size={13} />
                              <span className="flex-1 truncate">{displayName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Die Adresse ohne Token: "Öffnen" und die Vorschau laufen über die Anmeldung
// im Browser, und ein ?key= in der Adresse landet im Verlauf und in Logs.
// Home Assistant schickt den Token als Header — dafür das Beispiel darunter.
function DigestEndpointBar({ slug, name }: { slug: string; name: string }) {
  const t = useT();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<"url" | "yaml" | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = `${origin}/api/digest/${slug}`;
  // Der Zustand eines Sensors fasst höchstens 255 Zeichen, also steht der
  // ganze Text im Attribut "text". Alle 15 Minuten reicht für eine Nachricht
  // am Morgen und schont Kalender und Wetterdienst.
  const yaml = [
    "rest:",
    `  - resource: ${url}?format=json`,
    "    headers:",
    "      Authorization: Bearer TOKEN",
    "    scan_interval: 900",
    "    sensor:",
    `      - name: ${JSON.stringify(name || slug)}`,
    '        value_template: "{{ value_json.text[:255] }}"',
    "        json_attributes:",
    "          - text",
  ].join("\n");

  function copy(what: "url" | "yaml", text: string) {
    navigator.clipboard?.writeText(text).then(
      () => { setCopied(what); setTimeout(() => setCopied(null), 1500); },
      () => {},
    );
  }

  return (
    <div className="mb-6 bg-[var(--mf-surface-2)]/60 border border-[var(--mf-bdr)]/10 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-[var(--mf-fg)]/40 mb-1">
            {t("Adresse")}
          </div>
          <code className="text-xs font-mono text-[var(--mf-fg)]/70 break-all block">{url}</code>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] bg-[var(--mf-elev)]/5 hover:bg-[var(--mf-elev)]/10 rounded-md px-2.5 h-7 flex items-center gap-1 shrink-0"
        >
          <ExternalLink size={11} /> {t("Öffnen")}
        </a>
        <button
          onClick={() => copy("url", url)}
          className="text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] bg-[var(--mf-elev)]/5 hover:bg-[var(--mf-elev)]/10 rounded-md px-2.5 h-7 flex items-center gap-1 shrink-0"
        >
          {copied === "url" ? <Check size={11} /> : <Copy size={11} />}
          {copied === "url" ? t("Kopiert") : t("Kopieren")}
        </button>
      </div>

      <details className="mt-3 border-t border-[var(--mf-bdr)]/5 pt-3">
        <summary className="text-xs text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)] cursor-pointer select-none">
          {t("Für Home Assistant")}
        </summary>
        <p className="text-xs text-[var(--mf-fg)]/50 mt-2 leading-relaxed">
          {t("In die configuration.yaml, dann TOKEN durch den Companion-API-Token aus Einstellungen → Geräte & Apps ersetzen. Der Zustand eines Sensors fasst nur 255 Zeichen — der ganze Text steht im Attribut text.")}
        </p>
        <div className="relative mt-2">
          <pre className="text-[11px] font-mono [font-variant-ligatures:none] text-[var(--mf-fg)]/70 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg p-3 overflow-x-auto whitespace-pre">
            {yaml}
          </pre>
          <button
            onClick={() => copy("yaml", yaml)}
            className="absolute top-2 right-2 text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 rounded-md px-2 h-6 flex items-center gap-1"
          >
            {copied === "yaml" ? <Check size={11} /> : <Copy size={11} />}
            {copied === "yaml" ? t("Kopiert") : t("Kopieren")}
          </button>
        </div>
      </details>
    </div>
  );
}

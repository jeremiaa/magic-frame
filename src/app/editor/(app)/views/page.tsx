"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ExternalLink, Trash2, ArrowRight, Monitor, Smartphone, Pencil, Copy, Clock as ClockIcon, CloudSun, Calendar as CalendarIcon, Zap, Bell, Power, Timer as TimerIcon, MessageSquare, ShoppingCart, ClipboardList, Image as ImageIcon, Gauge, Video, Music, Rss, QrCode, Activity, Leaf, Type as TypeIcon } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { viewUrl } from "@/lib/base-path";

type Orientation = "portrait" | "landscape";
type LayoutItem = { i: string; type: string; x: number; y: number; w: number; h: number };
type Dashboard = { id: string; name: string; orientation?: Orientation; layout?: LayoutItem[] };

/**
 * Die Adresse einer Ansicht, zum Abtippen ins Tablet.
 *
 * Erst nach dem Einhängen gefüllt: die Adresse steht im Fenster, und beim
 * Rendern auf dem Server gibt es keines. Bis dahin der Pfad — kein Springen
 * des Layouts, nur ein kurz unvollständiger Text.
 */
function ViewAddress({ viewId }: { viewId: string }) {
  const t = useT();
  const [url, setUrl] = useState("");
  const [kopiert, setKopiert] = useState(false);
  useEffect(() => setUrl(viewUrl(viewId)), [viewId]);

  const anzeige = url || `/view/${viewId}`;
  return (
    <button
      type="button"
      title={t("Adresse kopieren")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!url) return;
        navigator.clipboard?.writeText(url).then(
          () => { setKopiert(true); setTimeout(() => setKopiert(false), 1500); },
          () => {},
        );
      }}
      // mb-3: die Aktionszeile darunter trägt ihren Innenabstand UNTER der
      // Trennlinie (mt-auto pt-4 border-t) — über der Linie bleibt nichts.
      // Auf einer vollen Karte klebte die Adresse deshalb direkt daran.
      className="text-xs text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)]/70 mt-1 mb-3 font-mono text-left break-all transition-colors flex items-start gap-1.5 group/addr"
    >
      <span>{anzeige}</span>
      {url && (
        <Copy
          size={11}
          className={`shrink-0 mt-0.5 transition-opacity ${kopiert ? "opacity-100 text-green-400" : "opacity-0 group-hover/addr:opacity-60"}`}
        />
      )}
    </button>
  );
}

function AddressHint() {
  const t = useT();
  const [host, setHost] = useState("");
  useEffect(() => {
    const port = (window as any).__MF_DIRECT_PORT__;
    if ((window as any).__MF_BASE__ && port) {
      setHost(`${window.location.protocol}//${window.location.hostname}:${port}`);
    }
  }, []);
  if (!host) return null;
  return (
    <p className="text-[13px] text-[var(--mf-fg)]/45 mt-3 max-w-xl leading-relaxed">
      {t("Deine Displays erreichen die Ansichten nicht über Home Assistant, sondern direkt unter")}{" "}
      <code className="px-1.5 py-0.5 rounded bg-[var(--mf-elev)]/10 font-mono text-[0.92em]">{host}</code>{" "}
      {t("— die Adresse unter jeder Karte ist die fertige zum Abtippen. Ohne Anmeldung, dafür sind sie da.")}
    </p>
  );
}

const WIDGET_META: Record<string, { color: string; Icon: any }> = {
  "ClockWidget.tsx":           { color: "rgba(59,130,246,0.55)",  Icon: ClockIcon },      // blue
  "WeatherWidget.tsx":         { color: "rgba(6,182,212,0.55)",   Icon: CloudSun },       // cyan
  "CalendarWidget.tsx":        { color: "rgba(139,92,246,0.55)",  Icon: CalendarIcon },   // violet
  "HomeAssistantWidget.tsx":   { color: "rgba(34,197,94,0.55)",   Icon: Zap },            // green
  "HANotificationWidget.tsx":  { color: "rgba(249,115,22,0.55)",  Icon: Bell },           // orange
  "ButtonWidget.tsx":          { color: "rgba(245,158,11,0.55)",  Icon: Power },          // amber
  "TimerWidget.tsx":           { color: "rgba(16,185,129,0.55)",  Icon: TimerIcon },      // emerald
  "MessagesWidget.tsx":        { color: "rgba(217,70,239,0.55)",  Icon: MessageSquare },  // fuchsia
  "ShoppingListWidget.tsx":    { color: "rgba(234,179,8,0.55)",   Icon: ShoppingCart },   // yellow
  "TodosWidget.tsx":           { color: "rgba(99,102,241,0.55)",  Icon: ClipboardList },  // indigo
  "ImageWidget.tsx":           { color: "rgba(168,85,247,0.55)",  Icon: ImageIcon },      // purple
  "SensorWidget.tsx":          { color: "rgba(20,184,166,0.55)",  Icon: Gauge },          // teal
  "EnvironmentWidget.tsx":     { color: "rgba(132,204,22,0.55)",  Icon: Leaf },           // lime
  "CameraWidget.tsx":          { color: "rgba(244,63,94,0.55)",   Icon: Video },          // rose
  "MediaPlayerWidget.tsx":     { color: "rgba(236,72,153,0.55)",  Icon: Music },          // pink
  "RssWidget.tsx":             { color: "rgba(245,158,11,0.55)",  Icon: Rss },            // amber
  "QrWidget.tsx":              { color: "rgba(6,182,212,0.55)",   Icon: QrCode },         // cyan
  "StatusWidget.tsx":          { color: "rgba(14,165,233,0.55)",  Icon: Activity },       // sky
  "TextWidget.tsx":            { color: "rgba(14,165,233,0.55)",  Icon: TypeIcon },       // sky
};

// Konstanten aus dem Editor-Canvas: 24 Spalten; für Höhe nehmen wir max-y + h
// aus dem gespeicherten Layout (oder 24 als Fallback).
const GRID_COLS = 24;
function LayoutPreview({ layout, orientation }: { layout?: LayoutItem[]; orientation: Orientation }) {
  const t = useT();
  const items = Array.isArray(layout) ? layout : [];
  const aspect = orientation === "landscape" ? "16 / 9" : "9 / 16";
  const rows = Math.max(24, ...items.map((w) => (w.y ?? 0) + (w.h ?? 0)));

  return (
    <div
       className="w-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-black/40 light:bg-none light:bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 rounded-lg relative overflow-hidden"
       style={{ aspectRatio: aspect }}
    >
       {items.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--mf-fg)]/40">
             {orientation === "landscape" ? <Monitor size={20} /> : <Smartphone size={18} />}
          </div>
       ) : (
          items.map((w) => {
             const meta = WIDGET_META[w.type] ?? { color: "rgba(120,120,135,0.5)", Icon: null };
             const { Icon } = meta;
             return (
                <div
                   key={w.i}
                   className="absolute rounded-[3px] border border-[var(--mf-bdr)]/15 backdrop-blur-[1px] flex items-center justify-center"
                   style={{
                      left: `${(w.x / GRID_COLS) * 100}%`,
                      top: `${(w.y / rows) * 100}%`,
                      width: `${(w.w / GRID_COLS) * 100}%`,
                      height: `${(w.h / rows) * 100}%`,
                      backgroundColor: meta.color,
                   }}
                >
                   {Icon && w.w >= 3 && w.h >= 3 && (
                      <Icon size={Math.max(8, Math.min(w.w, w.h) * 1.2)} className="text-[var(--mf-fg)]/80" strokeWidth={2} />
                   )}
                </div>
             );
          })
       )}
       <span className="absolute top-1.5 right-1.5 text-[9px] font-medium uppercase tracking-wider bg-[var(--mf-ovl)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded px-1.5 py-0.5 text-[var(--mf-fg)]/70">
          {orientation === "landscape" ? t("Quer") : t("Hoch")}
       </span>
    </div>
  );
}

// Modal supports three modes from one form. "edit" and "duplicate" carry
// the source dashboard so the form can pre-fill the fields.
type ModalMode =
  | { kind: "new" }
  | { kind: "edit"; source: Dashboard }
  | { kind: "duplicate"; source: Dashboard };

export default function ViewsListPage() {
  const t = useT();
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[] | null>(null);
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formOrientation, setFormOrientation] = useState<Orientation>("portrait");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/dashboards?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDashboards(Array.isArray(d) ? d : []))
      .catch(() => setDashboards([]));
  }

  useEffect(() => {
    load();
  }, []);

  function openNewModal() {
    setError(null);
    setFormName("");
    setFormSlug("");
    setFormOrientation("portrait");
    setModal({ kind: "new" });
  }

  function openEditModal(d: Dashboard) {
    setError(null);
    setFormName(d.name);
    setFormSlug(d.id);
    setFormOrientation(d.orientation ?? "portrait");
    setModal({ kind: "edit", source: d });
  }

  function openDuplicateModal(d: Dashboard) {
    setError(null);
    setFormName(`${d.name} (${t("Kopie")})`);
    setFormSlug(`${d.id}-copy`);
    setFormOrientation(d.orientation ?? "portrait");
    setModal({ kind: "duplicate", source: d });
  }

  function closeModal() {
    setModal(null);
  }

  async function submitView(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;
    setError(null);
    setBusy(true);
    try {
      // For "edit": send oldId so the API renames (or just updates name if
      // slug unchanged). For "duplicate": send sourceId so the API copies
      // widgets into a new dashboard without deleting the source.
      const body: Record<string, unknown> = {
        id: formSlug,
        name: formName,
        orientation: formOrientation,
      };
      if (modal.kind === "edit") body.oldId = modal.source.id;
      if (modal.kind === "duplicate") body.sourceId = modal.source.id;

      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("Konnte nicht angelegt werden."));
        return;
      }
      closeModal();
      load();
      // After "new" or "duplicate": jump straight into the editor. After
      // "edit": stay on the list so the user sees the renamed card.
      if (modal.kind !== "edit") {
        router.push(`/editor/views/${encodeURIComponent(data.id)}`);
      }
    } catch {
      setError(t("Netzwerkfehler."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteView(id: string, name: string) {
    if (
      !confirm(
        t("View „{name}“ wirklich löschen? Alle Widgets dieses Views gehen verloren.").replace("{name}", name),
      )
    )
      return;
    await fetch(`/api/dashboards?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    load();
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-8 py-10">
        <header className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--mf-fg)]/40 mb-2">
              {t("Views")}
            </div>
            <h1 className="text-3xl font-semibold">
              {t("Alle Dashboards & Displays")}
            </h1>
            <p className="text-[var(--mf-fg)]/50 mt-2 max-w-xl text-sm">
              {t("Ein View = was auf einem Display gerendert wird. Du kannst beliebig viele anlegen und pro Display eine eigene Layout-URL ansteuern.")}
            </p>
            {/* Im HA-Rahmen ist die Adresse im Browser die von Home Assistant —
                dorthin kommt ein Wandtablet nicht. Dann muss dastehen, wo die
                Ansichten wirklich liegen; sonst sucht man den Port. */}
            <AddressHint />
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm shadow-blue-500/30"
          >
            <Plus size={14} /> {t("Neuer View")}
          </button>
        </header>

        {dashboards === null ? (
          <div className="text-[var(--mf-fg)]/40 text-sm">{t("Wird geladen…")}</div>
        ) : dashboards.length === 0 ? (
          <div className="bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl p-12 text-center">
            <p className="text-[var(--mf-fg)]/60 mb-4">{t("Noch keine Views angelegt.")}</p>
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium"
            >
              <Plus size={14} /> {t("Ersten View anlegen")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboards.map((d) => {
              const isLandscape = d.orientation === "landscape";
              return (
              <div
                key={d.id}
                className="group bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 hover:border-blue-500/40 rounded-2xl p-4 transition-colors flex flex-col"
              >
                <Link
                  href={`/editor/views/${encodeURIComponent(d.id)}`}
                  className="block mb-3"
                >
                  <div className="mx-auto" style={{ maxWidth: isLandscape ? "100%" : "180px" }}>
                     <LayoutPreview layout={d.layout} orientation={isLandscape ? "landscape" : "portrait"} />
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-2">
                   <Link
                      href={`/editor/views/${encodeURIComponent(d.id)}`}
                      className="font-semibold truncate"
                   >
                      {d.name}
                   </Link>
                   <ArrowRight
                      size={14}
                      className="text-[var(--mf-fg)]/30 group-hover:text-[var(--mf-fg)]/80 transition-colors shrink-0"
                   />
                </div>
                {/* Die VOLLE Adresse, nicht nur der Pfad. "/view/tablet" sagt
                    einem, der sein Wandtablet einrichten will, nichts — er
                    braucht Host und Port. Im HA-Add-on ist das ausserdem
                    nicht die Adresse, unter der er gerade den Editor sieht:
                    der läuft im HA-Rahmen, die Ansicht am eigenen Port. */}
                <ViewAddress viewId={d.id} />
                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-[var(--mf-bdr)]/5">
                  <a
                    href={`/view/${encodeURIComponent(d.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] flex items-center gap-1"
                  >
                    <ExternalLink size={11} /> {t("Live öffnen")}
                  </a>
                  <button
                    onClick={() => openEditModal(d)}
                    title={t("Bearbeiten")}
                    className="text-[11px] text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] flex items-center gap-1"
                  >
                    <Pencil size={11} /> {t("Bearbeiten")}
                  </button>
                  <button
                    onClick={() => openDuplicateModal(d)}
                    title={t("Duplizieren")}
                    className="text-[11px] text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] flex items-center gap-1"
                  >
                    <Copy size={11} /> {t("Duplizieren")}
                  </button>
                  <button
                    onClick={() => deleteView(d.id, d.name)}
                    disabled={dashboards.length <= 1}
                    title={
                      dashboards.length <= 1
                        ? t("Mindestens ein View muss bestehen bleiben.")
                        : t("Löschen")
                    }
                    className="ml-auto text-[11px] text-red-400/70 hover:text-red-300 disabled:opacity-30 disabled:hover:text-red-400/70 flex items-center gap-1"
                  >
                    <Trash2 size={11} /> {t("Löschen")}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (() => {
        const isEdit = modal.kind === "edit";
        const isDuplicate = modal.kind === "duplicate";
        const title = isEdit
          ? t("View bearbeiten")
          : isDuplicate
            ? t("View duplizieren")
            : t("Neuer View");
        const subtitle = isEdit
          ? t("Anzeigename oder URL-Pfad ändern. Layout + Widgets bleiben erhalten.")
          : isDuplicate
            ? t("Kopiert Layout + Widgets in einen neuen View. Original bleibt unverändert.")
            : t("Nach dem Anlegen wirst du direkt in den Editor geschickt.");
        const submitText = busy
          ? isEdit
            ? t("Speichere…")
            : t("Wird angelegt…")
          : isEdit
            ? t("Speichern")
            : isDuplicate
              ? t("Duplikat anlegen & öffnen")
              : t("Anlegen & öffnen");
        return (
        <div
          className="fixed inset-0 bg-[var(--mf-backdrop)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <form
            onSubmit={submitView}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-lg font-semibold mb-1">{title}</h2>
            <p className="text-sm text-[var(--mf-fg)]/50 mb-6">{subtitle}</p>

            <label className="block mb-4">
              <span className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-2">
                {t("Anzeigename")}
              </span>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("z.B. Küche")}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </label>
            {/* Orientation only makes sense when creating from scratch or
                duplicating. For edit we hide it — the user can change it
                inside the editor's view settings any time. */}
            {!isEdit && (
              <div className="mb-6">
                 <span className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-2">
                    {t("Ausrichtung")}
                 </span>
                 <div className="grid grid-cols-2 gap-2">
                    <button
                       type="button"
                       onClick={() => setFormOrientation("portrait")}
                       className={`flex items-center justify-center gap-2 border rounded-lg p-3 transition-colors ${
                          formOrientation === "portrait"
                             ? "bg-blue-500/10 border-blue-500/50 text-[var(--mf-fg)]"
                             : "bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"
                       }`}
                    >
                       <div className={`w-6 h-8 rounded border flex items-center justify-center ${formOrientation === "portrait" ? "border-blue-300" : "border-[var(--mf-bdr)]/20"}`}>
                          <Smartphone size={10} />
                       </div>
                       <span className="text-sm font-medium">{t("Hochformat")}</span>
                    </button>
                    <button
                       type="button"
                       onClick={() => setFormOrientation("landscape")}
                       className={`flex items-center justify-center gap-2 border rounded-lg p-3 transition-colors ${
                          formOrientation === "landscape"
                             ? "bg-blue-500/10 border-blue-500/50 text-[var(--mf-fg)]"
                             : "bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"
                       }`}
                    >
                       <div className={`w-10 h-6 rounded border flex items-center justify-center ${formOrientation === "landscape" ? "border-blue-300" : "border-[var(--mf-bdr)]/20"}`}>
                          <Monitor size={12} />
                       </div>
                       <span className="text-sm font-medium">{t("Querformat")}</span>
                    </button>
                 </div>
                 <p className="text-[11px] text-[var(--mf-fg)]/40 mt-2">
                    {t("Beeinflusst das Canvas-Seitenverhältnis im Editor. Kannst du später jederzeit umstellen.")}
                 </p>
              </div>
            )}

            <label className="block mb-6">
              <span className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-2">
                {t("URL-Pfad")}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--mf-fg)]/40 font-mono text-sm">/view/</span>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={(e) =>
                    setFormSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-"),
                    )
                  }
                  placeholder={t("kueche")}
                  className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-mono rounded-lg p-3 outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                {isEdit
                  ? t("Ändert die URL auf dem Display. Bestehende Tablets müssen ggf. neu konfiguriert werden.")
                  : t("Keine Leerzeichen. Wird die URL auf dem Display.")}
              </p>
            </label>

            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                {t(error)}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-full text-sm text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5"
              >
                {t("Abbrechen")}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-full text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50"
              >
                {submitText}
              </button>
            </div>
          </form>
        </div>
        );
      })()}
    </div>
  );
}

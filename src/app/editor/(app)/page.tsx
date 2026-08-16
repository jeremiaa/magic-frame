"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { connectLiveSync } from "@/lib/live-socket";
import {
  Layers,
  Plus,
  Plug,
  Radio,
  ArrowRight,
  ExternalLink,
  Monitor,
  Smartphone,
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
  Lock,
  Globe2,
  Home as HomeIcon,
  ListChecks,
  Archive,
  Package,
  ShieldCheck,
  AlertOctagon,
  Leaf,
  Type as TypeIcon,
  Music,
  Rss,
  QrCode,
  Activity,
} from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

type Orientation = "portrait" | "landscape";
type LayoutItem = { i?: string; id?: string; type: string; x: number; y: number; w: number; h: number };
type Dashboard = { id: string; name: string; orientation?: Orientation; layout?: LayoutItem[] };

// Identische Widget-Map wie auf der /editor/views-Seite — Mini-Render mit
// Farb + Icon im Widget-Preview-Block, damit das Dashboard hier und die
// Views-Liste visuell konsistent sind.
const WIDGET_META: Record<string, { color: string; Icon: any }> = {
  "ClockWidget.tsx":          { color: "rgba(59,130,246,0.55)",  Icon: ClockIcon },
  "WeatherWidget.tsx":        { color: "rgba(6,182,212,0.55)",   Icon: CloudSun },
  "CalendarWidget.tsx":       { color: "rgba(139,92,246,0.55)",  Icon: CalendarIcon },
  "HomeAssistantWidget.tsx":  { color: "rgba(34,197,94,0.55)",   Icon: Zap },
  "HANotificationWidget.tsx": { color: "rgba(249,115,22,0.55)",  Icon: Bell },
  "ButtonWidget.tsx":         { color: "rgba(245,158,11,0.55)",  Icon: Power },
  "TimerWidget.tsx":          { color: "rgba(16,185,129,0.55)",  Icon: TimerIcon },
  "MessagesWidget.tsx":       { color: "rgba(217,70,239,0.55)",  Icon: MessageSquare },
  "ShoppingListWidget.tsx":   { color: "rgba(234,179,8,0.55)",   Icon: ShoppingCart },
  "TodosWidget.tsx":          { color: "rgba(99,102,241,0.55)",  Icon: ClipboardList },
  "ImageWidget.tsx":          { color: "rgba(168,85,247,0.55)",  Icon: ImageIcon },
  "SensorWidget.tsx":         { color: "rgba(20,184,166,0.55)",  Icon: Gauge },
  "EnvironmentWidget.tsx":    { color: "rgba(132,204,22,0.55)",  Icon: Leaf },
  "CameraWidget.tsx":         { color: "rgba(244,63,94,0.55)",   Icon: Video },
  "TextWidget.tsx":           { color: "rgba(14,165,233,0.55)",  Icon: TypeIcon },
  // Diese vier fehlten hier seit ihrer Einfuehrung: ohne Eintrag faellt die
  // Mini-Vorschau auf ein graues Rechteck ohne Icon zurueck (Zeile mit
  // WIDGET_META[w.type] ?? …), und wer eine Medien- oder Status-Kachel auf
  // seiner Karte sucht, findet sie nicht wieder. Farben wie in widget-visuals.
  "MediaPlayerWidget.tsx":    { color: "rgba(236,72,153,0.55)",  Icon: Music },
  "RssWidget.tsx":            { color: "rgba(245,158,11,0.55)",  Icon: Rss },
  "QrWidget.tsx":             { color: "rgba(6,182,212,0.55)",   Icon: QrCode },
  "StatusWidget.tsx":         { color: "rgba(14,165,233,0.55)",  Icon: Activity },
};
const GRID_COLS = 24;

function MiniLayoutPreview({ layout, orientation }: { layout?: LayoutItem[]; orientation: Orientation }) {
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
          {orientation === "landscape" ? <Monitor size={14} /> : <Smartphone size={12} />}
        </div>
      ) : (
        items.map((w, idx) => {
          const meta = WIDGET_META[w.type] ?? { color: "rgba(120,120,135,0.5)", Icon: null };
          const { Icon } = meta;
          const isCustom = typeof w.type === "string" && w.type.startsWith("custom:");
          return (
            <div
              key={w.i ?? w.id ?? idx}
              className="absolute rounded-[2px] border border-[var(--mf-bdr)]/15 backdrop-blur-[1px] flex items-center justify-center"
              style={{
                left: `${(w.x / GRID_COLS) * 100}%`,
                top: `${(w.y / rows) * 100}%`,
                width: `${(w.w / GRID_COLS) * 100}%`,
                height: `${(w.h / rows) * 100}%`,
                backgroundColor: isCustom ? "rgba(168,85,247,0.45)" : meta.color,
              }}
            >
              {Icon && w.w >= 3 && w.h >= 3 && (
                <Icon
                  size={Math.max(6, Math.min(w.w, w.h) * 0.9)}
                  className="text-[var(--mf-fg)]/80"
                  strokeWidth={2}
                />
              )}
            </div>
          );
        })
      )}
      <span className="absolute top-1 right-1 text-[8px] font-medium uppercase tracking-wider bg-[var(--mf-ovl)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded px-1 py-0.5 text-[var(--mf-fg)]/70">
        {orientation === "landscape" ? t("Quer") : t("Hoch")}
      </span>
    </div>
  );
}

type Status = {
  caddyTls: boolean | null;
  caddyDomain: string | null;
  ddnsIp: string | null;
  ddnsLastUpdate: string | null;
  haConnected: boolean;
  todoistConnected: boolean;
  todoistProjects: number;
  customModules: number;
  snapshots: number | null;
  activeLockouts: number;
  // true, sobald eine der Verwaltungs-Abfragen mit 403 geantwortet hat. Ohne
  // das Feld zeigte diese Seite einem Konto mit Nur-Ansehen-Rolle die leeren
  // Rückfallwerte als Tatsache an: "TLS aus, kein DDNS, 0 Module" — obwohl
  // alles eingerichtet ist. Nicht sehen dürfen und nicht eingerichtet sein
  // sind zwei verschiedene Dinge, und die Kacheln sollen das auch sagen.
  restricted: boolean;
};

const EMPTY_STATUS: Status = {
  caddyTls: null,
  caddyDomain: null,
  ddnsIp: null,
  ddnsLastUpdate: null,
  haConnected: false,
  todoistConnected: false,
  todoistProjects: 0,
  customModules: 0,
  snapshots: null,
  activeLockouts: 0,
  restricted: false,
};

export default function EditorHome() {
  const t = useT();
  const [dashboards, setDashboards] = useState<Dashboard[] | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>(EMPTY_STATUS);

  useEffect(() => {
    fetch("/api/dashboards", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDashboards(Array.isArray(d) ? d : []))
      .catch(() => setDashboards([]));

    // Status-Endpoints parallel laden — alle behind verifySession, also
    // bekommen wir hier nur Daten weil wir eingeloggt sind.
    async function loadStatus() {
      const out: Status = { ...EMPTY_STATUS };
      // Eine abgelehnte Anfrage parst sauber als {error: …} — ohne diese
      // Prüfung landet sie als "alles aus" in den Kacheln.
      const readJson = (url: string) =>
        fetch(url, { cache: "no-store" }).then(async (r) => {
          if (r.status === 403) {
            out.restricted = true;
            return null;
          }
          if (!r.ok) return null;
          return r.json().catch(() => null);
        });

      const calls: Array<Promise<void>> = [
        readJson("/api/admin/caddy")
          .then((d) => {
            out.caddyTls = !!d?.status?.tlsMode;
            out.caddyDomain = d?.config?.domain || null;
          })
          .catch(() => {}),
        readJson("/api/admin/ddns")
          .then((d) => {
            out.ddnsIp = d?.status?.currentIp || null;
            out.ddnsLastUpdate = d?.status?.lastUpdate || d?.status?.lastCheck || null;
          })
          .catch(() => {}),
        readJson("/api/settings")
          .then((d) => {
            out.haConnected = !!(d?.haUrl && d?.haToken);
          })
          .catch(() => {}),
        readJson("/api/admin/todoist")
          .then((d) => {
            out.todoistConnected = !!d?.connected;
            out.todoistProjects = (d?.projects ?? []).length;
          })
          .catch(() => {}),
        readJson("/api/admin/modules")
          .then((d) => {
            out.customModules = (d?.modules ?? []).filter((m: any) => m.enabled).length;
          })
          .catch(() => {}),
        readJson("/api/admin/backups/snapshots")
          .then((d) => {
            const arr = Array.isArray(d?.snapshots) ? d.snapshots : Array.isArray(d) ? d : null;
            out.snapshots = arr ? arr.length : null;
          })
          .catch(() => {}),
        readJson("/api/admin/security")
          .then((d) => {
            out.activeLockouts = (d?.lockouts ?? []).length;
          })
          .catch(() => {}),
      ];
      await Promise.all(calls);
      setStatus(out);
    }
    loadStatus();

    const s = connectLiveSync();
    s.on("connect", () => setWsConnected(true));
    s.on("disconnect", () => setWsConnected(false));
    setTimeout(() => {
      setWsConnected((v) => (v === null ? false : v));
    }, 3000);
    return () => {
      s.disconnect();
    };
  }, []);

  const dashboardCount = dashboards?.length ?? null;
  const integrationsConfigured =
    (status.haConnected ? 1 : 0) +
    (status.todoistConnected ? 1 : 0) +
    (status.caddyTls ? 1 : 0) +
    (status.ddnsIp ? 1 : 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-8 py-10">
        {/* Großer Header wie vorher */}
        <div className="mb-8">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--mf-fg)]/40 mb-2">
            {t("Control Center")}
          </div>
          <h1 className="text-3xl font-semibold">{t("Willkommen zurück.")}</h1>
          <p className="text-[var(--mf-fg)]/50 mt-2 max-w-xl">
            {t("Alles, was deine Magic Frames rendern, steuerst du von hier aus. Wähle links einen Bereich oder spring direkt in einen View unten.")}
          </p>
        </div>

        {/* 3 große StatCards wie vorher */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={<Layers size={18} />}
            label="Views"
            value={dashboardCount === null ? "…" : String(dashboardCount)}
            href="/editor/views"
          />
          <StatCard
            icon={<Radio size={18} />}
            label="Live-Sync"
            value={wsConnected === null ? "…" : wsConnected ? t("Verbunden") : t("Offline")}
            href="/editor/settings"
            hint={
              wsConnected
                ? t("Änderungen werden sofort an alle Displays gepusht.")
                : wsConnected === false
                  ? t("Keine Verbindung zum Push-Server.")
                  : t("Verbinde…")
            }
          />
          <StatCard
            icon={<Plug size={18} />}
            label="Integrationen"
            value={`${integrationsConfigured} ${t("aktiv")}`}
            href="/editor/integrations"
            hint={t("Home Assistant, Kalender, Todoist, Wallpaper-Quellen.")}
          />
        </div>

        {/* Live-Status-Strip — der „mehr zu sehen"-Teil */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{t("System & Status")}</h2>
            <span className="text-[11px] text-[var(--mf-fg)]/40">{t("Live")}</span>
          </div>
          <StatusStrip status={status} />
        </section>

        {/* Views-Section mit Mini-Previews */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{t("Deine Views")}</h2>
              <p className="text-sm text-[var(--mf-fg)]/40">
                {t("Klick, um ihn zu bearbeiten.")}
              </p>
            </div>
            <Link
              href="/editor/views"
              className="text-sm text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)] flex items-center gap-1"
            >
              {t("Alle anzeigen")} <ArrowRight size={14} />
            </Link>
          </div>
          {dashboards === null ? (
            <div className="text-[var(--mf-fg)]/40 text-sm">{t("Wird geladen…")}</div>
          ) : dashboards.length === 0 ? (
            <div className="bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl p-8 text-center">
              <p className="text-[var(--mf-fg)]/60 mb-4">{t("Noch keine Views angelegt.")}</p>
              <Link
                href="/editor/views"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium"
              >
                <Plus size={14} /> {t("Ersten View erstellen")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {dashboards.slice(0, 8).map((d) => (
                <Link
                  key={d.id}
                  href={`/editor/views/${encodeURIComponent(d.id)}`}
                  className="group bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 hover:border-blue-500/40 rounded-2xl p-3 transition-colors flex flex-col"
                >
                  <MiniLayoutPreview
                    layout={d.layout}
                    orientation={d.orientation ?? "portrait"}
                  />
                  <div className="font-semibold text-sm mt-2.5 truncate">{d.name}</div>
                  <div className="text-[10px] text-[var(--mf-fg)]/40 mt-0.5 font-mono truncate">
                    /view/{d.id}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--mf-bdr)]/5">
                    <a
                      href={`/view/${encodeURIComponent(d.id)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)] flex items-center gap-1"
                    >
                      <ExternalLink size={10} /> {t("Öffnen")}
                    </a>
                    <ArrowRight
                      size={12}
                      className="text-[var(--mf-fg)]/30 group-hover:text-[var(--mf-fg)]/80 transition-colors"
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Mehr Bereiche */}
        <section>
          <h2 className="text-lg font-semibold mb-4">{t("Mehr Bereiche")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SectionCard
              icon={<Plug size={16} />}
              title="Integrationen"
              desc="HA, Kalender, Todoist, Wallpaper-Quellen."
              href="/editor/integrations"
            />
            <SectionCard
              icon={<Package size={16} />}
              title="Module"
              desc="Eigene Widget-Typen hochladen + verwalten."
              href="/editor/modules"
            />
            <SectionCard
              icon={<Archive size={16} />}
              title="Backups"
              desc="Snapshots, Export & Import deiner Layouts."
              href="/editor/backups"
            />
            <SectionCard
              icon={<ExternalLink size={16} />}
              title="Docs"
              desc="README auf GitHub."
              href="https://github.com/jeremiaa/magic-frame"
              external
            />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Kleine wiederverwendbare Cards ---------- */

function StatCard({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  href: string;
}) {
  const t = useT();
  return (
    <Link
      href={href}
      className="bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 hover:border-[var(--mf-bdr)]/30 rounded-2xl p-5 transition-colors block group"
    >
      <div className="flex items-center gap-2 text-[var(--mf-fg)]/50 text-sm">
        <span className="text-[var(--mf-fg)]/60 group-hover:text-[var(--mf-fg)]">{icon}</span>
        {t(label)}
      </div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
      {hint && <div className="text-xs text-[var(--mf-fg)]/40 mt-1">{hint}</div>}
    </Link>
  );
}

function SectionCard({
  icon,
  title,
  desc,
  href,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
  external?: boolean;
}) {
  const t = useT();
  const Wrapper: any = external ? "a" : Link;
  const props = external
    ? { href, target: "_blank", rel: "noreferrer" }
    : { href };
  return (
    <Wrapper
      {...props}
      className="bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 hover:border-[var(--mf-bdr)]/30 rounded-2xl p-4 transition-colors block group"
    >
      <div className="flex items-center justify-between">
        <span className="w-8 h-8 rounded-lg bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10 flex items-center justify-center text-[var(--mf-fg)]/70 group-hover:text-[var(--mf-fg)]">
          {icon}
        </span>
      </div>
      <div className="mt-3 font-semibold">{t(title)}</div>
      <div className="text-xs text-[var(--mf-fg)]/40 mt-1 leading-relaxed">{t(desc)}</div>
    </Wrapper>
  );
}


/* ---------- Status-Strip ---------- */

function StatusStrip({ status }: { status: Status }) {
  const t = useT();
  const items: Array<{
    label: string;
    value: string;
    tone: "ok" | "warn" | "off" | "info";
    icon: React.ReactNode;
    href: string;
    title?: string;
  }> = [
    {
      label: t("HTTPS"),
      value: status.caddyTls === null
        ? "…"
        : status.caddyTls
          ? status.caddyDomain || t("TLS")
          : t("HTTP"),
      tone: status.caddyTls === null ? "info" : status.caddyTls ? "ok" : "warn",
      icon: <Lock size={11} />,
      href: "/editor/settings#hosting",
      title: status.caddyTls
        ? `${t("Caddy: TLS aktiv für")} ${status.caddyDomain || ""}`
        : t("Caddy läuft als HTTP-Proxy — keine TLS-Domain konfiguriert"),
    },
    {
      label: t("DDNS"),
      value: status.ddnsIp || "—",
      tone: status.ddnsIp ? "ok" : "off",
      icon: <Globe2 size={11} />,
      href: "/editor/settings#hosting",
      title: status.ddnsLastUpdate
        ? `${t("Letzter Check")}: ${new Date(status.ddnsLastUpdate).toLocaleString()}`
        : t("DDNS nicht konfiguriert"),
    },
    {
      label: t("Home Assistant"),
      value: status.haConnected ? t("verbunden") : t("aus"),
      tone: status.haConnected ? "ok" : "off",
      icon: <HomeIcon size={11} />,
      href: "/editor/integrations",
    },
    {
      label: t("Todoist"),
      value: status.todoistConnected
        ? `${status.todoistProjects} ${t("Projekte")}`
        : t("aus"),
      tone: status.todoistConnected ? "ok" : "off",
      icon: <ListChecks size={11} />,
      href: "/editor/integrations",
    },
    {
      label: t("Module"),
      value: status.customModules > 0 ? `${status.customModules} ${t("aktiv")}` : "—",
      tone: status.customModules > 0 ? "info" : "off",
      icon: <Package size={11} />,
      href: "/editor/modules",
    },
    {
      label: t("Backups"),
      value: status.snapshots !== null ? String(status.snapshots) : "…",
      tone: status.snapshots !== null && status.snapshots > 0 ? "info" : "off",
      icon: <Archive size={11} />,
      href: "/editor/backups",
    },
    ...(status.activeLockouts > 0
      ? [
          {
            label: t("Lockouts"),
            value: String(status.activeLockouts),
            tone: "warn" as const,
            icon: <AlertOctagon size={11} />,
            href: "/editor/settings#security",
            title: `${status.activeLockouts} ${t("aktive Login-Sperren — bitte prüfen")}`,
          },
        ]
      : [
          {
            label: t("Sicherheit"),
            value: t("OK"),
            tone: "ok" as const,
            icon: <ShieldCheck size={11} />,
            href: "/editor/settings#security",
          },
        ]),
  ];

  return (
    <>
      {/* Ohne diesen Hinweis liest ein Konto mit Nur-Ansehen-Rolle die
          Rückfallwerte als Tatsache: "TLS aus, Todoist aus, 0 Module".
          Nichts sehen dürfen ist nicht dasselbe wie nichts eingerichtet
          haben, und die Kacheln allein können das nicht unterscheiden. */}
      {status.restricted && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          {t(
            "Einige dieser Werte kann dieses Konto nicht abrufen — sie brauchen eine Administrator-Rolle. Was hier steht, ist deshalb unvollständig.",
          )}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 mb-6">
        {items.map((it) => (
          <StatusPill key={it.label} {...it} />
        ))}
      </div>
    </>
  );
}

function StatusPill({
  label,
  value,
  tone,
  icon,
  href,
  title,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "off" | "info";
  icon: React.ReactNode;
  href: string;
  title?: string;
}) {
  const toneCls =
    tone === "ok"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10"
        : tone === "info"
          ? "border-blue-500/30 bg-blue-500/5 text-blue-300 hover:bg-blue-500/10"
          : "border-[var(--mf-bdr)]/10 bg-[var(--mf-elev)]/5 text-[var(--mf-fg)]/50 hover:bg-[var(--mf-elev)]/10";
  return (
    <Link
      href={href}
      title={title}
      className={`group rounded-xl border px-3 py-2.5 transition-colors block ${toneCls}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold mt-0.5 truncate" title={value}>
        {value}
      </div>
    </Link>
  );
}

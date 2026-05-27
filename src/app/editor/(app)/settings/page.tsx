"use client";

import { useEffect, useState } from "react";
import {
  KeyRound,
  Shield,
  Server,
  Smartphone,
  RefreshCw,
  Check,
  Copy,
  Users,
  Trash2,
  Plus,
  AlertTriangle,
  LogOut,
  Cpu,
  Clock,
  Database,
  Languages,
  ListChecks,
  Globe2,
  Apple,
  ShieldCheck,
  Lock,
  AlertOctagon,
  Globe,
} from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Settings-Page mit Sub-Navigation. Ist mit Sicherheits-/Hosting-/2FA-
 * Erweiterungen auf 12+ Karten gewachsen — eine flache Liste ist nicht
 * mehr scanbar. Sub-Sidebar links (Desktop), horizontale Pills oben
 * (Mobile). Aktive Sektion wird im URL-Hash gespiegelt (#security)
 * damit man Links teilen kann.
 */
type SectionId =
  | "general"
  | "account"
  | "security"
  | "users"
  | "hosting"
  | "integrations"
  | "system";

type SectionDef = {
  id: SectionId;
  label: string;
  desc: string;
  icon: React.ReactNode;
  render: () => React.ReactNode;
};

function useHashSection(defaultId: SectionId, validIds: SectionId[]): [SectionId, (id: SectionId) => void] {
  const [id, setId] = useState<SectionId>(defaultId);
  useEffect(() => {
    const sync = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if ((validIds as string[]).includes(raw)) setId(raw as SectionId);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [validIds]);
  const setAndSync = (next: SectionId) => {
    setId(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.hash = next;
      window.history.replaceState(null, "", url.toString());
    }
  };
  return [id, setAndSync];
}

export default function SettingsPage() {
  const t = useT();
  const sections: SectionDef[] = [
    {
      id: "general",
      label: t("Allgemein"),
      desc: t("Sprache und Editor-Grundeinstellungen."),
      icon: <Languages size={16} />,
      render: () => (
        <>
          <LanguageCard />
        </>
      ),
    },
    {
      id: "account",
      label: t("Konto"),
      desc: t("Passwort und Zwei-Faktor-Authentifizierung für dein eigenes Konto."),
      icon: <KeyRound size={16} />,
      render: () => (
        <>
          <PasswordCard />
          <TwoFactorCard />
        </>
      ),
    },
    {
      id: "security",
      label: t("Sicherheit"),
      desc: t("Brute-Force-Schutz und aktive Sessions."),
      icon: <ShieldCheck size={16} />,
      render: () => (
        <>
          <LoginSecurityCard />
          <SessionCard />
        </>
      ),
    },
    {
      id: "users",
      label: t("Nutzer"),
      desc: t("Weitere Editor-Nutzer einladen und verwalten."),
      icon: <Users size={16} />,
      render: () => (
        <>
          <UsersCard />
        </>
      ),
    },
    {
      id: "hosting",
      label: t("Hosting & Netzwerk"),
      desc: t("Öffentliche Erreichbarkeit (DDNS) und automatisches HTTPS (Caddy)."),
      icon: <Globe size={16} />,
      render: () => (
        <>
          <DDNSCard />
          <CaddyCard />
        </>
      ),
    },
    {
      id: "integrations",
      label: t("Geräte & Apps"),
      desc: t("Shortcut-Token und iOS-Companion-App für dieses Dashboard. Externe Service-Verknüpfungen wie HA oder Todoist liegen unter Integrationen."),
      icon: <Smartphone size={16} />,
      render: () => (
        <>
          <ShortcutTokenCard />
          <IOSCompanionCard />
          <ExternalIntegrationsHint />
        </>
      ),
    },
    {
      id: "system",
      label: t("System"),
      desc: t("Server-Status, Version und Diagnostik."),
      icon: <Server size={16} />,
      render: () => (
        <>
          <ServerCard />
        </>
      ),
    },
  ];

  const [active, setActive] = useHashSection(
    "general",
    sections.map((s) => s.id),
  );
  const activeSection = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Desktop: Full-height Sub-Sidebar (analog zum View-Editor) */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 border-r border-white/10 bg-black/20 overflow-y-auto">
        <div className="px-4 pt-5 pb-3 border-b border-white/5">
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 mb-1">
            {t("Einstellungen")}
          </div>
          <div className="text-sm font-semibold text-white/80">
            {t("Globale App-Settings")}
          </div>
        </div>
        <nav className="px-2 py-3 space-y-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2.5 text-sm px-3 h-9 rounded-lg transition-colors text-left ${
                active === s.id
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={active === s.id ? "text-white" : "text-white/40"}>
                {s.icon}
              </span>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content-Pane */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile: Horizontale Pills oben */}
        <nav className="md:hidden px-4 pt-4 pb-2 border-b border-white/10 bg-black/20 -mx-px overflow-x-auto sticky top-0 z-10">
          <div className="flex gap-1.5 min-w-max">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-1.5 text-sm px-3 h-9 rounded-full border whitespace-nowrap transition-colors ${
                  active === s.id
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="max-w-[900px] px-6 md:px-10 py-8 md:py-10">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold">{activeSection.label}</h1>
            <p className="text-white/50 mt-1.5 text-sm">{activeSection.desc}</p>
          </div>
          <div className="space-y-4">{activeSection.render()}</div>
        </div>
      </div>
    </div>
  );
}

function LanguageCard() {
  const { locale, setLocale } = useLocale();
  const t = useT();
  // Picking a language here updates *this browser* via localStorage
  // (setLocale) AND saves it as the installation-wide default on the
  // server. Every other display that hasn't picked its own language yet
  // will inherit this on next load — that's how the kitchen monitor
  // catches up with what you set in the editor on your laptop.
  const pick = (l: "de" | "en") => {
    setLocale(l);
    fetch("/api/admin/locale-default", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: l }),
    }).catch(() => {
      // Silent — local switch already happened, server is best-effort.
    });
  };
  return (
    <Card
      icon={<Languages size={18} />}
      iconTint="blue"
      title="Sprache"
      desc="Sprache der Oberfläche. Pro Browser merkbar + als Default für alle Displays gespeichert."
    >
      <div className="inline-flex rounded-lg bg-black/40 border border-white/10 p-0.5">
        <button
          onClick={() => pick("de")}
          className={`px-4 h-9 rounded-md text-sm font-medium transition-colors ${
            locale === "de" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
          }`}
        >
          {t("Deutsch")}
        </button>
        <button
          onClick={() => pick("en")}
          className={`px-4 h-9 rounded-md text-sm font-medium transition-colors ${
            locale === "en" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
          }`}
        >
          {t("Englisch")}
        </button>
      </div>
    </Card>
  );
}

/* ---------- Card-Shell ---------- */

function Card({
  icon,
  iconTint = "white",
  title,
  badge,
  desc,
  children,
}: {
  icon: React.ReactNode;
  iconTint?: "white" | "emerald" | "blue" | "amber" | "indigo" | "rose";
  title: string;
  badge?: { label: string; tone: "emerald" | "white" | "amber" | "zinc" };
  desc?: string;
  children?: React.ReactNode;
}) {
  const t = useT();
  const tints: Record<string, string> = {
    white: "bg-white/5 border-white/10 text-white/70",
    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    indigo: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300",
    rose: "bg-rose-500/10 border-rose-500/30 text-rose-300",
  };
  return (
    <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${tints[iconTint]}`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{t(title)}</h2>
            {badge && (
              <span
                className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  badge.tone === "emerald"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : badge.tone === "amber"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : "bg-white/5 border-white/10 text-white/40"
                }`}
              >
                {t(badge.label)}
              </span>
            )}
          </div>
          {desc && <p className="text-sm text-white/50 mt-1">{t(desc)}</p>}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function Banner({ kind, msg }: { kind: "ok" | "err"; msg: string }) {
  const t = useT();
  return (
    <div
      className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 ${
        kind === "ok"
          ? "bg-green-600/10 border-green-500/40 text-green-200"
          : "bg-red-600/10 border-red-500/40 text-red-200"
      }`}
    >
      {kind === "ok" ? <Check size={15} /> : <AlertTriangle size={15} />}
      <span>{t(msg)}</span>
    </div>
  );
}

const inputCls =
  "w-full bg-black border border-white/10 text-white text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500 transition-colors";

/* ---------- Shortcut-Token (bestehend) ---------- */

function ShortcutTokenCard() {
  const t = useT();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    fetch("/api/auth/shortcut-token", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setToken(d.token ?? null))
      .finally(() => setLoading(false));
  }, []);

  async function rotate() {
    if (!confirm(t("Neuen Shortcut-Token erzeugen? Alle bestehenden Shortcuts müssen aktualisiert werden."))) return;
    setRotating(true);
    try {
      const r = await fetch("/api/auth/shortcut-token", { method: "POST" });
      const d = await r.json();
      setToken(d.token);
    } finally {
      setRotating(false);
    }
  }

  async function copy() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const base =
    typeof window !== "undefined" ? window.location.origin : "http://DEIN-DASHBOARD";

  return (
    <Card
      icon={<Smartphone size={18} />}
      iconTint="emerald"
      title="Companion API Token"
      badge={{ label: "Aktiv", tone: "emerald" }}
      desc="Dein persönlicher API-Key für externe Clients (iOS-Shortcuts, Android-Tasker, curl, die kommende Companion-App)."
    >
      <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 mb-3">
        <code className="flex-1 text-xs font-mono text-white/80 truncate">
          {loading ? t("lade…") : revealed && token ? token : token ? "••••••••••••••••••••••••••••" : "—"}
        </code>
        <button onClick={() => setRevealed((v) => !v)} className="text-xs text-white/50 hover:text-white px-2 h-7">
          {revealed ? t("verbergen") : t("anzeigen")}
        </button>
        <button
          onClick={copy}
          disabled={!token}
          className="text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-md px-2 h-7 flex items-center gap-1 disabled:opacity-40"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? t("kopiert") : t("Kopieren")}
        </button>
        <button
          onClick={rotate}
          disabled={rotating}
          title={t("Neuen Token erzeugen")}
          className="text-xs text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 rounded-md px-2 h-7 flex items-center gap-1 disabled:opacity-40"
        >
          <RefreshCw size={12} className={rotating ? "animate-spin" : ""} />
          {t("Rotate")}
        </button>
      </div>
      <div className="text-xs text-white/60 space-y-1">
        <div className="font-semibold text-white/80 mb-1">{t("Beispiel: Timer aus iOS-Shortcut starten")}</div>
        <div className="bg-black/40 border border-white/10 rounded p-2 font-mono text-[11px] text-white/70 break-all">
          POST {base}/api/timers?key=TOKEN&label=Pasta&minutes=10
        </div>
        <p className="text-white/40 mt-2">
          {t("Alle Endpoints, Socket-Events und Beispiele:")}{" "}
          <a href="/docs/companion-api.md" className="text-emerald-400 hover:underline">docs/companion-api.md</a> {t("(im Repo).")}
        </p>
      </div>
    </Card>
  );
}

/* ---------- iOS Companion App (Coming Soon) ---------- */

function IOSCompanionCard() {
  const t = useT();
  return (
    <Card
      icon={<Apple size={18} />}
      iconTint="white"
      title="iOS Companion App"
      badge={{ label: "Bald", tone: "amber" }}
      desc="Native iOS-App für Schnellzugriff auf Timer, Nachrichten, Einkaufsliste und To-dos. Liegt parallel in einem eigenen Repo und nutzt den Companion-API-Token oben."
    >
      <div className="text-xs text-white/60 leading-relaxed space-y-2">
        <p>{t("Bis die App im App Store ist, funktioniert die gleiche API bereits über iOS-Shortcuts, Android-Tasker oder curl.")}</p>
        <ul className="list-disc pl-5 text-white/50 space-y-0.5">
          <li>{t("Timer starten/stoppen vom Sperrbildschirm")}</li>
          <li>{t("Nachrichten an einzelne Displays pushen")}</li>
          <li>{t("Einkaufsliste & To-dos synchron — auch via Home Assistant Lists (siehe unten)")}</li>
          <li>{t("Live-Status der verbundenen Displays")}</li>
        </ul>
      </div>
    </Card>
  );
}

/* ---------- Home Assistant Lists ---------- */

type HAListEntity = { entityId: string; name: string; itemCount: number };

/**
 * Verweis-Karte: leitet User auf die Integrationen-Seite. HA-Listen und Todoist
 * sind jetzt dort konsolidiert (waren früher in dieser Sektion doppelt).
 */
function ExternalIntegrationsHint() {
  const t = useT();
  return (
    <div className="bg-zinc-900/40 border border-dashed border-white/15 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 shrink-0">
          <Globe2 size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white/80">
            {t("Externe Service-Verknüpfungen")}
          </div>
          <p className="text-sm text-white/50 mt-1">
            {t("Home Assistant, Kalender-Konten (Google/Microsoft), Home-Assistant-Listen und Todoist findest du jetzt unter")}{" "}
            <a
              href="/editor/integrations"
              className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
            >
              {t("Integrationen")}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

/** @deprecated — HA-Listen sind jetzt in /editor/integrations. Behalten für Backward-Compat falls Card nochmal gebraucht wird. */
function HAListsCard() {
  const t = useT();
  const [lists, setLists] = useState<HAListEntity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
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
  useEffect(() => {
    load();
  }, []);

  return (
    <Card
      icon={<ListChecks size={18} />}
      iconTint="indigo"
      title="Home Assistant Lists"
      desc="Nutzt Listen aus deinem Home Assistant (Domain todo.*) als Quelle für Einkaufsliste- und To-do-Widgets. Im Widget-Inspector wählst du dann pro Widget die Quelle."
    >
      {error && (
        <div className="mb-3">
          <Banner kind="err" msg={error} />
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/15 text-white rounded-md px-3 h-8 disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {t("Listen aktualisieren")}
        </button>
        {lists && (
          <span className="text-[11px] text-white/40">
            {lists.length} {lists.length === 1 ? t("Liste") : t("Listen")} {t("gefunden")}
          </span>
        )}
      </div>

      {loading && !lists ? (
        <div className="text-sm text-white/40">{t("Lade…")}</div>
      ) : lists && lists.length === 0 ? (
        <p className="text-sm text-white/50 bg-black/30 border border-white/10 rounded-lg p-3">
          {t("Keine todo.* Entities in Home Assistant gefunden. Prüfe ob die HA-Verbindung in Integrationen aktiv ist und ob mindestens eine Todo-Liste/Einkaufsliste in HA existiert.")}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {lists?.map((l) => (
            <li
              key={l.entityId}
              className="flex items-center justify-between bg-black/30 border border-white/10 rounded-lg px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">{l.name}</div>
                <code className="text-[11px] font-mono text-white/40 truncate block">
                  {l.entityId}
                </code>
              </div>
              <div className="text-[11px] text-white/50 shrink-0 ml-3">
                {l.itemCount} {l.itemCount === 1 ? t("Eintrag") : t("Einträge")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Todoist ---------- */

type TodoistProject = { id: string; name: string; isInbox?: boolean };

function TodoistCard() {
  const t = useT();
  const [hasToken, setHasToken] = useState(false);
  const [connected, setConnected] = useState(false);
  const [projects, setProjects] = useState<TodoistProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [reveal, setReveal] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/todoist", { cache: "no-store" });
      const d = await r.json();
      setHasToken(!!d.hasToken);
      setConnected(!!d.connected);
      setProjects(d.projects ?? []);
      if (d.error) setError(d.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function flash(kind: "ok" | "err", m: string) {
    setMsg({ kind, msg: m });
    setTimeout(() => setMsg(null), 4000);
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/todoist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: token }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Speichern fehlgeschlagen."));
      flash("ok", token ? t("Token gespeichert + verifiziert.") : t("Token entfernt."));
      setToken("");
      setEditing(false);
      load();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      icon={<ListChecks size={18} />}
      iconTint="rose"
      title="Todoist"
      badge={
        hasToken && connected
          ? { label: t("verbunden"), tone: "emerald" }
          : hasToken
            ? { label: t("Fehler"), tone: "amber" }
            : { label: t("aus"), tone: "zinc" }
      }
      desc="Nutze deine Todoist-Projekte als Quelle für Todos- und Einkaufslisten-Widgets. Setze einen API-Token (Todoist → Einstellungen → Integrationen → Entwickler → API-Token), danach erscheint Todoist im Quelle-Dropdown der Widgets."
    >
      {msg && (
        <div className="mb-3">
          <Banner kind={msg.kind} msg={msg.msg} />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-white/40">{t("Lade…")}</div>
      ) : (
        <>
          {error && (
            <div className="mb-3">
              <Banner kind="err" msg={error} />
            </div>
          )}

          {hasToken && !editing ? (
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm text-white/70 flex-1">
                {connected ? (
                  <span>
                    {t("Token aktiv. ")}
                    <strong>{projects.length}</strong>{" "}
                    {projects.length === 1 ? t("Projekt") : t("Projekte")} {t("gefunden")}.
                  </span>
                ) : (
                  <span className="text-amber-300">{t("Token gespeichert, aber Verbindung fehlgeschlagen.")}</span>
                )}
              </div>
              <button
                onClick={() => {
                  setEditing(true);
                  setToken("");
                }}
                className="text-xs bg-white/10 hover:bg-white/15 text-white rounded-md px-3 h-8"
              >
                {t("Token ändern")}
              </button>
              <button
                onClick={async () => {
                  if (!confirm(t("Token wirklich entfernen?"))) return;
                  setToken("");
                  await fetch("/api/admin/todoist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ apiToken: "" }),
                  });
                  load();
                }}
                className="text-xs bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-md px-3 h-8"
              >
                {t("Entfernen")}
              </button>
            </div>
          ) : (
            <div className="mb-3">
              <label className="block text-[11px] text-white/50 mb-1">
                {t("Todoist API-Token")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={reveal ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="0123456789abcdef…"
                  className={`${inputCls} font-mono`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  className="text-xs text-white/50 hover:text-white px-2 h-9 rounded-md bg-white/5 hover:bg-white/10"
                >
                  {reveal ? t("verbergen") : t("anzeigen")}
                </button>
              </div>
              <div className="text-[11px] text-white/40 mt-1">
                {t("In der Todoist-App: Einstellungen → Integrationen → Entwickler → API-Token kopieren.")}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={save}
                  disabled={saving || !token}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg px-4 h-9 disabled:opacity-40"
                >
                  {saving ? t("Speichere…") : t("Speichern + Verbinden")}
                </button>
                {hasToken && (
                  <button
                    onClick={() => {
                      setEditing(false);
                      setToken("");
                    }}
                    className="text-sm text-white/60 hover:text-white px-3 h-9"
                  >
                    {t("Abbrechen")}
                  </button>
                )}
              </div>
            </div>
          )}

          {connected && projects.length > 0 && (
            <ul className="space-y-1.5 mt-3">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="text-white/80 truncate">
                    {p.isInbox && <span className="mr-1">📥</span>}
                    {p.name}
                  </span>
                  <code className="text-[11px] font-mono text-white/40 shrink-0 ml-2">
                    {p.id}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

/* ---------- DDNS-Updater ---------- */

type ProviderField = {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "number";
  placeholder?: string;
  help?: string;
  required?: boolean;
  defaultValue?: string;
};
type ProviderDescriptor = {
  name: string;
  label: string;
  description: string;
  fields: ProviderField[];
};
type DDNSConfig = {
  enabled: boolean;
  provider: string;
  intervalMin: number;
  providerConfig: Record<string, Record<string, string>>;
};
type DDNSStatus = {
  enabled: boolean;
  configured: boolean;
  currentIp: string | null;
  lastIp: string | null;
  lastCheck: string | null;
  lastUpdate: string | null;
  lastError: string | null;
  intervalMin: number;
};

function DDNSCard() {
  const t = useT();
  const [providers, setProviders] = useState<ProviderDescriptor[]>([]);
  const [cfg, setCfg] = useState<DDNSConfig>({
    enabled: false,
    provider: "cloudflare",
    intervalMin: 5,
    providerConfig: {},
  });
  const [status, setStatus] = useState<DDNSStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  async function loadStatus() {
    try {
      const r = await fetch("/api/admin/ddns", { cache: "no-store" });
      const d = await r.json();
      setStatus(d.status);
      if (d.providers) setProviders(d.providers);
      if (d.config) {
        setCfg((c) => ({
          ...c,
          ...d.config,
          providerConfig: d.config.providerConfig ?? {},
        }));
      }
    } catch {}
  }
  useEffect(() => {
    loadStatus().finally(() => setLoading(false));
    const id = setInterval(loadStatus, 30_000);
    return () => clearInterval(id);
  }, []);

  function flash(kind: "ok" | "err", m: string) {
    setMsg({ kind, msg: m });
    setTimeout(() => setMsg(null), 4000);
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/ddns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Speichern fehlgeschlagen."));
      flash("ok", t("Konfiguration gespeichert."));
      await loadStatus();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateNow() {
    setUpdating(true);
    try {
      const r = await fetch("/api/admin/ddns/update", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Update fehlgeschlagen."));
      flash("ok", d.changed ? t("DNS-Record aktualisiert.") : t("Keine Änderung — IP ist gleich."));
      await loadStatus();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setUpdating(false);
    }
  }

  const activeProvider = providers.find((p) => p.name === cfg.provider);
  const activeBag = cfg.providerConfig[cfg.provider] ?? {};
  const allRequiredFilled = activeProvider
    ? activeProvider.fields.every(
        (f) => !f.required || ((activeBag[f.key] ?? "").trim().length > 0),
      )
    : false;

  function setField(name: string, key: string, value: string) {
    setCfg((c) => ({
      ...c,
      providerConfig: {
        ...c.providerConfig,
        [name]: { ...(c.providerConfig[name] ?? {}), [key]: value },
      },
    }));
  }

  return (
    <Card
      icon={<Globe2 size={18} />}
      iconTint="blue"
      title="Dynamic DNS (DDNS)"
      badge={status?.enabled && status?.configured ? { label: "Aktiv", tone: "emerald" } : undefined}
      desc="Hält deinen DNS-A-Record automatisch auf der aktuellen öffentlichen IP. Cloudflare, Hetzner DNS und alle DynDNS-v2-kompatiblen Dienste (Strato, No-IP, DuckDNS, IONOS …) werden unterstützt."
    >
      {msg && (
        <div className="mb-3">
          <Banner kind={msg.kind} msg={msg.msg} />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-white/40">{t("Lade…")}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
            <Stat label="Status" value={status?.enabled ? (status?.configured ? t("aktiv") : t("unvollständig")) : t("aus")} />
            <Stat label={t("Aktuelle IP")} value={status?.currentIp ?? "—"} />
            <Stat label={t("DNS-Record")} value={status?.lastIp ?? "—"} />
            <Stat label={t("Letzter Check")} value={status?.lastCheck ? new Date(status.lastCheck).toLocaleTimeString() : "—"} />
          </div>

          {status?.lastError && (
            <div className="mb-3">
              <Banner kind="err" msg={`${t("Letzter Fehler:")} ${status.lastError}`} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-white/80 col-span-1 sm:col-span-2">
              <input
                type="checkbox"
                checked={cfg.enabled}
                onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
                className="accent-blue-500 w-4 h-4 cursor-pointer"
              />
              {t("DDNS aktiv (Background-Update alle X Minuten)")}
            </label>

            <div>
              <label className="block text-[11px] text-white/50 mb-1">{t("Provider")}</label>
              <select
                value={cfg.provider}
                onChange={(e) => setCfg({ ...cfg, provider: e.target.value })}
                className={inputCls}
              >
                {providers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {t(p.label)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-white/50 mb-1">{t("Intervall (Minuten)")}</label>
              <input
                type="number"
                min={1}
                max={1440}
                value={cfg.intervalMin}
                onChange={(e) => setCfg({ ...cfg, intervalMin: Math.max(1, Math.min(1440, parseInt(e.target.value) || 5)) })}
                className={inputCls}
              />
            </div>

            {activeProvider && (
              <div className="sm:col-span-2 text-[12px] text-white/50 -mt-1 mb-1">
                {t(activeProvider.description)}
              </div>
            )}

            {activeProvider?.fields.map((f) => {
              const fieldId = `${cfg.provider}.${f.key}`;
              const value = activeBag[f.key] ?? "";
              const isPw = f.type === "password";
              const revealed = !!reveal[fieldId];
              const placeholder = f.placeholder ?? "";
              const wide = isPw || f.type === "url" || f.key === "updateUrl";
              return (
                <div key={fieldId} className={wide ? "sm:col-span-2" : ""}>
                  <label className="block text-[11px] text-white/50 mb-1">
                    {t(f.label)}
                    {f.required ? "" : <span className="text-white/30"> ({t("optional")})</span>}
                  </label>
                  {isPw ? (
                    <div className="flex items-center gap-2">
                      <input
                        type={revealed ? "text" : "password"}
                        value={value}
                        onChange={(e) => setField(cfg.provider, f.key, e.target.value)}
                        placeholder={placeholder}
                        className={`${inputCls} font-mono`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setReveal((r) => ({ ...r, [fieldId]: !r[fieldId] }))
                        }
                        className="text-xs text-white/50 hover:text-white px-2 h-9 rounded-md bg-white/5 hover:bg-white/10"
                      >
                        {revealed ? t("verbergen") : t("anzeigen")}
                      </button>
                    </div>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={value}
                      onChange={(e) => setField(cfg.provider, f.key, e.target.value)}
                      placeholder={placeholder}
                      className={`${inputCls}${f.type === "url" ? " font-mono text-[12px]" : ""}`}
                    />
                  )}
                  {f.help && (
                    <div className="text-[11px] text-white/40 mt-1">{t(f.help)}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg px-4 h-9 disabled:opacity-40"
            >
              {saving ? t("Speichere…") : t("Speichern")}
            </button>
            <button
              onClick={updateNow}
              disabled={updating || !allRequiredFilled}
              className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-3 h-9 disabled:opacity-40"
            >
              <RefreshCw size={13} className={updating ? "animate-spin" : ""} />
              {t("Jetzt aktualisieren")}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

/* ---------- Caddy (HTTPS-Reverse-Proxy) ---------- */

type CaddyProviderField = {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder?: string;
  help?: string;
  required?: boolean;
};
type CaddyProviderDescriptor = {
  name: string;
  label: string;
  fields: CaddyProviderField[];
  hasDdnsBridge: boolean;
};
type CaddyConfig = {
  enabled: boolean;
  mode: "managed" | "custom";
  domain: string;
  acmeEmail: string;
  challenge: "dns" | "http";
  dnsProvider: string;
  redirectHttp: boolean;
  extraDomains: string[];
  providerConfig: Record<string, Record<string, string>>;
  customCaddyfile: string;
};
type CaddyStatus = {
  reachable: boolean;
  tlsMode: boolean;
  certSubject?: string | null;
  certNotAfter?: string | null;
  lastReload?: string | null;
  lastError?: string | null;
  caddyfileMtime?: string | null;
};

function CaddyCard() {
  const t = useT();
  const [providers, setProviders] = useState<CaddyProviderDescriptor[]>([]);
  const [cfg, setCfg] = useState<CaddyConfig>({
    enabled: false,
    mode: "managed",
    domain: "",
    acmeEmail: "",
    challenge: "dns",
    dnsProvider: "cloudflare",
    redirectHttp: true,
    extraDomains: [],
    providerConfig: {},
    customCaddyfile: "",
  });
  const [status, setStatus] = useState<CaddyStatus | null>(null);
  const [caddyfile, setCaddyfile] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [extraInput, setExtraInput] = useState("");
  const [showFile, setShowFile] = useState(false);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  async function load() {
    try {
      const r = await fetch("/api/admin/caddy", { cache: "no-store" });
      const d = await r.json();
      if (d.providers) setProviders(d.providers);
      if (d.config) setCfg((c) => ({ ...c, ...d.config, providerConfig: d.config.providerConfig ?? {} }));
      if (d.status) setStatus(d.status);
      if (d.caddyfile !== undefined) setCaddyfile(d.caddyfile);
    } catch {}
  }
  useEffect(() => {
    load().finally(() => setLoading(false));
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  function flash(kind: "ok" | "err", m: string) {
    setMsg({ kind, msg: m });
    setTimeout(() => setMsg(null), 5000);
  }

  async function save() {
    setSaving(true);
    setWarnings([]);
    try {
      const r = await fetch("/api/admin/caddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Speichern fehlgeschlagen."));
      if (d.warnings?.length) setWarnings(d.warnings);
      if (d.error) flash("err", d.error);
      else if (d.reloaded) flash("ok", t("Caddy reloaded. Wenn Domain neu: Cert wird im Hintergrund geholt (ein paar Sekunden)."));
      else flash("ok", t("Gespeichert."));
      if (d.caddyfile) setCaddyfile(d.caddyfile);
      load();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function reloadNow() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/caddy/reload", { method: "POST" });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || t("Reload fehlgeschlagen."));
      if (d.warnings?.length) setWarnings(d.warnings);
      flash("ok", t("Caddy reloaded."));
      load();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setSaving(false);
    }
  }

  function addExtra() {
    const v = extraInput.trim();
    if (!v || cfg.extraDomains.includes(v) || v === cfg.domain) {
      setExtraInput("");
      return;
    }
    setCfg({ ...cfg, extraDomains: [...cfg.extraDomains, v] });
    setExtraInput("");
  }

  function setProviderField(provider: string, key: string, value: string) {
    setCfg((c) => ({
      ...c,
      providerConfig: {
        ...c.providerConfig,
        [provider]: { ...(c.providerConfig[provider] ?? {}), [key]: value },
      },
    }));
  }

  const activeProvider = providers.find((p) => p.name === cfg.dnsProvider);
  const activeBag = cfg.providerConfig[cfg.dnsProvider] ?? {};

  return (
    <Card
      icon={<Globe size={18} />}
      iconTint="emerald"
      title={t("HTTPS (Caddy Reverse-Proxy)")}
      badge={
        !status
          ? undefined
          : status.tlsMode
            ? { label: "TLS", tone: "emerald" }
            : status.reachable
              ? { label: "HTTP", tone: "amber" }
              : { label: "offline", tone: "zinc" }
      }
      desc={t(
        "Caddy steht vor der App, macht Reverse-Proxy + automatisches HTTPS via Let's Encrypt. 10 DNS-Provider sind integriert (Cloudflare/Hetzner/Route53/DigitalOcean/DuckDNS/Porkbun/Namecheap/IONOS/Netcup/Linode), für alles andere: Custom-Caddyfile-Modus.",
      )}
    >
      {msg && (
        <div className="mb-3">
          <Banner kind={msg.kind} msg={msg.msg} />
        </div>
      )}
      {warnings.map((w, i) => (
        <div key={i} className="mb-2">
          <Banner kind="err" msg={w} />
        </div>
      ))}

      {loading ? (
        <div className="text-sm text-white/40">{t("Lade…")}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
            <Stat
              label="Status"
              value={
                status?.tlsMode
                  ? t("TLS aktiv")
                  : status?.reachable
                    ? t("HTTP-Proxy")
                    : t("nicht erreichbar")
              }
            />
            <Stat label={t("Domain")} value={cfg.domain || "—"} />
            <Stat
              label={t("Modus")}
              value={
                cfg.mode === "custom"
                  ? t("Custom-Caddyfile")
                  : !cfg.enabled
                    ? t("aus")
                    : cfg.challenge === "dns"
                      ? `DNS-01 (${cfg.dnsProvider})`
                      : "HTTP-01"
              }
            />
            <Stat
              label={t("Letzter Reload")}
              value={status?.lastReload ? new Date(status.lastReload).toLocaleTimeString() : "—"}
            />
          </div>

          {status?.lastError && (
            <div className="mb-3">
              <Banner kind="err" msg={`${t("Letzter Fehler:")} ${status.lastError}`} />
            </div>
          )}

          {/* Mode-Toggle: managed vs custom */}
          <div className="inline-flex rounded-lg bg-black/40 border border-white/10 p-0.5 mb-4">
            <button
              onClick={() => setCfg({ ...cfg, mode: "managed" })}
              className={`px-3 h-8 rounded-md text-xs font-medium transition-colors ${
                cfg.mode === "managed" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              {t("Konfiguriert")}
            </button>
            <button
              onClick={() => setCfg({ ...cfg, mode: "custom" })}
              className={`px-3 h-8 rounded-md text-xs font-medium transition-colors ${
                cfg.mode === "custom" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              {t("Custom-Caddyfile")}
            </button>
          </div>

          {cfg.mode === "custom" ? (
            <div>
              <label className="block text-[11px] text-white/50 mb-1">
                {t("Eigenes Caddyfile (Power-User)")}
              </label>
              <textarea
                value={cfg.customCaddyfile}
                onChange={(e) => setCfg({ ...cfg, customCaddyfile: e.target.value })}
                rows={14}
                placeholder={`# ${t("Beispiel:")}\nmydomain.example.com {\n    tls {\n        dns gandi {env.GANDI_TOKEN}\n    }\n    reverse_proxy app:3000\n}`}
                className={`${inputCls} font-mono text-[12px] h-auto min-h-[200px]`}
                spellCheck={false}
              />
              <div className="text-[11px] text-white/40 mt-1">
                {t("Wird beim Speichern direkt an Caddy übergeben (atomares Validate + Load). Bei Syntaxfehler bleibt die alte Config aktiv.")}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-white/80 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                {t("HTTPS aktivieren (Caddy holt Let's-Encrypt-Cert für die Domain)")}
              </label>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-white/50 mb-1">{t("Domain (FQDN)")}</label>
                <input
                  type="text"
                  value={cfg.domain}
                  onChange={(e) => setCfg({ ...cfg, domain: e.target.value })}
                  placeholder="dashboard.example.com"
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-white/50 mb-1">
                  {t("Zusätzliche Domains (optional)")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={extraInput}
                    onChange={(e) => setExtraInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addExtra();
                      }
                    }}
                    placeholder="www.dashboard.example.com"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={addExtra}
                    className="text-sm text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-3 h-9 shrink-0"
                  >
                    {t("Hinzufügen")}
                  </button>
                </div>
                {cfg.extraDomains.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {cfg.extraDomains.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 text-[12px] bg-white/5 border border-white/10 rounded px-2 py-0.5"
                      >
                        {d}
                        <button
                          onClick={() =>
                            setCfg({
                              ...cfg,
                              extraDomains: cfg.extraDomains.filter((x) => x !== d),
                            })
                          }
                          className="text-white/40 hover:text-rose-400 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-white/50 mb-1">
                  {t("ACME-Email (Let's Encrypt)")}
                </label>
                <input
                  type="email"
                  value={cfg.acmeEmail}
                  onChange={(e) => setCfg({ ...cfg, acmeEmail: e.target.value })}
                  placeholder="me@example.com"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-[11px] text-white/50 mb-1">
                  {t("Challenge-Modus")}
                </label>
                <select
                  value={cfg.challenge}
                  onChange={(e) =>
                    setCfg({ ...cfg, challenge: e.target.value as "dns" | "http" })
                  }
                  className={inputCls}
                >
                  <option value="dns">{t("DNS-01 (Wildcards + Port 80 darf zu sein)")}</option>
                  <option value="http">{t("HTTP-01 (Port 80 muss offen sein)")}</option>
                </select>
              </div>

              {cfg.challenge === "dns" && (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-white/50 mb-1">
                      {t("DNS-Provider (für DNS-01)")}
                    </label>
                    <select
                      value={cfg.dnsProvider}
                      onChange={(e) => setCfg({ ...cfg, dnsProvider: e.target.value })}
                      className={inputCls}
                    >
                      {providers.map((p) => (
                        <option key={p.name} value={p.name}>
                          {t(p.label)}
                        </option>
                      ))}
                    </select>
                    {activeProvider?.hasDdnsBridge && (
                      <div className="text-[11px] text-emerald-300/80 mt-1">
                        {t("Token wird automatisch aus den DDNS-Einstellungen übernommen wenn dort konfiguriert.")}
                      </div>
                    )}
                  </div>

                  {activeProvider?.fields.map((f) => {
                    const fid = `${cfg.dnsProvider}.${f.key}`;
                    const value = activeBag[f.key] ?? "";
                    const isPw = f.type === "password";
                    const revealed = !!reveal[fid];
                    return (
                      <div key={fid} className={isPw ? "sm:col-span-2" : ""}>
                        <label className="block text-[11px] text-white/50 mb-1">
                          {t(f.label)}
                          {!f.required && <span className="text-white/30"> ({t("optional")})</span>}
                        </label>
                        {isPw ? (
                          <div className="flex items-center gap-2">
                            <input
                              type={revealed ? "text" : "password"}
                              value={value}
                              onChange={(e) =>
                                setProviderField(cfg.dnsProvider, f.key, e.target.value)
                              }
                              placeholder={f.placeholder ?? ""}
                              className={`${inputCls} font-mono`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setReveal((r) => ({ ...r, [fid]: !r[fid] }))
                              }
                              className="text-xs text-white/50 hover:text-white px-2 h-9 rounded-md bg-white/5 hover:bg-white/10"
                            >
                              {revealed ? t("verbergen") : t("anzeigen")}
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) =>
                              setProviderField(cfg.dnsProvider, f.key, e.target.value)
                            }
                            placeholder={f.placeholder ?? ""}
                            className={inputCls}
                          />
                        )}
                        {f.help && <div className="text-[11px] text-white/40 mt-1">{t(f.help)}</div>}
                      </div>
                    );
                  })}
                </>
              )}

              <label className="flex items-center gap-2 text-sm text-white/80 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={cfg.redirectHttp}
                  onChange={(e) => setCfg({ ...cfg, redirectHttp: e.target.checked })}
                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                />
                {t("HTTP → HTTPS Redirect (empfohlen)")}
              </label>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg px-4 h-9 disabled:opacity-40"
            >
              {saving ? t("Speichere…") : t("Speichern + Reload")}
            </button>
            <button
              onClick={reloadNow}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-3 h-9 disabled:opacity-40"
            >
              <RefreshCw size={13} className={saving ? "animate-spin" : ""} />
              {t("Nur Reload")}
            </button>
            <button
              onClick={() => setShowFile((v) => !v)}
              className="text-sm text-white/50 hover:text-white px-3 h-9 ml-auto"
            >
              {showFile ? t("Caddyfile ausblenden") : t("Caddyfile anzeigen")}
            </button>
          </div>

          {showFile && caddyfile && (
            <pre className="mt-3 text-[11px] bg-black/50 border border-white/10 rounded p-3 overflow-x-auto font-mono whitespace-pre">
              {caddyfile}
            </pre>
          )}
        </>
      )}
    </Card>
  );
}

/* ---------- 2FA ---------- */

function TwoFactorCard() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setup, setSetup] = useState<{
    secret: string;
    secretFormatted: string;
    qr: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [disablePw, setDisablePw] = useState("");
  const [regenPw, setRegenPw] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/auth/2fa/recovery-codes", { cache: "no-store" });
      const d = await r.json();
      setEnabled(!!d.enabled);
      setRemaining(d.remaining ?? 0);
    } catch {}
  }
  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  function flash(kind: "ok" | "err", m: string) {
    setMsg({ kind, msg: m });
    setTimeout(() => setMsg(null), 5000);
  }

  async function startSetup() {
    setBusy(true);
    try {
      const r = await fetch("/api/auth/2fa/setup", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Setup fehlgeschlagen."));
      if (d.enabled) {
        setEnabled(true);
        return;
      }
      setSetup({ secret: d.secret, secretFormatted: d.secretFormatted, qr: d.qr });
      setSetupOpen(true);
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    setBusy(true);
    try {
      const r = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Code ungültig."));
      setEnabled(true);
      setSetupOpen(false);
      setSetup(null);
      setCode("");
      setNewCodes(d.recoveryCodes);
      flash("ok", t("2FA aktiviert. Recovery-Codes jetzt sichern!"));
      load();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelSetup() {
    await fetch("/api/auth/2fa/setup", { method: "DELETE" }).catch(() => {});
    setSetup(null);
    setSetupOpen(false);
    setCode("");
  }

  async function disable() {
    if (!disablePw) {
      flash("err", t("Bitte Passwort eingeben."));
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePw }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Deaktivieren fehlgeschlagen."));
      setEnabled(false);
      setDisablePw("");
      setNewCodes(null);
      flash("ok", t("2FA deaktiviert."));
      load();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function regenerateCodes() {
    if (!regenPw) {
      flash("err", t("Bitte Passwort eingeben."));
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/2fa/recovery-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: regenPw }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Regenerierung fehlgeschlagen."));
      setNewCodes(d.recoveryCodes);
      setRegenPw("");
      flash("ok", t("Neue Recovery-Codes erzeugt. Alte sind nicht mehr gültig."));
      load();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      icon={<ShieldCheck size={18} />}
      iconTint={enabled ? "emerald" : "amber"}
      title={t("Zwei-Faktor-Authentifizierung (TOTP)")}
      badge={enabled ? { label: t("aktiv"), tone: "emerald" } : { label: t("aus"), tone: "zinc" }}
      desc={t(
        "Zusätzlicher 6-stelliger Code aus deiner Authenticator-App (Google Authenticator, 1Password, Authy, …) beim Login. Recovery-Codes als Fallback wenn das Telefon weg ist.",
      )}
    >
      {msg && (
        <div className="mb-3">
          <Banner kind={msg.kind} msg={msg.msg} />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-white/40">{t("Lade…")}</div>
      ) : !enabled && !setupOpen ? (
        <button
          onClick={startSetup}
          disabled={busy}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg px-4 h-9 disabled:opacity-40"
        >
          {t("2FA einrichten")}
        </button>
      ) : !enabled && setupOpen && setup ? (
        <div className="space-y-4">
          <div className="text-sm text-white/70">
            {t("Scanne den QR-Code mit deiner Authenticator-App und gib dann den 6-stelligen Code aus der App ein.")}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setup.qr}
              alt={t("2FA QR")}
              className="bg-white p-2 rounded-lg w-44 h-44 shrink-0"
            />
            <div className="text-xs text-white/60 space-y-2">
              <div>{t("Oder Secret manuell eingeben:")}</div>
              <code className="block font-mono text-[11px] bg-black/50 border border-white/10 rounded p-2 break-all">
                {setup.secretFormatted}
              </code>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className={`${inputCls} font-mono w-32 text-center text-lg tracking-widest`}
              autoFocus
            />
            <button
              onClick={confirmSetup}
              disabled={busy || code.length !== 6}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg px-4 h-9 disabled:opacity-40"
            >
              {t("Bestätigen + aktivieren")}
            </button>
            <button
              onClick={cancelSetup}
              disabled={busy}
              className="text-white/60 hover:text-white text-sm px-3 h-9"
            >
              {t("Abbrechen")}
            </button>
          </div>
        </div>
      ) : (
        // enabled
        <div className="space-y-4">
          <div className="text-sm text-white/60">
            {t("2FA ist aktiv.")} {remaining > 0 ? t("Verbleibende Recovery-Codes: ") + remaining : t("Keine Recovery-Codes mehr — bitte neu erzeugen.")}
          </div>

          <div className="border border-white/10 rounded-lg p-3 bg-black/20">
            <div className="text-xs text-white/50 mb-2">{t("Neue Recovery-Codes erzeugen (alte werden ungültig)")}</div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={regenPw}
                onChange={(e) => setRegenPw(e.target.value)}
                placeholder={t("Aktuelles Passwort")}
                className={inputCls}
                autoComplete="current-password"
              />
              <button
                onClick={regenerateCodes}
                disabled={busy || !regenPw}
                className="bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-lg px-3 h-9 disabled:opacity-40 shrink-0"
              >
                {t("Neu erzeugen")}
              </button>
            </div>
          </div>

          <div className="border border-red-500/30 rounded-lg p-3 bg-red-500/5">
            <div className="text-xs text-red-300 mb-2">{t("2FA deaktivieren")}</div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={disablePw}
                onChange={(e) => setDisablePw(e.target.value)}
                placeholder={t("Aktuelles Passwort")}
                className={inputCls}
                autoComplete="current-password"
              />
              <button
                onClick={disable}
                disabled={busy || !disablePw}
                className="bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg px-3 h-9 disabled:opacity-40 shrink-0"
              >
                {t("Deaktivieren")}
              </button>
            </div>
          </div>
        </div>
      )}

      {newCodes && (
        <div className="mt-4 border border-amber-500/30 rounded-lg p-3 bg-amber-500/10">
          <div className="text-sm font-semibold text-amber-200 mb-2">
            {t("Recovery-Codes — JETZT sichern. Werden nur dieses eine Mal angezeigt.")}
          </div>
          <div className="grid grid-cols-2 gap-1 font-mono text-[13px] mb-3">
            {newCodes.map((c) => (
              <div key={c} className="bg-black/40 rounded px-2 py-1 text-center">
                {c}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(newCodes.join("\n"));
                flash("ok", t("In Zwischenablage kopiert."));
              }}
              className="text-xs bg-white/10 hover:bg-white/15 rounded px-3 h-8"
            >
              <Copy size={12} className="inline mr-1" /> {t("Kopieren")}
            </button>
            <button
              onClick={() => setNewCodes(null)}
              className="text-xs text-white/60 hover:text-white px-3 h-8"
            >
              {t("Ich habe sie gesichert")}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---------- Login-Sicherheit (Lockout / Brute-Force) ---------- */

type SecurityConfig = {
  ipWindowMin: number;
  ipMaxFails: number;
  ipLockoutMin: number;
  userWindowMin: number;
  userMaxFails: number;
  userLockoutMin: number;
};

type Lockout = {
  id: string;
  scope: string;
  until: string;
  reason: string | null;
  createdAt: string;
};

type Attempt = {
  id: string;
  ip: string;
  email: string | null;
  success: boolean;
  reason: string | null;
  at: string;
};

function LoginSecurityCard() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<SecurityConfig>({
    ipWindowMin: 15,
    ipMaxFails: 5,
    ipLockoutMin: 30,
    userWindowMin: 60,
    userMaxFails: 10,
    userLockoutMin: 60,
  });
  const [lockouts, setLockouts] = useState<Lockout[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/admin/security", { cache: "no-store" });
      const d = await r.json();
      if (d.config) setCfg(d.config);
      if (d.lockouts) setLockouts(d.lockouts);
      if (d.attempts) setAttempts(d.attempts);
    } catch {}
  }
  useEffect(() => {
    load().finally(() => setLoading(false));
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  function flash(kind: "ok" | "err", m: string) {
    setMsg({ kind, msg: m });
    setTimeout(() => setMsg(null), 4000);
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Speichern fehlgeschlagen."));
      flash("ok", t("Sicherheitseinstellungen gespeichert."));
      load();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function clearLock(scope: string) {
    if (!confirm(t("Sperre wirklich aufheben?"))) return;
    try {
      const r = await fetch(`/api/admin/security?scope=${encodeURIComponent(scope)}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("failed");
      flash("ok", t("Sperre aufgehoben."));
      load();
    } catch {
      flash("err", t("Aufheben fehlgeschlagen."));
    }
  }

  return (
    <Card
      icon={<Lock size={18} />}
      iconTint="rose"
      title={t("Login-Sicherheit (Brute-Force-Schutz)")}
      desc={t(
        "Sperrt IP-Adressen und Konten nach zu vielen fehlgeschlagenen Login-Versuchen. Wirkt wie fail2ban, läuft aber direkt in der App — auch hinter Reverse-Proxy zuverlässig.",
      )}
    >
      {msg && (
        <div className="mb-3">
          <Banner kind={msg.kind} msg={msg.msg} />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-white/40">{t("Lade…")}</div>
      ) : (
        <>
          {lockouts.length > 0 && (
            <div className="mb-4">
              <div className="text-xs uppercase tracking-wide text-white/40 mb-2 flex items-center gap-1.5">
                <AlertOctagon size={12} /> {t("Aktive Sperren")} ({lockouts.length})
              </div>
              <div className="space-y-1.5">
                {lockouts.map((l) => {
                  const ms = new Date(l.until).getTime() - Date.now();
                  const mins = Math.max(0, Math.ceil(ms / 60000));
                  return (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-2 bg-rose-500/10 border border-rose-500/30 rounded px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-rose-200 text-[12px] truncate">{l.scope}</div>
                        {l.reason && <div className="text-[11px] text-white/50 truncate">{l.reason}</div>}
                      </div>
                      <div className="text-[11px] text-white/50 shrink-0">
                        {t("noch")} {mins} {t("min")}
                      </div>
                      <button
                        onClick={() => clearLock(l.scope)}
                        className="text-xs bg-white/10 hover:bg-white/15 rounded px-2 h-7 shrink-0"
                      >
                        {t("Freigeben")}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <NumField
              label={t("IP — max. Fehler")}
              value={cfg.ipMaxFails}
              onChange={(v) => setCfg({ ...cfg, ipMaxFails: v })}
              min={1}
              max={100}
            />
            <NumField
              label={t("IP — Fenster (min)")}
              value={cfg.ipWindowMin}
              onChange={(v) => setCfg({ ...cfg, ipWindowMin: v })}
              min={1}
              max={1440}
            />
            <NumField
              label={t("IP — Sperre (min)")}
              value={cfg.ipLockoutMin}
              onChange={(v) => setCfg({ ...cfg, ipLockoutMin: v })}
              min={1}
              max={10080}
            />
            <NumField
              label={t("Konto — max. Fehler")}
              value={cfg.userMaxFails}
              onChange={(v) => setCfg({ ...cfg, userMaxFails: v })}
              min={1}
              max={100}
            />
            <NumField
              label={t("Konto — Fenster (min)")}
              value={cfg.userWindowMin}
              onChange={(v) => setCfg({ ...cfg, userWindowMin: v })}
              min={1}
              max={1440}
            />
            <NumField
              label={t("Konto — Sperre (min)")}
              value={cfg.userLockoutMin}
              onChange={(v) => setCfg({ ...cfg, userLockoutMin: v })}
              min={1}
              max={10080}
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg px-4 h-9 disabled:opacity-40 mb-4"
          >
            {saving ? t("Speichere…") : t("Speichern")}
          </button>

          <details className="text-sm">
            <summary className="cursor-pointer text-white/60 hover:text-white">
              {t("Letzte Login-Versuche")} ({attempts.length})
            </summary>
            <div className="mt-2 max-h-64 overflow-y-auto border border-white/10 rounded-lg">
              <table className="w-full text-[12px]">
                <thead className="bg-white/5 text-white/40 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5">{t("Zeit")}</th>
                    <th className="text-left px-2 py-1.5">IP</th>
                    <th className="text-left px-2 py-1.5">Email</th>
                    <th className="text-left px-2 py-1.5">{t("Ergebnis")}</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-t border-white/5">
                      <td className="px-2 py-1 text-white/50">
                        {new Date(a.at).toLocaleString()}
                      </td>
                      <td className="px-2 py-1 font-mono text-white/70">{a.ip}</td>
                      <td className="px-2 py-1 text-white/70 truncate max-w-[180px]">
                        {a.email ?? "—"}
                      </td>
                      <td className="px-2 py-1">
                        {a.success ? (
                          <span className="text-emerald-400">✓ {a.reason ?? "ok"}</span>
                        ) : (
                          <span className="text-rose-400">✗ {a.reason ?? "fail"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {attempts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-white/40 px-2 py-3">
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </Card>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="block text-[11px] text-white/50 mb-1">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))
        }
        className={inputCls}
      />
    </div>
  );
}

/* ---------- Passwort ändern ---------- */

function PasswordCard() {
  const t = useT();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) {
      setMsg({ kind: "err", msg: t("Neue Passwörter stimmen nicht überein.") });
      return;
    }
    if (next.length < 8) {
      setMsg({ kind: "err", msg: t("Neues Passwort muss mindestens 8 Zeichen haben.") });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || t("Fehlgeschlagen."));
      setMsg({ kind: "ok", msg: t("Passwort geändert.") });
      setCur("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      setMsg({ kind: "err", msg: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      icon={<KeyRound size={16} />}
      title="Passwort ändern"
      desc="Eigenes Admin-Passwort rotieren. Mindestens 8 Zeichen."
    >
      <form onSubmit={submit} className="space-y-3 max-w-md">
        <input
          type="password"
          autoComplete="current-password"
          placeholder={t("Aktuelles Passwort")}
          value={cur}
          onChange={(e) => setCur(e.target.value)}
          className={inputCls}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="password"
            autoComplete="new-password"
            placeholder={t("Neues Passwort")}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputCls}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder={t("Neues Passwort bestätigen")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
          />
        </div>
        {msg && <Banner kind={msg.kind} msg={t(msg.msg)} />}
        <button
          type="submit"
          disabled={busy || !cur || !next}
          className="flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
          {t("Passwort speichern")}
        </button>
      </form>
    </Card>
  );
}

/* ---------- Weitere Nutzer ---------- */

type UserRow = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  hasShortcutToken: boolean;
};

function UsersCard() {
  const t = useT();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentRole, setCurrentRole] = useState<string>("admin");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");

  async function reload() {
    const r = await fetch("/api/admin/users", { cache: "no-store" });
    const d = await r.json();
    setUsers(d.users ?? []);
    setCurrentUserId(d.currentUserId ?? "");
    setCurrentRole(d.currentRole ?? "admin");
  }

  useEffect(() => {
    reload().catch(() => setUsers([]));
  }, []);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || t("Fehlgeschlagen."));
      setEmail("");
      setPassword("");
      setRole("admin");
      setMsg({ kind: "ok", msg: t("Nutzer angelegt.") });
      await reload();
    } catch (err: any) {
      setMsg({ kind: "err", msg: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(id: string, mail: string) {
    if (!confirm(`${t("Nutzer")} ${mail} ${t("wirklich löschen?")}`)) return;
    setMsg(null);
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || t("Fehlgeschlagen."));
      await reload();
    } catch (err: any) {
      setMsg({ kind: "err", msg: err.message });
    }
  }

  const isAdmin = currentRole === "admin";

  return (
    <Card
      icon={<Users size={16} />}
      iconTint="indigo"
      title="Weitere Nutzer"
      desc="Mehrere Admin- oder Nur-Ansehen-Accounts. Nur Admins können Nutzer verwalten."
    >
      <div className="space-y-2 mb-4">
        {users === null ? (
          <div className="text-sm text-white/40">{t("Lade Nutzer…")}</div>
        ) : users.length === 0 ? (
          <div className="text-sm text-white/40">{t("Keine Nutzer.")}</div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-lg px-3 py-2"
            >
              <div
                className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold uppercase shrink-0 ${
                  u.role === "admin"
                    ? "bg-blue-500/20 text-blue-300"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {u.role === "admin" ? "ADM" : "VIE"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">
                  {u.email}
                  {u.id === currentUserId && (
                    <span className="text-[10px] text-white/40 ml-2">{t("(du)")}</span>
                  )}
                </div>
                <div className="text-[11px] text-white/40">
                  {u.role === "admin" ? t("Administrator") : t("Nur ansehen")}
                  {u.hasShortcutToken && ` · ${t("Shortcut-Token aktiv")}`}
                </div>
              </div>
              {isAdmin && u.id !== currentUserId && (
                <button
                  onClick={() => removeUser(u.id, u.email)}
                  className="text-xs text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded px-2 h-7 flex items-center gap-1"
                >
                  <Trash2 size={12} /> {t("Löschen")}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {msg && <div className="mb-3"><Banner kind={msg.kind} msg={msg.msg} /></div>}

      {isAdmin ? (
        <form onSubmit={addUser} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
          <input
            type="email"
            placeholder={t("email@beispiel.de")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
          <input
            type="text"
            placeholder={t("Passwort (≥ 8 Zeichen)")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-black border border-white/10 text-white text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500"
          >
            <option value="admin">{t("Admin")}</option>
            <option value="viewer">{t("Nur ansehen")}</option>
          </select>
          <button
            type="submit"
            disabled={busy || !email || !password}
            className="flex items-center justify-center gap-2 px-4 h-10 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            {t("Anlegen")}
          </button>
        </form>
      ) : (
        <p className="text-xs text-white/40">
          {t("Du bist als")} <strong className="text-white/70">{t("Nur-Ansehen")}</strong> {t("angemeldet —")}
          {t("Nutzer-Verwaltung ist Admins vorbehalten.")}
        </p>
      )}
    </Card>
  );
}

/* ---------- Server ---------- */

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}
function fmtBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.round(n / 1024 ** 2)} MB`;
}

function ServerCard() {
  const t = useT();
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/server-info", { cache: "no-store" });
      setInfo(await r.json());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <Card
      icon={<Server size={16} />}
      iconTint="blue"
      title="Server"
      desc="Host-Info, Build-Version, Uptime, Datenbank-Status."
    >
      {loading || !info ? (
        <div className="text-sm text-white/40">{t("Lade Server-Status…")}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Stat label="App-Version" value={`v${info.appVersion}`} />
            <Stat label="Node" value={info.node} />
            <Stat
              label="Datenbank"
              value={info.dbOk ? "verbunden" : "Fehler"}
              tone={info.dbOk ? "ok" : "err"}
              icon={<Database size={12} />}
            />
            <Stat label="Prozess-Uptime" value={fmtUptime(info.processUptimeSec)} icon={<Clock size={12} />} />
            <Stat label="Host-Uptime" value={fmtUptime(info.hostUptimeSec)} />
            <Stat label="CPU-Kerne" value={String(info.cpuCount)} icon={<Cpu size={12} />} />
            <Stat label="RAM (Prozess)" value={fmtBytes(info.memory.rssBytes)} />
            <Stat
              label="RAM (Host frei)"
              value={`${fmtBytes(info.memory.hostFreeBytes)} / ${fmtBytes(info.memory.hostTotalBytes)}`}
            />
            <Stat label="Nutzer" value={String(info.userCount)} />
            <Stat
              label="Cookie Secure"
              value={info.cookieSecure ? "an" : "aus"}
              tone={info.cookieSecure ? "ok" : "warn"}
            />
            <Stat label="Plattform" value={info.platform} />
            <Stat label="Last (1m)" value={String(info.loadAvg?.[0] ?? "–")} />
          </div>
          <button
            onClick={load}
            className="mt-4 flex items-center gap-2 text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-md px-3 h-8"
          >
            <RefreshCw size={12} /> {t("Aktualisieren")}
          </button>
        </>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "ok" | "err" | "warn";
  icon?: React.ReactNode;
}) {
  const t = useT();
  const toneCls =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "err"
        ? "text-red-300"
        : tone === "warn"
          ? "text-amber-300"
          : "text-white/90";
  return (
    <div className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">{t(label)}</div>
      <div className={`text-sm font-medium truncate flex items-center gap-1 ${toneCls}`}>
        {icon}
        {t(value)}
      </div>
    </div>
  );
}

/* ---------- Session & Cookies ---------- */

function SessionCard() {
  const t = useT();
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/session-info", { cache: "no-store" })
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  async function logout() {
    if (!confirm(t("Auf diesem Gerät abmelden?"))) return;
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <Card
      icon={<Shield size={16} />}
      iconTint="amber"
      title="Session & Cookies"
      desc="Sicherheits-Status deiner Anmeldung."
    >
      {!info ? (
        <div className="text-sm text-white/40">{t("Lade…")}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
            <Stat label="Angemeldet als" value={info.email || "–"} />
            <Stat label="Rolle" value={info.role === "admin" ? "Admin" : "Nur ansehen"} />
            <Stat
              label="Cookie Secure"
              value={info.cookieSecure ? "an (HTTPS)" : "aus"}
              tone={info.cookieSecure ? "ok" : "warn"}
            />
            <Stat label="SameSite" value={info.sameSite} />
            <Stat label="HttpOnly" value={info.httpOnly ? "ja" : "nein"} tone={info.httpOnly ? "ok" : "warn"} />
            <Stat label="Gültigkeit" value={`${info.lifetimeDays} ${t("Tage")}`} />
            <Stat
              label="Session-Secret"
              value={info.secretStrength}
              tone={info.secretStrength === "stark" ? "ok" : "err"}
            />
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <LogOut size={14} /> {t("Auf diesem Gerät abmelden")}
          </button>

          <div className="mt-4 bg-black/30 border border-white/10 rounded-lg p-3 text-[11px] text-white/40 leading-relaxed">
            <strong className="text-white/60">{t("Alle Geräte abmelden / Secret rotieren:")}</strong>{" "}
            {t("Das Session-Secret ist bewusst nur per Umgebungsvariable")}{" "}
            <code className="bg-white/10 px-1 rounded text-white/60">SESSION_SECRET</code>{" "}
            {t("(≥ 32 Zeichen) setzbar — ein Rotieren per Klick wäre ein Sicherheitsrisiko. Beim Ändern + Redeploy werden alle bestehenden Sessions automatisch ungültig (alte Cookies sind nicht mehr entschlüsselbar). Gleiches gilt für")}{" "}
            <code className="bg-white/10 px-1 rounded text-white/60">COOKIE_SECURE=true</code>{" "}
            {t("(erzwingt HTTPS-only-Cookies).")}
          </div>
        </>
      )}
    </Card>
  );
}

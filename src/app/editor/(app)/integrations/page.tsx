"use client";

import { useEffect, useState } from "react";
import { Plug, Save, Check, ChevronDown, Calendar as CalendarIcon, Trash2, ExternalLink, AlertTriangle, Copy, KeyRound, RefreshCw, ListChecks, Eye, EyeOff, Server } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

type CalendarAccount = {
  id: string;
  provider: "google" | "microsoft" | "caldav";
  accountEmail: string | null;
  accountName: string | null;
  serverUrl: string | null;
  createdAt: string;
  expiresAt: string;
};

export default function IntegrationsPage() {
  const t = useT();
  const [haUrl, setHaUrl] = useState("");
  const [haToken, setHaToken] = useState("");
  const [haLoading, setHaLoading] = useState(true);
  const [haSaveStatus, setHaSaveStatus] = useState<null | "saving" | "saved" | "error">(null);
  const [immichUrl, setImmichUrl] = useState("");
  const [immichApiKey, setImmichApiKey] = useState("");
  const [immichSaveStatus, setImmichSaveStatus] = useState<null | "saving" | "saved" | "error">(null);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setHaUrl(d.haUrl ?? "");
        setHaToken(d.haToken ?? "");
        setImmichUrl(d.immichUrl ?? "");
        setImmichApiKey(d.immichApiKey ?? "");
      })
      .catch(() => {})
      .finally(() => setHaLoading(false));
  }, []);

  async function saveHa(e: React.FormEvent) {
    e.preventDefault();
    setHaSaveStatus("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ haUrl: haUrl.trim(), haToken }),
      });
      if (!res.ok) throw new Error("save failed");
      setHaSaveStatus("saved");
      setTimeout(() => setHaSaveStatus(null), 2000);
    } catch {
      setHaSaveStatus("error");
      setTimeout(() => setHaSaveStatus(null), 2500);
    }
  }

  async function saveImmich(e: React.FormEvent) {
    e.preventDefault();
    setImmichSaveStatus("saving");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ immichUrl: immichUrl.trim(), immichApiKey }),
      });
      if (!res.ok) throw new Error("save failed");
      setImmichSaveStatus("saved");
      setTimeout(() => setImmichSaveStatus(null), 2000);
    } catch {
      setImmichSaveStatus("error");
      setTimeout(() => setImmichSaveStatus(null), 2500);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[900px] mx-auto px-8 py-10">
        <div className="mb-8">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--mf-fg)]/40 mb-2">
            {t("Integrationen")}
          </div>
          <h1 className="text-3xl font-semibold">{t("Daten- & Medienquellen")}</h1>
          <p className="text-[var(--mf-fg)]/50 mt-2 max-w-xl text-sm">
            {t("Home Assistant gilt global für alle Views. Das Wallpaper konfigurierst du direkt im View-Editor (Button „Wallpaper\").")}
          </p>
        </div>

        <section className="mb-10 bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl shrink-0">
              🏡
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">{t("Home Assistant")}</h2>
              <p className="text-sm text-[var(--mf-fg)]/50">
                {t("URL + Long-Lived Access Token. Gilt global. Token-Generator: HA-UI → Profil (unten links) → Long-Lived Access Tokens.")}
              </p>
            </div>
          </div>

          <form onSubmit={saveHa} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-1.5">
                {t("Home-Assistant-URL")}
              </span>
              <input
                type="url"
                value={haUrl}
                onChange={(e) => setHaUrl(e.target.value)}
                placeholder="http://192.168.0.50:8123"
                disabled={haLoading}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-1.5">
                {t("Long-Lived Access Token")}
              </span>
              <input
                type="password"
                value={haToken}
                onChange={(e) => setHaToken(e.target.value)}
                placeholder="eyJ0eXAiOiJKV1Qi…"
                disabled={haLoading}
                autoComplete="off"
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm font-mono rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
              <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                {t("Wird verschlüsselt am Server gespeichert und beim HA-Proxy eingesetzt. Niemals im Frontend-Bundle.")}
              </p>
            </label>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[var(--mf-fg)]/40">
                {haUrl && haToken
                  ? t("Verbindung konfiguriert.")
                  : t("Nicht konfiguriert — HA-Widgets bleiben leer.")}
              </span>
              <button
                type="submit"
                disabled={haLoading || haSaveStatus === "saving"}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
                  haSaveStatus === "saved"
                    ? "bg-green-600 text-white shadow-green-500/30"
                    : haSaveStatus === "error"
                      ? "bg-red-600 text-white shadow-red-500/30"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30"
                }`}
              >
                {haSaveStatus === "saved" ? <Check size={14} /> : <Save size={14} />}
                {haSaveStatus === "saving" && t("Speichere…")}
                {haSaveStatus === "saved" && t("Gespeichert")}
                {haSaveStatus === "error" && t("Fehler")}
                {!haSaveStatus && t("Speichern")}
              </button>
            </div>
          </form>
        </section>

        <section className="mb-10 bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl shrink-0">
              🖼️
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">{t("Immich (global)")}</h2>
              <p className="text-sm text-[var(--mf-fg)]/50">
                {t("Globale Immich-Verbindung für Wallpaper + Bild-Widget. Pro View/Widget überschreibbar — wer dort eigene Daten einträgt, nutzt die.")}
              </p>
            </div>
          </div>
          <form onSubmit={saveImmich} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-1.5">{t("Immich-URL")}</span>
              <input
                type="url"
                value={immichUrl}
                onChange={(e) => setImmichUrl(e.target.value)}
                placeholder="http://192.168.0.50:2283"
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-1.5">{t("API-Key (Read Only)")}</span>
              <input
                type="password"
                value={immichApiKey}
                onChange={(e) => setImmichApiKey(e.target.value)}
                placeholder="•••••••••••••••••••••"
                autoComplete="off"
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm font-mono rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                {t("Wird am Server gespeichert. Views ohne eigene Immich-Daten nutzen diese Verbindung.")}
              </p>
            </label>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[var(--mf-fg)]/40">
                {immichUrl && immichApiKey
                  ? t("Globale Verbindung konfiguriert.")
                  : t("Optional — nur nötig, wenn Views keine eigenen Daten haben.")}
              </span>
              <button
                type="submit"
                disabled={immichSaveStatus === "saving"}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
                  immichSaveStatus === "saved"
                    ? "bg-green-600 text-white shadow-green-500/30"
                    : immichSaveStatus === "error"
                      ? "bg-red-600 text-white shadow-red-500/30"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30"
                }`}
              >
                {immichSaveStatus === "saved" ? <Check size={14} /> : <Save size={14} />}
                {immichSaveStatus === "saving" && t("Speichere…")}
                {immichSaveStatus === "saved" && t("Gespeichert")}
                {immichSaveStatus === "error" && t("Fehler")}
                {!immichSaveStatus && t("Speichern")}
              </button>
            </div>
          </form>
        </section>

        <HAListsSection />

        <CalendarAccountsSection />

        <TodoistSection />

        <OpenWeatherMapSection />

        <section className="mt-10 bg-[var(--mf-surface-2)]/40 light:bg-[var(--mf-surface)] border border-dashed border-[var(--mf-bdr)]/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Plug size={16} className="text-[var(--mf-fg)]/50" />
            <h3 className="font-semibold">{t("Weitere Quellen")}</h3>
          </div>
          <p className="text-sm text-[var(--mf-fg)]/50">
            {t("iCal-Feeds werden weiterhin direkt pro Kalender-Widget im View-Editor konfiguriert. Generische MQTT- und REST-Integrationen kommen mit dem Modul-Market.")}
          </p>
        </section>
      </div>
    </div>
  );
}

const ERROR_LABEL_KEYS: Record<string, string> = {
  not_configured: "Provider ist serverseitig nicht konfiguriert (GOOGLE_CLIENT_ID / MS_CLIENT_ID fehlt in .env).",
  no_code: "Autorisierung abgebrochen — kein Code vom Anbieter.",
  bad_state: "State-Parameter ungültig (Session oder CSRF-Check fehlgeschlagen).",
  token_exchange: "Token-Tausch fehlgeschlagen — Redirect-URI oder Secret falsch?",
  exception: "Unbekannter Fehler bei der Verknüpfung.",
};

function CalendarAccountsSection() {
  const t = useT();
  const [accounts, setAccounts] = useState<CalendarAccount[] | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [microsoftConfigured, setMicrosoftConfigured] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const provider = sp.get("calendar");
    const ok = sp.get("ok");
    const err = sp.get("err");
    if (provider && ok) {
      const label = provider === "google" ? t("Google-Konto") : t("Microsoft-Konto");
      setBanner({ kind: "ok", message: `${label} ${t("erfolgreich verbunden.")}` });
      window.history.replaceState({}, "", "/editor/integrations");
    } else if (provider && err) {
      const label = provider === "google" ? "Google" : "Microsoft";
      const errMsg = ERROR_LABEL_KEYS[err] ? t(ERROR_LABEL_KEYS[err]) : err;
      setBanner({ kind: "err", message: `${label}: ${errMsg}` });
      window.history.replaceState({}, "", "/editor/integrations");
    }
  }, []);

  async function reload() {
    try {
      const res = await fetch("/api/auth/calendar/accounts", { cache: "no-store" });
      if (!res.ok) {
        setAccounts([]);
        return;
      }
      const d = await res.json();
      setAccounts(d.accounts ?? []);
      setGoogleConfigured(!!d.googleConfigured);
      setMicrosoftConfigured(!!d.microsoftConfigured);
    } catch {
      setAccounts([]);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function disconnect(id: string) {
    if (!confirm(t("Konto wirklich trennen? Alle Feeds, die dieses Konto nutzen, werden ungültig."))) return;
    setDeleting(id);
    try {
      await fetch(`/api/auth/calendar/accounts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await reload();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="mb-10 bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl shrink-0">
          <CalendarIcon size={22} className="text-purple-300" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{t("Kalender-Konten")}</h2>
          <p className="text-sm text-[var(--mf-fg)]/50">
            {t("Verbinde Google, Microsoft 365 oder einen CalDAV-Server (Nextcloud, Baïkal, Radicale, Synology, iCloud …), um echte Kalenderdaten im Kalender-Widget anzuzeigen. iCal-URLs bleiben als separate Feed-Art erhalten.")}
          </p>
        </div>
      </div>

      {banner && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm flex items-center gap-2 ${
            banner.kind === "ok"
              ? "bg-green-600/10 border-green-500/40 text-green-200"
              : "bg-red-600/10 border-red-500/40 text-red-200"
          }`}
        >
          {banner.kind === "ok" ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span className="flex-1">{banner.message}</span>
          <button
            onClick={() => setBanner(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            {t("schließen")}
          </button>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {accounts === null ? (
          <div className="text-sm text-[var(--mf-fg)]/40">{t("Lade Konten…")}</div>
        ) : accounts.length === 0 ? (
          <div className="text-sm text-[var(--mf-fg)]/40">{t("Noch keine Konten verbunden.")}</div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center gap-3 bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg px-3 py-2"
            >
              <div
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                  acc.provider === "google"
                    ? "bg-red-500/20 text-red-300"
                    : acc.provider === "caldav"
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-sky-500/20 text-sky-300"
                }`}
              >
                {acc.provider === "google" ? "G" : acc.provider === "caldav" ? "DAV" : "MS"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--mf-fg)] truncate">
                  {acc.accountName || acc.accountEmail || t("(unbenannt)")}
                </div>
                <div className="text-[11px] text-[var(--mf-fg)]/40 truncate">
                  {acc.provider === "caldav" ? (
                    <>
                      {acc.accountEmail || t("(unbenannt)")} · CalDAV · {acc.serverUrl}
                    </>
                  ) : (
                    <>
                      {acc.accountEmail || t("kein E-Mail ermittelbar")} ·
                      {acc.provider === "google" ? " Google Calendar" : " Microsoft 365"}
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => disconnect(acc.id)}
                disabled={deleting === acc.id}
                className="text-xs text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded px-2 h-7 flex items-center gap-1 disabled:opacity-40"
              >
                <Trash2 size={12} />
                {t("Trennen")}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="/api/auth/calendar/google/start"
          className={`flex items-center justify-between gap-2 rounded-lg px-4 h-11 text-sm font-semibold transition-colors border ${
            googleConfigured
              ? "bg-red-600/10 border-red-500/40 text-red-200 hover:bg-red-600/20"
              : "bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/40 pointer-events-none"
          }`}
          aria-disabled={!googleConfigured}
        >
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-red-500/30 text-[10px] font-bold flex items-center justify-center">
              G
            </span>
            {t("Google verbinden")}
          </span>
          <ExternalLink size={14} />
        </a>
        <a
          href="/api/auth/calendar/microsoft/start"
          className={`flex items-center justify-between gap-2 rounded-lg px-4 h-11 text-sm font-semibold transition-colors border ${
            microsoftConfigured
              ? "bg-sky-600/10 border-sky-500/40 text-sky-200 hover:bg-sky-600/20"
              : "bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/40 pointer-events-none"
          }`}
          aria-disabled={!microsoftConfigured}
        >
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-sky-500/30 text-[10px] font-bold flex items-center justify-center">
              MS
            </span>
            {t("Microsoft 365 verbinden")}
          </span>
          <ExternalLink size={14} />
        </a>
      </div>

      <CaldavConnectForm onSaved={reload} />

      <OAuthCredentialsForm onSaved={reload} />
    </section>
  );
}

const CALDAV_ERROR_KEYS: Record<string, string> = {
  caldav_missing_fields: "Server, Benutzername und Passwort sind alle nötig.",
  caldav_invalid_url: "Die Server-Adresse ist keine gültige URL.",
  caldav_unauthorized: "Anmeldung abgelehnt — Benutzername oder Passwort stimmt nicht. Viele Server verlangen ein App-Passwort statt des Konto-Passworts.",
  caldav_forbidden: "Der Server verweigert den Zugriff auf die Kalender dieses Kontos.",
  caldav_timeout: "Zeitüberschreitung — ist der Server von hier aus erreichbar?",
  caldav_no_calendars: "Verbindung steht, aber der Server liefert keinen Kalender mit Terminen zurück.",
  caldav_failed: "Verbindung fehlgeschlagen.",
};

function caldavErrorText(code: string): string {
  if (CALDAV_ERROR_KEYS[code]) return CALDAV_ERROR_KEYS[code];
  if (code.startsWith("caldav_unreachable"))
    return "Server nicht erreichbar — Adresse, Port und HTTPS prüfen.";
  if (code.startsWith("caldav_http_"))
    return `Der Server antwortete mit HTTP ${code.replace("caldav_http_", "")}.`;
  return code;
}

/**
 * CalDAV braucht keinen OAuth-Redirect: Adresse + Benutzer + (App-)Passwort
 * reichen. Gespeichert wird erst, wenn der Server die Daten akzeptiert —
 * die Antwort sagt gleich, wie viele Kalender gefunden wurden.
 */
function CaldavConnectForm({ onSaved }: { onSaved: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accountName, setAccountName] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; message: string } | null>(null);

  const fieldCls =
    "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs rounded-md px-2 h-9 focus:outline-none focus:border-purple-500";

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/auth/calendar/caldav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverUrl, username, password, accountName }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(caldavErrorText(String(d.error ?? "caldav_failed")));
      const count = Array.isArray(d.calendars) ? d.calendars.length : 0;
      setMsg({
        kind: "ok",
        message: `${t("CalDAV-Konto verbunden.")} ${count} ${t("Kalender gefunden.")}`,
      });
      setPassword("");
      onSaved();
    } catch (err: any) {
      setMsg({ kind: "err", message: t(err.message) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details
      className="mt-4 group"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer select-none flex items-center gap-2 text-sm text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)]">
        <Server size={14} className="text-purple-300" />
        {t("CalDAV-Server verbinden (Nextcloud, Baïkal, Radicale, Synology, iCloud …)")}
        <ChevronDown size={14} className="text-[var(--mf-fg)]/40 transition-transform group-open:rotate-180" />
      </summary>

      <div className="mt-3 bg-[var(--mf-ovl)]/30 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-xl p-4 space-y-4">
        <p className="text-[11px] text-[var(--mf-fg)]/50 leading-relaxed">
          {t("Die Adresse, die auch dein Handy nutzt — Server-Basis reicht, der Rest wird automatisch gefunden (z.B. https://cloud.example.com/remote.php/dav für Nextcloud). Nutze möglichst ein App-Passwort statt deines Konto-Passworts; bei aktiver Zwei-Faktor-Anmeldung ist es Pflicht.")}
        </p>

        <form onSubmit={connect} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="md:col-span-2 block">
            <span className="text-[11px] font-medium text-[var(--mf-fg)]/60 block mb-1">
              {t("Server-Adresse")}
            </span>
            <input
              className={fieldCls}
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://cloud.example.com/remote.php/dav"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-[var(--mf-fg)]/60 block mb-1">
              {t("Benutzername")}
            </span>
            <input
              className={fieldCls}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              placeholder="anna"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-[var(--mf-fg)]/60 block mb-1">
              {t("App-Passwort")}
            </span>
            <div className="flex items-center gap-2">
              <input
                className={fieldCls}
                type={reveal ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                className="text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)]/70 px-1"
                tabIndex={-1}
              >
                {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>
          <label className="md:col-span-2 block">
            <span className="text-[11px] font-medium text-[var(--mf-fg)]/60 block mb-1">
              {t("Anzeigename (optional)")}
            </span>
            <input
              className={fieldCls}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={t("z.B. Nextcloud privat")}
            />
          </label>

          {msg && (
            <div className="md:col-span-2">
              <div
                className={`flex items-start gap-2 text-xs rounded-md border px-3 py-2 ${
                  msg.kind === "ok"
                    ? "bg-green-600/10 border-green-500/40 text-green-200"
                    : "bg-red-600/10 border-red-500/40 text-red-200"
                }`}
              >
                {msg.kind === "ok" ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
                <span>{msg.message}</span>
              </div>
            </div>
          )}

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={busy || !serverUrl.trim() || !username.trim() || !password}
              className="flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40"
            >
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <Plug size={14} />}
              {busy ? t("Verbinde…") : t("Verbinden")}
            </button>
            <span className="text-[11px] text-[var(--mf-fg)]/30">
              {t("Wird erst gespeichert, wenn der Server die Zugangsdaten akzeptiert.")}
            </span>
          </div>
        </form>
      </div>
    </details>
  );
}

function OAuthCredentialsForm({ onSaved }: { onSaved: () => void }) {
  const t = useT();
  const [status, setStatus] = useState<any>(null);
  const [gId, setGId] = useState("");
  const [gSecret, setGSecret] = useState("");
  const [mId, setMId] = useState("");
  const [mSecret, setMSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; message: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "{APP_BASE_URL}";
  const googleRedirect = `${origin}/api/auth/calendar/google/callback`;
  const msRedirect = `${origin}/api/auth/calendar/microsoft/callback`;

  async function loadStatus() {
    try {
      const r = await fetch("/api/admin/oauth-credentials", { cache: "no-store" });
      const d = await r.json();
      setStatus(d);
      setGId(d.googleClientId || "");
      setMId(d.msClientId || "");
    } catch {}
  }
  useEffect(() => {
    loadStatus();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const body: any = { googleClientId: gId, msClientId: mId };
      if (gSecret) body.googleClientSecret = gSecret;
      if (mSecret) body.msClientSecret = mSecret;
      const r = await fetch("/api/admin/oauth-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Fehlgeschlagen."));
      setGSecret("");
      setMSecret("");
      setStatus(d.status);
      setMsg({ kind: "ok", message: t("Zugangsdaten gespeichert. Die Verbinden-Buttons sind jetzt aktiv.") });
      onSaved();
    } catch (err: any) {
      setMsg({ kind: "err", message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!confirm(t("Gespeicherte OAuth-Zugangsdaten löschen?"))) return;
    const r = await fetch("/api/admin/oauth-credentials", { method: "DELETE" });
    const d = await r.json();
    setStatus(d.status);
    setGId(d.status?.googleClientId || "");
    setMId(d.status?.msClientId || "");
    setGSecret("");
    setMSecret("");
    onSaved();
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const fieldCls =
    "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs rounded-md px-2 h-9 focus:outline-none focus:border-purple-500";

  return (
    <details className="mt-4 group">
      <summary className="cursor-pointer select-none flex items-center gap-2 text-sm text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)]">
        <KeyRound size={14} className="text-purple-300" />
        {t("OAuth-Zugangsdaten einrichten (Klick-Verbinden aktivieren)")}
        <ChevronDown size={14} className="text-[var(--mf-fg)]/40 transition-transform group-open:rotate-180" />
      </summary>

      <div className="mt-3 bg-[var(--mf-ovl)]/30 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-xl p-4 space-y-4">
        <p className="text-[11px] text-[var(--mf-fg)]/50 leading-relaxed">
          {t("Einmalig eine OAuth-App bei Google Cloud bzw. Microsoft Entra anlegen, dann Client-ID + Secret hier eintragen — danach läuft das Verbinden per Klick & Zustimmung. Trage bei der App-Registrierung diese Redirect-URIs ein:")}
        </p>

        <div className="space-y-2">
          <RedirectRow label="Google" uri={googleRedirect} copied={copied === "g"} onCopy={() => copy(googleRedirect, "g")} />
          <RedirectRow label="Microsoft" uri={msRedirect} copied={copied === "m"} onCopy={() => copy(msRedirect, "m")} />
        </div>

        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-red-300">Google</div>
            <input className={fieldCls} placeholder={t("Client-ID (…apps.googleusercontent.com)")} value={gId} onChange={(e) => setGId(e.target.value)} />
            <input className={fieldCls} type="password" autoComplete="off"
              placeholder={status?.googleSecretSet ? t("Secret gesetzt — leer = unverändert") : t("Client-Secret")}
              value={gSecret} onChange={(e) => setGSecret(e.target.value)} />
            {status?.googleFromEnv && <p className="text-[10px] text-amber-300/80">{t("Aktuell aus .env (env hat Vorrang, falls hier leer).")}</p>}
          </div>
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">Microsoft 365</div>
            <input className={fieldCls} placeholder={t("Application (Client) ID")} value={mId} onChange={(e) => setMId(e.target.value)} />
            <input className={fieldCls} type="password" autoComplete="off"
              placeholder={status?.msSecretSet ? t("Secret gesetzt — leer = unverändert") : t("Client-Secret (Value)")}
              value={mSecret} onChange={(e) => setMSecret(e.target.value)} />
            {status?.microsoftFromEnv && <p className="text-[10px] text-amber-300/80">{t("Aktuell aus .env (env hat Vorrang, falls hier leer).")}</p>}
          </div>

          {msg && (
            <div className="md:col-span-2">
              <div className={`flex items-center gap-2 text-xs rounded-md border px-3 py-2 ${msg.kind === "ok" ? "bg-green-600/10 border-green-500/40 text-green-200" : "bg-red-600/10 border-red-500/40 text-red-200"}`}>
                {msg.kind === "ok" ? <Check size={14} /> : <AlertTriangle size={14} />}
                <span>{t(msg.message)}</span>
              </div>
            </div>
          )}

          <div className="md:col-span-2 flex items-center gap-2">
            <button type="submit" disabled={busy}
              className="flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40">
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {t("Speichern")}
            </button>
            <button type="button" onClick={reset}
              className="px-3 h-9 rounded-lg text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5">
              {t("Zurücksetzen")}
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}

function RedirectRow({ label, uri, copied, onCopy }: { label: string; uri: string; copied: boolean; onCopy: () => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-md px-2 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-[var(--mf-fg)]/40 w-16 shrink-0">{label}</span>
      <code className="flex-1 text-[11px] font-mono text-[var(--mf-fg)]/70 truncate">{uri}</code>
      <button onClick={onCopy} className="text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] bg-[var(--mf-elev)]/5 hover:bg-[var(--mf-elev)]/10 rounded px-2 h-6 flex items-center gap-1 shrink-0">
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? t("kopiert") : t("Kopieren")}
      </button>
    </div>
  );
}


/* ---------- Home-Assistant-Listen (Sub-Integration unter HA) ---------- */

type HAListEntity = { entityId: string; name: string; itemCount: number };

function HAListsSection() {
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
    <section className="mb-10 bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
          <ListChecks size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg">{t("Home Assistant Listen")}</h2>
          <p className="text-sm text-[var(--mf-fg)]/50">
            {t("Listen aus deinem Home Assistant (Domain todo.*) als Quelle für Einkaufslisten- und Todos-Widgets. Im Widget-Inspector wählst du dann pro Widget die Quelle.")}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm rounded-lg p-3 border bg-red-500/10 border-red-500/30 text-red-300">
          {t(error)}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/15 text-[var(--mf-fg)] rounded-md px-3 h-8 disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {t("Listen aktualisieren")}
        </button>
        {lists && (
          <span className="text-[11px] text-[var(--mf-fg)]/40">
            {lists.length} {lists.length === 1 ? t("Liste") : t("Listen")} {t("gefunden")}
          </span>
        )}
      </div>

      {loading && !lists ? (
        <div className="text-sm text-[var(--mf-fg)]/40">{t("Lade…")}</div>
      ) : lists && lists.length === 0 ? (
        <p className="text-sm text-[var(--mf-fg)]/50 bg-[var(--mf-ovl)]/30 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg p-3">
          {t("Keine todo.* Entities in Home Assistant gefunden. Prüfe ob die HA-Verbindung oben aktiv ist und ob mindestens eine Todo-Liste/Einkaufsliste in HA existiert.")}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {lists?.map((l) => (
            <li
              key={l.entityId}
              className="flex items-center justify-between bg-[var(--mf-ovl)]/30 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm text-[var(--mf-fg)] truncate">{l.name}</div>
                <code className="text-[11px] font-mono text-[var(--mf-fg)]/40 truncate block">
                  {l.entityId}
                </code>
              </div>
              <div className="text-[11px] text-[var(--mf-fg)]/50 shrink-0 ml-3">
                {l.itemCount} {l.itemCount === 1 ? t("Eintrag") : t("Einträge")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Todoist ---------- */

type TodoistProject = { id: string; name: string; isInbox?: boolean };

function TodoistSection() {
  const t = useT();
  const [hasToken, setHasToken] = useState(false);
  const [connected, setConnected] = useState(false);
  const [projects, setProjects] = useState<TodoistProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

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
    <section className="mb-10 bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl shrink-0">
          📋
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            Todoist
            {hasToken && connected && (
              <span className="text-[10px] uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded">
                {t("verbunden")}
              </span>
            )}
            {hasToken && !connected && (
              <span className="text-[10px] uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded">
                {t("Fehler")}
              </span>
            )}
          </h2>
          <p className="text-sm text-[var(--mf-fg)]/50">
            {t("Deine Todoist-Projekte als Quelle für Todos- und Einkaufslisten-Widgets — der Token aus deinem Todoist-Konto reicht.")}
          </p>
        </div>
      </div>

      {msg && (
        <div className={`mb-3 text-sm rounded-lg p-3 border ${msg.kind === "ok" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {t(msg.msg)}
        </div>
      )}
      {error && (
        <div className="mb-3 text-sm rounded-lg p-3 border bg-red-500/10 border-red-500/30 text-red-300">
          {t(error)}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[var(--mf-fg)]/40">{t("Lade…")}</div>
      ) : hasToken && !editing ? (
        <div className="flex items-center gap-2 mb-3">
          <div className="text-sm text-[var(--mf-fg)]/70 flex-1">
            {connected ? (
              <span>
                <strong>{projects.length}</strong>{" "}
                {projects.length === 1 ? t("Projekt") : t("Projekte")} {t("aus deinem Todoist-Konto verfügbar.")}
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
            className="text-xs bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/15 text-[var(--mf-fg)] rounded-md px-3 h-8"
          >
            {t("Token ändern")}
          </button>
          <button
            onClick={async () => {
              if (!confirm(t("Token wirklich entfernen?"))) return;
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
        <div>
          <ol className="text-sm text-[var(--mf-fg)]/70 space-y-2 mb-4">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div className="flex-1">
                <a
                  href="https://app.todoist.com/app/settings/integrations/developer"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-rose-300 hover:text-rose-200 underline underline-offset-2"
                >
                  {t("Todoist Developer-Settings öffnen")} <ExternalLink size={12} />
                </a>
                <p className="text-[11px] text-[var(--mf-fg)]/40 mt-0.5">
                  {t("Loggt dich in Todoist ein (falls noch nicht passiert) und öffnet die Integrationen-Seite.")}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div className="flex-1">
                <span>{t("Unter „API-Token\" auf „Token kopieren\" klicken.")}</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div className="flex-1">
                <span>{t("Hier einfügen + Speichern.")}</span>
              </div>
            </li>
          </ol>
          <label className="block">
            <span className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-1.5">
              {t("Todoist API-Token")}
            </span>
            <div className="flex items-center gap-2">
              <input
                type={reveal ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="0123456789abcdef…"
                className="flex-1 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm font-mono rounded-lg px-3 h-10 focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                className="text-xs text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)] px-2.5 h-10 rounded-md bg-[var(--mf-elev)]/5 hover:bg-[var(--mf-elev)]/10 flex items-center gap-1"
              >
                {reveal ? <EyeOff size={12} /> : <Eye size={12} />}
                {reveal ? t("verbergen") : t("anzeigen")}
              </button>
            </div>
          </label>
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
                className="text-sm text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)] px-3 h-9"
              >
                {t("Abbrechen")}
              </button>
            )}
            <span className="text-[11px] text-[var(--mf-fg)]/30 ml-auto">
              {t("(OAuth-Anmeldung wäre mehr Setup-Aufwand für gleich viel Nutzen — Token ist 1-Klick.)")}
            </span>
          </div>
        </div>
      )}

      {connected && projects.length > 0 && !editing && (
        <ul className="space-y-1.5 mt-3">
          {projects.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between bg-[var(--mf-ovl)]/30 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg px-3 py-2 text-sm"
            >
              <span className="text-[var(--mf-fg)]/80 truncate">
                {p.isInbox && <span className="mr-1">📥</span>}
                {p.name}
              </span>
              <code className="text-[11px] font-mono text-[var(--mf-fg)]/40 shrink-0 ml-2">
                {p.id}
              </code>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OpenWeatherMapSection() {
  const t = useT();
  const [configured, setConfigured] = useState(false);
  const [fromEnv, setFromEnv] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/owm-credentials", { cache: "no-store" });
      const d = await r.json();
      setConfigured(!!d.configured);
      setFromEnv(!!d.fromEnv);
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
      const r = await fetch("/api/admin/owm-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("Speichern fehlgeschlagen."));
      flash("ok", key ? t("Key gespeichert.") : t("Key entfernt."));
      setKey("");
      setEditing(false);
      load();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-10 bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
          ☀️
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            OpenWeatherMap
            {configured && (
              <span className="text-[10px] uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded">
                {t("verbunden")}
              </span>
            )}
            {fromEnv && (
              <span className="text-[10px] uppercase tracking-wider bg-blue-500/10 border border-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded">
                {t("via ENV")}
              </span>
            )}
          </h2>
          <p className="text-sm text-[var(--mf-fg)]/50">
            {t("Alternativer Wetter-Provider. Optional — der Default (Open-Meteo) braucht keinen Key. Free-Tier: 1000 Calls/Tag.")}
          </p>
        </div>
      </div>

      {msg && (
        <div className={`mb-3 text-sm rounded-lg p-3 border ${msg.kind === "ok" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {t(msg.msg)}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[var(--mf-fg)]/40">{t("Lade…")}</div>
      ) : configured && !editing ? (
        <div className="flex items-center gap-2 mb-3">
          <div className="text-sm text-[var(--mf-fg)]/70 flex-1">
            {fromEnv
              ? t("Key aus Umgebungsvariable OPENWEATHERMAP_API_KEY (read-only). UI-Override jederzeit möglich.")
              : t("API-Key gespeichert, OWM-Provider ist nutzbar.")}
          </div>
          <button
            onClick={() => {
              setEditing(true);
              setKey("");
            }}
            className="text-xs bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/15 text-[var(--mf-fg)] rounded-md px-3 h-8"
          >
            {fromEnv ? t("Override setzen") : t("Key ändern")}
          </button>
          {!fromEnv && (
            <button
              onClick={async () => {
                if (!confirm(t("Key wirklich entfernen?"))) return;
                await fetch("/api/admin/owm-credentials", { method: "DELETE" });
                load();
              }}
              className="text-xs bg-red-500/15 hover:bg-red-500/25 text-red-300 rounded-md px-3 h-8"
            >
              {t("Entfernen")}
            </button>
          )}
        </div>
      ) : (
        <div>
          <ol className="text-sm text-[var(--mf-fg)]/70 space-y-2 mb-4">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div className="flex-1">
                <a
                  href="https://home.openweathermap.org/api_keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 underline underline-offset-2"
                >
                  {t("OpenWeatherMap API-Keys-Seite öffnen")} <ExternalLink size={12} />
                </a>
                <p className="text-[11px] text-[var(--mf-fg)]/40 mt-0.5">
                  {t("Account anlegen falls noch nicht passiert. Free-Tier reicht (1000 Calls/Tag).")}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div className="flex-1">
                {t("Default-API-Key kopieren (oder neuen erstellen) und hier unten einfügen.")}
              </div>
            </li>
          </ol>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={reveal ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={t("API-Key einfügen…")}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-md px-3 pr-9 h-9 focus:outline-none focus:border-amber-500/60 font-mono"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)]/70"
                tabIndex={-1}
              >
                {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              onClick={save}
              disabled={saving || !key.trim()}
              className="text-xs bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-md px-3 h-9"
            >
              {saving ? t("Speichere…") : t("Speichern")}
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(false);
                  setKey("");
                }}
                className="text-xs bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/15 text-[var(--mf-fg)] rounded-md px-3 h-9"
              >
                {t("Abbrechen")}
              </button>
            )}
          </div>
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-2">
            {t("Nach dem Speichern dauert es ~5-10 Minuten bis OpenWeatherMap deinen neuen Key freischaltet. Bis dahin kommen 401-Fehler.")}
          </p>
        </div>
      )}
    </section>
  );
}

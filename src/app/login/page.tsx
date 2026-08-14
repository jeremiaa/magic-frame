"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import MagicFrameLogo from "@/components/MagicFrameLogo";
import { LocaleProvider, useT } from "@/lib/i18n/LocaleProvider";

function AuthGate() {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "login" | "setup">("loading");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          router.replace("/editor");
          return;
        }
        setMode(data.needsSetup ? "setup" : "login");
      })
      .catch(() => setMode("login"));
  }, [router]);

  if (mode === "loading") {
    return <div className="text-white/50">{t("Wird geladen…")}</div>;
  }
  if (mode === "setup") {
    return <SetupForm onDone={() => router.replace("/editor")} />;
  }
  return <LoginForm />;
}

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Wenn das Backend nach Passwort-Erfolg mit { requireTotp: true } antwortet,
  // wechseln wir in den 2FA-Step und blenden die Code-Eingabe ein.
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpRecoveryAvailable, setTotpRecoveryAvailable] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpUseRecovery, setTotpUseRecovery] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.requireTotp) {
        setTotpRequired(true);
        setTotpRecoveryAvailable(!!data.recoveryAvailable);
        setError(null);
        return;
      }
      if (!res.ok) {
        setError(data.error || t("Login fehlgeschlagen."));
        return;
      }
      const params = new URLSearchParams(window.location.search);
      router.replace(params.get("next") || "/editor");
      router.refresh();
    } catch {
      setError(t("Netzwerkfehler. Bitte erneut versuchen."));
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: totpCode,
          useRecovery: totpUseRecovery,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("TOTP-Verifikation fehlgeschlagen."));
        // Wenn Challenge abgelaufen → zurück zum Passwort-Step
        if (res.status === 408 || res.status === 400) {
          setTotpRequired(false);
          setTotpCode("");
          setPassword("");
        }
        return;
      }
      const params = new URLSearchParams(window.location.search);
      router.replace(params.get("next") || "/editor");
      router.refresh();
    } catch {
      setError(t("Netzwerkfehler. Bitte erneut versuchen."));
    } finally {
      setLoading(false);
    }
  }

  if (totpRequired) {
    return (
      <form
        onSubmit={handleTotpSubmit}
        className="w-full max-w-sm bg-zinc-900/80 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex items-center justify-center mb-6">
          <MagicFrameLogo className="h-10 w-auto" />
        </div>
        <h1 className="text-xl font-semibold text-center mb-1">
          {t("Zwei-Faktor-Code")}
        </h1>
        <p className="text-sm text-white/50 text-center mb-6">
          {totpUseRecovery
            ? t("Recovery-Code eingeben")
            : t("6-stelliger Code aus deiner Authenticator-App")}
        </p>

        <label className="block mb-4">
          <span className="text-sm font-medium text-white/70 block mb-2">
            {totpUseRecovery ? t("Recovery-Code") : t("Code")}
          </span>
          <input
            type="text"
            inputMode={totpUseRecovery ? "text" : "numeric"}
            autoComplete="one-time-code"
            required
            autoFocus
            value={totpCode}
            onChange={(e) =>
              setTotpCode(
                totpUseRecovery
                  ? e.target.value.toUpperCase().slice(0, 16)
                  : e.target.value.replace(/\D/g, "").slice(0, 6),
              )
            }
            placeholder={totpUseRecovery ? "XXXXX-XXXXX" : "123456"}
            className="w-full bg-black border border-white/10 text-white rounded-lg p-3 outline-none focus:border-blue-500 transition-colors font-mono text-center text-lg tracking-widest"
          />
        </label>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {t(error)}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || totpCode.length < (totpUseRecovery ? 10 : 6)}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 px-6 py-3 rounded-full font-medium shadow-lg transition-colors"
        >
          {loading ? t("Wird geprüft…") : t("Bestätigen")}
        </button>

        <div className="flex items-center justify-between mt-4 text-xs">
          {totpRecoveryAvailable && (
            <button
              type="button"
              onClick={() => {
                setTotpUseRecovery((v) => !v);
                setTotpCode("");
                setError(null);
              }}
              className="text-white/50 hover:text-white"
            >
              {totpUseRecovery
                ? t("← Zurück zum Code")
                : t("Recovery-Code verwenden")}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setTotpRequired(false);
              setTotpCode("");
              setTotpUseRecovery(false);
              setError(null);
            }}
            className="text-white/50 hover:text-white ml-auto"
          >
            {t("Abbrechen")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-zinc-900/80 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl"
    >
      <div className="flex items-center justify-center mb-6">
        <MagicFrameLogo className="h-10 w-auto" />
      </div>
      <h1 className="text-xl font-semibold text-center mb-1">{t("Anmelden")}</h1>
      <p className="text-sm text-white/50 text-center mb-6">
        {t("Magic Frame Editor")}
      </p>

      <label className="block mb-4">
        <span className="text-sm font-medium text-white/70 block mb-2">
          {t("Email")}
        </span>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-black border border-white/10 text-white rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
        />
      </label>

      <label className="block mb-6">
        <span className="text-sm font-medium text-white/70 block mb-2">
          {t("Passwort")}
        </span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-black border border-white/10 text-white rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
        />
      </label>

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {t(error)}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 px-6 py-3 rounded-full font-medium shadow-lg transition-colors"
      >
        {loading ? t("Wird geprüft…") : t("Einloggen")}
      </button>
    </form>
  );
}

function SetupForm({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("Passwörter stimmen nicht überein."));
      return;
    }
    if (password.length < 8) {
      setError(t("Passwort muss mindestens 8 Zeichen lang sein."));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t("Anlegen fehlgeschlagen."));
        return;
      }
      onDone();
    } catch {
      setError(t("Netzwerkfehler. Bitte erneut versuchen."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-zinc-900/80 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl"
    >
      <div className="flex items-center justify-center mb-6">
        <MagicFrameLogo className="h-10 w-auto" />
      </div>
      <h1 className="text-xl font-semibold text-center mb-1">
        {t("Ersten Admin anlegen")}
      </h1>
      <p className="text-sm text-white/50 text-center mb-6">
        {t("Einmalige Einrichtung. Du wirst danach direkt eingeloggt.")}
      </p>

      <label className="block mb-4">
        <span className="text-sm font-medium text-white/70 block mb-2">
          {t("Email")}
        </span>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-black border border-white/10 text-white rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
        />
      </label>

      <label className="block mb-4">
        <span className="text-sm font-medium text-white/70 block mb-2">
          {t("Passwort (min. 8 Zeichen)")}
        </span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-black border border-white/10 text-white rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
        />
      </label>

      <label className="block mb-6">
        <span className="text-sm font-medium text-white/70 block mb-2">
          {t("Passwort bestätigen")}
        </span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full bg-black border border-white/10 text-white rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
        />
      </label>

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {t(error)}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:hover:bg-green-600 px-6 py-3 rounded-full font-medium shadow-lg transition-colors"
      >
        {loading ? t("Wird angelegt…") : t("Admin anlegen & einloggen")}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <LocaleProvider>
      <div className="mf-admin flex-1 flex items-center justify-center bg-black text-white p-6">
        <Suspense fallback={<div className="text-white/50">…</div>}>
          <AuthGate />
        </Suspense>
      </div>
    </LocaleProvider>
  );
}

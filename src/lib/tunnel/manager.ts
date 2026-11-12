import "server-only";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { isAddonMode } from "@/lib/runtime/addon";
import { readTunnelSettings, writeTunnelSettings } from "./store";

/**
 * Der eingebaute Fernzugriff: Magic Frame startet und beaufsichtigt
 * cloudflared selbst. Das Muster stammt aus salt.md — erreichbar machen ist
 * eine Funktion des Programms, keine Bastelaufgabe am Server.
 *
 * Zwei Arten:
 *   - "quick": ein Tunnel ohne Cloudflare-Konto mit einer Wegwerf-Adresse
 *     (…trycloudflare.com). Ein Klick, zum Ausprobieren. Kommt nach einem
 *     Neustart NICHT von selbst wieder — eine Installation soll nicht ohne
 *     Zutun wieder im Internet stehen, und die Adresse wäre ohnehin eine neue.
 *   - "token": ein fester Tunnel mit eigener Adresse. Das Token wird einmal
 *     eingefügt und gespeichert; der Tunnel wird beaufsichtigt, bei Abbruch
 *     neu gestartet und nach einem Neustart wieder aufgenommen.
 *
 * In beiden Fällen zeigt cloudflared auf den Tunnel-Eingang (server-tunnel.js)
 * und nicht auf den normalen Port — dort sitzt die Schranke, die Ansichten
 * ohne Anmeldung im Heimnetz hält.
 *
 * Der Zustand liegt auf globalThis: server-tunnel.js liest ihn für seine
 * zweite Linie, und Next baut dieses Modul in mehrere Routen ein, die alle
 * denselben Tunnel meinen müssen.
 */

export type TunnelMode = "quick" | "token";
export type TunnelProblem = { code: string; detail?: string };
export type TunnelUnavailable = "addon" | "no-gate" | "no-secret" | "no-binary";

export type TunnelStatus = {
  /** Lässt sich auf dieser Installation überhaupt ein Tunnel starten? */
  available: boolean;
  unavailable: TunnelUnavailable | null;
  mode: "" | TunnelMode;
  status: "off" | "starting" | "running" | "error";
  /** Schnell-Tunnel: die Wegwerf-Adresse. */
  url: string | null;
  /** Fester Tunnel: die Namen, die im Cloudflare-Dashboard eingetragen sind. */
  hostnames: string[];
  error: TunnelProblem | null;
  warning: TunnelProblem | null;
  hasStoredToken: boolean;
  autostart: boolean;
  /** Der Port des Tunnel-Eingangs — das, was im Cloudflare-Dashboard als Dienst stehen muss. */
  gatePort: number;
  cloudflaredVersion: string | null;
};

export class TunnelError extends Error {
  constructor(public readonly problem: TunnelProblem) {
    super(problem.detail ? `${problem.code}: ${problem.detail}` : problem.code);
    this.name = "TunnelError";
  }
}

type Gate = {
  port(): number;
  ensureListening(): Promise<number>;
  close(): void;
};

type State = {
  proc: ChildProcess | null;
  mode: "" | TunnelMode;
  status: "off" | "starting" | "running" | "error";
  url: string | null;
  hostnames: string[];
  error: TunnelProblem | null;
  warning: TunnelProblem | null;
  stopping: boolean;
  /** Zählt mit jedem Start und Stopp hoch — ein alter Prozess erkennt daran, dass er nicht mehr gemeint ist. */
  gen: number;
  metricsPort: number | null;
  connected: boolean;
  /** Fester Tunnel: die Einträge aus dem Cloudflare-Dashboard sind mindestens einmal geprüft. */
  ingressOk: boolean;
  validating: boolean;
  checkTimer: ReturnType<typeof setInterval> | null;
  retryTimer: ReturnType<typeof setTimeout> | null;
  startTimer: ReturnType<typeof setTimeout> | null;
  retries: number;
  /** undefined: noch nicht gefragt. */
  version: string | null | undefined;
};

const globalForTunnel = globalThis as unknown as { __mfTunnel?: State; __MF_TUNNEL_GATE?: Gate };
const state: State = (globalForTunnel.__mfTunnel ??= {
  proc: null,
  mode: "",
  status: "off",
  url: null,
  hostnames: [],
  error: null,
  warning: null,
  stopping: false,
  gen: 0,
  metricsPort: null,
  connected: false,
  ingressOk: false,
  validating: false,
  checkTimer: null,
  retryTimer: null,
  startTimer: null,
  retries: 0,
  version: undefined,
});

const TRY_CLOUDFLARE_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const METRICS_RE = /Starting metrics server on (?:127\.0\.0\.1|localhost|\[::1\]):(\d+)\/metrics/;
// Cloudflare lehnt das Token ab. Bewusst eng: Ein Treffer hält den Tunnel an,
// ein „Unauthorized" irgendwo sonst im Protokoll soll das nicht können.
// Echte Zeile (2026.10.7, gelöschter Tunnel): ERR Register tunnel error from
// server side error="Unauthorized: Tunnel not found" connIndex=0 …
const TOKEN_REJECTED_RE =
  /Register tunnel error from server side error="Unauthorized|Unauthorized: (?:Tunnel not found|Invalid tunnel secret)|Invalid tunnel secret|invalid token|failed to parse token|Tunnel token is not valid/i;
const DEFAULT_GATE_PORT = 3001;
/** So lange darf ein Tunnel brauchen, bis er verbunden ist. */
const START_GRACE_MS = 60_000;

/**
 * Der Übertragungsweg zu Cloudflare. Vorgabe ist http2 (TCP) und nicht
 * cloudflareds eigene Vorgabe quic (UDP): beim ersten echten Test hing der
 * Tunnel minutenlang im Start, weil das Netz ausgehendes UDP auf Port 7844
 * nicht durchliess — cloudflared erkannte das sogar selbst („suggested
 * protocol http2") und versuchte es trotzdem mit wachsenden Pausen weiter.
 * Das ist in vielen Heimnetzen und unter Docker Desktop so. Über http2 stand
 * die Verbindung in derselben Sekunde. Für einen Editor und einen
 * MCP-Endpunkt bringt quic nichts, was den Unterschied wert wäre.
 */
function tunnelProtocol(): string {
  const p = (process.env.MF_TUNNEL_PROTOCOL || "").trim().toLowerCase();
  return ["http2", "quic", "auto"].includes(p) ? p : "http2";
}

function gate(): Gate | undefined {
  return globalForTunnel.__MF_TUNNEL_GATE;
}

function gatePort(): number {
  return gate()?.port() ?? DEFAULT_GATE_PORT;
}

// ── cloudflared finden ───────────────────────────────────────────────────────
//
// Bewusst KEIN Herunterladen zur Laufzeit. Das Docker-Abbild bringt cloudflared
// mit (siehe Dockerfile, mit Prüfsumme); wer Magic Frame anders betreibt,
// installiert es über sein System. Ein Programm, das sich auf Knopfdruck etwas
// aus dem Internet holt und als root startet, wollen wir nicht sein.

function isExecutable(file: string): boolean {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function resolveBinary(): string | null {
  // Für Tests und für Installationen, bei denen es woanders liegt.
  const explicit = (process.env.MF_CLOUDFLARED_BIN || "").trim();
  if (explicit) return isExecutable(explicit) ? explicit : null;
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, "cloudflared");
    if (isExecutable(candidate)) return candidate;
  }
  return null;
}

function unavailableReason(): TunnelUnavailable | null {
  // Im Add-on übernimmt Home Assistant den Weg nach aussen, und der
  // Seitenleisten-Eingang meldet HA-Admins ohne Passwort an. Beides zusammen
  // mit einem Tunnel ist nicht durchdacht und nicht getestet — also zu.
  if (isAddonMode()) return "addon";
  if ((process.env.SESSION_SECRET || "").length < 32) return "no-secret";
  // Ohne server.js (`next dev`) gibt es keinen Tunnel-Eingang.
  if (!gate()) return "no-gate";
  if (!resolveBinary()) return "no-binary";
  return null;
}

async function cloudflaredVersion(): Promise<string | null> {
  if (state.version !== undefined) return state.version;
  const bin = resolveBinary();
  if (!bin) return null;
  state.version = await new Promise<string | null>((resolve) => {
    execFile(bin, ["--version"], { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(/version\s+(\S+)/.exec(String(stdout))?.[1] ?? null);
    });
  });
  return state.version;
}

// ── Token ────────────────────────────────────────────────────────────────────

/**
 * Nimmt, was Menschen wirklich einfügen: das nackte Token oder die ganze Zeile
 * aus dem Cloudflare-Dashboard („cloudflared service install eyJ…").
 */
export function extractToken(input: string): string | null {
  const m = /eyJ[A-Za-z0-9_\-+/=]{40,}/.exec(input || "");
  return m ? m[0] : null;
}

// ── Prüfung der Einstellungen im Cloudflare-Dashboard ────────────────────────
//
// Beim festen Tunnel bestimmt das Dashboard, wohin cloudflared die Anfragen
// schickt. Richtig ist nur der Tunnel-Eingang. cloudflared verrät seine
// geladenen Regeln auf dem eigenen Statistik-Port (/config) — dort lesen wir
// nach und halten den Tunnel an, wenn eine Regel woandershin zeigt. Die zweite
// Linie in server-tunnel.js fängt denselben Fehler am normalen Port ab; das
// hier sagt dem Menschen, WAS falsch eingetragen ist.
//
// Die Prüfung ist Pflicht: ein fester Tunnel gilt erst als „läuft", wenn sie
// einmal bestanden ist, und lässt sie sich gar nicht durchführen, wird er
// angehalten. Der Grund ist der Fall, den die zweite Linie NICHT sieht — ein
// Eintrag, der auf den Reverse-Proxy zeigt (http://caddy:80). Der reicht den
// Verkehr als ganz normale Anfrage an den normalen Port weiter, und die
// Ansichten wären offen. Lieber kein Tunnel als einer, von dem niemand weiss,
// wohin er führt.

type IngressRule = { hostname?: string; service?: string };

function serviceIsGate(service: string, port: number): boolean {
  // Die Auffang-Regel am Ende jeder Liste: „alles andere → 404".
  if (/^http_status:\d{3}$/.test(service)) return true;
  try {
    const u = new URL(service);
    const host = u.hostname.replace(/^\[|\]$/g, "");
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(host) && Number(u.port || 80) === port;
  } catch {
    return false;
  }
}

async function readIngress(metricsPort: number): Promise<IngressRule[] | null> {
  try {
    const res = await fetch(`http://127.0.0.1:${metricsPort}/config`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { config?: { ingress?: IngressRule[] } };
    return Array.isArray(body.config?.ingress) ? body.config.ingress : null;
  } catch {
    return null;
  }
}

async function checkIngress(gen: number): Promise<void> {
  const live = () => gen === state.gen && state.mode === "token" && state.connected && !state.stopping;
  if (!live() || state.validating) return;
  state.validating = true;
  try {
    // cloudflared braucht nach dem Verbinden einen Moment, bis /config antwortet.
    let rules: IngressRule[] | null = null;
    for (let attempt = 0; attempt < (state.ingressOk ? 1 : 8) && !rules; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 1200));
      if (!live()) return;
      rules = state.metricsPort ? await readIngress(state.metricsPort) : null;
    }
    if (!live()) return;
    if (!rules) {
      if (state.ingressOk) {
        // Schon einmal geprüft und für gut befunden: eine ausbleibende Antwort
        // ist dann ein Hinweis, kein Grund, einen laufenden Tunnel zu kappen.
        state.warning = { code: "ingress-unknown" };
        return;
      }
      console.warn("[tunnel] stopping: the rules from the Cloudflare dashboard could not be read");
      await stopTunnel({ problem: { code: "ingress-unknown" } });
      return;
    }
    const port = gatePort();
    const wrong = rules.find((r) => typeof r.service !== "string" || !serviceIsGate(r.service, port));
    if (wrong) {
      const problem: TunnelProblem = {
        code: "ingress-mismatch",
        detail: `${wrong.hostname || "*"} → ${typeof wrong.service === "string" ? wrong.service : "?"}`,
      };
      console.warn(`[tunnel] stopping: a rule in the Cloudflare dashboard points away from the gate (${problem.detail})`);
      await stopTunnel({ problem });
      return;
    }
    state.hostnames = rules.map((r) => r.hostname).filter((h): h is string => typeof h === "string" && h.length > 0);
    state.warning = state.hostnames.length ? null : { code: "no-hostname" };
    state.ingressOk = true;
    if (state.status === "starting") {
      state.status = "running";
      state.retries = 0;
      state.error = null;
      console.log("[tunnel] connected (token), dashboard rules checked");
      if (!state.checkTimer) state.checkTimer = setInterval(() => void checkIngress(gen), 30_000);
    }
  } finally {
    state.validating = false;
  }
}

// ── Starten und Anhalten ─────────────────────────────────────────────────────

function clearTimers() {
  if (state.checkTimer) clearInterval(state.checkTimer);
  if (state.retryTimer) clearTimeout(state.retryTimer);
  if (state.startTimer) clearTimeout(state.startTimer);
  state.checkTimer = null;
  state.retryTimer = null;
  state.startTimer = null;
}

export async function getTunnelStatus(): Promise<TunnelStatus> {
  const stored = await readTunnelSettings();
  const unavailable = unavailableReason();
  return {
    available: !unavailable,
    unavailable,
    mode: state.mode,
    status: state.status,
    url: state.url,
    hostnames: state.hostnames,
    error: state.error,
    warning: state.warning,
    hasStoredToken: Boolean(stored.token),
    autostart: stored.autostart,
    gatePort: gatePort(),
    cloudflaredVersion: await cloudflaredVersion(),
  };
}

export async function startTunnel(mode: TunnelMode, tokenInput?: string): Promise<void> {
  if (state.status === "starting" || state.status === "running") {
    throw new TunnelError({ code: "already-running" });
  }
  const unavailable = unavailableReason();
  if (unavailable) throw new TunnelError({ code: unavailable });
  const bin = resolveBinary()!;

  let token = "";
  if (mode === "token") {
    const given = (tokenInput ?? "").trim();
    if (given) {
      const extracted = extractToken(given);
      if (!extracted) throw new TunnelError({ code: "bad-token" });
      token = extracted;
    } else {
      token = (await readTunnelSettings()).token ?? "";
    }
    if (!token) throw new TunnelError({ code: "no-token" });
    await writeTunnelSettings({ token, autostart: true });
  }

  clearTimers();
  state.gen += 1;
  const gen = state.gen;
  state.mode = mode;
  state.status = "starting";
  state.url = null;
  state.hostnames = [];
  state.error = null;
  state.warning = null;
  state.stopping = false;
  state.metricsPort = null;
  state.connected = false;
  state.ingressOk = false;
  state.validating = false;

  let port: number;
  try {
    port = await gate()!.ensureListening();
  } catch (err) {
    state.status = "error";
    state.error = { code: "gate-port", detail: String((err as NodeJS.ErrnoException)?.code || (err as Error)?.message || err) };
    throw new TunnelError(state.error);
  }
  if (gen !== state.gen) return; // inzwischen gestoppt

  // --metrics mit Port 0: cloudflared nimmt einen freien und schreibt ihn ins
  // Protokoll. Ausdrücklich 127.0.0.1 — in einem Container würde er sonst auf
  // allen Schnittstellen lauschen.
  const common = ["tunnel", "--no-autoupdate", "--protocol", tunnelProtocol(), "--metrics", "127.0.0.1:0"];
  const args =
    mode === "quick"
      ? [...common, "--url", `http://127.0.0.1:${port}`]
      : // --grace-period: sonst wartet cloudflared beim Anhalten bis zu 30 s.
        [...common, "--grace-period", "2s", "run"];

  // Nur was cloudflared braucht — nicht die Datenbank-Adresse und nicht das
  // SESSION_SECRET. Das Token reist als Umgebungsvariable statt als Argument,
  // damit es in keiner Prozessliste steht.
  const env: Record<string, string> = { PATH: process.env.PATH ?? "", HOME: process.env.HOME || "/tmp", NO_COLOR: "1" };
  for (const k of ["TZ", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "https_proxy", "http_proxy", "no_proxy", "SSL_CERT_FILE", "SSL_CERT_DIR"]) {
    if (process.env[k]) env[k] = process.env[k]!;
  }
  if (mode === "token") env.TUNNEL_TOKEN = token;

  let proc: ChildProcess;
  try {
    proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"], env: env as NodeJS.ProcessEnv });
  } catch (err) {
    state.status = "error";
    state.error = { code: "exited", detail: String((err as Error)?.message || err) };
    gate()?.close();
    throw new TunnelError(state.error);
  }
  const logTail: string[] = [];
  state.proc = proc;
  console.log(`[tunnel] starting cloudflared (${mode}, ${tunnelProtocol()})`);

  // Kommt keine Verbindung zustande, soll das niemand erst an einer Karte
  // merken, die ewig „startet". Ein Schnell-Tunnel wird dann angehalten; ein
  // fester bleibt dran (cloudflared versucht es selbst weiter) und sagt es.
  state.startTimer = setTimeout(() => {
    if (gen !== state.gen || state.status !== "starting") return;
    if (mode === "quick") {
      void stopTunnel({ problem: state.error ?? { code: "no-connection", detail: logTail.slice(-1)[0]?.slice(0, 300) } });
    } else {
      state.warning = { code: "slow" };
    }
  }, START_GRACE_MS);

  const onLine = (raw: string) => {
    const line = raw.trim();
    if (!line) return;
    logTail.push(line);
    if (logTail.length > 6) logTail.shift();
    if (gen !== state.gen) return;

    const metrics = METRICS_RE.exec(line);
    if (metrics) state.metricsPort = Number(metrics[1]);

    const url = TRY_CLOUDFLARE_RE.exec(line)?.[0];
    if (url && mode === "quick") state.url = url;

    if (line.includes("Registered tunnel connection")) state.connected = true;

    if (state.connected && state.warning?.code === "slow") state.warning = null;
    if (mode === "quick") {
      // Erst „läuft", wenn die Adresse bekannt UND die Verbindung da ist —
      // vorher antwortet sie noch nicht.
      if (state.url && state.connected && state.status === "starting") {
        state.status = "running";
        state.retries = 0;
        state.error = null;
        console.log("[tunnel] connected (quick)");
      }
    } else if (state.connected && (state.status === "starting" || line.includes("Updated to new configuration"))) {
      // Fest: „läuft" setzt erst die bestandene Prüfung der Dashboard-Einträge.
      setTimeout(() => void checkIngress(gen), state.ingressOk ? 500 : 300);
    }

    if (TOKEN_REJECTED_RE.test(line) && mode === "token" && state.error?.code !== "token-rejected") {
      // cloudflared gibt dann nicht auf: Mit dem Token eines gelöschten
      // Tunnels versucht 2026.10.7 es endlos weiter, im Abstand von bis zu
      // 32 s („Unauthorized: Tunnel not found"). Also hier beenden — der
      // Ausgang unten wiederholt ein abgelehntes Token nicht.
      state.error = { code: "token-rejected", detail: (/error="([^"]+)"/.exec(line)?.[1] ?? line).slice(0, 200) };
      proc.kill("SIGTERM");
      const killer = setTimeout(() => {
        if (state.proc === proc) proc.kill("SIGKILL");
      }, 6000);
      proc.once("exit", () => clearTimeout(killer));
    }
    if (mode === "quick" && /failed to request quick Tunnel|failed to unmarshal quick Tunnel|429 Too Many Requests/i.test(line)) {
      state.error = { code: "quick-unavailable" };
    }
    // cloudflareds eigene Vorprüfung: weder UDP noch TCP kommen bei Cloudflare an.
    if (/precheck complete hard_fail=true/.test(line)) {
      state.error = { code: "blocked" };
    }
  };
  let buffer = "";
  const consume = (chunk: Buffer) => {
    buffer += chunk.toString();
    let i = buffer.indexOf("\n");
    while (i >= 0) {
      onLine(buffer.slice(0, i));
      buffer = buffer.slice(i + 1);
      i = buffer.indexOf("\n");
    }
  };
  proc.stdout?.on("data", consume);
  proc.stderr?.on("data", consume);

  proc.on("error", (err) => {
    if (gen !== state.gen) return;
    state.error = { code: "exited", detail: err.message };
  });

  proc.on("exit", (code) => {
    if (state.proc === proc) state.proc = null;
    if (gen !== state.gen) return; // ein neuerer Start oder Stopp ist inzwischen zuständig
    clearTimers();
    state.url = null;
    state.hostnames = [];
    state.connected = false;
    state.metricsPort = null;

    if (state.stopping) {
      state.status = state.error ? "error" : "off";
      state.mode = "";
      state.stopping = false;
      gate()?.close();
      return;
    }

    state.status = "error";
    // Die echte Ausgabe von cloudflared zeigen — ein nackter Code verrät nicht,
    // ob es an DNS, einer Firewall oder dem Token lag.
    state.error ??= {
      code: "exited",
      detail: `code ${code ?? "?"}: ${logTail.slice(-2).join(" · ").slice(0, 400) || "no output"}`,
    };
    console.warn(`[tunnel] cloudflared exited (${mode}): ${state.error.code} ${state.error.detail ?? ""}`);

    // Ein fester Tunnel soll oben bleiben: mit wachsendem Abstand neu
    // versuchen — ausser Cloudflare hat das Token abgelehnt, das wird durch
    // Wiederholen nicht besser.
    if (mode === "token" && state.error.code !== "token-rejected") {
      const wait = Math.min(60_000, 5000 * 2 ** Math.min(state.retries, 4));
      state.retries += 1;
      state.retryTimer = setTimeout(() => {
        if (gen !== state.gen) return;
        readTunnelSettings()
          .then((stored) => {
            if (gen !== state.gen || !stored.autostart || !stored.token) {
              gate()?.close();
              return;
            }
            state.status = "off";
            return startTunnel("token");
          })
          .catch(() => {});
      }, wait);
      return;
    }
    gate()?.close();
  });
}

/**
 * Hält den Tunnel an. `problem` setzt den Grund, wenn nicht ein Mensch,
 * sondern eine Prüfung ihn angehalten hat — der bleibt dann als Fehler stehen.
 */
export async function stopTunnel(opts: { problem?: TunnelProblem } = {}): Promise<void> {
  clearTimers();
  state.stopping = true;
  state.error = opts.problem ?? null;
  state.warning = null;
  try {
    await writeTunnelSettings({ autostart: false });
  } catch {
    // Der Tunnel wird trotzdem angehalten — schlimmstenfalls kommt er nach
    // einem Neustart wieder und wird dann von derselben Prüfung gestoppt.
  }
  const proc = state.proc;
  if (!proc) {
    state.gen += 1;
    state.status = state.error ? "error" : "off";
    state.mode = "";
    state.url = null;
    state.hostnames = [];
    state.stopping = false;
    gate()?.close();
    return;
  }
  // SIGTERM lässt cloudflared sich bei Cloudflare abmelden; ein harter Abbruch
  // lässt dort minutenlang eine tote Verbindung stehen.
  proc.kill("SIGTERM");
  const killer = setTimeout(() => {
    if (state.proc === proc) proc.kill("SIGKILL");
  }, 6000);
  proc.once("exit", () => clearTimeout(killer));
}

export async function forgetTunnelToken(): Promise<void> {
  if (state.mode === "token" || state.status === "error") await stopTunnel();
  await writeTunnelSettings({ token: null, autostart: false });
}

/**
 * Einmal beim Serverstart (src/instrumentation.ts): einen festen Tunnel wieder
 * aufnehmen, der vor dem Neustart lief. Wartet kurz auf server.js — die
 * Instrumentierung läuft, bevor der Server seinen Tunnel-Eingang bereitstellt.
 */
export async function resumeTunnelIfConfigured(): Promise<void> {
  const stored = await readTunnelSettings();
  if (!stored.autostart || !stored.token) return;
  for (let i = 0; i < 60 && !gate(); i++) await new Promise((r) => setTimeout(r, 500));
  if (!gate() || state.status !== "off") return;
  try {
    await startTunnel("token");
  } catch (err) {
    console.warn(`[tunnel] could not resume: ${err instanceof Error ? err.message : err}`);
  }
}

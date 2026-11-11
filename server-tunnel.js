// Der Eingang für den Cloudflare-Tunnel — „die Schranke".
//
// Magic Frame kann sich mit einem Klick von aussen erreichbar machen: die App
// startet cloudflared selbst (src/lib/tunnel/manager.ts) und lässt ihn auf
// DIESEN Eingang zeigen, nicht auf den normalen Port. Was hier ankommt, gilt
// als „von aussen" — und von aussen gibt es ohne Anmeldung fast nichts.
//
// Warum das nötig ist: Ansichten sind mit Absicht ohne Anmeldung lesbar. Das
// Wandtablet in der Küche soll /view/kueche einfach öffnen können. Im Heimnetz
// ist das richtig. Hinter einem Tunnel hiesse es, dass der Familienkalender
// und die Fotos im Internet stehen — und Adressen wie /view/1 errät jeder.
//
// Die Regel, in einem Satz: Durch den Tunnel sieht nur etwas, wer angemeldet
// ist. Ohne Anmeldung gibt es die Anmeldeseite, ihre Bausteine, die
// Anmelde-Routen und den MCP-Endpunkt (der prüft sein Token selbst). Alles
// andere beantwortet die Schranke mit 404 oder schickt Browser zur Anmeldung —
// für jede Adresse gleich, damit niemand ablesen kann, welche Ansicht es gibt.
//
// Vier Dinge, die beim Entwurf aufgefallen sind und die hier sitzen müssen:
//
//   1. cloudflared läuft im selben Container und verbindet sich über
//      127.0.0.1. Ohne Korrektur sähe die App JEDEN Aufrufer aus dem Internet
//      als „127.0.0.1" — die Anmelde-Sperre zählte dann alle in einen Topf,
//      und Routen, die Aufrufen von innen vertrauen, stünden offen. Die
//      Schranke setzt X-Real-IP deshalb selbst, aus Cloudflares
//      CF-Connecting-IP. Dem darf sie trauen, weil an diesen Eingang nur
//      cloudflared herankommt: er lauscht ausschliesslich auf 127.0.0.1.
//
//   2. Cloudflare speichert Antworten zwischen, wenn sie danach aussehen
//      (Bild-Endungen, grosszügige Cache-Kopfzeilen). Ein Bild, das ein
//      Angemeldeter geladen hat, käme dann aus Cloudflares Speicher auch zu
//      jemandem ohne Anmeldung — an der Schranke vorbei. Alles, was nicht zu
//      den festen Bausteinen der Anmeldeseite gehört, bekommt deshalb
//      „Cache-Control: private, no-store" aufgezwungen.
//
//   3. Beim festen Tunnel bestimmt das Cloudflare-Dashboard, wohin
//      cloudflared die Anfragen schickt. Trägt jemand dort den normalen Port
//      ein, ginge der Verkehr an der Schranke vorbei. Dafür gibt es die
//      zweite Linie (`shouldGate`): solange unser Tunnel läuft, wird am
//      normalen Port jede Anfrage, die von dieser Maschine selbst kommt UND
//      Cloudflares Kopfzeilen trägt, genauso behandelt wie hier.
//
//   4. Das Kennzeichen „kam durch den Tunnel" (X-MF-Tunnel) ist aus dem
//      SESSION_SECRET abgeleitet. server.js entfernt es von jeder Anfrage am
//      normalen Port, setzen kann es nur dieser Code. Die App liest es, um das
//      Sitzungs-Cookie als „Secure" zu setzen und die Adresse des Aufrufers
//      richtig zu lesen (src/lib/tunnel/via.ts).
//
// Der Eingang existiert nur, solange ein Tunnel läuft. Wer nie einen startet,
// hat keinen zweiten Lauscher und keine Zeile hiervon im Weg.

const { createServer } = require('http');
const { parse } = require('url');
const crypto = require('crypto');
const net = require('net');
const os = require('os');

const DEFAULT_PORT = 3001;
const COOKIE_NAME = 'magic_session';
const TAG_HEADER = 'x-mf-tunnel';

function gatePort() {
  const n = Number(process.env.MF_TUNNEL_PORT || DEFAULT_PORT);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : DEFAULT_PORT;
}

/**
 * Das Kennzeichen für „kam durch den Tunnel". Dieselbe Rechnung steht in
 * src/lib/tunnel/via.ts — scripts/check-tunnel.mjs prüft, dass beide Seiten
 * dasselbe ergeben. Ohne brauchbares SESSION_SECRET gibt es keins, und damit
 * auch keinen Tunnel: ohne Geheimnis kann sich ohnehin niemand anmelden.
 */
function tunnelTag() {
  const secret = process.env.SESSION_SECRET || '';
  if (secret.length < 32) return null;
  return crypto.createHmac('sha256', secret).update('mf-tunnel-tag').digest('hex');
}

// ── Was ohne Anmeldung durch darf ────────────────────────────────────────────
//
// Eine Erlaubnisliste, keine Sperrliste: Was hier nicht steht, ist zu. Eine
// neue Route ist damit von selbst geschützt, statt von selbst offen.
const ANON_EXACT = new Map([
  ['/', ['GET', 'HEAD']], // leitet zur Anmeldung weiter
  ['/login', ['GET', 'HEAD']],
  ['/icon.svg', ['GET', 'HEAD']],
  ['/apple-icon', ['GET', 'HEAD']],
  ['/favicon.ico', ['GET', 'HEAD']],
  ['/api/manifest', ['GET', 'HEAD']],
  ['/api/locale-default', ['GET', 'HEAD']], // Sprache der Anmeldeseite
  ['/api/auth/me', ['GET', 'HEAD']],
  ['/api/auth/login', ['POST']],
  ['/api/auth/login/totp', ['POST']],
  ['/api/auth/logout', ['POST']],
  // Der MCP-Endpunkt prüft sein Bearer-Token selbst. GET und DELETE
  // beantwortet er mit 405 — die dürfen das ruhig auch von aussen.
  ['/api/mcp', ['POST', 'GET', 'DELETE']],
]);
// Die gebauten Bausteine der Oberfläche: Skripte, Stile, Schriften. Keine
// Nutzerdaten, bei jeder Installation derselben Version dieselben Dateien.
const ANON_PREFIX = [['/_next/static/', ['GET', 'HEAD']]];

// Hier wird geraten, wer die Tür nicht kennt — also wird hier gezählt.
const AUTH_PATHS = new Set(['/api/mcp', '/api/auth/login', '/api/auth/login/totp']);

function anonAllowed(method, path) {
  const exact = ANON_EXACT.get(path);
  if (exact) return exact.includes(method);
  for (const [prefix, methods] of ANON_PREFIX) {
    if (path.startsWith(prefix)) return methods.includes(method);
  }
  return false;
}

/** Feste Bausteine dürfen zwischengespeichert werden, alles andere nicht. */
function isStaticPath(path) {
  return path.startsWith('/_next/static/') || path === '/icon.svg' || path === '/apple-icon' || path === '/favicon.ico';
}

/**
 * Bringt die Adresse in EINE Form — die, die danach auch Next zu sehen
 * bekommt. Entscheidet die Schranke über eine Schreibweise und Next liest
 * eine andere, ist das die klassische Lücke („/login/../view/1").
 *
 * null heisst: so eine Adresse nehmen wir nicht an.
 */
function normalizeTarget(raw) {
  if (typeof raw !== 'string' || raw[0] !== '/') return null;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  let u;
  try {
    u = new URL(raw, 'http://gate.invalid');
  } catch {
    return null;
  }
  // "//fremd.example/x" würde den Host ersetzen — das ist keine Adresse von uns.
  if (u.host !== 'gate.invalid') return null;
  const path = u.pathname.replace(/\/{2,}/g, '/');
  return { path, search: u.search, url: path + u.search };
}

function isSocketPath(path) {
  return path === '/socket.io' || path.startsWith('/socket.io/');
}

/** Will hier ein Mensch eine Seite sehen (dann zur Anmeldung) oder ein Programm Daten (dann 404)? */
function wantsHtml(req, method, path) {
  if (method !== 'GET' && method !== 'HEAD') return false;
  if (path.startsWith('/api/') || path.startsWith('/_next/') || isSocketPath(path)) return false;
  if (req.headers['sec-fetch-dest'] === 'document') return true;
  return String(req.headers.accept || '').includes('text/html');
}

/** Nur Wege in den Editor wandern als „next" mit zur Anmeldung — nichts, was woandershin zeigen könnte. */
function loginLocation(path) {
  if (/^\/editor(?:\/[A-Za-z0-9_\-/]*)?$/.test(path)) return '/login?next=' + encodeURIComponent(path);
  return '/login';
}

/**
 * Die Anmeldeseite springt nach dem Anmelden zu ?next=…. Von aussen darf das
 * nur ein Weg in den Editor sein — sonst liesse sich mit der öffentlichen
 * Adresse ein Link bauen, der nach der Anmeldung auf eine fremde Seite führt.
 * Die Seite prüft das selbst auch; hier fällt es eine Stufe früher auf.
 */
const SAFE_NEXT = /^\/editor(?:\/[A-Za-z0-9_\-/()]*)?(?:\?[A-Za-z0-9_\-=&%.]*)?$/;
function loginNextIsSafe(search) {
  if (!search) return true;
  const all = new URLSearchParams(search).getAll('next');
  return all.every((n) => SAFE_NEXT.test(n));
}

// ── Sitzung ──────────────────────────────────────────────────────────────────

let unsealData = null;

/**
 * Trägt die Anfrage eine gültige Sitzung? Dieselbe Prüfung wie verifySession()
 * in der App: das versiegelte Cookie öffnen und nach userId fragen. Wer erst
 * das Passwort eingegeben hat und noch auf den 2FA-Code wartet, hat keine
 * userId — und gilt hier wie dort als nicht angemeldet.
 */
async function sessionUser(req) {
  const secret = process.env.SESSION_SECRET || '';
  if (secret.length < 32) return null;
  const m = new RegExp('(?:^|;\\s*)' + COOKIE_NAME + '=([^;]+)').exec(req.headers.cookie || '');
  if (!m) return null;
  try {
    if (!unsealData) unsealData = require('iron-session').unsealData;
    const data = await unsealData(decodeURIComponent(m[1]), { password: secret });
    return data && typeof data.userId === 'string' && data.userId ? data.userId : null;
  } catch {
    return null;
  }
}

// ── Bremse für falsche Anmeldungen ───────────────────────────────────────────
//
// Die Anmeldung hat ihre eigene Sperre, der MCP-Endpunkt hat keine. Von aussen
// erreichbar sind beide, also zählt die Schranke abgewiesene Versuche je
// Adresse und macht nach zu vielen für eine Weile zu.
const THROTTLE = { max: 20, windowMs: 10 * 60_000, blockMs: 15 * 60_000, maxEntries: 5000 };
const failures = new Map(); // adresse -> { count, first, blockedUntil }

function isThrottled(key, now = Date.now()) {
  const f = failures.get(key);
  return !!f && f.blockedUntil > now;
}

function noteFailure(key, now = Date.now()) {
  let f = failures.get(key);
  if (!f || now - f.first > THROTTLE.windowMs) {
    f = { count: 0, first: now, blockedUntil: 0 };
    if (failures.size >= THROTTLE.maxEntries) {
      for (const [k, v] of failures) {
        if (v.blockedUntil < now && now - v.first > THROTTLE.windowMs) failures.delete(k);
      }
      // Immer noch voll: lieber die ältesten vergessen als unbegrenzt wachsen.
      if (failures.size >= THROTTLE.maxEntries) failures.clear();
    }
  }
  f.count += 1;
  if (f.count >= THROTTLE.max) f.blockedUntil = now + THROTTLE.blockMs;
  failures.set(key, f);
}

// ── Adressen ─────────────────────────────────────────────────────────────────

function clientIp(req) {
  const v = String(req.headers['cf-connecting-ip'] || '').trim();
  return net.isIP(v) ? v : null;
}

function plainAddress(a) {
  const v = String(a || '');
  return v.startsWith('::ffff:') ? v.slice(7) : v;
}

let ownCache = { at: 0, set: new Set() };
function ownAddresses() {
  if (Date.now() - ownCache.at > 30_000) {
    const set = new Set();
    for (const list of Object.values(os.networkInterfaces())) {
      for (const i of list || []) set.add(i.address);
    }
    ownCache = { at: Date.now(), set };
  }
  return ownCache.set;
}

/** Kommt die Verbindung von dieser Maschine selbst? Dort läuft cloudflared. */
function isLocalOrigin(socket) {
  const remote = plainAddress(socket && socket.remoteAddress);
  if (!remote) return false;
  if (remote === '::1' || remote.startsWith('127.')) return true;
  if (remote === plainAddress(socket.localAddress)) return true;
  return ownAddresses().has(remote);
}

function hasCloudflareMarks(req) {
  const h = req.headers;
  return !!(h['cf-ray'] || h['cf-connecting-ip'] || /cloudflare/i.test(String(h['cdn-loop'] || '')));
}

/** Läuft gerade ein von uns gestarteter Tunnel? Der Zustand gehört dem Manager, geteilt über globalThis. */
function tunnelActive() {
  const s = globalThis.__mfTunnel;
  return !!s && (s.status === 'starting' || s.status === 'running');
}

// ── Antworten ────────────────────────────────────────────────────────────────

function deny(res, status) {
  if (res.headersSent) {
    try { res.end(); } catch { /* schon zu */ }
    return;
  }
  const text =
    status === 429 ? 'Too many attempts. Try again later.\n'
    : status === 503 ? 'Not available.\n'
    : status === 400 ? 'Bad request.\n'
    : 'Not found.\n';
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    // Woran ein Prüflauf erkennt, dass die Schranke geantwortet hat und nicht die App.
    'X-MF-Gate': 'closed',
  });
  res.end(text);
}

const CACHE_HEADERS = ['cache-control', 'cdn-cache-control', 'cloudflare-cdn-cache-control', 'surrogate-control', 'expires'];

function stripCacheHeaders(headers) {
  if (Array.isArray(headers)) {
    // Beide Formen, die Node annimmt: [[name, wert], …] und [name, wert, name, wert, …].
    if (headers.length && Array.isArray(headers[0])) {
      for (let i = headers.length - 1; i >= 0; i--) {
        if (CACHE_HEADERS.includes(String(headers[i][0]).toLowerCase())) headers.splice(i, 1);
      }
    } else {
      for (let i = headers.length - 2; i >= 0; i -= 2) {
        if (CACHE_HEADERS.includes(String(headers[i]).toLowerCase())) headers.splice(i, 2);
      }
    }
    return;
  }
  for (const k of Object.keys(headers)) {
    if (CACHE_HEADERS.includes(k.toLowerCase())) delete headers[k];
  }
}

/**
 * Zwingt der Antwort die Kopfzeilen auf, die von aussen gelten müssen — im
 * letzten Moment vor dem Senden, damit nichts, was die App setzt, sie
 * überstimmt. `cacheable` ist nur für die festen Bausteine wahr.
 */
function harden(res, cacheable) {
  const original = res.writeHead;
  res.writeHead = function hardened(statusCode, a, b) {
    const given = a && typeof a === 'object' ? a : b && typeof b === 'object' ? b : null;
    try {
      if (!cacheable) {
        if (given) stripCacheHeaders(given);
        for (const h of CACHE_HEADERS) this.removeHeader(h);
        this.setHeader('Cache-Control', 'private, no-store');
      }
      this.setHeader('X-Robots-Tag', 'noindex, nofollow');
    } catch {
      // Kopfzeilen schon unterwegs — dann ist hier nichts mehr zu retten.
    }
    return original.apply(this, arguments);
  };
}

/** Schreibt an die Anfrage, was die App danach wissen muss. */
function mark(req, tag, target) {
  req.url = target.url;
  req.headers[TAG_HEADER] = tag;
  const ip = clientIp(req);
  if (ip) req.headers['x-real-ip'] = ip;
  else delete req.headers['x-real-ip'];
}

/**
 * Baut die Schranke. `handle` ist Nexts Anfrage-Behandler; Socket.IO wird mit
 * setIo() nachgereicht, weil es erst nach dem Hauptserver entsteht.
 */
function createTunnelGate({ handle }) {
  let io = null;
  let server = null;
  let listening = null;

  async function handleRequest(req, res) {
    delete req.headers[TAG_HEADER];
    const tag = tunnelTag();
    if (!tag) return deny(res, 503);

    const target = normalizeTarget(req.url);
    if (!target) return deny(res, 400);

    const method = String(req.method || 'GET').toUpperCase();
    const ipKey = clientIp(req) || 'unknown';
    const authPath = AUTH_PATHS.has(target.path);
    if (authPath && isThrottled(ipKey)) return deny(res, 429);

    if (target.path === '/login' && !loginNextIsSafe(target.search)) {
      res.writeHead(302, { Location: '/login', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-MF-Gate': 'closed' });
      res.end();
      return;
    }

    const socketPath = isSocketPath(target.path);
    let allowed = false;
    if (!socketPath && anonAllowed(method, target.path)) allowed = true;
    else if (await sessionUser(req)) allowed = true;

    if (!allowed) {
      if (wantsHtml(req, method, target.path)) {
        res.writeHead(302, {
          Location: loginLocation(target.path),
          'Cache-Control': 'private, no-store',
          'X-Robots-Tag': 'noindex, nofollow',
          'X-MF-Gate': 'closed',
        });
        res.end();
        return;
      }
      return deny(res, 404);
    }

    mark(req, tag, target);
    harden(res, isStaticPath(target.path));
    if (authPath) {
      res.once('finish', () => {
        if (res.statusCode === 401 || res.statusCode === 403) noteFailure(ipKey);
      });
    }

    if (socketPath) {
      if (!io) return deny(res, 503);
      io.engine.handleRequest(req, res);
      return;
    }
    handle(req, res, parse(req.url, true));
  }

  async function handleUpgrade(req, socket, head) {
    delete req.headers[TAG_HEADER];
    const tag = tunnelTag();
    const target = normalizeTarget(req.url);
    const ok = !!tag && !!target && isSocketPath(target.path) && !!io && !!(await sessionUser(req));
    if (!ok) {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }
    mark(req, tag, target);
    io.engine.handleUpgrade(req, socket, head);
  }

  /** Öffnet den Eingang, falls er noch zu ist. Löst mit dem Port auf. */
  function ensureListening() {
    if (listening) return listening;
    listening = new Promise((resolve, reject) => {
      const s = createServer((req, res) => {
        handleRequest(req, res).catch((err) => {
          console.error('[tunnel-gate] request failed:', err && err.message ? err.message : err);
          deny(res, 503);
        });
      });
      s.on('upgrade', (req, socket, head) => {
        handleUpgrade(req, socket, head).catch(() => socket.destroy());
      });
      s.once('error', (err) => {
        listening = null;
        server = null;
        reject(err);
      });
      // NUR 127.0.0.1: an diesen Eingang darf niemand ausser cloudflared im
      // selben Container. Darauf beruht, dass CF-Connecting-IP hier stimmt.
      s.listen(gatePort(), '127.0.0.1', () => {
        server = s;
        console.log(`[tunnel-gate] listening on 127.0.0.1:${gatePort()}`);
        resolve(gatePort());
      });
    });
    return listening;
  }

  function close() {
    const s = server;
    server = null;
    listening = null;
    if (!s) return;
    s.close();
    if (typeof s.closeAllConnections === 'function') s.closeAllConnections();
    console.log('[tunnel-gate] closed');
  }

  /**
   * Die zweite Linie am NORMALEN Port: Anfragen, die von dieser Maschine
   * selbst kommen und Cloudflares Kopfzeilen tragen, während unser Tunnel
   * läuft. Das passiert, wenn beim festen Tunnel im Cloudflare-Dashboard der
   * normale Port statt dieses Eingangs eingetragen ist.
   *
   * Bewusst nur, solange UNSER Tunnel läuft: wer cloudflared selbst betreibt
   * (eigener Container, Kubernetes-Sidecar), hat sich für das entschieden,
   * was er freigibt — dessen Installation ändert sich durch dieses Update nicht.
   */
  function shouldGate(req) {
    return tunnelActive() && isLocalOrigin(req.socket) && hasCloudflareMarks(req);
  }

  /** Für Socket.IO am normalen Port (Option allowRequest): dieselbe zweite Linie. */
  function allowSocket(req, callback) {
    if (!shouldGate(req)) return callback(null, true);
    sessionUser(req).then(
      (user) => callback(null, !!user),
      () => callback(null, false),
    );
  }

  return {
    port: gatePort,
    ensureListening,
    close,
    isListening: () => !!server,
    shouldGate,
    handleRequest: (req, res) =>
      handleRequest(req, res).catch((err) => {
        console.error('[tunnel-gate] request failed:', err && err.message ? err.message : err);
        deny(res, 503);
      }),
    allowSocket,
    setIo: (instance) => {
      io = instance;
    },
  };
}

module.exports = {
  createTunnelGate,
  TAG_HEADER,
  // Für scripts/check-tunnel.mjs — die Entscheidungen sind reine Funktionen
  // und sollen prüfbar sein, ohne einen Server zu starten.
  _test: {
    tunnelTag,
    normalizeTarget,
    anonAllowed,
    isStaticPath,
    isSocketPath,
    wantsHtml,
    loginLocation,
    loginNextIsSafe,
    sessionUser,
    isThrottled,
    noteFailure,
    failures,
    THROTTLE,
    clientIp,
    isLocalOrigin,
    hasCloudflareMarks,
    stripCacheHeaders,
    harden,
    gatePort,
  },
};

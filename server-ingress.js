// Der Seitenleisten-Eingang, wenn Magic Frame als Home-Assistant-Add-on läuft.
//
// Home Assistant zeigt Ingress-Add-ons in der Seitenleiste und proxyt Klicks
// darauf an einen eigenen Port des Containers. Magic Frame kann dort nicht die
// ganze App ausliefern: Next.js betoniert seinen Basis-Pfad beim BAUEN ein,
// der Ingress-Pfad steht aber erst nach der Installation fest und ist pro
// Installation anders. zigbee2mqtt kann das, weil sein Frontend von Grund auf
// base-path-fähig gebaut ist — unseres ist es nicht, und ein Neubau bei jedem
// Containerstart dauert auf einem Pi zweistellige Minuten.
//
// Deshalb der Launcher-Ansatz (wie ihn z. B. das Tailscale-Add-on fährt):
// Hinter dem Seitenleisten-Eintrag liegt eine kleine Startseite. Ein Klick
// holt ein Einmal-Token und öffnet den Editor auf dem direkten Port als volle
// Seite — bereits angemeldet. Displays auf /view/<id> bleiben unberührt.
//
// Warum dieser Weg vertrauenswürdig ist:
//   1. Dieser Listener hängt NUR am Ingress-Port. Der steht nicht unter
//      `ports:` in der config.yaml, wird also nie auf dem Host veröffentlicht —
//      aus dem LAN führt kein Weg hierher.
//   2. Zusätzlich wird die Absenderadresse geprüft: Ingress-Anfragen kommen
//      laut HA-Entwicklerdoku ausschliesslich vom Gateway 172.30.32.2.
//   3. `panel_admin: true` VERSTECKT den Eintrag nur vor Nicht-Admins, es
//      sperrt ihn nicht — jedes angemeldete HA-Konto erreicht die Seite, wenn
//      es den Pfad kennt. Deshalb entscheidet nicht das Panel, sondern der
//      Nutzer: Der Supervisor schickt X-Remote-User-Id mit, und wir fragen
//      Home Assistant selbst, ob dieses Konto dort Admin ist. Ohne Header
//      oder ohne Admin-Rechte gibt es kein Token, nur den Link zur normalen
//      Anmeldung.
//
// Das Token: 32 zufällige Bytes, 60 Sekunden gültig, genau einmal einlösbar.
// Eingelöst wird es von src/app/handoff/route.ts im selben Prozess — die
// Übergabe läuft über globalThis, dasselbe Muster wie LIVE_SYNC_IO.

const { createServer } = require('http');
const crypto = require('crypto');

const INGRESS_GATEWAY = process.env.MAGIC_FRAME_INGRESS_ALLOW_FROM || '172.30.32.2';
const TOKEN_TTL_MS = 60_000;
const ADMIN_CACHE_MS = 5 * 60_000;

// Token-Ablage, geteilt mit der Redeem-Route im Next-Prozess.
const handoffTokens = new Map();
globalThis.__MF_HANDOFF_TOKENS = handoffTokens;

// HA-Admin-Abfragen sind einen WebSocket-Roundtrip teuer — kurz gecacht.
let adminCache = { at: 0, ids: null };

function clientIp(req) {
  let ip = req.socket?.remoteAddress || '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip;
}

/**
 * Fragt Home Assistant über den Supervisor-Proxy, welche Konten Admins sind.
 *
 * Es gibt dafür keine REST-Route — die Nutzerliste liefert nur der
 * WebSocket-Befehl config/auth/list. Der SUPERVISOR_TOKEN authentifiziert uns
 * am Proxy. Schlägt irgendetwas davon fehl, geben wir NULL zurück und der
 * Aufrufer verweigert das Auto-Login: lieber ein Klick mehr für den Besitzer
 * als eine offene Tür, wenn sich die HA-Schnittstelle bewegt hat.
 */
function fetchHaAdminIds() {
  return new Promise((resolve) => {
    let WebSocket;
    try {
      WebSocket = require('ws');
    } catch {
      return resolve(null);
    }
    const token = process.env.SUPERVISOR_TOKEN;
    if (!token) return resolve(null);

    // Im Add-on immer der Supervisor-Proxy. Der Override existiert für die
    // Testumgebung, in der kein Supervisor lebt — gesetzt wird er nur dort.
    const wsUrl = process.env.MAGIC_FRAME_SUPERVISOR_WS || 'ws://supervisor/core/websocket';
    const ws = new WebSocket(wsUrl);
    const done = (v) => {
      try { ws.close(); } catch { /* schon zu */ }
      resolve(v);
    };
    const timer = setTimeout(() => done(null), 5000);

    ws.on('error', () => { clearTimeout(timer); done(null); });
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.type === 'auth_required') {
        ws.send(JSON.stringify({ type: 'auth', access_token: token }));
      } else if (msg.type === 'auth_ok') {
        ws.send(JSON.stringify({ id: 1, type: 'config/auth/list' }));
      } else if (msg.type === 'result' && msg.id === 1) {
        clearTimeout(timer);
        if (!msg.success || !Array.isArray(msg.result)) return done(null);
        const ids = new Set(
          msg.result
            .filter((u) => Array.isArray(u.group_ids) && u.group_ids.includes('system-admin') && u.is_active !== false)
            .map((u) => u.id),
        );
        done(ids);
      } else if (msg.type === 'auth_invalid') {
        clearTimeout(timer);
        done(null);
      }
    });
  });
}

async function isHaAdmin(userId) {
  if (!adminCache.ids || Date.now() - adminCache.at > ADMIN_CACHE_MS) {
    const ids = await fetchHaAdminIds();
    if (ids) adminCache = { at: Date.now(), ids };
    else adminCache = { at: 0, ids: null };
  }
  return adminCache.ids ? adminCache.ids.has(userId) : false;
}

// Die Startseite. Bewusst eine einzige, abhängigkeitsfreie HTML-Datei:
// sie ist das Erste, was jemand nach der Installation sieht, und sie muss
// auch dann noch funktionieren, wenn die App selbst gerade neu startet.
//
// Drei Feinheiten aus der Sicherheits-Prüfung des Entwurfs:
//   - fetch gegen location.pathname aufgelöst, nicht relativ geraten — der
//     Ingress-Pfad endet üblicherweise mit "/", aber verlassen wollen wir
//     uns darauf nicht.
//   - Die Ingress-Sitzung von HA läuft nach ~15 Minuten ab. Ein liegen
//     gelassenes Panel bekommt dann 401 — das fangen wir ab und sagen
//     "Seite neu laden" statt still zu sterben.
//   - Der Fallback-Link zur normalen Anmeldung ist IMMER sichtbar. In den
//     WebViews der Companion-Apps ist der Link der verlässliche Weg.
function landingPage(publicPort, autoLoginEnabled) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Magic Frame</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#0b0d12; color:#e8eaf0; font:16px/1.5 system-ui, sans-serif; }
  .card { max-width:22rem; padding:2.5rem 2rem; text-align:center; }
  h1 { font-size:1.4rem; margin:0 0 .4rem; }
  p { color:#9aa1b0; font-size:.92rem; margin:.4rem 0 1.4rem; }
  button { width:100%; padding:.85rem 1rem; border:0; border-radius:.8rem; cursor:pointer;
           background:#7c5cff; color:#fff; font-size:1rem; font-weight:600; }
  button:disabled { opacity:.55; cursor:default; }
  a { color:#8b93a7; font-size:.85rem; display:inline-block; margin-top:1.1rem; }
  .err { color:#ff8f8f; font-size:.85rem; min-height:1.2em; margin-top:.8rem; }
</style>
</head>
<body>
<div class="card">
  <h1>Magic Frame</h1>
  <p>The editor opens as its own page on your network.</p>
  <button id="go"${autoLoginEnabled ? '' : ' disabled'}>Open Magic Frame</button>
  <div class="err" id="err">${autoLoginEnabled ? '' : 'Auto sign-in is disabled in the add-on options.'}</div>
  <a id="plain" href="#" target="_top">Open the sign-in page instead</a>
</div>
<script>
  var base = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
  var target = 'http://' + location.hostname + ':' + ${JSON.stringify(String(publicPort))};
  document.getElementById('plain').href = target + '/login';
  document.getElementById('go').addEventListener('click', function () {
    var btn = this, err = document.getElementById('err');
    btn.disabled = true; err.textContent = '';
    fetch(base + 'mint', { method: 'POST' }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(function (d) {
      window.open(target + '/handoff?token=' + d.token, '_top');
    }).catch(function (e) {
      btn.disabled = false;
      err.textContent = e.message === '401' || e.message === '403'
        ? 'Not permitted for this Home Assistant account. Use the sign-in link below.'
        : 'That did not work — reload this page and try again.';
    });
  });
</script>
</body>
</html>`;
}

/**
 * Startet den Ingress-Listener. Kein-Op ausserhalb des Add-ons: ohne
 * MAGIC_FRAME_INGRESS_PORT (setzt nur addon/run.sh) passiert hier nichts,
 * Compose- und Kubernetes-Installationen bleiben exakt wie sie sind.
 */
function startIngressListener() {
  const port = Number(process.env.MAGIC_FRAME_INGRESS_PORT || 0);
  if (!port) return null;

  const publicPort = process.env.MAGIC_FRAME_PUBLIC_PORT || '8098';
  const autoLogin = process.env.MAGIC_FRAME_HA_AUTO_LOGIN !== '0';

  const server = createServer(async (req, res) => {
    const ip = clientIp(req);
    if (ip !== INGRESS_GATEWAY) {
      // Nach Netz-Topologie unerreichbar — wenn doch, ist es ein Angriff
      // oder eine Fehlkonfiguration, und beides verdient ein Log.
      console.warn(`[ingress] refused request from ${ip} — not the ingress gateway`);
      res.writeHead(403).end();
      return;
    }

    const path = (req.url || '/').split('?')[0];

    if (req.method === 'POST' && path === '/mint') {
      if (!autoLogin) {
        res.writeHead(403).end();
        return;
      }
      const haUserId = req.headers['x-remote-user-id'];
      const haUserName = req.headers['x-remote-user-display-name'] || req.headers['x-remote-user-name'] || 'unknown';
      if (!haUserId || typeof haUserId !== 'string') {
        console.warn('[ingress] mint refused — no X-Remote-User-Id on the request');
        res.writeHead(401).end();
        return;
      }
      if (!(await isHaAdmin(haUserId))) {
        console.warn(`[ingress] mint refused — HA user "${haUserName}" is not an admin (or the admin list was unavailable)`);
        res.writeHead(403).end();
        return;
      }

      const token = crypto.randomBytes(32).toString('hex');
      handoffTokens.set(token, { haUserName: String(haUserName).slice(0, 80), exp: Date.now() + TOKEN_TTL_MS });
      // Abgelaufene Reste gleich mit wegräumen — die Map soll nie wachsen.
      for (const [t, v] of handoffTokens) if (v.exp < Date.now()) handoffTokens.delete(t);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token }));
      return;
    }

    // Alles andere: die Startseite. Auch /irgendwas — die Seite ist der
    // einzige Inhalt, den es hier gibt.
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(landingPage(publicPort, autoLogin));
  });

  server.listen(port, () => {
    console.log(`[ingress] sidebar listener on :${port} (auto sign-in ${autoLogin ? 'on' : 'off'})`);
  });
  return server;
}

module.exports = { startIngressListener };

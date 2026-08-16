require('dotenv').config();
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { startIngressListener } = require('./server-ingress');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Der Unterpfad, unter dem Next läuft. LEER bei jeder Installation ausser dem
// Home-Assistant-Add-on — und "leer" heisst hier wörtlich: die Zeilen weiter
// unten, die ihn brauchen, werden dann nicht einmal angelegt.
const BASE_PATH = (process.env.MF_BASE_PATH || '').replace(/\/$/, '');

/**
 * Setzt den Unterpfad vor eine Anfrage, die ihn nicht trägt.
 *
 * Der Grund: mit gesetztem basePath beantwortet Next NUR noch Adressen MIT
 * Unterpfad. Ein Wandtablet ruft aber http://host:8098/view/kueche — ohne.
 * Ohne diese Ergänzung bekäme es ab dem Umstieg aufs Add-on-Abbild eine
 * 404-Seite, und das wäre schlimmer als der Gewinn im HA-Rahmen. Gemessen:
 * mit gesetztem basePath antwortet /view/1 mit 404, <praefix>/view/1 mit 200.
 *
 * Die Adresszeile im Browser ändert sich dabei NICHT — hier wird nichts
 * umgeleitet, nur intern anders zugestellt.
 *
 * Existiert nur, wenn es einen Unterpfad gibt. Bei allen anderen ist diese
 * Funktion `null` und der Anfrage-Pfad unverändert der von vorher.
 */
const mount = BASE_PATH
  ? (req) => {
      const u = req.url || '/';
      if (u === BASE_PATH || u.startsWith(BASE_PATH + '/') || u.startsWith(BASE_PATH + '?')) return;
      // Socket.IO hängt an seinem eigenen Pfad und geht nicht durch Next —
      // den fasst der Unterpfad nicht an.
      if (u.startsWith('/socket.io')) return;
      // Ohne Schrägstrich am Ende: Next dreht sonst eine 308-Schleife auf "/".
      req.url = u === '/' ? BASE_PATH : BASE_PATH + u;
    }
  : null;

app.prepare().then(() => {
  // Seitenleisten-Eingang fürs HA-Add-on. Ausserhalb des Add-ons ein No-Op —
  // die Umgebungsvariable setzt nur addon/run.sh. Siehe server-ingress.js.
  const ingressServer = startIngressListener({ app, handle, basePath: BASE_PATH });

  const httpServer = createServer((req, res) => {
    // Real-Client-IP als x-real-ip an Next.js durchreichen.
    // Next.js 15 entfernt `request.ip`; ohne diesen Header sieht der Lockout-
    // Tracker sonst nur "0.0.0.0" und würde alle externen Clients zu einem
    // einzigen Scope zusammenwerfen. x-forwarded-for respektieren wir, falls
    // ein vertrauenswürdiger Reverse-Proxy davorsteht (Cloudflare-Tunnel,
    // nginx-proxy-manager, etc.) — die Lockout-Lib prüft das.
    if (!req.headers['x-real-ip']) {
      let ip = req.socket?.remoteAddress || '';
      if (ip.startsWith('::ffff:')) ip = ip.slice(7);
      if (ip) req.headers['x-real-ip'] = ip;
    }
    if (mount) mount(req);
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Der Socket ist bewusst NUR ein Empfangskanal. Displays verbinden sich
  // ohne Anmeldung (der View ist offen) und hören zu — mehr nicht.
  //
  // Früher standen hier Handler, die client-gesendete Events ungeprüft an
  // alle Displays weitergereicht haben. Wer den Server erreichte, konnte
  // damit jedes Display umschalten oder neu laden (#63). Gesendet wird
  // jetzt ausschließlich serverseitig aus den API-Routen heraus, über
  // global.LIVE_SYNC_IO — und die verlangen eine Anmeldung:
  //   POST /api/devices/navigate | clear-navigate | refresh
  io.on('connection', (socket) => {
    console.log('Display connected to live-sync:', socket.id);

    socket.on('disconnect', () => {
      console.log('Display disconnected:', socket.id);
    });
  });

  // Live-Sync muss auch IM Rahmen ankommen: der Ingress-Lauscher ist ein
  // zweiter HTTP-Server, und ohne dieses attach hört ein im Rahmen geöffneter
  // Editor die Layout-Updates nicht — er sähe Änderungen erst beim Neuladen.
  // Ausserhalb des Add-ons ist ingressServer null und hier passiert nichts.
  if (ingressServer) io.attach(ingressServer);

  // Expose the Socket.IO server so App-Router API-Routen es zum Pushen
  // von Live-Updates nutzen können.
  global.LIVE_SYNC_IO = io;

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);

      // Background-DDNS-Tick: alle 60s den eigenen /api/admin/ddns/tick aufrufen.
      // Die Route entscheidet selbst, ob laut intervalMin ein echter Update fällig ist.
      const ddnsTick = async () => {
        try {
          const res = await fetch(`http://127.0.0.1:${port}/api/admin/ddns/tick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!res.ok && res.status !== 403) {
            console.warn('[ddns-tick]', res.status, await res.text().catch(() => ''));
          }
        } catch (e) {
          // Beim ersten Boot kann die Route noch nicht ready sein — still ignorieren.
          if (e && e.code !== 'ECONNREFUSED') {
            console.warn('[ddns-tick] fetch failed:', e.message || e);
          }
        }
      };
      // Erster Tick nach 30s (App muss erst ready sein), dann alle 60s.
      setTimeout(() => {
        ddnsTick();
        setInterval(ddnsTick, 60_000);
      }, 30_000);
    });
});

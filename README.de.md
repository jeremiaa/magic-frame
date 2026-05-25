<div align="center">

<img src="public/social/og-banner.png" alt="Magic Frame — lokales Glassmorphism-Dashboard für Tablets, Monitore und Bilderrahmen" width="100%" />

[English](README.md) · **Deutsch**

Läuft komplett im Heimnetz — kein Cloud-Account, keine Domain nötig.

Drag-&-Drop-Editor · Echte Live-Updates · Smart-Home · Kalender · Wetter · Bilderrahmen-Modus

[![License: Polyform NC](https://img.shields.io/badge/license-Polyform_Noncommercial-blue.svg)](LICENSE.md)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()

</div>

---

## Wofür?

Magic Frame läuft überall wo ein Browser auf einem Display landet — und
macht aus dem Gerät genau das was du brauchst:

- **Familienboard** an der Küchenwand mit Einkaufsliste, Todos, Kalender und Wetter
- **Smart-Home-Zentrale** auf einem Tablet im Flur mit Home-Assistant-Entities, Szenen-Buttons und Live-Notifications
- **Digitaler Bilderrahmen** auf einem alten Monitor mit Wallpaper-Rotation aus Immich oder WebDAV, dezenter Uhr unten links
- **Status-Display** im Büro mit Stromverbrauch, Kalender-Heute, Timer und Quick-Posts
- **Werkstatt- oder Hobby-Monitor** mit Live-Daten aus HA, Buttons für Lichtszenen, Wetter
- **TV im Wohnzimmer** im Querformat als ambient Display zwischen den Streams
- **Digital Signage** im Vereinsheim, Schulflur, in der Bibliothek oder im Gemeindezentrum — rotierende Aushänge, Termine, Wetter und Quick-Posts auf jedem freien Bildschirm (nicht-kommerziell; siehe [Lizenz](LICENSE.md))

Pro Display ein eigener "View" mit eigenem Layout, eigener URL, eigener
Wallpaper-Quelle. Mehrere Displays parallel — alles syncet live via
WebSocket, kein Refresh nötig.

---

## Wo läuft das?

**Magic Frame ist eine lokale App.** Du installierst sie einmal auf einem
Rechner in deinem Heimnetz — der bleibt da stehen und ist „der Server".
Deine Tablets/Monitore zeigen die Dashboards an, indem sie im Browser
einfach die lokale IP des Rechners öffnen.

| Hardware | Geht? |
|---|---|
| Raspberry Pi 4 / 5 | ✅ (Docker installierbar) |
| Synology / QNAP NAS | ✅ (Docker-Paket im NAS-OS) |
| Alter Laptop / Desktop-PC | ✅ |
| Mac mini / Mac auf dem du eh arbeitest | ✅ |
| Mini-PC (Beelink, Intel NUC, …) | ✅ |
| VPS / Cloud-Server | ✅ (optional, nur wenn von außen erreichbar) |

**Kein Cloud-Account, keine Domain, kein DDNS-Eintrag nötig.** Die Tablets
greifen einfach auf `http://192.168.x.x` im Heimnetz zu. Die ganzen
„Hosting"-Features unten (Caddy mit Let's-Encrypt-HTTPS, DDNS-Updater,
2FA, Brute-Force-Schutz) sind **alle optional** und nur relevant, wenn
du das Dashboard auch von unterwegs erreichen willst.

> Faustregel: solange du nicht aktiv eine Domain einrichtest, bleibt
> alles lokal im LAN. Selbst Postgres lebt im Docker-Container und
> braucht keine externe DB.

---

## Quick Start

Zwei Befehle auf einer frischen Linux-Kiste. Schritt 1 weglassen, falls Docker schon installiert ist:

```bash
# 1. Docker installieren (mit Compose-Plugin) — offizieller One-Liner
curl -fsSL https://get.docker.com | sh

# 2. Magic Frame installieren
curl -fsSL https://raw.githubusercontent.com/jeremiaa/magic-frame/main/deploy/install.sh | bash
```

> macOS / Windows? Statt Schritt 1 [Docker Desktop](https://www.docker.com/products/docker-desktop/) installieren, dann Schritt 2 im Terminal.

Das zweite Script

1. klont das Repo
2. generiert `SESSION_SECRET` automatisch (mit `openssl` falls vorhanden, sonst `/dev/urandom`-Fallback)
3. baut + startet den Stack (App + Postgres + Caddy als Reverse-Proxy)
4. wartet bis die App antwortet

Danach `http://<deine-ip>` öffnen → **Setup-Flow** → Email + Passwort für
den ersten Admin eintragen → fertig. Optionale Integrationen
(Google/Microsoft Calendar OAuth, OpenWeatherMap-Key, Todoist-Token)
kommen alle via UI dazu.

Update / Re-Run (idempotent — Daten + Secrets bleiben):

```bash
cd magic-frame && ./deploy/install.sh
```

---

## Demo

### Editor — Widgets aufs Grid ziehen, im Inspector konfigurieren

<div align="center">
  <img src="public/demo/magic-frame-editor.gif" alt="Magic-Frame-Editor — Widgets auf einer View ins 24-Spalten-Grid ziehen" width="720" />
</div>

### Dashboard — alle Views und Live-System-Status auf einen Blick

<div align="center">
  <img src="public/demo/magic-frame-dashboard.gif" alt="Magic-Frame-Dashboard — Willkommen-Screen mit View-Thumbnails und System-Status-Strip" width="720" />
</div>

<sub><a href="public/demo/magic-frame-preview.mp4">Vollständigen ~1 Min Walkthrough ansehen</a> (View erstellen → Widgets ziehen → Inspector konfigurieren → speichern → Live-Sync auf Displays).</sub>

---

## In der Wildbahn

Ein paar echte Setups bei mir zuhause — Handyfotos, kein Photoshop. Gleiches Projekt auf komplett unterschiedlicher Hardware.

<table>
<tr>
<td width="50%"><img src="public/setups/setup-monitor.jpg" alt="Wandmontierter Portrait-Monitor mit Uhr, Kalender, Notifications und Wetter-Vorhersage" /></td>
<td width="50%"><img src="public/setups/setup-ha-entitaet.jpg" alt="Tablet mit Smart-Home-View mit Home-Assistant-Buttons und Entities" /></td>
</tr>
<tr>
<td valign="top"><sub><strong>Großer Portrait-Monitor an der Wand:</strong> Uhr, Kalender, drei Live-HA-Notifications (Waschmaschine, Katzen-Erinnerung, Trockner), 4-Tage-Wettervorhersage. Wallpaper rotieren aus einem Immich-Album.</sub></td>
<td valign="top"><sub><strong>Tablet in der Küche:</strong> vier HA-Szenen-Buttons (Lowboard, „Only good Vibes", Access Point, Red), ein Türsensor-Tile und der Wohnzimmer-Luftreiniger. Ein Tap = Service-Call direkt in Home Assistant.</sub></td>
</tr>
<tr>
<td width="50%"><img src="public/setups/setup-notify.jpg" alt="Notification-Tiles am Wand-Monitor in der Nacht — Close-up" /></td>
<td width="50%"><img src="public/setups/setup-tablet.jpg" alt="Kleines gerahmtes Tablet auf einem Beistelltisch als digitaler Bilderrahmen mit dezenten Widgets" /></td>
</tr>
<tr>
<td valign="top"><sub><strong>Notifications im Detail:</strong> regelbasierte Tiles die automatisch erscheinen wenn was passiert (Waschmaschine fertig) und sich wieder verstecken sobald's quittiert wurde. Das Wallpaper läuft drunter weiter.</sub></td>
<td valign="top"><sub><strong>Bilderrahmen-Modus:</strong> ein kleines Tablet in echter Bilderrahmen-Halterung, Wallpaper-Rotation aus Immich, nur eine dezente Uhr und drei Notification-Tiles bei Bedarf.</sub></td>
</tr>
</table>

---

## Screenshots

### Dashboard — Eingangspunkt mit Live-Status
<div align="center">
  <img src="public/screenshots/dashboard.png" alt="Dashboard" width="900" />
</div>
<sub>3 StatCards (Views · Live-Sync · Integrationen) + System-Status-Strip (HTTPS, DDNS, HA, Todoist, Module, Backups, Sicherheit) + Mini-Previews aller Views auf einen Blick.</sub>

### Views — alle Dashboards & Displays
<div align="center">
  <img src="public/screenshots/views.png" alt="Views-Übersicht" width="900" />
</div>
<sub>Jede View ist eine eigene URL für ein Display — Portrait fürs Tablet, Landscape fürs TV. Live-Previews zeigen die echte Widget-Anordnung pro View.</sub>

### So sieht's am Display aus

<table>
<tr>
<td width="33%"><img src="public/screenshots/live-buttons.png" alt="Live-View mit Buttons + Wetter" /></td>
<td width="33%"><img src="public/screenshots/live-minimal.png" alt="Live-View minimal" /></td>
<td width="33%"><img src="public/screenshots/live-action.png" alt="Live-View mit offenem Button-Picker" /></td>
</tr>
<tr>
<td valign="top"><sub><strong>Smart-Home-Display:</strong> Uhr, 4 Szenen/Geräte als Buttons (HA-Services), Wetter mit 4-Tage-Vorhersage.</sub></td>
<td valign="top"><sub><strong>Minimal / Bilderrahmen:</strong> nur Uhr + Wetter, der Wallpaper-Wechsel im Hintergrund ist das Hauptelement.</sub></td>
<td valign="top"><sub><strong>In Action:</strong> Tap auf einen Button öffnet das passende Pop-up — hier ein Farb-Picker für eine Lampe inkl. Power-Toggle.</sub></td>
</tr>
</table>

<sub>Wallpaper rotieren aus Immich-Alben oder einem WebDAV-Ordner. Alle Widget-Karten haben einen leichten Blur-Backdrop (Glassmorphism) und werden über die Foto-Hintergründe gelegt. Touch-optimiert auf iOS Safari ohne Sticky-Hover-Bugs.</sub>

### View-Editor — Drag &amp; Drop
<div align="center">
  <img src="public/screenshots/editor.png" alt="View-Editor" width="900" />
</div>
<sub>24-Spalten-Grid, Widget-Katalog links, klick zum Konfigurieren — Inspector öffnet sich rechts. Auto-Snapshot vor jedem Save, TV-Sync mit allen verbundenen Displays.</sub>

### Module — eigene Widgets bauen und hochladen
<div align="center">
  <img src="public/screenshots/modules.png" alt="Modules" width="900" />
</div>
<sub>10 Core-Widgets installiert. Eigene Custom-Module per JS-Bundle-Upload — Hot-Loading, kein Container-Restart nötig.</sub>

---

## Features

### Editor & Layouts
- **Drag-&-Drop-Layout-Builder** auf 24-Spalten-Grid, Resize per Handle
- **Mehrere Views** (Portrait, Landscape) — eine URL pro Display
- **Live-Sync** via WebSockets — Änderungen pushen sofort an alle verbundenen Displays
- **Auto-Snapshots** vor jedem Save (letzte 20), plus manueller Export/Import
- **i18n** Deutsch + Englisch komplett übersetzt

### Widgets (10 Core)

| Widget | Beschreibung |
|---|---|
| **Clock** | Zeit + Datum, optional Mini-Wetter, 12/24h |
| **Weather** | Open-Meteo, DWD, OpenWeatherMap oder HA-Wetter-Entity |
| **Calendar** | iCal-Feeds + Google + Microsoft 365 (OAuth) |
| **Home Assistant** | Beliebige HA-Entities + Rule-Engine (Farbe/Icon nach State) |
| **HA Notifications** | Regelbasierte Push-Kacheln, Auto-Hide wenn ruhig |
| **Buttons** | Tap-Tiles mit HA-Services / Webhooks |
| **Timer** | Live-Countdown, per REST-API / iOS-Shortcut startbar |
| **Messages** | Quick-Post (Text + Bild) per REST-API mit TTL |
| **Shopping** | 3 Quellen: lokal, HA (todo.\*) oder **Todoist** |
| **Todos** | 3 Quellen: lokal, HA (todo.\*) oder **Todoist** |

### Externe Integrationen
- **Home Assistant** mit Live-WebSocket-Entity-Updates
- **Google Calendar** und **Microsoft 365** via OAuth, mehrere Konten parallel
- **Todoist** mit 1-Klick-API-Token-Setup
- **Immich** + **WebDAV** als Wallpaper-Quellen
- **OpenWeatherMap** als Wetter-Provider (optional)

### Hosting & Sicherheit — *nur wenn du von außen erreichbar sein willst*
Alle diese Sachen kannst du in der UI an- und ausschalten. Für **rein
lokalen Betrieb im LAN** brauchst du davon nichts:

- **Caddy als Reverse-Proxy** mit automatischem HTTPS via Let's Encrypt
- **10 DNS-Provider** für ACME DNS-01 im Image gebackt
- **DDNS-Updater** mit 3 Provider-Modi (Cloudflare, Hetzner, DynDNS-v2-Generic)
- **2FA (TOTP)** mit Authenticator-Apps + Recovery-Codes
- **In-App Brute-Force-Schutz** (fail2ban-äquivalent)
- **scrypt-Password-Hashing**, iron-session

### Custom-Module — eigene Widgets bauen
- JS-Bundle hochladen, **Hot-Loading** ohne Container-Rebuild
- Build-Helper: `node scripts/build-module.mjs <source>` → `module.json` + `bundle.js`
- Manifest mit Field-Schema (text/number/boolean/color/url/textarea)
- Beispiel-Modul in `examples/modules/hello/`
- Beiträge zur Core-Widget-Familie sind sehr willkommen — siehe
  [`docs/module-development.md`](docs/module-development.md)

### Companion (iOS) — in Entwicklung

Native Swift-App die parallel zum Web-Editor entsteht. **Noch nicht
verfügbar — TestFlight-Beta kommt bald.** Geplante Funktionen:

- **Timer** vom Sperrbildschirm via App-Intent starten
- **Quick-Post** (Text + Bild) auf einzelne Displays mit TTL
- **Shopping & Todos** sync mit iOS-Erinnerungen (zwei-Wege)
- **Push-Benachrichtigungen** an einzelne Frames
- **View-Switch / Refresh** und Live-Status von unterwegs

Bis die App da ist (und auch danach): alles davon geht heute schon
über die REST-API mit Shortcut-Token — perfekt für iOS-Shortcuts,
Tasker-Profile oder curl-Skripte.

---

## Architektur

Ein einziger Docker-Stack mit drei Services, alles auf dem gleichen Host:

| Layer | Was |
|---|---|
| **Caddy** | Reverse-Proxy + automatisches HTTPS (Let's Encrypt). Custom-Build mit 10 DNS-Plugins für ACME DNS-01. Lauscht auf 80/443, leitet an die App weiter. Bei rein-lokalem Betrieb läuft Caddy als simpler HTTP-Proxy ohne TLS. |
| **Next.js-App** | `/editor` ist die Admin-UI für dich. `/view/<id>` ist das was die Tablets/Monitore anzeigen. `/api/...` ist die REST-Schnittstelle für Companion-App, Shortcuts, externe Tools. Socket.IO pusht Live-Updates an alle verbundenen Displays — ohne Refresh. |
| **Postgres 16** | Speichert Dashboards, Widget-Layouts, Snapshots, User, OAuth-Tokens (für Kalender), Custom-Module als JS-Bundles und alle App-Einstellungen. |

**Datenfluss bei einem Layout-Save:**
Browser ändert ein Widget → POST an Next.js-API → Snapshot in Postgres → Socket.IO-Event an alle Displays → jedes Tablet rerendert das geänderte Widget in unter 100 ms.

**Persistente Volumes:** Postgres-Daten · Editor-Settings · Wallpaper-Cache · Caddyfile · ACME-Let's-Encrypt-Certs. Alle bleiben über Container-Updates erhalten.

---

## Update / Maintenance

```bash
cd magic-frame
git pull
./deploy/install.sh        # idempotent, Daten + Secrets bleiben
```

Backup der Datenbank:
```bash
docker compose exec db pg_dump -U postgres magicdashboard | gzip > backup-$(date +%F).sql.gz
```

Logs:
```bash
docker compose logs -f app
docker compose logs -f caddy
```

---

## Troubleshooting

### Browser lädt `http://<server-ip>` nicht / HTTPS-Verbindung scheitert
Brave, Chrome und Edge upgraden `http://` automatisch auf `https://`. Bei einem frischen lokalen Install gibt's noch kein Zertifikat — der Upgrade scheitert bevor die Anfrage Magic Frame erreicht.

- **Schnellster Workaround:** den vollen Pfad eintippen — `http://<server-ip>/login` (oder `/editor`) statt nur `http://<server-ip>`. Der Auto-Upgrade greift oft nur bei nackten Host-URLs.
- **Brave:** `brave://settings/security` → *„Always use secure connections"* → auf *„Don't use"* stellen (oder per-Site-Ausnahme setzen)
- **Chrome/Edge:** `chrome://settings/security` → *„Always use secure connections"* → ausschalten
- **Firefox/Safari:** akzeptieren HTTP auf lokale IPs meist ohne Murren
- **Langfristig:** Domain einrichten → Caddy zieht automatisch ein echtes Let's-Encrypt-Cert (siehe *Settings → Hosting & Netzwerk* in der App)

### `Bind for 0.0.0.0:80 failed: port is already allocated` beim Install
Etwas anderes auf dem Host hört schon auf Port 80. Mit `ss -tlnp | grep :80` und `docker ps --filter "publish=80"` checken. Häufige Übeltäter:

- `nginx` / `apache2` vom Distri-Default: `systemctl stop nginx && systemctl disable nginx`
- Anderer Container belegt den Port: `docker stop <name>`
- Danach den Caddy-Container sauber neu erstellen: `docker compose down && docker compose up -d`

### Seite zeigt nach `git pull` + Rebuild noch altes Verhalten
Sowohl Next.js als auch der Browser cachen aggressiv. Hard-Refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`) oder URL im Inkognito-Fenster öffnen nach `docker compose up -d --build`.

---

## Doku

| | |
|---|---|
| [`LICENSE.md`](LICENSE.md) | Polyform Noncommercial 1.0.0 |
| [`.env.example`](.env.example) | Alle ENV-Variablen dokumentiert |
| [`docs/custom-modules.md`](docs/custom-modules.md) | Eigene Widget-Module bauen + hochladen |
| [`docs/module-development.md`](docs/module-development.md) | Core-Widget-Entwicklung |
| [`docs/companion-api.md`](docs/companion-api.md) | API-Endpoints für die iOS-Companion |

---

## Tech-Stack

Next.js 15 · React 19 · Postgres 16 + Prisma 7 · Caddy 2 (xcaddy custom-build) ·
Tailwind CSS 4 · Socket.IO · react-grid-layout · iron-session · otplib · esbuild

---

## Contributions

Issues mit klarer Reproduktion sind besonders willkommen — die helfen mir
direkt weiter. Pull-Requests schaue ich mir gerne an, kann aber je nach
Komplexität etwas dauern.

Für größere Änderungen: bitte vorher ein Issue aufmachen damit wir
abstimmen können was rein passt und was nicht.

---

## Lizenz

**[Polyform Noncommercial 1.0.0](LICENSE.md)** — Open-Source-ähnlich,
erlaubt freies Nutzen, Modifizieren, Weitergeben und Beitragen.
Kommerzielle Nutzung (Verkauf, SaaS-Angebot, in eigene Produkte einbauen)
ist nicht erlaubt ohne separate Lizenz.

Für kommerzielle Anfragen: **magicframeapp@gmail.com**

<sub>Vibe-coded mit Claude.</sub>

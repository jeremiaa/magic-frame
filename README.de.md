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

Echte Setups auf unterschiedlicher Hardware. Gleiches Projekt, andere Layouts, andere Räume.

### Großer Portrait-Monitor an der Wand

<table>
<tr>
<td width="50%"><img src="public/setups/setup-monitor.jpg" alt="Wandmontierter Portrait-Monitor mit Uhr, zwei anstehenden Kalender-Terminen, drei Live-Notifications und 4-Tage-Wettervorhersage vor Berg-Wallpaper" /></td>
<td width="50%"><img src="public/setups/setup-notify.jpg" alt="Notification-Tiles am Wand-Monitor in der Nacht — Close-up" /></td>
</tr>
<tr>
<td valign="top"><sub><strong>Info-Layout:</strong> Uhr, zwei anstehende Kalender-Termine, drei Live-HA-Notifications, aktuelle Temperatur und 4-Tage-Wettervorhersage über einem rotierenden Immich-Wallpaper. Ruhig und gut auf einen Blick lesbar — ideal für Flur, Büro oder Schlafzimmer-Wand.</sub></td>
<td valign="top"><sub><strong>Notifications im Detail:</strong> regelbasierte Tiles die automatisch erscheinen wenn was passiert (Waschmaschine fertig, „Milou füttern", Trockner fertig) und sich wieder verstecken sobald's quittiert wurde. Das Wallpaper läuft drunter weiter.</sub></td>
</tr>
</table>

### Bilderrahmen-Tablet auf dem Beistelltisch

<p align="center"><img src="public/setups/setup-tablet.jpg" alt="Kleines Bilderrahmen-Tablet auf dem Beistelltisch mit HA-Szenen-Buttons, Uhr und aktuellem Wetter" width="50%" /></p>

<p align="center"><sub><strong>Szenen-Button-Layout:</strong> ein kleines Tablet in echter Bilderrahmen-Halterung auf dem Beistelltisch. Schnellzugriff-HA-Buttons (Lichter, „Only good Vibes", Luftreiniger, …), dezente Uhr, aktuelles Wetter, rotierendes Wallpaper drunter.</sub></p>

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
<sub>Die Core-Widgets sind bei jeder Installation dabei. Eigene Custom-Module per JS-Bundle-Upload — Hot-Loading, kein Container-Restart nötig.</sub>

---

## Features

### Editor & Layouts
- **Drag-&-Drop-Layout-Builder** auf 24-Spalten-Grid, Resize per Handle
- **Mehrere Views** (Portrait, Landscape) — eine URL pro Display
- **Live-Sync** via WebSockets — Änderungen pushen sofort an alle verbundenen Displays
- **Auto-Snapshots** vor jedem Save (letzte 20), plus manueller Export/Import
- **i18n** Deutsch + Englisch komplett übersetzt

### Widgets (18 Core)

| Widget | Beschreibung |
|---|---|
| **Clock** | Zeit + Datum, optional Mini-Wetter, 12/24h |
| **Weather** | Open-Meteo, DWD, OpenWeatherMap oder HA-Wetter-Entity · Meteocons- + 3D-Icon-Sets |
| **Environment** | Luftqualität, Pollen, Feinstaub und UV — Open-Meteo oder eigene HA-Sensoren |
| **Calendar** | iCal-Feeds + Google + Microsoft 365 (OAuth) + CalDAV + HA-Kalender · Listen-, Agenda- und Monatsansicht |
| **Home Assistant** | Beliebige HA-Entities + Rule-Engine (Farbe/Icon nach State) |
| **HA Notifications** | Regelbasierte Push-Kacheln, Auto-Hide wenn ruhig |
| **Camera** | HA-Kamera-Entities — Snapshot-Refresh, Vollbild-Ansicht |
| **Sensor** | Multi-Sensor-Kacheln — Icon/Farbe pro Sensor, Verlaufs-Sparkline |
| **Image** | Foto-Kachel — Immich-Album oder WebDAV-Slideshow |
| **Buttons** | Tap-Tiles mit HA-Services / Webhooks |
| **Timer** | Live-Countdown, per REST-API / iOS-Shortcut startbar |
| **Messages** | Quick-Post (Text + Bild) per REST-API mit TTL |
| **Shopping** | 3 Quellen: lokal, HA (todo.\*) oder **Todoist** |
| **Todos** | 3 Quellen: lokal, HA (todo.\*) oder **Todoist** |
| **Media Player** | Läuft-gerade-Karte — Cover, Fortschritt, Steuerung, mehrere Player stapeln sich |
| **RSS Feed** | Schlagzeilen mit Vorschaubild und Teaser, QR-Code zum Weiterlesen |
| **QR Code** | WLAN, Links und Texte — runde Punkte, Farbverläufe, Icon in der Mitte |
| **Status** | Gerätekarte mit Bild und Live-Details — Auto lädt, Drucker druckt, Toniebox spielt |

### Externe Integrationen
- **Home Assistant** mit Live-WebSocket-Entity-Updates
- **Google Calendar** und **Microsoft 365** via OAuth, mehrere Konten parallel
- **CalDAV** (Nextcloud, Baïkal, Radicale, Synology, mailbox.org, iCloud …) mit Server + App-Passwort — die Kalender findet Magic Frame selbst
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

### Der normale Weg

```bash
cd magic-frame
./deploy/install.sh
```

Idempotent — zieht den aktuellen Code, baut die Container neu, lässt deine `.env`, das Datenbank-Volume und hochgeladene Custom-Module unangetastet. Ab v1.0.2 funktioniert das in einem Schritt, auch wenn die History upstream umgeschrieben wurde.

### Wenn's schiefgeht (frühe v1.0.x-Clones)

Wenn du in der Launch-Woche (vor v1.0.2) geclont hast, kann einer dieser Fehler auftauchen:

```
fatal: Need to specify how to reconcile divergent branches
```
```
! [rejected]    v1.0.0   -> v1.0.0   (would clobber existing tag)
```

Der Grund: die History upstream wurde damals mehrfach umgeschrieben (Co-Author-Scrub, CLAUDE.md-Scrub, v1.0.1-Retag). Einmalige Recovery:

```bash
cd magic-frame
git fetch --force --tags origin
git reset --hard origin/main
./deploy/install.sh
```

`.env`, Datenbank und hochgeladene Custom-Module bleiben unangetastet — nichts davon liegt in Git. Nach diesem einmaligen Reset läuft `./deploy/install.sh` wieder von alleine.

### Datenbank-Backup
```bash
docker compose exec db pg_dump -U postgres magicdashboard | gzip > backup-$(date +%F).sql.gz
```

### Logs
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

### Home Assistant nicht erreichbar, obwohl der Name im Container auflöst
Bei eigenem DNS (Technitium, Pi-hole, Unbound, …) gibt es einen verwirrenden Fall: `dig` und `curl` lösen den Namen im Container sauber auf, Magic Frame meldet trotzdem `ENOTFOUND`.

Schuld ist meist die `AAAA`-Antwort. Antwortet der Resolver auf die IPv6-Anfrage mit `NXDOMAIN` statt `NOERROR` mit leerer Antwort, verwirft musl libc — das im Alpine-Image hinter `getaddrinfo()` und damit hinter `fetch`/WebSockets steckt — den kompletten Dual-Stack-Lookup, obwohl der `A`-Record aufgelöst hat. `dig` und `curl` gehen nicht durch diesen Codepfad und funktionieren deshalb weiter.

Prüfen mit:

```bash
dig @<dein-dns> ha.example.lan AAAA   # NXDOMAIN ist hier das Problem — NOERROR wäre korrekt
dig @<dein-dns> ha.example.lan A      # löst sauber auf
```

- **Schnell:** Home Assistant per IP-Adresse statt per Hostname eintragen
- **Sauber:** den Resolver so konfigurieren, dass er für Namen mit nur `A`-Record `NOERROR` (NODATA) liefert

Gefunden hat das @proffalken in #64.

### Seite zeigt nach `git pull` + Rebuild noch altes Verhalten
Sowohl Next.js als auch der Browser cachen aggressiv. Hard-Refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`) oder URL im Inkognito-Fenster öffnen nach `docker compose up -d --build`.

---

## Doku

| | |
|---|---|
| [`ROADMAP.md`](ROADMAP.md) | Was als nächstes kommt + wie Releases ablaufen |
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

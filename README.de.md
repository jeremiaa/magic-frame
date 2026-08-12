<div align="center">

<img src="public/social/og-banner.png" alt="Magic Frame — lokales Glassmorphism-Dashboard für Tablets, Monitore und Bilderrahmen" width="100%" />

[English](README.md) · **Deutsch** · 🌐 **[magicframe.dev](https://magicframe.dev)** · 📖 **[Dokumentation](wiki/README.md)**

Läuft komplett im Heimnetz — kein Cloud-Account, keine Domain nötig.

Drag-&-Drop-Editor · Echte Live-Updates · Smart-Home · Kalender · Wetter · Bilderrahmen-Modus

[![License: Polyform NC](https://img.shields.io/badge/license-Polyform_Noncommercial-blue.svg)](LICENSE.md)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()
[![Sponsor](https://img.shields.io/badge/%E2%9D%A4-Sponsor-ea4aaa)](https://github.com/sponsors/jeremiaa)

</div>

---

<!-- s:what -->
## Was ist das?

Magic Frame macht aus jedem Bildschirm mit Browser — Tablet, Küchenmonitor, altem TV, Bilderrahmen — ein selbst gehostetes Display fürs Zuhause:

- **Familienboard** — Einkaufsliste, Todos, Kalender, Wetter
- **Smart-Home-Zentrale** — Live-Home-Assistant-Entities, Szenen-Buttons, Kamera-Pop-ups, Notification-Kacheln
- **Digitaler Bilderrahmen** — Wallpaper-Rotation aus Immich oder WebDAV, dezente Uhr darüber
- **Status-Display / Aushang** — Stromverbrauch, Timer, Quick-Posts, wechselnde Hinweise *(nicht-kommerziell — siehe [Lizenz](LICENSE.md))*

Pro Display eine **View** mit eigener URL, eigenem Layout und eigener Wallpaper-Quelle. Du änderst ein Widget am Laptop, und jedes Display zieht innerhalb einer Sekunde nach — ohne Refresh.

<!-- s:where -->
## Wo läuft das?

Einmal auf einem Rechner im Heimnetz installieren — der wird „der Server", deine Displays öffnen einfach dessen Adresse im Browser. **Kein Cloud-Account, keine Domain, kein DDNS nötig.** Postgres steckt im Docker-Stack mit drin.

| Hardware | |
|---|---|
| Raspberry Pi 4 / 5, Mini-PC (NUC, Beelink, …) | ✅ |
| Synology / QNAP NAS | ✅ Docker-Paket im NAS-OS |
| Alter Laptop / Desktop / Mac mini | ✅ |
| Home Assistant OS | ✅ als [Add-on](wiki/home-assistant-addon.md) |
| VPS / Cloud-Server | ✅ optional — nur wenn du von außen drauf willst |

<!-- s:quickstart -->
## Quick Start

Zwei Befehle auf einer frischen Linux-Kiste. Schritt 1 weglassen, falls Docker schon da ist:

```bash
# 0. Nur falls `curl --version` fehlt — ein minimales Debian, eine
#    Proxmox-Vorlage oder ein abgespecktes VM-Abbild bringt kein curl mit.
sudo apt update && sudo apt install -y curl git

# 1. Docker installieren (mit Compose-Plugin) — offizieller One-Liner
curl -fsSL https://get.docker.com | sh

# 2. Magic Frame installieren
curl -fsSL https://raw.githubusercontent.com/jeremiaa/magic-frame/main/deploy/install.sh | bash
```

Das Install-Script zieht die fertig gebauten Multi-Arch-Images und startet den Stack — auf einem Pi wird also nichts 20 Minuten lang kompiliert. Danach `http://<deine-ip>` öffnen, den ersten Admin anlegen, fertig. Alle Integrationen kommen später über die UI dazu.

> **Du nutzt Home Assistant?** Trag `https://github.com/jeremiaa/magic-frame` als Add-on-Repository ein und installier Magic Frame aus dem Add-on-Store. Das Add-on bringt seine eigene Datenbank mit und braucht keinen Zugriffstoken. Siehe [The Home Assistant add-on](wiki/home-assistant-addon.md).
>
> **macOS / Windows?** Statt Schritt 1 [Docker Desktop](https://www.docker.com/products/docker-desktop/) installieren, dann Schritt 2 im Terminal.
>
> **Kein `curl`?** Nachinstallieren (`sudo apt install curl` / `sudo dnf install curl`) — oder über git: `git clone https://github.com/jeremiaa/magic-frame.git && cd magic-frame && ./deploy/install.sh`

Derselbe Befehl aktualisiert eine bestehende Installation und lässt Daten, Login und hochgeladene Module unangetastet. Alle Installationswege im Detail: [Installation](wiki/installation.md). Updates, Backups und Zurückrollen: [Updating and backups](wiki/updating-and-backups.md).

<!-- s:demo -->
## Demo

Widgets aufs Grid ziehen, im Inspector konfigurieren, speichern — jedes Display zieht nach.

<div align="center">
  <img src="public/demo/magic-frame-editor.gif" alt="Magic-Frame-Editor — Widgets auf einer View ins 24-Spalten-Grid ziehen" width="720" />
</div>

<sub><a href="public/demo/magic-frame-preview.mp4">Vollständigen ~1-Min-Walkthrough ansehen</a> (View erstellen → Widgets ziehen → Inspector konfigurieren → speichern → Live-Sync auf Displays).</sub>

<!-- s:inthewild -->
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

<p align="center"><sub><strong>Szenen-Button-Layout:</strong> ein kleines Tablet in echter Bilderrahmen-Halterung. Schnellzugriff-HA-Buttons, dezente Uhr, aktuelles Wetter, rotierendes Wallpaper drunter.</sub></p>

<!-- s:widgets -->
## Widgets

18 Stück sind bei jeder Installation dabei:

| Widget | Beschreibung |
|---|---|
| **Clock** | Zeit + Datum, optional Mini-Wetter, 12/24h |
| **Weather** | Open-Meteo, DWD, OpenWeatherMap oder HA-Wetter-Entity · Meteocons- + 3D-Icon-Sets |
| **Environment** | Luftqualität, Pollen, Feinstaub und UV — Open-Meteo oder eigene HA-Sensoren |
| **Calendar** | iCal + Google + Microsoft 365 + HA-Kalender · Listen-, Agenda- und Monatsansicht · 12/24h |
| **Home Assistant** | Beliebige HA-Entities + Rule-Engine (Farbe/Icon je nach State) |
| **HA Notifications** | Regelbasierte Push-Kacheln, Tap-to-Toggle, Auto-Hide wenn ruhig |
| **Camera** | HA-Kamera-Entities — Snapshot-Refresh, Vollbild-Ansicht |
| **Sensor** | Multi-Sensor-Kacheln — Icon/Farbe pro Sensor, Verlaufs-Sparkline |
| **Image** | Foto-Kachel — Immich-Album oder WebDAV-Slideshow |
| **Buttons** | Tap-Tiles mit HA-Service-Calls (inkl. Service-Data) / Webhooks |
| **Timer** | Live-Countdown, per REST-API / iOS-Shortcut startbar |
| **Messages** | Quick-Post (Text + Bild) per REST-API mit TTL |
| **Shopping** | 3 Quellen: lokal, HA (todo.\*) oder **Todoist** |
| **Todos** | 3 Quellen: lokal, HA (todo.\*) oder **Todoist** |
| **Media Player** | Läuft-gerade-Karte — Cover, Fortschritt, Steuerung, mehrere Player stapeln sich |
| **RSS Feed** | Schlagzeilen mit Vorschaubild und Teaser, QR-Code zum Weiterlesen |
| **QR Code** | WLAN, Links und Texte — runde Punkte, Farbverläufe, Icon in der Mitte |
| **Status** | Gerätekarte mit Bild und Live-Details — Auto lädt, Drucker druckt, Toniebox spielt |

Jede Option von jedem einzelnen: [Time and weather](wiki/widgets-time-weather.md) · [Calendar](wiki/widgets-calendar.md) · [Home Assistant](wiki/widgets-home-assistant.md) · [Media and photos](wiki/widgets-media.md) · [Family](wiki/widgets-family.md)

<!-- s:more -->
## Was es sonst noch kann

- **Drag & Drop auf einem 24-Spalten-Grid**, eine View pro Display, Hoch- oder Querformat — [The editor](wiki/the-editor.md)
- **Widgets stapeln und überlagern** und jedes an einen Home-Assistant-State binden: Türklingel geht, Kamera schiebt sich über die Fotos und verschwindet wieder — [Stacking and visibility](wiki/stacking-and-visibility.md)
- **Wallpaper aus deinem eigenen Immich oder einem WebDAV-Ordner**, mit Fit-Modi, Split-View und Foto-Infoleiste — [Wallpapers](wiki/wallpapers.md)
- **Live-Home-Assistant-States über eine WebSocket**, gepusht statt gepollt — [Home Assistant](wiki/home-assistant.md)
- **Google- und Microsoft-365-Kalender per OAuth**, dazu einfache iCal-Feeds — [Calendars](wiki/calendars.md)
- **Optional HTTPS, eigene Domain, DDNS und Zwei-Faktor-Login**, alles standardmäßig aus — [Hosting and your domain](wiki/hosting-and-domain.md) · [Users and security](wiki/users-and-security.md)

Eine iOS-Companion-App entsteht parallel zum Editor. Sie ist **noch nicht verfügbar**. Alles was sie können soll, geht heute schon per HTTP mit einem Token — [The companion API](wiki/companion-api.md).

<!-- s:docs -->
## Doku

Das [Wiki](wiki/README.md) ist das Handbuch: 28 Seiten, aus dem Code geschrieben und in der CI gegen ihn geprüft. **Das Wiki gibt es nur auf Englisch** — die App selbst ist zweisprachig, die Doku nicht.

| | |
|---|---|
| **Starting** | [Getting started](wiki/getting-started.md) · [Concepts](wiki/concepts.md) · [Installation](wiki/installation.md) · [The Home Assistant add-on](wiki/home-assistant-addon.md) · [Updating and backups](wiki/updating-and-backups.md) |
| **Using it** | [The editor](wiki/the-editor.md) · [Views and displays](wiki/views-and-displays.md) · [Wallpapers](wiki/wallpapers.md) · [Widgets](wiki/widgets.md) · [Time and weather](wiki/widgets-time-weather.md) · [Calendar](wiki/widgets-calendar.md) · [Home Assistant widgets](wiki/widgets-home-assistant.md) · [Media and photos](wiki/widgets-media.md) · [Family](wiki/widgets-family.md) · [Stacking and visibility](wiki/stacking-and-visibility.md) · [Themes and styling](wiki/themes-and-styling.md) |
| **Connecting things** | [Home Assistant](wiki/home-assistant.md) · [Immich](wiki/immich.md) · [Calendars](wiki/calendars.md) · [Weather providers](wiki/weather-providers.md) · [Other sources](wiki/other-sources.md) |
| **Running it** | [Settings](wiki/settings.md) · [Users and security](wiki/users-and-security.md) · [Hosting and your domain](wiki/hosting-and-domain.md) · [Troubleshooting](wiki/troubleshooting.md) |
| **Extending it** | [The companion API](wiki/companion-api.md) · [Custom modules](wiki/custom-modules.md) · [Writing a module](wiki/module-development.md) |

Und im Repo selbst:

| | |
|---|---|
| [`ROADMAP.md`](ROADMAP.md) | Was als Nächstes kommt + wie Releases ablaufen |
| [`LICENSE.md`](LICENSE.md) | Polyform Noncommercial 1.0.0 |
| [`.env.example`](.env.example) | Alle Umgebungsvariablen, dokumentiert |
| [`kubernetes/`](kubernetes/) | Kubernetes-Manifeste und ein Helm-Chart aus der Community (danke @RudiKlein) |

Du liest das mit einem Agenten? [`llms.txt`](llms.txt) ist die Karte, [`llms-full.txt`](llms-full.txt) sind alle Seiten in einer Anfrage.

<!-- s:architecture -->
## Architektur

Ein Docker-Stack mit drei Services, alles auf demselben Host:

| Layer | Was |
|---|---|
| **Caddy** | Reverse-Proxy + automatisches HTTPS (Let's Encrypt). Custom-Build mit 10 DNS-Plugins für ACME DNS-01. Im rein lokalen Betrieb läuft Caddy als simpler HTTP-Proxy ohne TLS. |
| **Next.js-App** | `/editor` ist die Admin-UI. `/view/<id>` ist das, was die Displays anzeigen. `/api/...` ist die REST-Schnittstelle für Shortcuts, eigene Skripte und die Companion-App. Socket.IO pusht Live-Updates an jedes Display. |
| **Postgres 16** | Dashboards, Layouts, Snapshots, User, OAuth-Tokens, Custom-Module, App-Einstellungen. |

**Datenfluss beim Speichern:** Browser ändert ein Widget → Next.js-API → Snapshot in Postgres → Socket.IO-Event → jedes Display rendert innerhalb einer Sekunde neu.

<!-- s:stack -->
## Tech-Stack

Next.js 16 · React 19 · Postgres 16 + Prisma 7 · Caddy 2 (xcaddy custom-build) ·
Tailwind CSS 4 · Socket.IO · react-grid-layout · iron-session · otplib · esbuild

<!-- s:contributing -->
## Contributions

Issues mit klarer Reproduktion sind besonders willkommen — die treiben die Releases direkt voran (das meiste aus v1.1 kam so aus der Community). Pull-Requests schaue ich mir gerne an; bei größeren Änderungen bitte vorher ein Issue aufmachen, damit wir klären was rein passt.

<!-- s:support -->
## ❤️ Unterstützen

Magic Frame ist für den Heimgebrauch kostenlos und entsteht in meiner Freizeit. Wenn es bei dir an der Wand hängt und du Danke sagen willst:

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-%E2%9D%A4-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/jeremiaa)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/jeremiaa)

<!-- s:license -->
## Lizenz

**[Polyform Noncommercial 1.0.0](LICENSE.md)** — Open-Source-ähnlich,
erlaubt freies Nutzen, Modifizieren, Weitergeben und Beitragen.
Kommerzielle Nutzung (Verkauf, SaaS-Angebot, in eigene Produkte einbauen)
ist ohne separate Lizenz nicht erlaubt.

Für kommerzielle Anfragen: **magicframeapp@gmail.com**

<sub>Vibe-coded mit Claude.</sub>

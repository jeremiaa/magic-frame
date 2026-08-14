<div align="center">

<img src="public/social/og-banner.png" alt="Magic Frame — lokales Glassmorphism-Dashboard für Tablets, Monitore und Bilderrahmen" width="100%" />

[English](README.md) · **Deutsch** · 🌐 **[magicframe.dev](https://magicframe.dev)** · 📖 **[Dokumentation](https://magicframe.dev/docs/)**

Läuft komplett im eigenen Heimnetz — kein Cloud-Konto, keine Domain nötig.

Drag-&-Drop-Editor · Echte Live-Updates · Smart-Home · Kalender · Wetter · Bilderrahmen-Modus

[![License: Polyform NC](https://img.shields.io/badge/license-Polyform_Noncommercial-blue.svg)](LICENSE.md)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()
[![Sponsor](https://img.shields.io/badge/%E2%9D%A4-Sponsor-ea4aaa)](https://github.com/sponsors/jeremiaa)

<picture>
  <source media="(prefers-color-scheme: light)" srcset="wiki/img/getting-started-result.png">
  <img src="wiki/img/getting-started-result-dark.png" alt="Ein Wandtablet mit Magic Frame: rotierendes Foto als Hintergrund, Uhr, Wetter, Kalender und drei Home-Assistant-Kacheln" width="100%">
</picture>

</div>

<!-- s:what -->
## Was es ist

Magic Frame macht aus jedem Bildschirm mit Browser — Tablets, Küchenmonitore, alte TVs, Bilderrahmen — ein selbst gehostetes Display für zuhause:

- **Familien-Board** — Einkaufsliste, Todos, Kalender, Wetter
- **Smart-Home-Zentrale** — Home-Assistant-Entitäten live, Szenen-Buttons, Kamera-Pop-ups, Benachrichtigungs-Kacheln
- **Digitaler Bilderrahmen** — Wallpaper-Rotation aus Immich oder WebDAV, dezente Uhr darüber
- **Status-Display / Signage** — Stromverbrauch, Timer, Kurznachrichten, wechselnde Hinweise *(nicht-kommerziell — siehe [Lizenz](LICENSE.md))*

Eine **Ansicht** pro Display, jede mit eigener URL, eigenem Layout und Hintergrund. Ein Widget am Laptop ändern, und jedes Display zieht innerhalb einer Sekunde nach, ohne Neuladen. Läuft auf einem Raspberry Pi 4/5, einem NAS, einem alten Laptop, einem Mac mini, einem VPS oder in Home Assistant OS als [Add-on](wiki/home-assistant-addon.md).

<!-- s:quickstart -->
## Schnellstart

Zwei Befehle auf einer frischen Linux-Kiste. Schritt 1 weglassen, falls Docker schon da ist:

```bash
# 0. Nur falls `curl --version` fehlt — ein minimales Debian, eine
#    Proxmox-Vorlage oder ein abgespecktes VM-Abbild bringt kein curl mit.
sudo apt update && sudo apt install -y curl git

# 1. Docker installieren (mit Compose-Plugin) — offizieller Einzeiler
curl -fsSL https://get.docker.com | sh

# 2. Magic Frame installieren
curl -fsSL https://raw.githubusercontent.com/jeremiaa/magic-frame/main/deploy/install.sh | bash
```

Das Install-Script zieht die fertig gebauten Multi-Arch-Images und startet den Stack — auf einem Pi wird also nichts 20 Minuten lang kompiliert. Danach `http://<deine-ip>` öffnen, den ersten Admin anlegen, fertig. Alle Integrationen kommen später über die UI dazu.

> **Home Assistant im Einsatz?** Dann Magic Frame aus dem Add-on-Store installieren — es bringt seine eigene Datenbank mit und braucht keinen Zugriffstoken. Ein Klick trägt das Repository in deine eigene Instanz ein:
>
> [![Öffnet deine Home-Assistant-Instanz und zeigt den Dialog zum Hinzufügen eines Add-on-Repositories.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fjeremiaa%2Fmagic-frame)
>
> Danach Magic Frame im Store suchen und installieren. Von Hand: `https://github.com/jeremiaa/magic-frame` unter Einstellungen → Add-ons → Add-on-Store → ⋮ → Repositories eintragen. Ausführlich: [Das Home-Assistant-Add-on](wiki/home-assistant-addon.md).
>
> **macOS / Windows?** Statt Schritt 1 [Docker Desktop](https://www.docker.com/products/docker-desktop/) installieren, dann Schritt 2 im Terminal ausführen.

Derselbe Befehl aktualisiert eine bestehende Installation und fasst dabei weder Daten noch Login noch hochgeladene Module an. Jeder Installationsweg im Detail: [Installation](wiki/installation.md). Updates, Backups und Zurückrollen: [Updates und Backups](wiki/updating-and-backups.md).

<!-- s:looks -->
## So sieht es aus

Widgets auf ein 24-Spalten-Raster ziehen, im Inspektor einstellen, speichern. Jedes Display zieht innerhalb einer Sekunde nach.

<picture>
  <source media="(prefers-color-scheme: light)" srcset="wiki/img/widgets-add-palette.png">
  <img src="wiki/img/widgets-add-palette-dark.png" alt="Der Ansichten-Editor: Widget-Palette links, eine Küchen-Ansicht entsteht auf dem Raster" width="100%">
</picture>

Statuskarten zeigen deine Geräte mit Bild und Live-Details. Die Media-Karte macht aus allem, was gerade läuft, eine Now-Playing-Kachel:

<table>
<tr>
<td width="50%"><picture>
  <source media="(prefers-color-scheme: light)" srcset="wiki/img/status-card-vacuum.png">
  <img src="wiki/img/status-card-vacuum-dark.png" alt="Statuskarte: ein Saugroboter mit Akku und Raum-Fortschritt">
</picture></td>
<td width="50%"><picture>
  <source media="(prefers-color-scheme: light)" srcset="wiki/img/status-card-washer.png">
  <img src="wiki/img/status-card-washer-dark.png" alt="Statuskarte: eine Waschmaschine mit Restzeit">
</picture></td>
</tr>
<tr>
<td width="50%"><picture>
  <source media="(prefers-color-scheme: light)" srcset="wiki/img/media-player-cover.png">
  <img src="wiki/img/media-player-cover-dark.png" alt="Media-Karte: Now Playing mit Cover, Fortschritt und Steuerung">
</picture></td>
<td width="50%"><picture>
  <source media="(prefers-color-scheme: light)" srcset="wiki/img/weather-background.png">
  <img src="wiki/img/weather-background-dark.png" alt="Wetterkarte mit Live-Hintergrund passend zum aktuellen Wetter">
</picture></td>
</tr>
</table>

<!-- s:widgets -->
## Widgets

19 sind bei jeder Installation dabei: Uhr, Wetter, Umwelt, Kalender, Home-Assistant-Entität, HA-Benachrichtigungen, Kamera, Sensor, Bild, Buttons, Timer, Nachrichten, Einkaufsliste, Todos, Media Player, RSS, QR-Code, Status und Text — plus eigene als [Custom-Module](wiki/custom-modules.md).

Jede Option von jedem: [Zeit und Wetter](wiki/widgets-time-weather.md) · [Kalender](wiki/widgets-calendar.md) · [Home Assistant](wiki/widgets-home-assistant.md) · [Medien und Fotos](wiki/widgets-media.md) · [Familie](wiki/widgets-family.md)

<!-- s:docs -->
## Dokumentation

Das vollständige Handbuch liegt auf **[magicframe.dev/docs](https://magicframe.dev/docs/)** und in diesem Repo unter [`wiki/`](wiki/README.md) — 28 Seiten, aus dem Code geschrieben und in der CI dagegen geprüft (englisch).

| | |
|---|---|
| **Einstieg** | [Getting started](wiki/getting-started.md) · [Concepts](wiki/concepts.md) · [Installation](wiki/installation.md) · [The Home Assistant add-on](wiki/home-assistant-addon.md) · [Updating and backups](wiki/updating-and-backups.md) |
| **Benutzen** | [The editor](wiki/the-editor.md) · [Views and displays](wiki/views-and-displays.md) · [Wallpapers](wiki/wallpapers.md) · [Widgets](wiki/widgets.md) · [Stacking and visibility](wiki/stacking-and-visibility.md) · [Themes and styling](wiki/themes-and-styling.md) |
| **Verbinden** | [Home Assistant](wiki/home-assistant.md) · [Immich](wiki/immich.md) · [Calendars](wiki/calendars.md) · [Weather providers](wiki/weather-providers.md) · [Other sources](wiki/other-sources.md) |
| **Betreiben** | [Settings](wiki/settings.md) · [Users and security](wiki/users-and-security.md) · [Hosting and your domain](wiki/hosting-and-domain.md) · [Troubleshooting](wiki/troubleshooting.md) |
| **Erweitern** | [The companion API](wiki/companion-api.md) · [Custom modules](wiki/custom-modules.md) · [Writing a module](wiki/module-development.md) |

Du liest das mit einem Agenten? [`llms.txt`](llms.txt) ist die Karte, [`llms-full.txt`](llms-full.txt) alle Seiten in einer Anfrage. Was als Nächstes kommt: [`ROADMAP.md`](ROADMAP.md).

<!-- s:contributing -->
## Mitmachen

Issues mit klarer Reproduktion sind besonders willkommen — sie treiben die Releases direkt an (das meiste von v1.1 kam aus Community-Wünschen). PRs werden gern reviewt; bei größeren Änderungen bitte erst ein Issue aufmachen, damit wir klären, was passt.

<!-- s:support -->
## ❤️ Unterstützen

Magic Frame ist für den Heimgebrauch kostenlos und entsteht in meiner Freizeit. Wenn es bei dir an der Wand hängt und du Danke sagen willst:

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-%E2%9D%A4-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/jeremiaa)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/jeremiaa)

<!-- s:license -->
## Lizenz

**[Polyform Noncommercial 1.0.0](LICENSE.md)** — Open-Source-artig:
freie Nutzung, Veränderung, Weitergabe und Mitarbeit sind erlaubt.
Kommerzielle Nutzung (Verkauf, SaaS-Angebot, Einbau in eigene Produkte)
ist ohne separate Lizenz nicht gestattet.

Für kommerzielle Anfragen: **magicframeapp@gmail.com**

<sub>Vibe-coded with Claude.</sub>

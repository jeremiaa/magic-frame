<div align="center">

<img src="public/social/og-banner.png" alt="Magic Frame — local glassmorphism dashboard for tablets, monitors, and picture frames" width="100%" />

**English** · [Deutsch](README.de.md) · 🌐 **[magicframe.dev](https://magicframe.dev)** · 📖 **[Documentation](wiki/README.md)**

Runs entirely on your home network — no cloud account, no domain needed.

Drag & drop editor · Real live updates · Smart-home · Calendar · Weather · Picture-frame mode

[![License: Polyform NC](https://img.shields.io/badge/license-Polyform_Noncommercial-blue.svg)](LICENSE.md)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()
[![Sponsor](https://img.shields.io/badge/%E2%9D%A4-Sponsor-ea4aaa)](https://github.com/sponsors/jeremiaa)

</div>

---

<!-- s:what -->
## What it is

Magic Frame turns any browser-capable screen — tablets, kitchen monitors, old TVs, picture frames — into a self-hosted display for your home:

- **Family board** — shopping list, todos, calendar, weather
- **Smart-home hub** — live Home Assistant entities, scene buttons, camera pop-ups, notification tiles
- **Digital picture frame** — wallpaper rotation from Immich or WebDAV, subtle clock on top
- **Status display / signage** — power usage, timers, quick posts, rotating notices *(non-commercial — see [license](LICENSE.md))*

One **view** per display, each with its own URL, layout and wallpaper. Change a widget on your laptop and every display follows within a second, no refresh.

<!-- s:where -->
## Where it runs

Install it once on any box in your home network — that machine becomes "the server", your displays just open its address in a browser. **No cloud account, no domain, no DDNS required.** Postgres ships inside the Docker stack.

| Hardware | |
|---|---|
| Raspberry Pi 4 / 5, Mini-PC (NUC, Beelink, …) | ✅ |
| Synology / QNAP NAS | ✅ Docker package in the NAS OS |
| Old laptop / desktop / Mac mini | ✅ |
| Home Assistant OS | ✅ as an [add-on](wiki/home-assistant-addon.md) |
| VPS / cloud server | ✅ optional — only if you want outside access |

<!-- s:quickstart -->
## Quick start

Two commands on a fresh Linux box. Skip step 1 if you already have Docker:

```bash
# 0. Only if `curl --version` says it is missing — a minimal Debian,
#    a Proxmox template or a stripped VM image has no curl.
sudo apt update && sudo apt install -y curl git

# 1. Install Docker (with Compose plugin) — official one-liner
curl -fsSL https://get.docker.com | sh

# 2. Install Magic Frame
curl -fsSL https://raw.githubusercontent.com/jeremiaa/magic-frame/main/deploy/install.sh | bash
```

The installer pulls the pre-built multi-arch images and starts the stack, so there is no 20-minute compile on a Pi. Then open `http://<your-ip>`, create the first admin, and you are in. Every integration is added later through the UI.

> **Running Home Assistant?** Add `https://github.com/jeremiaa/magic-frame` as an add-on repository and install Magic Frame from the add-on store instead. It brings its own database and needs no access token. See [The Home Assistant add-on](wiki/home-assistant-addon.md).
>
> **macOS / Windows?** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) instead of step 1, then run step 2 in a terminal.
>
> **No `curl`?** Install it (`sudo apt install curl` / `sudo dnf install curl`) — or use git instead: `git clone https://github.com/jeremiaa/magic-frame.git && cd magic-frame && ./deploy/install.sh`

The same command updates an existing install, and never touches your data, login or uploaded modules. Every install path in detail: [Installation](wiki/installation.md). Updating, backups and rolling back: [Updating and backups](wiki/updating-and-backups.md).

<!-- s:demo -->
## Demo

Drag widgets onto the grid, configure them in the inspector, save — every display follows.

<div align="center">
  <img src="public/demo/magic-frame-editor.gif" alt="Magic Frame editor — adding widgets to a view on a 24-column grid" width="720" />
</div>

<sub><a href="public/demo/magic-frame-preview.mp4">Watch the full ~1 min walkthrough</a> (create view → drag widgets → configure inspector → save → live-sync to displays).</sub>

<!-- s:inthewild -->
## In the wild

Real-world setups across different hardware. Same project, different layouts, different rooms.

### Big portrait monitor on the wall

<table>
<tr>
<td width="50%"><img src="public/setups/setup-monitor.jpg" alt="Wall-mounted portrait monitor showing the time, two upcoming calendar entries, three live notifications and a 4-day weather forecast over a mountain wallpaper" /></td>
<td width="50%"><img src="public/setups/setup-notify.jpg" alt="Close-up of notification tiles on the wall monitor at night" /></td>
</tr>
<tr>
<td valign="top"><sub><strong>Info layout:</strong> clock, two upcoming calendar events, three live HA notifications, current temperature and 4-day weather forecast over a rotating Immich wallpaper. Quiet and glanceable for a hallway, office or bedroom wall.</sub></td>
<td valign="top"><sub><strong>Notifications close-up:</strong> rule-based tiles that auto-show when something happens (washing machine done, "feed Milou", dryer done) and auto-hide once acknowledged. Wallpaper keeps running underneath.</sub></td>
</tr>
</table>

### Picture-frame tablet on a side table

<p align="center"><img src="public/setups/setup-tablet.jpg" alt="Small picture-frame tablet on a side table with HA scene buttons, a clock and the current weather" width="50%" /></p>

<p align="center"><sub><strong>Scene-button layout:</strong> a small tablet in a real photo-frame mount. Quick-access HA buttons, small clock, current temperature, rotating wallpaper underneath.</sub></p>

<!-- s:widgets -->
## Widgets

18 of them ship with every install:

| Widget | Description |
|---|---|
| **Clock** | Time + date, optional mini weather, 12/24h |
| **Weather** | Open-Meteo, DWD, OpenWeatherMap, or HA weather entity · Meteocons + 3D icon sets |
| **Environment** | Air quality, pollen, PM and UV — Open-Meteo or your own HA sensors |
| **Calendar** | iCal + Google + Microsoft 365 + HA calendars · list, agenda and month views · 12/24h toggle |
| **Home Assistant** | Any HA entity + rule engine (colour/icon per state) |
| **HA Notifications** | Rule-based push tiles, tap-to-toggle, auto-hide when quiet |
| **Camera** | HA camera entities — snapshot refresh, fullscreen view |
| **Sensor** | Multi-sensor value tiles — per-sensor icon/colour, history sparkline |
| **Image** | Photo tile — Immich album or WebDAV slideshow |
| **Buttons** | Tap tiles with HA service calls (incl. service data) / webhooks |
| **Timer** | Live countdown, startable via REST API / iOS Shortcut |
| **Messages** | Quick post (text + image) via REST API with TTL |
| **Shopping** | 3 sources: local, HA (todo.\*) or **Todoist** |
| **Todos** | 3 sources: local, HA (todo.\*) or **Todoist** |
| **Media Player** | Now-playing card — artwork, progress, controls, several players stack |
| **RSS Feed** | Headlines with thumbnail and teaser, QR code to carry on reading |
| **QR Code** | Wi-Fi, links and text — rounded dots, gradients, icon in the middle |
| **Status** | Device card with picture and live details — car charging, printer printing, toniebox playing |

Every option of every one: [Time and weather](wiki/widgets-time-weather.md) · [Calendar](wiki/widgets-calendar.md) · [Home Assistant](wiki/widgets-home-assistant.md) · [Media and photos](wiki/widgets-media.md) · [Family](wiki/widgets-family.md)

<!-- s:more -->
## What else it does

- **Drag & drop on a 24-column grid**, one view per display, portrait or landscape — [The editor](wiki/the-editor.md)
- **Stack and overlay widgets**, and bind any of them to a Home Assistant state: doorbell rings, camera pops up over the photos, hides itself again — [Stacking and visibility](wiki/stacking-and-visibility.md)
- **Wallpapers from your own Immich or a WebDAV folder**, with fit modes, split view and a photo info bar — [Wallpapers](wiki/wallpapers.md)
- **Live Home Assistant state over one WebSocket**, pushed rather than polled — [Home Assistant](wiki/home-assistant.md)
- **Google and Microsoft 365 calendars over OAuth**, plus plain iCal feeds — [Calendars](wiki/calendars.md)
- **Optional HTTPS, your own domain, DDNS and two-factor login**, all off by default — [Hosting and your domain](wiki/hosting-and-domain.md) · [Users and security](wiki/users-and-security.md)

An iOS companion app is being built alongside the editor. It is **not available yet**. Everything it will do already works over HTTP with a token today — [The companion API](wiki/companion-api.md).

<!-- s:docs -->
## Documentation

The [wiki](wiki/README.md) is the manual: 28 pages, written from the code and checked against it in CI.

| | |
|---|---|
| **Starting** | [Getting started](wiki/getting-started.md) · [Concepts](wiki/concepts.md) · [Installation](wiki/installation.md) · [The Home Assistant add-on](wiki/home-assistant-addon.md) · [Updating and backups](wiki/updating-and-backups.md) |
| **Using it** | [The editor](wiki/the-editor.md) · [Views and displays](wiki/views-and-displays.md) · [Wallpapers](wiki/wallpapers.md) · [Widgets](wiki/widgets.md) · [Time and weather](wiki/widgets-time-weather.md) · [Calendar](wiki/widgets-calendar.md) · [Home Assistant widgets](wiki/widgets-home-assistant.md) · [Media and photos](wiki/widgets-media.md) · [Family](wiki/widgets-family.md) · [Stacking and visibility](wiki/stacking-and-visibility.md) · [Themes and styling](wiki/themes-and-styling.md) |
| **Connecting things** | [Home Assistant](wiki/home-assistant.md) · [Immich](wiki/immich.md) · [Calendars](wiki/calendars.md) · [Weather providers](wiki/weather-providers.md) · [Other sources](wiki/other-sources.md) |
| **Running it** | [Settings](wiki/settings.md) · [Users and security](wiki/users-and-security.md) · [Hosting and your domain](wiki/hosting-and-domain.md) · [Troubleshooting](wiki/troubleshooting.md) |
| **Extending it** | [The companion API](wiki/companion-api.md) · [Custom modules](wiki/custom-modules.md) · [Writing a module](wiki/module-development.md) |

And in the repository itself:

| | |
|---|---|
| [`ROADMAP.md`](ROADMAP.md) | What's coming next + how releases work |
| [`LICENSE.md`](LICENSE.md) | Polyform Noncommercial 1.0.0 |
| [`.env.example`](.env.example) | Every environment variable, documented |
| [`kubernetes/`](kubernetes/) | Community Kubernetes manifests and a Helm chart (thanks @RudiKlein) |

Reading this with an agent? [`llms.txt`](llms.txt) is the map, [`llms-full.txt`](llms-full.txt) is every page in one request.

<!-- s:architecture -->
## Architecture

One Docker stack with three services, all on the same host:

| Layer | What |
|---|---|
| **Caddy** | Reverse proxy + automatic HTTPS (Let's Encrypt). Custom build with 10 DNS plugins for ACME DNS-01. For purely local use it runs as a plain HTTP proxy without TLS. |
| **Next.js app** | `/editor` is the admin UI. `/view/<id>` is what displays render. `/api/...` is the REST surface for shortcuts, scripts and the companion app. Socket.IO pushes live updates to every display. |
| **Postgres 16** | Dashboards, layouts, snapshots, users, OAuth tokens, custom modules, app settings. |

**Data flow on save:** browser edits a widget → Next.js API → snapshot to Postgres → Socket.IO event → every display re-renders within a second.

<!-- s:stack -->
## Tech stack

Next.js 16 · React 19 · Postgres 16 + Prisma 7 · Caddy 2 (xcaddy custom build) ·
Tailwind CSS 4 · Socket.IO · react-grid-layout · iron-session · otplib · esbuild

<!-- s:contributing -->
## Contributing

Issues with a clear reproduction are especially welcome — they directly drive releases (most of v1.1 came straight from community requests). PRs are happily reviewed; for larger changes please open an issue first so we can sort out what fits.

<!-- s:support -->
## ❤️ Support

Magic Frame is free for home use and built in my spare time. If it hangs on your wall and you want to say thanks:

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-%E2%9D%A4-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/jeremiaa)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-%E2%98%95-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/jeremiaa)

<!-- s:license -->
## License

**[Polyform Noncommercial 1.0.0](LICENSE.md)** — open-source-style,
allows free use, modification, distribution, and contribution.
Commercial use (selling, SaaS offering, embedding in your own products)
is not permitted without a separate license.

For commercial inquiries: **magicframeapp@gmail.com**

<sub>Vibe-coded with Claude.</sub>

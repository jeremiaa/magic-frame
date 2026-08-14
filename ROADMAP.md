# Roadmap

Where Magic Frame is heading. This is a **loose** roadmap — features ship
individually in small patch releases as soon as they're stable, then once
a "theme" worth of features is in, it gets wrapped up with a release post.

Individual issues are the source of truth — this file is the one-paragraph
summary for anyone who doesn't want to scroll through them.

---

## Shipping next

Nothing sitting on the shelf — v1.5.0 just went out (see below). What's
coming next is the "Next up" list.

## Next up

Scoped issues that are likely to land in upcoming patch releases:

- **🔌 Wallpaper source switching over HTTP** ([#63](https://github.com/jeremiaa/magic-frame/issues/63)) —
  the display-control half of that issue shipped in v1.3.4 (`/api/devices/refresh`,
  `/api/devices/navigate`, `/api/devices/clear-navigate`); swapping the wallpaper
  source from an automation is what's left
- **🎵 Fullscreen media browser + search** for Music Assistant, based on
  @schmierlappe's module ([#57](https://github.com/jeremiaa/magic-frame/issues/57))

## Later — ideas & bigger rocks

Not scheduled, but on the radar. If one of these would matter to you,
opening or upvoting an issue is the best way to move it up.

- **Swipe between views on one display** ([#4](https://github.com/jeremiaa/magic-frame/issues/4)) + auto-cycle views
- **OIDC login** ([#55](https://github.com/jeremiaa/magic-frame/issues/55)) and no-reverse-proxy setups ([#10](https://github.com/jeremiaa/magic-frame/issues/10))
- **A listing in the Home Assistant add-on store**, so the repository URL
  isn't needed — the add-on itself shipped in v1.3.4
  ([#25](https://github.com/jeremiaa/magic-frame/issues/25)) — and a Helm
  chart for Kubernetes ([#24](https://github.com/jeremiaa/magic-frame/issues/24))
- **More UI languages** ([#13](https://github.com/jeremiaa/magic-frame/issues/13)), more weather providers ([#67](https://github.com/jeremiaa/magic-frame/issues/67)), smarter widget auto-fit ([#8](https://github.com/jeremiaa/magic-frame/issues/8))
- **More wallpaper sources** — Synology Photos, Apple Photos shared albums
- **Native companion app** — iOS first, beta via TestFlight
- **Smoother view transitions**, compound visibility conditions, view templates

## Already out

The two most recent releases, so it's clear what no longer belongs above:

- **v1.5.0** — CalDAV calendars ([#79](https://github.com/jeremiaa/magic-frame/pull/79) by @chimmidev), the
  Home Assistant add-on grown up (sidebar entry with one-click sign-in, icon,
  ingress), an [MCP server](wiki/companion-api.md) so agents can manage the
  whole configuration, the camera going fullscreen on an HA trigger
  ([#41](https://github.com/jeremiaa/magic-frame/issues/41)), state-based
  notification colours ([#47](https://github.com/jeremiaa/magic-frame/issues/47)),
  and a free-text heading widget ([#69](https://github.com/jeremiaa/magic-frame/issues/69)).
- **v1.4.0** — the security round (closed database port, fail-closed auth,
  an allowlist for `/api/ha/action`), the [wiki](wiki/README.md) — 28 pages
  checked against the code in CI, with `llms.txt` for agents — and both
  READMEs rebuilt around it.

---

## How releases work

- **Patches (`v1.3.x`)** ship continuously as features land — usually within
  a day of being stable. That's where everything above lives for now.
- **Minor/major bumps** are deliberately rare: the version number is staying
  in 1.3.x territory for a while. The next big jump is reserved for
  something that earns it. 👀
- Nothing above is a date promise — this is a spare-time project and ships
  when it's ready.

If you want to be notified about a specific feature: subscribe to the
respective issue on GitHub. For broad release news, watch the repo or check
the [Releases page](https://github.com/jeremiaa/magic-frame/releases).

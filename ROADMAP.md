# Roadmap

Where Magic Frame is heading. This is a **loose** roadmap — features ship
individually in small patch releases as soon as they're stable, then once
a "theme" worth of features is in, it gets wrapped up with a release post.

Individual issues are the source of truth — this file is the one-paragraph
summary for anyone who doesn't want to scroll through them.

---

## Shipping next — *security, and a manual*

Two rounds of work that are done but not released yet:

- **🔒 Security and behaviour** — the database port is closed and the app
  refuses to start without a session secret instead of quietly letting
  everyone in; `/api/ha/action` now only reaches entities that are actually
  on one of your views; failed logins are counted per client instead of per
  proxy, so five wrong passwords no longer lock out the whole household.
  Plus the widget fixes that came out of the same review.
- **📖 A wiki, checked in CI** — 28 pages written from the source, with
  `llms.txt` and `llms-full.txt` for agents. A check runs on every push:
  every widget must have a section, every route named must exist, every link
  must resolve, and every screenshot records the files it shows so a stale
  one turns the build red. The four old files under `docs/` are gone — they
  had drifted far enough to be actively wrong.

## Next up

Scoped issues that are likely to land in upcoming 1.3.x patches:

- **🔌 Wallpaper source switching over HTTP** ([#63](https://github.com/jeremiaa/magic-frame/issues/63)) —
  the display-control half of that issue shipped in v1.3.4 (`/api/devices/refresh`,
  `/api/devices/navigate`, `/api/devices/clear-navigate`); swapping the wallpaper
  source from an automation is what's left
- **🎵 Fullscreen media browser + search** for Music Assistant, based on
  @schmierlappe's module ([#57](https://github.com/jeremiaa/magic-frame/issues/57))
- **🔔 State-based colouring for notification tiles**, like the HA entity
  widget has ([#47](https://github.com/jeremiaa/magic-frame/issues/47))

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

- **v1.3.4** — the [Home Assistant add-on](wiki/home-assistant-addon.md)
  ([#25](https://github.com/jeremiaa/magic-frame/issues/25)), the picture-frame
  round (blurred fill [#38](https://github.com/jeremiaa/magic-frame/issues/38) /
  [#72](https://github.com/jeremiaa/magic-frame/issues/72), Immich **people**
  [#75](https://github.com/jeremiaa/magic-frame/issues/75), the photo info bar
  in split view [#44](https://github.com/jeremiaa/magic-frame/issues/44)), and
  display control over HTTP.
- **v1.3.3** — the calendar rework (agenda and month views, Home Assistant
  calendars [#65](https://github.com/jeremiaa/magic-frame/issues/65) based on
  [#68](https://github.com/jeremiaa/magic-frame/pull/68) by @proffalken, all-day
  timezone fixes [#70](https://github.com/jeremiaa/magic-frame/issues/70)), two
  new weather icon families and the Environment widget, and host timezone
  passthrough ([#73](https://github.com/jeremiaa/magic-frame/issues/73)).

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

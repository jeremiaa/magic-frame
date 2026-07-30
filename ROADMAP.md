# Roadmap

Where Magic Frame is heading. This is a **loose** roadmap — features ship
individually in small patch releases as soon as they're stable, then once
a "theme" worth of features is in, it gets wrapped up with a release post.

Individual issues are the source of truth — this file is the one-paragraph
summary for anyone who doesn't want to scroll through them.

---

## Shipping next — *v1.3.3: calendar & weather*

The biggest calendar update so far, plus a full weather refresh:

- **📅 Calendar rework** — new agenda and month views, a rebuilt month
  grid, light mode, and [Home Assistant calendars](https://github.com/jeremiaa/magic-frame/issues/65)
  as a feed source (based on [#68](https://github.com/jeremiaa/magic-frame/pull/68) by @proffalken).
  Plus timezone fixes for all-day events ([#70](https://github.com/jeremiaa/magic-frame/issues/70)).
- **🌦️ Weather icons & Environment widget** — two new icon families
  (Meteocons by Bas Milius and a self-made 3D set with day/night variants
  and real moon phases), icon size and animation controls, and a new
  Environment widget: air quality, pollen, PM and UV.
- **🕐 Host timezone passthrough** ([#73](https://github.com/jeremiaa/magic-frame/issues/73)) —
  containers follow the host timezone; the installer picks it up automatically.
- **🏠 Home Assistant add-on groundwork** — when running as an HA add-on,
  Magic Frame connects through the Supervisor without a long-lived token.

## Next up

Scoped issues that are likely to land in upcoming 1.3.x patches:

- **🖼️ Picture-frame polish** — a round focused on the photo-frame side:
  blurred fill for the Image widget and photo albums ([#38](https://github.com/jeremiaa/magic-frame/issues/38) /
  [#72](https://github.com/jeremiaa/magic-frame/issues/72)), picking Immich
  **people** instead of an album ([#75](https://github.com/jeremiaa/magic-frame/issues/75)),
  and the wallpaper metadata bar with split view and a position option
  ([#44](https://github.com/jeremiaa/magic-frame/issues/44))
- **🔌 Companion API** — wallpaper source switching and view control over
  HTTP, so HA automations can drive a display ([#63](https://github.com/jeremiaa/magic-frame/issues/63))
- **🎵 Fullscreen media browser + search** for Music Assistant, based on
  @schmierlappe's module ([#57](https://github.com/jeremiaa/magic-frame/issues/57))
- **📷 HA-triggered camera in fullscreen** instead of card size ([#41](https://github.com/jeremiaa/magic-frame/issues/41))
- **🔔 State-based colouring for notification tiles**, like the HA entity
  widget has ([#47](https://github.com/jeremiaa/magic-frame/issues/47))

## Later — ideas & bigger rocks

Not scheduled, but on the radar. If one of these would matter to you,
opening or upvoting an issue is the best way to move it up.

- **Swipe between views on one display** ([#4](https://github.com/jeremiaa/magic-frame/issues/4)) + auto-cycle views
- **OIDC login** ([#55](https://github.com/jeremiaa/magic-frame/issues/55)) and no-reverse-proxy setups ([#10](https://github.com/jeremiaa/magic-frame/issues/10))
- **HACS / Home Assistant add-on store** ([#25](https://github.com/jeremiaa/magic-frame/issues/25)) and a Helm chart for Kubernetes ([#24](https://github.com/jeremiaa/magic-frame/issues/24))
- **More UI languages** ([#13](https://github.com/jeremiaa/magic-frame/issues/13)), more weather providers ([#67](https://github.com/jeremiaa/magic-frame/issues/67)), smarter widget auto-fit ([#8](https://github.com/jeremiaa/magic-frame/issues/8))
- **More wallpaper sources** — Synology Photos, Apple Photos shared albums
- **Native companion app** — iOS first, beta via TestFlight
- **Smoother view transitions**, compound visibility conditions, view templates

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

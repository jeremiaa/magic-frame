# Magic Frame

A dashboard for tablets, monitors, wall panels and digital picture frames —
as a Home Assistant add-on, with its own database built in. Nothing else to
install.

## Installation

1. **Settings → Add-ons → Add-on Store**
2. Top right **⋮ → Repositories**, add this address:
   `https://github.com/jeremiaa/magic-frame`
3. Open **Magic Frame** in the list and press **Install**.
4. **Start**, then **Open Web UI**.

The database is created on first start, which takes a moment.

## Options

| Field | Meaning |
|---|---|
| `admin_email` | Login name for the first account. Leave empty to create it in the browser on first visit. |
| `admin_password` | Password for it. Clear it again after the first start — otherwise it stays in the add-on configuration. |
| `timezone` | Time zone, e.g. `Europe/Berlin`. Empty = the system's. |
| `ha_action_unrestricted` | Off by default. A display may only operate entities that are placed on one of your views. Turn this on only if something addresses an entity that sits on no view — a custom module with a hard-coded entity, or a script of your own. |

## Connecting Home Assistant

**No access token needed.** Running as an add-on, Magic Frame talks to Home
Assistant through the Supervisor and authenticates itself. The URL and token
fields under `Integrations → Home Assistant` stay empty, and anything you type
there is ignored for as long as the add-on is running — the Supervisor
connection always wins.

That also means an add-on install can only talk to the Home Assistant it is
installed in. If you need to point Magic Frame at a *different* instance, run
it with Docker Compose instead and enter the URL and a long-lived token there.

## Displays

Views are reachable at `http://<your-home-assistant-ip>:8098/view/<id>` and
need no login — that is what they are for. A wall tablet simply opens that
address.

Magic Frame also sits in the sidebar: the entry opens a small page whose one
button signs you in and opens the editor — only for Home Assistant admins,
verified against Home Assistant itself. The `ha_auto_login` option turns that
button off. Displays never use the sidebar: the ingress path changes and
requires a signed-in session, and a wall tablet has neither — which is why
views stay on the fixed port.

**Want it in the sidebar anyway?** Add a dashboard of type *Webpage* pointing
at `http://<your-home-assistant-ip>:8098` — Settings → Dashboards → Add
dashboard → Webpage. That gives you a sidebar entry today.

## Backups

The Supervisor stops the add-on before a backup (`backup: cold`) so the
database is captured in a consistent state. A backup contains your views,
accounts and settings.

## If something does not work

- **Logged out after a restart** — should not happen, the session key lives in
  `/data`. If it does, check the add-on log.
- **Calendar or weather empty** — those come from the internet, not from Home
  Assistant. The log says why.
- **Page does not load** — on the very first start, creating the database
  takes a while. Check the log before restarting.

## What this add-on does not include

The reverse proxy (Caddy) from the Docker Compose version is deliberately
absent — Home Assistant brings its own. Its settings card hides itself when
running as an add-on.

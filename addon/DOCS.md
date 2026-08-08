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

## Connecting Home Assistant

**No access token needed.** Running as an add-on, Magic Frame talks to Home
Assistant through the Supervisor and authenticates itself. The URL and token
fields in the settings stay empty and are not used.

## Displays

Views are reachable at `http://<your-home-assistant-ip>:8098/view/<id>` and
need no login — that is what they are for. A wall tablet simply opens that
address.

That is also why the add-on uses a fixed port rather than the sidebar: the
Home Assistant ingress path changes and requires a signed-in session, and a
wall tablet has neither.

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

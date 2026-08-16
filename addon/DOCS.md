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
| `timezone` | Leave empty — the add-on already runs in Home Assistant's own time zone. Only fill this in to override it, with an IANA name like `Europe/Berlin`. It decides what the clock and calendar show on your displays. |
| `ha_auto_login` | On by default. Home Assistant admins open Magic Frame from the sidebar without typing a password. Everyone else gets the normal sign-in page. |
| `ha_action_unrestricted` | Off by default. A display may only operate entities that are placed on one of your views. Turn this on only if something addresses an entity that sits on no view — a custom module with a hard-coded entity, or a script of your own. |

## Connecting Home Assistant

**Nothing to set up — it is already connected.** Running as an add-on, Magic
Frame reaches Home Assistant through the Supervisor and authenticates itself.
Your entities are available the moment the add-on starts: every field that asks
for an entity offers them, and the Home Assistant widgets work straight away.

`Integrations → Home Assistant` says so rather than showing you empty fields,
and there is nothing to fill in. The Supervisor connection always wins over
anything stored.

That also means an add-on install can only talk to the Home Assistant it is
installed in. If you need to point Magic Frame at a *different* instance, run
it with Docker Compose instead and enter the URL and a long-lived token there.

## Displays

### Where do I point my tablet?

1. Open Magic Frame from the sidebar and go to **Views**.
2. Every view card shows its own address, in the form
   `http://<your-home-assistant-ip>:8098/view/<name>`. The name is the one you
   gave the view; a fresh install has `/view/1`.
3. Type that address into the tablet's browser. That is all — **a view needs no
   login**, which is the whole point: a wall display cannot sign in.

`<your-home-assistant-ip>` is the same address you use to reach Home Assistant
itself, with `:8098` instead of `:8123`. If you changed the port under the
add-on's **Network** section, use the one you set there.

The add-on's own page shows both addresses too, right under the button.

Magic Frame also sits in the sidebar. The entry opens a small page whose one
button signs you in and opens the editor **in a new tab** — only for Home
Assistant admins, verified against Home Assistant itself. The `ha_auto_login`
option turns that button off. Displays never use the sidebar: the ingress path
changes and requires a signed-in session, and a wall tablet has neither — which
is why views stay on the fixed port.

The sidebar is a launcher, not the app. Running Magic Frame *inside* the Home
Assistant frame is not finished — it needs the whole app served under the
ingress path, which changes per installation. Version 1.5.1 shipped a
half-built version of that and was broken both in the frame and on the direct
port; 1.5.2 removes it. The `sidebar_mode` option still lists `embedded`, but
choosing it falls back to the launcher and notes it in the log.

If your Home Assistant is reached over HTTPS, the sidebar button cannot open
`http://<host>:8098` — browsers block that as mixed content. Type the address
in a new tab instead.

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
- **The add-on will not start after a power cut** — it recovers by itself now.
  A database folder without `global/pg_control` is incomplete, whatever else is
  in it. It is moved aside to `/data/postgres.unfertig.<date-time>` and a fresh
  one is created; the log says where. Nothing is deleted and an older rescue is
  never overwritten, so if the folder did hold real data it is still there.
  Restore a backup to get it back into service.
- **"This database was last used by version X"** — you started an older
  version against a newer database. Nothing was changed. Start the newer
  version again, or restore a backup from the older one's time first. See
  [Updating and backups](https://magicframe.dev/docs/updating-and-backups/).
- **Your admin password is not accepted** — up to 1.5.0 a password containing
  a quote, a backslash or an umlaut was mangled while being read from the
  add-on options, so the account was created with something other than what
  you typed. Fixed in 1.5.1; if you are locked out from before, clear both
  option fields, delete the account in the database, and create it in the
  browser instead.

## What this add-on does not include

The reverse proxy (Caddy) from the Docker Compose version is deliberately
absent — Home Assistant brings its own. Its settings card hides itself when
running as an add-on.

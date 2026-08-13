# The Home Assistant add-on

If Home Assistant is already the machine in your house that never turns off, you
do not need a second one. Magic Frame installs as a **Home Assistant add-on** —
an application the Home Assistant Supervisor installs, starts and backs up for
you, the same way you install any other add-on.

You need no Docker knowledge, no `.env` file, and **no Home Assistant access
token**.

## What is different from the normal install

| | Docker Compose install | Add-on |
| --- | --- | --- |
| Containers | Three: app, Postgres, Caddy | One. Postgres runs inside it. |
| Database | A Docker volume | Inside the add-on's own `/data` folder |
| Home Assistant connection | You create a long-lived access token and paste it in | Handled by the Supervisor — nothing to create |
| HTTPS and reverse proxy | Caddy, bundled | Home Assistant's own. Caddy is not included. |
| Address | Port 80 by default | Always port **8098** |
| Backups | Your own job | The Supervisor's add-on backup covers it |

Everything above the connection layer — views, widgets, wallpapers, the editor —
is identical. The pages in this wiki apply unchanged.

## Installing it

Adding a **repository** tells Home Assistant where to look for an add-on it does
not know about yet. You do it once.

1. In Home Assistant, open **Settings → Add-ons**.
2. Click **Add-on Store**, bottom right.
3. Click the **⋮** menu in the top right, then **Repositories**.
4. Paste this address into the field:

   ```
   https://github.com/jeremiaa/magic-frame
   ```

5. Click **Add**, then **Close**. **Magic Frame** now appears in the store list.
   If it does not, reload the page.
6. Click **Magic Frame**, then **Install**.
7. Wait. The Supervisor is not compiling the application — it downloads the
   published Magic Frame image and only adds Postgres on top, which takes
   seconds rather than the twenty minutes a full build would need on a Pi.
8. Open the **Configuration** tab and set the four options below.
9. Go back to the **Info** tab and click **Start**.
10. Click **Open Web UI**.

The very first start takes a moment longer than later ones: the database is
created from scratch before the application comes up. If the page does not load
immediately, read the add-on **Log** tab before restarting anything.

### Which machines it runs on

The add-on is published for **amd64** and **aarch64** only. 32-bit ARM
(`armv7` — Raspberry Pi Zero, Pi 2, older Pi 3 installations) is deliberately
left out, because the application image is not built for it and the Supervisor
would otherwise fail the install with an unhelpful message about a manifest.

## The four options

Set these on the add-on's **Configuration** tab. The add-on ships no translated
labels, so Home Assistant shows the option keys exactly as written here. All
four may be left as they are.

| Option | What it does |
| --- | --- |
| `admin_email` | The login name for the first account. **Leave it empty** to create the account in the browser on first visit instead. |
| `admin_password` | The password for that account. Clear it again after the first start — otherwise it stays readable in the add-on configuration. |
| `timezone` | An IANA time zone such as `Europe/Berlin`. Empty means the system's own. Getting this right matters: calendar entries appear at the wrong hour otherwise. |
| `ha_action_unrestricted` | Off by default. A display may normally only operate entities that are actually placed on one of your views. Turning this on removes that limit for the whole installation. |

Leave `ha_action_unrestricted` off unless something breaks because of it — a
custom module with a hard-coded entity, or a script of your own, addressing
something that sits on no view. It is the same setting as
`MAGIC_FRAME_HA_ACTION_UNRESTRICTED=1` in a Docker install, and the refusal
message tells you when you have hit the limit. [Home
Assistant](home-assistant.md) explains what the limit covers.

The email and password pair only does something **while no account exists yet**.
Once there is one, they are ignored on every later start, which is why clearing
them afterwards costs you nothing. Leaving them empty and creating the account
in the browser is the better habit — a password in a configuration field is a
password sitting in plain text.

## Home Assistant needs no token

Normally you would create a long-lived access token in Home Assistant and paste
it into Magic Frame. **As an add-on you do not.**

The add-on declares `homeassistant_api: true`, which makes the Supervisor hand
it a token of its own and proxy Home Assistant at an internal address. Magic
Frame notices it is running as an add-on and uses that automatically.

What that means in practice:

- Home Assistant widgets work right after the first start, with nothing
  configured. See [Home Assistant](home-assistant.md) for what they can do.
- The Home Assistant card under `Editor → Integrations` shows the Supervisor
  connection — the address reads `http://supervisor/core` rather than an address
  of yours. **Leave it as it is.**
- Anything *you* type into those fields takes priority over the Supervisor
  connection. That is the way to point the frame at a **different** Home
  Assistant than the one it runs inside — and the only reason to touch the
  fields at all.

## The address, and why there is no sidebar entry

The add-on is reachable on a **fixed port, 8098**:

| What | Address |
| --- | --- |
| The editor | `http://192.0.2.10:8098/editor` |
| A view, for a display | `http://192.0.2.10:8098/view/kitchen` |

— with your Home Assistant machine's own address in place of `192.0.2.10`.

Most add-ons appear in the Home Assistant sidebar. This one does not, on
purpose. Sidebar entries go through Home Assistant's **ingress**, and ingress
does two things that break a wall panel: the address it serves the add-on under
changes from session to session, and it requires a signed-in Home Assistant
session to load at all.

A tablet screwed to the kitchen wall has neither. It cannot type a password, and
it needs one fixed address it can be pointed at once and left alone. A view
deliberately needs no login — see [Views and displays](views-and-displays.md) —
and behind ingress that would stop being true. So the add-on takes a fixed port
instead.

### Getting a sidebar entry anyway

You can have one, as a Home Assistant dashboard that simply shows the page:

1. In Home Assistant, open **Settings → Dashboards**.
2. Click **Add dashboard**.
3. Choose **Webpage**.
4. Enter `http://192.0.2.10:8098` — your Home Assistant machine's address and
   port 8098.
5. Save it. Magic Frame now has a sidebar entry, and your wall tablets keep
   using the plain `:8098/view/<id>` address.

## HTTPS and outside access

Caddy — the reverse proxy and automatic-HTTPS piece of the Docker Compose
install — is **not part of the add-on**. Home Assistant already brings its own,
and running a second one inside would be pointless.

Because of that, Magic Frame hides the settings that would do nothing here: open
`Settings → Hosting & network` (Einstellungen → Hosting & Netzwerk) and the
HTTPS card shows an **Add-on** badge and one sentence explaining that Home
Assistant handles it. There are no domain or certificate fields to fill in.

For access from outside your home, use Home Assistant's own remote access.

## Backups

The add-on is declared `backup: cold`, which means **the Supervisor stops it
before taking a backup**. With a database running inside the container that is
the difference between a backup that restores cleanly and one that will not
start.

A Home Assistant backup that includes this add-on contains your views, your
accounts and your settings. Your displays go blank for the length of the backup,
because the add-on is genuinely stopped — that is the trade, and it is the right
one.

Magic Frame's own layout export and automatic snapshots work here exactly as
they do everywhere else; see [Updating and backups](updating-and-backups.md).

## Where the data lives

One folder inside the add-on survives a restart and an update: `/data`. Three
things live there.

| Path | What |
| --- | --- |
| `/data/postgres` | The whole database — views, widgets, accounts, snapshots. |
| `/data/session_secret` | The key that signs your login cookie, generated on first start. It is kept in a file rather than an environment variable so that a restart does not log everybody out. |
| `/data/options.json` | The three options above, written by the Supervisor. |

The database listens on a Unix socket only, not on the network. Nothing outside
the add-on can reach it, and no port is published for it.

## Updating

When a new version is published, Home Assistant offers it on the add-on's page —
click **Update** there. It replaces the container and keeps `/data`, so your
views, accounts and settings come across untouched.

The rest of the update story — what survives, what a layout export does and does
not contain, and how to roll back — is on
[Updating and backups](updating-and-backups.md).

## If something does not work

| What you see | What it usually is |
| --- | --- |
| The page does not load right after installing | The database is still being created on the very first start. Read the **Log** tab and wait rather than restarting. |
| Logged out after every restart | Should not happen — the session key lives in `/data`. If it does, the **Log** tab will say why. |
| Calendars or weather stay empty | Those come from the internet, not from Home Assistant. The log says which request failed. See [Calendars](calendars.md) and [Weather providers](weather-providers.md). |
| A wall tablet refuses the address | Type it in full, including `http://` and the `:8098` port. Chrome, Edge and Brave silently upgrade bare addresses to HTTPS, and there is no certificate on that port. |

More in [Troubleshooting](troubleshooting.md).

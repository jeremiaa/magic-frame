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

If you are reading this on the machine that runs Home Assistant, this button
opens the dialog with the address already filled in — then skip to step 5:

[![Open your Home Assistant instance and show the dialog for adding a new add-on repository.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fjeremiaa%2Fmagic-frame)

The button goes through `my.home-assistant.io`, a redirector run by the Home
Assistant project. It holds no data about your instance: your browser stores
which address your Home Assistant has, and the redirect happens locally. If it
does nothing, you have not set that address yet — use the manual steps.

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

## The sidebar entry, and the address for displays

Magic Frame appears in the Home Assistant **sidebar**. Clicking it shows a
small start page with one button: **Open Magic Frame**. That button signs you
in and opens the editor as its own page — no password prompt, because Home
Assistant has already checked who you are.

Two rules govern that button:

- **Only Home Assistant admins get the automatic sign-in.** The add-on asks
  Home Assistant itself whether the clicking account is an administrator
  there. A restricted account — a child's, a guest's — sees the start page
  but is sent to the normal login instead. This is deliberate: hiding the
  sidebar entry from non-admins is a display setting in Home Assistant, not a
  lock, so the add-on checks the person rather than trusting the menu.
- The account it signs you into is the **oldest admin account** of your Magic
  Frame installation. Two-factor is not asked again — Home Assistant's own
  login already stood in front of this click.

To turn the automatic sign-in off, set the add-on option `ha_auto_login` to
`false`; the sidebar page then only links to the normal login. To remove the
sidebar entry entirely, use the **Show in sidebar** toggle on the add-on's own
page in Home Assistant.

The editor opens as a full page rather than embedded in the Home Assistant
frame. That is a consequence of how the app is built: the framework fixes its
base path when the app is compiled, and the address ingress serves an add-on
under is only known after installation. The one-click hand-off keeps every
part of the app working exactly as on any other install.

### The address for displays

Displays never go through the sidebar. The add-on stays reachable on a
**fixed port, 8098**:

| What | Address |
| --- | --- |
| The editor | `http://192.0.2.10:8098/editor` |
| A view, for a display | `http://192.0.2.10:8098/view/kitchen` |

— with your Home Assistant machine's own address in place of `192.0.2.10`.

A tablet screwed to the kitchen wall cannot type a password, and it needs one
fixed address it can be pointed at once and left alone. A view deliberately
needs no login — see [Views and displays](views-and-displays.md) — and behind
ingress that would stop being true, because ingress requires a signed-in Home
Assistant session. So displays keep the plain port, always.

Note for the automatic sign-in: it works when you reach Home Assistant on your
own network. Opened remotely (Nabu Casa, a tunnel), the button would point at a
port your remote connection cannot reach — use the normal login there.

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

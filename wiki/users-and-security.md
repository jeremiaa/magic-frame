# Users and security

Who can sign in to Magic Frame, how to make that sign-in harder to break, and —
just as important — an honest account of what is **not** behind a login at all.

Two words first, because the whole page turns on them:

- The **editor** is the part behind a login, at `/editor`. It is where layouts
  are built and settings are changed.
- A **view** is one screen's layout, at `/view/<id>`. It needs **no login, by
  design**, because a tablet on a wall cannot type a password.

Everything below is about the first one. The second one is the subject of
[What is not protected](#what-is-not-protected), further down.

---

## The first admin account

There is no default password shipped with Magic Frame, and no admin details in
any configuration file. The first account is created by the first person who
opens the app.

1. After installing, open `http://192.0.2.10/login` in a browser, using the
   address of the machine running Magic Frame.
2. Because no account exists yet, the page shows **Create first admin** instead
   of a login form.
3. Type an email address. It is only an identifier — no mail is ever sent to it,
   and it never leaves the machine.
4. Type a password of at least **8 characters**, then repeat it.
5. Click the button. You are signed in immediately and land in the editor.

That form is served by `/api/auth/setup`, and it refuses to run a second time —
once one account exists it answers with an error telling you to sign in. So
nobody who finds your address later can claim the installation, **as long as you
do the setup yourself, right after installing**. A freshly installed Magic Frame
that sits unclaimed on a reachable network is claimable by whoever gets there
first. Do this step immediately.

### How the password is stored

The password itself is never stored. What goes into the database is a **scrypt**
hash with a random 16-byte salt per user, and comparisons are done in constant
time so the answer cannot be guessed by measuring how long the check takes. The
same treatment is given to recovery codes. Nothing in Magic Frame can show you a
password again, including you.

---

## Adding more people

Two roles exist: **Admin** and **View only** (*Nur ansehen*).

1. Go to `Settings → Users` in the editor sidebar.
2. Type the person's email in the first box.
3. Type a password of at least 8 characters in the second box. You are choosing
   it for them — there is no invitation mail. Tell them the password, and tell
   them to change it under `Settings → Account`.
4. Pick the role.
5. Click **Create**. They appear in the list and can sign in right away.

To remove somebody, click **Delete** on their row and confirm. Two deletions are
always refused: your own account, and the last account with the Admin role — so
the installation can never end up with nobody who can manage it.

Only an Admin sees the form. A View-only account sees the list and a line of
text saying user management is admin-only. This runs through
`/api/admin/users` and `/api/admin/users/[id]`.

### What "View only" actually restricts — read this

**What View only blocks.** These need an Admin account, and answer 403 to
anybody else:

- creating and deleting users (`/api/admin/users`, `/api/admin/users/[id]`)
- the calendar OAuth and OpenWeatherMap credential fields
  (`/api/admin/oauth-credentials`, `/api/admin/owm-credentials`)
- the domain and certificate settings, and reloading Caddy (`/api/admin/caddy`,
  `/api/admin/caddy/reload`)
- dynamic DNS (`/api/admin/ddns`, `/api/admin/ddns/update`)
- the brute-force limits and the lockout list (`/api/admin/security`)
- the installation-wide default language (`/api/admin/locale-default`)
- uploading, changing and removing custom modules (`/api/admin/modules`,
  `/api/admin/modules/[id]`)
- restoring and deleting snapshots, and importing a backup
  (`/api/admin/backups/…`)
- connecting Todoist (`/api/admin/todoist`)

**What View only still permits.** Everything about the views themselves: a
View-only account can edit and save layouts, add and delete views, change
wallpapers, and mint itself a companion token. It can also export a backup.

So the name is about the *settings*, not about the dashboards. If you want
somebody to look at a screen and change nothing at all, give them the
`/view/<id>` address instead — that really is read-only, and needs no account.

Note that the control centre and the settings pages still load for a View-only
account; the cards it may not read say so rather than showing zeros.

---

## Changing a password

Each person changes their own, and nobody can change anybody else's.

1. Go to `Settings → Account`.
2. In **Change password**, type your current password.
3. Type the new one twice.
4. Click **Save password**. A green bar confirms it; you stay signed in.

The new password must be at least 8 characters and must be different from the
current one. A wrong current password gives a red bar and changes nothing.

**There is no password reset by mail.** If somebody forgets theirs, another
admin deletes the account and creates it again. If the *only* admin forgets
theirs, the account has to be replaced in the database directly — there is no
route in the application for it, which is deliberate. Make a second admin
account before you need one.

Sessions already open elsewhere are **not** invalidated by a password change.
Only changing `SESSION_SECRET` does that; see
[Sessions](#sessions-and-signing-out) below.

---

## Two-factor authentication

A second step at login: six digits from an authenticator app on your phone.
It is per account — you turn it on for yourself, and it does not affect anybody
else.

### Turning it on

1. Go to `Settings → Account` and find **Two-factor authentication (TOTP)**.
2. Click **Set up 2FA**. A QR code appears, with the same secret written out in
   text underneath for phones that cannot scan.
3. Open your authenticator app — Google Authenticator, 1Password, Aegis, Authy,
   whichever — and scan the code. The entry shows up as *Magic Frame* with your
   email under it.
4. Type the six digits the app is showing into the box.
5. Click **Confirm + activate**.
6. **Ten recovery codes appear in an amber panel.** This is the only time they
   are ever shown. Copy them somewhere safe now — a password manager, or paper
   in a drawer.
7. Click **I have saved them** to close the panel.

The codes look like `K7M2P-QR94T`. The alphabet leaves out `I`, `O`, `0` and `1`
so nothing is ambiguous when you copy one off paper.

### Signing in with it

1. Type email and password as usual.
2. A second screen asks for the six-digit code.
3. Type it and confirm.

The code changes every 30 seconds, and Magic Frame accepts the one before and
the one after as well, so a phone whose clock is slightly off still works. The
window between the password step and the code step lasts **5 minutes** — take
longer and you start again. Until the code is accepted you are **not** signed
in: the half-finished state is stored separately in the cookie and gives access
to nothing.

### When the phone is gone

On the code screen, click **Use recovery code** and type one of the ten. Each
one works **once** and is then gone for good. The card in Settings shows how
many are left.

Running low, or unsure whether the list leaked:

1. Go to `Settings → Account`.
2. In the two-factor card, type your **current password** in the box under
   *Generate new recovery codes*.
3. Click **Generate**.
4. Ten fresh codes appear. **All ten old ones stop working immediately.**

### Turning it off

In the red box at the bottom of the card, type your current password and click
**Disable**. The secret and all recovery codes are deleted from the database, so
turning 2FA on again later means scanning a new QR code.

**If you lose the phone and the recovery codes**, there is no way back in
through the interface. Another admin cannot reset it for you either — no route
in Magic Frame disables somebody else's 2FA. The account has to be replaced in
the database. This is the one place where having a second admin account, with
its own 2FA and its own codes, saves the day.

The routes behind all of this are `/api/auth/2fa/setup`,
`/api/auth/2fa/recovery-codes`, `/api/auth/2fa/disable` and, at login,
`/api/auth/login` followed by `/api/auth/login/totp`.

---

## Sessions and signing out

Being signed in means holding one encrypted cookie named `magic_session`. It
carries your user id, email and role, and nothing else — there is no session
table in the database.

`Settings → Security → Session & cookies` shows what that cookie is doing:

| Field | Value | Meaning |
| --- | --- | --- |
| Cookie Secure | follows `COOKIE_SECURE` | When `true` the cookie is only sent over HTTPS. |
| SameSite | `lax` | Another site cannot make your browser use it. |
| HttpOnly | yes | JavaScript on the page cannot read it. |
| Lifetime | 30 days | How long you stay signed in without touching it. |
| Session secret | *strong* / *weak* | Whether `SESSION_SECRET` is at least 32 characters. |

**There is no list of active sessions and no "sign out everywhere" button.** The
button on the card signs you out of *this* device only, by destroying this
cookie (`/api/auth/logout`). That is a deliberate choice, explained in the grey
note on the card: the only real way to invalidate every session at once is to
change the secret the cookies are encrypted with.

To sign every device out:

1. Open `.env` on the machine running Magic Frame.
2. Set `SESSION_SECRET` to a new random string of at least 32 characters. On
   Linux or macOS, `openssl rand -base64 48` in a terminal prints a suitable
   one.
3. Restart the stack from the folder holding `docker-compose.yml`:

   ```bash
   docker compose up -d
   ```

4. Every existing cookie is now undecryptable, so every browser lands on the
   login page. Your accounts and passwords are untouched.

---

## Brute-force lockout

Magic Frame counts failed logins and locks out after too many. It does what
`fail2ban` would do on the machine, but inside the application, so it keeps
working when a proxy sits in front.

Two counters run at once, at `Settings → Security → Login security`:

| | Default |
| --- | --- |
| Per address: failures / window / lockout | 5 in 15 minutes → locked 30 minutes |
| Per account: failures / window / lockout | 10 in 60 minutes → locked 60 minutes |

A locked login answers with an error saying how long is left, and the wrong
password is not even checked — so a locked account gives away nothing about
whether the password was right.

A **successful** login clears both locks. Waiting out the timer works too.

![The active-lock panel with one locked entry showing the reason, the minutes left, and a Release button.](img/users-and-security-lockouts.png)

To release a lock yourself — usually your own, after mistyping five times:

1. Go to `Settings → Security`.
2. Under **Active locks**, find the entry. It reads `ip:…` for an address or
   `user:…` for an account.
3. Click **Release** and confirm.

Underneath, **Last login attempts** folds out the most recent 50, with time,
address, email and result. This is where you find out whether anybody is trying.
All of it is `/api/admin/security`.

### Where the address comes from

Magic Frame only knows who tried to log in if the proxy in front of it says so.
Every reverse-proxy block it writes — with a domain or without — sets
`X-Real-IP` from the address Caddy itself accepted the connection from, so it
cannot be forged by a header the client sends along.

**If the address cannot be established, the per-address lock is skipped rather
than guessed.** The attempt is still recorded, shown as `unknown` in the list,
and the per-**account** counter still applies. That is deliberate: filing every
unknown attempt under one shared label would turn this protection into
something anybody could aim at your household — five wrong guesses and nobody
gets in for half an hour.

Two situations where that happens:

- **An old Caddyfile.** The generated file lives in a volume and is only
  rewritten when you save the hosting settings. An installation from before
  this changed keeps its old file until then. Open
  `Settings → Hosting & network` and press save once; the addresses appear.
- **Your own proxy in front.** Then `X-Real-IP` is your proxy's address and
  everybody behind it shares one entry. Set `TRUSTED_PROXY_HOPS` to the number
  of proxies between the internet and Magic Frame — with `2`, the second entry
  from the right of `X-Forwarded-For` is used, which is the one your outermost
  proxy wrote. If the chain is shorter than you declared, the address is
  treated as unknown rather than guessed.

---

## The companion token

A key that lets a script, an iOS Shortcut or a home automation talk to Magic
Frame without a browser session.

1. Go to `Settings → Devices & apps`.
2. The **Companion API Token** card shows the token behind dots. Click **Show**
   to read it, or **Copy** to put it on the clipboard.
3. Use it either as `?key=<token>` at the end of the address, or as an
   `Authorization: Bearer <token>` header.

Each account has its own token, generated the first time the card is opened
(`/api/auth/shortcut-token`). Anything done with it is done **as that account**.

It is accepted by four groups of routes — `/api/timers`, `/api/messages`,
`/api/shopping` and `/api/todos`, plus the single-item forms of each. It is not
a general key to the whole API: it does not open the editor, cannot change
settings, and cannot save layouts. [The companion API](companion-api.md) lists
what it can do.

Things to keep in mind:

- **A token in a web address ends up in logs** — the proxy's, the browser's
  history, whatever sits in between. The `Authorization` header is the tidier
  form where you have the choice.
- **Rotating breaks every shortcut.** The red **Rotate** button issues a new
  token and the old one stops working the same second. Do it if you think the
  token leaked, and expect to paste the new one into everything afterwards.
- Deleting a user deletes their token with them.

---

## What is not protected

This is the section to read before putting Magic Frame on the open internet.

### Views need no login, on purpose

`/view/<id>` is deliberately open. That is what makes a wall tablet work: it
powers on, opens one address, and shows the family calendar without anybody
typing anything. Anyone who can reach the address can see that screen — treat a
view like a picture hanging in the hallway, and do not put anything on it you
would not show a visitor.

### The routes a view needs are open too

A view is drawn by a browser with no session, which means everything it fetches
has to work without one. Among those: `/api/layout/get` (the layout itself),
`/api/calendar`, `/api/weather`, `/api/environment`, `/api/rss`,
`/api/ha/state`, `/api/ha/stream`, `/api/ha/entities`,
`/api/ha/camera/[entity]/snapshot`, `/api/wallpaper/immich/playlist` and
`/api/wallpaper/webdav/playlist`.

Two of those are worth naming individually:

- **`/api/ha/entities` lists every entity in your Home Assistant** with its
  current state — not only the ones a view uses.
- **`/api/ha/camera/[entity]/snapshot` returns a camera image** for any camera
  entity, whether or not a widget shows it.

### `/api/ha/action` has no session check at all

This is the one that matters most. `/api/ha/action` is the route a tile calls
when somebody taps a light on a view. It takes an entity, a domain, a service
and a payload, and forwards them to Home Assistant using the access token you
stored in Magic Frame.

**It checks no session** — that is what makes a tap on a wall panel work
without a login, and it will stay that way.

It does check two other things, and it did not always:

- **Which entity.** Every entity id in the outgoing request has to appear in one
  of your saved views. `light.kitchen` on a screen can be switched;
  `lock.front_door` that is on no screen cannot. That includes ids hidden inside
  the service payload, and it refuses `device_id` and `area_id` targets outright,
  because those name a set of entities this check cannot resolve.
- **Which service.** The verbs the widgets actually use are allowed —
  `toggle`, `turn_on`/`turn_off`, the cover controls, `lock`/`unlock`, `press`,
  the media transport — plus any `domain.service` you configured on a Button
  widget. Everything else is refused. Without that, one lamp on one view would
  have been enough to reach `hassio.host_reboot`, which ignores the entity it is
  given.

A signed-in editor session skips both, because the entity picker has to be able
to try things that are not on a screen yet.

If something you need is genuinely not on any view — a custom module with a
hard-coded entity, a script of your own — set
`MAGIC_FRAME_HA_ACTION_UNRESTRICTED=1` in your `.env` (add-on: the
`ha_action_unrestricted` option; Kubernetes: the same key in the ConfigMap) and
the old behaviour comes back in full.

The honest limit of all this:

> Anyone who can reach Magic Frame over the network can operate the things that
> are on your screens, without a password — the same as somebody standing in
> front of the tablet. What they can no longer do is reach past the screens into
> the rest of your house.

What to do about it:

- **Keep Magic Frame on your own network.** This is the intended shape, and on a
  home network the exposure is the same as the wall panel itself.
- **If you want access from outside, put something that authenticates in front
  of it** — a VPN back into your home, or a proxy that asks for a login before
  passing anything through. Do not simply forward port 80 and rely on the login
  page, because the login page does not cover these routes.
- **Give Home Assistant a token with only the access you need.** In Home
  Assistant, create the long-lived access token under a user that can reach the
  entities the dashboard uses and nothing more, rather than under your own admin
  account. See [Home Assistant](home-assistant.md).
- The [add-on](home-assistant-addon.md) does not change this. Home Assistant's
  own remote access sits in front of it, which helps — but on your local
  network the routes are reachable exactly as described.

### A missing session secret stops the editor, on purpose

`src/middleware.ts` is what redirects an unauthenticated visitor from `/editor`
to `/login`. If `SESSION_SECRET` is missing or shorter than 32 characters, it
now answers **HTTP 503 with a plain-text explanation** for `/login` and
`/editor`, and serves nothing behind them. The `/api/admin/…` routes are not
covered by that check and answer 500 instead — same cause, uglier message.

That is a deliberate change. It used to let the request through instead — no
redirect, no check, `/editor` open to anybody who asked. A missing secret is the
one condition under which the gate cannot work, so refusing is the only honest
answer; a login page that cannot verify anything is worse than a closed door.

**Your displays keep working.** `/view/…` never needed a session and is not
affected, so a wall panel carries on while you fix the secret.

**If you see that 503** — you cannot check `Settings → Security` for this,
because that page is behind the same closed door:

1. Open `.env` on the machine running Magic Frame.
2. Set a long random value, at least 32 characters:

   ```
   SESSION_SECRET="paste-a-long-random-string-of-at-least-32-characters"
   ```

   `openssl rand -base64 48` in a terminal prints a suitable one.
3. Restart the stack from the folder holding `docker-compose.yml`:

   ```bash
   docker compose up -d
   ```

4. Reload the editor. The Session-secret tile now reads *strong*, and `/editor`
   redirects to the login page when you are not signed in.

Where to change it depends on how you installed:

| Install | Where the secret lives |
| --- | --- |
| Docker Compose / the one-line installer | `SESSION_SECRET` in `.env` next to `docker-compose.yml` |
| Kubernetes | `SESSION_SECRET` in the **Secret**, or `appConfig.sessionSecret` for Helm — not the ConfigMap |
| Home Assistant add-on | generated and kept for you; nothing to do |

The one-line installer generates the value, and now also replaces one that is
too short and says so. A hand-written `docker compose` setup or a Kubernetes
manifest where the placeholder was never filled in is where this shows up — see
[Installation](installation.md).

---

## A short checklist

| | |
| --- | --- |
| Create the first admin the minute the install finishes | so nobody else can |
| Make a **second** admin account | the only cure for a lost password or a lost 2FA phone |
| `Settings → Security` says Session secret **strong** | otherwise `/login` and `/editor` answer 503 |
| Turn on 2FA before anything is reachable from outside | `Settings → Account` |
| Keep the ten recovery codes somewhere that is not the phone | they are shown exactly once |
| Do not port-forward Magic Frame directly | the display routes do not check a login, by design |
| Give Home Assistant a token scoped to what the dashboard needs | it is the ceiling on what an open route can do |

## Where to go next

- [Settings](settings.md) — every section of the settings page
- [Hosting and your domain](hosting-and-domain.md) — HTTPS, dynamic DNS, and
  running behind your own reverse proxy
- [Views and displays](views-and-displays.md) — the public `/view` address and
  how to set up a kiosk
- [The companion API](companion-api.md) — what the token can actually do

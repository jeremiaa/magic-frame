# The Magic Frame wiki

Magic Frame is a self-hosted dashboard for tablets, monitors, wall panels and
digital picture frames. One machine on your network runs it; every display opens
one URL and shows one layout. Photos come from your own Immich or a network
folder, home control from your own Home Assistant. Nothing goes to a cloud.

This wiki is written to be read two ways. A person reads the page they need and
learns how that part works. An agent reads the same page and gets exact
component names, exact routes and exact limits — no marketing, no "should", no
invented options.

**Everything here is derived from the code and checked against it.**
`scripts/check-wiki.mjs` runs in CI: every widget must have a section, every
`/api/` path named must be a real route, every internal link must resolve, every
page must appear in the index and in `llms.txt`, and no example may contain a
real address. Documentation that drifts turns the build red.

Screenshots are held to the same standard. Each one records which source files
it shows; when one of those changes the check says which pictures have started
lying, and `scripts/shoot-wiki.mjs` retakes them.

## Start here

| If you are | Read |
| --- | --- |
| new to Magic Frame | [Getting started](getting-started.md), then [Concepts](concepts.md) |
| installing it | [Installation](installation.md) |
| running Home Assistant | [The Home Assistant add-on](home-assistant-addon.md) |
| building your first layout | [The editor](the-editor.md) → [Widgets](widgets.md) |
| setting up a wall tablet | [Views and displays](views-and-displays.md) |
| doing the photo-frame thing | [Wallpapers](wallpapers.md) → [Immich](immich.md) |
| connecting your home | [Home Assistant](home-assistant.md) |
| an AI agent | [`/llms.txt`](../llms.txt) for the map, [`/llms-full.txt`](../llms-full.txt) for everything |
| stuck | [Troubleshooting](troubleshooting.md) |

## Everything

### Starting

- [Getting started](getting-started.md) — install it, sign in, put something on a screen
- [Concepts](concepts.md) — the nouns this product is made of, and how they nest
- [Installation](installation.md) — every way to install, and which one to pick
- [The Home Assistant add-on](home-assistant-addon.md) — repository URL, install, options, what differs
- [Updating and backups](updating-and-backups.md) — updating, what a backup contains, restoring, rolling back

### Using it

- [The editor](the-editor.md) — control centre, the view list, the grid, the inspector, saving
- [Views and displays](views-and-displays.md) — one view per display, the public `/view` URL, kiosk setup
- [Wallpapers](wallpapers.md) — every source, fit modes, split view, the photo info bar
- [Widgets](widgets.md) — the catalogue, and the behaviour every widget shares
- [Time and weather widgets](widgets-time-weather.md) — Clock, Weather, Environment
- [The calendar widget](widgets-calendar.md) — list, agenda and month views, and every feed type
- [Home Assistant widgets](widgets-home-assistant.md) — Entity, Notification, Camera, Sensor, Button
- [Media and photo widgets](widgets-media.md) — Image, Media player, RSS, QR, Status
- [Family widgets](widgets-family.md) — Timer, Messages, Shopping list, Todos
- [Stacking and visibility](stacking-and-visibility.md) — overlapping widgets, and showing them by state
- [Themes and styling](themes-and-styling.md) — light and dark, glass, colours, fonts, corners

### Connecting things

- [Home Assistant](home-assistant.md) — connecting, entities, lists, actions, live state
- [Immich](immich.md) — the global connection, albums, people, favourites, memories
- [Calendars](calendars.md) — iCal, Google, Microsoft, Home Assistant calendars
- [Weather providers](weather-providers.md) — Open-Meteo, DWD, OpenWeatherMap, a Home Assistant entity
- [Other sources](other-sources.md) — WebDAV folders, Todoist, RSS feeds

### Running it

- [Settings](settings.md) — every section of the settings page
- [Users and security](users-and-security.md) — accounts, two-factor, sessions, what is exposed
- [Hosting and your domain](hosting-and-domain.md) — ports, HTTPS, your own reverse proxy, no proxy at all
- [Troubleshooting](troubleshooting.md) — the failures people actually hit, and what causes them

### Extending it

- [The companion API](companion-api.md) — driving Magic Frame over HTTP, and iOS Shortcuts
- [Custom modules](custom-modules.md) — installing a widget somebody else wrote
- [Writing a module](module-development.md) — building your own widget

---

## Conventions

These are the rules for writing here. They exist because documentation rots in
predictable ways, and each rule blocks one of them.

### Every statement must be checkable in the code

Name the real component, the real route, the real config key. If you cannot find
it in the source, do not write it. "Should", "probably" and "may" are how a guess
gets published — if you are unsure, leave it out and say so instead.

The check enforces the mechanical part of this. It cannot tell whether a
sentence is *true*, only whether the things it names *exist*. The rest is on the
writer.

### No page assumes another page has been read

Someone arrives from a search engine, and an agent fetches one page to answer one
question. Both need the page to stand on its own: state its own nouns, spell out
the exact names, link sideways instead of relying on order.

This is also why `llms-full.txt` works — each page is a usable answer by itself.

### Write for someone who has never done this

The reader may never have used Docker, Home Assistant or a terminal. They bought
a cheap tablet and want family photos and the school calendar on the kitchen
wall. Write for that person and the technical reader is served too; write for the
technical reader and the first one leaves.

In practice:

- **Name where to click, every time.** "Editor → Integrations → Home Assistant",
  not "in the integration settings". A person who does not know the app cannot
  find a place you only describe.
- **One action per step.** Numbered steps for anything with an order. If a step
  has an "and" in it, it is two steps.
- **Say what should happen after each step.** "The list fills with your albums."
  Without that, a reader who sees nothing has no idea whether they broke it.
- **Explain the word the first time it appears on the page.** *View*, *entity*,
  *feed*, *reverse proxy* — one clause is enough, every time, on every page.
- **No shell command without saying what it does and where to run it.**
- Prefer the short common word. *Delete* over *purge*, *folder* over *directory*.

### Write what it does, not what it is for

"The Image widget shows one photo or cycles through an Immich album" beats "The
Image widget brings your memories to life". Marketing copy belongs on the
website; this is the manual.

### Say what does not work

Limits, missing features and known failure modes are the most useful sentences
on any page, and the first ones a writer is tempted to skip. If a display goes
black when Immich is unreachable, that belongs on the wallpaper page.

### German is the product, English is the wiki

The interface ships German-source with an English translation. The wiki is
English only. When naming a control, use the English label the user sees, and
put the German in brackets where confusion is likely — `Settings → Hosting &
Netzwerk`.

### Never a real address

No example may contain a real hostname, IP, mail domain or token. Use
`192.0.2.10` (reserved for documentation), `example.com`, and obviously invented
names. The check fails on the maintainer's own machines and addresses, because
those are the ones that slip in while testing.

### Screenshots

A picture is a claim like any sentence, and it is the one nobody re-reads. So it
is tied to the code it shows:

- Every shot is described in `screenshots.json` with an `id`, the `page` it
  belongs to, a `caption`, the source files it `shows`, and the content hashes of
  those files at `takenAt`.
- A page references a shot only as `![caption](img/<id>.png)`. Nothing else —
  that is what makes replacing one a matter of replacing a file.
- Light and dark variants both exist: `<id>.png` and `<id>-dark.png`.
- When a file in `shows` changes, the check fails and names the shot. Retake it:
  `node scripts/shoot-wiki.mjs <id>`.

Shots are taken against a throwaway instance with invented content — never
against a running household. See the header of `scripts/shoot-wiki.mjs`.

**A screenshot must show a worked example, not an empty screen.** An empty form
teaches nothing; the same form filled in teaches the whole task at a glance. So
the seeded instance carries a plausible household — a family calendar with real
looking entries, an album of photos, a handful of home entities — and shots are
framed on the thing being explained:

- Show the finished result before the steps that build it, so the reader knows
  what they are aiming at.
- Fill every field that the text tells the reader to fill.
- Crop to the panel under discussion. A full-screen shot of a 4K dashboard is
  unreadable on a phone, and the reader cannot tell where to look.
- Caption every shot with what to notice, not with what it is. "The album picker
  after connecting: each album shows its photo count" beats "The album picker".

### The two machine files

- `llms.txt` — the map. Every page, one line each. Hand-written.
- `llms-full.txt` — every page concatenated. **Generated** by
  `scripts/build-llms.mjs`; the check fails if it is out of date. Never edit it.

### When you change the code

Changing a widget, a route or a setting means changing the page that documents
it, in the same commit. That is not politeness — the check will stop the build
otherwise, which is the point. A wiki that can drift does drift.

### The two READMEs are one document

`README.md` and `README.de.md` are the same page in two languages. A change to
one is not finished until the other has it. The check compares their structure
rather than their prose: every `## ` heading carries an anchor comment
(`<!-- s:widgets -->`), and the two files must carry the same anchors in the
same order and link the same wiki pages. Neither may point at a file that does
not exist, and neither may name a real address.

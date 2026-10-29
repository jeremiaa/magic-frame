<!--
Home Assistant zeigt diese Datei im Update-Dialog des Add-ons — und zwar nur
den Teil von der angebotenen bis zur installierten Version. Es schneidet an
Überschriften, die GENAU "## <version>" lauten: kein "v" davor, kein Datum
dahinter. Sonst bekommt der Nutzer die ganze Datei.

Eine Zeile pro Punkt, nicht umbrechen: der Dialog kann Zeilenumbrüche als
Umbrüche anzeigen, und auf dem Handy reißt das Sätze mitten durch.

scripts/check-wiki.mjs prüft, dass die Version aus package.json hier steht.
-->

# Changelog

What each version changes, in short. The full notes are on the [releases page](https://github.com/jeremiaa/magic-frame/releases).

## 1.5.11

- School rotation: an activity written as *Art / Violin* gets the icon of the part the widget knows, and one it doesn't know gets a plain dot that every screen can draw. By @sth2258.
- Norwegian for the School rotation and Digests, digest text included, by @ghveem.
- The Digests pages call their second field *Address* instead of *Slug*, and their heading follows the language.

[Full notes for 1.5.11](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.11)

## 1.5.10

- **New: Digests.** Widgets you pick — school rotation, calendar, to-dos, shopping list, weather, sensors — as plain text at an address Home Assistant can read, to send on as a phone notification or an SMS. In the editor under *Digests*, which also shows the Home Assistant configuration to copy. Built by @sth2258.
- The text says what the tile on the wall says: same sources, same lists, same school holidays — in your installation's language.

[Full notes for 1.5.10](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.10)

## 1.5.9

- **New widget: School rotation.** For schools that plan by a cycle of days rather than by weekday: it counts through the school year, shows each child's day and the next school days, and pauses on days without school — taken from a Home Assistant calendar or a list of dates. Weekly reminders on top, like *Friday: bring the gym bag*. Started by @sth2258.
- Norwegian for the texts that came with 1.5.7 and 1.5.8, by @ghveem.

[Full notes for 1.5.9](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.9)

## 1.5.8

**A security release — please update.**

- A display's view carried stored passwords and keys: a NAS folder's login, a view's own Immich key, and on some installs a Home Assistant token. Only an admin signed in to the editor gets them now. If people you don't trust could reach your Magic Frame, change those passwords and keys after updating.
- The settings, the layout export and the calendar sign-in were closed the same way.
- Agenda: *Max events per day* limits each day again, not the whole agenda.

[Full notes for 1.5.8](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.8)

## 1.5.7

- **The MCP server is visible:** Settings → Devices & apps shows its address and a ready-made command for Claude Code.
- Agents can keep the household too: notes on the wall, the shopping list, to-dos and timers.

[Full notes for 1.5.7](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.7)

## 1.5.6

- **New option *Public address*:** where the sidebar page links to, for when Magic Frame is reachable over https under its own name — behind your own reverse proxy, for example. Left empty, nothing changes.
- Brazilian Portuguese by @leodabague, Norwegian dates by @ghveem, Todoist sections by @NiviJah, and an iCloud Shared Album as wallpaper by @justinreeves00.

[Full notes for 1.5.6](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.6)

## 1.5.5

- *Add to Home Screen* on a phone or tablet opens the view you were on, not the editor. By @sth2258.
- Wallpapers can change as slowly as once a day, and an automation can move a display on to the next picture. By @sth2258.
- The weather's *Feels like* line can be switched off.

[Full notes for 1.5.5](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.5)

## 1.5.4

- Two new weather providers by @sth2258: Weather Underground and Pirate Weather. Their keys are read from `.env` only for now, so the add-on can't use them yet.
- Norwegian (Bokmål and Nynorsk) by @ghveem, a blur slider for the calendar, and two example modules.

[Full notes for 1.5.4](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.4)

## 1.5.3

- The add-on's status tile says **connected** — it looked for a token, and the add-on needs none.
- A Buttons widget can work as a pop-up over the view, by @deespater. Custom modules can use hooks again.

[Full notes for 1.5.3](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.3)

## 1.5.2

**Update if you are on 1.5.1** — it shipped the add-on broken.

- 1.5.1 tried to run Magic Frame inside the Home Assistant frame and broke it, there and on its own port. 1.5.2 goes back to the image Docker installs use. The sidebar shows a page with a button that opens the editor in a new tab.
- The one-click sign-in no longer sends the browser to `localhost:3000`.
- If you reach Home Assistant over https, that button can't open an http address — browsers block it. Open the address in a new tab yourself.

[Full notes for 1.5.2](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.2)

## 1.5.1

- The sidebar button opens Magic Frame; it used to land on a "disconnected" page.
- Integrations shows Home Assistant as connected instead of two empty fields — the add-on connects through the Supervisor, no token needed.
- Every view card in the editor shows the address a wall tablet needs.
- If a power cut leaves the database unfinished, the add-on moves it aside under a dated name and starts a fresh one instead of failing to start. Nothing is deleted.
- A camera can go fullscreen on a trigger entity of its own and stay there for a hold time, built on @chimmidev's pull request.

[Full notes for 1.5.1](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.1)

## 1.5.0

- **Magic Frame sits in the sidebar**, with its own icon. Clicking it signs a Home Assistant admin straight into the editor; *One-click sign-in from the sidebar* turns that off.
- CalDAV calendars (Nextcloud, iCloud, Synology and others), built by @chimmidev.
- A doorbell camera can go fullscreen on a Home Assistant trigger, notification tiles can follow the entity's state, and a Text widget labels the widgets around it.
- An MCP server for AI agents.

[Full notes for 1.5.0](https://github.com/jeremiaa/magic-frame/releases/tag/v1.5.0)

## 1.4.0

- **A display can only use what is on your views.** Without a login it may only switch entities that appear on a saved view. *Allow displays to control any entity* lifts the limit, for setups where something outside the views needs to reach Home Assistant.
- Shopping and to-do lists can be ticked off from a display.
- Admin settings need an admin account. The documentation is at [magicframe.dev/docs](https://magicframe.dev/docs/).

[Full notes for 1.4.0](https://github.com/jeremiaa/magic-frame/releases/tag/v1.4.0)

## 1.3.4

- **The first version as a Home Assistant add-on.** Postgres comes with it, Home Assistant connects without an access token, and backups are taken with the add-on stopped, so the database is always consistent. Wall tablets open their views on port 8098 without a login.
- The Image widget can fit a photo with a blurred fill, and Immich people can be a wallpaper source.

[Full notes for 1.3.4](https://github.com/jeremiaa/magic-frame/releases/tag/v1.3.4)

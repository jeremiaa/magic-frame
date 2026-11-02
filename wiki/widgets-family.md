# Family widgets

Four widgets for the things a household actually puts on a kitchen screen: the
**Timer** (`TimerWidget.tsx`), **Messages** (`MessagesWidget.tsx`), the
**Shopping list** (`ShoppingListWidget.tsx`) and **To-dos**
(`TodosWidget.tsx`).

They differ from the rest of the catalogue in one way: they hold their own data.
There is nothing to connect first. You add the widget, and it works — but most of
the point is putting things *onto* the screen from elsewhere, which is what
[The companion API](companion-api.md) is for.

A fifth belongs to the same kitchen: the **School rotation**
(`SchoolRotationWidget.tsx`), for schools that run on a rotating plan of days
instead of weekdays. It is described [at the end of this page](#school-rotation).

All four also have the shared settings — font, colour, shadow, hiding rules —
described once in [Widgets](widgets.md).

## Timer

Running timers with a countdown and a progress ring. Started from a phone, ended
at the screen.

![The Timer widget: two timers, one counting down with a green ring, and one finished — ringed orange and reading DONE.](img/timer-countdown.png)

### Setting it up

1. Add a **Timer** widget to the view.
2. That is the whole setup. It shows "No active timer" until one starts.
3. Start one to see it work — see below.

### Starting a timer

Timers are started over HTTP, not in the widget:

```
POST /api/timers?key=TOKEN&label=Pasta&minutes=10
```

`TOKEN` is your personal companion token from `Settings`; the whole mechanism,
including ready-made iOS Shortcuts, is on
[The companion API](companion-api.md). `minutes`, `seconds` and `durationMs` all
work, and adding `&dashboardId=<view id>` sends the timer to one screen instead
of all of them.

A timer is **capped at 24 hours**, so a mistyped number cannot leave a ten-year
countdown on the wall.

### On the screen

- Each timer shows its label, a countdown, and a ring that empties as it runs.
- A finished timer turns orange, says **DONE**, and pulses gently. It does not
  make a sound; the screen is the alarm.
- The ✕ on a timer ends it, on every display at once.

New timers appear on all displays **within a second** without a reload, over the
same live connection the editor uses for saving layouts.

### Options

| Setting | Default | What it does |
| --- | --- | --- |
| `maxTimers` | 4 | How many timers to show at once. The slider goes to 6. |
| `hideWhenEmpty` | off | Hide the whole widget when no timer is running, instead of showing "No active timer". |

**The widget never draws more than 4 timers**, whatever `maxTimers` says. The
slider allows 5 and 6, and those values are stored, but the display caps at 4 and
puts the rest in a `+2 more` line at the bottom. Treat 4 as the real maximum.

Timers can also appear as cards inside the
[Notifications widget](widgets-home-assistant.md), which is how most people run
them: one stack with alerts and timers in it, rather than a separate tile that is
empty most of the day.

## Messages

Short notes on the screen. "Back at six", "Vet at 4pm", "Well done on the test".

![The Messages widget: notes on dark cards, each with how long ago it was posted and a cross to clear it.](img/messages-notes.png)

### Setting it up

1. Add a **Messages** (`Nachrichten`) widget.
2. Nothing to configure. It shows "No messages" until one arrives.

### Posting a message

```
POST /api/messages?key=TOKEN&text=Hallo&ttlSec=3600
```

- `ttlSec` makes the message expire by itself after that many seconds. Without
  it, the note stays until somebody clears it.
- `imageUrl` adds a small picture beside the text.
- `dashboardId` sends it to one view instead of all of them.

Again, `TOKEN` and the Shortcut recipes are on
[The companion API](companion-api.md).

### On the screen

Newest first. Each note shows how long ago it arrived, in words ("about 2 hours
ago"), in your app language. The ✕ removes it everywhere.

Expired messages disappear without a reload: the widget re-checks its own list
every 30 seconds, so a note with a one-hour life really is gone an hour later
even on a display nobody has touched.

### Options

| Setting | Default | What it does |
| --- | --- | --- |
| `maxMessages` | 5 | How many notes at once, 1–10. Older ones stay in the list and reappear as newer ones are cleared. |
| `hideWhenEmpty` | off | Hide the whole widget when there are no messages. |

## Shopping list

A shared shopping list. Tick an item on the kitchen screen and it is ticked on
everyone's phone.

![The Shopping list widget: unticked items first, with the ticked ones counted in the header.](img/shopping-list.png)

### Setting it up

1. Add a **Shopping list** (`Einkaufsliste`) widget.
2. Under **Source** (`Quelle`), choose where the list lives — **Local**, **Home
   Assistant** or **Todoist**. Local needs nothing further.
3. Type an item into the field at the bottom and press enter. It appears at once
   on every other display.

### The three sources

| Source | Where the items live | What it needs |
| --- | --- | --- |
| `local` | In Magic Frame's own database | Nothing. |
| `ha` | A `todo.*` list in your Home Assistant — its own shopping list, or one from an integration | A [Home Assistant connection](home-assistant.md). Pick the list from the dropdown; **Refresh** re-reads it. |
| `todoist` | A Todoist project | A Todoist token under `Editor → Integrations`, described in [Other sources](other-sources.md). Then pick the project. |

Which you pick changes only where the items are kept; the widget looks and
behaves the same. Choose Home Assistant if your voice assistant already adds to a
list there, Todoist if the family already uses Todoist, and Local if neither.

**Local lists update live; the other two are polled every 10 seconds.** Adding an
item on your phone therefore appears instantly with a local list and within ten
seconds with the other two.

### On the screen

- Unticked items first, then a **Done** divider, then the ticked ones, struck
  through and dimmed.
- Tapping an item ticks or unticks it.
- The small bin icon in the header, with a number beside it, clears everything
  ticked. It asks first.
- Item text understands a little markup: `**bold**`, `*italic*`, `~~struck
  through~~`, `` `code` `` and `[label](https://example.com)`, which becomes an
  underlined word you can tap to open the link.

### Options

| Setting | Default | What it does |
| --- | --- | --- |
| `listSource` | `local` | `local`, `ha` or `todoist`. |
| `haListEntity` | — | Which `todo.*` list, with `listSource: ha`. |
| `todoistProjectId` | — | Which project, with `listSource: todoist`. |
| `title` | "Shopping list" | Your own heading. |
| `hideHeader` | off | Drop the heading row entirely. |
| `hideCount` | off | Keep the heading but drop the item count after it. |
| `hideAddForm` | off | Remove the input field, making the list read-only on this screen. |

Todoist's own API only returns open tasks, so a Todoist-backed list shows nothing
under **Done**. Clearing ticked items there deletes whatever this display has
just ticked, because Todoist has no "throw away everything completed" call.

## To-dos

The same idea for tasks: what has to be done, optionally filtered to one person.

![The To-dos widget: open tasks with the person they belong to and when they are due; the overdue one is ringed in red.](img/todos-list.png)

### Setting it up

1. Add a **To-dos** (`Todos`) widget.
2. Choose the **Source** — the same three as the shopping list.
3. With the **Local** source, optionally set **Filter to person**
   (`Filter auf Person`) to a name. The widget then shows only that person's
   tasks, and anything typed into it is assigned to them.

One widget per child, each filtered to a name, is the usual arrangement on a
family screen.

### On the screen

- Open tasks first, then a **Done (12h)** divider, then anything completed in
  the last 12 hours — so a child sees what they finished today and it clears
  itself overnight.
- Tapping a task completes it, and tapping again un-completes it.
- A due date shows as **today**, **tomorrow**, or a short date. Anything overdue
  gets a red outline and a red date.
- The tick box is coloured by priority when the task is done: red for high, green
  for normal, blue for low.
- Task text understands the same small markup as the shopping list, which is
  what makes a Todoist task with a link in it readable here.

### Options

| Setting | Default | What it does |
| --- | --- | --- |
| `listSource` | `local` | `local`, `ha` or `todoist`. |
| `haListEntity`, `todoistProjectId` | — | Which list or project, as above. |
| `assignee` | — | Local source only: show only this person's tasks, and assign new ones to them. |
| `title` | "To-dos" | Your own heading. With a filter set, the person's name is appended to it. |
| `hideHeader`, `hideCount`, `hideAddForm` | off | As on the shopping list. |

Adding tasks from a phone:

```
POST /api/todos?key=TOKEN&title=Take+the+bins+out&assignee=Emma&priority=high
```

`priority` takes `low`, `normal` or `high`, and `dueDate` takes an ISO 8601 date.

**Home Assistant and Todoist lists carry less.** Both are simple lists of titles,
so a task from them has no assignee, and only Todoist supplies a due date and a
priority. The person filter is therefore only offered with the local source.

## School rotation

Some schools do not plan by weekday but by a cycle of days: day 1 is gym and
music, day 2 is art, and after day 6 it starts again at day 1 — whatever weekday
that falls on. Holidays and days off pause the cycle. The **School rotation**
widget (`Schulrotation`, `SchoolRotationWidget.tsx`) keeps count, shows today's
day for each child, and what the next school days bring.

The idea and the first version came from @sth2258, as a custom module first and
then as this widget.

![The School rotation widget: today's rotation day as a badge, each child's activities underneath, a reminder for the day, and the next school days.](img/school-rotation.png)

### Setting it up

1. Add a **School rotation** (`Schulrotation`) widget.
2. Under **School year** (`Schuljahr`), enter the **first** and the **last day of
   school**. Without both the tile asks for them; it never guesses a year.
3. Set the **Rotation cycle** (`Rotationszyklus`) — how many days the plan has
   before it repeats, 2 to 10.
4. Under **Children** (`Kinder`), click **Add child** (`Kind hinzufügen`) for each
   child. Give the card a name and fill in each rotation day with the subjects or
   activities, separated by commas: `Gym, Music`.
5. Tell it which days have no school — see below.

### How the count works

The widget walks the school year day by day from the first day of school.
Saturdays and Sundays never count, and neither does any day without school.
Every other day is the next day of the cycle: rotation day =
((school days so far − 1) mod cycle) + 1. So a holiday does not skip a rotation
day; the day after it simply continues where the plan left off.

### Days without school

Two ways, and they add up:

- **A Home Assistant calendar** (`Ferienkalender aus Home Assistant`): pick a
  `calendar.*` entity, for example a school-holiday calendar from a Home
  Assistant integration. Every **all-day** event in it pauses the count for each
  of its days — holidays, public holidays, days off. Events with a time, such as
  a parents' evening at seven, do not. The widget reads the calendar through
  `/api/calendar` for the whole school year and again every six hours. If the
  calendar cannot be read, the tile says **Holiday calendar unreachable** rather
  than quietly counting holidays as school days.
- **A list of dates** (`Weitere schulfreie Tage`): one per line as `YYYY-MM-DD`,
  then a reason — `2026-12-21 Christmas holidays`. Lines starting with `#` are
  skipped. When a date is in both, the reason from the list is shown.

### Weekly reminders

Under **Weekly reminders** (`Wöchentliche Erinnerungen`), each reminder has a
day, a text, an optional emoji and optionally one child — "Friday: bring the
gym bag" for Mia. It appears on that day, but only when there is school, as an
amber line under the day's activities. A reminder for a child takes that child's
colour.

A reminder's day is either a **weekday** (fixed to the calendar, like the gym
bag above) or a **rotation day** (tied to the cycle, like "the day before
library"). Rotation-day reminders stay correct even when breaks shift the
cycle relative to the calendar, where a fixed weekday would eventually point
at the wrong day.

### On the screen

- On a school day: a badge with the rotation day in the accent colour, then one
  line per child with that day's activities — each in the child's own colour,
  with a small icon for common subjects.
- On a weekend or a day without school: **No school**, with the reason when the
  list or the calendar gives one.
- Underneath: **Tomorrow** — or **Next school day** with its date — and, if
  switched on, the following school days with their rotation day.
- Before the first day of school it shows when school starts; after the last day,
  **School's out**.
- A schedule that cannot be read shows **Schedule unreadable** instead of
  breaking the tile.

### Options

| Setting | Default | What it does |
| --- | --- | --- |
| `startDate`, `endDate` | — | The first and last day of school, `YYYY-MM-DD`. Both are needed. |
| `cycleDays` | 6 | Days in the plan before it repeats. |
| `schedules` | — | The children, as JSON text: `[{"name":"Mia","days":{"1":"Gym, Music","2":["Art"]}}]`. A day can be a list or text with commas. |
| `noSchoolCalendar` | — | A `calendar.*` entity whose all-day events pause the count. |
| `noSchoolDates` | — | More days without school, one `YYYY-MM-DD reason` per line. |
| `reminders` | — | JSON text: `[{"day":"Friday","text":"Gym bag","icon":"🎒","kid":"Mia"}]`. German weekday names work too. `day` can also be a rotation-day number instead of a weekday, e.g. `{"day":3,"text":"Return library books","icon":"📚"}`. |
| `showUpcoming`, `upcomingCount` | on, 3 | The list of following school days and how many. |
| `accentColor` | blue | The colour of the day badge and the dates. |

### Coming from the example module

Up to 1.5.8 this was an example custom module (`custom:school-rotation`). An
installed copy keeps working — the module system is unchanged. To move over, add
the widget, open **Edit as JSON** (`Als JSON bearbeiten`) at the bottom of its
settings, paste the module's schedules and reminders, and enter the year and the
no-school dates.

## Ticking things off at the display needs a login

This is the sharp edge of these four widgets, and it is worth knowing before you
screw a tablet to the wall.

**With the `local` source, writing needs a signed-in browser or a token.** The
view address (`/view/<id>`) deliberately needs no login, so a kiosk display has
neither. Adding an item, ticking one off, clearing the done ones, dismissing a
message or ending a timer from such a display is rejected by the server, and the
widget does not say so — it removes the item on screen straight away and only
puts it back the next time the list reloads.

What that means in practice:

- On **your own laptop or phone, signed into `/editor`**, everything works: the
  same browser session authorises the writes.
- On a **wall tablet showing `/view/<id>`**, the local list is effectively
  read-only.
- The **Home Assistant and Todoist sources are not affected.** Those writes go
  through Magic Frame's own connection to those services, which does not depend
  on who is looking. A wall tablet can tick off a Home Assistant or Todoist list
  perfectly well.

So: for a display that people should be able to tick things off on, point the
shopping list and the to-dos at a Home Assistant `todo.*` list or a Todoist
project. This is a defect rather than a decision, and it may change; until then,
that is the way around it.

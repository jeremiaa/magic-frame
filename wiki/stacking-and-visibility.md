# Stacking and visibility

Widgets in Magic Frame may sit **on top of each other**, and a widget may be
**hidden until something makes it appear**. Put the two together and one screen
can hold several layouts: a calendar that a button swaps for a shopping list, a
doorbell camera that covers half the wall for twenty seconds and then vanishes
again.

A **widget** is one tile on a view; a **view** is one screenful, laid out on a
grid of 24 columns and 24 rows. This page assumes you have found the editor —
see [The editor](the-editor.md).

## Putting one widget on top of another

The grid does not push anything out of the way. Drag a widget over another one
and it stays exactly where you dropped it; both keep their cells. Two widgets
can occupy precisely the same cells, and then only the front one is visible.

That is true in the editor and on the display, so what you build is what the
screen shows.

The obvious problem is selecting a widget you cannot see, which is what the
layer list is for.

## The layer list

**Ebenen** (Layers) sits in the left column of the editor, under the widget
catalogue. It lists every widget on the view, **front-most at the top**.

- **Click an entry to select it**, even if it is completely covered, and even if
  it starts out hidden. The inspector opens on it.
- **The selected widget floats to the front of the canvas** while it is
  selected, so you can drag and resize it. That is an editing convenience only —
  it does not change its real stacking order and does not affect the display.
- **An eye icon** marks the widgets that start hidden.
- **Drag an entry by its handle** and drop it on another entry to change the
  order. Everything is re-numbered from front to back, and the numbering is
  stored with each widget, so the order survives saving, duplicating and
  renaming the view.

The layer list is part of the left column, so it is not available on a narrow
editor window.

## Making a button show and hide other widgets

The **Buttons** widget (`ButtonWidget.tsx`) holds up to four buttons, and each
one can show, hide or toggle any set of other widgets on the same view.

A worked example — one tile that swaps the calendar for the shopping list:

1. Place a **Kalender** (Calendar) widget and an **Einkaufsliste** (Shopping
   list) widget in the **same** grid cells, one on top of the other. Use the
   layer list to pick whichever one you cannot see.
2. Select the shopping list, open the inspector's **Layout** tab, and switch on
   **Beim Laden versteckt** (Hidden on load). It now has the eye icon in the
   layer list.
3. Add a **Buttons** widget somewhere free.
4. In its inspector, open the **Inhalt** (Content) tab and stay on the **Btn 1**
   sub-tab.
5. Give the button an icon — press the icon field and search for `list`, for
   example — and optionally a label. **A button with no icon, no label and no
   linked widgets is not drawn at all**, which is how the other three slots stay
   out of the way.
6. Under **Aktion** (Action), choose **Widgets umschalten (toggle)**.
7. **Verlinkte Widgets** (Linked widgets) appears, listing every other widget on
   the view. Tick both the calendar and the shopping list.
8. Press **Speichern** (Save).

Tapping that button now hides whichever of the two is showing and shows the
other one.

### The actions a button can run

| Action | Dropdown entry | What it does |
| --- | --- | --- |
| `toggle` | Widgets umschalten (toggle) | Each linked widget flips: visible becomes hidden, hidden becomes visible. |
| `show` | Widgets einblenden | Each linked widget is shown, whatever it was. |
| `hide` | Widgets ausblenden | Each linked widget is hidden, whatever it was. |
| `ha_toggle` | HA-Entity toggeln | Toggles a Home Assistant entity. Nothing to do with widget visibility. |
| `ha_service` | HA-Service-Call | Calls a Home Assistant service. |
| `webhook` | Webhook (POST) | Sends a POST to a web address. |
| `refresh` | Seite neu laden | Reloads the whole display. |
| `none` | Keine | Nothing. |

Each of the four buttons also has a **Langer Druck** (Long press) action, with
the same list, fired after holding the button for half a second. On a tablet the
device vibrates briefly when it fires. Leave it on `Keine` unless you want it;
a long press that does nothing is better than one that surprises somebody.

The Home Assistant actions, and the button widget's own looks, are covered in
[Home Assistant widgets](widgets-home-assistant.md).

### Why links keep working after a save

A button stores the **ids** of the widgets it targets, not their names. Those
ids get rewritten when a view is saved, duplicated or renamed — and every one of
those rewrites carries the button's links along with it. That is why a button
configured before the first save still works afterwards, and why a duplicated
view's buttons point at the copies rather than at the originals.

The practical consequence: **rename a widget freely, it changes nothing.**
Deleting a target widget, on the other hand, leaves the button pointing at
something that no longer exists, and that button silently does nothing. Re-tick
its targets after deleting a widget it pointed at.

## Showing a widget only while an entity has a state

Every widget, of every kind, can be tied to a
[Home Assistant](home-assistant.md) entity. This is how a camera appears only
when there is motion, or a warning tile appears only when a window is open.

1. Select the widget and open the inspector's **Layout** tab.
2. Scroll to **Sichtbarkeit** (Visibility) → **Automatisch über Home Assistant**
   (Automatically via Home Assistant).
3. In **Nur zeigen wenn HA-Entity einen Status hat**, type or pick the entity —
   for example `binary_sensor.motion`.
4. Two more fields appear. In **Status**, type the state that should show the
   widget, for example `on`. Leave it empty for "whenever the entity is active".
5. Leave **Auto-ausblenden nach Sek.** at 0 for now.
6. Press **Speichern** (Save).

The widget is now visible exactly while the entity matches, and hidden the rest
of the time.

| Setting | What it does |
| --- | --- |
| `showWhenEntity` | The entity to watch. Empty = the widget is always visible. |
| `showWhenState` | The state that counts as "show". Compared without regard to upper and lower case. |
| `autoHideSeconds` | 0 = show while the entity matches. Above 0 = the pulse mode below. |

**What "leave the state empty" means exactly:** the widget shows whenever the
entity's state is anything other than `off`, `unavailable`, `unknown`, `none` or
empty. So a `binary_sensor` works without typing anything, and so does a light.
A sensor whose normal reading is a number will match all the time, because a
number is not `off` — for those, type the state you want.

The display listens for state changes over a live connection to Home Assistant,
so the widget appears the moment the entity flips. It is not polled and there is
no delay to configure.

## The pulse: a doorbell camera

A doorbell sensor is `on` for a second or two, and then it is `off` again. Tied
straight to visibility, the camera would flash up and disappear before anybody
turned round. **Auto-ausblenden nach Sek.** (`autoHideSeconds`) fixes that: the
trigger reveals the widget, and a timer hides it again — regardless of what the
entity does in the meantime.

1. Place a **Kamera** (Camera) widget where you want the picture, on top of
   whatever is normally there. Use the layer list to select the widget
   underneath afterwards.
2. Select the camera and open the inspector's **Layout** tab.
3. Under **Sichtbarkeit**, set **Nur zeigen wenn HA-Entity einen Status hat** to
   your doorbell — for example `binary_sensor.doorbell`.
4. Leave **Status** empty, or set it to `on`.
5. Set **Auto-ausblenden nach Sek.** to `20`.
6. Tick **Beim Auslösen sofort im Vollbild öffnen** (Open fullscreen when
   triggered) if you want the picture to fill the screen instead of sitting in
   its tile. The option only appears on a camera, and only once a trigger entity
   is set.
7. Press **Speichern** (Save).

Now: the doorbell rings, the camera appears over the calendar, and twenty
seconds later it goes away by itself. If the sensor drops back and fires again
in the meantime, the twenty seconds start over.

### Fullscreen without touching anything

With **Beim Auslösen sofort im Vollbild öffnen** on, the camera opens the same
fullscreen overlay a tap would open — the point being that nobody has to reach
the screen to see who is at the door. It closes again on its own when the pulse
ends or the entity stops matching, and the view goes back to what it was.

The overlay opens on the **moment the trigger starts**, not for as long as it
holds. That matters if somebody dismisses it: tap the **✕**, and it stays closed
even while the doorbell is still reporting `on`. The next ring opens it again.
A person closing something should not have to fight the wall for it.

Two details worth having:

- **With a pulse set, the widget starts hidden** and stays hidden until the first
  trigger. That is the point — it is not on the screen until it is needed.
- **Only the moment the state starts matching counts.** The entity going back to
  `off` does not hide the widget early; the timer owns that.

## Letting Home Assistant press a button

The per-widget rule above shows or hides **one** widget. To switch a whole group
from Home Assistant — three widgets away, two others in — let an entity press a
button instead. The button then runs its own action on its own group, exactly as
if a finger had tapped it.

1. Set up a Buttons widget with the action and linked widgets you want, as
   above.
2. In the same inspector, open the **Auto** sub-tab.
3. Type the entity in **HA Entity-ID**, for example `binary_sensor.doorbell`.
4. In **Status**, type the state that should fire it, or leave it empty for
   "whenever it is active".
5. Under **Welchen Knopf auslösen?** (Which button to fire?), pick which of the
   four slots is pressed. The line underneath tells you what that slot currently
   does — if it says the slot does not show or hide anything, go back to its Btn
   tab and set it up first.
6. Optionally set **Auto-ausblenden nach Sek.**: after that many seconds the
   opposite action runs, so a `show` becomes a `hide` on its own.
7. Press **Speichern** (Save).

Only the moment the entity starts matching fires the button; it does not fire
repeatedly while the state stays put. The whole thing lives on the display, so
it works with no automation on the Home Assistant side beyond the entity itself.

## What "hidden" actually means

A hidden widget is still on the page. It is drawn fully transparent and it stops
responding to taps; it does not leave the layout, and it is not unloaded.

Consequences that matter:

- **A hidden widget keeps working.** A hidden calendar still fetches your
  calendar; a hidden camera still holds its connection. This is why it snaps into
  view already filled in rather than loading in front of you — and also why
  hiding a widget saves nothing on a slow display.
- **It still occupies its cells**, but as it is transparent, whatever is
  underneath is visible instead.
- **Taps pass straight through it.** A hidden widget no longer catches the tap,
  so whatever sits underneath — a button, a tile, anything — is fully clickable
  through it, exactly as if the hidden widget were not there. This is what lets a
  hidden overlay sit on top of a view without blocking it (see
  [Pop-ups and modal overlays](#pop-ups-and-modal-overlays)).
- **Showing and hiding fades over half a second.** There is no way to turn the
  fade off.
- **Hidden is not remembered.** Visibility lives in the open page: reload the
  display and everything is back to how the layout says it starts.

## Pop-ups and modal overlays

A **Buttons** widget can be laid over the rest of a view, kept hidden until
something opens it, and used as a **pop-up / modal overlay** — a panel of buttons
that appears on top of everything, does its job, and disappears again. Two
behaviours make this practical:

- A hidden widget lets taps fall through it (above), so the overlay sitting on
  top of the view blocks nothing while it is closed.
- A button can **hide its own widget after acting**, so a button inside the
  overlay can close the overlay.

### Building the overlay

1. Add a **Buttons** widget and size it over the area the overlay should cover —
   up to the whole screen. Drag it up the layer list so it sits in front of what
   it overlaps.
2. Fill in its buttons (up to four) with whatever the overlay should offer —
   scenes, lights, a webhook, a page reload, or plain show/hide of other widgets.
3. Select the widget, open the inspector's **Layout** tab, and switch on **Beim
   Laden versteckt** (Hidden on load). The overlay now starts closed, and while
   hidden it lets taps through to the view underneath.
4. On any button that should dismiss the overlay, switch on **Dieses Widget nach
   der Aktion ausblenden** (Hide this widget after action): the button runs its
   action and then hides the whole overlay. An optional **Verzögerung** (delay,
   in seconds) lets it wait first. Put this on a dedicated "close" button, or on
   every button so the overlay closes itself once a choice is made.
5. Press **Speichern** (Save).

### Opening the overlay

Since the overlay starts hidden, something has to show it. Anything that can run
a **show** or **toggle** action works:

- **A button on the view** — an always-visible button (say, a small menu icon)
  with a **show** action pointed at the overlay.
- **A Home Assistant entity** — via the Buttons widget's **Auto** tab, so an
  entity opens the overlay on its own (see
  [Letting Home Assistant press a button](#letting-home-assistant-press-a-button)).

The trigger shows the overlay; a button inside it, with **Hide this widget after
action**, closes it again.

## The three switches, and the trap

Three independent mechanisms can hide a widget, and a widget is hidden if **any**
of them says so:

| Mechanism | Set by |
| --- | --- |
| Hidden on load / button actions | `defaultHidden`, then `show` / `hide` / `toggle` from buttons |
| The Home Assistant rule | `showWhenEntity` and `showWhenState` |
| The widget hiding itself | Some widgets — the calendar, the HA entity tile, the notifications, the media player, the status widget — take themselves off the screen when they have nothing to show |

**Do not combine "Beim Laden versteckt" with an entity rule on the same
widget.** Switching on `defaultHidden` hides the widget, and only a button can
undo that — the entity rule cannot. The widget will never appear, however
faithfully the entity flips. Use one or the other:

- Should a **button** reveal it? Use **Beim Laden versteckt**.
- Should an **entity** reveal it? Use only the entity rule, and leave **Beim
  Laden versteckt** off. A widget with a pulse already starts hidden by itself.

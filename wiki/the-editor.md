# The editor

The editor is where you build layouts. It lives at `/editor` on the machine
running Magic Frame, it needs a login, and you use it on your own computer or
phone — never on the wall tablet. A **view** is one screenful (one arrangement
of tiles with one background); a **widget** is one tile on it.

Everything you do here is in your browser until you press **Speichern** (Save).
Save is what reaches the screens.

![The control centre after signing in: three counters across the top, the status strip below them, and the view cards with their mini layouts.](img/the-editor-control-centre.png)

## Getting in

1. Open `http://192.0.2.10/editor` in a browser (replace `192.0.2.10` with the
   address of the machine running Magic Frame).
2. You land on the login page. Sign in.
3. The control centre appears, with a menu down the left side.

Everything under `/editor` is behind the login — that is the only thing that
is. A view's own address is public; see
[Views and displays](views-and-displays.md).

## The control centre

`/editor` itself is a status page, not a building tool. Three counters sit
across the top:

| Counter | What it says |
| --- | --- |
| **Views** | How many views exist. Clicking it opens the view list. |
| **Live-Sync** | Whether your browser has a live connection to the server. `Verbunden` (Connected) means a save reaches the displays within a second; `Offline` means it will not. |
| **Integrationen** | How many of Home Assistant, Todoist, HTTPS and DDNS are set up. |

Under them is a row of small status tiles: **HTTPS**, **DDNS**, **Home
Assistant**, **Todoist**, **Module**, **Backups**, and either **Sicherheit**
(Security) or **Lockouts** if there are login blocks in force. Each tile is a
link to the page that fixes it.

Below that, up to eight of your views are drawn as small coloured maps of their
layout — each block is one widget, in that widget type's colour, at its real
grid position. Click a card to edit it, or `Öffnen` (Open) to view it.

The bottom row links to **Integrationen**, **Module**
([custom modules](custom-modules.md)), **Backups**
([updating and backups](updating-and-backups.md)) and the project on GitHub.

## The view list

`/editor/views` lists every view as a card with a preview, its name and its
address. Four actions sit under each card.

### Creating a view

1. Press **Neuer View** (New view) at the top right.
2. Type a display name, for example `Küche`.
3. Choose **Hochformat** (Portrait) or **Querformat** (Landscape). This only
   sets the shape of the editing canvas; you can switch it later.
4. Type the URL path. Anything that is not a lowercase letter, a digit or a
   dash is turned into a dash as you type.
5. Press **Anlegen & öffnen** (Create and open). The editor opens on the new
   view.

A brand new view is not empty. It is created with three widgets already on it —
a clock, a calendar and the weather — and with the **bundled wallpaper** as its
background, changing every 45 seconds. That way it shows something the moment a
screen opens it.

### Duplicating a view

Press **Duplizieren** (Duplicate) under a card. The form opens pre-filled with
`<name> (Kopie)` and `<id>-copy`. Confirming copies the layout, every widget,
the wallpaper and the view's settings into a new view and leaves the original
alone. Buttons that show or hide other widgets keep working: their links are
rewritten to point at the copies, not at the originals.

### Renaming a view, or changing its address

Press **Bearbeiten** (Edit). You can change the display name, the URL path or
both.

**Changing the URL path changes the address the display opens.** A tablet
pointed at the old address will show nothing until you re-enter the new one.
Change the name freely; change the path only when you are willing to walk to the
screens.

### Deleting a view

Press **Löschen** (Delete) and confirm. Every widget on that view is deleted
with it, and there is no undo. **The last remaining view cannot be deleted** —
the button is greyed out when only one view is left.

## The canvas

The middle of the editor is the view as it will be, drawn on a grid of **24
columns and 24 rows**. A widget always occupies whole cells, which is why it
snaps as you drag.

![The editing canvas with a widget selected: the grid behind it, the widget's coloured header bar, and the blue ring marking the selection.](img/the-editor-canvas.png)

- **Move a widget** by dragging it anywhere on its body.
- **Resize it** by dragging the bottom-right corner.
- **Widgets may overlap.** Nothing is pushed out of the way, and two widgets can
  sit in exactly the same cells. That is deliberate — see
  [Stacking and visibility](stacking-and-visibility.md).
- **A widget cannot be dragged past the bottom edge.** The editor measures the
  real height of the grid area and stops there.
- Each widget shows a coloured header with its type icon, its name and a gear
  button. The gear opens the inspector; so does clicking the header.

Above the canvas, **Quer** (Landscape) and **Hoch** (Portrait) switch the shape
of the canvas: portrait is a 500 × 900 box, landscape is a wide 700-pixel-high
one. This is the view's own setting and is saved with it.

If a display is currently showing this view, a row of grey chips appears above
the canvas — **Standard** plus one chip per display, labelled with its real
pixel size. Picking a display makes the canvas take that screen's exact
proportions, so tiles look on screen the way they will look on the wall. It is
a preview aid only and is not saved.

### The bottom strip

The display keeps a 65-pixel strip free along the bottom for the photo info bar
(see [Wallpapers](wallpapers.md)). The canvas draws that strip only when the
info bar is switched on. With it switched off, the canvas is 65 pixels taller
than the display really is, and a widget dragged to the very bottom row can end
up below the visible area on the screen. Keep the bottom row clear if you are
not sure.

Both of these disappear in **Randlos** (Edge-to-edge) mode; see
[Themes and styling](themes-and-styling.md).

## The widget catalogue

The left column lists every widget you can add — 18 types, described in
[Widgets](widgets.md):

Uhr (Clock), Wetter (Weather), Kalender (Calendar), HA Entity, Buttons,
Benachrichtigungen (Notifications), Timer, Nachrichten (Messages),
Einkaufsliste (Shopping list), Todos, Bild (Image), Sensor, Umwelt
(Environment), Kamera (Camera), Media Player, RSS Feed, QR-Code and Status.

Click one and it is added straight away: 8 columns wide, 4 rows high, at the
left edge on row 5, with its inspector already open. There is no
drag-from-the-palette step — drag it where you want it once it is there.

Under a **Custom** heading below the list sit any [custom
modules](custom-modules.md) you have installed. They are read at load time from
`/api/modules` and behave like any other widget once added.

On a narrow window the left column is hidden and a round **+** button appears at
the bottom right of the canvas instead. It opens the same list as a sheet.

## The inspector

The inspector is the panel that opens when you select a widget. It has three
tabs.

| Tab | What is in it |
| --- | --- |
| **Layout** | The widget's own name, its grid position and size, pixel-level nudging, background opacity, and the rules for hiding it. |
| **Text & Farbe** (Text and colour) | Font size, family and weight, text colour, text shadow. |
| **Inhalt** (Content) | Everything specific to this kind of widget — which city, which album, which entity. |

On a wide window a **Live-Vorschau** (Live preview) sits in its own column to
the right, showing the real widget with real data as you change settings. On a
narrow window the same preview sits at the top of the Inhalt tab instead.

Two buttons sit along the bottom:

- **Kopieren** (Copy) puts the widget on a clipboard held in your browser. Open
  another view and an **Einfügen** (Paste) button appears in the toolbar above
  the canvas — that is how you move a configured widget between views.
- **Löschen** (Delete) removes the widget from the view.

Press `Esc` to close the inspector.

## The layer list

Under the widget catalogue, **Ebenen** (Layers) lists every widget on the view,
**front-most first**. It exists for two jobs:

1. **Selecting a widget you cannot see.** A widget that is completely covered by
   another one, or that starts out hidden, can still be clicked here. An eye
   icon marks the widgets that start hidden.
2. **Changing what is on top.** Drag an entry by its handle and drop it on
   another entry. The list re-stamps every widget's stacking order, so it
   survives saving.

The layer list is part of the left column, so it is not available on a narrow
window.

## Saving

Press **Speichern** (Save) at the top right, or `⌘S` / `Ctrl+S`. The button
turns green and reads `Gespeichert` (Saved) when it worked, red on failure.

One save sends three things to `/api/layout/sync`: the **layout** (every
widget, its position, its size and its config), the **wallpaper** settings, and
the **view settings**. Then:

1. A snapshot of the previous state is taken first, so a bad save can be rolled
   back from [Backups](updating-and-backups.md).
2. The view's widgets are deleted and written again from what you sent. Anything
   you removed in the editor is gone from the database at this point.
3. Widget ids are stored with the view's id in front of them — a widget called
   `clk` on the view `kueche` is stored as `kueche_clk`. Buttons that point at
   other widgets have their links rewritten to match, which is what keeps
   show/hide working after a save.
4. The server tells every connected display that the layout changed. Each
   display re-reads it and redraws, normally within a second — nobody has to
   walk around pressing reload.

**Nothing is saved automatically.** Closing the tab with unsaved changes loses
them. The wallpaper dialog and the view settings dialog both say so, because
both are easy to close and forget.

## View settings

The gear icon in the header opens **View-Einstellungen** (View settings) — the
settings that belong to the whole view rather than to one widget:

| Setting | What it does |
| --- | --- |
| **Auto-Aktualisierung** (Auto refresh) | Reload this view every 1, 2, 3, 4, 6, 8, 12 or 24 hours. `Aus` (Off) is the default. See [Views and displays](views-and-displays.md). |
| **Hell / Dunkel** (Light / Dark) | Light or dark for the whole view, optionally following the sun, the clock or a Home Assistant entity. See [Themes and styling](themes-and-styling.md). |
| **Randlos** (Edge-to-edge) | Widgets run to the screen edge with no outer margin, and a slider sets the gap between tiles. |

## Sending commands to the screens

Four buttons in the header act on the displays rather than on the layout:

| Button | What it does |
| --- | --- |
| **TV Sync** | Every connected display switches to this view. |
| **✕** | Cancels that — every display goes back to its own view. |
| **Refresh** | Reloads every connected display. Hold `Shift` while clicking to reload only the displays showing this view. |
| **↗** | Opens this view in a new browser tab, so you can look at it yourself. |

These are described in full, including what they cannot do, on
[Views and displays](views-and-displays.md).

## The phone editor

`/editor/mobile` is a separate, simpler editor for a phone. Nothing redirects
you to it — you reach it by typing the address.

It shows the widgets of one view as a **list**, not as a canvas. Tapping an
entry opens the same inspector as the desktop editor, so every setting is
reachable; the arrows on the left move a widget up or down the list. A view
picker sits in the header, and the ☰ menu holds the wallpaper dialog, the
integrations dialog, dashboard settings, a link to open the view and a way back
to the desktop editor.

Two things it does not have:

- **A grid.** You cannot drag a widget to a position here. Set the position
  numerically in the inspector's Layout tab, or do the arranging on a computer.
- **The full widget list.** Its **Neues Modul wählen** (Choose new module)
  dialog offers 14 of the 18 types: Timer, Nachrichten (Messages),
  Einkaufsliste (Shopping list) and Todos are missing, and custom modules are
  not listed either. Add those from the desktop editor.

## What the editor does not do

- **There is no undo.** Deleting a widget or a view is immediate. What you have
  instead is the automatic snapshot taken before every save — see
  [Updating and backups](updating-and-backups.md).
- **The layer list and the widget catalogue column are hidden on narrow
  windows.** The round **+** button covers adding widgets; re-ordering layers
  needs a wider window.
- **Two people editing the same view at once will overwrite each other.** A save
  replaces the whole view; there is no merging.
- **The canvas is an approximation.** It draws simplified placeholders for the
  widgets, not the widgets themselves. Use the inspector's live preview for one
  widget, and the real view in another tab for the whole screen.

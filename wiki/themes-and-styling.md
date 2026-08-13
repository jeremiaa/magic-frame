# Themes and styling

How a view looks: light or dark, how solid the tiles are over the photo, which
font, which colour, how round the corners are, and how to move a tile three
pixels to the left because it bothers you.

Two levels are involved. The **view** decides light or dark and whether tiles run
to the screen edge; each **widget** decides its own font, colour and how much of
the background shows through. A view is one screenful; a widget is one tile on
it. See [The editor](the-editor.md) for how to reach the settings named here.

## Light or dark for a whole view

1. In the editor, open the view.
2. Click the gear icon in the header to open **View-Einstellungen** (View
   settings).
3. Set **Hell / Dunkel** (Light / Dark).
4. Press **Speichern** (Save).

| Setting | Dropdown entry | What it does |
| --- | --- | --- |
| `dark` | Immer dunkel | Dark all the time. This is what a view does when nothing is set. |
| `light` | Immer hell | Light all the time. |
| `sun` | Nach Sonnenstand (HA) | Follows the sun through Home Assistant: light while the sun is up, dark after it sets. |
| `time` | Nach Uhrzeit | Light between two times of day. |
| `entity` | Nach HA-Entität | Follows any Home Assistant entity you name — a scene, a switch, an `input_boolean`. |

With `sun`, `time` or `entity` two time fields appear: **Hell ab** (Light from,
07:00 unless changed) and **Dunkel ab** (Dark from, 20:00 unless changed). For
`time` they are the setting itself. For `sun` and `entity` they are a safety
net: if the entity is missing or has not reported yet, the clock decides, so a
frame is never stuck in the wrong look because Home Assistant is down. A window
that runs over midnight works — light from 20:00 to 07:00 is understood as the
night.

With `entity` you also fill in the entity and **Zustand für hell** (State that
means light) — for `sun.sun` that state is `above_horizon` unless you say
otherwise.

**The view setting only reaches widgets that are set to follow it.** Every widget
that draws a card has its own **Helligkeit** (Brightness) control with three
options: `Automatisch` (Automatic) follows the view, `Dunkel` and `Hell` ignore
it. A button under the light/dark dropdown, **Alle Widgets auf „Automatisch"
setzen** (Set all widgets to automatic), flips every widget on the view at once —
that is the quick fix when you switch the view to light and half the tiles stay
black.

The editor's own interface has a separate light/dark switch, at the bottom of
the menu on the left. It changes the editor only, never a display.

## The glass card

Widgets that draw a card — the HA entity tile, the notifications, the calendar,
the sensor tiles, the environment tiles, the media player — draw it the same
way: a coloured surface at an opacity you choose, with the photo behind it
blurred.

| Setting | Where | What it does |
| --- | --- | --- |
| `cardTheme` | **Helligkeit** / **Kacheln: Theme** | `auto` follows the view; `dark` is black glass with light text; `light` is white glass with dark text. |
| `cardOpacity` | **Karten-Deckkraft** / **Hintergrund Kacheln** | 0 to 100 %. 40 % unless you change it. At 0 the surface disappears and only the text is left. |
| `cardBlur` | **Hintergrund-Unschärfe** | 0 to 40 pixels of blur behind the card. 12 unless you change it. At 0 the photo stays sharp behind the text. |

The three sit together in the inspector's **Inhalt** (Content) tab, near the
bottom, on each of those widgets.

Some rules of thumb for a photo background: opacity around 40 with a bit of blur
keeps text readable over almost any picture. Opacity 0 with blur 0 gives a clean
"floating text" look, which works over calm photos and fails over busy ones —
combine it with the wallpaper's bottom gradient (see
[Wallpapers](wallpapers.md)) rather than with a solid card.

**Widgets that do not draw a card do not have these three settings** — the clock,
the weather and the buttons among them. Their surface is the widget background
below.

## The widget background

Most widgets have one more, simpler surface: a plain dark box behind the whole
tile.

1. Select the widget.
2. Open the inspector's **Layout** tab.
3. Under **Hintergrund** (Background), set **Deckkraft** (Opacity) from 0 to
   100 %.

Above 0 the view draws a black box at that opacity behind the tile, blurs the
photo behind it, and puts a hairline border around it. At 0 there is no box at
all and the widget sits straight on the wallpaper — which is what most people
want for a clock.

Two exceptions:

- **The Image widget has no such control**, because its picture fills the whole
  tile and there would never be anything to see behind it.
- **The widgets that draw their own card ignore it.** For the HA entity tile,
  the notifications, and the calendar in its agenda or month view, the view
  draws no box at all — those widgets paint their own surface from `cardOpacity`
  above. Moving the Deckkraft slider on them changes nothing.

## Edge to edge, and floating cards

By default a view keeps a margin around the outside and 16 pixels between tiles.
**Randlos** (Edge-to-edge) removes the margin so tiles run right up to the
screen edge, and squares off their corners — the mosaic look, where a photo tile
and a calendar tile meet with no gap.

1. Open **View-Einstellungen** (View settings).
2. Switch on **Randlos (bis zum Bildschirmrand)**.
3. Set **Kachelabstand** (Tile gap) between 0 and 16 pixels.
4. Press **Speichern** (Save).

In edge-to-edge mode one extra control appears on each widget's **Layout** tab:
**Schwebende Karte (dockt nicht an)** (Floating card). Switch it on for a widget
that should keep the normal rounded look and sit **over** the mosaic instead of
being part of it — the weather floating on top of the big photo tile, for
example. Everything else stays square and docked.

Without edge-to-edge the toggle is not shown, because it would have nothing to
do.

## Corners

| Where the widget is | Corner radius |
| --- | --- |
| A normal view | 1.5 rem — the usual rounded card |
| A view in edge-to-edge mode | square |
| A floating card in edge-to-edge mode | back to 1.5 rem |

There is no free corner-radius slider for a widget. The one exception is the
Buttons widget, whose **Kanten abrunden (Radius)** slider on its Design tab
shapes the individual buttons from square to fully round.

## Fonts, colour and shadow

Everything in this section is on the inspector's **Text & Farbe** (Text and
colour) tab, and every widget has it.

### Size

**Basis-Schriftgröße** (Base font size) runs from 8 to 150 and is the size in
pixels of the widget's text. Widgets scale their own parts from it — the clock's
time is much bigger than this number, its date much smaller — so treat it as a
dial, not as a measurement.

**Responsive Auto-Scale** changes what the number means. Switched on, the label
becomes **Responsive-Faktor** and the text is sized relative to the **tile**
rather than in pixels: make the tile bigger and the text grows with it. That is
what you want on a screen whose size you do not know, or when the same layout
runs on a tablet and a TV.

The trade-off: with auto-scale on, a tile that is very wide and very short gets
small text, because the scaling follows the **shorter** side of the tile. (The
HA entity tile and the notifications are the exception — they scale with the
tile's width.) If the text looks wrong after switching it on, the tile needs a
different shape, not a different number.

### Font

**Familie** (Family) offers Geist (the default), Inter, Roboto, Montserrat, SF
Pro, Playfair, Lato, Oswald and Outfit. **Gewicht** (Weight) offers 100 Thin,
300 Light, 400 Regular, 500 Medium, 700 Bold and 900 Black.

The font is per widget. A view can mix them, and usually should not.

### Colour

**Schriftfarbe** (Text colour) takes a colour from the picker or a hex value
typed into the field beside it. A widget with no colour set inherits the view's
own — white on a dark view.

Some widgets use their colour for more than text: the HA entity tile can colour
its icon by the entity's state, and the buttons take theirs per button. Those
are described with the widgets themselves.

### Shadow

Three sliders make text readable over a photo without a card behind it:

| Setting | Range | What it does |
| --- | --- | --- |
| `textShadowBlur` | 0–40 px | How soft the shadow is. 0 = no shadow. |
| `textShadowX` | −50 to 50 px | Sideways offset. |
| `textShadowY` | −50 to 50 px | Vertical offset. 4 px down unless you change it. |

The shadow is always black at 80 % — there is no colour choice. A blur of about
10 with no offset gives a soft halo that lifts white text off almost any
picture; that is usually a better answer than turning up the card opacity.

## Nudging a widget

The grid is 24 by 24 cells, and a widget always occupies whole cells. Sometimes
whole cells are not enough: two tiles that should line up optically are one hair
out, because their contents have different padding.

**Feinjustierung (Pixel)** (Fine adjustment) on the **Layout** tab moves the
widget without changing which cells it owns:

| Setting | Range | What it does |
| --- | --- | --- |
| `offsetX` | −500 to 500 px | Moves the tile left or right. |
| `offsetY` | −500 to 500 px | Moves the tile up or down. |

The widget is only drawn somewhere else; nothing else moves out of the way, and
the widget can be pushed over its neighbour or off the screen. Use it for the
last few pixels, not for layout — for layout, change the cells.

**The offset is not drawn anywhere in the editor** — neither on the canvas nor
in the inspector's live preview. Both keep showing the widget at its grid
position. Open the view in a second browser tab to see what the nudge did.

## What is missing

- **There is no theme you can pick as a whole.** Light and dark are the only two
  looks; everything else is per widget, and matching a view is a matter of
  setting the same font and the same card opacity everywhere.
- **There is no colour for the shadow, and no second shadow.**
- **Text alignment is not offered on most widgets.** The setting exists
  (`align`), and the clock and the media player honour it, but only the media
  player's inspector has a control for it.
- **The view's light/dark setting does not reach widgets that have been pinned.**
  If a view looks half-converted, use **Alle Widgets auf „Automatisch" setzen**
  described above.

# Writing a module

There are two ways to add a new kind of widget to Magic Frame, and which one you
want depends on one question: **are you shipping this to other people, or only to
yourself?**

| | A custom module | A core widget |
| --- | --- | --- |
| What you write | One JavaScript file | A React component and an inspector |
| Where it runs | In the display's browser, loaded at runtime | Inside Magic Frame itself |
| Installing it | Upload two files in the editor | Rebuild the whole app |
| Others can install it | Yes, by uploading the same two files | Only by running your fork |
| What it can use | React hooks, `fetch`, its own settings | Everything in the codebase |

**If in doubt, write a custom module.** It is the supported route for anything
you want to hand to another person, it needs no fork and no rebuild, and it
cannot be broken by a Magic Frame update renaming something internal.

The core-widget route is for changes you intend to run yourself or to offer as a
contribution. It is documented in the second half of this page because it is the
one with the sharp edges.

Both routes end in the same place: a tile on a view, on a 24 × 24 grid, wrapped
in the shared settings described in [Widgets](widgets.md).

## Part one — a custom module

### What you write

One file, with two exports: a `manifest` describing the module, and a default
function that draws it.

```js
export const manifest = {
  type: "hello",
  label: "Hello world",
  description: "Greets somebody by name.",
  iconEmoji: "👋",
  version: "1.0.0",
  author: "you",
  fields: [
    { key: "name", label: "Name", type: "text", default: "World" },
    { key: "showEmoji", label: "Show emoji", type: "boolean", default: true },
  ],
};

export default function render(ctx) {
  const h = ctx.createElement;
  const name = ctx.config.name || "World";
  return h(
    "div",
    { className: "w-full h-full flex items-center justify-center text-[1.5em]" },
    ctx.config.showEmoji !== false ? `👋 Hello, ${name}!` : `Hello, ${name}!`,
  );
}
```

A complete working version of the same idea ships with Magic Frame, in
`examples/modules/hello/hello-widget.js` — same two exports, one extra colour
field, and German labels. Copy it and change it; it is shorter than reading
about it.

The manifest fields, the six settings types, and the rules Magic Frame enforces
on upload are documented once in [Custom modules](custom-modules.md); this page
does not repeat them.

### What `ctx` gives you

Your `render` function is called with one argument and can reach nothing else:

| On `ctx` | What it is |
| --- | --- |
| `createElement`, `Fragment` | React's own, so you can build elements without importing React |
| `useState`, `useEffect`, `useRef`, `useMemo`, `useCallback` | The five React hooks, bound to the host's React |
| `config` | Your settings, as the user filled them in. Always an object. |
| `dashboardId` | Which view the widget is running on. Useful for asking for that view's timers or messages. |
| `fetch` | The browser's `fetch`, so you can call an API — including Magic Frame's own routes such as `/api/weather`. |

**Do not import React yourself.** It would be bundled into your file and you
would end up with a second copy of React running beside the host's, which breaks
hooks in ways that are miserable to debug. That is the entire reason the hooks
arrive on `ctx`.

### Sizes go in `em`

Your module is rendered inside a box that already carries the user's choices from
the **Text & colour** tab — font size, family, weight, colour, text shadow — and
that box is a CSS container, so a responsive font size resolves against the
tile's own dimensions.

So express **every** size relative to that inherited font size: `text-[1.4em]`,
`gap-[0.3em]`, `p-[0.6em]`. A module built that way scales when the tile is
resized, and honours **Responsive auto-scale** (`responsiveText`) for free. Hard
pixels do neither.

For the same reason, do not set `fontFamily`, `color`, `fontWeight` or
`textShadow` yourself unless you deliberately want to override the user. The dark
panel behind your tile is the widget's `bgOpacity` and is drawn by the host —
you do not need to draw a background at all.

### Building it

```bash
node scripts/build-module.mjs examples/modules/hello/hello-widget.js examples/modules/hello/dist
```

Run that from a checkout of the Magic Frame source, with `npm install` already
done — the builder needs **esbuild**, which comes from Magic Frame's own
dependencies. You do not need to run the app there; a checkout is enough, and it
does not have to be the machine your dashboard runs on.

The first argument is your source file, the second is where to put the result.
It writes two files:

```
dist/module.json    the manifest, as JSON
dist/bundle.js      your code, bundled and minified
```

A hello-world bundle lands somewhere between one and five kilobytes. If yours is
hundreds of kilobytes you have pulled a library in that you did not mean to —
React especially, which must not be bundled. The ceiling is 2 MB.

Under the hood it uses **esbuild**. It compiles your file plus everything it
imports relatively into one self-contained script, wraps it in a small piece of
code that calls `window.MagicFrame.registerWidget({ type, render })`, and adds
the `custom:` prefix to your type if you left it off. React is deliberately not
bundled. `.js`, `.jsx`, `.ts` and `.tsx` sources all work.

Then upload `module.json` and `bundle.js` on the **Modules** page, as described
in [Custom modules](custom-modules.md).

**The script prints an out-of-date instruction.** Its closing message says
*Upload via Settings → Module*; the Modules page is its own sidebar entry at
`/editor/modules`, not a section of Settings. Its header comment also promises a
`.zip` next to the two files, and no archive is written.

### The registration contract

The only thing Magic Frame requires of your bundle is this call, and the builder
writes it for you:

```js
window.MagicFrame.registerWidget({
  type: "custom:hello",
  render: (ctx) => { /* returns a React element */ },
});
```

`type` must be a string and `render` must be a function, or the call is ignored
with a warning in the browser console. A registry entry is stored under the type,
and any tile waiting for that type renders immediately.

The load sequence on a display is worth knowing when you are debugging:

1. The view meets a widget whose type starts with `custom:`.
2. It adds a `<script>` tag pointing at `/api/modules/[type]/bundle.js`, with a
   cache-busting number on the end, once per type per page.
3. Your bundle runs and calls `registerWidget`.
4. The tile renders. **If nothing registers within five seconds**, the tile shows
   a timeout message instead.

Errors thrown inside `render` are caught and shown in the tile rather than taking
the whole display down.

## Part two — a core widget

Everything below applies only if you are editing the Magic Frame source and
rebuilding it. It cannot be distributed to anyone who is not running your build.

### The type id is a filename

A widget's type is literally the name of the file that draws it —
`ClockWidget.tsx`, `SensorWidget.tsx` — and that string is stored in the database
with every tile that uses it. Renaming the file breaks every saved layout
containing that widget, so pick the name once.

### The component

```tsx
// src/components/widgets/HelloWidget.tsx
"use client";

export default function HelloWidget({ config }: { config?: any }) {
  const name = config?.name || "World";
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-[0.3em]">
      <div className="text-[1.4em] font-bold">Hello, {name}!</div>
      <div className="text-[0.7em] opacity-60">My first widget</div>
    </div>
  );
}
```

The props are:

- **`config`** — the tile's settings, exactly what the inspector writes.
- **`dashboardId`** — which view it is on. Only passed to widgets that need it;
  the Timer, Messages, Image, Calendar and Notifications widgets get it.
- **`onVisibilityChange(visible: boolean)`** — optional. Calendar, Media player,
  Status, HA entity and Notifications use it to fade themselves out when they
  have nothing to show.

The `em` rule from part one applies unchanged: the wrapper sets the font, so size
everything relative to it. If your widget draws its own frosted card, take the
numbers from `useGlassStyle(config)` in `src/lib/ui/glass.ts` rather than
inventing them — it returns `cardOpacity`, `cardBlur`, `isLight` and a ready
`cardStyle`, defaulting to 40 % and 12 px.

### Where to register it

The old rule of thumb was "hook it into seven places", and the editor's own
built-in guide still says so. **Both the number and the list are wrong.** Two of
the seven now live in different files, and four more files it never named have
to be edited too. The reliable way to find every place is to trace an existing
widget rather than trust any list, including this one:

```bash
grep -rl "SensorWidget" src/
```

`SensorWidget.tsx` is the most complete example — it has a config schema, a card
list in its inspector, an icon, an accent colour and a skeleton. That grep
returns ten files: the widget itself, plus the nine listed below. The inspector
is not among them, because its filename says `SensorInspector`; grep for that
separately.

**Two files you create:**

| File | What it is |
| --- | --- |
| `src/components/widgets/<Name>Widget.tsx` | The widget itself |
| `src/app/editor/_inspectors/<Name>Inspector.tsx` | Its **Content** tab |

**Nine files you edit.** Miss one and the widget fails quietly and differently
each time:

| File | What to add | Miss it and… |
| --- | --- | --- |
| `src/components/widgets/renderWidget.tsx` | An import, and one `if (type === …) return <YourWidget … />` line | The tile is blank, on the display **and** in the editor preview |
| `src/lib/widgets/schemas.ts` | A `<name>Config` object, and a `z.literal("<Name>Widget.tsx")` member of the discriminated union | **Saving fails with HTTP 400** — the whole view, not just your tile |
| `src/app/editor/_types.ts` | An entry in `WIDGET_DEFAULT_LABEL` | The tile is titled `Hello` — the type id with `Widget.tsx` chopped off — and never translates |
| `src/app/editor/(app)/views/[id]/page.tsx` | An entry in `WIDGET_CATALOG`, and a `case` in `widgetSkeletonFor()` | Nobody can add it; and its placeholder on the editor canvas is a bare icon |
| `src/app/editor/_components/widget-visuals.tsx` | An entry in `WIDGET_ACCENT`, and a `case` in `widgetIconFor()` | It is grey in the palette, the layer list and the inspector header, with no icon |
| `src/app/editor/_components/InspectorPanel.tsx` | An import and an `activeWidget.type === …` branch | The Content tab is empty — nothing can be configured |
| `src/app/editor/_components/AddWidgetModal.tsx` | A button | It is missing from the separate mobile editor at `/editor/mobile` |
| `src/app/editor/(app)/views/page.tsx` | An entry in `WIDGET_META` | It is invisible in the thumbnail on the view list |
| `src/app/editor/(app)/page.tsx` | An entry in its own `WIDGET_META` | It is invisible in the thumbnail on the dashboard |

Plus, because German is the source language, **the English line in
`src/lib/i18n/en.ts`** for whatever German label you put in
`WIDGET_DEFAULT_LABEL`. Without it an English display shows the German word.

Two more, both genuinely optional:

- `src/app/editor/(app)/modules/page.tsx` — the `INSTALLED` array, so your widget
  is listed on the Modules page. Cosmetic only.
- `InspectorPanel.tsx` again — add your type to `NO_MULTICOL_CONTENT` **if** your
  inspector renders a list of cards. Without it the Content tab splits into two
  columns and tall cards leave ragged gaps. `TYPE_LABELS` in the same file
  overrides the inspector's header label, and is only used by six widgets.

And two type-specific special cases in the tile wrapper, needed only if your
widget draws its own card or fills its tile to the edge: `isCardBased`,
`fillsOwnTile` and `noInnerPadding` in `src/app/view/[id]/page.tsx`. **They are
duplicated** in `src/app/editor/_components/WidgetPreview.tsx` and the two must
be kept identical, or the editor preview stops matching the display.

### `WIDGET_TYPES` is not required

`src/lib/widgets/schemas.ts` opens with an array called `WIDGET_TYPES`, and older
notes call adding to it mandatory. **It is not.** Nothing in the repository
imports `WIDGET_TYPES`, and nothing imports the `WidgetType` type derived from
it — `grep -rn "WIDGET_TYPES" src/` returns only the two lines that declare them.

It has also gone stale in a way that proves the point: it lists ten widget types
while the product has eighteen. Adding to it is harmless and arguably tidy;
leaving it alone changes nothing.

What **is** required in that file is the pair further down: the `<name>Config`
object built from `baseConfig`, and the matching member of the
`z.discriminatedUnion("type", …)`. `/api/layout/sync` validates against that
union before writing anything, so a missing member means the save is rejected
with `Invalid layout payload` — and the user loses the whole view's changes, not
just your widget.

```ts
const helloConfig = baseConfig.extend({ name: z.string().optional() }).passthrough();

// …and inside the union:
z.object({ type: z.literal("HelloWidget.tsx"), config: helloConfig })
  .merge(commonWidgetFields()),
```

`baseConfig` already carries everything shared: `fontSize`, `fontFamily`,
`fontWeight`, `color`, the three `textShadow` values, `offsetX`/`offsetY`,
`responsiveText`, `align`, `defaultHidden`, `floatingCard` and the
`showWhenEntity`/`showWhenState`/`autoHideSeconds` visibility rules.

**Declare every one of your own fields explicitly, even though `.passthrough()`
is on.** Passthrough has silently dropped fields on save before — a weather
option went missing exactly this way. An explicit line is also the only place a
reviewer can see the field exists.

### The inspector

```tsx
// src/app/editor/_inspectors/HelloInspector.tsx
"use client";
import type { WidgetLayoutItem } from "../_types";

export default function HelloInspector({
  widget, updateConfig,
}: {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
}) {
  return (
    <input
      type="text"
      value={(widget.config as any)?.name ?? ""}
      onChange={(e) => updateConfig(widget.i, "name", e.target.value)}
    />
  );
}
```

Two conventions from the existing inspectors are worth copying: use the
`var(--mf-…)` colour variables rather than fixed colours, so the inspector works
in both the light and the dark editor theme; and lay two or more switches out as
`flex flex-wrap gap-x-6 gap-y-3` rather than a grid, because long German labels
overflow a fixed column and collide.

### Live data

If your widget has to update the moment something happens, listen on the same
socket the rest of the app uses:

```tsx
import io from "socket.io-client";
const socket = io();
socket.on("TIMER_STARTED", (payload) => { /* setState */ });
// and socket.disconnect() in the cleanup
```

The events are listed in [The companion API](companion-api.md). Note that the
socket is **receive-only**: emitting from a client does nothing. To make the
server broadcast, emit from an API route via `global.LIVE_SYNC_IO`, the way
`src/app/api/timers/route.ts` does.

For Home Assistant state, do not use the socket. Use the
`useHaLiveStates(entityIds, enabled)` hook in `src/lib/ha/useHaLiveStates.ts`,
which reads a filtered stream from `/api/ha/stream`.

### Before you commit

1. `npx tsc --noEmit` — the production build ignores type errors, so this is the
   only thing that catches them before CI does.
2. Add the widget, save the view, reload it. If saving fails, it is the schema.
3. Look at the tile on a display, not only in the editor preview.
4. Update the page in `wiki/` that documents your widget, in the same commit.
   `scripts/check-wiki.mjs` runs in CI and fails if a widget file exists that no
   page mentions. It is deliberately not part of `npm run build`, so installing
   from source never breaks over stale documentation.

## Worked examples in the code

| If you want to see | Look at |
| --- | --- |
| The shortest real widget — around 110 lines | `src/components/widgets/MessagesWidget.tsx` |
| A widget with every registration point filled in | `src/components/widgets/SensorWidget.tsx` |
| Live updates over the socket | `src/components/widgets/TimerWidget.tsx` |
| An inspector with a dynamic list of cards | `src/app/editor/_inspectors/HANotificationInspector.tsx` |
| A complete custom module | `examples/modules/hello/hello-widget.js` |
| The builder | `scripts/build-module.mjs` |
| The browser runtime a module registers into | `src/lib/modules/runtime.tsx` |

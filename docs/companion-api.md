# Magic Frame — Companion API

This document describes Magic Frame's external HTTP and Socket.IO interface for **phone companions, iOS Shortcuts, Android Tasker, curl scripts**, and everything else that isn't the editor itself.

> As of 2026-04-22. Not yet versioned — breaking changes possible until v1.0.

---

## Table of Contents

- [Authentication](#authentication)
- [Conventions](#conventions)
- [Endpoints](#endpoints)
  - [Timers](#timers)
  - [Board Messages (Quick-Post)](#board-messages-quick-post)
  - [Shopping List](#shopping-list)
  - [Todos](#todos)
  - [View Control (Remote Refresh, View Switch)](#view-control)
  - [Weather & Calendar (read-only)](#weather--calendar-read-only)
- [Socket.IO Events](#socketio-events)
- [iOS Shortcut Examples](#ios-shortcut-examples)
- [Roadmap](#roadmap)

---

## Authentication

Two ways, both accepted everywhere:

1. **Session cookie** — for the browser editor (set via iron-session). No setup needed if you're signed in to an editor tab.
2. **Shortcut token** — a personal API key per user. For phones and external tools.

### Get / rotate a token

The token sits under **Editor → Settings → Shortcut Token** ready for copy-paste. REST equivalent:

```http
GET  /api/auth/shortcut-token   → { "token": "…" }     (session required)
POST /api/auth/shortcut-token   → { "token": "…new…" } (rotates, old one invalidated)
```

### Use the token

Either as a query param (for URL-only clients like the iOS Shortcut "Get Contents of URL" action):

```
https://your-frame.local/api/timers?key=ABC123…
```

Or as an HTTP header (cleaner for curl/scripts):

```
Authorization: Bearer ABC123…
```

When you rotate the token, all existing shortcuts must be updated.

---

## Conventions

- **Base URL**: whatever opens your dashboard, e.g. `http://dashboard.local` or `https://dashboard.example.com`. All paths here are relative.
- **Content-Type**: `application/json` for POST/PATCH with a body. Query params work too, so iOS Shortcuts can operate without a body.
- **Timestamps**: ISO-8601 UTC (e.g. `2026-04-22T18:30:00.000Z`).
- **IDs**: `cuid()` — short, URL-safe strings.
- **Errors**: JSON `{ "error": "…" }` with a matching HTTP code (400 / 401 / 404 / 500).

---

## Endpoints

### Timers

Timers are managed server-side, broadcast live via Socket.IO to all displays, and rendered by the `TimerWidget`.

#### `GET /api/timers`

Lists active timers. No auth — displays can fetch them in kiosk mode.

| Query param   | Type   | Required | Description                                                                  |
| ------------- | ------ | -------- | ---------------------------------------------------------------------------- |
| `dashboardId` | string | no       | Filters to this view + all "untargeted" timers (`targetDashboardId=null`)    |

Response:
```json
{
  "timers": [
    {
      "id": "ckxy…",
      "label": "Pasta",
      "targetDashboardId": "tablet",
      "startedAt": "2026-04-22T18:30:00.000Z",
      "durationMs": 600000,
      "completedAt": null,
      "dismissedAt": null
    }
  ]
}
```

#### `POST /api/timers`

Starts a timer. **Auth required.**

Body (JSON) **or** query params, mix as you like:

| Field           | Type             | Required | Default    | Description |
| --------------- | ---------------- | -------- | ---------- | ----------- |
| `label`         | string (≤40)     | no       | `"Timer"`  | Display name |
| `minutes`       | number           | *        | 0          | Minutes, combinable with `seconds` |
| `seconds`       | number           | *        | 0          | Seconds |
| `durationMs`    | number (≥1000)   | *        | —          | Alternative to min/sec, milliseconds |
| `dashboardId`   | string           | no       | `null`     | If set: timer only visible on this view. Otherwise global. |

\* at least one must add up to ≥ 1s. Cap: 24h.

Response: `{ "timer": { … } }` — same object as above.

**Side effect**: Socket event `TIMER_STARTED` is sent to all clients.

#### `DELETE /api/timers/:id`

Ends/dismisses a timer. **Auth required.**

Response: `{ "ok": true }`
Side effect: Socket event `TIMER_DISMISSED` with `{ id }`.

---

### Board Messages (Quick-Post)

Short texts (+ optional image URL) shown on displays as a notification stream. Rendered by the `MessagesWidget`. Perfect for "Dinner in 10 min", "Mom is on her way", etc.

#### `GET /api/messages?dashboardId=X`

List of active messages (not dismissed, not expired). Public.

#### `POST /api/messages`  *(auth)*

| Field         | Type   | Description                                       |
| ------------- | ------ | ------------------------------------------------- |
| `text`        | string | Required. Max 500 characters                      |
| `imageUrl`    | string | Optional, absolute URL (e.g. an Immich link)      |
| `dashboardId` | string | Optional, otherwise global                        |
| `ttlSec`      | number | Optional TTL, otherwise sticks until dismissed    |

Example (Shortcut):
```
POST /api/messages?key=TOKEN&text=Dinner+in+10+min&ttlSec=1800&dashboardId=kitchen
```

Socket event: `MESSAGE_POSTED` (complete object).

#### `DELETE /api/messages/:id`  *(auth)*

Hide it. Socket: `MESSAGE_DISMISSED` with `{ id }`.

---

### Shopping List

Shared family list. No per-user scope — everyone sees the same list, live-synced between the board and all clients.

#### `GET /api/shopping`

Lists all open items + those checked off in the last 24h. Public.

#### `POST /api/shopping`  *(auth)*

| Field    | Type              | Description                                              |
| -------- | ----------------- | -------------------------------------------------------- |
| `text`   | string            | Single item. Comma-separated values allowed for several  |
| `items`  | string[]          | Alternative — array of multiple items                    |

Example with comma separation:
```
POST /api/shopping?key=TOKEN&items=Milk,Bread,Cheese
```

Socket: `SHOPPING_UPDATED`.

#### `PATCH /api/shopping/:id`  *(auth)*

Toggle `checked`. No body payload needed. Socket: `SHOPPING_UPDATED`.

#### `DELETE /api/shopping/:id`  *(auth)*

Delete a single item.

#### `DELETE /api/shopping`  *(auth)*

Delete all checked items (cleanup).

---

### Todos

Task list. Optional assignee (free-form string: someone in the household). Rendered by the `TodosWidget`, optionally filtered per person.

#### `GET /api/todos?assignee=Emma&includeDoneHours=12`

Without a filter: all open. `includeDoneHours` also shows recently completed ones. Public.

#### `POST /api/todos`  *(auth)*

| Field      | Type    | Description                                           |
| ---------- | ------- | ----------------------------------------------------- |
| `title`    | string  | Required. Max 200 characters                          |
| `assignee` | string  | Optional                                              |
| `dueDate`  | ISO8601 | Optional                                              |
| `priority` | enum    | `low` \| `normal` \| `high`, default `normal`         |

Example:
```
POST /api/todos?key=TOKEN&title=Take+out+trash&assignee=Emma&priority=high
```

Socket: `TODOS_UPDATED`.

#### `PATCH /api/todos/:id`  *(auth)*

Body `{ toggle: true }` → flip it (completedAt ↔ null).
Or partial update: `{ title?, assignee?, dueDate?, priority? }`.

#### `DELETE /api/todos/:id`  *(auth)*

---

### View Control

These endpoints already exist and aren't new to the Companion API — but documenting them here.

#### Socket events (no HTTP)

You can connect to the Socket.IO server and emit events. The server forwards them to all displays:

| Event            | Payload                    | Effect on displays                                          |
| ---------------- | -------------------------- | ----------------------------------------------------------- |
| `FORCE_NAVIGATE` | `dashboardId: string`      | All displays jump to this view                              |
| `CLEAR_NAVIGATE` | –                          | Jump back to their configured default                       |
| `REFRESH_DEVICE` | `dashboardId \| null`      | `null` = all reload, otherwise only those with matching ID  |
| `LAYOUT_UPDATED` | `dashboardId?: string`     | Tells displays to reload the layout                         |

From the browser: `io().emit("REFRESH_DEVICE", null)`. For external clients (e.g. a Shortcut) there's no HTTP wrapper yet — coming under `/api/devices/*`.

---

### Weather & Calendar (read-only)

These also already exist, included here for completeness:

- `GET /api/weather?provider=…&lat=…&lon=…` — see the inspector dropdown
- `GET /api/calendar?feeds=<json>&limit=…&days=…` — multi-feed iCal/Google/Microsoft/CalDAV/Home Assistant

Both retrievable without auth (display-friendly).

---

## Socket.IO Events

All events run over the default namespace, the Socket.IO library handles reconnect.

| Event              | Direction     | Payload                  | Meaning                       |
| ------------------ | ------------- | ------------------------ | ----------------------------- |
| `LAYOUT_UPDATED`   | Server → all  | `string?` (dashboardId)  | Reload layout                 |
| `FORCE_NAVIGATE`   | Server → all  | `string` (dashboardId)   | Switch to view                |
| `CLEAR_NAVIGATE`   | Server → all  | –                        | Restore default view          |
| `REFRESH_DEVICE`   | Server → all  | `string \| null`         | Reload page                   |
| `TIMER_STARTED`    | Server → all  | `Timer` object           | New timer started             |
| `TIMER_DISMISSED`  | Server → all  | `{ id: string }`         | Timer ended                   |
| `MESSAGE_POSTED`   | Server → all  | `BoardMessage` object    | New quick-post message        |
| `MESSAGE_DISMISSED`| Server → all  | `{ id: string }`         | Message dismissed             |
| `SHOPPING_UPDATED` | Server → all  | –                        | Refetch list                  |
| `TODOS_UPDATED`    | Server → all  | –                        | Refetch list                  |

Clients can emit the same events too — the server broadcasts them onward (see `server.js`).

---

## iOS Shortcut Examples

### 1. "Pasta Timer" — 10 minutes on the kitchen tablet

1. **Shortcuts** → create new → action "Get Contents of URL".
2. URL:
   ```
   https://your-frame/api/timers?key=YOUR_TOKEN&label=Pasta&minutes=10&dashboardId=kitchen
   ```
3. Method: `POST`
4. Add to Home Screen → done.

Tap it → the kitchen display shows a live 10-minute countdown, pulsing orange when it runs out.

### 2. "Refresh all displays" (still manual via editor toolbar)

Not available via Shortcut yet, only through Editor → View → "Refresh" button. HTTP endpoint coming under `/api/devices/refresh`.

### 3. "Ask me how long" — with input dialog

1. Action "Ask for Input" → "Number" → variable `duration`.
2. Action "Text" → `Custom Timer` (or input).
3. Action "Get Contents of URL" with URL as text: `…/api/timers?key=TOKEN&minutes=` + variable `duration`, method `POST`.

---

## More iOS Shortcut Recipes

### Shopping via Siri
1. Shortcut "Add to list", input by voice → variable.
2. "Get Contents of URL": `.../api/shopping?key=TOKEN&text=` + variable, POST.

→ "Hey Siri, add to list, milk" ⇒ milk appears live on the kitchen board.

### Notify the family
Share sheet in iOS → "Send to Magic Frame" → sends text to `/api/messages`.

### Kid-chore shortcut
Home-screen button "Trash taken out":
```
PATCH /api/todos/TODO_ID?key=TOKEN
Body: { "toggle": true }
```

---

## Roadmap

Features not yet built:

- **Device refresh via HTTP** — `POST /api/devices/refresh?dashboardId=…` (currently socket-event only)
- **Push notifications back to the phone** — Web Push or APNs bridge
- **File upload for messages** — currently URL only; Immich direct upload coming
- **Family accounts** — real multi-user auth instead of "one admin + token"
- **Recipes → shopping list** — "add this recipe" as bulk import

---

## Source pointers

- Prisma client singleton: `src/lib/companion/prisma.ts`
- Token auth: `src/lib/auth/shortcut.ts`
- Stores: `src/lib/timers/store.ts`, `src/lib/companion/{messages,shopping,todos}.ts`
- API routes: `src/app/api/{timers,messages,shopping,todos}/{route.ts,[id]/route.ts}`
- Token API: `src/app/api/auth/shortcut-token/route.ts`
- Socket server: `server.js`
- Widgets: `src/components/widgets/{TimerWidget,MessagesWidget,ShoppingListWidget,TodosWidget}.tsx`
- Inspectors: `src/app/editor/_inspectors/CompanionInspectors.tsx`

import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * What a login-free display is allowed to ask Home Assistant to do.
 *
 * `/api/ha/action` has no session check, and that is deliberate: a wall tablet
 * shows `/view/<id>` without logging in, and its buttons have to work. The
 * consequence was that anyone who could reach the server could call ANY service
 * on ANY entity with the stored token's full rights — the front door lock
 * included, whether or not it appeared on any screen.
 *
 * "No login" does not have to mean "no limit". A display only ever needs what
 * is actually on the views this installation has built, and that set is sitting
 * in the saved configs. Two questions are asked, and both have to pass:
 *
 *   1. WHICH ENTITY — every entity id in the outgoing payload has to be one
 *      that appears in a saved widget or view config.
 *   2. WHICH SERVICE — the verb has to be one the widgets actually emit, or a
 *      `domain.service` a Button widget has saved. Otherwise a single lamp on a
 *      view would be enough to reach `hassio.host_reboot`, which ignores its
 *      target entirely.
 *
 * What this does NOT protect against: somebody on your network operating a
 * switch that is already on one of your screens. It cannot — that is the same
 * thing a person standing in front of the tablet can do, and the tablet has no
 * password either. What it removes is the gap between "what is on the wall" and
 * "everything Home Assistant can do".
 *
 * The escape hatch is `MAGIC_FRAME_HA_ACTION_UNRESTRICTED` (1/true/yes/on),
 * documented in .env.example and wiki/home-assistant.md.
 */

/** `light.kitchen`, `binary_sensor.front_door` — domain, dot, object id. */
const ENTITY_ID = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;

/** Config keys whose value is a `domain.service` string, not an entity id. */
const SERVICE_KEY = /^(haService|longPressService)\d*$/;

/**
 * Entity ids are compared after trimming and lower-casing on BOTH sides.
 *
 * The widgets normalise before they send (`(config?.tapEntity || "").trim()`),
 * so a config value that carries a stray space would otherwise be collected in
 * one form and looked up in another — and the tile would stop working with no
 * message anywhere.
 */
export function normaliseEntityId(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Verbs that act on the entity they are given and nothing else.
 *
 * This is what the widgets emit: the generic toggle, the light/switch verbs,
 * the cover controls, the lock pair, button presses, the media transport, and
 * the notification dismiss. Anything outside this list has to be configured on
 * a Button widget to be reachable — see `collectServices`.
 *
 * Deliberately NOT here: `stop` (that is `homeassistant.stop`), `reload`,
 * `create`, `restart`, `host_reboot`, and every `notify.*` / `shell_command.*`
 * service. Those ignore the entity they are handed.
 */
const SAFE_SERVICES = new Set([
  "toggle",
  "turn_on",
  "turn_off",
  "open_cover",
  "close_cover",
  "stop_cover",
  "toggle_cover",
  "set_cover_position",
  "set_cover_tilt_position",
  "lock",
  "unlock",
  "open",
  "press",
  "media_play",
  "media_pause",
  "media_play_pause",
  "media_stop",
  "media_next_track",
  "media_previous_track",
  "media_seek",
  "volume_set",
  "volume_up",
  "volume_down",
  "volume_mute",
  "shuffle_set",
  "repeat_set",
  "select_source",
  "select_option",
  "set_temperature",
  "set_hvac_mode",
  "set_fan_mode",
  "set_percentage",
  "set_preset_mode",
  "dismiss",
]);

/**
 * Walks a config and collects everything shaped like an entity id.
 *
 * Deliberately by SHAPE, not by key name. Entity ids live under at least
 * `entityId`, `entityId2`, `statusEntity`, `imageEntity`, `progressEntity`,
 * `showWhenEntity`, `tapEntity`, `clearEntityId`, inside `entities[]`,
 * `rules[]`, `statusDetails[]` and `haEntities[]` — and a new widget will
 * invent another one. A key allowlist would go stale silently and lock out a
 * button that works today; matching the shape cannot.
 *
 * The `haService` keys are skipped: `light.turn_on` has the same shape as an
 * entity id, and letting it into the entity set would allow acting on an
 * entity called `turn_on` in the `light` domain. Unlikely, but free to avoid.
 */
function collectEntityIds(value: unknown, into: Set<string>, depth = 0): void {
  if (depth > 8 || value == null) return;
  if (typeof value === "string") {
    const v = normaliseEntityId(value);
    if (ENTITY_ID.test(v)) into.add(v);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectEntityIds(v, into, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SERVICE_KEY.test(k)) continue;
      collectEntityIds(v, into, depth + 1);
    }
  }
}

/** Collects the `domain.service` strings a Button widget has saved. */
function collectServices(value: unknown, into: Set<string>, depth = 0): void {
  if (depth > 8 || value == null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const v of value) collectServices(v, into, depth + 1);
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SERVICE_KEY.test(k) && typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (ENTITY_ID.test(s)) into.add(s);
    } else {
      collectServices(v, into, depth + 1);
    }
  }
}

// Rebuilding on every button press would mean a database round trip per tap.
// Short cache; the write paths that change the set clear it outright, so the
// TTL only covers changes made straight in the database.
const TTL_MS = 30_000;
let cache: { at: number; ids: Set<string>; services: Set<string> } | null = null;

/**
 * Drops the cached allowlist.
 *
 * Called from every route that changes what is on a view — layout save,
 * dashboard create/duplicate/rename/delete, backup import, snapshot restore —
 * so a freshly placed button works the moment the display receives it, instead
 * of being refused for up to half a minute while the tile is visibly there.
 */
export function forgetAllowedEntities(): void {
  cache = null;
}

async function loadPolicy(): Promise<{ ids: Set<string>; services: Set<string> }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const ids = new Set<string>();
  const services = new Set<string>();
  try {
    const widgets = await prisma.widget.findMany({ select: { config: true } });
    for (const w of widgets) {
      collectEntityIds(w.config, ids);
      collectServices(w.config, services);
    }
    // Wallpapers carry an artwork player, and view settings can carry entities.
    const dashboards = await prisma.dashboard.findMany({ select: { wallpaper: true, settings: true } });
    for (const d of dashboards) {
      collectEntityIds(d.wallpaper, ids);
      collectEntityIds(d.settings, ids);
    }
    // A custom module's manifest can ship a field default that the user never
    // opens — the value then lives in manifestJson and never reaches
    // Widget.config, so the module's own button would be refused.
    const modules = await prisma.customModule.findMany({ select: { manifestJson: true } });
    for (const m of modules) {
      try {
        collectEntityIds(JSON.parse(m.manifestJson), ids);
      } catch {
        // A malformed manifest is the modules page's problem, not this one.
      }
    }
  } catch (err) {
    // A database hiccup must not turn every button in the house into a 403.
    // Prefer the last known set; if there is none, allow — refusing everything
    // is a worse failure than the one being prevented. Logged either way: an
    // allowlist that is silently off is indistinguishable from one that works.
    console.error(
      "[ha/action] could not load the entity allowlist — %s",
      cache ? "using the last known set" : "allowing every entity until the database answers",
      err,
    );
    return cache ?? { ids: new Set(["*"]), services: new Set(["*"]) };
  }
  cache = { at: Date.now(), ids, services };
  return cache;
}

export async function allowedEntities(): Promise<Set<string>> {
  return (await loadPolicy()).ids;
}

function unrestricted(): boolean {
  const v = (process.env.MAGIC_FRAME_HA_ACTION_UNRESTRICTED || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * `true` when a login-free display may act on this entity.
 *
 * A signed-in editor session bypasses this entirely — the entity picker has to
 * be able to try things that are not on a screen yet.
 */
export async function mayActOn(entityId: string): Promise<boolean> {
  if (unrestricted()) return true;
  const { ids } = await loadPolicy();
  if (ids.has("*")) return true;
  return ids.has(normaliseEntityId(entityId));
}

/**
 * `true` when a login-free display may call this service.
 *
 * Persistent notifications are always dismissable: their entity ids are minted
 * by Home Assistant at runtime and appear in no saved config, so they can never
 * be on the entity allowlist — and dismissing one only clears a message the
 * display is already showing.
 */
export async function mayCallService(domain: string, service: string): Promise<boolean> {
  if (unrestricted()) return true;
  const d = String(domain || "").trim().toLowerCase();
  const s = String(service || "").trim().toLowerCase();
  if (d === "persistent_notification" && s === "dismiss") return true;
  if (SAFE_SERVICES.has(s)) return true;
  const { services } = await loadPolicy();
  if (services.has("*")) return true;
  return services.has(`${d}.${s}`);
}

/**
 * `true` when the caller may touch this entity — session first, then the list.
 *
 * The shared form of the check for routes that act on ONE named entity, so the
 * session-bypass and the allowlist stay in one place. `/api/ha/action` builds
 * its own version because it also has a payload full of targets to validate.
 */
export async function callerMayUse(entityId: string): Promise<boolean> {
  try {
    const { getSession } = await import("@/lib/auth/session");
    if ((await getSession()).userId) return true;
  } catch {
    // No usable SESSION_SECRET — treat as not signed in and let the allowlist
    // decide. A broken .env must not widen a route.
  }
  return mayActOn(entityId);
}

/** A persistent notification's id is minted by HA and is never in a config. */
export function isPersistentNotification(entityId: string): boolean {
  return normaliseEntityId(entityId).startsWith("persistent_notification.");
}

/**
 * Every entity id the outgoing payload would act on.
 *
 * `body.data` is caller-controlled and is merged into the payload, so checking
 * only `body.entityId` would be decorative: `{"entityId":"light.kitchen",
 * "domain":"lock","service":"unlock","data":{"entity_id":"lock.front_door"}}`
 * passed the check and unlocked a different entity. Everything that ends up as
 * a target gets validated, not just the one field that was easy to read.
 */
export function payloadTargets(payload: Record<string, unknown>): {
  entityIds: string[];
  hasOpaqueTarget: boolean;
} {
  const entityIds: string[] = [];
  let hasOpaqueTarget = false;

  const readEntity = (v: unknown) => {
    if (typeof v === "string") entityIds.push(normaliseEntityId(v));
    else if (Array.isArray(v)) for (const x of v) if (typeof x === "string") entityIds.push(normaliseEntityId(x));
  };

  const scan = (obj: unknown) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const o = obj as Record<string, unknown>;
    if ("entity_id" in o) readEntity(o.entity_id);
    // device_id and area_id name a set of entities this code cannot resolve
    // without asking Home Assistant, so they cannot be checked against the
    // allowlist at all. A login-free caller does not get to use them.
    if (o.device_id != null || o.area_id != null || o.label_id != null) hasOpaqueTarget = true;
    if (o.target && typeof o.target === "object") scan(o.target);
  };

  scan(payload);
  return { entityIds: entityIds.filter(Boolean), hasOpaqueTarget };
}

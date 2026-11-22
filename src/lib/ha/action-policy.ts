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

/** `device_id`, `area_id`, `label_id` — ein Ziel, das dieser Code nicht auflösen kann. */
const OPAQUE_KEY = /^(device_id|area_id|label_id)$/;

/** Nimmt einen String, eine Komma-Liste oder ein Array und gibt saubere Kennungen zurück. */
function asIdList(v: unknown): string[] {
  if (typeof v === "string") return v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap(asIdList);
  return [];
}

/**
 * Geräte-, Bereichs- und Label-Kennungen aus den gespeicherten Konfigurationen.
 *
 * Der Server kann eine device_id nicht auflösen, ohne Home Assistant zu fragen —
 * deshalb wurde sie pauschal abgelehnt. Dasselbe Argument galt einmal für
 * Entitäten und wurde dadurch gelöst, dass man sie aus den Konfigurationen
 * einsammelt. Genau das hier: was der Besitzer selbst in einen Knopf
 * geschrieben hat, liegt auf der Wand und darf benutzt werden. Was nicht darin
 * steht, weiterhin nicht.
 *
 * Ohne das lehnt eine Konfiguration ab, die der Editor selbst anbietet: wer die
 * Dienst-Daten aus Home Assistants Entwicklerwerkzeugen kopiert, bekommt dort
 * `device_id` — im Browser des Admins geht der Knopf, auf dem Tablett nicht.
 */
function collectOpaqueTargets(value: unknown, into: Set<string>, depth = 0): void {
  if (depth > 8 || value == null) return;
  if (typeof value === "string") {
    const t = value.trim();
    if ((t.startsWith("{") || t.startsWith("[")) && t.length < 20_000) {
      try {
        collectOpaqueTargets(JSON.parse(t), into, depth + 1);
      } catch {
        /* kein JSON */
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectOpaqueTargets(v, into, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (OPAQUE_KEY.test(k)) {
        for (const id of asIdList(v)) into.add(id);
        continue;
      }
      collectOpaqueTargets(v, into, depth + 1);
    }
  }
}

/** Config keys whose value is a `domain.service` string, not an entity id. */
const SERVICE_KEY = /^(haService|longPressHaService|longPressService)\d*$/;

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
  "set_cover_position",
  "set_cover_tilt_position",
  "lock",
  "unlock",
  // "open" stand hier und war ein Loch: die Domain wird vor dem Nachschlagen
  // verworfen, also hätte `lock.open` — das physische Aufziehen der Falle, nicht
  // bloss Entriegeln — für jedes Schloss auf jeder Ansicht gegolten, ohne jede
  // Konfiguration, auf einer Route ohne Anmeldung. Kein Widget sendet es.
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
    // "light.a, light.b" — Home Assistant nimmt eine Komma-Liste an, und aus den
    // Entwicklerwerkzeugen kopiert man sie genau so. Nur aufteilen, wenn JEDER
    // Teil die Form einer entity_id hat: sonst würde ein Fliesstext, in dem
    // zufällig eine Kennung vorkommt, die Liste heimlich erweitern.
    if (v.includes(",")) {
      const parts = v.split(",").map((x) => x.trim()).filter(Boolean);
      if (parts.length > 1 && parts.every((x) => ENTITY_ID.test(x))) for (const x of parts) into.add(x);
    }
    // Manche Felder halten JSON als Text: die Dienst-Daten eines Buttons sind
    // ein Freitextfeld, in das man aus Home Assistants Entwicklerwerkzeugen
    // etwas wie {"entity_id": "light.decke"} hineinkopiert. Ohne dieses
    // Hineinsehen wäre die Entität nie auf der Liste — und die Ablehnung
    // nennt dann eine Entität, die im selben Button sichtbar konfiguriert ist.
    const t = value.trim();
    if ((t.startsWith("{") || t.startsWith("[")) && t.length < 20_000) {
      try {
        collectEntityIds(JSON.parse(t), into, depth + 1);
      } catch {
        // Kein gültiges JSON — dann ist es einfach Text.
      }
    }
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

/**
 * Every string a saved config holds, trimmed — and, because the RSS widget
 * keeps several feeds in one field (one per line or comma-separated) and the
 * route splits them the same way, every part of such a list as well.
 *
 * This is what a login-free display may hand to a route that fetches on its
 * behalf: an RSS or iCal address, a calendar account id. Whatever stands in a
 * saved view was put there by the owner; an address that stands nowhere was
 * not, and the server has no business fetching it for a stranger.
 */
function collectTexts(value: unknown, into: Set<string>, depth = 0): void {
  if (depth > 8 || value == null) return;
  // An id saved as a number (an old Todoist project id) is still that id.
  if (typeof value === "number" && Number.isFinite(value)) {
    into.add(String(value));
    return;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (!t || t.length > 20_000) return;
    if (t.length <= 4096) into.add(t);
    if (/[\n,]/.test(t)) {
      for (const part of t.split(/[\n,]/)) {
        const p = part.trim();
        if (p && p.length <= 4096) into.add(p);
      }
    }
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        collectTexts(JSON.parse(t), into, depth + 1);
      } catch {
        // Kein JSON — dann ist es einfach Text.
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectTexts(v, into, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectTexts(v, into, depth + 1);
  }
}

type Policy = {
  ids: Set<string>;
  services: Set<string>;
  targets: Set<string>;
  texts: Set<string>;
  types: Set<string>;
};

// Rebuilding on every button press would mean a database round trip per tap.
// Short cache; the write paths that change the set clear it outright, so the
// TTL only covers changes made straight in the database.
const TTL_MS = 30_000;
let cache: ({ at: number } & Policy) | null = null;

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

async function loadPolicy(): Promise<Policy> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const ids = new Set<string>();
  const services = new Set<string>();
  const targets = new Set<string>();
  const texts = new Set<string>();
  const types = new Set<string>();
  try {
    const widgets = await prisma.widget.findMany({ select: { type: true, config: true } });
    for (const w of widgets) {
      types.add(w.type);
      collectEntityIds(w.config, ids);
      collectServices(w.config, services);
      collectOpaqueTargets(w.config, targets);
      collectTexts(w.config, texts);
    }
    // Wallpapers carry an artwork player, and view settings can carry entities.
    const dashboards = await prisma.dashboard.findMany({ select: { wallpaper: true, settings: true } });
    for (const d of dashboards) {
      collectEntityIds(d.wallpaper, ids);
      collectEntityIds(d.settings, ids);
      collectOpaqueTargets(d.settings, targets);
      collectTexts(d.wallpaper, texts);
      collectTexts(d.settings, texts);
    }
    // A custom module's manifest can ship a field default that the user never
    // opens — the value then lives in manifestJson and never reaches
    // Widget.config, so the module's own button would be refused.
    const modules = await prisma.customModule.findMany({ select: { manifestJson: true } });
    for (const m of modules) {
      try {
        const manifest = JSON.parse(m.manifestJson);
        collectEntityIds(manifest, ids);
        // Dienste standen hier nie — ein Modul, das ein Feld `haService` mitbringt,
        // wurde für Entitäten gelesen und für Dienste ignoriert.
        collectServices(manifest, services);
        collectOpaqueTargets(manifest, targets);
        collectTexts(manifest, texts);
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
    const all = () => new Set(["*"]);
    return cache ?? { ids: all(), services: all(), targets: all(), texts: all(), types: all() };
  }
  cache = { at: Date.now(), ids, services, targets, texts, types };
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

/** `light.kitchen` — the only shape of id a read route hands to Home Assistant. */
export function isEntityId(value: unknown): boolean {
  return ENTITY_ID.test(normaliseEntityId(value));
}

/** `true` when the request carries a signed-in session. */
export async function isSignedIn(): Promise<boolean> {
  try {
    const { getSession } = await import("@/lib/auth/session");
    return !!(await getSession()).userId;
  } catch {
    // No usable SESSION_SECRET — not signed in. A broken .env must not widen a route.
    return false;
  }
}

// One line per refused thing per ten minutes: enough to find a display that
// asks for something it should have, too little for a scanner to flood the log.
const refusedAt = new Map<string, number>();

/** Logs that a caller without login was refused `what` (an entity, a host). */
export function noteRefused(route: string, what: string): void {
  const key = `${route} ${what}`;
  const now = Date.now();
  const last = refusedAt.get(key);
  if (last && now - last < 10 * 60_000) return;
  if (refusedAt.size > 500) refusedAt.clear();
  refusedAt.set(key, now);
  console.warn(`[${route}] refused ${what} to a caller without login — not on any of your views`);
}

/**
 * The ids from `asked` this caller may READ, in the order asked.
 *
 * Reading had no limit at all: the state, live-stream, history, camera and
 * artwork routes answered for every entity, so anyone who could reach the
 * server could read every state in the house — with a domain, from the
 * internet, `person` and `device_tracker` locations included, and watch every
 * camera. A display only ever reads what is on its views, the same set it may
 * act on, so that is the limit here too. A signed-in session may read anything
 * well formed: the editor shows entities before they are saved anywhere.
 *
 * Everybody, signed in or not, only gets ids of the right shape through. The id
 * ends up in a Home Assistant URL, and `../config` would otherwise walk out of
 * /api/states into the rest of its API.
 */
export async function readableEntities(route: string, asked: string[]): Promise<string[]> {
  const wellFormed = asked.filter((id) => isEntityId(id));
  if (wellFormed.length === 0) return [];
  if (await isSignedIn()) return wellFormed;
  const out: string[] = [];
  for (const id of wellFormed) {
    if (await mayActOn(id)) out.push(id);
    else noteRefused(route, normaliseEntityId(id));
  }
  return out;
}

/** The one-entity form of `readableEntities`. */
export async function callerMayRead(route: string, entityId: string): Promise<boolean> {
  return (await readableEntities(route, [entityId])).length === 1;
}

/**
 * `true` when a caller without login may have the server fetch this address,
 * or use this calendar account: it has to stand in a saved view or in a
 * module's defaults. See `collectTexts`.
 */
export async function standsInAView(text: string): Promise<boolean> {
  const t = String(text ?? "").trim();
  if (!t) return false;
  const { texts } = await loadPolicy();
  return texts.has("*") || texts.has(t);
}

/** `true` when at least one saved view has a widget of this type. */
export async function viewsUseWidget(type: string): Promise<boolean> {
  const { types } = await loadPolicy();
  return types.has("*") || types.has(type);
}

/** `true`, wenn dieses Gerät oder dieser Bereich in einer gespeicherten Konfiguration steht. */
export async function mayTarget(id: string): Promise<boolean> {
  if (unrestricted()) return true;
  const { targets } = await loadPolicy();
  if (targets.has("*")) return true;
  return targets.has(String(id).trim().toLowerCase());
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
  opaqueTargets: string[];
} {
  const entityIds: string[] = [];
  const opaqueTargets: string[] = [];

  // asIdList teilt auch Komma-Listen auf — sonst nennt die Ablehnung
  // "light.a, light.b" als eine Kennung, was niemand zuordnen kann.
  const readEntity = (v: unknown) => {
    for (const id of asIdList(v)) entityIds.push(id);
  };

  const scan = (obj: unknown) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    const o = obj as Record<string, unknown>;
    if ("entity_id" in o) readEntity(o.entity_id);
    // device_id and area_id name a set of entities this code cannot resolve
    // without asking Home Assistant, so they cannot be checked against the
    // allowlist at all. A login-free caller does not get to use them.
    if (o.device_id != null) for (const id of asIdList(o.device_id)) opaqueTargets.push(id);
    if (o.area_id != null) for (const id of asIdList(o.area_id)) opaqueTargets.push(id);
    if (o.label_id != null) for (const id of asIdList(o.label_id)) opaqueTargets.push(id);
    if (o.target && typeof o.target === "object") scan(o.target);
  };

  scan(payload);
  return { entityIds: entityIds.filter(Boolean), opaqueTargets };
}

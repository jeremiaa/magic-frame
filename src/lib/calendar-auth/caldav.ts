import "server-only";
import { expandIcsEvents } from "./ics";
import type { ProviderCalendar, ProviderEvent } from "./providers";

// CalDAV (RFC 4791) client — Nextcloud, Baïkal, Radicale, Synology, Fastmail,
// iCloud and friends. Unlike Google/Microsoft there is no OAuth dance: the
// account is a server URL plus username/password (an app password on most
// servers), stored in CalendarAuth with provider="caldav".
//
// Two operations are needed for the calendar widget:
//   1. discovery  — principal → calendar-home-set → the calendar collections,
//      so the inspector can offer a pick list instead of asking for a URL.
//   2. events     — a calendar-query REPORT with a time-range filter, which
//      returns whole ICS resources that are expanded by the shared iCal code
//      (recurrence masters + overrides, all-day handling, VTIMEZONE).

export type CaldavCredentials = {
  serverUrl: string;
  username: string;
  password: string;
};

const REQUEST_TIMEOUT_MS = 12_000;
// Discovery costs three round trips, so the event path (which runs on every
// widget refresh when no calendar was picked explicitly) reuses the result.
const DISCOVERY_TTL_MS = 10 * 60 * 1000;
const discoveryCache = new Map<string, { calendars: ProviderCalendar[]; at: number }>();

/* ------------------------------------------------------------------ *
 * Minimal XML reader
 *
 * WebDAV multistatus bodies are machine-generated and shallow, but every
 * server picks its own namespace prefixes (d:/D:/dav:/none), so everything
 * here matches on the LOCAL name only. Kept in-tree on purpose: pulling in a
 * full XML parser for four element names isn't worth the dependency.
 * ------------------------------------------------------------------ */

type XmlNode = {
  name: string; // local name, lower-cased
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

function localName(qualified: string): string {
  const colon = qualified.indexOf(":");
  return (colon >= 0 ? qualified.slice(colon + 1) : qualified).toLowerCase();
}

// The end of a tag, ignoring ">" inside quoted attribute values.
function findTagEnd(src: string, from: number): number {
  let quote: string | null = null;
  for (let i = from; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
  }
  return -1;
}

const ATTR_RE = /([\w:.\-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(source))) {
    attrs[localName(m[1])] = decodeEntities(m[2] ?? m[3] ?? "");
  }
  return attrs;
}

function parseXml(src: string): XmlNode {
  const root: XmlNode = { name: "#root", attrs: {}, children: [], text: "" };
  const stack: XmlNode[] = [root];
  const top = () => stack[stack.length - 1];
  let i = 0;

  while (i < src.length) {
    const lt = src.indexOf("<", i);
    if (lt < 0) {
      top().text += decodeEntities(src.slice(i));
      break;
    }
    if (lt > i) top().text += decodeEntities(src.slice(i, lt));

    if (src.startsWith("<![CDATA[", lt)) {
      const end = src.indexOf("]]>", lt);
      top().text += src.slice(lt + 9, end < 0 ? src.length : end);
      i = end < 0 ? src.length : end + 3;
      continue;
    }
    if (src.startsWith("<!--", lt)) {
      const end = src.indexOf("-->", lt);
      i = end < 0 ? src.length : end + 3;
      continue;
    }
    if (src.startsWith("<?", lt)) {
      const end = src.indexOf("?>", lt);
      i = end < 0 ? src.length : end + 2;
      continue;
    }
    if (src.startsWith("<!", lt)) {
      const end = findTagEnd(src, lt + 2);
      i = end < 0 ? src.length : end + 1;
      continue;
    }

    const gt = findTagEnd(src, lt + 1);
    if (gt < 0) break;
    const inner = src.slice(lt + 1, gt);
    i = gt + 1;

    if (inner.startsWith("/")) {
      const closing = localName(inner.slice(1).trim());
      // Pop to the nearest matching open element; unbalanced markup from a
      // sloppy server shouldn't derail the rest of the document.
      for (let s = stack.length - 1; s > 0; s--) {
        if (stack[s].name === closing) {
          stack.length = s;
          break;
        }
      }
      continue;
    }

    const selfClosing = inner.endsWith("/");
    const body = selfClosing ? inner.slice(0, -1) : inner;
    const nameEnd = body.search(/[\s/]/);
    const name = localName((nameEnd < 0 ? body : body.slice(0, nameEnd)).trim());
    if (!name) continue;

    const node: XmlNode = {
      name,
      attrs: nameEnd < 0 ? {} : parseAttrs(body.slice(nameEnd)),
      children: [],
      text: "",
    };
    top().children.push(node);
    if (!selfClosing) stack.push(node);
  }

  return root;
}

function findAll(node: XmlNode, name: string, out: XmlNode[] = []): XmlNode[] {
  for (const child of node.children) {
    if (child.name === name) out.push(child);
    findAll(child, name, out);
  }
  return out;
}

function findFirst(node: XmlNode, name: string): XmlNode | null {
  for (const child of node.children) {
    if (child.name === name) return child;
    const nested = findFirst(child, name);
    if (nested) return nested;
  }
  return null;
}

function textContent(node: XmlNode | null | undefined): string {
  if (!node) return "";
  return node.children.reduce((acc, c) => acc + textContent(c), node.text);
}

/* ------------------------------------------------------------------ *
 * DAV plumbing
 * ------------------------------------------------------------------ */

export function normalizeServerUrl(raw: string): string {
  let url = String(raw ?? "").trim();
  if (!url) throw new Error("caldav_missing_url");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    return new URL(url).toString();
  } catch {
    throw new Error("caldav_invalid_url");
  }
}

function authHeader(creds: CaldavCredentials): string {
  return `Basic ${Buffer.from(`${creds.username}:${creds.password}`, "utf8").toString("base64")}`;
}

type DavResult = { status: number; url: string; body: string };

async function davRequest(
  url: string,
  opts: { method: string; creds: CaldavCredentials; body?: string; depth?: "0" | "1" },
): Promise<DavResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method,
      headers: {
        Authorization: authHeader(opts.creds),
        "Content-Type": 'application/xml; charset="utf-8"',
        ...(opts.depth ? { Depth: opts.depth } : {}),
        // Some servers (Synology among them) reject requests without one.
        "User-Agent": "MagicFrame/1.0 CalDAV",
      },
      body: opts.body,
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error("caldav_timeout");
    }
    throw new Error(`caldav_unreachable:${String(err?.message ?? err).slice(0, 120)}`);
  }

  if (res.status === 401) throw new Error("caldav_unauthorized");
  if (res.status === 403) throw new Error("caldav_forbidden");

  return { status: res.status, url: res.url || url, body: await res.text() };
}

// A multistatus response: href (absolute) + the props from 200-OK propstats.
type DavItem = { href: string; props: Map<string, XmlNode> };

function parseMultiStatus(result: DavResult): DavItem[] {
  if (result.status !== 207 && result.status !== 200) return [];
  const doc = parseXml(result.body);
  const items: DavItem[] = [];

  for (const response of findAll(doc, "response")) {
    const hrefNode = response.children.find((c) => c.name === "href") ?? findFirst(response, "href");
    const rawHref = textContent(hrefNode).trim();
    if (!rawHref) continue;

    let href: string;
    try {
      href = new URL(rawHref, result.url).toString();
    } catch {
      continue;
    }

    const props = new Map<string, XmlNode>();
    const propstats = findAll(response, "propstat");
    const propNodes: XmlNode[] = propstats.length
      ? propstats
          // Skip the 404/403 propstat blocks — those only list the names of
          // props the resource doesn't have, with empty values.
          .filter((ps) => {
            const status = textContent(findFirst(ps, "status"));
            return !status || / 20\d(\s|$)/.test(status);
          })
          .flatMap((ps) => findFirst(ps, "prop")?.children ?? [])
      : (findFirst(response, "prop")?.children ?? []);

    for (const p of propNodes) if (!props.has(p.name)) props.set(p.name, p);
    items.push({ href, props });
  }

  return items;
}

function hrefOf(prop: XmlNode | undefined, baseUrl: string): string | null {
  if (!prop) return null;
  const raw = textContent(findFirst(prop, "href")).trim();
  if (!raw) return null;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return null;
  }
}

const PROPFIND_PRINCIPAL = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/><d:principal-URL/></d:prop></d:propfind>`;

const PROPFIND_HOME = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`;

const PROPFIND_CALENDARS = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:ic="http://apple.com/ns/ical/">
  <d:prop>
    <d:resourcetype/>
    <d:displayname/>
    <c:supported-calendar-component-set/>
    <ic:calendar-color/>
  </d:prop>
</d:propfind>`;

async function findPrincipal(creds: CaldavCredentials): Promise<string | null> {
  const base = normalizeServerUrl(creds.serverUrl);
  const candidates = [base];
  // Users typically paste the bare server address; /.well-known/caldav is the
  // RFC 6764 bootstrap that turns it into the real DAV entry point.
  try {
    const wellKnown = new URL("/.well-known/caldav", base).toString();
    if (wellKnown !== base) candidates.push(wellKnown);
  } catch {
    /* base is already validated — ignore */
  }

  for (const url of candidates) {
    let result: DavResult;
    try {
      result = await davRequest(url, {
        method: "PROPFIND",
        creds,
        body: PROPFIND_PRINCIPAL,
        depth: "0",
      });
    } catch (err: any) {
      // Auth problems are terminal — no point trying the next candidate.
      if (String(err?.message).startsWith("caldav_unauthorized")) throw err;
      if (String(err?.message).startsWith("caldav_forbidden")) throw err;
      continue;
    }

    for (const item of parseMultiStatus(result)) {
      const principal =
        hrefOf(item.props.get("current-user-principal"), result.url) ??
        hrefOf(item.props.get("principal-url"), result.url);
      if (principal) return principal;
    }
  }
  return null;
}

async function findCalendarHome(
  creds: CaldavCredentials,
  principalUrl: string,
): Promise<string | null> {
  const result = await davRequest(principalUrl, {
    method: "PROPFIND",
    creds,
    body: PROPFIND_HOME,
    depth: "0",
  });
  for (const item of parseMultiStatus(result)) {
    const home = hrefOf(item.props.get("calendar-home-set"), result.url);
    if (home) return home;
  }
  return null;
}

function isCalendarCollection(props: Map<string, XmlNode>): boolean {
  const resourcetype = props.get("resourcetype");
  if (!resourcetype?.children.some((c) => c.name === "calendar")) return false;

  // Contact/task-only collections live in the same home. When the server
  // reports its component set, require VEVENT; when it stays silent, accept.
  const comps = props.get("supported-calendar-component-set");
  const names = comps?.children.filter((c) => c.name === "comp").map((c) => c.attrs.name ?? "") ?? [];
  return names.length === 0 || names.some((n) => n.toUpperCase() === "VEVENT");
}

function isPlainCollection(props: Map<string, XmlNode>): boolean {
  return !!props.get("resourcetype")?.children.some((c) => c.name === "collection");
}

function toProviderCalendar(item: DavItem): ProviderCalendar {
  const name = textContent(item.props.get("displayname")).trim();
  const color = textContent(item.props.get("calendar-color")).trim();
  return {
    id: item.href,
    // Fall back to the last path segment — Radicale and friends happily serve
    // calendars without a displayname.
    summary: name || decodeURIComponent(item.href.replace(/\/+$/, "").split("/").pop() || item.href),
    // #RRGGBBAA is what Apple's extension emits; CSS is fine with it, but the
    // inspector swatches expect plain hex.
    backgroundColor: /^#[0-9a-f]{6,8}$/i.test(color) ? color.slice(0, 7) : undefined,
  };
}

async function listCalendarsIn(
  creds: CaldavCredentials,
  collectionUrl: string,
): Promise<{ calendars: ProviderCalendar[]; subCollections: string[] }> {
  const result = await davRequest(collectionUrl, {
    method: "PROPFIND",
    creds,
    body: PROPFIND_CALENDARS,
    depth: "1",
  });

  const calendars: ProviderCalendar[] = [];
  const subCollections: string[] = [];
  const self = new URL(collectionUrl).pathname.replace(/\/+$/, "");

  for (const item of parseMultiStatus(result)) {
    if (isCalendarCollection(item.props)) {
      calendars.push(toProviderCalendar(item));
      continue;
    }
    const path = new URL(item.href).pathname.replace(/\/+$/, "");
    if (path !== self && isPlainCollection(item.props)) subCollections.push(item.href);
  }

  return { calendars, subCollections };
}

/**
 * Principal → calendar-home-set → calendar collections. Every step degrades
 * gracefully, because "just point at the URL your phone uses" covers a wide
 * range of shapes: a server root, a DAV root, a principal, or the calendar
 * home itself.
 */
export async function discoverCaldavCalendars(
  creds: CaldavCredentials,
): Promise<ProviderCalendar[]> {
  const base = normalizeServerUrl(creds.serverUrl);
  const principal = await findPrincipal(creds);

  let home: string | null = null;
  if (principal) {
    try {
      home = await findCalendarHome(creds, principal);
    } catch {
      home = null;
    }
  }
  // No principal or no home advertised — treat what the user gave us as the
  // collection to look in.
  const root = home ?? principal ?? base;

  const seen = new Set<string>();
  const calendars: ProviderCalendar[] = [];
  const collect = (found: ProviderCalendar[]) => {
    for (const cal of found) {
      if (seen.has(cal.id)) continue;
      seen.add(cal.id);
      calendars.push(cal);
    }
  };

  const { calendars: found, subCollections } = await listCalendarsIn(creds, root);
  collect(found);

  if (calendars.length === 0) {
    // Nothing at this level: some servers (Radicale, for instance) nest the
    // calendars one collection deeper. Look one level down, bounded.
    for (const sub of subCollections.slice(0, 10)) {
      try {
        collect((await listCalendarsIn(creds, sub)).calendars);
      } catch {
        continue;
      }
    }
  }

  calendars.sort((a, b) => a.summary.localeCompare(b.summary));
  return calendars;
}

/** Discovery with a short TTL — the event path may need it on every refresh. */
async function cachedDiscovery(creds: CaldavCredentials): Promise<ProviderCalendar[]> {
  const key = `${creds.serverUrl}|${creds.username}`;
  const hit = discoveryCache.get(key);
  if (hit && Date.now() - hit.at < DISCOVERY_TTL_MS) return hit.calendars;
  const calendars = await discoverCaldavCalendars(creds);
  discoveryCache.set(key, { calendars, at: Date.now() });
  return calendars;
}

function icalUtcStamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
}

function calendarQueryBody(windowStart: Date, windowEnd: Date): string {
  return `<?xml version="1.0" encoding="utf-8" ?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><d:getetag/><c:calendar-data/></d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${icalUtcStamp(windowStart)}" end="${icalUtcStamp(windowEnd)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
}

export async function fetchCaldavEvents(params: {
  creds: CaldavCredentials;
  calendarUrl: string;
  windowStart: Date;
  windowEnd: Date;
  limit: number;
}): Promise<ProviderEvent[]> {
  let calendarUrl = params.calendarUrl?.trim();
  if (!calendarUrl) {
    // No calendar picked in the inspector → first one the account has.
    const calendars = await cachedDiscovery(params.creds);
    if (calendars.length === 0) throw new Error("caldav_no_calendars");
    calendarUrl = calendars[0].id;
  } else {
    // Older configs (and hand-typed values) may hold a path instead of an
    // absolute URL — resolve it against the account's server.
    calendarUrl = new URL(calendarUrl, normalizeServerUrl(params.creds.serverUrl)).toString();
  }

  const result = await davRequest(calendarUrl, {
    method: "REPORT",
    creds: params.creds,
    body: calendarQueryBody(params.windowStart, params.windowEnd),
    depth: "1",
  });
  if (result.status !== 207 && result.status !== 200) {
    throw new Error(`caldav_http_${result.status}`);
  }

  // One ICS document per calendar resource. A recurring series arrives as a
  // single document holding the master plus its overrides, which is exactly
  // what the shared expander expects.
  const documents = parseMultiStatus(result)
    .map((item) => textContent(item.props.get("calendar-data")).trim())
    .filter((ics) => ics.includes("BEGIN:VEVENT"));

  return expandIcsEvents(documents, params.windowStart, params.windowEnd, params.limit);
}

/**
 * Connection check for the "connect account" form: verifies the credentials
 * and returns what the account exposes, so the UI can say "3 calendars found"
 * instead of a bare OK.
 */
export async function verifyCaldavAccount(creds: CaldavCredentials): Promise<{
  calendars: ProviderCalendar[];
}> {
  const calendars = await discoverCaldavCalendars(creds);
  discoveryCache.set(`${creds.serverUrl}|${creds.username}`, { calendars, at: Date.now() });
  return { calendars };
}

/** Drops cached discovery for an account — used after connect/disconnect. */
export function invalidateCaldavDiscovery(creds: { serverUrl: string; username: string }) {
  discoveryCache.delete(`${creds.serverUrl}|${creds.username}`);
}

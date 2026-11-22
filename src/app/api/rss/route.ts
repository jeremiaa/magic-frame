import { NextRequest, NextResponse } from "next/server";
import { isSignedIn, standsInAView, noteRefused } from "@/lib/ha/action-policy";

export const dynamic = "force-dynamic";

/** Only the host goes into the log: a feed address can carry a private token. */
function hostOf(u: string): string {
  try {
    return new URL(u).host || "an address";
  } catch {
    return "an address";
  }
}

// Server-seitiger RSS/Atom-Fetch+Parse. Der Browser kann fremde Feeds nicht
// direkt laden (CORS) — daher wie bei /api/calendar: hier fetchen, parsen,
// normalisieren, cachen. Bewusst dependency-frei (kleiner Regex-Parser statt
// npm-Lib), deckt RSS 2.0 + Atom für Schlagzeilen ab (Titel/Link/Datum/Bild).

type RssItem = { title: string; link: string; date: string | null; image: string | null; summary?: string | null; source?: string };

const cache = new Map<string, { items: RssItem[]; at: number }>();
const TTL = 10 * 60 * 1000; // 10 min

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "") // Rest-Tags (HTML im Titel) strippen
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(m[1]) : "";
}

// Inhalt eines Tags CDATA-aufgelöst + Entities dekodiert, aber HTML-Tags NOCH
// drin (decodeEntities würde sie strippen). Nötig, um Bilder + Teaser aus dem
// oft HTML-verpackten <description>/<content> zu ziehen.
function inner(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return "";
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}

// Erstes echtes Bild aus HTML — Tracking-Pixel/Spacer/Feedburner-Grafiken raus.
function firstImg(html: string): string | null {
  const matches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  for (const m of matches) {
    const u = m[1];
    if (!/^https?:\/\//i.test(u)) continue;
    if (/feedburner|doubleclick|1x1|pixel|\/ads?\/|gravatar|blank\.gif|spacer/i.test(u)) continue;
    return u;
  }
  return null;
}

// HTML → reiner Teaser-Text (Tags raus, Whitespace kollabiert, gekürzt).
function textFrom(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseFeed(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);

  if (isAtom) {
    const entries = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
    for (const e of entries) {
      // Atom: <link href="..."/> — bevorzugt rel="alternate"
      const linkAlt = e.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
      const linkAny = e.match(/<link[^>]*href=["']([^"']+)["']/i);
      const descHtml = inner(e, "summary") || inner(e, "content");
      const title = tag(e, "title");
      const text = textFrom(descHtml);
      items.push({
        title,
        link: (linkAlt?.[1] || linkAny?.[1] || "").trim(),
        date: tag(e, "updated") || tag(e, "published") || null,
        image: (e.match(/<[^>]*(?:media:thumbnail|media:content)[^>]*url=["']([^"']+)["']/i)?.[1]) || firstImg(descHtml) || null,
        summary: text && text !== title ? text.slice(0, 300) : null,
      });
    }
  } else {
    const rawItems = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
    for (const it of rawItems) {
      const linkTag = tag(it, "link");
      const guidLink = /^https?:\/\//.test(tag(it, "guid")) ? tag(it, "guid") : "";
      const enclosure = it.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i)?.[1];
      const media = it.match(/<(?:media:thumbnail|media:content)[^>]*url=["']([^"']+)["']/i)?.[1];
      const descHtml = inner(it, "description");
      const contentHtml = inner(it, "content:encoded");
      const title = tag(it, "title");
      const text = textFrom(descHtml || contentHtml);
      items.push({
        title,
        link: (linkTag || guidLink).trim(),
        date: tag(it, "pubDate") || tag(it, "dc:date") || null,
        image: enclosure || media || firstImg(descHtml) || firstImg(contentHtml) || null,
        summary: text && text !== title ? text.slice(0, 300) : null,
      });
    }
  }
  return items.filter((i) => i.title);
}

async function fetchOne(url: string): Promise<RssItem[]> {
  const key = url.trim();
  const now = Date.now();
  const c = cache.get(key);
  if (c && now - c.at < TTL) return c.items;
  const res = await fetch(key, {
    headers: { "User-Agent": "MagicFrame/1.0 RSS", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  const xml = await res.text();
  const items = parseFeed(xml);
  cache.set(key, { items, at: now });
  return items;
}

export async function GET(req: NextRequest) {
  const urlsParam = req.nextUrl.searchParams.get("urls") || req.nextUrl.searchParams.get("url") || "";
  const limit = Math.max(1, Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "15", 10)));
  const urls = urlsParam.split(/[\n,]/).map((u) => u.trim()).filter(Boolean).slice(0, 8);
  if (urls.length === 0) return NextResponse.json({ error: "missing_url" }, { status: 400 });

  // A display reads its feeds without a login, so this route has none — but
  // then it fetches only feeds that stand in a saved view. It used to fetch any
  // address for anybody, which made the server a way into the home network.
  // Signed in, the editor previews a feed before it is saved.
  if (!(await isSignedIn())) {
    for (const u of urls) {
      if (!(await standsInAView(u))) {
        noteRefused("rss", hostOf(u));
        return NextResponse.json({ error: "not_on_a_view" }, { status: 403 });
      }
    }
  }

  const results = await Promise.allSettled(urls.map(fetchOne));
  const all: RssItem[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      // Quelle = Host, nützlich bei mehreren Feeds.
      let host = "";
      try { host = new URL(urls[i]).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
      for (const it of r.value) all.push({ ...it, source: host });
    } else {
      errors.push(String(r.reason?.message || r.reason));
    }
  });

  // Nach Datum absteigend, wo vorhanden; Undatiertes ans Ende in Feed-Reihenfolge.
  all.sort((a, b) => {
    const ta = a.date ? Date.parse(a.date) : NaN;
    const tb = b.date ? Date.parse(b.date) : NaN;
    if (isNaN(ta) && isNaN(tb)) return 0;
    if (isNaN(ta)) return 1;
    if (isNaN(tb)) return -1;
    return tb - ta;
  });

  if (all.length === 0 && errors.length) {
    return NextResponse.json({ error: errors[0] }, { status: 502 });
  }

  // Manche Feeds (z. B. Tagesschau) listen denselben Beitrag mehrfach, und beim
  // Zusammenführen mehrerer Feeds überschneiden sich Beiträge. Nach Link
  // (Fallback: Titel) deduplizieren — nach dem Sortieren, also bleibt der
  // neueste Treffer stehen.
  const seen = new Set<string>();
  const deduped = all.filter((it) => {
    const key = (it.link || it.title).trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ items: deduped.slice(0, limit) });
}

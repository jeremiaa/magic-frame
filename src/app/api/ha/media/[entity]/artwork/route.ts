import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

/**
 * Server-side proxy for a Home Assistant media_player's album artwork.
 *
 * GET /api/ha/media/<entity_id>/artwork
 *  → reads the entity state, grabs attributes.entity_picture (a relative
 *    HA URL that already carries a signed token), fetches it with the
 *    stored Bearer token and streams the image back.
 *
 * Same trust model as the camera snapshot proxy: the HA token never reaches
 * the browser, and the route is unauthenticated on purpose so a read-only
 * kiosk /view can load it without a session. Only entities your HA exposes
 * are reachable.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> },
) {
  try {
    const { entity } = await context.params;
    if (!entity || !entity.includes(".")) {
      return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
    }

    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      return NextResponse.json(
        { error: "Home Assistant not configured (Integrationen)." },
        { status: 400 },
      );
    }

    const base = settings.haUrl.replace(/\/+$/, "");
    const auth = { Authorization: `Bearer ${settings.haToken}` };

    // 1) resolve the current entity_picture from the entity state
    const stateRes = await fetch(
      `${base}/api/states/${encodeURIComponent(entity)}`,
      { headers: auth, cache: "no-store", signal: AbortSignal.timeout(6000) },
    );
    if (!stateRes.ok) {
      return NextResponse.json(
        { error: `Home Assistant returned ${stateRes.status}` },
        { status: 502 },
      );
    }
    const state = await stateRes.json();
    // Most players expose attributes.entity_picture, but some local/DLNA
    // integrations (e.g. Samsung Smart Monitor) only set entity_picture_local.
    const pic: string | undefined =
      state?.attributes?.entity_picture || state?.attributes?.entity_picture_local;
    if (!pic) {
      // Nothing playing / no cover art available — 204 keeps the <img> quiet.
      return new NextResponse(null, { status: 204 });
    }

    // Candidate cover sources, tried in order:
    //  1) HA's media_player_proxy (entity_picture, already token-signed) —
    //     works for Spotify/Sonos/etc. where HA has the image cached.
    //  2) the `cache=` param — for AirPlay/Apple/HomePod players HA's proxy
    //     404s (the image was never cached), but HA appends the REAL source
    //     URL here as a cache-buster. It carries CDN size placeholders
    //     ({w}x{h}bb.{f}) that we resolve to a concrete size. Fetched WITHOUT
    //     the HA token (it's an external origin).
    const candidates: Array<{ url: string; withAuth: boolean }> = [];
    candidates.push({ url: pic.startsWith("http") ? pic : `${base}${pic}`, withAuth: true });
    const cacheIdx = pic.indexOf("cache=");
    if (cacheIdx >= 0) {
      // cache= is the last param HA appends and is NOT url-encoded, so take
      // the raw remainder verbatim (its value can contain '/' and ':').
      let raw = pic.slice(cacheIdx + "cache=".length);
      if (/^https?:\/\//i.test(raw)) {
        raw = raw.replace(/\{w\}/g, "512").replace(/\{h\}/g, "512").replace(/\{f\}/g, "jpg");
        candidates.push({ url: raw, withAuth: false });
      }
    }

    let upstream: Response | null = null;
    let lastStatus = 0;
    for (const c of candidates) {
      try {
        const r = await fetch(c.url, {
          headers: c.withAuth ? auth : undefined,
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        lastStatus = r.status;
        if (r.ok && (r.headers.get("content-type") || "").toLowerCase().startsWith("image")) {
          upstream = r;
          break;
        }
      } catch {
        /* try next candidate */
      }
    }
    if (!upstream) {
      return NextResponse.json(
        { error: `Artwork fetch returned ${lastStatus || "no response"}` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // The widget cache-busts with ?ts= when the track changes, so the
        // browser must never serve a stale cover.
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Artwork proxy failed" },
      { status: 500 },
    );
  }
}

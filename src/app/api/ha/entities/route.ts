import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";
import { describeHaFetchError } from "@/lib/ha/fetch-error";
import { isSignedIn, readableEntities } from "@/lib/ha/action-policy";

export const dynamic = "force-dynamic";

// 60s in-memory cache. HA states list can be hundreds of KB on busy installs;
// the Inspector polls this endpoint every time the dropdown opens, so caching
// is the difference between "snappy" and "HA gets hammered".
type Entity = {
  entity_id: string;
  friendly_name: string;
  domain: string;
  state: string;
};

type Cache = { fetchedAt: number; entities: Entity[] };
const CACHE_TTL_MS = 60_000;
let cache: Cache | null = null;

/**
 * Returns every entity registered in Home Assistant — used by the autocomplete
 * inputs in widget Inspectors so users don't have to type entity IDs by hand.
 *
 * Optional query param `?domains=light,switch` filters server-side. Use this
 * for inspector slots that are typed (e.g. only lights for a light-toggle
 * button).
 */
export async function GET(request: Request) {
  try {
    // The editor's entity pickers call this signed in and get everything. It
    // used to hand every entity in the house, with its state, to anybody who
    // could reach it. Without a login it now lists only what is on a saved
    // view — a module on a display that looks up its players still finds them.
    const signedIn = await isSignedIn();
    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      return NextResponse.json(
        { error: "Home Assistant not configured (Integrationen)." },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const domainsParam = url.searchParams.get("domains");
    const domainsFilter = domainsParam
      ? new Set(
          domainsParam
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
        )
      : null;

    const now = Date.now();
    let entities: Entity[];
    let cached = false;

    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      entities = cache.entities;
      cached = true;
    } else {
      const base = settings.haUrl.replace(/\/+$/, "");
      const res = await fetch(`${base}/api/states`, {
        headers: {
          Authorization: `Bearer ${settings.haToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Home Assistant returned ${res.status}` },
          { status: 502 },
        );
      }
      const all = (await res.json()) as any[];
      entities = all
        .filter((e) => typeof e?.entity_id === "string")
        .map((e) => {
          const domain = e.entity_id.split(".")[0] || "";
          const friendly_name =
            (typeof e.attributes?.friendly_name === "string" &&
              e.attributes.friendly_name) ||
            e.entity_id;
          return {
            entity_id: e.entity_id as string,
            friendly_name,
            domain,
            state: typeof e.state === "string" ? e.state : "",
          };
        })
        .sort((a, b) => {
          // Group by domain first (light.* together, switch.* together, etc.),
          // then alphabetically by friendly_name within each domain.
          if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
          return a.friendly_name.localeCompare(b.friendly_name);
        });
      cache = { fetchedAt: now, entities };
    }

    let filtered = domainsFilter
      ? entities.filter((e) => domainsFilter.has(e.domain))
      : entities;
    if (!signedIn) {
      const readable = new Set(await readableEntities("ha/entities", filtered.map((e) => e.entity_id), { quiet: true }));
      filtered = filtered.filter((e) => readable.has(e.entity_id));
    }

    return NextResponse.json({ entities: filtered, cached });
  } catch (err: any) {
    return NextResponse.json(
      { error: describeHaFetchError(err) },
      { status: 500 },
    );
  }
}

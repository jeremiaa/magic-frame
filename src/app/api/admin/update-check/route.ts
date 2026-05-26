import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

// In-Memory-Cache mit 6h TTL. GitHub unauthenticated API hat 60 req/h.
// 6h Cache = max 4 echte Requests/Tag, völlig safe.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let cache: {
  fetchedAt: number;
  result: UpdateInfo;
} | null = null;

type UpdateInfo = {
  current: string;
  latest: string | null;
  available: boolean;
  releaseUrl: string | null;
  releaseName: string | null;
  publishedAt: string | null;
  // Wenn der Fetch fehlschlug, status= "error" + message
  status: "ok" | "error";
  message?: string;
};

let cachedPkgVersion: string | null = null;
function readLocalVersion(): string {
  if (cachedPkgVersion) return cachedPkgVersion;
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    );
    cachedPkgVersion = pkg.version || "0.0.0";
  } catch {
    cachedPkgVersion = "0.0.0";
  }
  return cachedPkgVersion!;
}

// Tag-Normalisierung: GitHub-Tags sind oft "v1.2.3" — wir wollen "1.2.3" für
// den semver-Vergleich.
function stripLeadingV(s: string): string {
  return s.replace(/^v/i, "").trim();
}

// Einfacher semver-Vergleich. Akzeptiert "1.2.3", "1.2.3-beta", "1.2".
// Returns: -1 wenn a<b, 0 gleich, 1 wenn a>b.
function compareSemver(a: string, b: string): number {
  const parse = (s: string) => {
    const [main, prerelease] = s.split("-", 2);
    const parts = main.split(".").map((n) => parseInt(n, 10) || 0);
    while (parts.length < 3) parts.push(0);
    return { parts, prerelease: prerelease || null };
  };
  const A = parse(a);
  const B = parse(b);
  for (let i = 0; i < 3; i++) {
    if (A.parts[i] > B.parts[i]) return 1;
    if (A.parts[i] < B.parts[i]) return -1;
  }
  // Major.Minor.Patch gleich — Versionen mit Prerelease sind kleiner als ohne
  // (semver: 1.0.0-beta < 1.0.0).
  if (A.prerelease && !B.prerelease) return -1;
  if (!A.prerelease && B.prerelease) return 1;
  if (A.prerelease && B.prerelease) {
    return A.prerelease.localeCompare(B.prerelease);
  }
  return 0;
}

async function fetchLatestFromGitHub(repo: string): Promise<UpdateInfo> {
  const current = readLocalVersion();
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": `MagicFrame/${current}`,
        },
        // Server-seitig: keine Browser-Caching-Header nötig.
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return {
        current,
        latest: null,
        available: false,
        releaseUrl: null,
        releaseName: null,
        publishedAt: null,
        status: "error",
        message: `GitHub returned ${res.status}`,
      };
    }
    const data: any = await res.json();
    const tag = typeof data?.tag_name === "string" ? data.tag_name : null;
    if (!tag) {
      return {
        current,
        latest: null,
        available: false,
        releaseUrl: null,
        releaseName: null,
        publishedAt: null,
        status: "error",
        message: "No tag_name in release",
      };
    }
    const latest = stripLeadingV(tag);
    const available = compareSemver(latest, current) > 0;
    return {
      current,
      latest,
      available,
      releaseUrl: typeof data?.html_url === "string" ? data.html_url : null,
      releaseName: typeof data?.name === "string" ? data.name : tag,
      publishedAt:
        typeof data?.published_at === "string" ? data.published_at : null,
      status: "ok",
    };
  } catch (err: any) {
    return {
      current,
      latest: null,
      available: false,
      releaseUrl: null,
      releaseName: null,
      publishedAt: null,
      status: "error",
      message: err?.message || "Network error",
    };
  }
}

export async function GET(request: Request) {
  try {
    await verifySession();

    const repo =
      process.env.MAGIC_FRAME_UPDATE_REPO || "jeremiaa/magic-frame";

    // Force-Refresh wenn ?refresh=1 (für manuelles Triggern im UI)
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "1";

    const now = Date.now();
    if (
      !forceRefresh &&
      cache &&
      now - cache.fetchedAt < CACHE_TTL_MS
    ) {
      return NextResponse.json({ ...cache.result, cached: true });
    }

    const result = await fetchLatestFromGitHub(repo);
    cache = { fetchedAt: now, result };
    return NextResponse.json({ ...result, cached: false });
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json(
      { error: "Update check failed" },
      { status: 500 },
    );
  }
}

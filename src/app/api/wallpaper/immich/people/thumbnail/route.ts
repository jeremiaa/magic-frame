import { NextRequest, NextResponse } from "next/server";
import { resolveImmich } from "@/lib/immich/resolve";

export const dynamic = "force-dynamic";

/**
 * Gesichtsbild einer Immich-Person (#75).
 *
 * Eigener Proxy, damit der API-Key server-seitig bleibt — im Browser stünde er
 * sonst in jeder Bild-URL. Die Verbindung wird wie überall aufgelöst: erst die
 * des Views, sonst die globale.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const dashboardId = req.nextUrl.searchParams.get("dashboardId");
  if (!id) return new NextResponse("Missing person id", { status: 400 });

  try {
    const { url, key } = await resolveImmich(dashboardId ? "view" : "global", dashboardId);
    if (!url || !key) return new NextResponse("Missing Immich configuration", { status: 400 });

    const res = await fetch(`${url.replace(/\/+$/, "")}/api/people/${encodeURIComponent(id)}/thumbnail`, {
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return new NextResponse("Immich Proxy Error", { status: res.status });

    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("content-type") || "image/jpeg");
    // Gesichter ändern sich praktisch nie — eine Woche Cache spart Anfragen.
    headers.set("Cache-Control", "public, max-age=604800, immutable");
    return new NextResponse(res.body, { status: 200, headers });
  } catch (error: any) {
    console.error("Immich Person Thumbnail Error:", error?.message || error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

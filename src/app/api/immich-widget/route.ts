import { NextRequest, NextResponse } from "next/server";
import { resolveImmich } from "@/lib/immich/resolve";
import { isImmichId } from "@/lib/immich/pair";

export const dynamic = "force-dynamic";

// Bild-Widget — nutzt je nach Widget-Einstellung die globale Immich-Verbindung
// oder die des Views (Wallpaper). Auflösung in resolveImmich. (#16)
//   mode=albums              → Albenliste (für den Inspector)
//   mode=playlist&albumId=X  → gemischte Asset-Liste mit Proxy-URLs
export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source");
  const dashboardId = req.nextUrl.searchParams.get("dashboardId");
  const { url, key } = await resolveImmich(source, dashboardId);
  if (!url || !key) {
    return NextResponse.json(
      { error: "Immich nicht konfiguriert (Einstellungen → Integrationen, oder im Wallpaper dieses Views)." },
      { status: 400 },
    );
  }
  const base = url.replace(/\/+$/, "");
  const headers = { "x-api-key": key, Accept: "application/json" };
  const mode = req.nextUrl.searchParams.get("mode") || "albums";

  try {
    if (mode === "albums") {
      const res = await fetch(`${base}/api/albums`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return NextResponse.json({ error: `Immich ${res.status}` }, { status: 502 });
      const data = await res.json();
      const albums = (Array.isArray(data) ? data : [])
        .map((a: any) => ({
          id: String(a.id),
          albumName: a.albumName ?? "(ohne Name)",
          assetCount: typeof a.assetCount === "number" ? a.assetCount : (a.assets?.length ?? 0),
        }))
        .sort((a: any, b: any) => a.albumName.localeCompare(b.albumName, "de"));
      return NextResponse.json({ albums });
    }

    // mode=playlist
    const albumId = req.nextUrl.searchParams.get("albumId");
    if (!albumId) return NextResponse.json({ error: "albumId required" }, { status: 400 });
    if (!isImmichId(albumId)) return NextResponse.json({ error: "invalid albumId" }, { status: 400 });
    const res = await fetch(`${base}/api/albums/${encodeURIComponent(albumId)}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return NextResponse.json({ error: `Immich ${res.status}` }, { status: 502 });
    const data = await res.json();
    let assets = (data.assets || []) as any[];
    // Immich >= 3.0: Album-Detail enthält kein assets[] mehr (nur assetCount) —
    // Fallback über die Metadata-Suche mit albumIds (wie im Wallpaper-Playlist).
    if (assets.length === 0 && (data.assetCount ?? 0) > 0) {
      const sr = await fetch(`${base}/api/search/metadata`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ albumIds: [albumId], type: "IMAGE", size: 1000 }),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!sr.ok) return NextResponse.json({ error: `Immich search ${sr.status}` }, { status: 502 });
      const sd = await sr.json();
      assets = (sd?.assets?.items ?? []) as any[];
    }
    for (let i = assets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [assets[i], assets[j]] = [assets[j], assets[i]];
    }
    const q = source ? `&source=${encodeURIComponent(source)}` : "";
    const d = dashboardId ? `&dashboardId=${encodeURIComponent(dashboardId)}` : "";
    const playlist = assets.slice(0, 200).map((a) => ({
      id: a.id,
      url: `/api/immich-widget/image?id=${encodeURIComponent(a.id)}${q}${d}`,
    }));
    return NextResponse.json({ playlist });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

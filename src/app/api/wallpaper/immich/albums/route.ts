import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { pairImmich, isImmichProblem } from "@/lib/immich/pair";

export const dynamic = "force-dynamic";

/**
 * Listet alle Immich-Alben für gegebene Credentials.
 * POST { url?, apiKey? } → { albums: [{ id, albumName, assetCount }] }
 *
 * Bewusst credential-in-body (analog zu /api/webdav/browse), damit der Editor
 * Alben live laden kann, BEVOR die Wallpaper-Config gespeichert ist. Es wird
 * nichts persistiert.
 *
 * Fehlen die Angaben, gilt die globale Verbindung aus Einstellungen →
 * Integrationen (#78). Die Playlist-Route macht das seit jeher so; nur hier
 * fehlte es, weshalb "Alben holen" in einer neuen Ansicht blockiert blieb,
 * obwohl das Wallpaper nach dem Speichern funktioniert hätte.
 */
export async function POST(req: NextRequest) {
  // Only the editor asks for these lists, never a display. Without a sign-in
  // anyone could make the server call an address of their choosing.
  try {
    await verifySession();
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    throw err;
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* leer */
  }
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const settings = await getAppSettings();
  // The saved key only ever goes to the saved address (see pairImmich).
  const pair = pairImmich(
    { url: str(body.url), key: str(body.apiKey) },
    { url: settings.immichUrl, key: settings.immichApiKey },
  );
  if (isImmichProblem(pair)) {
    return NextResponse.json(
      {
        error:
          pair.error === "key-needed"
            ? "Für diese Immich-Adresse fehlt der API-Schlüssel. Der gespeicherte Schlüssel gilt nur für die Adresse unter Einstellungen → Integrationen."
            : "Keine Immich-Verbindung — bitte hier eintragen oder unter Einstellungen → Integrationen hinterlegen.",
      },
      { status: 400 },
    );
  }
  const apiKey = pair.key;

  const baseUrl = pair.url.replace(/\/+$/, "");

  try {
    const res = await fetch(`${baseUrl}/api/albums`, {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
      // 10s reicht im LAN; verhindert Hänger wenn die URL nicht stimmt.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      let msg = `Immich antwortete mit Status ${res.status}.`;
      if (res.status === 401 || res.status === 403)
        msg = "API-Key ungültig oder hat keine Album-Leserechte.";
      return NextResponse.json({ error: msg }, { status: res.status === 401 ? 401 : 502 });
    }

    const data = await res.json();
    const albums = (Array.isArray(data) ? data : [])
      .map((a: any) => ({
        id: String(a.id),
        albumName: a.albumName ?? "(ohne Name)",
        assetCount: typeof a.assetCount === "number" ? a.assetCount : (a.assets?.length ?? 0),
      }))
      .sort((a: any, b: any) => a.albumName.localeCompare(b.albumName, "de"));

    return NextResponse.json({ albums });
  } catch (error: any) {
    console.error("Immich Albums Error:", error?.message || error);
    const isTimeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout
          ? "Zeitüberschreitung — ist die Immich-URL korrekt und im selben Netz erreichbar?"
          : "Konnte Immich nicht erreichen. URL korrekt? (z.B. http://192.168.x.x:2283)",
      },
      { status: 500 },
    );
  }
}

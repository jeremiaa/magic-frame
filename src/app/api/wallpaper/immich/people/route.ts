import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { pairImmich, isImmichProblem } from "@/lib/immich/pair";

export const dynamic = "force-dynamic";

/**
 * Listet die benannten Personen einer Immich-Instanz (#75).
 * POST { url?, apiKey? } → { people: [{ id, name, thumbnailUrl }] }
 *
 * Gleiche Bauart wie /api/wallpaper/immich/albums: Zugangsdaten dürfen im Body
 * stehen, damit der Editor die Liste zeigen kann, BEVOR das Wallpaper
 * gespeichert ist; fehlen sie, gilt die globale Verbindung. Nichts wird
 * gespeichert.
 *
 * Personen ohne Namen lassen wir weg — Immich legt für jedes erkannte Gesicht
 * einen Eintrag an, und eine Liste aus hunderten namenlosen Gesichtern ist
 * nicht auswählbar.
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
    // withHidden=false: in Immich ausgeblendete Gesichter bleiben ausgeblendet.
    const res = await fetch(`${baseUrl}/api/people?withHidden=false&size=1000`, {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      let msg = `Immich antwortete mit Status ${res.status}.`;
      if (res.status === 401 || res.status === 403)
        msg = "API-Key ungültig oder hat keine Rechte für Personen.";
      return NextResponse.json({ error: msg }, { status: res.status === 401 ? 401 : 502 });
    }

    const data = await res.json();
    const raw = Array.isArray(data?.people) ? data.people : Array.isArray(data) ? data : [];

    const people = raw
      .filter((p: any) => String(p?.name || "").trim().length > 0)
      .map((p: any) => ({
        id: String(p.id),
        name: String(p.name).trim(),
        // Das Gesichtsbild läuft über unseren Proxy — der API-Key bleibt server-seitig.
        thumbnailUrl: `/api/wallpaper/immich/people/thumbnail?id=${encodeURIComponent(String(p.id))}`,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name, "de"));

    return NextResponse.json({ people });
  } catch (error: any) {
    console.error("Immich People Error:", error?.message || error);
    const isTimeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout
          ? "Immich antwortet nicht — stimmt die URL?"
          : "Immich nicht erreichbar.",
      },
      { status: 502 },
    );
  }
}

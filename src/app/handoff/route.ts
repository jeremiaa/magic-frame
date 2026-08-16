import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/companion/prisma";
import { getSession } from "@/lib/auth/session";
import { recordAttempt } from "@/lib/auth/lockout";
import { clientIp } from "@/lib/auth/ip";
import { getBasePath } from "@/lib/base-path";

export const dynamic = "force-dynamic";

/**
 * Weiterleitung OHNE Herkunft — und das ist hier der ganze Punkt.
 *
 * `NextResponse.redirect()` verlangt eine vollständige Adresse, und die einzige
 * verfügbare Quelle dafür war `req.url`. Deren Herkunft stammt aber nicht vom
 * `Host`-Kopf, sondern aus `next({ hostname, port })` in server.js — dort steht
 * `localhost`. Also ging ein `Location: http://localhost:3000/editor` an den
 * Browser, und wer den Ein-Klick-Weg benutzte, landete auf seinem EIGENEN
 * Rechner. Next korrigiert diese Herkunft nur bei Middleware-Antworten, nicht
 * bei Route-Handlern — deshalb kam es genau so heraus, wie es dastand.
 *
 * Ein reiner Pfad hat dieses Problem nicht: den löst der Browser gegen die
 * Adresse auf, die er selbst aufgerufen hat. Das ist in JEDER Installation
 * richtig — hinter einem Reverse Proxy, unter einer eigenen Domain, im Add-on.
 * Derselbe Fehler hatte uns schon bei #31 getroffen (Kalender-OAuth hinter
 * Reverse Proxy); diese Route hatte die Behandlung nie bekommen.
 *
 * Der Basispfad kommt davor, weil ein Pfad mit Schrägstrich am Anfang gegen die
 * HERKUNFT auflöst und nicht gegen das Verzeichnis. Ohne Add-on ist er leer und
 * es steht wörtlich das da, was gemeint ist.
 */
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, {
    status: 302,
    headers: { Location: getBasePath() + path },
  });
}

/**
 * Löst ein Einmal-Token vom Seitenleisten-Eingang des HA-Add-ons ein.
 *
 * Geprägt wird das Token in server-ingress.js, und NUR dort: der Listener
 * hängt am Ingress-Port, den ausschliesslich Home Assistants Ingress-Gateway
 * erreicht, und er prägt erst, nachdem er den anfragenden HA-Nutzer als
 * HA-Admin verifiziert hat. Wer hier mit gültigem Token ankommt, hat also
 * bereits eine angemeldete HA-Admin-Sitzung hinter sich — das ist die
 * Vertrauenskette, die den fehlenden Passwort-Dialog ersetzt.
 *
 * Die Übergabe läuft über globalThis, weil Listener und diese Route im selben
 * Node-Prozess leben (Custom-Server, dasselbe Muster wie LIVE_SYNC_IO). Das
 * Nachschlagen samt Löschen passiert synchron ohne await dazwischen — zwei
 * gleichzeitige Einlösungen desselben Tokens kann es dadurch nicht geben.
 *
 * Angemeldet wird das älteste Admin-Konto: bei den typischen Ein-Personen-
 * Installationen ist das schlicht der Besitzer, und bei mehreren Admins ist
 * das älteste das Konto aus der Einrichtung. TOTP wird hier bewusst nicht
 * verlangt — die zweite Stufe hat Home Assistant für dieses Konto bereits
 * erledigt, sonst gäbe es das Token nicht.
 *
 * Ausserhalb des Add-ons ist die Map leer und jede Anfrage landet auf
 * /login?handoff=expired — Compose- und Kubernetes-Installationen merken von
 * dieser Route nichts.
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const loginFallback = redirectTo("/login?handoff=expired");

  const store = (globalThis as Record<string, unknown>).__MF_HANDOFF_TOKENS as
    | Map<string, { haUserName: string; exp: number }>
    | undefined;
  if (!store || !token) return loginFallback;

  const entry = store.get(token);
  store.delete(token);
  if (!entry || entry.exp < Date.now()) return loginFallback;

  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true },
  });
  // Frische Installation ohne Admin: die Einrichtung übernimmt /login sowieso.
  if (!admin) return redirectTo("/login");

  const session = await getSession();
  session.userId = admin.id;
  session.email = admin.email;
  session.role = admin.role;
  session.pendingTotpUserId = undefined;
  session.pendingTotpEmail = undefined;
  session.pendingTotpExpires = undefined;
  await session.save();

  // Im Login-Protokoll sichtbar machen, DASS und ALS WER per HA angemeldet
  // wurde — sonst stünde da eine Sitzung, die nie ein Login war.
  await recordAttempt({
    ip: clientIp(req),
    email: admin.email,
    success: true,
    reason: `via HA ingress: ${entry.haUserName}`,
  });

  return redirectTo("/editor");
}

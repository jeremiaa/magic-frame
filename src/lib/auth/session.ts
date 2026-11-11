import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies, headers } from "next/headers";
import { isViaTunnel } from "@/lib/tunnel/via";

export type SessionData = {
  userId?: string;
  email?: string;
  role?: string;
  // Zwischenstand nach erfolgreichem Passwort, aber bevor TOTP eingegeben wurde.
  // Solange pendingTotpUserId gesetzt und userId leer ist, ist der User NICHT
  // authentifiziert — verifySession() lehnt ab.
  pendingTotpUserId?: string;
  pendingTotpEmail?: string;
  pendingTotpExpires?: number; // unix ms
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET env var muss gesetzt sein und mindestens 32 Zeichen haben.",
    );
  }
  return secret;
}

function getSessionOptions(secure: boolean): SessionOptions {
  return {
    cookieName: "magic_session",
    password: getSessionSecret(),
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

/**
 * Durch den Cloudflare-Tunnel ist die Verbindung zum Browser immer https.
 * Dann trägt das Cookie „Secure", auch wenn COOKIE_SECURE fürs Heimnetz aus
 * ist — sonst ginge die Sitzung bei einem Aufruf über http im Klartext durchs
 * Internet. Im Heimnetz ändert sich nichts.
 */
async function arrivedThroughTunnel(): Promise<boolean> {
  try {
    return isViaTunnel(await headers());
  } catch {
    // Ausserhalb einer Anfrage gibt es keine Kopfzeilen.
    return false;
  }
}

export async function getSession() {
  const secure = process.env.COOKIE_SECURE === "true" || (await arrivedThroughTunnel());
  return getIronSession<SessionData>(await cookies(), getSessionOptions(secure));
}

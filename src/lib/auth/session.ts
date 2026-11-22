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

// The cookie is sealed with our secret and good for 30 days, and it carries
// the role it was issued with. Taken at its word, a deleted account stayed
// signed in for up to a month, and kept a role it might no longer have. So the
// account is looked up — cached briefly, because almost every request asks.
const ACCOUNT_TTL_MS = 15_000;
const accounts = new Map<string, { at: number; role: string | null }>();

/** Drops what is cached about one account (or all), e.g. right after deleting it. */
export function forgetAccount(userId?: string): void {
  if (userId) accounts.delete(userId);
  else accounts.clear();
}

/** The account's role, `null` when the account is gone, `undefined` when unknown. */
async function accountRole(userId: string): Promise<string | null | undefined> {
  const hit = accounts.get(userId);
  if (hit && Date.now() - hit.at < ACCOUNT_TTL_MS) return hit.role;
  try {
    const { prisma } = await import("@/lib/companion/prisma");
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const role = user ? user.role : null;
    if (accounts.size > 1000) accounts.clear();
    accounts.set(userId, { at: Date.now(), role });
    return role;
  } catch (err) {
    // The database is not answering. Locking everybody out over a hiccup is
    // the worse failure, and the cookie is still sealed by our secret.
    console.error("[session] could not look up the account", err);
    return undefined;
  }
}

export async function getSession() {
  const secure = process.env.COOKIE_SECURE === "true" || (await arrivedThroughTunnel());
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions(secure));
  if (session.userId) {
    const role = await accountRole(session.userId);
    if (role === null) {
      // The account was deleted. The cookie is still sealed, but it names nobody.
      session.userId = undefined;
      session.email = undefined;
      session.role = undefined;
    } else if (role !== undefined) {
      session.role = role;
    }
  }
  return session;
}

import "server-only";
import { prisma } from "@/lib/companion/prisma";

export type McpAuth = { userId: string; role: "admin" | "viewer" };

/**
 * MCP-Anmeldung: ausschliesslich `Authorization: Bearer <Companion-Token>`.
 *
 * Bewusst KEIN `?key=` wie bei den Shortcut-Routen — ein Token in der URL
 * landet in jedem Proxy- und Zugriffs-Log, und MCP-Clients können alle
 * Header. Und bewusst kein Sitzungs-Cookie-Rückfall: MCP-Clients sind keine
 * Browser, und ohne getSession() bleibt der Handler frei von Cookie-Logik.
 *
 * Das Token wird im Editor unter Einstellungen → Geräte & Apps geprägt und
 * rotiert. Rotation ist der Notausschalter: sie widerruft den MCP-Zugriff
 * sofort. Ein Token kann nie ein Token prägen — die Präge-Route verlangt
 * eine Browser-Sitzung.
 */
export async function authenticateMcp(req: Request): Promise<McpAuth | null> {
  const m = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1]?.trim();
  // Dieselbe Untergrenze wie resolveUserId: alles Kürzere ist nie ein echtes
  // Token gewesen und verdient keinen Datenbank-Roundtrip.
  if (!token || token.length < 16) return null;

  const user = await prisma.user.findUnique({
    where: { shortcutToken: token },
    select: { id: true, role: true },
  });
  if (!user) return null;
  return { userId: user.id, role: user.role === "admin" ? "admin" : "viewer" };
}

import "server-only";
import { prisma } from "@/lib/companion/prisma";

/**
 * Was der Tunnel über Neustarts hinweg wissen muss. Liegt in AppSettings.extra
 * wie die anderen Schlüssel der Installation — kein Schema-Wechsel nötig.
 *
 * Das Token ist ein Geheimnis: wer es hat, kann den Tunnel dieser Installation
 * betreiben. Es wird gespeichert, damit der feste Tunnel nach einem Neustart
 * von selbst wiederkommt, und es geht NIE an die Oberfläche zurück — die
 * erfährt nur, dass eines hinterlegt ist.
 */
export type StoredTunnel = { token?: string; autostart: boolean };

async function readExtra(): Promise<Record<string, unknown>> {
  const row = await prisma.appSettings.findUnique({ where: { id: "global" } });
  return ((row?.extra as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
}

export async function readTunnelSettings(): Promise<StoredTunnel> {
  let stored: Record<string, unknown> = {};
  try {
    stored = ((await readExtra()).tunnel ?? {}) as Record<string, unknown>;
  } catch {
    // Datenbank gerade nicht da: dann gibt es auch nichts wiederaufzunehmen.
  }
  return {
    token: typeof stored.token === "string" && stored.token ? stored.token : undefined,
    autostart: stored.autostart === true,
  };
}

/**
 * `token: null` vergisst das Token. Ein Lesefehler bricht ab, statt mit einem
 * leeren Stand weiterzuschreiben — sonst wären danach die anderen Schlüssel
 * in `extra` weg.
 */
export async function writeTunnelSettings(patch: { token?: string | null; autostart?: boolean }): Promise<void> {
  const extra = await readExtra();
  const next: Record<string, unknown> = { ...((extra.tunnel ?? {}) as Record<string, unknown>) };
  if (patch.token === null) delete next.token;
  else if (typeof patch.token === "string") next.token = patch.token;
  if (typeof patch.autostart === "boolean") next.autostart = patch.autostart;
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { extra: { ...extra, tunnel: next } as never, updatedAt: new Date() },
    create: { id: "global", haUrl: "", haToken: "", extra: { tunnel: next } as never },
  });
}

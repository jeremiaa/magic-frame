import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/companion/prisma";
import { layoutSyncBodySchema } from "@/lib/widgets/schemas";
import { remapButtonTargets } from "@/lib/widgets/remap-targets";
import { createSnapshot } from "@/lib/backups/snapshots";
import { forgetAllowedEntities } from "@/lib/ha/action-policy";

/**
 * DER Layout-Schreibweg. Alles, was eine Ansicht speichert, läuft hier durch —
 * der Editor über /api/layout/sync und die MCP-Werkzeuge direkt.
 *
 * Eine Pipeline, zwei Eingänge, damit die Schutzmechanik nie auseinanderläuft:
 * Snapshot vor dem Überschreiben, Button-Ziele durch remapButtonTargets (die
 * v1.0.5-Lektion), Erlaubnisliste verwerfen, Displays anstoßen.
 *
 * Neu gegenüber der alten Route: deleteMany und die Creates stecken in EINER
 * Transaktion. Vorher konnte ein Create mitten in der Schleife scheitern —
 * doppelte Widget-ID über Ansichten hinweg (die IDs sind ein GLOBALER
 * Primärschlüssel), ein Wert, den Zod durchlässt und Postgres nicht — und die
 * Ansicht blieb halb geschrieben zurück. Der Editor konnte diese Eingaben nie
 * erzeugen, ein Agent über MCP sehr wohl. Jetzt: ganz oder gar nicht.
 */
export async function applyLayoutSync(
  parsed: z.infer<typeof layoutSyncBodySchema>,
): Promise<void> {
  const { layout, wallpaper, settings, dashboardId: reqDashboardId } = parsed;
  const dashboardId = reqDashboardId || "1";

  // Auto-Snapshot: aktuellen (Pre-Save-)Stand sichern, bevor überschrieben wird.
  // Fehler hier dürfen den Save nicht blockieren.
  try {
    await createSnapshot(dashboardId, "auto-save");
  } catch (snapErr) {
    console.error("[sync] snapshot failed (non-fatal):", snapErr);
  }

  // Widget ids are persisted with a `${dashboardId}_` prefix. Apply the same
  // rule to a Button's stored target ids so its show/hide links survive the
  // rename instead of being orphaned. This also auto-heals layouts saved by
  // older builds (where an unprefixed target like "clk" maps cleanly onto the
  // now-prefixed widget id) — but only when the result is a real widget in
  // this layout; genuine orphans are left untouched.
  const finalId = (i: string) =>
    i.startsWith(`${dashboardId}_`) ? i : `${dashboardId}_${i}`;
  const validIds = new Set(layout.map((it) => finalId(it.i)));

  // Nach dem Präfixen müssen die IDs eindeutig sein — zwei Einträge, die auf
  // dieselbe End-ID abbilden, würden sonst erst am Primärschlüssel platzen,
  // mit einer Meldung, die niemandem sagt, welcher Eintrag schuld war.
  if (validIds.size !== layout.length) {
    const seen = new Set<string>();
    const dupes = layout
      .map((it) => finalId(it.i))
      .filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    throw new Error(
      `Duplicate widget ids after prefixing: ${[...new Set(dupes)].join(", ")}`,
    );
  }

  const mapTarget = (id: string) => {
    const mapped = finalId(id);
    return validIds.has(mapped) ? mapped : id;
  };

  await prisma.$transaction([
    prisma.dashboard.upsert({
      where: { id: dashboardId },
      update: {
        wallpaper: (wallpaper as any) ?? undefined,
        settings: (settings as any) ?? undefined,
      },
      create: {
        id: dashboardId,
        name: `View ${dashboardId}`,
        wallpaper: (wallpaper as any) ?? {},
        settings: (settings as any) ?? {},
      },
    }),
    prisma.widget.deleteMany({ where: { dashboardId } }),
    ...layout.map((item) =>
      prisma.widget.create({
        data: {
          id: finalId(item.i),
          type: item.type,
          label: item.label ?? "",
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          bgOpacity: item.bgOpacity,
          config: remapButtonTargets((item.config as any) ?? {}, mapTarget),
          dashboardId,
        },
      }),
    ),
  ]);

  // Die Entitäts-Erlaubnisliste von /api/ha/action wird aus genau diesen
  // Widget-Configs gebaut — ohne das Verwerfen hier wäre ein frisch
  // platzierter Button auf dem Display bis zu 30 Sekunden lang gesperrt,
  // obwohl er sichtbar da ist.
  forgetAllowedEntities();

  // Ping via den globalen Socket.IO-Server aus server.js, damit alle
  // verbundenen Displays das neue Layout sofort laden.
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("LAYOUT_UPDATED");
  }
}

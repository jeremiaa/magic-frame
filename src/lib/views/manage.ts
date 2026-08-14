import "server-only";
import { prisma } from "@/lib/companion/prisma";
import { remapButtonTargets } from "@/lib/widgets/remap-targets";
import { forgetAllowedEntities } from "@/lib/ha/action-policy";
import { DEFAULT_WALLPAPER } from "@/lib/wallpaper-engine/bundled";

/**
 * Ansichten anlegen, duplizieren, umbenennen, löschen — aus der POST/DELETE-
 * Route von /api/dashboards extrahiert, damit der Editor und die MCP-Werkzeuge
 * denselben Weg gehen. Der Grund ist die v1.0.5-Lektion: an allen vier Stellen
 * müssen Button-Ziele über remapButtonTargets mitwandern, sonst zeigen sie nach
 * dem Umbenennen ins Leere. Zwei Kopien dieser Logik würden genau da wieder
 * auseinanderlaufen.
 */

export function safeViewId(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export class ViewManageError extends Error {
  constructor(message: string, public readonly code: "not_found" | "exists" | "invalid") {
    super(message);
    this.name = "ViewManageError";
  }
}

/** Legt eine neue Ansicht mit drei Starter-Widgets an. */
export async function createView(id: string, name: string, orientation: "portrait" | "landscape"): Promise<string> {
  const safeId = safeViewId(id);
  if (!safeId) throw new ViewManageError("Invalid view id", "invalid");
  try {
    await prisma.dashboard.create({
      data: {
        id: safeId,
        name,
        wallpaper: DEFAULT_WALLPAPER as any,
        settings: { orientation },
        // Starter-Widgets direkt seeden — ein bewusst geleerter View bekommt
        // sie sonst beim nächsten Laden zurück (#27).
        widgets: {
          create: [
            { id: `${safeId}_clk`, type: "ClockWidget.tsx", x: 0, y: 0, w: 6, h: 4, bgOpacity: 20, config: {} },
            { id: `${safeId}_cal`, type: "CalendarWidget.tsx", x: 0, y: 4, w: 6, h: 6, bgOpacity: 20, config: {} },
            { id: `${safeId}_wth`, type: "WeatherWidget.tsx", x: 0, y: 10, w: 12, h: 6, bgOpacity: 50, config: {} },
          ],
        },
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") throw new ViewManageError("A view with this id already exists", "exists");
    throw e;
  }
  forgetAllowedEntities();
  return safeId;
}

/** Dupliziert eine Ansicht samt Widgets; Button-Ziele wandern mit. */
export async function duplicateView(sourceId: string, newId: string, name: string): Promise<string> {
  const safeId = safeViewId(newId);
  if (!safeId) throw new ViewManageError("Invalid view id", "invalid");
  const source = await prisma.dashboard.findUnique({ where: { id: sourceId }, include: { widgets: true } });
  if (!source) throw new ViewManageError(`Source view "${sourceId}" not found`, "not_found");

  const suffix = `_${safeId}`;
  const idMap: Record<string, string> = {};
  for (const w of source.widgets) idMap[w.id] = w.id + suffix;
  try {
    await prisma.$transaction([
      prisma.dashboard.create({
        data: { id: safeId, name, wallpaper: (source.wallpaper as any) || {}, settings: (source.settings as any) || {} },
      }),
      ...source.widgets.map((w) =>
        prisma.widget.create({
          data: {
            id: idMap[w.id],
            type: w.type,
            x: w.x, y: w.y, w: w.w, h: w.h,
            bgOpacity: w.bgOpacity,
            config: remapButtonTargets(w.config as any, (id) => idMap[id] ?? id),
            dashboardId: safeId,
          },
        }),
      ),
    ]);
  } catch (e: any) {
    if (e?.code === "P2002") throw new ViewManageError("A view with this id already exists", "exists");
    throw e;
  }
  forgetAllowedEntities();
  return safeId;
}

/** Benennt die URL einer Ansicht um (kopieren + altes löschen). */
export async function renameView(oldId: string, newId: string, name: string): Promise<string> {
  const safeId = safeViewId(newId);
  if (!safeId) throw new ViewManageError("Invalid view id", "invalid");
  const old = await prisma.dashboard.findUnique({ where: { id: oldId }, include: { widgets: true } });
  if (!old) throw new ViewManageError(`View "${oldId}" not found`, "not_found");

  const idMap: Record<string, string> = {};
  for (const w of old.widgets) idMap[w.id] = w.id + "_copy";
  try {
    await prisma.$transaction([
      prisma.dashboard.create({
        data: { id: safeId, name, wallpaper: (old.wallpaper as any) || {}, settings: (old.settings as any) || {} },
      }),
      ...old.widgets.map((w) =>
        prisma.widget.create({
          data: {
            id: idMap[w.id],
            type: w.type,
            x: w.x, y: w.y, w: w.w, h: w.h,
            bgOpacity: w.bgOpacity,
            config: remapButtonTargets(w.config as any, (id) => idMap[id] ?? id),
            dashboardId: safeId,
          },
        }),
      ),
      prisma.dashboard.delete({ where: { id: oldId } }),
    ]);
  } catch (e: any) {
    if (e?.code === "P2002") throw new ViewManageError("A view with this id already exists", "exists");
    throw e;
  }
  forgetAllowedEntities();
  return safeId;
}

/** Löscht eine Ansicht samt Widgets (Prisma cascadet über die Relation). */
export async function deleteView(id: string): Promise<void> {
  try {
    await prisma.dashboard.delete({ where: { id } });
  } catch (e: any) {
    if (e?.code === "P2025") throw new ViewManageError(`View "${id}" not found`, "not_found");
    throw e;
  }
  forgetAllowedEntities();
}

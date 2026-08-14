import "server-only";
import { prisma } from "@/lib/companion/prisma";
import { migrateLayoutConfigs } from "@/lib/widgets/ha-migration";

/**
 * Liest eine Ansicht so, wie der Editor sie liest — aus /api/layout/get
 * extrahiert, damit die MCP-Werkzeuge exakt dasselbe sehen.
 *
 * `layout: null` heisst "Ansicht existiert nicht", `[]` heisst "bewusst
 * geleert" — die #27-Unterscheidung, ohne die eine geleerte Ansicht beim
 * nächsten Laden ihre Standard-Widgets zurückbekam.
 */
export async function readViewLayout(dashboardId: string): Promise<{
  layout: Array<Record<string, unknown>> | null;
  wallpaper: unknown;
  settings: unknown;
  name: string | null;
}> {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: dashboardId },
    include: { widgets: true },
  });
  if (!dashboard) return { layout: null, wallpaper: null, settings: null, name: null };

  const rawLayout = dashboard.widgets.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    type: w.type,
    bgOpacity: w.bgOpacity,
    config: w.config,
    label: typeof w.label === "string" ? w.label : "",
  }));

  return {
    layout: migrateLayoutConfigs(rawLayout),
    wallpaper: dashboard.wallpaper,
    settings: dashboard.settings,
    name: dashboard.name,
  };
}

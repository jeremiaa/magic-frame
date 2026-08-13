import "server-only";
import { prisma } from "@/lib/companion/prisma";
import { forgetAllowedEntities } from "@/lib/ha/action-policy";

export const MAX_SNAPSHOTS = 20;

export type SnapshotWidget = {
  id: string;
  type: string;
  label: string;
  config: any;
  bgOpacity: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SnapshotData = {
  name: string;
  wallpaper: any;
  settings: any;
  widgets: SnapshotWidget[];
};

/** Liest den aktuellen Zustand eines Dashboards (für Snapshot/Export). */
export async function captureDashboardState(
  dashboardId: string,
): Promise<SnapshotData | null> {
  const d = await prisma.dashboard.findUnique({
    where: { id: dashboardId },
    include: { widgets: true },
  });
  if (!d) return null;
  return {
    name: d.name,
    wallpaper: (d.wallpaper as any) ?? null,
    settings: (d.settings as any) ?? null,
    widgets: d.widgets.map((w) => ({
      id: w.id,
      type: w.type,
      label: w.label,
      config: (w.config as any) ?? {},
      bgOpacity: w.bgOpacity,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
    })),
  };
}

/** Legt einen Snapshot des aktuellen Stands an + pruned auf MAX_SNAPSHOTS.
 *  Leere/neue Views (keine Widgets) werden übersprungen. */
export async function createSnapshot(
  dashboardId: string,
  reason: string,
): Promise<void> {
  const data = await captureDashboardState(dashboardId);
  if (!data || data.widgets.length === 0) return;
  await prisma.snapshot.create({
    data: {
      dashboardId,
      dashboardName: data.name,
      reason,
      data: data as any,
    },
  });
  await pruneSnapshots();
}

async function pruneSnapshots(): Promise<void> {
  const all = await prisma.snapshot.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (all.length > MAX_SNAPSHOTS) {
    const toDelete = all.slice(MAX_SNAPSHOTS).map((s) => s.id);
    await prisma.snapshot.deleteMany({ where: { id: { in: toDelete } } });
  }
}

/** Schreibt eine SnapshotData zurück in ein Dashboard (überschreibt Widgets). */
export async function applyDashboardState(
  dashboardId: string,
  data: SnapshotData,
): Promise<void> {
  await prisma.dashboard.upsert({
    where: { id: dashboardId },
    update: {
      wallpaper: data.wallpaper ?? undefined,
      settings: data.settings ?? undefined,
      name: data.name || undefined,
    },
    create: {
      id: dashboardId,
      name: data.name || `View ${dashboardId}`,
      wallpaper: data.wallpaper ?? {},
      settings: data.settings ?? {},
    },
  });
  // Ein Restore tauscht alle Widgets aus — die Erlaubnisliste von
  // /api/ha/action stammt daraus und muss neu gelesen werden.
  forgetAllowedEntities();
  await prisma.widget.deleteMany({ where: { dashboardId } });
  for (const w of data.widgets) {
    await prisma.widget.create({
      data: {
        id: w.id?.startsWith(`${dashboardId}_`) ? w.id : `${dashboardId}_${w.id ?? Math.random().toString(36).slice(2)}`,
        type: w.type,
        label: w.label ?? "",
        config: w.config ?? {},
        bgOpacity: typeof w.bgOpacity === "number" ? w.bgOpacity : 0.2,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        dashboardId,
      },
    });
  }
}

/** Stellt einen Snapshot wieder her. Sichert vorher den aktuellen Stand
 *  (reason "pre-restore"), damit der Restore selbst rückgängig machbar ist. */
export async function restoreSnapshot(snapshotId: string): Promise<boolean> {
  const snap = await prisma.snapshot.findUnique({ where: { id: snapshotId } });
  if (!snap) return false;
  const data = snap.data as any as SnapshotData;
  // Aktuellen Stand sichern (Daten von snap sind schon im Speicher).
  await createSnapshot(snap.dashboardId, "pre-restore");
  await applyDashboardState(snap.dashboardId, data);
  return true;
}

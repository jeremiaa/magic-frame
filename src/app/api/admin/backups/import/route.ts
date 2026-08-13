import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdmin,
  ForbiddenError,
  forbiddenResponse,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { createSnapshot, applyDashboardState, type SnapshotData } from "@/lib/backups/snapshots";

export const dynamic = "force-dynamic";

function num(v: any, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// POST /api/admin/backups/import
// Body: das Export-JSON (magicFrameBackup). Überschreibt die enthaltenen Views
// (upsert), legt vorher pro betroffenem View einen pre-import-Snapshot an.
// Nicht im Backup enthaltene Views bleiben unangetastet.
export async function POST(req: NextRequest) {
  try {
    await verifyAdmin();

    const body = await req.json().catch(() => null);
    if (!body || body.magicFrameBackup !== true || !Array.isArray(body.dashboards)) {
      return NextResponse.json(
        { error: "Keine gültige Magic-Frame-Backup-Datei." },
        { status: 400 },
      );
    }

    const results: { id: string; name: string; widgets: number }[] = [];

    for (const d of body.dashboards) {
      if (!d || typeof d.id !== "string") continue;
      const widgets = Array.isArray(d.widgets) ? d.widgets : [];

      // Pre-Import-Snapshot des aktuellen Stands (falls vorhanden).
      try {
        await createSnapshot(d.id, "pre-import");
      } catch (e) {
        console.error("[import] pre-snapshot failed (non-fatal):", e);
      }

      const data: SnapshotData = {
        name: typeof d.name === "string" ? d.name : `View ${d.id}`,
        wallpaper: d.wallpaper ?? null,
        settings: d.settings ?? null,
        widgets: widgets
          .filter((w: any) => w && typeof w.type === "string")
          .map((w: any) => ({
            id: typeof w.id === "string" ? w.id : Math.random().toString(36).slice(2),
            type: w.type,
            label: typeof w.label === "string" ? w.label : "",
            config: w.config ?? {},
            bgOpacity: typeof w.bgOpacity === "number" ? w.bgOpacity : 0.2,
            x: num(w.x),
            y: num(w.y),
            w: num(w.w, 4),
            h: num(w.h, 4),
          })),
      };

      await applyDashboardState(d.id, data);
      results.push({ id: d.id, name: data.name, widgets: data.widgets.length });
    }

    if ((global as any).LIVE_SYNC_IO) {
      (global as any).LIVE_SYNC_IO.emit("LAYOUT_UPDATED");
    }

    return NextResponse.json({ ok: true, imported: results });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    console.error("backup import error", err);
    return NextResponse.json({ error: "Import fehlgeschlagen." }, { status: 500 });
  }
}

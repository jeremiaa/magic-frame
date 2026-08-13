import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { layoutSyncBodySchema } from "@/lib/widgets/schemas";
import { remapButtonTargets } from "@/lib/widgets/remap-targets";
import { createSnapshot } from "@/lib/backups/snapshots";
import { forgetAllowedEntities } from "@/lib/ha/action-policy";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function POST(req: NextRequest) {
  try {
    await verifySession();
    const raw = await req.json();

    const parsed = layoutSyncBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid layout payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { layout, wallpaper, settings, dashboardId: reqDashboardId } = parsed.data;

    const dashboardId = reqDashboardId || "1";

    // Auto-Snapshot: aktuellen (Pre-Save-)Stand sichern, bevor überschrieben wird.
    // Fehler hier dürfen den Save nicht blockieren.
    try {
      await createSnapshot(dashboardId, "auto-save");
    } catch (snapErr) {
      console.error("[sync] snapshot failed (non-fatal):", snapErr);
    }

    await prisma.dashboard.upsert({
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
    });

    // Clear old layout and overwrite
    await prisma.widget.deleteMany({ where: { dashboardId } });

    // Widget ids are persisted with a `${dashboardId}_` prefix. Apply the same
    // rule to a Button's stored target ids so its show/hide links survive the
    // rename instead of being orphaned. This also auto-heals layouts saved by
    // older builds (where an unprefixed target like "clk" maps cleanly onto the
    // now-prefixed widget id) — but only when the result is a real widget in
    // this layout; genuine orphans are left untouched.
    const finalId = (i: string) =>
      i.startsWith(`${dashboardId}_`) ? i : `${dashboardId}_${i}`;
    const validIds = new Set(layout.map((it) => finalId(it.i)));
    const mapTarget = (id: string) => {
      const mapped = finalId(id);
      return validIds.has(mapped) ? mapped : id;
    };

    for (const item of layout) {
      await prisma.widget.create({
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
      });
    }

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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("[sync] error:", error);
    return NextResponse.json(
      {
        error: "Failed to save layout",
        details: {
          message: error?.message,
          code: error?.code,
          meta: error?.meta,
        },
      },
      { status: 500 },
    );
  }
}

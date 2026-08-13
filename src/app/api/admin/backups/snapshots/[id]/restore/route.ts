import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdmin,
  ForbiddenError,
  forbiddenResponse,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { restoreSnapshot } from "@/lib/backups/snapshots";

export const dynamic = "force-dynamic";

// POST /api/admin/backups/snapshots/[id]/restore
// Spielt den Snapshot zurück. Sichert vorher den aktuellen Stand (pre-restore).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await verifyAdmin();
    const { id } = await params;
    const ok = await restoreSnapshot(id);
    if (!ok) {
      return NextResponse.json({ error: "Snapshot nicht gefunden." }, { status: 404 });
    }
    if ((global as any).LIVE_SYNC_IO) {
      (global as any).LIVE_SYNC_IO.emit("LAYOUT_UPDATED");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    if (err instanceof ForbiddenError) return forbiddenResponse();
    console.error("snapshot restore error", err);
    return NextResponse.json({ error: "Wiederherstellen fehlgeschlagen." }, { status: 500 });
  }
}

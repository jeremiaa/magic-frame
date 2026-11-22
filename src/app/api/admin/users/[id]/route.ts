import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { prisma } from "@/lib/companion/prisma";
import { forgetAccount } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// DELETE /api/admin/users/[id] — Nutzer entfernen (nur Admin)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await verifySession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Nur Admins dürfen Nutzer löschen." },
        { status: 403 },
      );
    }
    const { id } = await params;

    if (id === session.userId) {
      return NextResponse.json(
        { error: "Du kannst dich nicht selbst löschen." },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Nutzer nicht gefunden." }, { status: 404 });
    }

    // Letzten Admin schützen
    if (target.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Der letzte Admin kann nicht gelöscht werden." },
          { status: 400 },
        );
      }
    }

    await prisma.user.delete({ where: { id } });
    // Signed out at once, not after the account cache runs out.
    forgetAccount(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("user delete error", err);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}

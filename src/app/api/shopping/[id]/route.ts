import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { removeItem, toggleItem } from "@/lib/companion/shopping";

// Ein Wandtablett meldet sich nicht an — das ist der Sinn der Sache. Diese
// Route hat trotzdem einen Nutzer verlangt und mit 401 geantwortet, und weil
// die Karte die Antwort nie ansah, erschien der Haken kurz und sprang beim
// nächsten Abgleich zurück. Abhaken ging also nie, es sah nur so aus.
//
// Die Liste gehört dem Haushalt, nicht einer Person: `listItems()` kennt
// keinen Nutzer, das Lesen war immer offen, und `createdByUserId` ist
// optional — reine Zuschreibung. Wer die Liste ohnehin lesen darf, darf sie
// auch abhaken. Ein Token bleibt möglich und wird weiter zugeschrieben.

export const dynamic = "force-dynamic";

// Toggle: checked ↔ uncheckd
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  const { id } = await params;
  const item = await toggleItem(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("SHOPPING_UPDATED");
  }
  return NextResponse.json({ item });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  const { id } = await params;
  await removeItem(id);
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("SHOPPING_UPDATED");
  }
  return NextResponse.json({ ok: true });
}

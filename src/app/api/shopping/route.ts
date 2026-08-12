import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { addItems, clearChecked, listItems } from "@/lib/companion/shopping";

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

export async function GET() {
  const items = await listItems();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);

  let body: any = {};
  try { body = await req.json(); } catch {}
  const q = req.nextUrl.searchParams;

  // text → einzelner Artikel. items → Array (Shortcut kann beides).
  const raw = body.items ?? body.text ?? q.get("items") ?? q.get("text");
  let texts: string[] = [];
  if (Array.isArray(raw)) texts = raw.map(String);
  else if (typeof raw === "string") {
    // Erlaube Komma-getrennt: "Milch, Brot, Käse"
    texts = raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  }
  if (texts.length === 0) {
    return NextResponse.json({ error: "text oder items erforderlich" }, { status: 400 });
  }

  const items = await addItems({ userId, texts });
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("SHOPPING_UPDATED");
  }
  return NextResponse.json({ items });
}

// DELETE /api/shopping → löscht alle abgehakten Artikel
export async function DELETE(req: NextRequest) {
  const userId = await resolveUserId(req);
  await clearChecked();
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("SHOPPING_UPDATED");
  }
  return NextResponse.json({ ok: true });
}

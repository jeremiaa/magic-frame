import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { removeTodo, toggleTodo, updateTodo } from "@/lib/companion/todos";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  const { id } = await params;

  let body: any = {};
  try { body = await req.json(); } catch {}

  // Nur {toggle:true} → umschalten
  if (body.toggle === true) {
    const t = await toggleTodo(id);
    if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if ((global as any).LIVE_SYNC_IO) {
      (global as any).LIVE_SYNC_IO.emit("TODOS_UPDATED");
    }
    return NextResponse.json({ todo: t });
  }

  const dueDate = body.dueDate !== undefined
    ? (body.dueDate ? new Date(String(body.dueDate)) : null)
    : undefined;
  if (dueDate && isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "ungültiges dueDate" }, { status: 400 });
  }
  const priorityRaw = body.priority;
  const priority = priorityRaw === "low" || priorityRaw === "normal" || priorityRaw === "high"
    ? priorityRaw
    : undefined;

  const todo = await updateTodo(id, {
    title: body.title,
    assignee: body.assignee !== undefined ? body.assignee : undefined,
    dueDate,
    priority,
  });
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("TODOS_UPDATED");
  }
  return NextResponse.json({ todo });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  const { id } = await params;
  await removeTodo(id);
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("TODOS_UPDATED");
  }
  return NextResponse.json({ ok: true });
}

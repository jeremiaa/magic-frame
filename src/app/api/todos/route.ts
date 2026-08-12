import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { createTodo, listTodos } from "@/lib/companion/todos";

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

export async function GET(req: NextRequest) {
  const assignee = req.nextUrl.searchParams.get("assignee") ?? undefined;
  const includeDoneHoursRaw = req.nextUrl.searchParams.get("includeDoneHours");
  const includeDoneHours = includeDoneHoursRaw ? Number(includeDoneHoursRaw) : undefined;
  const todos = await listTodos({ assignee, includeDoneHours });
  return NextResponse.json({ todos });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);

  let body: any = {};
  try { body = await req.json(); } catch {}
  const q = req.nextUrl.searchParams;

  const title = (body.title ?? q.get("title") ?? "").toString().trim();
  if (!title) return NextResponse.json({ error: "title erforderlich" }, { status: 400 });

  const assignee = body.assignee ?? q.get("assignee") ?? null;
  const dueRaw = body.dueDate ?? q.get("dueDate");
  const dueDate = dueRaw ? new Date(String(dueRaw)) : null;
  if (dueDate && isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "ungültiges dueDate (ISO 8601)" }, { status: 400 });
  }
  const priorityRaw = (body.priority ?? q.get("priority") ?? "normal").toString();
  const priority = priorityRaw === "low" || priorityRaw === "high" ? priorityRaw : "normal";

  const todo = await createTodo({
    userId,
    title,
    assignee: assignee ? String(assignee) : null,
    dueDate,
    priority,
  });
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("TODOS_UPDATED");
  }
  return NextResponse.json({ todo });
}

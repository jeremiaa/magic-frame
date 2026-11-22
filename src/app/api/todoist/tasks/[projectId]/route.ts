import { NextRequest, NextResponse } from "next/server";
import {
  listTasks,
  listSections,
  createTask,
  closeTask,
  reopenTask,
  deleteTask,
  updateTask,
  TodoistError,
} from "@/lib/todoist/client";
import { isSignedIn, noteRefused, standsInAView } from "@/lib/ha/action-policy";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ projectId: string }> };

/**
 * A display works its list without a login — ticks off, adds, renames,
 * deletes — so there is none here. Without one, though, only the Todoist
 * project a saved view shows is reachable. It used to be every project in the
 * account, and because Todoist task ids are global, one list on one screen was
 * enough to close or delete any task anywhere.
 */
async function refuseProject(projectId: string): Promise<NextResponse | null> {
  if (await isSignedIn()) return null;
  if (await standsInAView(projectId)) return null;
  noteRefused("todoist", "a project");
  return NextResponse.json({ error: "This list is not on any of your views." }, { status: 403 });
}

/** Without a login a task is only touched when it is an open task of that project. */
async function refuseTask(projectId: string, taskId: string): Promise<NextResponse | null> {
  const refused = await refuseProject(projectId);
  if (refused) return refused;
  if (await isSignedIn()) return null;
  const open = await listTasks(projectId);
  if (open.some((t) => String(t.id) === taskId)) return null;
  noteRefused("todoist", "a task of another project");
  return NextResponse.json({ error: "This task is not on any of your views." }, { status: 403 });
}

/**
 * GET → offene Tasks im Projekt, plus die Abschnitte (Sections) des Projekts.
 * Sections werden immer mitgeliefert (günstiger, paginierter Zusatz-Call,
 * gleiches Muster wie /projects) — ob ein Widget sie zur Gruppierung nutzt,
 * entscheidet dessen eigene Einstellung. Welche Tasks geliefert werden,
 * ändert sich dadurch nicht.
 */
export async function GET(_: NextRequest, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    if (!/^[0-9A-Za-z]+$/.test(projectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }
    const refused = await refuseProject(projectId);
    if (refused) return refused;
    // Sections are additive display data, never allowed to block tasks:
    // if that call fails for any reason, fall back to an empty list instead
    // of failing the whole response.
    const [tasks, sections] = await Promise.all([
      listTasks(projectId),
      listSections(projectId).catch(() => []),
    ]);
    return NextResponse.json({
      projectId,
      tasks: tasks.map((t) => ({
        id: t.id,
        content: t.content,
        priority: t.priority,
        due: t.due ?? null,
        labels: t.labels ?? [],
        isCompleted: t.checked,
        sectionId: t.section_id ?? null,
      })),
      sections: sections
        .map((s) => ({ id: s.id, name: s.name, order: s.order ?? 0 }))
        .sort((a, b) => a.order - b.order),
    });
  } catch (err: any) {
    if (err instanceof TodoistError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

/** POST { content, dueString?, priority? } → neuer Task. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    if (!/^[0-9A-Za-z]+$/.test(projectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }
    const refused = await refuseProject(projectId);
    if (refused) return refused;
    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });
    const task = await createTask({
      projectId,
      content,
      dueString: body.dueString,
      priority: body.priority,
    });
    return NextResponse.json({ task });
  } catch (err: any) {
    if (err instanceof TodoistError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

/**
 * PATCH { taskId, action } — Aktionen pro Task:
 *   action="close" | "reopen" | "rename" (mit content) | "update" (mit content/dueString/priority).
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    // Todoist task ids are global — which is exactly why the project in the
    // path is checked against the task without a login (see refuseTask).
    const { projectId } = await ctx.params;
    const body = await req.json();
    const taskId = String(body.taskId ?? "");
    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });
    const action = String(body.action ?? "");
    // Reopening is the undo right after a tick: the task is closed by then and
    // no longer in the open list, and reopening destroys nothing.
    const refused = action === "reopen" ? await refuseProject(projectId) : await refuseTask(projectId, taskId);
    if (refused) return refused;
    if (action === "close") {
      await closeTask(taskId);
      return NextResponse.json({ ok: true });
    }
    if (action === "reopen") {
      await reopenTask(taskId);
      return NextResponse.json({ ok: true });
    }
    if (action === "rename" || action === "update") {
      const updated = await updateTask(taskId, {
        content: typeof body.content === "string" ? body.content : undefined,
        dueString: body.dueString,
        priority: body.priority,
      });
      return NextResponse.json({ task: updated });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    if (err instanceof TodoistError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

/** DELETE ?taskId=X */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const taskId = req.nextUrl.searchParams.get("taskId") ?? "";
    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });
    const refused = await refuseTask(projectId, taskId);
    if (refused) return refused;
    await deleteTask(taskId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof TodoistError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

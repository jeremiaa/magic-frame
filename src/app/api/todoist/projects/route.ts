import { NextResponse } from "next/server";
import { listProjects, TodoistError } from "@/lib/todoist/client";
import { isSignedIn, standsInAView } from "@/lib/ha/action-policy";

export const dynamic = "force-dynamic";

/**
 * Read-only Projektliste — wird vom Editor-Inspector (Dropdown) gepollt,
 * damit der User beim Konfigurieren des Widgets seine Todoist-Projekte sieht.
 * Ohne Anmeldung, weil das auch von der Live-View gerendert werden kann —
 * dann aber nur die Projekte, die eine gespeicherte Ansicht zeigt. Der Token
 * bleibt server-side; raus geht nur (id, name).
 */
export async function GET() {
  try {
    // Signed in, the list picker gets every project. Without a login this used
    // to name every project in the account to anybody; now only the projects
    // a saved view shows.
    const signedIn = await isSignedIn();
    let list = await listProjects();
    if (!signedIn) {
      const shown: typeof list = [];
      for (const p of list) if (await standsInAView(p.id)) shown.push(p);
      list = shown;
    }
    return NextResponse.json({
      projects: list.map((p) => ({
        id: p.id,
        name: p.name,
        isInbox: !!p.inbox_project,
        parentId: p.parent_id,
      })),
    });
  } catch (err: any) {
    if (err instanceof TodoistError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

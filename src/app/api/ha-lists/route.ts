import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";
import { describeHaFetchError } from "@/lib/ha/fetch-error";
import { isSignedIn, readableEntities } from "@/lib/ha/action-policy";

export const dynamic = "force-dynamic";

/** Liefert alle todo.* Entities aus Home Assistant (Name + Item-Count). */
export async function GET() {
  try {
    // The list pickers in the editor ask signed in and get every list. This
    // used to name every to-do list in Home Assistant, with its count, to
    // anybody; without a login it now names only the lists on a saved view.
    const signedIn = await isSignedIn();
    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      return NextResponse.json(
        { error: "Home Assistant not configured (Integrationen)." },
        { status: 400 },
      );
    }
    const base = settings.haUrl.replace(/\/+$/, "");
    const headers = {
      Authorization: `Bearer ${settings.haToken}`,
      "Content-Type": "application/json",
    };
    const res = await fetch(`${base}/api/states`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Home Assistant returned ${res.status}` },
        { status: 502 },
      );
    }
    const all = (await res.json()) as any[];
    let todos = all.filter(
      (e) => typeof e.entity_id === "string" && e.entity_id.startsWith("todo."),
    );
    if (!signedIn) {
      const readable = new Set(await readableEntities("ha-lists", todos.map((e) => e.entity_id), { quiet: true }));
      todos = todos.filter((e) => readable.has(e.entity_id));
    }
    const ids = todos.map((e) => e.entity_id);

    // Item-Counts: die moderne HA-todo-Plattform hält die Items NICHT mehr im
    // State-Attribut — sie kommen über den `todo.get_items`-Response-Service
    // (ein gebündelter Call für alle Listen). Best-effort: scheitert der Call,
    // bleiben die Listen trotzdem wählbar, nur ohne Count. (issue #19)
    const counts: Record<string, number> = {};
    if (ids.length > 0) {
      try {
        const r = await fetch(
          `${base}/api/services/todo/get_items?return_response=true`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ entity_id: ids }),
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          },
        );
        if (r.ok) {
          const d = await r.json();
          const sr = d?.service_response ?? {};
          for (const id of ids) {
            const items = sr?.[id]?.items;
            counts[id] = Array.isArray(items) ? items.length : 0;
          }
        }
      } catch {
        // Count ist best-effort — Listen bleiben ohne Count nutzbar.
      }
    }

    const lists = todos
      .map((e) => ({
        entityId: e.entity_id,
        name:
          (e.attributes || {}).friendly_name ||
          e.entity_id.replace(/^todo\./, ""),
        itemCount: counts[e.entity_id] ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ lists });
  } catch (err: any) {
    return NextResponse.json(
      { error: describeHaFetchError(err) },
      { status: 500 },
    );
  }
}

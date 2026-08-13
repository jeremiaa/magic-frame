import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";
import { describeHaFetchError } from "@/lib/ha/fetch-error";
import { callerMayUse } from "@/lib/ha/action-policy";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ entity: string }> };

async function haFetch(path: string, init?: RequestInit) {
  const settings = await getAppSettings();
  if (!settings.haUrl || !settings.haToken) {
    throw new Error("Home Assistant not configured.");
  }
  const base = settings.haUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${settings.haToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  return res;
}

function validateEntity(raw: string): string | null {
  // Erwartet "todo.shopping_list" o.ä. — nur einfache Domain.entity-Form akzeptieren.
  if (!/^todo\.[a-z0-9_]+$/.test(raw)) return null;
  return raw;
}

/**
 * Dieselbe Erlaubnisliste wie /api/ha/action — hier steht der zweite
 * ungeschützte Schreibweg nach Home Assistant.
 *
 * Auch die Route ist ohne Login erreichbar, weil die Einkaufs- und Todo-Karten
 * auf einem Wandtablet abhakbar sein müssen. Die Beschränkung auf `todo.*` hat
 * verhindert, dass darüber ein Schloss aufgeht, aber jede Liste in Home
 * Assistant war les- und schreibbar — auch die, die auf keiner Ansicht liegt.
 * Die Widgets speichern ihre Liste in `haListEntity`, echte Listen stehen also
 * ohnehin auf der Liste.
 */
async function refuseIfNotAllowed(entityId: string) {
  if (await callerMayUse(entityId)) return null;
  console.warn(`[ha-lists] refused ${entityId} — not on any view`);
  return NextResponse.json(
    {
      error: `${entityId} is not on any of your views. A display may only use what is on your views. If you need this, set MAGIC_FRAME_HA_ACTION_UNRESTRICTED=1 in your .env — see the Home Assistant page of the wiki.`,
    },
    { status: 403 },
  );
}

/** Liest Items aus dem Entity-State. */
export async function GET(_: NextRequest, ctx: Ctx) {
  const { entity } = await ctx.params;
  const entityId = validateEntity(entity);
  if (!entityId) {
    return NextResponse.json({ error: "Invalid entity id" }, { status: 400 });
  }
  const refusal = await refuseIfNotAllowed(entityId);
  if (refusal) return refusal;
  try {
    // Modern HA `todo` platform does NOT expose items in the state attributes
    // anymore — they must be fetched via the `todo.get_items` response service.
    // (Old attributes.items/all_items path returned nothing → issue #19.)
    const res = await haFetch(
      `/api/services/todo/get_items?return_response=true`,
      { method: "POST", body: JSON.stringify({ entity_id: entityId }) },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: `HA returned ${res.status}` },
        { status: res.status === 404 ? 404 : 502 },
      );
    }
    const data = await res.json();
    // Shape: { changed_states: [...], service_response: { "todo.x": { items: [...] } } }
    const raw: any[] = data?.service_response?.[entityId]?.items ?? [];
    const items = raw.map((it: any, idx: number) => {
      if (typeof it === "string") {
        return { uid: `s${idx}`, summary: it, status: "needs_action" as const };
      }
      return {
        uid: it.uid ?? `s${idx}`,
        summary: it.summary ?? it.name ?? String(it),
        status:
          it.status === "completed"
            ? ("completed" as const)
            : ("needs_action" as const),
      };
    });
    return NextResponse.json({ entityId, items });
  } catch (err: any) {
    return NextResponse.json({ error: describeHaFetchError(err) }, { status: 500 });
  }
}

/** Fügt einen Item hinzu — todo.add_item */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { entity } = await ctx.params;
  const entityId = validateEntity(entity);
  if (!entityId) return NextResponse.json({ error: "Invalid entity id" }, { status: 400 });
  const refusal = await refuseIfNotAllowed(entityId);
  if (refusal) return refusal;
  try {
    const body = await req.json();
    const item = String(body.item ?? "").trim();
    if (!item) return NextResponse.json({ error: "Empty item" }, { status: 400 });
    const res = await haFetch(`/api/services/todo/add_item`, {
      method: "POST",
      body: JSON.stringify({ entity_id: entityId, item }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `HA returned ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: describeHaFetchError(err) }, { status: 500 });
  }
}

/** Update eines Items (Status toggle oder rename) — todo.update_item */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { entity } = await ctx.params;
  const entityId = validateEntity(entity);
  if (!entityId) return NextResponse.json({ error: "Invalid entity id" }, { status: 400 });
  const refusal = await refuseIfNotAllowed(entityId);
  if (refusal) return refusal;
  try {
    const body = await req.json();
    const item = String(body.item ?? "").trim();
    if (!item) return NextResponse.json({ error: "Empty item" }, { status: 400 });
    const payload: Record<string, any> = { entity_id: entityId, item };
    if (body.status) payload.status = body.status;
    if (body.rename) payload.rename = String(body.rename);
    const res = await haFetch(`/api/services/todo/update_item`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `HA returned ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: describeHaFetchError(err) }, { status: 500 });
  }
}

/** Entfernt ein Item oder alle erledigten — todo.remove_item / todo.remove_completed_items */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { entity } = await ctx.params;
  const entityId = validateEntity(entity);
  if (!entityId) return NextResponse.json({ error: "Invalid entity id" }, { status: 400 });
  const refusal = await refuseIfNotAllowed(entityId);
  if (refusal) return refusal;
  try {
    const completedAll = req.nextUrl.searchParams.get("completed") === "1";
    if (completedAll) {
      const res = await haFetch(`/api/services/todo/remove_completed_items`, {
        method: "POST",
        body: JSON.stringify({ entity_id: entityId }),
      });
      if (!res.ok) {
        return NextResponse.json({ error: `HA returned ${res.status}` }, { status: 502 });
      }
      return NextResponse.json({ ok: true });
    }
    const item = String(req.nextUrl.searchParams.get("item") ?? "").trim();
    if (!item) return NextResponse.json({ error: "Empty item" }, { status: 400 });
    const res = await haFetch(`/api/services/todo/remove_item`, {
      method: "POST",
      body: JSON.stringify({ entity_id: entityId, item }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `HA returned ${res.status}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: describeHaFetchError(err) }, { status: 500 });
  }
}

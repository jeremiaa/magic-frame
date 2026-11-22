import { NextRequest } from "next/server";
import { getBroadcaster } from "@/lib/ha-bridge/broadcaster";
import { readableEntities } from "@/lib/ha/action-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const idsRaw = req.nextUrl.searchParams.get("ids") ?? "";
  const asked = idsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // An empty list used to mean "every state change in the house", to anyone.
  // Now it means nothing: the stream carries exactly the entities asked for,
  // and without a login only those on a saved view (see readableEntities).
  const ids = await readableEntities("ha/stream", asked);

  const broadcaster = getBroadcaster();
  broadcaster.addSubscriber();

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let onState: ((entity: any) => void) | null = null;
  let onSnapshotReady: (() => void) | null = null;
  let cleaned = false;

  const stream = new ReadableStream({
    start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (cleaned) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      // Initial-Snapshot — falls Cache leer, erst emit snapshot abwarten.
      const sendSnapshot = () => {
        const snap =
          ids.length > 0
            ? broadcaster.getCachedMany(ids)
            : ({} as Record<string, any>);
        safeEnqueue(
          `data: ${JSON.stringify({ type: "snapshot", states: snap, connected: broadcaster.isConnected() })}\n\n`,
        );
      };
      sendSnapshot();

      onSnapshotReady = () => sendSnapshot();
      broadcaster.on("snapshot", onSnapshotReady);

      onState = (entity: any) => {
        if (!ids.includes(entity.entity_id)) return;
        safeEnqueue(`data: ${JSON.stringify({ type: "state", entity })}\n\n`);
      };
      broadcaster.on("state", onState);

      heartbeat = setInterval(() => safeEnqueue(`:hb\n\n`), 25_000);

      // Abort-Signal (Client hat connection geschlossen)
      req.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    if (onState) broadcaster.off("state", onState);
    if (onSnapshotReady) broadcaster.off("snapshot", onSnapshotReady);
    if (heartbeat) clearInterval(heartbeat);
    broadcaster.removeSubscriber();
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

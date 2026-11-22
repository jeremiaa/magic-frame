import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";
import { callerMayRead } from "@/lib/ha/action-policy";

export const dynamic = "force-dynamic";

/**
 * WebRTC signaling proxy for Home Assistant cameras.
 *
 * POST /api/ha/camera/<entity_id>/webrtc
 *   body: { offer: "<sdp>" }
 *   returns: { answer: "<sdp>" }  on success
 *            { error: "..."   }  on failure
 *
 * HA exposes its WebRTC support through the WebSocket API only — there's
 * no REST endpoint. So we open a short-lived WebSocket to HA per request:
 *   1. Connect to ws://…/api/websocket
 *   2. Wait for `auth_required`
 *   3. Send `{type: "auth", access_token}`
 *   4. Wait for `auth_ok`
 *   5. Send `{id: 1, type: "camera/webrtc/offer", entity_id, offer}`
 *   6. Wait for the matching `result` message with the answer
 *   7. Close
 *
 * The browser uses the returned answer to complete its RTCPeerConnection.
 * The HA token never reaches the browser — this route does the auth dance
 * on its behalf.
 *
 * Requires HA's `webrtc` capability (built-in for go2rtc-backed setups,
 * also works for cameras whose integration ships its own webrtc_offer
 * provider, e.g. Reolink/UniFi via go2rtc, ESPHome cameras, etc.).
 */

const WS_TIMEOUT_MS = 12_000;

type WSMessage = {
  id?: number;
  type?: string;
  success?: boolean;
  result?: any;
  error?: { code?: string; message?: string };
  message?: string;
  event?: any;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> },
) {
  try {
    const { entity } = await context.params;
    if (!entity || !entity.includes(".")) {
      return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
    }
    // No login on purpose (a tablet shows it without one), but then only
    // what is on a saved view — any entity used to be one guess away.
    if (!(await callerMayRead("ha/camera", entity))) {
      return NextResponse.json({ error: "This camera is not on any of your views." }, { status: 403 });
    }
    const { offer } = (await request.json().catch(() => ({}))) as { offer?: string };
    if (!offer || typeof offer !== "string") {
      return NextResponse.json({ error: "Missing SDP offer" }, { status: 400 });
    }

    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      return NextResponse.json(
        { error: "Home Assistant not configured (Integrationen)." },
        { status: 400 },
      );
    }

    const wsUrl =
      settings.haUrl
        .replace(/^https?:\/\//, (m) => (m === "https://" ? "wss://" : "ws://"))
        .replace(/\/+$/, "") + "/api/websocket";

    const result = await signal(wsUrl, settings.haToken, entity, offer);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "WebRTC signaling failed" },
      { status: 502 },
    );
  }
}

/**
 * Runs the full WS auth + offer/answer dance against HA. Resolves with
 * the answer SDP. Rejects with a clear Error if any step fails or times
 * out — the catch in POST() turns that into the JSON 502.
 */
function signal(
  wsUrl: string,
  token: string,
  entity: string,
  offer: string,
): Promise<{ answer: string; candidates: any[] }> {
  return new Promise((resolve, reject) => {
    // Node 20+ ships a native global WebSocket, so no extra `ws` dep needed.
    const ws = new WebSocket(wsUrl);

    const cmdId = 1;
    let settled = false;
    let answerSdp: string | null = null;
    const candidates: any[] = [];
    let collectTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (err: Error | null) => {
      if (settled) return;
      settled = true;
      if (collectTimer) clearTimeout(collectTimer);
      try {
        ws.close();
      } catch {}
      if (err) reject(err);
      else resolve({ answer: answerSdp || "", candidates });
    };

    const timer = setTimeout(
      () => finish(new Error(`WebSocket signaling timed out after ${WS_TIMEOUT_MS}ms`)),
      WS_TIMEOUT_MS,
    );

    // After the answer arrives, HA trickles its ICE candidates as separate
    // events. Collect them for a short window, then resolve with answer +
    // candidates. Without HA's candidates the browser's ICE stays "new" and
    // the video is black — that's the bug we're fixing.
    const scheduleFinish = () => {
      if (collectTimer || settled) return;
      collectTimer = setTimeout(() => finish(null), 1200);
    };

    ws.addEventListener("error", () => {
      clearTimeout(timer);
      finish(new Error("WebSocket connection error"));
    });

    ws.addEventListener("close", () => {
      clearTimeout(timer);
      // Already have the answer? A drop mid-collection is fine — resolve it.
      if (!settled) finish(answerSdp ? null : new Error("WebSocket closed before answer arrived"));
    });

    ws.addEventListener("message", (ev: MessageEvent) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(ev.data as string) as WSMessage;
      } catch {
        return;
      }

      if (msg.type === "auth_required") {
        ws.send(JSON.stringify({ type: "auth", access_token: token }));
        return;
      }
      if (msg.type === "auth_invalid") {
        clearTimeout(timer);
        finish(new Error(msg.message || "HA rejected token"));
        return;
      }
      if (msg.type === "auth_ok") {
        ws.send(
          JSON.stringify({
            id: cmdId,
            type: "camera/webrtc/offer",
            entity_id: entity,
            offer,
          }),
        );
        return;
      }

      if (msg.id !== cmdId) return;

      // HA has two flavours of the camera webrtc command:
      //  - OLD (camera/web_rtc_offer): the answer comes back synchronously in
      //    `result` (as a string, or {answer}/{sdp}).
      //  - NEW (camera/webrtc/offer, 2024.11+): `result` is only a subscription
      //    ACK; the SDP answer then arrives as a later `event` of type "answer",
      //    and errors as an `event` of type "error". We were treating the ACK as
      //    "no answer" → this is the fix.
      if (msg.type === "result") {
        if (msg.success === false) {
          clearTimeout(timer);
          finish(new Error(msg.error?.message || msg.error?.code || "HA rejected webrtc offer"));
          return;
        }
        // Old API: answer embedded directly in the result → resolve right away.
        const r: any = msg.result;
        const direct = typeof r === "string" ? r : r?.answer || r?.sdp;
        if (typeof direct === "string" && direct.length > 0) {
          answerSdp = direct;
          clearTimeout(timer);
          finish(null);
        }
        // Otherwise it's the new-API subscription ack — keep waiting for events.
        return;
      }

      if (msg.type === "event") {
        const event: any = (msg as any).event ?? {};
        if (event.type === "answer" && typeof event.answer === "string" && event.answer.length > 0) {
          // Store the answer, then wait briefly for HA to trickle its candidates.
          answerSdp = event.answer;
          clearTimeout(timer);
          scheduleFinish();
        } else if (event.type === "candidate" && event.candidate) {
          // HA's ICE candidate — forward to the browser via the response.
          candidates.push(event.candidate);
        } else if (event.type === "error") {
          clearTimeout(timer);
          finish(new Error(event.message || event.code || "HA webrtc error"));
        }
        // "session" event ignored — session_id is only needed for client→HA
        // candidate trickle, which we skip (the browser already embeds its
        // candidates in the offer SDP it sent).
        return;
      }
    });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";
import { callerMayRead } from "@/lib/ha/action-policy";

export const dynamic = "force-dynamic";

/**
 * MJPEG live stream proxy for Home Assistant camera entities.
 *
 * GET /api/ha/camera/<entity_id>/stream
 *  → opens HA's /api/camera_proxy_stream/<entity_id> with the stored Bearer
 *    token and pipes the multipart/x-mixed-replace MJPEG response straight
 *    through to the browser. The browser uses it as the src of an <img>
 *    element which then animates frame-by-frame.
 *
 * No browser-side token, no caching, no buffering beyond what HA already
 * does. Quality is whatever HA's `camera.stream_source` integration
 * returns — usually 480p/720p for most consumer cameras, which beats the
 * snapshot mode but is still bandwidth-hungry compared to HLS.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> },
) {
  try {
    const { entity } = await context.params;
    if (!entity || !entity.includes(".")) {
      return NextResponse.json(
        { error: "Invalid entity ID" },
        { status: 400 },
      );
    }
    // No login on purpose (a tablet shows it without one), but then only
    // what is on a saved view — any entity used to be one guess away.
    if (!(await callerMayRead("ha/camera", entity))) {
      return NextResponse.json({ error: "This camera is not on any of your views." }, { status: 403 });
    }

    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      return NextResponse.json(
        { error: "Home Assistant not configured (Integrationen)." },
        { status: 400 },
      );
    }

    const base = settings.haUrl.replace(/\/+$/, "");
    const upstream = await fetch(
      `${base}/api/camera_proxy_stream/${encodeURIComponent(entity)}`,
      {
        headers: { Authorization: `Bearer ${settings.haToken}` },
        // Stream — no timeout. Browser controls disconnection.
        cache: "no-store",
      },
    );

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Home Assistant returned ${upstream.status}` },
        { status: 502 },
      );
    }

    // Pipe upstream MJPEG bytes through verbatim. ReadableStream is what
    // both fetch() and NextResponse natively work with.
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ||
          "multipart/x-mixed-replace; boundary=frame",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Camera stream failed" },
      { status: 500 },
    );
  }
}

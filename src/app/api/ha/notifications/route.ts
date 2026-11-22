import { NextResponse } from "next/server";
import WebSocket from "ws";
import { getAppSettings } from "@/lib/settings/store";
import { describeHaFetchError } from "@/lib/ha/fetch-error";
import { isSignedIn, modulesOnViewsCall, viewsUseWidget, noteRefused } from "@/lib/ha/action-policy";

export const dynamic = "force-dynamic";

// #62: Home Assistant hat die persistent_notification-ENTITÄTEN entfernt
// (deprecated ab 2022, weg seit 2023). Auf HA 2026.7 legt
// persistent_notification.create nachweislich KEINE Entität mehr an — der
// alte Weg über /api/states konnte also gar nichts mehr finden.
// Die Benachrichtigungen gibt es nur noch über die WebSocket-API.

type HANotification = {
  notification_id: string;
  title?: string;
  message?: string;
  created_at?: string | number;
};

// Kurzer Cache: mehrere Displays pollen unabhängig — ohne das würde jedes
// eine eigene WebSocket-Verbindung pro Intervall aufmachen.
let cache: { at: number; data: any[] } | null = null;
const CACHE_MS = 4000;

function fetchViaWebSocket(haUrl: string, token: string): Promise<HANotification[]> {
  return new Promise((resolve, reject) => {
    const wsUrl = haUrl.replace(/^http/, "ws").replace(/\/$/, "") + "/api/websocket";
    const ws = new WebSocket(wsUrl);

    let done = false;
    let nextId = 1;
    let subId = 0;
    let getId = 0;
    let emptyTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (err: Error | null, data?: HANotification[]) => {
      if (done) return;
      done = true;
      clearTimeout(hardTimeout);
      if (emptyTimer) clearTimeout(emptyTimer);
      try { ws.close(); } catch { /* egal */ }
      if (err) reject(err); else resolve(data ?? []);
    };
    const hardTimeout = setTimeout(() => finish(new Error("HA WebSocket timeout")), 8000);

    ws.on("message", (raw) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === "auth_required") {
        ws.send(JSON.stringify({ type: "auth", access_token: token }));
        return;
      }
      if (msg.type === "auth_invalid") {
        finish(new Error("HA hat den Token abgelehnt"));
        return;
      }
      if (msg.type === "auth_ok") {
        subId = nextId++;
        ws.send(JSON.stringify({ id: subId, type: "persistent_notification/subscribe" }));
        return;
      }
      // Abo bestätigt → HA schickt gleich den Ist-Stand als Event. Kommt
      // keins (weil es nichts gibt), nach 2 s leer auflösen statt zu hängen.
      if (msg.type === "result" && msg.id === subId) {
        if (msg.success) {
          emptyTimer = setTimeout(() => finish(null, []), 2000);
        } else {
          // Ältere HA-Versionen kennen /subscribe nicht → einmalig /get.
          getId = nextId++;
          ws.send(JSON.stringify({ id: getId, type: "persistent_notification/get" }));
        }
        return;
      }
      if (msg.type === "event" && msg.id === subId) {
        const n = msg.event?.notifications;
        if (n && typeof n === "object") finish(null, Object.values(n) as HANotification[]);
        return;
      }
      if (msg.type === "result" && msg.id === getId) {
        if (!msg.success) {
          finish(new Error(msg.error?.message || "HA lehnt persistent_notification/get ab"));
        } else {
          const r = msg.result;
          finish(null, Array.isArray(r) ? r : (Object.values(r ?? {}) as HANotification[]));
        }
      }
    });

    ws.on("error", (e: any) => finish(new Error(e?.message || "WebSocket-Fehler")));
    ws.on("close", () => finish(new Error("HA hat die WebSocket-Verbindung vorzeitig geschlossen")));
  });
}

// HA erlaubt Markdown (und etwas HTML) in Benachrichtigungen. Ungefiltert
// landete das als "### Sensors must be cleaned … ![image](data:image/png;
// base64,…)" auf der Kachel — unleserlich, und das eingebettete Bild blies
// die Antwort auf. Wir machen daraus schlichten Text.
function markdownToText(input: string): string {
  let s = String(input ?? "");
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");       // Bilder (oft riesige data:-URIs)
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");     // Links → nur der Text
  s = s.replace(/<[^>]+>/g, " ");                     // HTML-Tags
  s = s.replace(/(\*\*|__)(.*?)\1/g, "$2");           // fett
  s = s.replace(/(\*|_)(.*?)\1/g, "$2");              // kursiv
  s = s.replace(/~~(.*?)~~/g, "$1");                  // durchgestrichen
  s = s.replace(/`{1,3}([^`]*)`{1,3}/g, "$1");        // Code
  s = s.replace(/^\s{0,3}>\s?/gm, "");                // Zitate
  s = s.replace(/^\s{0,3}[-*+]\s+/gm, "• ");          // Listen
  // Führende Überschrift wird zum Vorsatz, sonst klebt sie am Fließtext.
  s = s.replace(/^\s{0,3}#{1,6}\s+([^\n]+)\r?\n+/, "$1 — ");
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");           // restliche Überschriften
  return s.replace(/\s+/g, " ").trim();
}

function toIso(v: string | number | undefined): string {
  if (typeof v === "number") return new Date(v * 1000).toISOString(); // HA liefert Sekunden
  if (typeof v === "string" && v) return v;
  return new Date().toISOString();
}

export async function GET() {
  try {
    // The notifications tile shows all of them, so there is no list to check
    // against — but without a login there has to be such a tile on a view.
    // Otherwise this told anyone who asked what Home Assistant has to report
    // ("login attempt failed", "new device found").
    if (
      !(await isSignedIn()) &&
      !(await viewsUseWidget("HANotificationWidget.tsx")) &&
      !(await modulesOnViewsCall("/api/ha/notifications"))
    ) {
      noteRefused("ha/notifications", "the notification list");
      return NextResponse.json({ error: "No view shows Home Assistant notifications." }, { status: 403 });
    }
    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      return NextResponse.json({ error: "Home Assistant not configured" }, { status: 400 });
    }

    if (cache && Date.now() - cache.at < CACHE_MS) {
      return NextResponse.json({ notifications: cache.data });
    }

    const list = await fetchViaWebSocket(settings.haUrl, settings.haToken);
    const notifications = list
      .filter((n) => n && n.notification_id)
      .map((n) => ({
        id: n.notification_id,
        // Form beibehalten: das Widget leitet daraus die notification_id zum
        // Wegklicken ab (dismiss).
        entityId: `persistent_notification.${n.notification_id}`,
        title: markdownToText(n.title ?? "") || "Benachrichtigung",
        message: markdownToText(n.message ?? ""),
        createdAt: toIso(n.created_at),
        status: "notifying",
      }));

    cache = { at: Date.now(), data: notifications };
    return NextResponse.json({ notifications });
  } catch (err: any) {
    console.error("[ha-notifications] error:", err);
    return NextResponse.json({ error: describeHaFetchError(err) }, { status: 500 });
  }
}

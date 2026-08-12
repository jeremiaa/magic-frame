import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";
import { getSession } from "@/lib/auth/session";
import {
  mayActOn,
  mayCallService,
  isPersistentNotification,
  payloadTargets,
} from "@/lib/ha/action-policy";

/** Same wording everywhere, and it names the way out. */
function refuse(reason: string) {
  return NextResponse.json(
    {
      error: `${reason} A display may only use what is on your views. If you need this, set MAGIC_FRAME_HA_ACTION_UNRESTRICTED=1 in your .env — see the Home Assistant page of the wiki.`,
    },
    { status: 403 },
  );
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
     const body = await req.json();
     if (!body.entityId) return new NextResponse("Missing entityId", { status: 400 });

     const entityId = body.entityId;
     let serviceName = body.service || 'toggle';
     let domain = body.domain || 'homeassistant'; // Most toggles can be done via homeassistant.toggle

     // This route has no session check on purpose — a wall tablet shows
     // /view/<id> without logging in and its buttons have to work. That used to
     // mean anyone who could reach the server could call any service on any
     // entity, front door lock included, whether or not it was on a screen.
     //
     // A display only ever needs the entities that are actually on the saved
     // views, so that is the limit. A signed-in editor session skips it: the
     // entity picker must be able to try things not yet placed anywhere.
     let signedIn = false;
     try {
        signedIn = !!(await getSession()).userId;
     } catch {
        // No usable SESSION_SECRET — treat as not signed in and let the
        // allowlist decide. A broken .env must not widen this route.
     }
     // The payload is built once, here, so the check and the request can never
     // disagree. `body.data` is caller-controlled and is merged in, so it is
     // part of what gets validated — not an afterthought applied later.
     const payload: Record<string, unknown> = { entity_id: entityId, ...(body.data || {}) };

     if (!signedIn) {
        if (!(await mayCallService(domain, serviceName))) {
           console.warn(`[ha/action] refused ${domain}.${serviceName} — service not used by any view`);
           return refuse(`${domain}.${serviceName} is not a service any of your widgets calls.`);
        }

        const { entityIds, hasOpaqueTarget } = payloadTargets(payload);
        if (hasOpaqueTarget) {
           console.warn(`[ha/action] refused ${domain}.${serviceName} — device_id/area_id target`);
           return refuse("A display may not target a device or an area, only named entities.");
        }
        for (const id of entityIds) {
           // Persistent-notification ids are minted by Home Assistant at
           // runtime and appear in no saved config, so they can never be on the
           // allowlist. Dismissing one only clears a message the display is
           // already showing, which is why the service check above is the guard
           // that matters for them.
           if (isPersistentNotification(id)) continue;
           if (!(await mayActOn(id))) {
              console.warn(`[ha/action] refused ${domain}.${serviceName} on ${id} — not on any view`);
              return refuse(`${id} is not on any of your views.`);
           }
        }
     }

     const settings = await getAppSettings();
     if (!settings.haUrl || !settings.haToken) {
        return new NextResponse("Home Assistant not configured", { status: 400 });
     }

     const cleanHaUrl = settings.haUrl.replace(/\/+$/, '');

     // #45: HA kennt kein lock.toggle — homeassistant.toggle überspringt
     // Lock-Entities stillschweigend. Deshalb: aktuellen Zustand holen und
     // gezielt lock.lock / lock.unlock aufrufen. Schlägt die Zustandsabfrage
     // fehl, bleibt das bisherige Verhalten (generischer Toggle) bestehen.
     if (serviceName === 'toggle' && domain === 'homeassistant' && String(entityId).startsWith('lock.')) {
        try {
           const st = await fetch(`${cleanHaUrl}/api/states/${entityId}`, {
              headers: { 'Authorization': `Bearer ${settings.haToken}` },
              signal: AbortSignal.timeout(4000),
           });
           if (st.ok) {
              const s = await st.json();
              domain = 'lock';
              serviceName = s.state === 'locked' ? 'unlock' : 'lock';
           }
        } catch { /* Zustand nicht ermittelbar — generischer Toggle als Fallback */ }
     }

     // Tasten kennen kein toggle — homeassistant.toggle überspringt sie
     // stillschweigend. Direkt drücken (Tipp-Aktion der Status-Karten u. a.).
     if (serviceName === 'toggle' && domain === 'homeassistant') {
        const eid = String(entityId);
        if (eid.startsWith('input_button.')) { domain = 'input_button'; serviceName = 'press'; }
        else if (eid.startsWith('button.')) { domain = 'button'; serviceName = 'press'; }
     }

     const url = `${cleanHaUrl}/api/services/${domain}/${serviceName}`;
     
     console.log(`[HA Action] Sending POST to ${url} with entity_id: ${entityId}, payload:`, JSON.stringify(body.data));

     const res = await fetch(url, {
         method: 'POST',
         headers: {
             'Authorization': `Bearer ${settings.haToken}`,
             'Content-Type': 'application/json'
         },
         body: JSON.stringify(payload),
         // Timeout 5 seconds to prevent hanging the proxy
         signal: AbortSignal.timeout(5000)
     });

     if (!res.ok) {
         return new NextResponse(`HA returned error: ${res.status}`, { status: res.status });
     }

     const data = await res.json();
     return NextResponse.json({ success: true, response: data });

  } catch (error) {
     console.error("[HA Action Error]", error);
     return new NextResponse("Action failed", { status: 500 });
  }
}

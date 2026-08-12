"use client";

/**
 * Der eine Weg, wie ein Widget eine Home-Assistant-Aktion auslöst.
 *
 * Vorher rief jede Karte `fetch("/api/ha/action", …)` selbst auf und sah sich
 * die Antwort nicht an. Solange die Route alles durchgereicht hat, fiel das
 * nicht auf. Seit sie Anfragen ablehnen kann, ist genau das der schlechteste
 * Zustand: Es passiert nichts, und nirgends steht warum — die Erklärung liegt
 * im Container-Log, an das auf einem Wandtablet niemand herankommt.
 *
 * Deshalb hier zentral: Antwort prüfen, und bei einer Ablehnung den Text der
 * Route als Ereignis ausgeben. Die Ansicht zeigt ihn kurz an
 * (ActionRefusedToast), sonst bleibt alles wie es war.
 */

export type HaActionBody = {
  entityId: string;
  domain?: string;
  service?: string;
  data?: Record<string, unknown>;
};

export const ACTION_REFUSED_EVENT = "MF_ACTION_REFUSED";

export async function haAction(body: HaActionBody): Promise<Response | null> {
  try {
    const res = await fetch("/api/ha/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = "";
      try {
        const text = await res.clone().text();
        try {
          msg = JSON.parse(text)?.error || text;
        } catch {
          msg = text;
        }
      } catch {
        /* Antwort nicht lesbar — dann eben nur der Status. */
      }
      announceRefusal(msg || `Home Assistant answered ${res.status}.`);
    }
    return res;
  } catch (e) {
    console.error("[ha/action] request failed", e);
    announceRefusal("Could not reach Magic Frame.");
    return null;
  }
}

function announceRefusal(message: string) {
  console.warn("[ha/action]", message);
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACTION_REFUSED_EVENT, { detail: { message } }));
}

/**
 * Ein schreibender Aufruf, dessen Fehlschlag sichtbar wird.
 *
 * Die Familien-Karten (Einkaufsliste, Todos, Nachrichten, Timer) haken
 * optimistisch ab und sehen sich die Antwort nicht an. Auf einem Wandtablet
 * ohne Anmeldung antworten diese Routen mit 401 — der Haken erscheint, die
 * Liste bleibt unverändert, und beim nächsten Abgleich ist der Haken wieder
 * weg. Ohne Rückmeldung sieht das nach einem defekten Bildschirm aus.
 *
 * `onFail` bekommt die Karte zurück in den echten Zustand (in der Regel
 * `reload`), damit die Anzeige nicht dauerhaft lügt.
 */
export async function writeAndReport(
  input: RequestInfo,
  init?: RequestInit,
  onFail?: () => void,
): Promise<Response | null> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) {
      let msg = "";
      if (res.status === 401) {
        // Die Familien-Listen darf ein Display seit v1.4.0 selbst ändern, hier
        // landet also nur noch, was wirklich ein Konto braucht — einen Timer
        // anlegen oder eine Nachricht senden zum Beispiel. Der alte Text
        // ("dieses Display ist nicht angemeldet") las sich, als hätten wir
        // Displays eine Anmeldung abverlangt. Haben wir nie.
        msg = "That needs an account — this display can change what is on it, but not create this.";
      } else {
        try {
          const text = await res.clone().text();
          try {
            msg = JSON.parse(text)?.error || text;
          } catch {
            msg = text;
          }
        } catch {
          /* nicht lesbar */
        }
      }
      announceRefusal(msg || `The server answered ${res.status}.`);
      onFail?.();
    }
    return res;
  } catch (e) {
    console.error("[write] request failed", e);
    announceRefusal("Could not reach Magic Frame.");
    onFail?.();
    return null;
  }
}

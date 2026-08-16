/**
 * #41 — wann eine Kamera von selbst ins Vollbild springt.
 *
 * Die Ableitung steht hier und nicht im View, weil sie an zwei Stellen
 * gebraucht wird (Live-View und Inspector) und weil sie einen Altlast-Fall
 * kennt, den man leicht übersieht:
 *
 * **Zwei Namen für denselben Schalter.** `triggerFullscreen` ist mit v1.5.0
 * ausgeliefert und liegt in echten Datenbanken. `fullscreenOnTrigger` kommt
 * aus dem Beitrag von @chimmidev (PR #83). Wer eine der beiden Fassungen
 * benutzt hat, darf durch die Zusammenführung nichts verlieren — also gilt
 * hier: eingeschaltet ist eingeschaltet, egal welcher Schlüssel es sagt.
 * Geschrieben wird nur noch `triggerFullscreen`.
 *
 * Die Auslöser-Logik selbst stammt aus PR #83 und kann drei Dinge, die die
 * erste Fassung nicht konnte: eine eigene Auslöser-Entity, eine eigene
 * Haltezeit, und Puls-Auslöser (eine Klingel ist oft nur einen Moment „an").
 */

/** Zustände, die als „nichts los" gelten, wenn kein Zustand vorgegeben ist. */
const IDLE_STATES = ["off", "unavailable", "unknown", "none", ""];

/** Ist der Vollbild-Auslöser für dieses Widget überhaupt eingeschaltet? */
export function cameraFullscreenEnabled(config: any): boolean {
  return config?.triggerFullscreen === true || config?.fullscreenOnTrigger === true;
}

/**
 * Was beim Umlegen des Schalters geschrieben werden muss — als Liste, weil es
 * je nach Altlast ein oder zwei Schlüssel sind.
 *
 * Der Grund, warum das eine eigene Funktion ist: gelesen wird mit ODER. Würde
 * nur der kanonische Schlüssel geschrieben, bliebe ein vorhandener
 * `fullscreenOnTrigger: true` für immer stehen und gewänne gegen jedes
 * Ausschalten — der Schalter wäre eine Falle, aus der nur das Löschen des
 * Widgets herausführt. Beide Schalterstellen im Editor benutzen das hier.
 */
export function cameraFullscreenWrites(config: any, value: boolean): Array<[string, boolean]> {
  const writes: Array<[string, boolean]> = [["triggerFullscreen", value]];
  if (config?.fullscreenOnTrigger !== undefined) writes.push(["fullscreenOnTrigger", value]);
  return writes;
}

export type CameraFullscreenTrigger = {
  /** Layout-Id der Kachel. */
  i: string;
  /** Entity, die das Vollbild auslöst. */
  ent: string;
  /** Zustand, der zählt. Leer = „irgendetwas ausser aus/unbekannt". */
  st: string;
  /**
   * Sekunden im Vollbild.
   * `0` = solange die Entity passt; `> 0` = Puls, danach zurück zur Kachel.
   */
  hold: number;
};

/**
 * Liest aus einem Layout die Kameras heraus, die auf einen Auslöser hin ins
 * Vollbild sollen.
 *
 * Ohne eigene Auslöser-Entity folgt die Kamera ihrer Sichtbarkeitsregel
 * (`showWhenEntity`) — das ist der Klingel-Fall, ein einziger Schalter über
 * einer Einrichtung, die schon steht. Mit eigener Entity ist es der andere
 * Fall, den zwei Leute in #41 beschrieben haben: eine Kamera, die dauerhaft
 * auf dem Display liegt und nur ins Vollbild springen soll.
 *
 * Kameras ohne jede Auslöser-Entity fallen raus — es gäbe nichts zu hören.
 */
export function cameraFullscreenTriggers(layout: any[] | null): CameraFullscreenTrigger[] {
  return (layout || [])
    .filter((w: any) => w?.type === "CameraWidget.tsx" && cameraFullscreenEnabled(w.config))
    .map((w: any) => {
      const own = (w.config?.fullscreenTriggerEntity || "").trim();
      return {
        i: w.i,
        ent: own || (w.config?.showWhenEntity || "").trim(),
        // Der Zustand gehört zu der Entity, die tatsächlich gilt. Eine eigene
        // Entity mit dem Zustand der Sichtbarkeitsregel zu prüfen wäre falsch.
        st: String((own ? w.config?.fullscreenTriggerState : w.config?.showWhenState) ?? "").trim(),
        // Leer = die Haltezeit der Sichtbarkeitsregel erben. Eine gesetzte 0
        // bleibt 0 (`??` statt `||`), sonst könnte man „solange aktiv" nie
        // wählen, wenn autoHideSeconds gesetzt ist.
        hold: Math.max(
          0,
          Number(w.config?.fullscreenSeconds ?? w.config?.autoHideSeconds) || 0,
        ),
      };
    })
    .filter((c) => c.ent !== "");
}

/** Passt der gelebte Zustand einer Entity auf den konfigurierten Auslöser? */
export function cameraTriggerMatches(liveState: unknown, expected: string): boolean {
  const cur = String((liveState as any) ?? "").toLowerCase();
  if (expected) return cur === expected.toLowerCase();
  return cur !== "" && !IDLE_STATES.includes(cur);
}

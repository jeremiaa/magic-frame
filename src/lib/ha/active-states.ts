/**
 * Was in Home Assistant "aktiv" heisst — also aufmerksamkeitswürdig.
 *
 * Die Liste lag ursprünglich nur im HA-Entity-Widget. Sie steht jetzt hier,
 * weil die Benachrichtigungs-Kacheln (#47) dieselbe Bedeutung brauchen: ein
 * aufgeschlossenes Schloss ist der Zustand, der Farbe verdient, ein
 * abgeschlossenes nicht. Zwei Kopien der Liste würden genau an dieser Stelle
 * auseinanderlaufen — dann hiesse "aktiv" im einen Widget etwas anderes als im
 * anderen, und niemand fände heraus warum.
 */
export const ACTIVE_STATES = [
  "on",
  "playing",
  "home",
  "open",
  "active",
  "detected",
  "unlocked",
  "charging",
  "cleaning",
  "heat",
  "cool",
  "mowing",
];

/**
 * Der gedämpfte Ton für den ruhigen Zustand. Bewusst ein neutrales Grau und
 * nicht die halbtransparente Regelfarbe: "zugeschlossen" soll nicht wie eine
 * schwächere Warnung aussehen, sondern wie keine.
 */
export const INACTIVE_COLOR = "#94A3B8";

/**
 * Zählt `state` als aktiv?
 *
 * `expected` ist der Status, auf den eine Regel ausgelöst hat. Ist er gesetzt,
 * gewinnt er — wer eine Kachel bewusst auf "closed" auslösen lässt, meint mit
 * "aktiv" genau das, auch wenn ACTIVE_STATES es anders sieht. Ohne ihn gilt die
 * allgemeine Liste, und alles Leere/Unbekannte ist ruhig.
 */
export function isActiveState(state: unknown, expected?: string): boolean {
  const cur = String(state ?? "").trim().toLowerCase();
  if (!cur || ["unavailable", "unknown", "none"].includes(cur)) return false;
  const want = (expected || "").trim().toLowerCase();
  if (want) return cur === want;
  return ACTIVE_STATES.includes(cur);
}

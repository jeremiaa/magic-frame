import "server-only";

/**
 * Werkzeug-Fehler, die etwas beibringen.
 *
 * Ein Agent, der "invalid payload" liest, rät beim nächsten Versuch. Einer,
 * der liest, WELCHES Feld falsch war und WO das richtige Schema steht,
 * korrigiert sich selbst. Jeder Fehler trägt deshalb einen `hint`, der den
 * nächsten sinnvollen Aufruf benennt.
 */
export function teachError(
  error: string,
  hint: string,
  details?: unknown,
): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          details === undefined ? { error, hint } : { error, hint, details },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

/** Erfolgsantwort als hübsch formatiertes JSON — eine Form für alle Werkzeuge. */
export function jsonResult(data: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

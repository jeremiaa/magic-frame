/**
 * Der Unterpfad, unter dem die App läuft.
 *
 * LEER bei jeder Installation ausser dem Home-Assistant-Add-on. Alles hier
 * gibt dann "" zurück, und die aufrufenden Stellen verhalten sich exakt wie
 * vorher — `"" + "/api/x"` ist `/api/x`.
 *
 * Im Add-on ist er der Ingress-Pfad, den Home Assistant erst bei der
 * Installation vergibt (/api/hassio_ingress/<token>). Next kennt ihn über
 * MF_BASE_PATH; hier geht es um alles, was Next NICHT selbst umschreibt —
 * unsere eigenen fetch-Aufrufe.
 */

/** Serverseitig: aus der Umgebung. Clientseitig: aus dem Fenster. */
export function getBasePath(): string {
  if (typeof window !== "undefined") {
    return (window as any).__MF_BASE__ || "";
  }
  return (process.env.MF_BASE_PATH || "").replace(/\/$/, "");
}

/**
 * Stellt den Unterpfad vor eine absolute App-Adresse.
 *
 * Angefasst wird nur, was mit genau EINEM Schrägstrich beginnt und den Pfad
 * noch nicht trägt. Vollständige Adressen (http://…), protokoll-relative
 * (//…) und relative (./…) bleiben, wie sie sind — die zeigen absichtlich
 * woandershin.
 */
export function withBase(path: string): string {
  const base = getBasePath();
  if (!base) return path;
  if (typeof path !== "string" || path[0] !== "/" || path[1] === "/") return path;
  if (path === base || path.startsWith(base + "/") || path.startsWith(base + "?")) return path;
  return base + path;
}

/**
 * Die vollständige Adresse, die ein Wandtablet für eine Ansicht braucht.
 *
 * Zwei Fälle, und der zweite ist der Grund, warum es diese Funktion gibt:
 *
 *  - Normale Installation: die Adresse im Browser IST die richtige. Wer den
 *    Editor unter http://192.0.2.10 offen hat, gibt seinem Tablet
 *    http://192.0.2.10/view/kueche.
 *
 *  - Home-Assistant-Add-on: der Editor läuft im Rahmen von Home Assistant,
 *    also unter dessen Adresse und Port (8123). Ein Tablet kommt dort NICHT
 *    hin — Ingress verlangt eine angemeldete HA-Sitzung, und die hat ein
 *    Kiosk-Browser nicht. Die Ansicht liegt am eigenen Port des Add-ons.
 *    Denselben Rechner, anderer Port.
 *
 * Ohne Fenster (serverseitig gerendert) kommt "" zurück; die Aufrufstelle
 * zeigt dann nur den Pfad, bis der Browser übernimmt.
 */
export function viewUrl(viewId: string): string {
  if (typeof window === "undefined") return "";
  const path = `/view/${encodeURIComponent(viewId)}`;
  const directPort = (window as any).__MF_DIRECT_PORT__;
  if (getBasePath() && directPort) {
    return `${window.location.protocol}//${window.location.hostname}:${directPort}${path}`;
  }
  return `${window.location.origin}${path}`;
}

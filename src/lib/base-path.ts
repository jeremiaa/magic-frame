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

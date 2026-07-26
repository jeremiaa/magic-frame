import "server-only";
import fs from "fs";

/**
 * Läuft Magic Frame als Home-Assistant-Add-on?
 *
 * Im Add-on übernimmt der Supervisor den Reverse-Proxy und HTTPS — unser
 * mitgeliefertes Caddy ist dort nicht dabei. Ohne diese Erkennung würden
 * Nutzer im Add-on Domains und Zertifikate konfigurieren, die nichts tun.
 *
 * Erkennung, in dieser Reihenfolge:
 *   1. MAGIC_FRAME_ADDON gesetzt → gewinnt immer, in BEIDE Richtungen
 *      ("1"/"true" erzwingt an, "0"/"false" erzwingt aus). Escape-Hatch,
 *      falls die Automatik mal danebenliegt.
 *   2. /data/options.json vorhanden → Add-on. Das ist der verlässlichste
 *      Marker: /data ist bei jedem Add-on gemountet und der Supervisor legt
 *      options.json immer an. (SUPERVISOR_TOKEN taugt NICHT als alleiniges
 *      Signal — laut Doku wird es nur bei hassio_api/homeassistant_api
 *      gesetzt, und beides brauchen wir nicht.)
 *   3. SUPERVISOR_TOKEN als Zusatzsignal, falls (2) mal nicht greift.
 *
 * Für die bestehende docker-compose-Installation trifft nichts davon zu —
 * dort bleibt alles exakt wie bisher.
 */
export function isAddonMode(): boolean {
  const flag = (process.env.MAGIC_FRAME_ADDON ?? "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;

  try {
    if (fs.existsSync("/data/options.json")) return true;
  } catch {
    /* Dateisystem nicht lesbar — dann eben das Env-Signal unten */
  }
  return Boolean(process.env.SUPERVISOR_TOKEN);
}

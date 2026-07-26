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
let cached: boolean | null = null;

export function isAddonMode(): boolean {
  // Gemerkt: getAppSettings() ruft das bei jeder Anfrage auf, und ein
  // synchroner Dateisystem-Zugriff pro Request wäre unnötig. Der Modus kann
  // sich zur Laufzeit ohnehin nicht ändern.
  if (cached !== null) return cached;

  const flag = (process.env.MAGIC_FRAME_ADDON ?? "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return (cached = true);
  if (flag === "0" || flag === "false" || flag === "no") return (cached = false);

  try {
    if (fs.existsSync("/data/options.json")) return (cached = true);
  } catch {
    /* Dateisystem nicht lesbar — dann eben das Env-Signal unten */
  }
  return (cached = Boolean(process.env.SUPERVISOR_TOKEN));
}

/**
 * Home Assistant über den Supervisor-Proxy — im Add-on braucht niemand mehr
 * einen langlebigen Zugriffstoken anzulegen: der Supervisor legt
 * SUPERVISOR_TOKEN in die Umgebung und proxyt Core unter http://supervisor/core.
 * Setzt `homeassistant_api: true` in der Add-on-config.yaml voraus.
 *
 * Gibt null zurück, wenn wir nicht im Add-on laufen oder kein Token da ist.
 */
export const SUPERVISOR_CORE_URL = "http://supervisor/core";

export function supervisorHaCredentials(): { haUrl: string; haToken: string } | null {
  if (!isAddonMode()) return null;
  const token = process.env.SUPERVISOR_TOKEN;
  if (!token) return null;
  return { haUrl: SUPERVISOR_CORE_URL, haToken: token };
}

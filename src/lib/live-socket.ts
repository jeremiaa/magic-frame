import io from "socket.io-client";
import { getBasePath } from "@/lib/base-path";

/**
 * Die Verbindung zum Live-Sync.
 *
 * Es gab neun blanke `io()`-Aufrufe im Code. Die gingen gut, solange die App
 * an der Wurzel lief — Socket.IO rät seinen Pfad dann richtig. Im
 * Home-Assistant-Rahmen läuft sie unter einem Unterpfad, und ohne Angabe
 * suchte der Client /socket.io statt <unterpfad>/socket.io: kein Live-Update,
 * ohne Fehlermeldung, man merkt es erst, wenn Änderungen nicht ankommen.
 *
 * Ohne Unterpfad ist der Pfad wörtlich "/socket.io" — also genau der
 * Standardwert, den socket.io-client ohnehin genommen hätte.
 */
export function connectLiveSync() {
  const base = getBasePath();
  return io({ path: `${base}/socket.io` });
}

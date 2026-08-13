/**
 * Normalisiert eine vom User eingegebene WebDAV-Server-URL, bevor sie an die
 * `webdav`-Lib (`createClient`) geht.
 *
 * Hintergrund (#29): Die `webdav`-Lib parst die URL intern mit `url-parse`.
 * Fehlt das Protokoll (z. B. nur "192.168.1.1:8249"), landet host:port komplett
 * im Pfad — host/port bleiben leer — und die Lib baut daraus einen kaputten
 * Request à la "192.168.1.1://8249/", der mit ERR_INVALID_URL scheitert.
 *
 * Defensive Lösung: führendes/abschließendes Whitespace strippen und ein
 * "http://" ergänzen, wenn kein http(s)-Protokoll vorhanden ist. URLs, die
 * bereits korrekt mit Protokoll beginnen, bleiben 1:1 unverändert.
 */
export function normalizeWebdavUrl(raw: string | null | undefined): string {
  const url = (raw ?? "").trim();
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) {
    return "http://" + url;
  }
  return url;
}

/**
 * Bildformate, die ein Browser direkt anzeigen kann.
 *
 * Hintergrund (#80): Die Playlist-Route liess nur jpg/jpeg/webp durch, während
 * die Einzelbild-Route und der lokale Provider PNG längst konnten. Ein Ordner
 * mit PNGs — bei "Hintergründe" der Normalfall — ergab damit eine leere
 * Playlist und einen schwarzen Bildschirm. Die Liste steht deshalb nur noch
 * hier und wird von allen Stellen gelesen.
 */
export const WEBDAV_IMAGE_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp",
] as const;

/**
 * Endungen, die zwar Bilder sind, aber kein Browser rendert (Rohdaten,
 * HEIC von iPhones). Sie werden getrennt gezählt, damit wir statt "keine
 * Bilder gefunden" sagen können, *warum* nichts übrig blieb — sonst sucht
 * der Nutzer den Fehler bei der Verbindung.
 */
const UNSUPPORTED_IMAGE_EXTENSIONS = [
  ".heic", ".heif", ".tif", ".tiff", ".cr2", ".cr3", ".nef", ".arw", ".dng", ".raf", ".orf",
];

function extensionOf(filename: string): string {
  const name = filename.toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot);
}

export function isSupportedWebdavImage(filename: string): boolean {
  return (WEBDAV_IMAGE_EXTENSIONS as readonly string[]).includes(extensionOf(filename));
}

export function isUnsupportedWebdavImage(filename: string): boolean {
  return UNSUPPORTED_IMAGE_EXTENSIONS.includes(extensionOf(filename));
}

/** Content-Type für die Einzelbild-Auslieferung. */
export function webdavContentType(filename: string): string {
  switch (extensionOf(filename)) {
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".avif": return "image/avif";
    case ".bmp": return "image/bmp";
    default: return "image/jpeg";
  }
}

/**
 * Zählt in einem bereits geladenen Verzeichnis, was als Wallpaper taugt.
 * Kostet keinen zusätzlichen Aufruf zum Server — der Inhalt liegt beim
 * Blättern ohnehin vor.
 */
export function countWebdavImages(items: { type?: string; filename: string }[]): {
  usable: number;
  unsupported: number;
} {
  let usable = 0;
  let unsupported = 0;
  for (const item of items) {
    if (item.type !== "file") continue;
    if (isSupportedWebdavImage(item.filename)) usable++;
    else if (isUnsupportedWebdavImage(item.filename)) unsupported++;
  }
  return { usable, unsupported };
}

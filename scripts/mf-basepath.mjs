// Setzt den echten Ingress-Pfad in einen fertig gebauten .next-Ordner ein.
//
//   node scripts/mf-basepath.mjs /api/hassio_ingress/abc123
//
// Warum es das gibt: Home Assistant vergibt den Ingress-Pfad erst bei der
// INSTALLATION des Add-ons, Next.js backt basePath aber beim BAUEN in die
// Client-Bündel ein. Das Abbild wird darum mit einem Platzhalter gebaut, und
// dieses Skript ersetzt ihn beim Start des Containers — der einzige Zeitpunkt,
// zu dem beide Angaben vorliegen.
//
// Die Ersetzung ist byte-weise und längenverändernd. Das ist geprüft: die
// .rsc-Nutzlasten von Next enthalten keine byte-längen-präfigierten Zeilen,
// eine Änderung der Länge bringt also kein Format durcheinander.
//
// Zwei Eigenschaften, auf die es ankommt:
//   - IDEMPOTENT. Ein Marker hält fest, welcher Pfad zuletzt eingesetzt wurde.
//     Beim nächsten Start wird von diesem auf den neuen ersetzt, statt den
//     Platzhalter zu suchen, den es dann nicht mehr gibt.
//   - LAUT. Bleibt hinterher ein Platzhalter übrig oder wurde gar nichts
//     gefunden, endet das Skript mit einem Fehler. Ein halb ersetzter Build
//     liefert sonst Seiten aus, die auf halbem Weg ins Leere zeigen — und das
//     fällt erst dem Nutzer auf.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PLACEHOLDER = "/__MF_INGRESS_BASE_PATH_PLACEHOLDER__";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEXT_DIR = join(root, ".next");
const MARKER = join(NEXT_DIR, ".mf-basepath");

const target = (process.argv[2] || "").trim();

// Streng geprüft, nicht bloss übernommen: dieser Wert landet in jeder URL, die
// die App ausliefert. Home Assistant liefert die Form /api/hassio_ingress/<token>.
if (!/^\/[A-Za-z0-9._~/-]*[A-Za-z0-9._~-]$/.test(target)) {
  console.error(`[mf-basepath] no usable base path given: ${JSON.stringify(target)}`);
  process.exit(1);
}
if (target.endsWith("/")) {
  console.error("[mf-basepath] the base path must not end in a slash");
  process.exit(1);
}

if (!existsSync(NEXT_DIR)) {
  console.error("[mf-basepath] no .next build found — nothing to rewrite");
  process.exit(1);
}

const current = existsSync(MARKER) ? readFileSync(MARKER, "utf8").trim() : PLACEHOLDER;
if (current === target) {
  console.log(`[mf-basepath] already set to ${target}`);
  process.exit(0);
}

// `cache` bleibt aussen vor: dort liegt nur Wiederverwendbares aus dem Bau,
// nichts davon wird ausgeliefert, und es ist der grösste Teil des Ordners.
const SKIP_DIRS = new Set(["cache"]);
const needle = Buffer.from(current, "utf8");
const replacement = Buffer.from(target, "utf8");

let files = 0;
let hits = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(p);
      continue;
    }
    if (!st.isFile() || st.size === 0) continue;
    let buf;
    try { buf = readFileSync(p); } catch { continue; }
    if (!buf.includes(needle)) continue;
    let count = 0;
    for (let idx = buf.indexOf(needle); idx !== -1; idx = buf.indexOf(needle, idx + needle.length)) count++;
    // "binary" (latin1) bildet jedes Byte auf genau ein Zeichen ab und zurück —
    // damit überlebt auch eine Datei mit Bilddaten oder ungültigem UTF-8 den
    // Umweg über einen String unverändert.
    const out = Buffer.from(buf.toString("binary").split(current).join(target), "binary");
    try {
      writeFileSync(p, out);
      files++;
      hits += count;
    } catch (e) {
      console.error(`[mf-basepath] could not write ${p}: ${e.message}`);
      process.exit(1);
    }
  }
}

walk(NEXT_DIR);

if (hits === 0) {
  console.error(
    `[mf-basepath] nothing to replace — looked for ${JSON.stringify(current)}.\n` +
      "  The image was probably not built with MF_BASE_PATH set to the placeholder.",
  );
  process.exit(1);
}

// Gegenprobe: nach dem Ersetzen darf nirgends mehr ein Platzhalter stehen.
let leftovers = 0;
(function check(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (!SKIP_DIRS.has(entry)) check(p); continue; }
    if (!st.isFile() || st.size === 0) continue;
    try { if (readFileSync(p).includes(PLACEHOLDER)) leftovers++; } catch { /* egal */ }
  }
})(NEXT_DIR);

if (leftovers > 0) {
  console.error(`[mf-basepath] ${leftovers} file(s) still contain the placeholder — refusing to continue`);
  process.exit(1);
}

writeFileSync(MARKER, target + "\n");
console.log(`[mf-basepath] base path set to ${target} (${hits} occurrences in ${files} files)`);

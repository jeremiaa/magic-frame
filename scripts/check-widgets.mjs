// Prüft, ob ein Widget ÜBERALL eingetragen ist — und ob die Doku noch die
// richtige Anzahl behauptet.
//
//   node scripts/check-widgets.mjs
//
// Warum es das gibt: ein Kern-Widget ist nicht eine Datei, sondern ein Dutzend
// Einträge in einem Dutzend Listen. Vergisst man einen, gibt es keinen Fehler —
// das Widget ist dann nur still nicht hinzufügbar, hat keine Farbe, keinen
// Inspector oder lässt sich anlegen und nie speichern. Beim Text-Widget fehlte
// es hinterher an neun Stellen, davon vier in der Doku; zwei Lücken (das
// Umwelt-Widget auf der Modul-Seite, vier Typen in der Editor-Startkarte)
// waren sogar Monate alt und niemandem aufgefallen.
//
// Die Liste der Widgets wird NICHT gepflegt, sondern aus dem Verzeichnis
// gelesen. Eine gepflegte Liste hätte genau dasselbe Problem wie die zwölf,
// die sie prüfen soll.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const notes = [];

const widgets = readdirSync(join(repo, 'src/components/widgets'))
  .filter((f) => f.endsWith('Widget.tsx') && f !== 'renderWidget.tsx')
  .sort();

const cache = new Map();
const read = (p) => {
  if (!cache.has(p)) cache.set(p, existsSync(join(repo, p)) ? readFileSync(join(repo, p), 'utf8') : null);
  return cache.get(p);
};

// Jede Liste, in der ein Kern-Widget stehen MUSS. `pattern` bekommt den
// Dateinamen des Widgets eingesetzt; steht er nicht drin, fehlt der Eintrag.
// Der Text hinter `folge` sagt, was ohne den Eintrag kaputt ist — ohne das
// wäre die Fehlermeldung eine Fundstelle statt einer Diagnose.
const REGISTRIES = [
  ['src/lib/widgets/schemas.ts', (w) => `z.literal("${w}")`,
    'Layout-Schema: das Widget lässt sich anlegen, aber der Speichern-Aufruf lehnt die ganze Ansicht ab'],
  ['src/lib/widgets/schemas.ts', (w) => `"${w}": `,
    'WIDGET_CONFIG_SCHEMAS: Agenten über MCP bekommen kein Schema für den Typ'],
  ['src/components/widgets/renderWidget.tsx', (w) => `type === "${w}"`,
    'Render-Map: das Widget zeichnet auf dem Display und in der Editor-Vorschau nichts'],
  ['src/app/editor/_types.ts', (w) => `"${w}":`,
    'WIDGET_DEFAULT_LABEL: die Ebenenliste zeigt den Dateinamen statt eines Namens'],
  ['src/app/editor/_components/widget-visuals.tsx', (w) => `"${w}":`,
    'WIDGET_ACCENT: Kachelkopf und Ebenenliste bleiben farblos'],
  ['src/app/editor/_components/widget-visuals.tsx', (w) => `case "${w}":`,
    'Icon-Switch: das Widget bekommt kein Symbol'],
  ['src/app/editor/_components/AddWidgetModal.tsx', (w) => `addWidget("${w}")`,
    'Handy-Wähler: am Telefon nicht hinzufügbar'],
  ['src/app/editor/(app)/views/[id]/page.tsx', (w) => `type: "${w}"`,
    'Editor-Palette: am Rechner nicht hinzufügbar'],
  ['src/app/editor/(app)/views/page.tsx', (w) => `"${w}":`,
    'Ansichtsliste: die Vorschaukachel bleibt grau'],
  ['src/app/editor/(app)/page.tsx', (w) => `"${w}":`,
    'Editor-Startseite: die Mini-Layout-Karte zeigt ein graues Rechteck ohne Symbol'],
  ['src/lib/mcp/catalog.ts', (w) => `"${w}":`,
    'MCP-Katalog: ein Agent erfährt nicht, wofür der Typ da ist'],
  ['wiki/widgets.md', (w) => `\`${w}\``,
    'Wiki-Katalog: das Widget steht in keiner Tabelle (check-wiki.mjs meckert separat)'],
];

for (const [file, pattern, folge] of REGISTRIES) {
  const text = read(file);
  if (text === null) { errors.push(`${file} gibt es nicht mehr — check-widgets.mjs zeigt ins Leere`); continue; }
  for (const w of widgets) {
    if (!text.includes(pattern(w))) errors.push(`${file}: ${w} fehlt — ${folge}`);
  }
}

// Zahlwörter in der Doku. Sie veralten lautlos, weil niemand nachzählt: beim
// Text-Widget standen in acht Dateien noch "18". Geprüft wird nur, wo eine Zahl
// unmittelbar an einem Widget-Wort klebt — sonst würden die 24 Rasterspalten
// und die 28 Wiki-Seiten mitschlagen.
const N = widgets.length;
const ZAHL_MUSTER = [
  /(\d{1,3})\s+(?:kinds|widgets|types)\b/gi,
  /(?:all|these|other|of the)\s+(\d{1,3})\b(?=[^.\n]{0,40}widget)/gi,
  /(\d{1,3})\s+ship with every install/gi,
  /(\d{1,3})\s+sind bei jeder Installation/gi,
  /(\d{1,3})\s+Kern-Typen/gi,
  /(\d{1,3})\s+(?:built-in|Typen)\b/gi,
];
const DOKU = [
  'README.md', 'README.de.md', 'llms.txt', 'wiki/screenshots.json',
  ...readdirSync(join(repo, 'wiki')).filter((f) => f.endsWith('.md')).map((f) => `wiki/${f}`),
];

// Zahlen, die zu Recht nicht die Widget-Anzahl sind. Jede Ausnahme braucht
// einen Grund, sonst ist die Liste in einem Jahr ein Friedhof.
const AUSNAHMEN = [
  { datei: 'wiki/widgets.md', zahl: 16, grund: 'die 16 Widgets ohne eigene Ausrichtung — 19 minus Uhr, Media Player und Text' },
];

for (const file of DOKU) {
  const text = read(file);
  if (text === null) continue;
  const zeilen = text.split('\n');
  zeilen.forEach((zeile, i) => {
    for (const muster of ZAHL_MUSTER) {
      muster.lastIndex = 0;
      let m;
      while ((m = muster.exec(zeile))) {
        const zahl = Number(m[1]);
        if (zahl === N) continue;
        if (zahl < 5 || zahl > 60) continue; // offensichtlich etwas anderes
        if (AUSNAHMEN.some((a) => a.datei === file && a.zahl === zahl)) continue;
        errors.push(
          `${file}:${i + 1}: sagt ${zahl}, es sind aber ${N} Widgets — "${m[0].trim()}"`,
        );
      }
    }
  });
}

notes.push(`${widgets.length} Kern-Widgets, ${REGISTRIES.length} Register geprüft`);
notes.push(`${DOKU.length} Doku-Dateien auf veraltete Zahlwörter geprüft`);

for (const n of notes) console.log(`  ${n}`);
if (errors.length) {
  console.error(`\n${errors.length} Problem${errors.length === 1 ? '' : 'e'}:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nJedes Widget steht überall, und die Doku zählt richtig.');

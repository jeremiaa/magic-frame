// Checks that the wiki still describes the program that exists.
//
//   node scripts/check-wiki.mjs
//
// Documentation rots quietly: a route is renamed, a widget gains an option, a
// screenshot shows a button that moved — and the page keeps saying the old
// thing with total confidence. Nobody re-reads a page they wrote. So the parts
// that CAN be checked mechanically are checked here, and CI fails on them.
//
// What this can and cannot do: it verifies that everything the wiki NAMES
// exists, and that everything that exists is named. It cannot tell whether a
// sentence is true. That part is still on whoever writes the page.
//
// Deliberately NOT part of `npm run build`. A person installing Magic Frame
// from source must never have their install fail because our documentation
// went stale — that is our problem, not theirs. It runs in CI only.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const wikiDir = join(repo, 'wiki');

const errors = [];
const notes = [];

const read = (p) => readFileSync(join(repo, p), 'utf8');
const hash12 = (p) => createHash('sha256').update(readFileSync(join(repo, p))).digest('hex').slice(0, 12);

// ---- the pages -------------------------------------------------------------

if (!existsSync(wikiDir)) {
  console.error('wiki/ does not exist');
  process.exit(1);
}

const pageNames = readdirSync(wikiDir)
  .filter((f) => f.endsWith('.md') && f !== 'README.md')
  .sort();
const pages = new Map(pageNames.map((f) => [f, read(`wiki/${f}`)]));
const index = read('wiki/README.md');

if (pages.size === 0) errors.push('wiki/ has no pages besides README.md');

// ---- 1: every page is in the index and in llms.txt --------------------------
//
// A page nothing links to is a page nobody finds — and for an agent reading
// llms.txt as the map, an unlisted page does not exist at all.

const llmsPath = join(repo, 'llms.txt');
const llms = existsSync(llmsPath) ? read('llms.txt') : null;
if (!llms) notes.push('llms.txt is missing — not checked (write it once the pages exist)');

for (const name of pageNames) {
  if (!index.includes(`(${name})`)) errors.push(`wiki/README.md does not link ${name}`);
  if (llms && !llms.includes(name)) errors.push(`llms.txt does not list ${name}`);
}

// ---- 2: internal links resolve ---------------------------------------------

for (const [file, text] of [...pages, ['README.md', index]]) {
  for (const m of text.matchAll(/\]\((?!https?:|mailto:|#)([^)#\s]+)(?:#[^)\s]*)?\)/g)) {
    const target = m[1];
    if (target.startsWith('img/')) continue; // handled by the screenshot section
    const resolved = target.startsWith('../') ? join(repo, target.slice(3)) : join(wikiDir, target);
    if (!existsSync(resolved)) errors.push(`wiki/${file}: link to ${target} goes nowhere`);
  }
}

// ---- 3: every widget is documented -----------------------------------------
//
// The type id of a widget is literally its filename — it is what appears in an
// exported layout and what a module author registers against. So the wiki must
// name the file, which is both the check and something a reader actually needs.

const widgetDir = join(repo, 'src/components/widgets');
const widgets = readdirSync(widgetDir)
  .filter((f) => f.endsWith('Widget.tsx') && f !== 'renderWidget.tsx')
  .sort();

const allPageText = [...pages.values()].join('\n');
const undocumented = widgets.filter((w) => !allPageText.includes(w));
for (const w of undocumented) errors.push(`no page mentions ${w} — every widget needs a section`);
notes.push(
  undocumented.length
    ? `${widgets.length} widgets, ${undocumented.length} still undocumented`
    : `${widgets.length} widgets, all documented`,
);

// ---- 4: every /api/ path named is a real route ------------------------------

const routes = new Set();
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry === 'route.ts') {
      routes.add('/' + relative(join(repo, 'src/app'), dirname(full)).replace(/\\/g, '/'));
    }
  }
})(join(repo, 'src/app/api'));

// A route with a [param] segment is matched by shape, not by literal text.
const routeMatches = (mentioned) => {
  for (const r of routes) {
    const pattern = '^' + r.replace(/\[[^\]]+\]/g, '[^/]+') + '$';
    if (new RegExp(pattern).test(mentioned)) return true;
  }
  return false;
};

for (const [file, text] of pages) {
  for (const m of text.matchAll(/`(\/api\/[a-zA-Z0-9/_[\]-]+)`/g)) {
    const path = m[1].replace(/\/$/, '');
    if (!routeMatches(path)) errors.push(`wiki/${file}: names ${path}, which is not a route`);
  }
}
notes.push(`${routes.size} API routes available to reference`);

// ---- 5: no real addresses ---------------------------------------------------
//
// These slip in while testing against the real thing, and then they are public
// forever. Documentation examples use the reserved ranges instead.

const forbidden = [
  [/\b172\.16\.\d+\.\d+\b/, 'a private address from the maintainer network'],
  [/\b192\.168\.\d+\.\d+\b/, 'a real-looking LAN address — use 192.0.2.x (reserved for docs)'],
  [/\bjeremiaarslan@gmail\.com\b/i, 'the private mail address'],
  [/\bmagic-?dashboard-live\b/, 'the maintainer deployment path'],
];
for (const [file, text] of [...pages, ['README.md', index]]) {
  for (const [re, why] of forbidden) {
    const hit = text.match(re);
    if (hit) errors.push(`wiki/${file}: contains ${hit[0]} — ${why}`);
  }
}

// ---- 6: screenshots, and knowing when one has started lying -----------------
//
// A picture is a claim, and it is the claim nobody re-reads. It cannot be
// checked for truth — but it CAN be tied to the code it shows, and then the one
// question that matters is answerable: has that code changed since the picture
// was taken?

const manifestPath = join(repo, 'wiki/screenshots.json');
let manifest = null;
if (!existsSync(manifestPath)) {
  notes.push('wiki/screenshots.json is missing — no screenshots checked');
} else {
  try {
    manifest = JSON.parse(read('wiki/screenshots.json'));
  } catch (e) {
    errors.push(`wiki/screenshots.json is not valid JSON: ${e.message}`);
  }
}

if (manifest) {
  const byId = new Map(manifest.shots.map((s) => [s.id, s]));
  const referenced = new Set();

  for (const [file, text] of pages) {
    for (const m of text.matchAll(/!\[[^\]]*\]\(img\/([a-z0-9-]+)\.png\)/g)) {
      const id = m[1];
      referenced.add(id);
      const shot = byId.get(id);
      if (!shot) errors.push(`wiki/${file}: shows img/${id}.png, which screenshots.json does not describe`);
      else if (shot.page !== file) errors.push(`wiki/${file}: shows ${id}, filed under ${shot.page} in screenshots.json`);
    }
  }

  for (const s of manifest.shots) {
    if (!pages.has(s.page)) errors.push(`screenshots.json: ${s.id} names ${s.page}, which is not a wiki page`);
    if (!referenced.has(s.id)) errors.push(`screenshots.json: ${s.id} is described but no page shows it`);

    for (const suffix of ['', '-dark']) {
      if (!existsSync(join(repo, `wiki/img/${s.id}${suffix}.png`)))
        errors.push(`screenshots.json: ${s.id} has no ${suffix ? 'dark' : 'light'} image — run: node scripts/shoot-wiki.mjs ${s.id}`);
    }

    if (!s.caption || s.caption.length < 15)
      errors.push(`screenshots.json: ${s.id} needs a caption saying what to notice`);

    for (const src of s.shows ?? []) {
      if (!existsSync(join(repo, src))) {
        errors.push(`screenshots.json: ${s.id} shows ${src}, which does not exist`);
        continue;
      }
      const now = hash12(src);
      const then = s.takenAt?.[src];
      if (!then) errors.push(`screenshots.json: ${s.id} has no takenAt for ${src}`);
      else if (then !== now)
        errors.push(`screenshots.json: ${s.id} has started lying — ${src} changed since it was taken. Retake: node scripts/shoot-wiki.mjs ${s.id}`);
    }
    if (!(s.shows ?? []).length) errors.push(`screenshots.json: ${s.id} lists no source files — it can never be known to be stale`);
  }
  notes.push(`${manifest.shots.length} screenshots, tied to the code they show`);
}

// ---- 7: llms-full.txt is current -------------------------------------------
//
// A generated file that silently drifts is worse than no file at all: an agent
// reads it as truth and cannot tell it is old.

const fullPath = join(repo, 'llms-full.txt');
if (existsSync(fullPath)) {
  const { buildLlmsFull } = await import('./build-llms.mjs');
  if (read('llms-full.txt') !== buildLlmsFull())
    errors.push('llms-full.txt is out of date — run: node scripts/build-llms.mjs');
} else {
  notes.push('llms-full.txt is missing — not checked (generate it with scripts/build-llms.mjs)');
}

// ---- 8: the two READMEs are one document in two languages ------------------
//
// README.de.md is not kept in step by good intentions — last time it drifted a
// whole release behind, still advertising Next.js 15 and an installer that
// builds from source. Prose cannot be compared across languages, but structure
// can: every `## ` heading carries an HTML anchor comment, and the two files
// must carry the same anchors in the same order. A section added to one and
// forgotten in the other is then a red build rather than a slow surprise.
//
// The same loop checks the things the wiki pages are already checked for and
// the root READMEs never were: links that go nowhere, and real addresses.

const readmes = [
  ['README.md', read('README.md')],
  ['README.de.md', read('README.de.md')],
];

const anchorsOf = (text) => [...text.matchAll(/<!--\s*s:([a-z0-9-]+)\s*-->/g)].map((m) => m[1]);

// Markdown links, plus the src/href of the raw HTML both files use for the
// banner, the screenshots and the video.
const linksOf = (text) => [
  ...[...text.matchAll(/\]\(([^)\s]+?)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]),
  ...[...text.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]),
];

const wikiLinks = new Map();

for (const [file, text] of readmes) {
  const headings = (text.match(/^## /gm) ?? []).length;
  const anchors = anchorsOf(text);
  if (headings !== anchors.length)
    errors.push(`${file}: ${headings} '## ' headings but ${anchors.length} <!-- s:… --> anchors — every section needs one`);

  const linked = new Set();
  for (const raw of linksOf(text)) {
    const target = raw.split('#')[0];
    if (!target || /^(https?:|mailto:|data:|#)/.test(raw)) continue;
    if (target.startsWith('docs/'))
      errors.push(`${file}: links ${target} — docs/ is gone, the wiki replaced it`);
    if (!existsSync(join(repo, target))) errors.push(`${file}: link to ${target} goes nowhere`);
    if (target.startsWith('wiki/') && target.endsWith('.md')) linked.add(target);
  }
  wikiLinks.set(file, linked);

  for (const [re, why] of forbidden) {
    const hit = text.match(re);
    if (hit) errors.push(`${file}: contains ${hit[0]} — ${why}`);
  }
}

const [enAnchors, deAnchors] = readmes.map(([, text]) => anchorsOf(text));
if (enAnchors.join(',') !== deAnchors.join(',')) {
  errors.push(
    'README.md and README.de.md do not have the same sections in the same order — ' +
      `en: [${enAnchors.join(' ')}], de: [${deAnchors.join(' ')}]`,
  );
}

// Neither README may be the only one that points a reader at a manual page.
const enWiki = wikiLinks.get('README.md');
const deWiki = wikiLinks.get('README.de.md');
const onlyEn = [...enWiki].filter((t) => !deWiki.has(t));
const onlyDe = [...deWiki].filter((t) => !enWiki.has(t));
if (onlyEn.length) errors.push(`README.md links ${onlyEn.join(', ')} — README.de.md does not`);
if (onlyDe.length) errors.push(`README.de.md links ${onlyDe.join(', ')} — README.md does not`);

notes.push(`the two READMEs share ${enAnchors.length} sections and ${enWiki.size} wiki links`);

// ---- report ----------------------------------------------------------------

// The same broken link listed in two places is one thing to fix, not two.
const unique = [...new Set(errors)];

for (const n of notes) console.log(`  ${n}`);
if (unique.length) {
  console.error(`\n${unique.length} problem${unique.length === 1 ? '' : 's'}:\n`);
  for (const e of unique) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}
console.log('\nwiki checks out\n');

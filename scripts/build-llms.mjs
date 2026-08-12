// Generates llms-full.txt — the whole wiki as one file.
//
//   node scripts/build-llms.mjs
//
// Why a second, redundant file: an agent answering somebody's Magic Frame
// question should not have to guess which of 28 pages holds the answer, nor
// make 28 requests to be sure. One fetch, everything, in reading order.
//
// It is generated and never hand-edited. check-wiki.mjs fails when it drifts
// from wiki/, the same way a stale lockfile fails — a generated file that
// quietly goes out of date is worse than no file, because it is read as truth.
//
// The order follows wiki/README.md, so the file reads the way the wiki reads
// rather than in whatever order the filesystem hands back.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const wikiDir = join(repo, 'wiki');

const read = (p) => readFileSync(join(repo, p), 'utf8');

/** Page order as the index lists them; anything unlisted is appended, sorted. */
function pageOrder() {
  const index = read('wiki/README.md');
  const listed = [];
  for (const m of index.matchAll(/\]\(([a-z0-9-]+\.md)\)/g)) {
    if (!listed.includes(m[1])) listed.push(m[1]);
  }
  const all = readdirSync(wikiDir).filter((f) => f.endsWith('.md') && f !== 'README.md');
  const rest = all.filter((f) => !listed.includes(f)).sort();
  return [...listed.filter((f) => all.includes(f)), ...rest];
}

export function buildLlmsFull() {
  const order = pageOrder();
  const parts = [
    '# Magic Frame — complete documentation',
    '',
    'Magic Frame is a self-hosted dashboard for tablets, monitors, wall panels',
    'and digital picture frames. This file is every page of the wiki, in reading',
    'order, generated from https://github.com/jeremiaa/magic-frame/tree/main/wiki',
    '',
    'Each page below stands on its own: it names the components, routes and',
    'settings it talks about in full, so a single section is a usable answer.',
    '',
    '---',
    '',
  ];

  for (const name of order) {
    const text = read(`wiki/${name}`).trimEnd();
    parts.push(`# wiki/${name}`, '', text, '', '---', '');
  }

  return parts.join('\n').replace(/\n{4,}/g, '\n\n\n') + '\n';
}

// Only write when run directly, so check-wiki.mjs can import and compare.
if (process.argv[1] && process.argv[1].endsWith('build-llms.mjs')) {
  if (!existsSync(wikiDir)) {
    console.error('wiki/ does not exist');
    process.exit(1);
  }
  const out = buildLlmsFull();
  writeFileSync(join(repo, 'llms-full.txt'), out);
  const pages = pageOrder().length;
  console.log(`llms-full.txt written — ${pages} pages, ${(out.length / 1024).toFixed(0)} kB`);
}

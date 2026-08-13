// Takes every screenshot the wiki uses, from wiki/screenshots.json.
//
//   node scripts/shoot-wiki.mjs                  # all of them
//   node scripts/shoot-wiki.mjs wallpapers       # one, or a prefix
//
// A picture in documentation is a claim like any sentence, and it is the one
// nobody re-reads. It also cannot be checked for truth — so the next best thing
// is to make retaking it MECHANICAL, and to know exactly which pictures a change
// has made stale. That is what the manifest is for: every shot records the
// source files it shows, and check-wiki.mjs fails when any of them has changed
// since the shot was taken. The fix is to run this script again.
//
// Deliberately NOT a dependency of anything:
//
//   - `playwright` is not in package.json, so `npm ci` in the Docker image does
//     not fetch it and no build can break on it.
//   - check-wiki.mjs only compares hashes. It never launches a browser.
//
// Before the first run:
//
//   npm i --no-save playwright && npx playwright install chromium
//
// It needs a running Magic Frame to photograph — NEVER a real household. Point
// it at a throwaway seeded with invented content (scripts/seed-demo.mjs) whose
// Home Assistant is the stub (scripts/demo-ha-stub.mjs). A screenshot is
// published forever; somebody's entity names, rooms and calendar are not ours
// to publish, and a real instance also gives different values every time, so
// every retaken picture would silently disagree with its own caption.
//
//   docker compose -f docker-compose.yml -f scripts/demo-compose.yml \
//     -p mf-shoot up -d
//   node scripts/demo-ha-stub.mjs 8123 &
//   node scripts/demo-sources.mjs &
//   docker compose -p mf-shoot exec app node /app/seed-demo.mjs
//
//   MF_SHOOT_URL=http://127.0.0.1:3000 \
//   MF_SHOOT_EMAIL=… MF_SHOOT_PASSWORD=… \
//   node scripts/shoot-wiki.mjs
//
// scripts/demo-compose.yml is not optional. The seeded views point at
// photos.example.com and news.example.com by name, and without that overlay
// those names do not resolve inside the container — every calendar card in the
// wiki then reads "Calendar could not be loaded". That has happened.
//
// Credentials come from the environment and never from the manifest: the
// manifest is committed, and a password in a repository is a password that has
// leaked.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const manifestPath = join(repo, 'wiki/screenshots.json');
const imgDir = join(repo, 'wiki/img');

const BASE = process.env.MF_SHOOT_URL ?? 'http://127.0.0.1:3000';
const EMAIL = process.env.MF_SHOOT_EMAIL ?? '';
const PASSWORD = process.env.MF_SHOOT_PASSWORD ?? '';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    '\n  playwright is not installed — it is deliberately not a dependency.\n' +
      '  npm i --no-save playwright && npx playwright install chromium\n',
  );
  process.exit(1);
}

if (!existsSync(manifestPath)) {
  console.error('wiki/screenshots.json does not exist');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const only = process.argv.slice(2);
const wanted = manifest.shots.filter((s) => !only.length || only.some((o) => s.id.startsWith(o)));
if (!wanted.length) {
  console.error(only.length ? `no shot matches ${only.join(', ')}` : 'the manifest has no shots yet');
  process.exit(1);
}

mkdirSync(imgDir, { recursive: true });
const hash12 = (p) => createHash('sha256').update(readFileSync(join(repo, p))).digest('hex').slice(0, 12);

/**
 * The step vocabulary, kept deliberately small. Anything a shot cannot express
 * with these belongs in the seed instead — a screenshot script that grows a
 * scripting language becomes a second, untested application.
 */
async function runStep(page, step) {
  if (step.goto !== undefined) return page.goto(BASE + step.goto, { waitUntil: 'domcontentloaded' });
  if (step.waitFor !== undefined) return page.waitForSelector(step.waitFor, { timeout: 20_000 });
  if (step.wait !== undefined) return page.waitForTimeout(step.wait);
  if (step.click !== undefined) return page.click(step.click);
  if (step.fill !== undefined) return page.fill(step.fill.selector, step.fill.value);
  if (step.select !== undefined) return page.selectOption(step.select.selector, step.select.value);
  if (step.press !== undefined) return page.keyboard.press(step.press);
  if (step.hover !== undefined) return page.hover(step.hover);
  if (step.clickText !== undefined) return page.getByRole('button', { name: step.clickText, exact: true }).first().click();
  if (step.scrollTo !== undefined) return page.locator(step.scrollTo).first().scrollIntoViewIfNeeded();
  if (step.hide !== undefined) {
    // Hide something that would otherwise date the picture or leak a value.
    return page.addStyleTag({ content: `${step.hide} { visibility: hidden !important; }` });
  }
  throw new Error(`unknown step: ${JSON.stringify(step)}`);
}

async function signIn(context) {
  if (!EMAIL || !PASSWORD) return false;
  const page = await context.newPage();
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  try {
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.press('input[type="password"]', 'Enter');
    await page.waitForURL(/\/editor/, { timeout: 20_000 });
  } catch {
    console.error('  could not sign in — editor shots will fail');
    await page.close();
    return false;
  }
  await page.close();
  return true;
}

const browser = await chromium.launch();
const viewport = manifest.viewport ?? { width: 1280, height: 800 };
let taken = 0;
const failed = [];

for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({
    viewport,
    colorScheme: scheme,
    deviceScaleFactor: 2, // readable on a high-resolution display, and when cropped
    locale: 'en-GB',
    timezoneId: 'Europe/Berlin',
    // A fixed clock, so a picture of a dashboard is not also a picture of the
    // moment it was taken. Retaking a shot must change only what changed.
    reducedMotion: 'reduce',
  });

  const signedIn = await signIn(context);

  for (const shot of wanted) {
    if (shot.needsLogin !== false && !signedIn && (shot.steps ?? []).some((s) => String(s.goto ?? '').startsWith('/editor'))) {
      failed.push(`${shot.id}: needs a signed-in session, set MF_SHOOT_EMAIL and MF_SHOOT_PASSWORD`);
      continue;
    }
    const page = await context.newPage();
    try {
      for (const step of shot.steps ?? []) await runStep(page, step);
      const target = shot.element ? page.locator(shot.element).first() : page;
      const file = join(imgDir, `${shot.id}${scheme === 'dark' ? '-dark' : ''}.png`);
      await target.screenshot({ path: file });
      if (scheme === 'light') taken++;
      process.stdout.write(`  ${scheme === 'light' ? '' : '      '}${shot.id}${scheme === 'dark' ? ' (dark)' : ''}\n`);
    } catch (e) {
      failed.push(`${shot.id} (${scheme}): ${e.message.split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }

  await context.close();
}

await browser.close();

// Record what the code looked like when the picture was taken. This is the
// whole point: it is what lets the check say "this one has started lying".
for (const shot of wanted) {
  if (failed.some((f) => f.startsWith(shot.id))) continue;
  shot.takenAt = {};
  for (const src of shot.shows ?? []) {
    if (existsSync(join(repo, src))) shot.takenAt[src] = hash12(src);
    else console.error(`  ${shot.id}: shows ${src}, which does not exist`);
  }
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`\n${taken} shot${taken === 1 ? '' : 's'} taken, light and dark`);
if (failed.length) {
  console.error(`\n${failed.length} failed:\n`);
  for (const f of failed) console.error(`  - ${f}`);
  process.exit(1);
}

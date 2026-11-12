// The wallpaper proxies hand out pictures, never keys or other files.
// Runs inside the app container of a THROWAWAY instance — it rewrites the
// global Immich connection and adds three test views:
//
//   MF_TEST_EMAIL=… MF_TEST_PASSWORD=… node /opt/mf-test/security/wallpaper-proxies.mjs
//
// Two stand-in servers run in this process: an Immich and a NAS that answer
// like the real ones, and a stranger that notes every key it is sent.
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

// pg comes from the app itself; this file is mounted outside of /app.
const pg = createRequire('/app/package.json')('pg');

const BASE = `http://127.0.0.1:${process.env.PORT || 3000}`;
const { MF_TEST_EMAIL: email, MF_TEST_PASSWORD: password, DATABASE_URL } = process.env;
let checks = 0;
const ok = (c, m) => { checks += 1; assert.ok(c, m); };
const eq = (a, b, m) => { checks += 1; assert.deepEqual(a, b, m); };
const step = (t) => console.log(`\n── ${t}`);

const GLOBAL_KEY = 'global-' + crypto.randomBytes(6).toString('hex');
const seen = { immich: [], stranger: [], nas: [] };
const serve = (name, handler) => new Promise((resolve) => {
  const s = http.createServer((req, res) => {
    seen[name].push({ path: req.url, key: req.headers['x-api-key'] || '', auth: req.headers.authorization || '' });
    handler(req, res);
  });
  s.listen(0, '127.0.0.1', () => resolve({ server: s, url: `http://127.0.0.1:${s.address().port}` }));
});
const json = (res, body) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const ASSET = '11111111-2222-3333-4444-555555555555';
const immich = await serve('immich', (req, res) => {
  if (req.url.startsWith('/api/albums/alb-1')) return json(res, { id: 'alb-1', assets: [{ id: ASSET, type: 'IMAGE', originalFileName: 'beach.jpg' }] });
  if (req.url.startsWith('/api/albums')) return json(res, [{ id: 'alb-1', albumName: 'Holiday', assetCount: 1 }]);
  if (req.url.startsWith('/api/people')) return json(res, { people: [{ id: 'p-1', name: 'Mia' }] });
  if (req.url.startsWith('/api/search/metadata')) return json(res, { assets: { items: [{ id: ASSET, type: 'IMAGE' }], nextPage: null } });
  if (req.url.startsWith(`/api/assets/${ASSET}/thumbnail`)) { res.writeHead(200, { 'content-type': 'image/jpeg' }); return res.end('jpeg-bytes'); }
  json(res, { secret: 'an endpoint a display never needs' });
});
const stranger = await serve('stranger', (req, res) => json(res, []));
const nas = await serve('nas', (req, res) => { res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.end('file-bytes'); });

const post = (path, body, headers = {}) => fetch(BASE + path, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const login = await post('/api/auth/login', { email, password });
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
ok(cookie.length > 0, 'signed in');

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();
const views = { stranger: 'sec-stranger', own: 'sec-own', global: 'sec-global', nas: 'sec-nas' };
const wallpapers = {
  [views.stranger]: { source: 'immich', immichUrl: stranger.url, immichMode: 'album', immichAlbumIds: ['alb-1'] },
  [views.own]: { source: 'immich', immichUrl: stranger.url, immichApiKey: 'own-key-of-this-view', immichMode: 'album', immichAlbumIds: ['alb-1'] },
  [views.global]: { source: 'immich', immichMode: 'album', immichAlbumIds: ['alb-1', '../../api/users/me'] },
  [views.nas]: { source: 'webdav', webdavUrl: nas.url, webdavUser: 'alex', webdavPass: 'nas-password', webdavPath: '/Photos/Wall' },
};
for (const [id, wp] of Object.entries(wallpapers)) {
  await db.query(`insert into "Dashboard" (id, name, wallpaper) values ($1, $1, $2::jsonb)
                  on conflict (id) do update set wallpaper = excluded.wallpaper`, [id, JSON.stringify(wp)]);
}

try {
  step('the saved Immich connection');
  let r = await post('/api/settings', { immichUrl: immich.url, immichApiKey: GLOBAL_KEY }, { cookie });
  eq(r.status, 200, 'an admin saves the global Immich address and key');

  if (process.env.MF_PROBE_OLD) {
    // Against a build from before the fix: show what leaks, then stop.
    await post('/api/wallpaper/immich/albums', { url: stranger.url });
    const got = seen.stranger.map((s) => s.key);
    console.log(`without a sign-in, the stranger received: ${got.length ? got.map((k) => (k === GLOBAL_KEY ? 'THE SAVED IMMICH KEY' : k)).join(', ') : 'nothing'}`);
    r = await fetch(`${BASE}/api/wallpaper/webdav?dashboardId=${views.nas}&file=${encodeURIComponent('/Documents/taxes.pdf')}`);
    console.log(`asking the NAS proxy for /Documents/taxes.pdf: ${r.status} ${r.status === 200 ? '(the file came through)' : ''}`);
    process.exitCode = 3;
    throw new Error('probe only');
  }

  step('the album and people lists of the editor');
  for (const path of ['/api/wallpaper/immich/albums', '/api/wallpaper/immich/people']) {
    seen.stranger.length = 0;
    r = await post(path, { url: stranger.url });
    eq(r.status, 401, `${path}: without a sign-in nothing happens`);
    eq(seen.stranger.length, 0, '…and the stranger is not even called');

    r = await post(path, { url: stranger.url }, { cookie });
    eq(r.status, 400, `${path}: signed in, another address without its own key is refused`);
    ok(/fehlt der API-Schlüssel/.test((await r.json()).error), '…with a reason');
    eq(seen.stranger.length, 0, '…and the saved key stays home');

    r = await post(path, { url: stranger.url, apiKey: 'typed-in-the-form' }, { cookie });
    eq([r.status, seen.stranger.at(-1)?.key], [200, 'typed-in-the-form'], 'another address with its own key works, and gets only that key');

    seen.immich.length = 0;
    r = await post(path, {}, { cookie });
    eq([r.status, seen.immich.at(-1)?.key], [200, GLOBAL_KEY], 'nothing typed in: the saved connection is used');
    r = await post(path, { url: immich.url + '/' }, { cookie });
    eq([r.status, seen.immich.at(-1)?.key], [200, GLOBAL_KEY], 'the saved address with a trailing slash is the same address');
  }

  step('the WebDAV folder browser of the editor');
  seen.nas.length = 0;
  r = await post('/api/webdav/browse', { url: nas.url, username: 'x', password: 'y' });
  eq([r.status, seen.nas.length], [401, 0], 'without a sign-in the server logs in nowhere');

  step('what a display loads');
  seen.stranger.length = 0;
  r = await fetch(`${BASE}/api/wallpaper/immich/playlist?dashboardId=${views.stranger}`);
  eq(r.status, 400, 'a view that names another address but no key gets no pictures');
  r = await fetch(`${BASE}/api/wallpaper/immich?id=${ASSET}&dashboardId=${views.stranger}`);
  eq(r.status, 400, '…and no single picture');
  eq(seen.stranger.length, 0, '…and the saved key never reaches that address');

  r = await fetch(`${BASE}/api/wallpaper/immich/playlist?dashboardId=${views.own}`);
  ok(seen.stranger.length > 0 && seen.stranger.every((s) => s.key === 'own-key-of-this-view'),
    `a view with its own address and key uses exactly those (${r.status}, ${JSON.stringify(seen.stranger)})`);

  seen.immich.length = 0;
  r = await fetch(`${BASE}/api/wallpaper/immich/playlist?dashboardId=${views.global}`);
  ok(r.status === 200 && seen.immich.every((s) => s.key === GLOBAL_KEY) && seen.immich.length > 0, 'a view without its own address uses the saved connection');
  r = await fetch(`${BASE}/api/wallpaper/immich?id=${ASSET}&dashboardId=${views.global}`);
  eq([r.status, await r.text()], [200, 'jpeg-bytes'], 'a picture comes through the proxy');

  for (const id of ['../../api/users/me', '..%2F..%2Fapi%2Falbums', `${ASSET}/original`, 'a.b']) {
    r = await fetch(`${BASE}/api/wallpaper/immich?id=${encodeURIComponent(id)}&dashboardId=${views.global}`);
    eq(r.status, 400, `the picture proxy refuses the id ${id}`);
  }
  r = await fetch(`${BASE}/api/wallpaper/immich/people/thumbnail?id=..&dashboardId=${views.global}`);
  eq(r.status, 400, 'the face proxy refuses a dot id');
  r = await fetch(`${BASE}/api/immich-widget?source=global&mode=playlist&albumId=..`);
  eq(r.status, 400, 'the album proxy refuses a dot id');
  ok(!seen.immich.some((s) => /users|\/api\/$|\/api\/albums\/\.\./.test(s.path)), 'no other Immich endpoint was reached');

  step('the NAS proxy');
  seen.nas.length = 0;
  r = await fetch(`${BASE}/api/wallpaper/webdav?dashboardId=${views.nas}&file=${encodeURIComponent('/Photos/Wall/beach.jpg')}`);
  eq([r.status, await r.text()], [200, 'file-bytes'], 'a picture from the folder of the view comes through');
  for (const file of ['/Documents/taxes.pdf', '/Documents/passport.jpg', '/Photos/Wall/../../Documents/x.jpg', '/Photos/Wall/notes.txt', '/Photos/Wallpaper-other/x.jpg', 'Photos/Wall/..']) {
    r = await fetch(`${BASE}/api/wallpaper/webdav?dashboardId=${views.nas}&file=${encodeURIComponent(file)}`);
    eq(r.status, 403, `the NAS proxy refuses ${file}`);
  }
  eq(seen.nas.map((s) => s.path), ['/Photos/Wall/beach.jpg'], 'the NAS was asked for exactly one file');
} finally {
  await db.query(`delete from "Dashboard" where id = any($1)`, [Object.values(views)]);
  await post('/api/settings', { immichUrl: '', immichApiKey: '' }, { cookie });
  await db.end();
  for (const s of [immich, stranger, nas]) s.server.close();
}

console.log(`\n  ${checks} checks of the wallpaper proxies.\n\nThe proxies hand out pictures, not keys.`);

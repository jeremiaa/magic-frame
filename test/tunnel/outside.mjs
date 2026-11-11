// The tunnel, tested from OUTSIDE: this script runs on a machine that reaches
// the installation only through the public address, the way a stranger does.
//
//   MF_TEST_EMAIL=… MF_TEST_PASSWORD=… \
//     node test/tunnel/outside.mjs https://<name>.trycloudflare.com <view-id>
//
// smoke.mjs proves the gate decides correctly; this proves that what goes
// around it — Cloudflare's edge, its cache, TLS, WebSockets — does not undo
// the decision. The edge cache is the reason this test exists: a picture a
// signed-in person loaded must not come back out of Cloudflare's cache for
// somebody who is not signed in.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BASE = (process.argv[2] || '').replace(/\/+$/, '');
const VIEW = process.argv[3] || '1';
const email = process.env.MF_TEST_EMAIL;
const password = process.env.MF_TEST_PASSWORD;
if (!/^https:\/\//.test(BASE) || !email || !password) {
  console.error('usage: MF_TEST_EMAIL=… MF_TEST_PASSWORD=… node test/tunnel/outside.mjs https://<public-address> <view-id>');
  process.exit(2);
}
const HOST = new URL(BASE).host;

let checks = 0;
const ok = (cond, what) => { checks += 1; assert.ok(cond, what); };
const eq = (a, b, what) => { checks += 1; assert.deepEqual(a, b, what); };
const step = (title) => console.log(`\n── ${title}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HTML = { accept: 'text/html,application/xhtml+xml' };
const get = (path, headers = {}, init = {}) => fetch(BASE + path, { redirect: 'manual', headers, ...init });

step(`reaching ${HOST}`);
let res = null;
for (let i = 0; i < 60; i++) {
  try {
    res = await get('/login', HTML);
    if (res.status === 200) break;
  } catch { /* the name is not in DNS yet */ }
  await sleep(2000);
}
eq(res?.status, 200, 'the sign-in page answers at the public address');
ok(res.headers.get('cf-ray'), '…and the answer really came through Cloudflare');
ok((await res.text()).includes('Magic Frame'), '…from Magic Frame');
eq(res.headers.get('cache-control'), 'private, no-store', '…not cacheable');
// Cloudflare adds a ban of its own for quick tunnels, so the value arrives longer than we sent it.
ok(/noindex/.test(res.headers.get('x-robots-tag') || ''), '…not for search engines');

step('a stranger');
for (const p of [`/view/${VIEW}`, '/view/1', '/editor', '/handoff?token=x', `/login/../view/${VIEW}`]) {
  res = await get(p, HTML);
  eq([res.status, res.headers.get('x-mf-gate')], [302, 'closed'], `${p}: sent to sign in`);
  ok(String(res.headers.get('location')).startsWith('/login'), '…at /login');
}
for (const p of [
  `/api/layout/get?dashboardId=${VIEW}`, '/api/dashboards', '/api/version', '/api/admin/tunnel', '/api/weather?lat=51.4&lon=-2.6',
  '/api/calendar', '/api/wallpaper/immich/playlist', '/api/timers', '/api/todos', '/api/view-clients',
  '/api/ha/action', '/api/ha/entities', '/api/ha/camera/camera.door/snapshot',
  '/socket.io/?EIO=4&transport=polling', '/wallpapers/mf-01.jpg', `/api/view-manifest/${VIEW}`,
]) {
  res = await get(p);
  eq([res.status, res.headers.get('x-mf-gate')], [404, 'closed'], `${p.split('?')[0]}: closed`);
}
res = await get('/api/auth/setup', { 'content-type': 'application/json' }, { method: 'POST', body: '{}' });
eq(res.status, 404, 'creating the first account: closed');
res = await get('/api/mcp', { 'content-type': 'application/json' }, { method: 'POST', body: '{}' });
eq(res.status, 401, 'MCP without a token: 401');

// A caller cannot talk their way into being "local" or "already checked".
res = await get(`/api/layout/get?dashboardId=${VIEW}`, { 'x-mf-tunnel': 'a'.repeat(64), 'x-real-ip': '127.0.0.1', 'x-forwarded-for': '127.0.0.1' });
eq([res.status, res.headers.get('x-mf-gate')], [404, 'closed'], 'forged headers change nothing');
// Claiming to be Cloudflare's own header is stopped one step earlier: by Cloudflare.
res = await get(`/api/layout/get?dashboardId=${VIEW}`, { 'cf-connecting-ip': '127.0.0.1' });
ok([403, 404].includes(res.status), `a forged CF-Connecting-IP gets nowhere (${res.status}${res.headers.get('x-mf-gate') ? ', from the gate' : ', from Cloudflare itself'})`);

const ws = (cookie) =>
  new Promise((resolve) => {
    const WebSocket = require('ws');
    const sock = new WebSocket(`wss://${HOST}/socket.io/?EIO=4&transport=websocket`, { headers: cookie ? { cookie } : {} });
    const done = (v) => { try { sock.terminate(); } catch { /* closed */ } resolve(v); };
    sock.on('message', (m) => done('open:' + String(m).slice(0, 6)));
    sock.on('unexpected-response', (_req, r) => done('refused:' + r.statusCode));
    sock.on('error', (e) => done('error:' + e.message));
    setTimeout(() => done('timeout'), 15000);
  });
eq(await ws(null), 'refused:404', 'a stranger\'s WebSocket is refused');

step('signing in from outside');
const signIn = async (pw) => {
  const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
  const set = r.headers.getSetCookie?.() ?? [];
  return { r, set, cookie: set.map((c) => c.split(';')[0]).join('; ') };
};
eq((await signIn('definitely-not-the-password')).r.status, 401, 'a wrong password is refused');
const session = await signIn(password);
eq(session.r.status, 200, 'the right one signs in');
ok(/;\s*secure/i.test(session.set.join('\n')), 'the session cookie carries "Secure"');
const me = { cookie: session.cookie };

const sec = await (await get('/api/admin/security', me)).json();
const seenIp = sec.attempts?.[0]?.ip ?? '';
ok(/^[0-9a-f.:]+$/i.test(seenIp) && !/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|unknown$)/.test(seenIp),
  `the app wrote the attempt down under a public address (${seenIp.replace(/[0-9a-f]+$/i, 'x')}) — not 127.0.0.1`);

step('signed in');
for (const p of ['/api/dashboards', `/api/layout/get?dashboardId=${VIEW}`, '/api/admin/tunnel']) {
  res = await get(p, me);
  eq(res.status, 200, `${p.split('?')[0]} passes`);
  eq(res.headers.get('cache-control'), 'private, no-store', '…marked as not to be kept');
}
res = await get(`/view/${VIEW}`, { ...HTML, ...me });
eq(res.status, 200, 'a view opens');
ok((await ws(session.cookie)).startsWith('open:0{'), 'live sync connects over a WebSocket');

step('Cloudflare\'s cache');
// The same picture three times as a signed-in person — if Cloudflare were
// going to keep it, it would have by now — then once as a stranger.
const picture = '/wallpapers/mf-01.jpg';
let cacheStates = [];
for (let i = 0; i < 3; i++) {
  res = await get(picture, me);
  eq(res.status, 200, `signed in, load ${i + 1}: the picture arrives`);
  eq(res.headers.get('cache-control'), 'private, no-store', '…marked as not to be kept');
  cacheStates.push(res.headers.get('cf-cache-status') || 'none');
  await res.arrayBuffer();
  await sleep(700);
}
ok(cacheStates.every((c) => !/^(HIT|REVALIDATED|UPDATING|STALE)$/i.test(c)), `Cloudflare did not serve it from its cache (cf-cache-status: ${cacheStates.join(', ')})`);
res = await get(picture);
eq([res.status, res.headers.get('x-mf-gate')], [404, 'closed'], 'the stranger asking for the same picture gets nothing — the cache did not keep a copy');
res = await get(picture + '?v=2');
eq(res.status, 404, '…with a query string neither');

step('plain http');
try {
  const plain = await fetch(`http://${HOST}/login`, { redirect: 'manual', headers: HTML });
  ok([301, 302, 307, 308].includes(plain.status) && String(plain.headers.get('location')).startsWith('https://'), `http is turned into https by Cloudflare (${plain.status})`);
} catch (e) {
  ok(true, `http is not served at all (${e.cause?.code || e.message})`);
}

console.log(`\n  ${checks} checks from outside, through ${HOST}.\n\nNothing gets past the gate.`);

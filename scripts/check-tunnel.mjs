// Checks the tunnel gate (server-tunnel.js) — the code that decides what the
// outside world may see when Magic Frame is reachable through a Cloudflare
// tunnel.
//
//   node scripts/check-tunnel.mjs
//
// The gate is the only thing between a public address and the family
// calendar, so its decisions are tested here on a real listener with real
// HTTP requests, not by reading the code and nodding. Three parts:
//
//   1. the allow-list against the routes that actually exist — every page and
//      API route in src/app must be closed to an anonymous caller unless it is
//      named on the list, and every name on the list must still exist;
//   2. the gate as a running server: what passes, what is turned away, what
//      the app is told about the caller, and which headers are forced;
//   3. the second line of defence on the normal port.
//
// No browser, no Docker, no cloudflared. Runs in CI.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import net from 'node:net';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const require = createRequire(import.meta.url);

const SECRET = 'a'.repeat(20) + 'b'.repeat(20) + 'c'.repeat(24);
process.env.SESSION_SECRET = SECRET;

async function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}
const PORT = await freePort();
process.env.MF_TUNNEL_PORT = String(PORT);

const gateModule = require('../server-tunnel.js');
const T = gateModule._test;
const { sealData } = require('iron-session');

let checks = 0;
const ok = (cond, what) => {
  checks += 1;
  assert.ok(cond, what);
};
const eq = (a, b, what) => {
  checks += 1;
  assert.deepEqual(a, b, what);
};

// ---- 1: addresses are brought into one form ---------------------------------

eq(T.normalizeTarget('/login')?.path, '/login', 'plain path');
eq(T.normalizeTarget('/login/../view/1')?.path, '/view/1', 'dot segments are resolved BEFORE deciding');
eq(T.normalizeTarget('/login/%2e%2e/view/1')?.path, '/view/1', 'encoded dot segments too');
eq(T.normalizeTarget('//view//1')?.path ?? null, null, '"//host" form is not ours');
eq(T.normalizeTarget('/a//b')?.path, '/a/b', 'doubled slashes collapse');
eq(T.normalizeTarget('/x?y=1')?.url, '/x?y=1', 'query survives');
eq(T.normalizeTarget('http://evil.example/login'), null, 'absolute URLs are refused');
eq(T.normalizeTarget('/login\\..\\view'), null, 'backslashes are refused');
eq(T.normalizeTarget('/lo\u0000gin'), null, 'control characters are refused');
eq(T.normalizeTarget(''), null, 'empty is refused');

// ---- 2: the allow-list against the routes that exist --------------------------

const appDir = join(repo, 'src/app');
const found = []; // { path, kind }
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name === 'route.ts' || name === 'page.tsx') {
      const rel = relative(appDir, dirname(full)).replace(/\\/g, '/');
      const path =
        '/' +
        rel
          .split('/')
          .filter((seg) => seg && !/^\(.*\)$/.test(seg)) // route groups vanish from the URL
          .map((seg) => (/^\[.*\]$/.test(seg) ? 'x' : seg))
          .join('/');
      found.push({ path: path === '/' ? '/' : path, kind: name === 'route.ts' ? 'route' : 'page' });
    }
  }
})(appDir);
ok(found.length > 80, `found the routes and pages (${found.length})`);

// What an anonymous caller from outside may reach. This is the whole list —
// adding to it is a decision, and this test is where it has to be written down.
const OPEN = new Set([
  '/',
  '/login',
  '/api/manifest',
  '/api/locale-default',
  '/api/auth/me',
  '/api/auth/login',
  '/api/auth/login/totp',
  '/api/auth/logout',
  '/api/mcp',
]);
const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const openFound = new Set();
for (const { path } of found) {
  const anyOpen = METHODS.some((m) => T.anonAllowed(m, path));
  if (OPEN.has(path)) {
    ok(anyOpen, `${path} is on the list and open`);
    openFound.add(path);
  } else {
    ok(!anyOpen, `${path} must be closed to an anonymous caller from outside`);
  }
}
for (const p of OPEN) ok(openFound.has(p), `${p} is on the allow-list but no such page or route exists any more`);

// The ones that matter most, spelled out — so a reader sees them here.
for (const p of [
  '/view/1', '/view/kitchen', '/editor', '/editor/views/1', '/handoff',
  '/api/layout/get', '/api/dashboards', '/api/weather', '/api/calendar', '/api/version',
  '/api/wallpaper/immich/playlist', '/api/wallpaper/webdav/playlist',
  '/api/auth/setup', '/api/auth/password', '/api/auth/shortcut-token',
  '/api/admin/tunnel', '/api/admin/ddns/tick', '/api/devices/refresh', '/api/timers',
  '/api/ha/action', '/api/ha/entities', '/api/ha/state', '/api/ha/stream',
  '/api/mcp/x', '/login/', '/Login', '/login%2F', '/_next/image', '/_next/data/x.json',
  '/socket.io/', '/modules/x/bundle.js', '/wallpapers/a.jpg',
]) {
  ok(!METHODS.some((m) => T.anonAllowed(m, p)), `${p} is closed`);
}
ok(T.anonAllowed('GET', '/_next/static/chunks/a.js'), 'built assets are open');
ok(!T.anonAllowed('POST', '/_next/static/chunks/a.js'), '…for reading only');
ok(!T.anonAllowed('GET', '/api/auth/login'), 'the login route takes POST only');
ok(!T.anonAllowed('POST', '/login'), 'the login page takes GET only');

// The two halves of the tag must stay one calculation.
const via = readFileSync(join(repo, 'src/lib/tunnel/via.ts'), 'utf8');
ok(/createHmac\(\s*"sha256"/.test(via) && via.includes('"mf-tunnel-tag"') && via.includes('"x-mf-tunnel"'),
  'src/lib/tunnel/via.ts derives the tag the same way as server-tunnel.js');
const TAG = createHmac('sha256', SECRET).update('mf-tunnel-tag').digest('hex');
eq(T.tunnelTag(), TAG, 'the tag is the HMAC of the session secret');
ok(existsSync(join(repo, 'server-tunnel.js')) && readFileSync(join(repo, 'Dockerfile'), 'utf8').includes('server-tunnel.js'),
  'the Dockerfile copies server-tunnel.js — without it the container dies at start');

// ---- 3: the gate as a running server -----------------------------------------

const seen = []; // what reached the app
const handle = (req, res) => {
  seen.push({ url: req.url, method: req.method, headers: { ...req.headers } });
  if (req.url.startsWith('/api/mcp')) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end('{"error":"unauthorized"}');
  }
  if (req.url.startsWith('/_next/static/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.end('asset');
  }
  if (req.url.startsWith('/api/wallpaper/')) {
    // An app route that hands out a generously cacheable picture, both ways
    // a header can be set.
    res.setHeader('CDN-Cache-Control', 'max-age=600');
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
    return res.end('picture');
  }
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.end('app');
};
const ioCalls = [];
const io = {
  engine: {
    handleRequest: (req, res) => {
      ioCalls.push({ kind: 'request', url: req.url, tag: req.headers['x-mf-tunnel'] });
      res.writeHead(200, { 'Cache-Control': 'public' });
      res.end('io');
    },
    handleUpgrade: (req, socket) => {
      ioCalls.push({ kind: 'upgrade', url: req.url, tag: req.headers['x-mf-tunnel'] });
      socket.end('HTTP/1.1 101 Switching Protocols\r\n\r\n');
    },
  },
};
const gate = gateModule.createTunnelGate({ handle });
gate.setIo(io);
eq(await gate.ensureListening(), PORT, 'the gate opens on its port');
eq(await gate.ensureListening(), PORT, '…and opening twice is one listener');

function call(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path, method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
const cookieFor = async (data) => 'magic_session=' + encodeURIComponent(await sealData(data, { password: SECRET }));
const session = await cookieFor({ userId: 'u1', email: 'a@example.com', role: 'admin' });
const pending = await cookieFor({ pendingTotpUserId: 'u1', pendingTotpEmail: 'a@example.com' });
const forged = await (async () => 'magic_session=' + encodeURIComponent(await sealData({ userId: 'u1' }, { password: 'z'.repeat(40) })))();
const HTML = { accept: 'text/html,application/xhtml+xml' };

// -- anonymous: the login page and nothing behind it
seen.length = 0;
let r = await call('/login', { headers: { ...HTML, 'cf-connecting-ip': '203.0.113.9', 'x-real-ip': '10.9.9.9', 'x-mf-tunnel': 'forged' } });
eq(r.status, 200, 'anonymous: the login page passes');
eq(seen.length, 1, '…and reaches the app');
eq(seen[0].headers['x-mf-tunnel'], TAG, 'the app is told it came through the tunnel — with OUR tag, not the caller\'s');
eq(seen[0].headers['x-real-ip'], '203.0.113.9', 'the caller address is the one Cloudflare reports, not what the caller claims');
eq(r.headers['cache-control'], 'private, no-store', 'a page is never left for Cloudflare to keep');
eq(r.headers['x-robots-tag'], 'noindex, nofollow', 'search engines are told to stay out');

seen.length = 0;
r = await call('/login', { headers: { ...HTML, 'x-real-ip': '127.0.0.1' } });
eq(seen[0].headers['x-real-ip'], undefined, 'without an address from Cloudflare there is NO address — never "127.0.0.1"');

for (const [path, why] of [
  ['/view/kitchen', 'a view'],
  ['/view/1', 'the oldest view id there is'],
  ['/editor', 'the editor'],
  ['/handoff?token=x', 'the add-on handoff'],
  ['/login/../view/kitchen', 'a view dressed up as the login page'],
]) {
  seen.length = 0;
  r = await call(path, { headers: HTML });
  eq(r.status, 302, `anonymous browser asking for ${why}: sent to sign in`);
  ok(String(r.headers.location).startsWith('/login'), '…at /login');
  eq(r.headers['x-mf-gate'], 'closed', '…by the gate itself');
  eq(seen.length, 0, '…and the app never hears of it');
}
r = await call('/editor/views/kitchen', { headers: HTML });
eq(r.headers.location, '/login?next=%2Feditor%2Fviews%2Fkitchen', 'an editor address is remembered for after signing in');
r = await call('/view/kitchen', { headers: HTML });
eq(r.headers.location, '/login', 'a view address is not');

// The sign-in page jumps to ?next= after signing in. From outside that may
// only be a way into the editor.
for (const next of ['https://evil.example/', '//evil.example/x', '/\\evil.example', '/view/1', '/api/auth/logout', 'javascript:alert(1)', '']) {
  seen.length = 0;
  r = await call('/login?next=' + encodeURIComponent(next), { headers: HTML });
  eq([r.status, r.headers.location], [302, '/login'], `sign-in link leading on to "${next}": the destination is dropped`);
  eq(seen.length, 0, '…before the page is even served');
}
r = await call('/login?next=%2Feditor&next=https%3A%2F%2Fevil.example', { headers: HTML });
eq(r.status, 302, 'a second, hidden next= does not slip through');
for (const next of ['/editor', '/editor/views/kitchen', '/editor/settings', '/editor/views/kitchen?tab=layout']) {
  r = await call('/login?next=' + encodeURIComponent(next), { headers: HTML });
  eq(r.status, 200, `sign-in link leading on to ${next}: fine`);
}

for (const path of [
  '/api/layout/get?dashboardId=kitchen', '/api/dashboards', '/api/weather?lat=1&lon=2', '/api/calendar',
  '/api/wallpaper/immich/playlist', '/api/version', '/api/auth/setup', '/api/admin/ddns/tick',
  '/_next/image?url=%2Fa.png&w=64&q=75', '/socket.io/?EIO=4&transport=polling', '/wallpapers/a.jpg',
]) {
  seen.length = 0;
  ioCalls.length = 0;
  for (const method of ['GET', 'POST']) {
    r = await call(path, { method });
    eq(r.status, 404, `anonymous ${method} ${path.split('?')[0]}: 404`);
    eq(r.headers['x-mf-gate'], 'closed', '…from the gate');
  }
  eq(seen.length + ioCalls.length, 0, '…and nothing behind it was reached');
}
r = await call('//evil.example/login');
eq(r.status, 400, 'an address that is not ours: 400');

// -- sessions that are not sessions
for (const [cookie, why] of [
  [pending, 'password given, 2FA code still missing'],
  [forged, 'sealed with a different secret'],
  ['magic_session=garbage', 'not a seal at all'],
  ['other=1', 'no session cookie'],
]) {
  seen.length = 0;
  r = await call('/api/dashboards', { headers: { cookie } });
  eq(r.status, 404, `${why}: still anonymous`);
  eq(seen.length, 0, '…the app is not reached');
}

// -- signed in: everything passes, and nothing is left behind at Cloudflare
seen.length = 0;
r = await call('/api/dashboards', { headers: { cookie: session, 'cf-connecting-ip': '2001:db8::7' } });
eq(r.status, 200, 'signed in: an API route passes');
eq(seen[0].headers['x-real-ip'], '2001:db8::7', 'IPv6 caller addresses pass through');
eq(r.headers['cache-control'], 'private, no-store', 'the app\'s "public, max-age" is overruled (set with setHeader)');
r = await call('/api/wallpaper/local/a.jpg', { headers: { cookie: session } });
eq(r.status, 200, 'signed in: a picture passes');
eq(r.headers['cache-control'], 'private, no-store', 'the app\'s "public, max-age" is overruled (set in writeHead)');
eq(r.headers['cdn-cache-control'], undefined, 'no CDN-Cache-Control slips through either');
r = await call('/view/kitchen', { headers: { ...HTML, cookie: session } });
eq(r.status, 200, 'signed in: a view passes');
r = await call('/_next/static/chunks/a.js');
eq(r.headers['cache-control'], 'public, max-age=31536000, immutable', 'built assets keep their caching');

// -- live sync
ioCalls.length = 0;
r = await call('/socket.io/?EIO=4&transport=polling', { headers: { cookie: session } });
eq(r.status, 200, 'signed in: live sync (polling) passes');
eq(ioCalls[0]?.tag, TAG, '…marked as tunnel traffic');
eq(r.headers['cache-control'], 'private, no-store', '…and not cacheable');

function upgrade(headers) {
  return new Promise((resolve) => {
    const s = net.connect(PORT, '127.0.0.1', () => {
      s.write(
        'GET /socket.io/?EIO=4&transport=websocket HTTP/1.1\r\nHost: x\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n' +
          Object.entries(headers).map(([k, v]) => `${k}: ${v}\r\n`).join('') + '\r\n',
      );
    });
    let data = '';
    s.on('data', (c) => (data += c));
    s.on('close', () => resolve(data.split('\r\n')[0]));
    s.on('error', () => resolve('error'));
  });
}
ioCalls.length = 0;
eq(await upgrade({}), 'HTTP/1.1 404 Not Found', 'anonymous websocket: refused');
eq(ioCalls.length, 0, '…before Socket.IO sees it');
eq(await upgrade({ cookie: session }), 'HTTP/1.1 101 Switching Protocols', 'signed in: the websocket is handed to Socket.IO');
eq(ioCalls[0]?.kind, 'upgrade', '…as an upgrade');

// -- the brake on wrong tokens
T.failures.clear();
seen.length = 0;
const attacker = { 'cf-connecting-ip': '198.51.100.4', authorization: 'Bearer wrongwrongwrongwrong' };
for (let i = 0; i < T.THROTTLE.max; i++) {
  r = await call('/api/mcp', { method: 'POST', headers: attacker, body: '{}' });
  eq(r.status, 401, `wrong MCP token, attempt ${i + 1}: the app says 401`);
}
r = await call('/api/mcp', { method: 'POST', headers: attacker, body: '{}' });
eq(r.status, 429, `attempt ${T.THROTTLE.max + 1}: the gate has had enough`);
eq(seen.length, T.THROTTLE.max, '…and the app is no longer asked');
r = await call('/api/mcp', { method: 'POST', headers: { ...attacker, 'cf-connecting-ip': '198.51.100.5' }, body: '{}' });
eq(r.status, 401, 'another address is not affected');
r = await call('/login', { headers: { ...HTML, 'cf-connecting-ip': '198.51.100.4' } });
eq(r.status, 200, 'the blocked address can still open the login page');

// ---- 4: the second line, on the normal port ------------------------------------

const local = { remoteAddress: '127.0.0.1', localAddress: '127.0.0.1' };
const reqOf = (socket, headers) => ({ socket, headers });
globalThis.__mfTunnel = { status: 'running' };
ok(gate.shouldGate(reqOf(local, { 'cf-ray': '8c1-FRA' })), 'tunnel running + from this machine + Cloudflare headers: gated');
ok(gate.shouldGate(reqOf({ remoteAddress: '::ffff:127.0.0.1', localAddress: '::ffff:127.0.0.1' }, { 'cf-connecting-ip': '1.2.3.4' })), '…in IPv4-mapped form too');
ok(gate.shouldGate(reqOf({ remoteAddress: '172.18.0.3', localAddress: '172.18.0.3' }, { 'cdn-loop': 'cloudflare; loops=1' })), '…and when cloudflared was pointed at the container\'s own address');
ok(!gate.shouldGate(reqOf(local, {})), 'from this machine without Cloudflare headers (our own background calls): not gated');
ok(!gate.shouldGate(reqOf({ remoteAddress: '172.18.0.2', localAddress: '172.18.0.3' }, { 'cf-ray': 'x' })), 'from another machine (the reverse proxy, a display): not gated');
globalThis.__mfTunnel = { status: 'off' };
ok(!gate.shouldGate(reqOf(local, { 'cf-ray': 'x' })), 'no tunnel of ours running: nothing changes for anybody');
globalThis.__mfTunnel = { status: 'starting' };
ok(gate.shouldGate(reqOf(local, { 'cf-ray': 'x' })), 'a tunnel that is still starting already counts');

await new Promise((resolve) => {
  globalThis.__mfTunnel = { status: 'running' };
  gate.allowSocket(reqOf(local, { 'cf-ray': 'x' }), (err, allowed) => {
    eq(allowed, false, 'second line, live sync without a session: refused');
    gate.allowSocket(reqOf(local, { 'cf-ray': 'x', cookie: session }), (err2, allowed2) => {
      eq(allowed2, true, '…with a session: allowed');
      gate.allowSocket(reqOf({ remoteAddress: '172.18.0.2', localAddress: '172.18.0.3' }, {}), (err3, allowed3) => {
        eq(allowed3, true, 'a display on the home network is never asked for one');
        resolve();
      });
    });
  });
});

// ---- 5: closing ---------------------------------------------------------------

gate.close();
ok(!gate.isListening(), 'the gate closes');
await new Promise((resolve) => {
  const s = net.connect(PORT, '127.0.0.1');
  s.on('connect', () => { checks += 1; assert.fail('the port is still open after close()'); });
  s.on('error', () => { checks += 1; resolve(); });
});

console.log(`  ${found.length} pages and routes checked against the allow-list`);
console.log(`  ${checks} checks on the tunnel gate`);
console.log('\nThe gate holds.');

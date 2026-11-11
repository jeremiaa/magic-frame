// The tunnel, tested against the real app — from INSIDE the app container,
// where cloudflared lives too:
//
//   docker compose exec -e MF_TEST_EMAIL=… -e MF_TEST_PASSWORD=… app \
//     node /opt/mf-test/smoke.mjs [fake|real]
//
// "fake" expects the app to run with MF_CLOUDFLARED_BIN pointing at
// fake-cloudflared.mjs and also walks through the fixed-tunnel scenarios.
// "real" uses the cloudflared in the image and a real quick tunnel; it prints
// the public address at the end so a second test can come in from outside.
//
// Everything here talks to 127.0.0.1: port 3000 is the normal entrance (what a
// wall tablet uses, minus the network), port 3001 is the tunnel gate (what
// cloudflared uses). scripts/check-tunnel.mjs tests the gate alone with a
// stand-in app; this one finds out whether the real app agrees.

import net from 'node:net';
import assert from 'node:assert/strict';

const MODE = process.argv[2] === 'real' ? 'real' : 'fake';
const KEEP = process.argv.includes('--keep'); // leave the quick tunnel running at the end
const MAIN = `http://127.0.0.1:${process.env.PORT || 3000}`;
const GATE_PORT = Number(process.env.MF_TUNNEL_PORT || 3001);
const GATE = `http://127.0.0.1:${GATE_PORT}`;
const email = process.env.MF_TEST_EMAIL;
const password = process.env.MF_TEST_PASSWORD;
if (!email || !password) {
  console.error('MF_TEST_EMAIL and MF_TEST_PASSWORD are required');
  process.exit(2);
}

let checks = 0;
const ok = (cond, what) => { checks += 1; assert.ok(cond, what); };
const eq = (a, b, what) => { checks += 1; assert.deepEqual(a, b, what); };
const step = (title) => console.log(`\n── ${title}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HTML = { accept: 'text/html,application/xhtml+xml' };
const OUTSIDE = { 'cf-connecting-ip': '203.0.113.77', 'cf-ray': '8f00test-FRA', 'x-forwarded-for': '203.0.113.77' };

const get = (url, headers = {}, init = {}) => fetch(url, { redirect: 'manual', headers, ...init });
const portOpen = (port) =>
  new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
  });

async function login(base, headers = {}, pw = password) {
  const res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ email, password: pw }),
  });
  const set = res.headers.getSetCookie?.() ?? [];
  return { res, set, cookie: set.map((c) => c.split(';')[0]).join('; ') };
}

let admin = ''; // session cookie from the normal entrance
const tunnelGet = async () => (await fetch(MAIN + '/api/admin/tunnel', { headers: { cookie: admin } })).json();
async function tunnel(action, token) {
  const res = await fetch(MAIN + '/api/admin/tunnel', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: admin },
    body: JSON.stringify({ action, token }),
  });
  return { status: res.status, body: await res.json(), text: '' };
}
async function until(what, fn, ms = 30000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await sleep(400);
  }
  assert.fail(`timed out waiting for: ${what}`);
}
const untilStatus = (want, ms) => until(`tunnel status "${want}"`, async () => { const s = await tunnelGet(); return s.status === want ? s : null; }, ms);
const fakeToken = (obj) => Buffer.from(JSON.stringify({ pad: 'x'.repeat(48), ...obj })).toString('base64');

// ── 0: the ground we stand on ─────────────────────────────────────────────────
step('before any tunnel');
const signedIn = await login(MAIN);
eq(signedIn.res.status, 200, 'signing in at the normal entrance works');
admin = signedIn.cookie;
ok(!/;\s*secure/i.test(signedIn.set.join('\n')), 'on the home network the session cookie carries no "Secure" (COOKIE_SECURE is off)');
const views = await (await fetch(MAIN + '/api/dashboards', { headers: { cookie: admin } })).json();
const viewList = Array.isArray(views) ? views : views.dashboards ?? [];
ok(viewList.length > 0, 'there is at least one view to test with');
const VIEW = viewList.find((v) => v.id === 'home')?.id ?? viewList[0].id;

let s = await tunnelGet();
eq(s.available, true, `a tunnel can be started here (cloudflared ${s.cloudflaredVersion})`);
ok(MODE === 'fake' ? /fake/.test(s.cloudflaredVersion) : /^\d{4}\./.test(s.cloudflaredVersion), `…with the ${MODE} cloudflared`);
if (s.status !== 'off') { await tunnel('stop'); await untilStatus('off'); s = await tunnelGet(); }
eq(s.status, 'off', 'no tunnel is running');
eq(await portOpen(GATE_PORT), false, 'without a tunnel there is no second listener at all');
eq((await get(MAIN + '/api/admin/tunnel')).status, 401, 'the tunnel settings are closed without a session');
eq((await get(`${MAIN}/view/${VIEW}`, HTML)).status, 200, 'a view opens without signing in, as it always has');
eq((await get(`${MAIN}/view/${VIEW}`, { ...HTML, ...OUTSIDE })).status, 200, '…also for a request that merely LOOKS like Cloudflare — no tunnel of ours, no gate');
eq((await get(`${MAIN}/api/layout/get?dashboardId=${VIEW}`)).status, 200, 'and so does its layout');

// ── 1: a quick tunnel ───────────────────────────────────────────────────────────
step(`quick tunnel (${MODE})`);
let r = await tunnel('start-quick');
eq(r.status, 200, 'starting a quick tunnel is accepted');
s = await untilStatus('running', MODE === 'real' ? 90000 : 15000);
ok(/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(s.url), `it reports its address (${s.url})`);
eq(s.mode, 'quick', 'as a quick tunnel');
eq(await portOpen(GATE_PORT), true, 'the gate is listening now');
r = await tunnel('start-quick');
eq([r.status, r.body.error], [400, 'already-running'], 'a second start is refused');

step('through the gate, not signed in');
let res = await get(GATE + '/login', { ...HTML, ...OUTSIDE });
eq(res.status, 200, 'the sign-in page opens');
const loginHtml = await res.text();
ok(loginHtml.includes('Magic Frame'), '…and it is the real one');
eq(res.headers.get('cache-control'), 'private, no-store', '…not cacheable');
eq(res.headers.get('x-robots-tag'), 'noindex, nofollow', '…not for search engines');
const assets = [...new Set(loginHtml.match(/\/_next\/static\/[^"'\\ ]+\.(?:js|css|woff2)/g) ?? [])];
ok(assets.length >= 3, `the page names its building blocks (${assets.length})`);
for (const a of assets) {
  res = await get(GATE + a, OUTSIDE);
  eq(res.status, 200, `building block passes: ${a.slice(0, 60)}`);
}
ok(/immutable|max-age/.test(res.headers.get('cache-control') || ''), 'building blocks keep their caching');
for (const p of ['/api/locale-default', '/api/manifest', '/icon.svg']) {
  res = await get(GATE + p, OUTSIDE);
  eq(res.status, 200, `${p} passes (the sign-in page needs it)`);
}
res = await get(GATE + '/api/auth/me', OUTSIDE);
ok(res.headers.get('x-mf-gate') === null && [200, 401].includes(res.status), '/api/auth/me reaches the app');

for (const p of [`/view/${VIEW}`, '/view/1', '/editor', `/editor/views/${VIEW}`, '/handoff?token=x', `/login/../view/${VIEW}`]) {
  res = await get(GATE + p, { ...HTML, ...OUTSIDE });
  eq([res.status, res.headers.get('x-mf-gate')], [302, 'closed'], `browser asking for ${p}: sent to sign in by the gate`);
  ok(String(res.headers.get('location')).startsWith('/login'), '…at /login');
}
for (const p of [
  `/api/layout/get?dashboardId=${VIEW}`, '/api/dashboards', '/api/version', '/api/admin/tunnel', '/api/admin/server-info',
  '/api/weather?lat=51.4&lon=-2.6', '/api/calendar', '/api/wallpaper/immich/playlist', '/api/ha/entities', '/api/timers',
  '/api/messages', '/api/shopping', '/api/todos', '/api/digest/x', '/api/view-clients', '/api/devices/refresh',
  '/api/ha/action', '/api/ha/state?ids=light.kitchen', '/api/ha/stream?ids=light.kitchen', '/api/ha/camera/camera.door/snapshot',
  '/socket.io/?EIO=4&transport=polling', '/_next/image?url=%2Ficon.svg&w=64&q=75', `/api/view-manifest/${VIEW}`,
]) {
  for (const method of ['GET', 'POST']) {
    res = await get(GATE + p, OUTSIDE, { method });
    eq([res.status, res.headers.get('x-mf-gate')], [404, 'closed'], `${method} ${p.split('?')[0]}: closed`);
  }
}
// Addresses that start like a building block and try to end somewhere else.
for (const p of [
  `/_next/static/..%2f..%2fapi/layout/get?dashboardId=${VIEW}`,
  `/_next/static/%2e%2e%2f%2e%2e%2fapi%2flayout%2fget?dashboardId=${VIEW}`,
  `/_next/static/..%252f..%252fapi/layout/get?dashboardId=${VIEW}`,
  `/_next/static/chunks/..%2f..%2f..%2fapi%2fversion`,
]) {
  res = await get(GATE + p, OUTSIDE);
  const body = await res.text();
  ok(res.status >= 400 && !body.includes('"widgets"') && !body.includes('"version"'), `${p.slice(0, 58)}…: leads nowhere (${res.status})`);
}
for (const next of ['https://evil.example/', '//evil.example/', '/view/1', 'javascript:alert(1)']) {
  res = await get(`${GATE}/login?next=${encodeURIComponent(next)}`, { ...HTML, ...OUTSIDE });
  eq([res.status, res.headers.get('location')], [302, '/login'], `sign-in link that would lead on to ${next}: the destination is dropped`);
}
res = await get(`${GATE}/login?next=${encodeURIComponent(`/editor/views/${VIEW}`)}`, { ...HTML, ...OUTSIDE });
eq(res.status, 200, 'a sign-in link that leads on into the editor is fine');

res = await get(GATE + '/api/auth/setup', { ...OUTSIDE, 'content-type': 'application/json' }, { method: 'POST', body: '{}' });
eq([res.status, res.headers.get('x-mf-gate')], [404, 'closed'], 'creating the first account from outside: closed');
res = await get(GATE + '/api/mcp', { ...OUTSIDE, 'content-type': 'application/json' }, { method: 'POST', body: '{}' });
eq([res.status, res.headers.get('x-mf-gate')], [401, null], 'MCP without a token: the app itself says 401');

step('through the gate, signing in');
const before = (await (await fetch(MAIN + '/api/admin/security', { headers: { cookie: admin } })).json()).attempts.length;
const wrong = await login(GATE, { ...OUTSIDE, 'x-real-ip': '127.0.0.1' }, 'definitely-not-the-password');
eq(wrong.res.status, 401, 'a wrong password is refused');
const attempts = (await (await fetch(MAIN + '/api/admin/security', { headers: { cookie: admin } })).json()).attempts;
ok(attempts.length > before || before >= 50, 'the attempt was written down');
eq(attempts[0].ip, '203.0.113.77', 'under the address Cloudflare reported — not 127.0.0.1, and not what the caller claimed');
const outside = await login(GATE, OUTSIDE);
eq(outside.res.status, 200, 'the right password signs in');
ok(/;\s*secure/i.test(outside.set.join('\n')), 'through the tunnel the session cookie carries "Secure"');
ok(/;\s*httponly/i.test(outside.set.join('\n')), '…and HttpOnly');

step('through the gate, signed in');
const me = { ...OUTSIDE, cookie: outside.cookie };
for (const p of ['/api/dashboards', `/api/layout/get?dashboardId=${VIEW}`, '/api/version', '/api/admin/tunnel']) {
  res = await get(GATE + p, me);
  eq(res.status, 200, `${p.split('?')[0]} passes`);
  eq(res.headers.get('cache-control'), 'private, no-store', '…and Cloudflare may not keep it');
}
res = await get(`${GATE}/view/${VIEW}`, { ...HTML, ...me });
eq(res.status, 200, 'a view opens for someone who is signed in');
res = await get(GATE + '/editor', { ...HTML, ...me });
ok([200, 307, 308].includes(res.status), 'the editor opens');
res = await get(GATE + '/socket.io/?EIO=4&transport=polling', me);
eq(res.status, 200, 'live sync connects');
ok((await res.text()).startsWith('0{"sid"'), '…with a real Socket.IO handshake');

const token = (await (await fetch(MAIN + '/api/auth/shortcut-token', { headers: { cookie: admin } })).json()).token;
const mcp = (bearer) =>
  get(GATE + '/api/mcp', { ...OUTSIDE, 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${bearer}` }, {
    method: 'POST',
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'tunnel-smoke', version: '1' } } }),
  });
res = await mcp(token);
eq(res.status, 200, 'MCP answers through the gate with the right token');
ok((await res.text()).includes('magic-frame'), '…as Magic Frame');
eq((await mcp('x'.repeat(40))).status, 401, '…and refuses a wrong one');

step('the second line: tunnel traffic that lands on the NORMAL port');
res = await get(`${MAIN}/view/${VIEW}`, { ...HTML, ...OUTSIDE });
eq([res.status, res.headers.get('x-mf-gate')], [302, 'closed'], 'a view, from this machine with Cloudflare headers: gated');
res = await get(`${MAIN}/api/layout/get?dashboardId=${VIEW}`, OUTSIDE);
eq([res.status, res.headers.get('x-mf-gate')], [404, 'closed'], '…its layout too');
res = await get(`${MAIN}/api/layout/get?dashboardId=${VIEW}`, { ...OUTSIDE, cookie: outside.cookie });
eq(res.status, 200, '…unless signed in');
res = await get(`${MAIN}/view/${VIEW}`, HTML);
eq([res.status, res.headers.get('x-mf-gate')], [200, null], 'the app\'s own calls to itself (no Cloudflare headers) are left alone');

if (MODE === 'real' && KEEP) {
  console.log(`\n  ${checks} checks so far — the quick tunnel stays up for the test from outside.`);
  console.log(`PUBLIC_URL=${s.url}`);
  console.log(`TEST_VIEW=${VIEW}`);
  process.exit(0);
}

step('stopping');
r = await tunnel('stop');
eq(r.status, 200, 'stop is accepted');
await untilStatus('off');
await until('the gate to close', async () => !(await portOpen(GATE_PORT)));
ok(true, 'the gate is closed again');
eq((await get(`${MAIN}/view/${VIEW}`, { ...HTML, ...OUTSIDE })).status, 200, 'and the second line is gone with it');

if (MODE === 'real') {
  console.log(`\n  ${checks} checks with the real cloudflared.\n\nThe tunnel works.`);
  process.exit(0);
}

// ── 2: a fixed tunnel, with the stand-in ────────────────────────────────────────
step('fixed tunnel: the token');
r = await tunnel('start-token', 'hello');
eq([r.status, r.body.error], [400, 'bad-token'], 'something that is not a token is refused');
r = await tunnel('start-token');
eq([r.status, r.body.error], [400, 'no-token'], 'starting without any token is refused');

const good = fakeToken({ scenario: 'ok', service: `http://127.0.0.1:${GATE_PORT}` });
r = await tunnel('start-token', `cloudflared service install ${good}`);
eq(r.status, 200, 'the whole line from the Cloudflare dashboard is accepted — the token is picked out of it');
s = await untilStatus('running');
s = await until('the hostname to show', async () => { const x = await tunnelGet(); return x.hostnames.length ? x : null; });
eq(s.hostnames, ['frame.example.com'], 'the address comes from the Cloudflare dashboard');
eq([s.hasStoredToken, s.autostart, s.error, s.warning], [true, true, null, null], 'the token is kept and the tunnel will come back after a restart');
ok(!JSON.stringify(s).includes(good), 'the token itself never comes back out');
res = await get(GATE + `/view/${VIEW}`, { ...HTML, ...OUTSIDE });
eq(res.status, 302, 'the same gate stands in front of a fixed tunnel');
await tunnel('stop'); await untilStatus('off');
s = await tunnelGet();
eq([s.hasStoredToken, s.autostart], [true, false], 'stopping keeps the token but not the autostart');
r = await tunnel('start-token');
eq(r.status, 200, 'the stored token starts it again without pasting');
await untilStatus('running');
await tunnel('stop'); await untilStatus('off');

step('fixed tunnel: a dashboard entry that points past the gate');
for (const [service, why] of [
  ['http://localhost:3000', 'the normal port'],
  ['http://app:3000', 'the container by name'],
  [`https://127.0.0.1:${GATE_PORT}`, 'https instead of http'],
  ['http://caddy:80', 'the reverse proxy'],
]) {
  r = await tunnel('start-token', fakeToken({ scenario: 'ok', service }));
  eq(r.status, 200, `started with a service of ${service}`);
  s = await until('the check to stop it', async () => { const x = await tunnelGet(); return x.status === 'error' ? x : null; }, 15000);
  eq(s.error?.code, 'ingress-mismatch', `${why}: the tunnel is stopped`);
  ok(String(s.error?.detail).includes(service), '…and the message names the entry');
  eq(s.autostart, false, '…and it will not come back by itself');
  await until('the gate to close', async () => !(await portOpen(GATE_PORT)));
}
r = await tunnel('start-token', fakeToken({ scenario: 'ok', service: `http://localhost:${GATE_PORT}` }));
await untilStatus('running');
await sleep(2500);
eq((await tunnelGet()).status, 'running', '"localhost" instead of 127.0.0.1 is fine');
await tunnel('stop'); await untilStatus('off');

for (const [scenario, code, why] of [
  ['no-config', 'ingress-unknown', 'a cloudflared whose rules cannot be read'],
  ['no-service', 'ingress-mismatch', 'a rule that does not say where it leads'],
]) {
  r = await tunnel('start-token', fakeToken({ scenario }));
  eq(r.status, 200, `started: ${why}`);
  s = await until('the check to stop it', async () => { const x = await tunnelGet(); return x.status === 'error' ? x : null; }, 25000);
  eq([s.error?.code, s.autostart], [code, false], '…is stopped rather than trusted, and stays off');
  await until('the gate to close', async () => !(await portOpen(GATE_PORT)));
}

r = await tunnel('start-token', fakeToken({ scenario: 'reconfigure', service: `http://127.0.0.1:${GATE_PORT}`, then: 'http://localhost:3000', after: 2500 }));
await untilStatus('running');
s = await until('the changed dashboard entry to be noticed', async () => { const x = await tunnelGet(); return x.status === 'error' ? x : null; }, 15000);
eq(s.error?.code, 'ingress-mismatch', 'an entry changed WHILE the tunnel runs is caught too');

step('fixed tunnel: when things go wrong');
r = await tunnel('start-token', fakeToken({ scenario: 'no-hostname' }));
await untilStatus('running');
s = await until('the warning', async () => { const x = await tunnelGet(); return x.warning ? x : null; });
eq(s.warning?.code, 'no-hostname', 'a tunnel without a public address says so');
await tunnel('stop'); await untilStatus('off');

r = await tunnel('start-token', fakeToken({ scenario: 'reject' }));
s = await until('the rejection', async () => { const x = await tunnelGet(); return x.status === 'error' ? x : null; });
eq(s.error?.code, 'token-rejected', 'a token Cloudflare refuses is reported as that');
await sleep(7000);
s = await tunnelGet();
eq(s.status, 'error', '…and is not retried in a loop');
await until('the gate to close', async () => !(await portOpen(GATE_PORT)));

r = await tunnel('start-token', fakeToken({ scenario: 'never' }));
s = await until('the blocked network to be reported', async () => { const x = await tunnelGet(); return x.error ? x : null; });
eq([s.status, s.error?.code], ['starting', 'blocked'], 'a network that lets nothing out is named as the cause while cloudflared keeps trying');
await tunnel('stop'); await untilStatus('off');
await until('the gate to close', async () => !(await portOpen(GATE_PORT)));

r = await tunnel('start-token', fakeToken({ scenario: 'crash-once', id: String(Date.now()), service: `http://127.0.0.1:${GATE_PORT}` }));
await untilStatus('running');
await until('the crash', async () => (await tunnelGet()).status === 'error', 10000);
s = await untilStatus('running', 20000);
eq(s.status, 'running', 'a fixed tunnel that dies comes back by itself');

step('forgetting the token');
r = await tunnel('forget-token');
eq(r.status, 200, 'forget is accepted');
await untilStatus('off');
s = await tunnelGet();
eq([s.hasStoredToken, s.autostart], [false, false], 'nothing is stored any more');
await until('the gate to close', async () => !(await portOpen(GATE_PORT)));

console.log(`\n  ${checks} checks against the running app.\n\nThe tunnel works.`);

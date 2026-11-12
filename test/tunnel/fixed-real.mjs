// The fixed tunnel, tested with a REAL tunnel from a Cloudflare account and the
// image's real cloudflared (no stand-in). A person does the Cloudflare side in
// the dashboard, the way every user does it; the script does the rest and says
// when it is that person's turn.
//
//   MF_TEST_EMAIL=… MF_TEST_PASSWORD=… MF_TUNNEL_HOST=mf-tunnel-test.example.com \
//   MF_CONTAINER=mf-rc-app-1 \
//     node test/tunnel/fixed-real.mjs http://127.0.0.1:3011
//
// Before it starts, in the Cloudflare dashboard (Networking → Tunnels):
//   1. create a tunnel (only a name is asked);
//   2. Routes → Add route → Published application: the address in
//      MF_TUNNEL_HOST, service URL http://127.0.0.1:3001 (the script prints
//      the gate port, should it differ);
//   3. Overview → Debian → copy the line "2. Install as service".
// The script reads that line from the clipboard (macOS) or from the file named
// in MF_TUNNEL_LINE_FILE, shows the token only masked, and empties the
// clipboard. Later it asks for two more things in the dashboard: putting the
// route's service right after the script's own check has caught a wrong one,
// and deleting the tunnel. It waits for Enter, or, when it does not run in a
// terminal, for a new line in the file named in MF_TUNNEL_SIGNAL
// (echo >> that-file).
//
// MF_CONTAINER is optional; with it, the test also restarts the app and reads
// its processes and log.
//
// What only a real tunnel can tell: whether cloudflared's /config really says
// where the dashboard entries lead (the check the app relies on), what
// cloudflared prints when Cloudflare refuses a token, whether a fixed tunnel
// comes back after a restart, and whether a domain of one's own — with that
// zone's settings — keeps the gate's answers private.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import readline from 'node:readline';
import { execFile, execFileSync, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] || '').replace(/\/+$/, '');
const {
  MF_TUNNEL_HOST: host, MF_CONTAINER, MF_TUNNEL_LINE_FILE, MF_TUNNEL_SIGNAL,
  MF_TEST_EMAIL: email, MF_TEST_PASSWORD: password,
} = process.env;
if (!/^https?:\/\//.test(BASE) || !host || !email || !password) {
  console.error('usage: MF_TEST_EMAIL=… MF_TEST_PASSWORD=… MF_TUNNEL_HOST=<address of the route> node test/tunnel/fixed-real.mjs http://<normal-entrance>');
  process.exit(2);
}

let checks = 0;
const ok = (cond, what) => { checks += 1; assert.ok(cond, what); };
const eq = (a, b, what) => { checks += 1; assert.deepEqual(a, b, what); };
const step = (title) => console.log(`\n── ${title}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(what, fn, ms = 30000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await sleep(500);
  }
  assert.fail(`timed out waiting for: ${what}`);
}

// ── the person in the dashboard ───────────────────────────────────────────────
const signalLines = () => { try { return fs.readFileSync(MF_TUNNEL_SIGNAL, 'utf8').split('\n').filter(Boolean).length; } catch { return 0; } };
let signalsSeen = MF_TUNNEL_SIGNAL ? signalLines() : 0;
const tell = (what) => console.log(`\n  ▶ In the Cloudflare dashboard: ${what}`);
async function yourTurn(what) {
  tell(what);
  if (!MF_TUNNEL_SIGNAL) {
    assert.ok(process.stdin.isTTY, 'not in a terminal: name a file in MF_TUNNEL_SIGNAL and add a line to it after each step');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise((r) => rl.question('    Press Enter when it is done. ', r));
    rl.close();
    return;
  }
  console.log(`    waiting for a new line in ${MF_TUNNEL_SIGNAL}`);
  await until('the person in the dashboard', () => {
    const n = signalLines();
    if (n <= signalsSeen) return false;
    signalsSeen = n;
    return true;
  }, 60 * 60 * 1000);
}
const TOKEN_RE = /eyJ[A-Za-z0-9_\-+/=]{40,}/;
const mask = (text) => text.replace(new RegExp(TOKEN_RE.source, 'g'), (t) => `<token, ${t.length} characters>`);
function installLine() {
  if (MF_TUNNEL_LINE_FILE) return fs.readFileSync(MF_TUNNEL_LINE_FILE, 'utf8').trim();
  const line = execFileSync('pbpaste', { encoding: 'utf8' }).trim();
  execFileSync('pbcopy', { input: '' }); // the token does not stay on the clipboard
  return line;
}

// ── the app ───────────────────────────────────────────────────────────────────
let admin = '';
async function signIn() {
  const res = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  admin = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  return res.status;
}
const tunnelGet = async () => (await fetch(BASE + '/api/admin/tunnel', { headers: { cookie: admin } })).json();
async function tunnel(action, token) {
  const res = await fetch(BASE + '/api/admin/tunnel', { method: 'POST', headers: { 'content-type': 'application/json', cookie: admin }, body: JSON.stringify({ action, token }) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const untilState = (what, test, ms) => until(what, async () => { const s = await tunnelGet(); return test(s) ? s : null; }, ms);
// Never block the event loop while the app is being talked to: a kept-alive
// connection the app closed meanwhile would only be noticed when it is used
// again, and that request then fails ("other side closed").
const docker = async (...args) => (await promisify(execFile)('docker', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })).stdout;
const runNode = (args) => new Promise((resolve) => spawn(process.execPath, args, { stdio: 'inherit' }).on('exit', (code) => resolve(code)));

// What a stranger gets at the public address: Magic Frame, or something else.
async function publicAnswer() {
  try {
    const res = await fetch(`https://${host}/login`, { redirect: 'manual', headers: { accept: 'text/html' }, signal: AbortSignal.timeout(10000) });
    const body = await res.text();
    return { status: res.status, magicFrame: res.status === 200 && body.includes('Magic Frame') };
  } catch (e) {
    return { status: 0, magicFrame: false, error: e.cause?.code || e.message };
  }
}

let tunnelToken = '';

try {
  step('before the tunnel');
  eq(await signIn(), 200, 'signing in at the normal entrance works');
  const views = await (await fetch(BASE + '/api/dashboards', { headers: { cookie: admin } })).json();
  const viewList = Array.isArray(views) ? views : views.dashboards ?? [];
  const VIEW = viewList.find((v) => v.id === 'home')?.id ?? viewList[0]?.id;
  ok(VIEW, `there is a view to test with (${VIEW})`);
  let s = await tunnelGet();
  eq(s.available, true, 'a tunnel can be started here');
  ok(/^\d{4}\.\d+\.\d+$/.test(s.cloudflaredVersion || ''), `…with the real cloudflared (${s.cloudflaredVersion})`);
  if (s.status !== 'off') { await tunnel('stop'); s = await untilState('the old tunnel to stop', (x) => x.status === 'off'); }
  if (s.hasStoredToken) { await tunnel('forget-token'); s = await tunnelGet(); }
  eq([s.status, s.hasStoredToken], ['off', false], 'no tunnel runs and no token is stored');
  const gate = `http://127.0.0.1:${s.gatePort}`;

  step(`the tunnel in the Cloudflare account, with the address ${host}`);
  await yourTurn(`a tunnel with one route "Published application" ${host} → ${gate}, and its line "Install as service" copied`);
  const line = installLine();
  tunnelToken = TOKEN_RE.exec(line)?.[0] ?? '';
  ok(tunnelToken, `the line from the dashboard is there (${mask(line)})`);
  let tunnelId = '';
  try { tunnelId = JSON.parse(Buffer.from(tunnelToken, 'base64').toString('utf8')).t; } catch { /* checked below */ }
  ok(/^[0-9a-f-]{36}$/.test(tunnelId || ''), `…and its token names a tunnel (${tunnelId})`);
  ok((await until('the address to be in DNS', async () => { const a = await publicAnswer(); return a.status ? a : null; }, 120000)).status, 'the address exists at Cloudflare');

  step('pasting the line from the dashboard');
  let r = await tunnel('start-token', line);
  eq(r.status, 200, 'the whole install line is accepted');
  s = await untilState('the tunnel to run (or fail)', (x) => x.status === 'running' || x.status === 'error', 90000);
  eq([s.status, s.error], ['running', null], 'it connects, and the dashboard entry passes the check');
  eq(s.mode, 'token', '…as a fixed tunnel');
  eq(s.hostnames, [host], 'the card shows the address from the dashboard');
  eq(s.warning, null, '…without a warning');
  eq([s.hasStoredToken, s.autostart], [true, true], 'the token is kept for the next start');
  ok(!JSON.stringify(s).includes(tunnelToken), 'the token itself never comes back out');
  if (MF_CONTAINER) {
    const cmdlines = await docker('exec', MF_CONTAINER, 'sh', '-c', 'for p in /proc/[0-9]*; do tr "\\0" " " < "$p/cmdline" 2>/dev/null; echo; done');
    ok(/cloudflared/.test(cmdlines), 'cloudflared runs inside the app container');
    ok(!cmdlines.includes(tunnelToken), '…and the token is in no process list');
  }

  step('from outside, through the address of our own domain');
  eq(await runNode([fileURLToPath(new URL('./outside.mjs', import.meta.url)), `https://${host}`, VIEW]), 0, 'every check from outside passed');

  step('an entry changed in the dashboard while the tunnel runs');
  tell(`change the service URL of ${host} to http://localhost:3000 and save. The app notices by itself.`);
  s = await untilState('the changed entry to stop the tunnel', (x) => x.status === 'error', 15 * 60 * 1000);
  eq(s.error?.code, 'ingress-mismatch', 'the tunnel is stopped');
  ok(String(s.error?.detail).includes('http://localhost:3000'), `…and the card names the entry (${s.error?.detail})`);
  eq(s.autostart, false, '…and it will not come back by itself');
  const gone = await until('the address to stop answering', async () => { const a = await publicAnswer(); return a.magicFrame ? null : a; }, 60000);
  ok(!gone.magicFrame, `nothing of Magic Frame answers at the address any more (${gone.status || gone.error})`);

  step('the entry put right, started again without pasting');
  await yourTurn(`change the service URL of ${host} back to ${gate} and save`);
  r = await tunnel('start-token');
  eq(r.status, 200, 'the stored token is enough');
  s = await untilState('the tunnel to run again', (x) => x.status === 'running' || x.status === 'error', 90000);
  eq([s.status, s.hostnames], ['running', [host]], 'it runs again, at the same address');
  ok((await until('the address to answer again', async () => { const a = await publicAnswer(); return a.magicFrame ? a : null; }, 90000)).magicFrame, 'Magic Frame answers at the address again');

  if (MF_CONTAINER) {
    step('after a restart of the app');
    await docker('restart', MF_CONTAINER);
    await until('the app to come back', async () => { try { return (await fetch(BASE + '/api/locale-default')).ok; } catch { return false; } }, 180000);
    eq(await signIn(), 200, 'signing in works again');
    s = await untilState('the tunnel to come back', (x) => x.status === 'running' || x.status === 'error', 120000);
    eq([s.status, s.mode, s.hostnames], ['running', 'token', [host]], 'the fixed tunnel came back by itself');
    ok((await until('the address to answer after the restart', async () => { const a = await publicAnswer(); return a.magicFrame ? a : null; }, 90000)).magicFrame, '…and the address answers');
  }

  step('stopping');
  r = await tunnel('stop');
  eq(r.status, 200, 'stop is accepted');
  s = await untilState('the tunnel to stop', (x) => x.status === 'off');
  eq([s.hasStoredToken, s.autostart], [true, false], 'the token stays, the autostart goes');
  const stopped = await until('the address to stop answering', async () => { const a = await publicAnswer(); return a.magicFrame ? null : a; }, 60000);
  ok(!stopped.magicFrame, `nothing of Magic Frame answers at the address (${stopped.status || stopped.error})`);

  step('a token Cloudflare no longer accepts');
  await yourTurn(`delete the tunnel ${tunnelId}. The app still holds its token.`);
  r = await tunnel('start-token');
  eq(r.status, 200, 'starting with the token of the deleted tunnel is accepted at first');
  s = await untilState('Cloudflare to refuse it', (x) => x.status === 'error' || x.error, 90000);
  eq(s.error?.code, 'token-rejected', `the card says that Cloudflare refused the token (${s.error?.detail})`);
  // cloudflared itself would keep trying such a token forever; the app ends it.
  await sleep(8000);
  s = await tunnelGet();
  eq(s.status, 'error', '…and it is not tried again and again');
  if (MF_CONTAINER) {
    const cmdlines = await docker('exec', MF_CONTAINER, 'sh', '-c', 'for p in /proc/[0-9]*; do tr "\\0" " " < "$p/cmdline" 2>/dev/null; echo; done');
    ok(!/cloudflared/.test(cmdlines), '…and no cloudflared is left trying in the background');
  }

  step('forgetting the token');
  r = await tunnel('forget-token');
  eq(r.status, 200, 'forget is accepted');
  s = await untilState('nothing to be stored', (x) => x.status !== 'starting' && x.status !== 'running' && !x.hasStoredToken);
  eq([s.hasStoredToken, s.autostart], [false, false], 'nothing is stored any more');
  if (MF_CONTAINER) {
    const logs = await promisify(execFile)('docker', ['logs', MF_CONTAINER], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    ok(!(logs.stdout + logs.stderr).includes(tunnelToken), 'the token never appeared in the app\'s log');
  }
} finally {
  if (admin) {
    const s = await tunnelGet().catch(() => null);
    if (s?.hasStoredToken || s?.status === 'running' || s?.status === 'starting') await tunnel('forget-token').catch(() => {});
  }
  console.log(`\n  In the Cloudflare dashboard, check that the test tunnel is gone and that the zone has no DNS record ${host} left.`);
}

console.log(`\n  ${checks} checks with a real tunnel from a Cloudflare account.\n\nThe fixed tunnel works.`);

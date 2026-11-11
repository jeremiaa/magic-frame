#!/usr/bin/env node
// A stand-in for cloudflared, for testing the tunnel supervisor
// (src/lib/tunnel/manager.ts) without Cloudflare and without a network.
//
// It speaks the parts of cloudflared the supervisor listens to: the log lines
// on stderr and the /config answer of the metrics server. A fixed tunnel takes
// its scenario from the token — a token is base64 JSON at Cloudflare too, so
// {"scenario":"…"} in base64 looks like one:
//
//   ok            connects; one hostname pointing at `service`
//   no-hostname   connects; no public hostname configured
//   reject        Cloudflare refuses the token
//   crash-once    connects, dies after a moment, works on the next start
//   reconfigure   connects with `service`, then the dashboard changes it to `then`
//   never         starts and never gets a connection (a network that lets nothing out)
//   no-config     connects, but does not answer /config (a cloudflared that cannot be checked)
//   no-service    connects; /config lists a rule without saying where it leads
//
// It also refuses to start when the supervisor breaks one of its own promises:
// the token as an argument, or the app's secrets in the environment.
//
// Point the app at it with MF_CLOUDFLARED_BIN. Never shipped in the image.

import http from 'node:http';
import fs from 'node:fs';

const argv = process.argv.slice(2);
if (argv.includes('--version')) {
  console.log('cloudflared version 2099.1.0-fake (built 2099-01-01-0000 UTC)');
  process.exit(0);
}

const log = (level, msg) => process.stderr.write(`${new Date().toISOString().replace(/\.\d+Z$/, 'Z')} ${level} ${msg}\n`);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const refuse = (why) => {
  log('ERR', `fake cloudflared refuses to start: ${why}`);
  process.exit(2);
};

const mode = argv.includes('run') ? 'token' : argv.includes('--url') ? 'quick' : null;
if (argv[0] !== 'tunnel' || !mode) refuse('unexpected arguments: ' + argv.join(' '));
for (const need of ['--no-autoupdate', '--metrics', '--protocol']) if (!argv.includes(need)) refuse(`${need} is missing`);
if (arg('--protocol') !== 'http2') refuse(`expected --protocol http2, got ${arg('--protocol')}`);
if (!String(arg('--metrics')).startsWith('127.0.0.1:')) refuse('the metrics server must stay on 127.0.0.1');
if (argv.some((a) => a.startsWith('eyJ'))) refuse('the token was passed as an argument — it belongs in TUNNEL_TOKEN');
for (const k of ['DATABASE_URL', 'SESSION_SECRET', 'ADMIN_PASSWORD']) {
  if (process.env[k]) refuse(`${k} leaked into cloudflared's environment`);
}
if (mode === 'quick' && !/^http:\/\/127\.0\.0\.1:\d+$/.test(arg('--url') || '')) refuse('quick tunnel must point at the gate on 127.0.0.1');

let scenario = { scenario: 'ok' };
if (mode === 'token') {
  try {
    scenario = JSON.parse(Buffer.from(process.env.TUNNEL_TOKEN || '', 'base64').toString('utf8'));
  } catch {
    log('ERR', 'failed to parse token');
    process.exit(1);
  }
}

const rules = (service) => [
  ...(scenario.scenario === 'no-hostname' ? [] : [{ hostname: scenario.hostname || 'frame.example.com', service, originRequest: {} }]),
  { service: 'http_status:404', originRequest: {} },
];
let ingress = mode === 'token' ? rules(scenario.service || 'http://127.0.0.1:3001') : [];

const metrics = http.createServer((req, res) => {
  if (req.url === '/config' && scenario.scenario === 'no-config') {
    res.writeHead(404);
    return res.end();
  }
  if (req.url === '/config' && scenario.scenario === 'no-service') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ version: 1, config: { ingress: [{ hostname: 'frame.example.com' }] } }));
  }
  if (req.url === '/config') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ version: 1, config: { ingress, 'warp-routing': { enabled: false } } }));
  }
  res.writeHead(req.url === '/ready' ? 200 : 404);
  res.end();
});

const connected = () => log('INF', 'Registered tunnel connection connIndex=0 connection=fake event=0 ip=198.41.200.13 location=fra01 protocol=quic');

metrics.listen(Number(String(arg('--metrics')).split(':')[1]), '127.0.0.1', () => {
  log('INF', `Starting metrics server on 127.0.0.1:${metrics.address().port}/metrics`);

  if (mode === 'quick') {
    log('INF', 'Thank you for trying Cloudflare Tunnel. Doing so, without a Cloudflare account, is a quick way to experiment and try it out. However, be aware that these account-less Tunnels have no uptime guarantee, are subject to the Cloudflare Online Services Terms of Use (https://www.cloudflare.com/website-terms/), and Cloudflare reserves the right to investigate your use of Tunnels for violations of such terms.');
    log('INF', 'Requesting new quick Tunnel on trycloudflare.com...');
    setTimeout(() => {
      log('INF', '+--------------------------------------------------------------------------------------------+');
      log('INF', '|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |');
      log('INF', '|  https://fake-quick-tunnel.trycloudflare.com                                               |');
      log('INF', '+--------------------------------------------------------------------------------------------+');
      setTimeout(connected, 300);
    }, 300);
    return;
  }

  if (scenario.scenario === 'reject') {
    setTimeout(() => {
      log('ERR', 'Register tunnel error from server side error="Unauthorized: Invalid tunnel secret"');
      process.exit(1);
    }, 200);
    return;
  }

  if (scenario.scenario === 'never') {
    log('INF', 'precheck complete hard_fail=true run_id=fake suggested_protocol=http2');
    return;
  }
  log('INF', 'precheck complete hard_fail=false run_id=fake suggested_protocol=http2');
  log('INF', `Updated to new configuration config="${JSON.stringify({ ingress }).replace(/"/g, '\\"')}" version=1`);
  setTimeout(connected, 300);

  if (scenario.scenario === 'crash-once') {
    const marker = `/tmp/fake-cloudflared-crashed-${scenario.id || 'x'}`;
    if (!fs.existsSync(marker)) {
      fs.writeFileSync(marker, '1');
      setTimeout(() => {
        log('ERR', 'Connection terminated error="failed to dial to edge with quic: timeout: no recent network activity"');
        process.exit(1);
      }, 1500);
    }
  }
  if (scenario.scenario === 'reconfigure') {
    setTimeout(() => {
      ingress = rules(scenario.then || 'http://localhost:3000');
      log('INF', `Updated to new configuration config="${JSON.stringify({ ingress }).replace(/"/g, '\\"')}" version=2`);
    }, scenario.after || 3000);
  }
});

process.on('SIGTERM', () => {
  log('INF', 'Initiating graceful shutdown due to signal terminated ...');
  setTimeout(() => process.exit(0), 100);
});

// What a display may read without a login: what is on a saved view, nothing
// else. Runs inside the app container of a THROWAWAY instance — it rewrites
// the Home Assistant connection, adds test views and an account:
//
//   MF_TEST_EMAIL=… MF_TEST_PASSWORD=… \
//   MF_TEST_HA_URL=http://home.example.com:8199 \
//   MF_TEST_SOURCES=http://news.example.com:8200 \
//   node /opt/mf-test/security/display-reads.mjs
//
// MF_TEST_HA_URL is scripts/demo-ha-stub.mjs, MF_TEST_SOURCES is
// scripts/demo-sources.mjs (its /news.xml and /family.ics), both on the host.
// A stranger runs in this process and notes every request the server sends it.
// With MF_PROBE_OLD=1 it only shows what an older build gives away, and stops.
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const pg = createRequire('/app/package.json')('pg');

const BASE = `http://127.0.0.1:${process.env.PORT || 3000}`;
const { MF_TEST_EMAIL: email, MF_TEST_PASSWORD: password, DATABASE_URL } = process.env;
const HA = (process.env.MF_TEST_HA_URL || 'http://home.example.com:8199').replace(/\/+$/, '');
const SOURCES = (process.env.MF_TEST_SOURCES || 'http://news.example.com:8200').replace(/\/+$/, '');
let checks = 0;
const ok = (c, m) => { checks += 1; assert.ok(c, m); };
const eq = (a, b, m) => { checks += 1; assert.deepEqual(a, b, m); };
const step = (t) => console.log(`\n── ${t}`);

const strangerSeen = [];
const stranger = await new Promise((resolve) => {
  const s = http.createServer((req, res) => {
    strangerSeen.push(req.url);
    res.writeHead(200, { 'content-type': 'application/rss+xml' });
    res.end('<rss><channel><item><title>from inside the home network</title></item></channel></rss>');
  });
  s.listen(0, '127.0.0.1', () => resolve({ server: s, url: `http://127.0.0.1:${s.address().port}` }));
});

const post = (path, body, headers = {}) => fetch(BASE + path, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const get = (path, headers = {}) => fetch(BASE + path, { redirect: 'manual', headers });
const cookieOf = (res) => (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
const login = async (e, p) => cookieOf(await post('/api/auth/login', { email: e, password: p }));
const state = async (ids, headers) => (await get(`/api/ha/state?ids=${encodeURIComponent(ids)}`, headers)).json();

/** The states a live stream hands out within `ms`: its snapshots and its updates. */
async function streamed(ids, headers = {}, ms = 4000) {
  const ac = new AbortController();
  const seen = new Set();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(`${BASE}/api/ha/stream?ids=${encodeURIComponent(ids)}`, { headers, signal: ac.signal });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const line = chunk.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        const msg = JSON.parse(line.slice(6));
        if (msg.type === 'snapshot') for (const k of Object.keys(msg.states || {})) seen.add(k);
        if (msg.type === 'state' && msg.entity?.entity_id) seen.add(msg.entity.entity_id);
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
  } finally {
    clearTimeout(timer);
  }
  return [...seen].sort();
}

const admin = await login(email, password);
ok(admin.length > 0, 'the admin signs in');
const signedIn = { cookie: admin };

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();
const VIEW = 'sec-reads';
const FLUSH = 'sec-reads-flush';
const NEWS = `${SOURCES}/news.xml`;
const ICS = `${SOURCES}/family.ics`;
const ACCOUNT = 'acc-' + crypto.randomBytes(5).toString('hex');
const MODULES = ['custom:sec-f1', 'custom:sec-elsewhere'];
const widgets = [
  ['ha', 'HomeAssistantWidget.tsx', { entities: [{ entityId: 'light.kitchen' }] }],
  ['cam', 'CameraWidget.tsx', { entityId: 'camera.front_door' }],
  // Two feeds in one field, one per line — the way the RSS widget keeps them.
  ['rss', 'RssWidget.tsx', { feeds: `${NEWS}\n${SOURCES}/news.xml?second` }],
  ['cal', 'CalendarWidget.tsx', { feeds: [
    { type: 'ical', url: ICS },
    { type: 'homeassistant', calendarId: 'calendar.family' },
    { type: 'google', accountId: ACCOUNT, calendarId: 'family@group.calendar.google.com' },
  ] }],
];
const flush = () => post('/api/layout/sync', { dashboardId: FLUSH, layout: [] }, signedIn);
async function placeWidgets(list) {
  await db.query(`insert into "Dashboard" (id, name) values ($1, $1) on conflict (id) do nothing`, [VIEW]);
  await db.query(`delete from "Widget" where "dashboardId" = $1`, [VIEW]);
  for (const [key, type, config] of list) {
    await db.query(`insert into "Widget" (id, type, config, x, y, w, h, "dashboardId") values ($1, $2, $3::jsonb, 0, 0, 4, 4, $4)`,
      [`${VIEW}_${key}`, type, JSON.stringify(config), VIEW]);
  }
  // Saving any view drops the cached list of what is on the views.
  eq((await flush()).status, 200, 'saving a view refreshes the list of what is on the views');
}

let viewer = null;
try {
  step('the Home Assistant stand-in');
  let r = await post('/api/settings', { haUrl: HA, haToken: 'stub-token-' + crypto.randomBytes(4).toString('hex') }, signedIn);
  eq(r.status, 200, 'an admin points Home Assistant at the stand-in');
  await placeWidgets(widgets);

  if (process.env.MF_PROBE_OLD) {
    // Against a build from before the fix: show what is given away, then stop.
    const s = await state('person.alex,lock.front_door,..');
    console.log(`state without a login: ${Object.keys(s).join(', ') || 'nothing'}${s['..'] ? ` — and "..": ${JSON.stringify(s['..'])}` : ''}`);
    r = await get('/api/ha/entities');
    console.log(`entity list without a login: ${r.status} ${r.status === 200 ? `(${(await r.json()).entities?.length} entities)` : ''}`);
    r = await get('/api/ha/camera/camera.bedroom/snapshot');
    console.log(`a camera on no view, without a login: ${r.status} ${r.headers.get('content-type')}`);
    await get(`/api/rss?url=${encodeURIComponent(stranger.url + '/rss')}`);
    await get(`/api/calendar?url=${encodeURIComponent(stranger.url + '/cal.ics')}`);
    console.log(`the server fetched for a stranger: ${strangerSeen.join(', ') || 'nothing'}`);
    process.exitCode = 3;
    throw new Error('probe only');
  }

  step('states without a login');
  let s = await state('light.kitchen,person.alex,lock.front_door');
  eq(Object.keys(s), ['light.kitchen'], 'only the entity on a view comes back — no location, no lock');
  eq(s['light.kitchen']?.entity_id, 'light.kitchen', '…and that one with its real state');
  s = await state('..,../config,light.kitchen/../..');
  eq(s, {}, 'an id that is not shaped like one never reaches Home Assistant (no way out of /api/states)');
  s = await state('person.alex,..', signedIn);
  eq(Object.keys(s), ['person.alex'], 'signed in, any entity reads — but the path trick still not');
  r = await get('/api/ha/state?entityId=lock.front_door');
  eq(await r.json(), {}, 'the old single-entity form is limited the same way');

  step('the live stream');
  eq(await streamed('light.kitchen,person.alex'), ['light.kitchen'], 'without a login it carries only the entity on a view');
  eq(await streamed('', {}, 2500), [], 'no ids means nothing — it used to mean every change in the house');
  eq(await streamed('person.alex', signedIn), ['person.alex'], 'signed in, it carries what is asked for');

  step('history, cameras, artwork');
  r = await get('/api/ha/history?entityId=person.alex');
  eq(r.status, 403, 'the history of an entity on no view: refused');
  r = await get('/api/ha/history?entityId=light.kitchen');
  eq(r.status, 200, 'the history of an entity on a view: served');
  r = await get('/api/ha/camera/camera.bedroom/snapshot');
  eq(r.status, 403, 'a camera on no view: no picture');
  r = await get('/api/ha/camera/camera.front_door/snapshot');
  eq([r.status, r.headers.get('content-type')], [200, 'image/png'], 'the camera on a view: its picture');
  for (const path of ['/api/ha/camera/camera.bedroom/stream']) {
    r = await get(path);
    eq(r.status, 403, `${path}: refused`);
  }
  r = await post('/api/ha/camera/camera.bedroom/webrtc', { offer: 'v=0' });
  eq(r.status, 403, 'WebRTC for a camera on no view: refused');
  r = await get('/api/ha/camera/camera.bedroom/snapshot', signedIn);
  eq(r.status, 200, 'signed in, the editor previews any camera');
  r = await get('/api/ha/media/media_player.bedroom/artwork');
  eq(r.status, 403, 'the artwork of a player on no view: refused');

  step('the entity list');
  r = await get('/api/ha/entities', signedIn);
  eq(r.status, 200, 'signed in, the entity picker gets its list');
  const full = ((await r.json()).entities || []).map((e) => e.entity_id);
  ok(full.length > 10 && full.includes('person.alex'), `…all of it (${full.length})`);
  r = await get('/api/ha/entities');
  const listed = ((await r.json()).entities || []).map((e) => e.entity_id);
  // Another view on this instance (a demo seed) may show more; this one shows three.
  const elsewhere = async (id) => (await db.query(`select 1 from "Widget" where config::text like $1 and "dashboardId" <> $2 limit 1`, [`%${id}%`, VIEW])).rowCount > 0;
  ok(r.status === 200 && ['light.kitchen', 'camera.front_door', 'calendar.family'].every((id) => listed.includes(id)),
    'without a login: what is on a view is listed');
  ok(listed.length < full.length && (!listed.includes('person.alex') || (await elsewhere('person.alex'))),
    `…and nothing else (${listed.length} of ${full.length}) — it used to be every entity in the house`);

  step('notifications');
  r = await get('/api/ha/notifications');
  eq(r.status, 403, 'without a notifications tile on any view: refused');
  await placeWidgets([...widgets, ['note', 'HANotificationWidget.tsx', {}]]);
  r = await get('/api/ha/notifications');
  ok(r.status !== 403, `with a notifications tile on a view: let through (${r.status})`);

  step('RSS');
  strangerSeen.length = 0;
  r = await get(`/api/rss?url=${encodeURIComponent(stranger.url + '/rss')}`);
  eq(r.status, 403, 'an address on no view: refused');
  eq(strangerSeen.length, 0, '…and the server never goes there');
  r = await get(`/api/rss?urls=${encodeURIComponent(`${NEWS}\n${stranger.url}/rss`)}`);
  eq([r.status, strangerSeen.length], [403, 0], 'one feed on a view does not carry a stranger along');
  r = await get(`/api/rss?urls=${encodeURIComponent(`${NEWS}\n${SOURCES}/news.xml?second`)}`);
  eq(r.status, 200, 'the feeds of the widget, both lines of its field: served');
  ok(((await r.json()).items || []).length > 0, '…with their items');
  r = await get(`/api/rss?url=${encodeURIComponent(stranger.url + '/rss')}`, signedIn);
  eq([r.status, strangerSeen.length], [200, 1], 'signed in, the editor previews a feed before it is saved');

  step('calendars');
  const cal = async (feeds, headers) => (await get(`/api/calendar?feeds=${encodeURIComponent(JSON.stringify(feeds))}&days=30&limit=50`, headers)).json();
  strangerSeen.length = 0;
  let c = await cal([{ type: 'ical', url: `${stranger.url}/cal.ics` }]);
  eq([c.feeds?.[0]?.error, strangerSeen.length], ['not_on_a_view', 0], 'an iCal address on no view: refused, never fetched');
  c = await cal([{ type: 'ical', url: ICS }]);
  ok(!c.feeds?.[0]?.error && c.events.length > 0, `the iCal feed on a view: its events (${c.events.length})`);
  r = await get(`/api/calendar?url=${encodeURIComponent(`${stranger.url}/cal.ics`)}`);
  eq([(await r.json()).feeds?.[0]?.error, strangerSeen.length], ['not_on_a_view', 0], 'the single-address form is limited the same way');
  c = await cal([{ type: 'homeassistant', calendarId: 'calendar.school_holidays' }]);
  eq(c.feeds?.[0]?.error, 'not_on_a_view', 'a Home Assistant calendar on no view: refused');
  c = await cal([{ type: 'homeassistant', calendarId: 'calendar.family' }]);
  ok(!c.feeds?.[0]?.error, 'the Home Assistant calendar on a view: let through');
  c = await cal([{ type: 'google', accountId: ACCOUNT, calendarId: 'primary' }]);
  eq(c.feeds?.[0]?.error, 'not_on_a_view', 'the account of a widget, but another of its calendars: refused');
  c = await cal([{ type: 'google', accountId: 'acc-nobody-knows', calendarId: 'family@group.calendar.google.com' }]);
  eq(c.feeds?.[0]?.error, 'not_on_a_view', 'an account on no view: refused');
  c = await cal([{ type: 'google', accountId: ACCOUNT, calendarId: 'family@group.calendar.google.com' }]);
  ok(c.feeds?.[0]?.error !== 'not_on_a_view', `the account and calendar of the widget: let through (${c.feeds?.[0]?.error || 'ok'})`);
  c = await cal([{ type: 'ical', url: `${stranger.url}/cal.ics` }], signedIn);
  eq([c.feeds?.[0]?.error, strangerSeen.length], [undefined, 1], 'signed in, the calendar inspector tries an address before it is saved');

  step('Todoist and the list pickers');
  // Todoist itself is not reachable from here, so this checks the doors, not
  // the lists: what is refused before Todoist is ever asked.
  r = await get('/api/todoist/projects');
  ok(r.status !== 200 || ((await r.json()).projects || []).length === 0, `the Todoist project list names nothing a view does not show (${r.status})`);
  r = await get('/api/todoist/tasks/projectOnNoView');
  eq(r.status, 403, 'the tasks of a project on no view: refused');
  r = await fetch(`${BASE}/api/todoist/tasks/projectOnNoView?taskId=123`, { method: 'DELETE' });
  eq(r.status, 403, 'deleting a task of a project on no view: refused');
  r = await fetch(`${BASE}/api/todoist/tasks/projectOnNoView`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ taskId: '123', action: 'close' }) });
  eq(r.status, 403, 'closing one: refused');
  r = await fetch(`${BASE}/api/todoist/tasks/projectOnNoView`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: 'x' }) });
  eq(r.status, 403, 'adding one: refused');
  r = await get('/api/ha-lists');
  let lists = (await r.json()).lists?.map((l) => l.entityId) || [];
  ok(r.status === 200 && (!lists.includes('todo.shopping') || (await elsewhere('todo.shopping'))), 'the to-do lists of Home Assistant: a list on no view is not named');
  await placeWidgets([...widgets,
    ['todo', 'TodosWidget.tsx', { listSource: 'todoist', todoistProjectId: 'projectOnAView' }],
    ['shop', 'ShoppingListWidget.tsx', { listSource: 'ha', haListEntity: 'todo.shopping' }]]);
  r = await get('/api/todoist/tasks/projectOnAView');
  ok(r.status !== 403, `the project a widget shows: let through to Todoist (${r.status})`);
  r = await get('/api/ha-lists');
  lists = (await r.json()).lists?.map((l) => l.entityId) || [];
  ok(lists.includes('todo.shopping'), '…the list a widget shows: named');
  r = await get('/api/ha-lists', signedIn);
  eq(r.status, 200, '…signed in, the picker gets them all');

  step('custom modules (#147)');
  // A module keeps its settings in its own format, and its code can name an
  // entity outright. Up to 1.5.14 a display without a login was refused all of
  // it, while the editor (signed in) showed the tile fine.
  const F1_ICS = `${SOURCES}/family.ics?from-a-module`;
  const upload = (type, fields, code) => post('/api/admin/modules', {
    manifest: { type, label: type, fields },
    bundleJs: `window.MagicFrame.registerWidget({type:"custom:${type}",render:function(e){${code}return null}});`,
  }, signedIn);
  await db.query(`delete from "CustomModule" where type = any($1)`, [MODULES]);
  c = await cal([{ type: 'ical', url: F1_ICS }]);
  eq(c.feeds?.[0]?.error, 'not_on_a_view', 'before: the address is on no view');
  s = await state('sensor.solar_power,sensor.study_co2');
  eq(Object.keys(s), [], 'before: neither sensor is on a view');
  r = await upload('sec-f1', [{ key: 'calendars', label: 'Calendars', type: 'textarea' }],
    'e.fetch(`/api/ha/notifications?limit=${5}`);var S="sensor.solar_power";');
  eq(r.status, 200, 'an admin uploads a module whose code names a sensor and calls the notifications route');
  const f1 = (await r.json()).module;
  r = await upload('sec-elsewhere', [], 'var S="sensor.study_co2";');
  eq(r.status, 200, '…and another one, which goes on no view');
  s = await state('sensor.solar_power');
  eq(Object.keys(s), [], 'a module on no view opens nothing, not even what its code names');
  r = await get('/api/ha/notifications');
  eq(r.status, 403, '…nor the notifications its code calls');
  await placeWidgets([...widgets, ['f1', 'custom:sec-f1', {
    calendars: `calendar.school_holidays|#e10600|Holidays\nF1 races|${F1_ICS}|#e10600`,
  }]]);
  c = await cal([{ type: 'homeassistant', calendarId: 'calendar.school_holidays' }]);
  ok(!c.feeds?.[0]?.error && c.events.length > 0,
    `a calendar on a line of the module's settings, with a colour and a label: its events (${c.events.length}, ${c.feeds?.[0]?.error || 'ok'})`);
  c = await cal([{ type: 'ical', url: F1_ICS }]);
  ok(!c.feeds?.[0]?.error && c.events.length > 0, `an address inside such a line: its events (${c.events.length})`);
  s = await state('sensor.solar_power,sensor.study_co2');
  eq(Object.keys(s), ['sensor.solar_power'], 'the sensor its code names reads; the one only a module on no view names does not');
  r = await get('/api/ha/notifications');
  ok(r.status !== 403, `the notifications its code calls, with no notifications tile anywhere: let through (${r.status})`);
  r = await get('/api/ha/history?entityId=sensor.study_co2');
  eq(r.status, 403, 'what no module on a view names: still refused');
  r = await fetch(`${BASE}/api/admin/modules/${f1.id}`, { method: 'PATCH', headers: { ...signedIn, 'content-type': 'application/json' }, body: JSON.stringify({ enabled: false }) });
  eq(r.status, 200, 'the admin switches the module off');
  s = await state('sensor.solar_power');
  eq(Object.keys(s), [], '…its code runs nowhere now, and what it names is refused again at once');

  step('a deleted account');
  const vEmail = `viewer-${crypto.randomBytes(4).toString('hex')}@example.com`;
  const vPass = crypto.randomBytes(12).toString('base64url');
  r = await post('/api/admin/users', { email: vEmail, password: vPass, role: 'viewer' }, signedIn);
  eq(r.status, 200, 'an admin adds a viewer');
  viewer = (await r.json()).user;
  const vCookie = await login(vEmail, vPass);
  ok(vCookie.length > 0, 'the viewer signs in');
  r = await get('/api/auth/me', { cookie: vCookie });
  eq((await r.json()).user?.email, vEmail, '…and is signed in');
  r = await fetch(`${BASE}/api/admin/users/${viewer.id}`, { method: 'DELETE', headers: signedIn });
  eq(r.status, 200, 'the admin deletes the viewer');
  viewer = null;
  r = await get('/api/auth/me', { cookie: vCookie });
  eq((await r.json()).user, null, 'the old cookie names nobody any more — at once, not after 30 days');
  r = await get('/api/admin/users', { cookie: vCookie });
  eq(r.status, 401, '…and opens nothing that needs a login');
  r = await get('/api/ha/entities', { cookie: vCookie });
  const asNobody = ((await r.json()).entities || []).map((e) => e.entity_id);
  ok(!asNobody.includes('person.alex') || (await elsewhere('person.alex')), '…the entity list treats it like nobody signed in');

  console.log(`\nAll ${checks} checks passed.`);
} finally {
  if (viewer?.id) await db.query(`delete from "User" where id = $1`, [viewer.id]).catch(() => {});
  await db.query(`delete from "CustomModule" where type = any($1)`, [MODULES]).catch(() => {});
  await db.query(`delete from "Dashboard" where id = any($1)`, [[VIEW, FLUSH]]).catch(() => {});
  await flush().catch(() => {});
  await db.query(`delete from "Dashboard" where id = $1`, [FLUSH]).catch(() => {});
  await db.end();
  stranger.server.close();
}

// Recurring iCal series through the running app: old series show (#146), and
// a series that repeats every minute or second cannot stall the server.
// Runs inside the app container of a THROWAWAY instance; it only reads:
//
//   MF_TEST_EMAIL=… MF_TEST_PASSWORD=… node /opt/mf-test/calendar/recurring.mjs
//
// The feeds are served from this process. Signed in, so no view is needed.
import assert from 'node:assert/strict';
import http from 'node:http';

const BASE = `http://127.0.0.1:${process.env.PORT || 3000}`;
const { MF_TEST_EMAIL: email, MF_TEST_PASSWORD: password } = process.env;
let checks = 0;
const ok = (c, m) => { checks += 1; assert.ok(c, m); };
const eq = (a, b, m) => { checks += 1; assert.deepEqual(a, b, m); };
const step = (t) => console.log(`\n── ${t}`);

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};
// The Monday of the week two years ago, at six in the evening, Berlin time.
const monday = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
})();
const TZ = ['BEGIN:VTIMEZONE', 'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE'];
const ev = (uid, ...lines) => ['BEGIN:VEVENT', `UID:${uid}`, ...lines, 'END:VEVENT'];
const cal = (...events) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//mf-test//EN', ...TZ, ...events.flat(), 'END:VCALENDAR', ''].join('\r\n');
const weekly = ev('weekly@test', `DTSTART;TZID=Europe/Berlin:${monday}T180000`, `DTEND;TZID=Europe/Berlin:${monday}T193000`, 'RRULE:FREQ=WEEKLY;BYDAY=MO', 'SUMMARY:Football practice');
const daily = ev('daily@test', `DTSTART;VALUE=DATE:${day(-60)}`, `DTEND;VALUE=DATE:${day(-59)}`, 'RRULE:FREQ=DAILY', 'SUMMARY:Daily reminder');
const oneoff = ev('oneoff@test', `DTSTART;TZID=Europe/Berlin:${day(3)}T100000`, `DTEND;TZID=Europe/Berlin:${day(3)}T110000`, 'SUMMARY:Dentist');
const moved = [
  ev('standup@test', `DTSTART;TZID=Europe/Berlin:${monday}T080000`, `DTEND;TZID=Europe/Berlin:${monday}T083000`, 'RRULE:FREQ=WEEKLY;BYDAY=MO', 'SUMMARY:Standup'),
];
const minutely = ev('minutely@test', 'DTSTART:20200101T000000Z', 'DTEND:20200101T000100Z', 'RRULE:FREQ=MINUTELY', 'SUMMARY:Every minute');
const secondly = ev('secondly@test', 'DTSTART:19700101T000000Z', 'DTEND:19700101T000001Z', 'RRULE:FREQ=SECONDLY', 'SUMMARY:Every second');
const FEEDS = {
  '/old-series.ics': cal(weekly, daily, oneoff, ...moved),
  '/runaway.ics': cal(secondly, minutely, weekly, oneoff),
};
const server = await new Promise((resolve) => {
  const s = http.createServer((req, res) => {
    const body = FEEDS[new URL(req.url, 'http://x').pathname];
    res.writeHead(body ? 200 : 404, { 'content-type': 'text/calendar' });
    res.end(body || '');
  });
  s.listen(0, '127.0.0.1', () => resolve(s));
});
const feedUrl = (p) => `http://127.0.0.1:${server.address().port}${p}`;

const login = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
ok(cookie.length > 0, 'signed in');

const ask = async (path, limit, extra = '') => {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/calendar?url=${encodeURIComponent(feedUrl(path))}&limit=${limit}&days=30${extra}`, { headers: { cookie } });
  const data = await r.json();
  const by = {};
  for (const e of data.events || []) by[e.title] = (by[e.title] || 0) + 1;
  return { status: r.status, by, total: (data.events || []).length, ms: Date.now() - t0, error: data.feeds?.[0]?.error };
};

try {
  step('series that started long ago');
  let a = await ask('/old-series.ics', 5);
  eq([a.status, a.error, a.total], [200, undefined, 5], `the list of five is full (${JSON.stringify(a.by)}) — it used to hold only the one-off`);
  ok((a.by['Daily reminder'] || 0) >= 3, '…the daily series since two months is in it');
  a = await ask('/old-series.ics', 60);
  ok((a.by['Football practice'] || 0) >= 4, `a weekly series since two years: every Monday of the month (${a.by['Football practice'] || 0})`);
  ok((a.by['Daily reminder'] || 0) >= 29, `the daily series: every day (${a.by['Daily reminder'] || 0})`);
  ok((a.by.Standup || 0) >= 4, `a second weekly series from the same feed too (${a.by.Standup || 0})`);
  eq(a.by.Dentist, 1, 'the one-off stays once');
  a = await ask('/old-series.ics', 500);
  ok((a.by['Football practice'] || 0) >= 4 && (a.by['Daily reminder'] || 0) >= 29, 'the agenda and month size (500) see the same');

  step('a series that repeats every second since 1970');
  a = await ask('/runaway.ics', 10);
  eq(a.status, 200, 'the server answers');
  ok(a.ms < 10_000, `…in ${a.ms} ms, not never`);
  ok((a.by['Football practice'] || 0) >= 1 && a.by.Dentist === 1, `…and the rest of the feed comes through (${JSON.stringify(a.by)})`);
  eq([a.by['Every second'], a.by['Every minute']], [undefined, undefined], 'the runaway series are left out');
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } });
  ok(r.status === 200 && Date.now() - t0 < 2000, 'and the server is free for the next request');

  console.log(`\nAll ${checks} checks passed.`);
} finally {
  server.close();
}

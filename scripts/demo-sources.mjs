// Fake calendar, Immich and news feed, for wiki screenshots.
//
//   node scripts/demo-sources.mjs [port]     # default 8200
//
// Companion to scripts/demo-ha-stub.mjs. Together they supply everything a
// Magic Frame screenshot needs from outside itself, so no picture ever contains
// somebody's real calendar, real photos or real home.
//
// It serves:
//   GET /family.ics                     an invented week
//   GET /news.xml                       an invented feed
//   GET /api/albums                     Immich albums
//   GET /api/people?…                   Immich people
//   POST /api/search/metadata           Immich asset search
//   GET /api/assets/<id>/thumbnail      a generated picture
//   GET /api/people/<id>/thumbnail      a generated face
//
// The pictures are generated gradients rather than photographs. That is a
// deliberate choice: the shots that use them are about the frame, the fit mode
// and the picker, and an abstract image demonstrates "portrait photo in a wide
// tile" perfectly while removing every question about whose photo it is.

import { createServer } from 'node:http';
import { deflateSync, crc32 } from 'node:zlib';

const PORT = Number(process.argv[2] ?? 8200);

// ---- the invented week -----------------------------------------------------
//
// Dates are relative to today so the calendar always looks current: a wiki
// screenshot showing an empty week because the fixture expired is worse than
// no screenshot.

const pad = (n) => String(n).padStart(2, '0');
const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const dayOnly = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
const plusDays = (n, h = 0, m = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(h, m, 0, 0);
  return d;
};

const EVENTS = [
  { day: 0, from: [16, 0], to: [17, 0], title: 'Swimming lesson', where: 'Leisure centre' },
  { day: 0, from: [19, 30], to: [21, 0], title: 'Book club' },
  { day: 1, from: [8, 30], to: [9, 15], title: 'Dentist', where: 'High Street' },
  { day: 1, allDay: true, title: 'Bin day — recycling' },
  { day: 2, from: [12, 0], to: [13, 0], title: 'Lunch with Sam' },
  { day: 3, from: [17, 30], to: [19, 0], title: 'Football training' },
  { day: 4, allDay: true, title: 'School trip' },
  { day: 5, from: [10, 0], to: [12, 0], title: 'Farmers market' },
  { day: 6, from: [14, 0], to: [16, 0], title: "Grandma's birthday", where: 'Elm Road' },
  { day: 9, allDay: true, title: 'Half term starts' },
  { day: 12, from: [9, 0], to: [10, 0], title: 'Car service' },
];

function ics() {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Magic Frame//demo//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Family'];
  EVENTS.forEach((e, i) => {
    lines.push('BEGIN:VEVENT', `UID:demo-${i}@example.com`, `DTSTAMP:${stamp(new Date())}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${dayOnly(plusDays(e.day))}`, `DTEND;VALUE=DATE:${dayOnly(plusDays(e.day + 1))}`);
    } else {
      lines.push(`DTSTART:${stamp(plusDays(e.day, ...e.from))}`, `DTEND:${stamp(plusDays(e.day, ...e.to))}`);
    }
    lines.push(`SUMMARY:${e.title}`);
    if (e.where) lines.push(`LOCATION:${e.where}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

const NEWS = [
  ['Council approves new cycle path along the river', 'Work starts in the spring and should finish before the summer holidays.'],
  ['Library extends opening hours on Saturdays', 'The reading room now stays open until six.'],
  ['Weather: a mild week ahead', 'No frost expected before the weekend.'],
  ['Village fete returns in June', 'Volunteers are wanted for the cake stall.'],
];

const rss = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Local news</title><link>http://example.com</link><description>An invented feed</description>` +
  NEWS.map(([t, d], i) => `<item><title>${t}</title><link>http://example.com/${i}</link><description>${d}</description><pubDate>${new Date(Date.now() - i * 3600e3).toUTCString()}</pubDate></item>`).join('') +
  `</channel></rss>`;

// ---- generated pictures ----------------------------------------------------
//
// A minimal PNG encoder — no dependency, and the shapes are all we need.

function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x / width, y / height);
      raw[o++] = r; raw[o++] = g; raw[o++] = b;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A soft two-colour wash, different per id so a slideshow visibly changes. */
const photo = (id, w, h) => {
  let s = 0;
  for (const c of String(id)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const hue = s % 360;
  const rgb = (deg, l) => {
    const f = (n) => {
      const k = (n + deg / 30) % 12;
      const a = 0.42 * Math.min(l, 1 - l);
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return [f(0), f(8), f(4)];
  };
  return png(w, h, (u, v) => {
    const t = (u * 0.35 + v * 0.65);
    const [r, g, b] = rgb(hue + t * 40, 0.30 + t * 0.42);
    return [r, g, b];
  });
};

const ALBUMS = [
  { id: 'alb-family', albumName: 'Family 2026', assetCount: 428 },
  { id: 'alb-holiday', albumName: 'Holiday — Cornwall', assetCount: 193 },
  { id: 'alb-garden', albumName: 'The garden', assetCount: 76 },
  { id: 'alb-kids', albumName: 'Kids — school year', assetCount: 611 },
];

const PEOPLE = [
  { id: 'per-alex', name: 'Alex' },
  { id: 'per-sam', name: 'Sam' },
  { id: 'per-robin', name: 'Robin' },
  { id: 'per-jo', name: 'Jo' },
  { id: 'per-charlie', name: 'Charlie' },
  { id: 'per-morgan', name: 'Morgan' },
];

const asset = (i) => ({
  id: `asset-${i}`,
  type: 'IMAGE',
  originalFileName: `photo-${i}.jpg`,
  fileCreatedAt: new Date(Date.now() - i * 86400e3).toISOString(),
  exifInfo: {
    dateTimeOriginal: new Date(Date.now() - i * 86400e3).toISOString(),
    city: ['Bristol', 'Bath', 'Wells', 'Frome'][i % 4],
    country: 'United Kingdom',
    make: 'Apple', model: 'iPhone 15 Pro',
    // Every third one portrait, so auto split view has pairs to make.
    exifImageWidth: i % 3 === 0 ? 3024 : 4032,
    exifImageHeight: i % 3 === 0 ? 4032 : 3024,
    orientation: 1,
  },
});

const json = (res, body, status = 200) => {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
};
const send = (res, type, body) => {
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
};

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  if (p === '/family.ics') return send(res, 'text/calendar; charset=utf-8', ics());
  if (p === '/news.xml') return send(res, 'application/rss+xml; charset=utf-8', rss());

  if (p === '/api/albums') return json(res, ALBUMS.map((a) => ({ ...a, assets: [] })));

  // Immich >= 3.0 answers the album detail without assets, so the caller falls
  // back to the metadata search. Both paths have to exist or the widget 404s.
  const alb = p.match(/^\/api\/albums\/([^/]+)$/);
  if (alb) {
    const a = ALBUMS.find((x) => x.id === alb[1]);
    return a ? json(res, { ...a, assets: [] }) : json(res, { message: 'Album not found.' }, 404);
  }
  if (p === '/api/people') return json(res, { people: PEOPLE.map((x) => ({ ...x, isHidden: false, thumbnailPath: '' })), total: PEOPLE.length, hasNextPage: false, hidden: 0 });

  if (p === '/api/search/metadata' && req.method === 'POST') {
    const items = Array.from({ length: 24 }, (_, i) => asset(i));
    return json(res, { assets: { items, count: items.length, nextPage: null } });
  }

  const m = p.match(/^\/api\/assets\/([^/]+)\/thumbnail/);
  if (m) {
    const portrait = /-(\d+)$/.test(m[1]) && Number(RegExp.$1) % 3 === 0;
    return send(res, 'image/png', photo(m[1], portrait ? 360 : 640, portrait ? 640 : 360));
  }

  const f = p.match(/^\/api\/people\/([^/]+)\/thumbnail/);
  if (f) return send(res, 'image/png', photo(f[1], 160, 160));

  json(res, { message: 'Not found.' }, 404);
}).listen(PORT, () => {
  console.log(`fake calendar / Immich / news on http://127.0.0.1:${PORT}`);
  console.log(`  ${EVENTS.length} invented events, ${ALBUMS.length} albums, ${PEOPLE.length} named people`);
});

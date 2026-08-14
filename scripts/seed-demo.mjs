// Fills a throwaway instance with an invented household, for wiki screenshots.
//
//   DATABASE_URL=… node scripts/seed-demo.mjs
//
// Run it inside the throwaway app container, which already has `pg` and the
// connection string:
//
//   docker cp scripts/seed-demo.mjs mfshoot-app-1:/tmp/seed.mjs
//   docker exec mfshoot-app-1 node /tmp/seed.mjs
//
// Why invented content rather than a real instance: a screenshot is published
// forever and cannot be taken back. A real household's entity names, room
// names, calendar entries and photos are not ours to publish — and a real
// instance also gives different values every time a shot is retaken, so every
// picture would slowly stop matching its own caption.
//
// The household here is deliberately ordinary and deliberately nobody's.
//
// Two companion stubs provide what would otherwise come from outside:
//   scripts/demo-ha-stub.mjs   a fake Home Assistant
//   scripts/demo-sources.mjs   a fake calendar feed and a fake Immich

import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const q = (text, params) => pool.query(text, params);

// The stubs run on the host; from inside the container that is host.docker.internal.
// Documentation-safe names, mapped to the host in the shooting compose file.
// Widgets print the source host in the picture — the RSS widget puts it above
// the headline — and an internal hostname in a published screenshot is exactly
// what the wiki check forbids.
const HA = process.env.DEMO_HA_URL ?? 'http://home.example.com:8199';
const SOURCES = process.env.DEMO_SOURCES_URL ?? 'http://photos.example.com:8200';
const NEWS = process.env.DEMO_NEWS_URL ?? 'http://news.example.com:8200';

/** Widgets are positioned on the 24 × 24 grid the editor and the view share. */
const widget = (type, x, y, w, h, config = {}, bgOpacity = 0.2) => ({ type, x, y, w, h, config, bgOpacity });

const WALLPAPER_PHOTO = {
  source: 'bundled',
  fit: 'cover',
  intervalSec: 45,
  showMetadata: false,
  transitionEffect: 'crossfade',
};

// ── the dashboards ──────────────────────────────────────────────────────────
//
// Two kinds. `home` and `split` are photographed whole — they show what a
// finished screen looks like. The rest hold exactly ONE widget each, so a shot
// can crop to `.react-grid-item` and get that widget alone, sharp and centred.
// react-grid-layout writes no id onto its items, so one-widget dashboards are
// what makes a stable crop possible at all.

// Sizes are tuned against the 1280 × 800 shooting viewport: one grid row is
// about 31 px there, one column about 53. A widget whose content overflows its
// box gets clipped in the picture, and a clipped picture teaches the wrong
// thing — so these are deliberately roomier than a real household would need.
const CLOCK = { fontSize: 18, responsiveText: true, showMiniWeather: true, location: 'Bristol', lat: '51.4545', lon: '-2.5879', showHumidity: true, showWind: true, iconSet: '3d', hideSeconds: true };
const WEATHER = { location: 'Bristol', lat: '51.4545', lon: '-2.5879', iconSet: '3d', showHumidity: true, showWind: true, showUv: true, responsiveText: true, fontSize: 15 };

const DASHBOARDS = [
  {
    id: 'home',
    name: 'Kitchen',
    wallpaper: WALLPAPER_PHOTO,
    widgets: [
      widget('ClockWidget.tsx', 1, 1, 10, 6, CLOCK, 0),
      widget('WeatherWidget.tsx', 13, 1, 10, 7, WEATHER, 0.25),
      widget('CalendarWidget.tsx', 13, 9, 10, 12, { feeds: [{ type: 'ical', url: `${SOURCES}/family.ics`, color: '#38bdf8', name: 'Family' }], calendarView: 'agenda', days: 4, design: 'cards', responsiveText: true, fontSize: 14 }, 0.25),
      widget('HomeAssistantWidget.tsx', 1, 12, 11, 11, {
        responsiveText: true,
        // The entity widget sizes its rows off the container width (cqw), so a
        // wide box with a large font shows one row and hides the rest. Small
        // enough that all three fit is what makes the picture match its caption.
        fontSize: 7,
        entities: [
          { entityId: 'light.living_room', name: 'Living room' },
          { entityId: 'light.kitchen', name: 'Kitchen' },
          { entityId: 'lock.front_door', name: 'Front door' },
        ],
      }, 0),
    ],
  },
  {
    // Hochformat in einem Querformat-Rahmen: zeigt, was der weiche Rand tut.
    id: 'blurfit',
    name: 'Blur fit',
    wallpaper: { source: 'immich', immichMode: 'album', immichAlbumId: 'alb-family', fit: 'blur', intervalSec: 90, showMetadata: false },
    widgets: [],
  },
  {
    // Bildinfo unten: Datum, Ort, Kamera.
    id: 'infobar',
    name: 'Photo info',
    wallpaper: { source: 'immich', immichMode: 'album', immichAlbumId: 'alb-family', fit: 'cover', intervalSec: 90,
                 showMetadata: true, metaShowDate: true, metaShowLocation: true, metaShowCamera: true,
                 metaPosition: 'right', metaFontSize: 12, metaBgOpacity: 45, showTimer: true },
    widgets: [],
  },
  {
    // Unerreichbare Bildquelle — der Bildschirm bleibt schwarz, die Widgets bleiben.
    id: 'blackbg',
    name: 'Source down',
    wallpaper: { source: 'immich', immichMode: 'album', immichAlbumId: 'does-not-exist',
                 immichUrl: 'http://photos.example.com:8299', immichApiKey: 'wrong', fit: 'cover' },
    widgets: [
      widget('ClockWidget.tsx', 1, 1, 10, 6, CLOCK, 0),
      widget('CalendarWidget.tsx', 13, 1, 10, 12, { feeds: [{ type: 'ical', url: `${SOURCES}/family.ics`, color: '#38bdf8', name: 'Family' }], calendarView: 'agenda', days: 3, design: 'cards', responsiveText: true, fontSize: 14 }, 0.25),
    ],
  },
  {
    id: 'split',
    name: 'Photo frame',
    wallpaper: { source: 'immich', immichMode: 'album', immichAlbumId: 'alb-family', intervalSec: 90, splitMode: 'auto', fit: 'blur', showMetadata: true, metaShowDate: true, metaShowLocation: true, metaPosition: 'right', metaFontSize: 11 },
    widgets: [],
  },
];

/** One widget per dashboard, for cropped shots. id → [type, config, size]. */
const SOLO = {
  'w-clock': ['ClockWidget.tsx', CLOCK, [10, 6]],
  'w-weather': ['WeatherWidget.tsx', WEATHER, [12, 9]],
  'w-environment': ['EnvironmentWidget.tsx', { lat: '51.4545', lon: '-2.5879', showAqi: true, showPm25: true, showPm10: true, showPollen: true, hidePollenZero: true, showUv: true, showWind: true }, [14, 8]],
  'w-calendar-month': ['CalendarWidget.tsx', { feeds: [{ type: 'ical', url: `${SOURCES}/family.ics`, color: '#38bdf8', name: 'Family' }], calendarView: 'month', design: 'cards' }, [16, 14]],
  'w-calendar-agenda': ['CalendarWidget.tsx', { feeds: [{ type: 'ical', url: `${SOURCES}/family.ics`, color: '#38bdf8', name: 'Family' }], calendarView: 'agenda', days: 4, design: 'cards' }, [12, 12]],
  // The entity and sensor widgets name a row's caption `label`, not `name`, and
  // the entity widget sizes rows off the container WIDTH — a wide box with a
  // normal font shows one row and hides the rest, so these run small.
  'w-ha-entity': ['HomeAssistantWidget.tsx', { fontSize: 7, entities: [
    { entityId: 'light.living_room', label: 'Living room' },
    { entityId: 'switch.coffee_machine', label: 'Coffee machine' },
    { entityId: 'lock.front_door', label: 'Front door' },
    { entityId: 'cover.garage', label: 'Garage' },
  ] }, [12, 12]],
  'w-ha-notification': ['HANotificationWidget.tsx', { source: 'rules', fontSize: 8, rules: [
    { entityId: 'binary_sensor.washing_machine', triggerState: 'on', message: 'Washing machine running', icon: 'mdi:washing-machine', color: '#008cb4', quitMode: 'entity' },
    { entityId: 'input_boolean.feed_the_cat', triggerState: 'on', message: 'Feed the cat', icon: 'mdi:cat', color: '#f43f5e', quitMode: 'entity' },
  ] }, [13, 10]],
  'w-sensor': ['SensorWidget.tsx', { design: 'grid', showSparkline: true, fontSize: 11, entities: [
    { entityId: 'sensor.living_room_temperature', label: 'Living room', icon: 'mdi:thermometer' },
    { entityId: 'sensor.bedroom_humidity', label: 'Bedroom', icon: 'mdi:water-percent' },
    { entityId: 'sensor.study_co2', label: 'Study CO₂', icon: 'mdi:molecule-co2' },
    { entityId: 'sensor.solar_power', label: 'Solar', icon: 'mdi:solar-power' },
  ] }, [15, 9]],
  'w-camera': ['CameraWidget.tsx', { source: 'ha', entityId: 'camera.front_door', caption: 'Front door', refreshIntervalSec: 30 }, [10, 8]],
  // Buttons are NOT a list — they are numbered flat keys, the first without a
  // suffix (`label`, `label2`, `label3`). Same shape as the targetsN pattern.
  'w-button': ['ButtonWidget.tsx', {
    btnShape: 'circle', designLayout: 'row', fontSize: 12,
    label: 'Good night', icon: 'lucide:moon', actionType: 'service', entityId: 'light.living_room', service: 'light.turn_off',
    label2: 'Coffee', icon2: 'lucide:coffee', actionType2: 'service', entityId2: 'switch.coffee_machine', service2: 'switch.turn_on',
    label3: 'Lock up', icon3: 'lucide:lock', actionType3: 'service', entityId3: 'lock.front_door', service3: 'lock.lock',
  }, [13, 7]],
  // Zwei weitere Statuskarten: anderes Gerät, anderes Layout, anderer Zustand.
  // Die Karte ist eines der Aushängeschilder — ein Bild wird ihr nicht gerecht.
  'w-status-vacuum': ['StatusWidget.tsx', {
    statusEntity: 'sensor.vacuum_status', label: 'Robot vacuum', statusLayout: 'stack',
    imageMode: 'entity', imageEntity: 'sensor.vacuum_status', imageStyle: 'free', imageScale: 92, artworkAsTileBg: false,
    progressEntity: 'sensor.vacuum_battery', progressStyle: 'ring', progressShowPercent: true,
    statusAccent: '#22c55e', showState: true, fontSize: 12,
    statusDetails: [
      { entity: 'sensor.vacuum_room', label: 'Room' },
      { entity: 'sensor.vacuum_area', label: 'Done' },
    ],
  }, [12, 14]],
  // "Fertig" ist der Zustand, den niemand übersehen soll — mit Ring und Tönung.
  'w-status-washer': ['StatusWidget.tsx', {
    statusEntity: 'sensor.washer_status', label: 'Washing machine', statusLayout: 'bar',
    statusStates: 'Running,Finished', alertStates: 'Finished', alertPulse: true, alertRing: true,
    imageMode: 'entity', imageEntity: 'sensor.washer_status', imageStyle: 'free', imageScale: 130, artworkAsTileBg: true,
    progressEntity: 'sensor.washer_progress', progressStyle: 'bar', progressShowPercent: true,
    statusAccent: '#f43f5e', showState: true, fontSize: 12,
    statusDetails: [
      { entity: 'sensor.washer_programme', label: 'Programme' },
      { entity: 'sensor.washer_done_at', label: 'Finished at' },
    ],
  }, [14, 9]],
  // Wetter mit atmosphärischem Hintergrund — sonst nirgends im Wiki zu sehen.
  'w-weather-bg': ['WeatherWidget.tsx', { ...WEATHER, weatherBg: true, weatherBgOpacity: 70, weatherBgBlur: 8 }, [13, 10]],
  // Vier Musikkarten — jedes Layout einmal, jede mit eigenem Cover.
  'w-media': ['MediaPlayerWidget.tsx', { entityId: 'media_player.living_room', layout: 'row', accentColor: '#f97316', showProgress: true, showControls: true, fontSize: 13 }, [14, 7]],
  'w-media-stack': ['MediaPlayerWidget.tsx', { entityId: 'media_player.kitchen', layout: 'stack', accentColor: '#f43f5e', coverCorners: 'rounded', showProgress: true, fontSize: 12 }, [10, 13]],
  'w-media-cover': ['MediaPlayerWidget.tsx', { entityId: 'media_player.study', layout: 'cover', scrim: 65, showProgress: true, showControls: true, fontSize: 12 }, [11, 13]],
  // Kreis-Cover, das sich beim Abspielen dreht — der Plattenteller.
  'w-media-vinyl': ['MediaPlayerWidget.tsx', { entityId: 'media_player.bedroom', layout: 'row', coverCorners: 'circle', vinylSpin: true, artworkAsTileBg: true, bgBlur: 26, bgDarken: 45, accentColor: '#38bdf8', showProgress: true, fontSize: 13 }, [15, 8]],
  'w-qr': ['QrWidget.tsx', { mode: 'wifi', wifiSsid: 'Guest', wifiPassword: 'welcome-friend', wifiEncryption: 'WPA', caption: 'Guest Wi-Fi' }, [8, 9]],
  // RSS calls the list `feeds` and the cap `limit` — not url/maxItems.
  'w-rss': ['RssWidget.tsx', { feeds: [`${NEWS}/news.xml`], rssMode: 'rotate', limit: 6, showSource: true, showDate: true, showImage: true, fontSize: 13 }, [14, 10]],
  'w-image-blur': ['ImageWidget.tsx', { immichSource: 'global', immichAlbumId: 'alb-family', fit: 'blur', intervalSec: 45 }, [15, 8]],
  'w-messages': ['MessagesWidget.tsx', {}, [12, 7]],
  'w-shopping': ['ShoppingListWidget.tsx', { source: 'local' }, [9, 10]],
  'w-todos': ['TodosWidget.tsx', { source: 'local' }, [9, 10]],
  'w-timer': ['TimerWidget.tsx', { maxTimers: 3 }, [10, 6]],
  // Status names its entity `statusEntity`, not `entityId`.
  'w-status': ['StatusWidget.tsx', {
    statusEntity: 'sensor.car_status', label: 'Car', statusLayout: 'bar',
    imageMode: 'entity', imageEntity: 'sensor.car_status', imageStyle: 'free', imageScale: 130, artworkAsTileBg: true,
    progressEntity: 'sensor.car_battery', progressStyle: 'bar', progressShowPercent: true,
    statusAccent: '#38bdf8', showState: true, fontSize: 12,
    // Der Slot heisst `entity`, nicht `entityId`.
    statusDetails: [
      { entity: 'sensor.car_battery', label: 'Battery' },
      { entity: 'sensor.car_range', label: 'Range' },
      { entity: 'sensor.car_time_left', label: 'Time to full' },
    ],
  }, [14, 9]],
  // Die Ueberschrift zeigt sich nur mit dem, was sie beschriftet — allein in
  // einer Kachel waere ein Text-Widget kein Bild, sondern ein Satz. Darum
  // gross gesetzt, mit zweiter Zeile und Trennlinie, damit der Shot zeigt,
  // wofuer es da ist.
  'w-text': ['TextWidget.tsx', {
    text: 'This week', subtext: "What's on the table", fontSize: 46,
    divider: true, icon: 'lucide:utensils', align: 'left', vAlign: 'middle',
    subtextScale: 45,
  }, [12, 5]],
};

async function main() {
  // Home Assistant points at the stub. Immich too — both fake, both fixed.
  // `updatedAt` is @updatedAt in the schema — Prisma fills it, raw SQL has to.
  await q(
    `insert into "AppSettings" (id, "haUrl", "haToken", extra, "updatedAt")
     values ('global', $1, $2, $3::jsonb, now())
     on conflict (id) do update set "haUrl" = excluded."haUrl", "haToken" = excluded."haToken",
       extra = excluded.extra, "updatedAt" = now()`,
    [HA, 'demo-token-not-a-real-one', JSON.stringify({ immichUrl: SOURCES, immichApiKey: 'demo-key-not-a-real-one' })],
  );

  const all = [
    ...DASHBOARDS,
    ...Object.entries(SOLO).map(([id, [type, config, [w, h]]]) => ({
      id,
      name: id,
      wallpaper: { source: 'color', bgColor: '#0b1220' },
      widgets: [widget(type, Math.floor((24 - w) / 2), Math.floor((24 - h) / 2), w, h, { responsiveText: true, fontSize: 22, ...config })],
    })),
  ];

  for (const d of all) {
    await q('delete from "Widget" where "dashboardId" = $1', [d.id]);
    await q(
      `insert into "Dashboard" (id, name, wallpaper, settings)
       values ($1, $2, $3::jsonb, $4::jsonb)
       on conflict (id) do update set name = excluded.name, wallpaper = excluded.wallpaper, settings = excluded.settings`,
      [d.id, d.name, JSON.stringify(d.wallpaper), JSON.stringify(d.settings ?? {})],
    );
    let n = 0;
    for (const w of d.widgets) {
      await q(
        `insert into "Widget" (id, type, label, config, "bgOpacity", x, y, w, h, "dashboardId")
         values ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10)`,
        [`${d.id}_w${n++}`, w.type, '', JSON.stringify(w.config), w.bgOpacity, w.x, w.y, w.w, w.h, d.id],
      );
    }
  }

  const { rows: users } = await q('select id from "User" order by "createdAt" limit 1');
  const uid = users[0]?.id;

  // Calendar accounts, so the accounts card shows a connected state rather than
  // "none yet". Invented addresses; the tokens are obvious placeholders and
  // expire far in the future so nothing tries to refresh them mid-shot.
  await q('delete from "CalendarAuth"').catch(() => {});
  const far = new Date(Date.now() + 365 * 86400e3);
  for (const [id, provider, email, name] of [
    ['ca-g1', 'google', 'alex@example.com', 'Alex'],
    ['ca-g2', 'google', 'sam@example.com', 'Sam'],
    ['ca-ms', 'microsoft', 'alex@example.org', 'Work'],
  ]) {
    await q(
      `insert into "CalendarAuth" (id, "userId", provider, "accountEmail", "accountName", "accessToken", "refreshToken", "expiresAt", "updatedAt")
       values ($1, $2, $3, $4, $5, 'placeholder-not-a-real-token', 'placeholder', $6, now())`,
      [id, uid, provider, email, name, far],
    ).catch(() => {});
  }

  // ── local content, so the family widgets are not empty in a picture ───────
  //
  // An empty list teaches nothing. Each of these exists because a wiki caption
  // describes it: a timer mid-countdown and one that has finished, a shopping
  // list with a done section, tasks with an owner and a due date.

  await q('delete from "Timer"').catch(() => {});
  await q('delete from "ShoppingItem"').catch(() => {});
  await q('delete from "Todo"').catch(() => {});
  await q('delete from "BoardMessage"').catch(() => {});

  if (uid) {
    // One running with about four minutes left, one already finished.
    // `startedAt` is `timestamp WITHOUT time zone`. Postgres converts `now()`
    // into it using the SESSION time zone — Europe/Berlin here — so a plain
    // insert stores local time. The value then travels out as JSON and is read
    // back as UTC, which puts the start two hours in the future in summer and
    // made a four-minute timer show two hours. Storing UTC explicitly is what
    // closes the loop.
    await q(
      `insert into "Timer" (id, "userId", label, "startedAt", "durationMs")
       values ('t-pasta', $1, 'Pasta', (now() at time zone 'UTC') - interval '6 minutes', $2),
              ('t-eggs',  $1, 'Eggs',  (now() at time zone 'UTC') - interval '9 minutes', $3)`,
      [uid, 10 * 60_000, 8 * 60_000],
    );
  }

  const shopping = [
    ['Milk', false], ['Bread', false], ['Apples', false], ['Washing-up liquid', false],
    ['Coffee', true], ['Butter', true],
  ];
  for (const [text, checked] of shopping) {
    await q(
      `insert into "ShoppingItem" (id, text, checked, "createdAt", "checkedAt")
       values ($1, $2, $3, now() - interval '2 hours', $4)`,
      [`s-${text.toLowerCase().replace(/\W+/g, '-')}`, text, checked, checked ? new Date() : null],
    );
  }

  const todos = [
    ['Book the car service', 'Alex', 3],
    ['Return library books', 'Sam', 1],
    ['Renew the parking permit', 'Alex', -2], // overdue, so the widget shows that state
    ['Water the plants', 'Sam', null],
  ];
  for (const [title, assignee, inDays] of todos) {
    await q(
      `insert into "Todo" (id, title, assignee, "dueDate", "createdAt")
       values ($1, $2, $3, $4, now() - interval '1 day')`,
      [`td-${title.toLowerCase().replace(/\W+/g, '-').slice(0, 24)}`, title, assignee,
       inDays === null ? null : new Date(Date.now() + inDays * 86400e3)],
    );
  }

  if (uid) {
    await q(
      `insert into "BoardMessage" (id, "userId", text, "createdAt")
       values ('m-1', $1, 'Bins out tonight — recycling week', now() - interval '2 hours'),
              ('m-2', $1, 'Swimming kit is in the dryer', now() - interval '3 hours')`,
      [uid],
    );
  }

  console.log(`seeded ${all.length} dashboards (${DASHBOARDS.length} whole-screen, ${Object.keys(SOLO).length} single-widget)`);
  await pool.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

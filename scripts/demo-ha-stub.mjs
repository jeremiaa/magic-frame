// A fake Home Assistant, just real enough to photograph against.
//
//   node scripts/demo-ha-stub.mjs [port]        # default 8123
//
// Five widgets read live state from Home Assistant. Photographing them needs a
// Home Assistant — and pointing the documentation instance at a real household
// is wrong twice over:
//
//   - it publishes somebody's home. Entity names, room names, who is in, what
//     is unlocked. A screenshot is forever and nobody re-reads it.
//   - it is not reproducible. Retaking a shot six months later gives different
//     values, so every picture silently disagrees with its own caption.
//
// So this answers the two endpoints the app actually uses with a small invented
// household that never changes. Same numbers every time, nobody's real home.
//
// It implements only what Magic Frame asks for:
//   GET  /api/                      the reachability probe
//   GET  /api/states                every entity
//   GET  /api/states/<entity_id>    one entity
//   POST /api/services/<d>/<s>      accepted and ignored
//   GET  /api/history/period/...    a flat line, enough for a sparkline
//   WS   /api/websocket             auth handshake, get_states, subscribe_events
//
// The websocket stays open and sends nothing after the initial state. Static is
// what we want: a photograph of a moving dashboard is a photograph of one frame
// of it, and it should be the frame we chose.

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { deflateSync, crc32 } from 'node:zlib';
import { readFileSync } from 'node:fs';

/** Minimal PNG encoder, so the camera and artwork endpoints can answer with a
 *  real image without pulling in a dependency. */
function makePng(width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
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
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PORT = Number(process.argv[2] ?? 8123);

// ---- the invented household ------------------------------------------------
//
// Deliberately ordinary and deliberately not anyone's: a flat with a few lamps,
// a thermostat, a washing machine and a doorbell. Values are chosen to look
// plausible in a screenshot — a light that is ON is more useful in a picture
// than one that is off.

const FIXED_NOW = new Date(Date.now() - 4 * 60_000).toISOString(); // ein paar Minuten alt, nicht Monate

const entity = (id, state, attributes = {}) => ({
  entity_id: id,
  state: String(state),
  attributes,
  last_changed: FIXED_NOW,
  last_reported: FIXED_NOW,
  last_updated: FIXED_NOW,
  context: { id: createHash('sha1').update(id).digest('hex').slice(0, 26), parent_id: null, user_id: null },
});

/** A media player with artwork, a position and a duration. */
const mediaPlayer = (id, name, title, artist, album, cover, volume, duration, position) =>
  entity(id, 'playing', {
    friendly_name: name,
    media_title: title,
    media_artist: artist,
    media_album_name: album,
    media_duration: duration,
    media_position: position,
    // Muss JETZT sein, nicht FIXED_NOW: der Player rechnet
    // position + (jetzt − updated_at). Ein paar Minuten Versatz lassen jeden
    // Titel abgelaufen wirken, und rechts stand überall "-0:00".
    media_position_updated_at: new Date().toISOString(),
    volume_level: volume,
    supported_features: 84335,
    entity_picture: `/local/${cover}`,
  });

const ENTITIES = [
  entity('light.living_room', 'on', { friendly_name: 'Living room', brightness: 180, supported_color_modes: ['brightness'] }),
  entity('light.kitchen', 'off', { friendly_name: 'Kitchen' }),
  entity('light.hallway', 'on', { friendly_name: 'Hallway', brightness: 90 }),
  entity('switch.coffee_machine', 'off', { friendly_name: 'Coffee machine' }),
  entity('lock.front_door', 'locked', { friendly_name: 'Front door' }),
  entity('cover.garage', 'closed', { friendly_name: 'Garage door', device_class: 'garage' }),

  entity('climate.living_room', 'heat', {
    friendly_name: 'Living room heating',
    current_temperature: 21.5,
    temperature: 22,
    hvac_action: 'idle',
  }),
  entity('sensor.living_room_temperature', '21.5', { friendly_name: 'Living room temperature', unit_of_measurement: '°C', device_class: 'temperature', state_class: 'measurement' }),
  entity('sensor.bedroom_humidity', '48', { friendly_name: 'Bedroom humidity', unit_of_measurement: '%', device_class: 'humidity', state_class: 'measurement' }),
  entity('sensor.study_co2', '780', { friendly_name: 'Study CO₂', unit_of_measurement: 'ppm', device_class: 'carbon_dioxide', state_class: 'measurement' }),
  entity('sensor.solar_power', '2140', { friendly_name: 'Solar production', unit_of_measurement: 'W', device_class: 'power', state_class: 'measurement' }),

  entity('binary_sensor.washing_machine', 'on', { friendly_name: 'Washing machine running', device_class: 'running' }),
  entity('input_boolean.feed_the_cat', 'on', { friendly_name: 'Feed the cat' }),
  entity('binary_sensor.front_door_motion', 'off', { friendly_name: 'Front door motion', device_class: 'motion' }),

  entity('camera.front_door', 'idle', { friendly_name: 'Front door camera', entity_picture: '/api/camera_proxy/camera.front_door' }),

  // Four players, four covers — every media layout in the wiki shows a
  // different record instead of the same one four times. Titles and artists are
  // invented; the covers are generated and carry no text.
  mediaPlayer('media_player.living_room', 'Living room speaker', 'Ordinary Weather', 'The Placeholders', 'Nothing In Particular', 'cover-1.jpg', 0.35, 214, 96),
  mediaPlayer('media_player.kitchen', 'Kitchen radio', 'Slow Tuesday', 'Field & Marsh', 'Long Way Round', 'cover-2.jpg', 0.5, 187, 42),
  mediaPlayer('media_player.study', 'Study speaker', 'Blue Hour', 'Low Tide Society', 'Nightwater', 'cover-3.jpg', 0.25, 305, 158),
  mediaPlayer('media_player.bedroom', 'Bedroom speaker', 'Still Lake', 'Anna Vogel', 'Quiet Rooms', 'cover-4.jpg', 0.4, 268, 12),

  entity('weather.home', 'partlycloudy', {
    friendly_name: 'Home',
    temperature: 14,
    humidity: 62,
    wind_speed: 11,
    temperature_unit: '°C',
  }),

  entity('calendar.family', 'on', {
    friendly_name: 'Family',
    message: 'Swimming lesson',
    start_time: '2026-03-14 16:00:00',
    end_time: '2026-03-14 17:00:00',
  }),

  entity('todo.shopping', '3', { friendly_name: 'Shopping' }),

  // Three devices with a picture, a state and numbers — what the Status widget
  // is for, and what it is worth showing more than once.
  entity('sensor.car_status', 'Charging', { friendly_name: 'Car', entity_picture: '/local/car.png' }),
  entity('sensor.car_battery', '68', { friendly_name: 'Car battery', unit_of_measurement: '%', device_class: 'battery', state_class: 'measurement' }),
  entity('sensor.car_range', '312', { friendly_name: 'Range', unit_of_measurement: 'km', state_class: 'measurement' }),
  entity('sensor.car_time_left', '1 h 40 min', { friendly_name: 'Time to full' }),

  entity('sensor.vacuum_status', 'Cleaning', { friendly_name: 'Robot vacuum', entity_picture: '/local/vacuum.png' }),
  entity('sensor.vacuum_area', '38', { friendly_name: 'Area done', unit_of_measurement: 'm²', state_class: 'measurement' }),
  entity('sensor.vacuum_battery', '54', { friendly_name: 'Vacuum battery', unit_of_measurement: '%', device_class: 'battery', state_class: 'measurement' }),
  entity('sensor.vacuum_room', 'Living room', { friendly_name: 'Room' }),

  entity('sensor.washer_status', 'Finished', { friendly_name: 'Washing machine', entity_picture: '/local/washer.png' }),
  entity('sensor.washer_programme', 'Cottons 40°', { friendly_name: 'Programme' }),
  entity('sensor.washer_done_at', '18:42', { friendly_name: 'Finished at' }),
  entity('sensor.washer_progress', '100', { friendly_name: 'Washer progress', unit_of_measurement: '%', state_class: 'measurement' }),
  entity('person.alex', 'home', { friendly_name: 'Alex' }),
];

const byId = new Map(ENTITIES.map((e) => [e.entity_id, e]));

// ---- REST ------------------------------------------------------------------

const json = (res, body, status = 200) => {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === '/api/' || path === '/api') return json(res, { message: 'API running.' });
  if (path === '/api/states') return json(res, ENTITIES);

  if (path.startsWith('/api/states/')) {
    const id = decodeURIComponent(path.slice('/api/states/'.length));
    const e = byId.get(id);
    return e ? json(res, e) : json(res, { message: 'Entity not found.' }, 404);
  }

  // Service calls are accepted and do nothing. A screenshot run must never be
  // able to change anything, not even in the stub.
  if (path.startsWith('/api/services/')) return json(res, []);

  // A flat line is enough for the Sensor widget's sparkline to have a shape.
  if (path.startsWith('/api/history/period/')) {
    const id = url.searchParams.get('filter_entity_id');
    const e = id ? byId.get(id) : null;
    if (!e) return json(res, []);
    const points = Array.from({ length: 24 }, (_, i) => ({
      ...e,
      state: String(Number(e.state) + Math.sin(i / 3) * 0.6),
      last_changed: FIXED_NOW,
    }));
    return json(res, [points]);
  }

  // Home Assistant serves its own `www` folder at /local — the Status widget's
  // documentation points people there, so the stub answers the same way.
  const local = path.match(/^\/local\/([a-z0-9-]+\.(?:png|jpg))$/);
  if (local) {
    try {
      const buf = readFileSync(new URL(`./demo-assets/${local[1]}`, import.meta.url));
      res.writeHead(200, {
        'Content-Type': local[1].endsWith('.png') ? 'image/png' : 'image/jpeg',
        'Content-Length': buf.length,
      });
      return res.end(buf);
    } catch {
      return json(res, { message: 'Not found.' }, 404);
    }
  }

  if (path.startsWith('/api/camera_proxy/') || path.startsWith('/api/media_player_proxy/')) {
    // A generated wash rather than a photograph. The shot is about the widget
    // frame — the caption, the controls, how the picture is fitted — and a real
    // front door or a real album cover would be somebody's, or somebody's
    // copyright. Big enough to be visibly an image and not a broken one.
    const camera = path.includes('camera_proxy');
    const png = makePng(camera ? 640 : 400, camera ? 360 : 400, (u, v) => {
      const t = camera ? v * 0.8 + u * 0.2 : Math.hypot(u - 0.5, v - 0.5) * 1.4;
      return camera
        ? [Math.round(38 + t * 60), Math.round(46 + t * 66), Math.round(58 + t * 74)]
        : [Math.round(180 - t * 120), Math.round(90 + t * 40), Math.round(150 - t * 60)];
    });
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': png.length });
    return res.end(png);
  }

  json(res, { message: 'Not found.' }, 404);
});

// ---- WebSocket -------------------------------------------------------------
//
// Hand-rolled rather than pulling in `ws`: this script must run with nothing
// installed. Only the server->client text frames the app needs are implemented,
// and only unmasked ones are sent (as the protocol requires for a server).

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

server.on('upgrade', (req, socket) => {
  if (!req.url.startsWith('/api/websocket')) return socket.destroy();

  const accept = createHash('sha1')
    .update(req.headers['sec-websocket-key'] + WS_GUID)
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );

  const send = (obj) => {
    const payload = Buffer.from(JSON.stringify(obj));
    const len = payload.length;
    let header;
    if (len < 126) header = Buffer.from([0x81, len]);
    else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81; header[1] = 126; header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2);
    }
    socket.write(Buffer.concat([header, payload]));
  };

  /** Decode one client text frame. Client frames are always masked. */
  const decode = (buf) => {
    if (buf.length < 2) return null;
    let len = buf[1] & 0x7f;
    let offset = 2;
    if (len === 126) { len = buf.readUInt16BE(2); offset = 4; }
    else if (len === 127) { len = Number(buf.readBigUInt64BE(2)); offset = 10; }
    const mask = buf.slice(offset, offset + 4);
    offset += 4;
    const data = buf.slice(offset, offset + len);
    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i] ^ mask[i % 4];
    return out.toString();
  };

  send({ type: 'auth_required', ha_version: '2026.3.0' });

  socket.on('data', (buf) => {
    let text;
    try { text = decode(buf); } catch { return; }
    if (!text) return;
    let msg;
    try { msg = JSON.parse(text); } catch { return; }

    if (msg.type === 'auth') return send({ type: 'auth_ok', ha_version: '2026.3.0' });
    if (msg.type === 'get_states') return send({ id: msg.id, type: 'result', success: true, result: ENTITIES });
    if (msg.type === 'subscribe_events') return send({ id: msg.id, type: 'result', success: true, result: null });
    if (msg.type === 'ping') return send({ id: msg.id, type: 'pong' });
  });

  socket.on('error', () => socket.destroy());
});

server.listen(PORT, () => {
  console.log(`fake Home Assistant on http://127.0.0.1:${PORT} — ${ENTITIES.length} invented entities`);
  console.log('any token is accepted; nothing here is anyone\'s real home');
});

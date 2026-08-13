import WebSocket from 'ws';

export class HAConnector {
  private url: string;
  private token: string;
  private ws: WebSocket | null = null;
  private idCounter = 1;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  connect() {
    console.log(`[HA Bridge] Connecting to ${this.url}...`);
    // Der Supervisor-Proxy (HA-Add-on) legt den WebSocket unter
    // /core/websocket ab — OHNE das sonst übliche /api davor. Direkt
    // angesprochene HA-Instanzen bleiben bei /api/websocket.
    const base = this.url.replace(/\/+$/, "");
    const wsUrl = base.endsWith("/core") && base.includes("supervisor")
      ? `${base}/websocket`
      : `${base}/api/websocket`;
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('[HA Bridge] Connected to Home Assistant WebSocket');
    });

    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'auth_required') {
        this.ws?.send(JSON.stringify({ type: 'auth', access_token: this.token }));
      } else if (msg.type === 'auth_ok') {
        console.log('[HA Bridge] Authenticated successfully');
        this.subscribeEvents();
      } else if (msg.type === 'event') {
        // Nothing here on purpose.
        //
        // This block used to do `LIVE_SYNC_IO.emit("HA_STATE_CHANGE", …)`,
        // pushing every state change in the house to every connected socket,
        // and nothing ever listened for it. It was removed rather than kept —
        // but note that it never actually ran: nothing in this repo constructs
        // HAConnector, so the class as a whole is unused scaffolding.
        //
        // The live path is src/lib/ha-bridge/broadcaster.ts: one WebSocket to
        // Home Assistant, fanned out over SSE via /api/ha/stream, filtered to
        // the entities a widget actually shows. If you are looking for where
        // live state comes from, it is there and not here.
      } else if (msg.type === 'auth_invalid') {
         console.error('[HA Bridge] Authentication invalid. Check token.');
      }
    });

    this.ws.on('error', (err) => console.error('[HA Bridge] WS Error:', err));
    this.ws.on('close', () => {
      console.log('[HA Bridge] Disconnected. Reconnecting in 5s...');
      setTimeout(() => this.connect(), 5000);
    });
  }

  private subscribeEvents() {
    const id = this.idCounter++;
    this.ws?.send(JSON.stringify({
      id,
      type: 'subscribe_events',
      event_type: 'state_changed'
    }));
    console.log('[HA Bridge] Subscribed to state_changed events');
  }
}

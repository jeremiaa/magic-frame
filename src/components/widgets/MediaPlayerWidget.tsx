"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Play, Pause, SkipBack, SkipForward, Volume, Volume2 } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useGlassStyle } from "@/lib/ui/glass";
import { haAction } from "@/lib/ha/action-client";

// Media-Player-Widget (Discussion #50): Now-Playing für jede HA media_player-
// Entity (Sonos, HomePod, Chromecast, Music Assistant, …).
//
// Layout-Engine statt CSS-Breakpoints: die Kachel wird per ResizeObserver in
// PIXELN vermessen. Daraus werden (1) das Layout gewählt (Auto: breit → Zeile,
// hoch → Stapel, quadratisch → Cover), (2) alle Größen berechnet (Schrift,
// Cover, Buttons, Abstände skalieren mit der Kachel) und (3) Elemente in
// fester Prioritäts-Reihenfolge AUSGEBLENDET, wenn der Platz nicht reicht
// (Punkte → Fortschritt → Steuerung → Interpret) — nichts wird je gequetscht.
//
// Artwork läuft über /api/ha/media/<entity>/artwork (HA-Token bleibt server-
// seitig), Live-Daten über dasselbe /api/ha/state-Polling wie das Sensor-Widget.

const PLAYING_STATES = new Set(["playing", "paused", "buffering", "on"]);

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Eine Textzeile mit wählbarem Überlauf-Verhalten:
//  truncate → abschneiden mit … (Default, wie bisher)
//  scroll   → Laufschrift hin & zurück, nur wenn der Text wirklich überläuft
//  shrink   → Schrift verkleinern bis es passt (Untergrenze 55 %, dann …)
// Misst sich selbst; die Messung läuft nach jedem Render (guarded setState),
// dadurch reagiert sie auch auf Kachel-Resizes ohne eigenen Observer.
function SmartText({ text, px, color, weight = 400, mode, center = false }: {
  text: string;
  px: number;
  color: string;
  weight?: number;
  mode: "truncate" | "scroll" | "shrink";
  center?: boolean;
}) {
  const outer = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLSpanElement | null>(null);
  const [over, setOver] = useState(0);
  const [ratio, setRatio] = useState(1);

  useEffect(() => { setRatio(1); setOver(0); }, [text, px, mode]);

  useEffect(() => {
    if (mode === "truncate") return;
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const id = requestAnimationFrame(() => {
      const need = i.scrollWidth, have = o.clientWidth;
      if (have <= 0) return;
      if (mode === "scroll") {
        const next = Math.max(0, need - have);
        setOver((prev) => (Math.abs(prev - next) > 2 ? next : prev));
      } else if (ratio === 1 && need > have) {
        setRatio(Math.max(0.55, have / need));
      }
    });
    return () => cancelAnimationFrame(id);
  });

  const base = { lineHeight: 1.25, color, fontWeight: weight } as React.CSSProperties;
  if (mode === "shrink") {
    return (
      <div ref={outer} className={`overflow-hidden whitespace-nowrap ${center ? "text-center" : ""}`} style={{ ...base, fontSize: px * ratio }}>
        <span ref={inner} className={ratio <= 0.551 ? "inline-block max-w-full truncate align-bottom" : ""}>{text}</span>
      </div>
    );
  }
  if (mode === "scroll") {
    const dur = Math.max(7, over / 22);
    return (
      <div ref={outer} className={`overflow-hidden whitespace-nowrap ${center && over === 0 ? "text-center" : ""}`} style={{ ...base, fontSize: px }}>
        <span ref={inner} className="inline-block"
          style={over > 0 ? ({ "--mf-marquee-dist": `-${over + 8}px`, animation: `mf-marquee ${dur}s linear infinite alternate` } as React.CSSProperties) : undefined}>
          {text}
        </span>
      </div>
    );
  }
  return <div className={`truncate ${center ? "text-center" : ""}`} style={{ ...base, fontSize: px }}>{text}</div>;
}

// Zieh-/Tipp-Leiste für Seek + Lautstärke: schmaler Balken mit großzügiger
// unsichtbarer Trefferfläche. Pointer-Capture hält den Drag auch außerhalb;
// onDrag feuert live (Vorschau/Volume), onCommit beim Loslassen.
function DragBar({ value, height, hitPad, accent, track, onDrag, onCommit }: {
  value: number;
  height: number;
  hitPad: number;
  accent: string;
  track: string;
  onDrag?: (frac: number) => void;
  onCommit: (frac: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const frac = drag ?? clamp(value, 0, 1);
  const compute = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return 0;
    return clamp((clientX - r.left) / r.width, 0, 1);
  };
  return (
    <div ref={ref} className="relative w-full cursor-pointer" style={{ padding: `${hitPad}px 0`, touchAction: "none" }}
      onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); const f = compute(e.clientX); setDrag(f); onDrag?.(f); }}
      onPointerMove={(e) => { if (drag === null) return; e.stopPropagation(); const f = compute(e.clientX); setDrag(f); onDrag?.(f); }}
      onPointerUp={(e) => { if (drag === null) return; e.stopPropagation(); onCommit(compute(e.clientX)); setDrag(null); }}
      onPointerCancel={() => setDrag(null)}>
      <div className="w-full rounded-full overflow-hidden" style={{ height, backgroundColor: track }}>
        <div className="h-full rounded-full" style={{ width: `${frac * 100}%`, backgroundColor: accent }} />
      </div>
    </div>
  );
}

export default function MediaPlayerWidget({
  config,
  onVisibilityChange,
}: {
  config?: any;
  onVisibilityChange?: (isVisible: boolean) => void;
}) {
  const t = useT();

  // ---- Konfiguration -------------------------------------------------------
  // Dedupliziert: doppelte Einträge in gespeicherten Configs würden doppelte
  // Punkte zeigen UND als doppelte React-Keys das Rendering korrumpieren.
  const ids: string[] = Array.from(new Set(
    (Array.isArray(config?.entityIds) && config.entityIds.length
      ? config.entityIds.filter(Boolean)
      : (config?.entityId ? [config.entityId] : [])) as string[]
  ));
  const layoutCfg: string = config?.layout || "auto"; // auto | row | stack | cover
  const showCover: boolean = config?.showCover !== false;
  const coverScalePct: number = clamp(Number(config?.coverScale) || 100, 50, 130);
  const coverCorners: string = config?.coverCorners || "rounded"; // rounded | square | circle
  const vinylSpin: boolean = config?.vinylSpin !== false; // Kreis-Cover dreht beim Abspielen
  const overflowMode: "truncate" | "scroll" | "shrink" =
    config?.textOverflow === "scroll" || config?.textOverflow === "shrink" ? config.textOverflow : "truncate";
  const showArtist: boolean = config?.showArtist !== false;
  const showControls: boolean = config?.showControls !== false;
  const showProgress: boolean = config?.showProgress !== false;
  const showVolume: boolean = config?.showVolume === true; // opt-in
  const showPlayerName: boolean = config?.showPlayerName === true; // opt-in
  // Ausrichtung des Info-Blocks. Zeile/Cover: Default links. Hochkant bleibt
  // ohne explizite Wahl zentriert (das ist sein Design) — gesetzt gewinnt.
  const alignCfg: "left" | "center" | "right" =
    config?.align === "center" || config?.align === "right" ? config.align : "left";
  const stackAlign: "left" | "center" | "right" = config?.align ? alignCfg : "center";
  const itemsClass = (a: string) => (a === "center" ? "items-center" : a === "right" ? "items-end" : "items-start");
  const artworkBg: boolean = config?.artworkAsTileBg === true;
  const bgBlur: number = clamp(Number(config?.bgBlur ?? 28), 0, 60);
  const bgDarken: number = clamp(Number(config?.bgDarken ?? 45), 0, 85);
  const scrim: number = clamp(Number(config?.scrim ?? 70), 0, 100);
  const hideWhenIdle: boolean = config?.hideWhenIdle === true;
  // Pause-Timeout (0 = aus): dauerhaft pausierte Player nach X Minuten
  // ausblenden — Play holt sie sofort zurück.
  const idleHideMin: number = clamp(Number(config?.idleHideMinutes) || 0, 0, 720);
  const autoFollow: boolean = config?.autoFollow !== false;
  const dotsPos: string = config?.dotsPosition || "bottom-right"; // bottom-right | top-right | bottom-center
  const dotsOnInteract: boolean = config?.dotsShowOnInteract === true;
  const glass = useGlassStyle(config);
  // showBorder: false entfernt den feinen Glas-Rand; borderColor überschreibt
  // die weiße Glas-Linie mit einer passenden Farbe (z. B. zum Blur/Cover).
  const cardBox: React.CSSProperties = config?.showBorder === false
    ? { ...glass.cardStyle, border: "none" }
    : config?.borderColor
      ? { ...glass.cardStyle, border: `1.5px solid ${config.borderColor}` }
      : glass.cardStyle;

  // ---- Live-Daten ----------------------------------------------------------
  const [statesDict, setStatesDict] = useState<Record<string, any>>({});
  const [error, setError] = useState("");
  const [manualIdx, setManualIdx] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // "Punkte nur bei Interaktion": Maus-Hover zeigt/versteckt direkt, ein Tipp
  // (Touch am Wand-Tablet) blendet sie für ein paar Sekunden ein.
  const [interacting, setInteracting] = useState(false);
  const interactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (interactTimer.current) clearTimeout(interactTimer.current); }, []);
  const pokeInteract = (e: { pointerType?: string }) => {
    if (!dotsOnInteract) return;
    setInteracting(true);
    if (e.pointerType !== "mouse") {
      if (interactTimer.current) clearTimeout(interactTimer.current);
      interactTimer.current = setTimeout(() => setInteracting(false), 3500);
    }
  };
  const endInteract = (e: { pointerType?: string }) => {
    if (dotsOnInteract && e.pointerType === "mouse") setInteracting(false);
  };

  useEffect(() => {
    if (ids.length === 0) { setStatesDict({}); return; }
    let cancelled = false;
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/ha/state?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HA ${res.status}`);
        const dict = await res.json();
        if (!cancelled) { setStatesDict(dict ?? {}); setError(""); }
      } catch {
        if (!cancelled) setError("Verbindung fehlgeschlagen");
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 10000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  // ---- Kachel vermessen (Layout-Engine-Grundlage) --------------------------
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0, fs: 20 });
  useEffect(() => {
    if (!el) return;
    const apply = (w: number, h: number) => {
      // Host-Schriftgröße mitmessen: das Bar-Layout erbt sie, damit der Text
      // exakt zu den Geschwister-Karten (Notifications) skaliert.
      const fs = parseFloat(getComputedStyle(el).fontSize) || 20;
      setBox((prev) => (Math.abs(prev.w - w) > 1 || Math.abs(prev.h - h) > 1 || Math.abs(prev.fs - fs) > 0.5 ? { w, h, fs } : prev));
    };
    // Tizen-Fallback: sehr alte TV-Browser haben kein ResizeObserver — dann
    // einmal messen + auf window-resize reagieren (Kacheln sind eh statisch).
    if (typeof ResizeObserver === "undefined") {
      const measure = () => { const r = el.getBoundingClientRect(); apply(r.width, r.height); };
      measure();
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) apply(r.width, r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  // ---- Aktiver Player ------------------------------------------------------
  const playingFlags = ids.map((id) => statesDict[id]?.state === "playing");
  const firstPlaying = playingFlags.findIndex(Boolean);
  // Auto-Follow über die MENGE der laufenden Player: startet irgendwo NEU
  // Musik, springt die Karte dorthin — auch wenn woanders schon etwas läuft
  // (vorher blieb sie stur beim ersten). Stoppt der angezeigte Player, fällt
  // sie auf den nächsten laufenden zurück. Ein manueller Tap gewinnt, bis
  // sich die Lage ändert.
  const playingKey = playingFlags.map((f, i) => (f ? i : -1)).filter((i) => i >= 0).join(",");
  const prevPlayingRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const cur = new Set(playingKey === "" ? [] : playingKey.split(",").map(Number));
    if (autoFollow) {
      const newly = [...cur].filter((i) => !prevPlayingRef.current.has(i));
      if (newly.length > 0) {
        setManualIdx(newly[0]);
      } else if (manualIdx !== null && !cur.has(manualIdx) && cur.size > 0) {
        setManualIdx(null); // gewählter Player stoppte → zum laufenden zurück
      }
    }
    prevPlayingRef.current = cur;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingKey, autoFollow]);
  const activeIdx = Math.min(manualIdx ?? (firstPlaying >= 0 ? firstPlaying : 0), Math.max(0, ids.length - 1));
  const activeId = ids[activeIdx] || ids[0] || "";
  const realState = statesDict[activeId] ?? null;
  // Vorschau-Beispieldaten (#42): Der Editor injiziert __demo — spielt gerade
  // nichts, zeigen wir einen Beispiel-Track in der EIGENEN Optik. Existiert
  // im Live-View nie (Flag wird nur von der Editor-Vorschau gesetzt).
  const state = config?.__demo === true && !PLAYING_STATES.has(realState?.state || "")
    ? {
        state: "playing",
        attributes: {
          media_title: t("Beispiel-Titel"),
          media_artist: "Magic Frame",
          media_album_name: t("Beispiel-Album"),
          media_duration: 214,
          media_position: 89,
          volume_level: 0.4,
          friendly_name: realState?.attributes?.friendly_name || t("Beispiel-Player"),
        },
      }
    : realState;

  const attrs = state?.attributes ?? {};
  const title: string = attrs.media_title || "";
  const artist: string = attrs.media_artist || attrs.media_album_artist || "";
  const album: string = attrs.media_album_name || "";
  const st: string = state?.state || "";
  const isPlaying = st === "playing";
  const hasArt = attrs.entity_picture || attrs.entity_picture_local;
  // Boolean() ist Pflicht: (title || hasArt) wäre sonst der Titel-STRING —
  // und ein String fällt bei strikten ===-true-Checks (Visibility-Map im
  // Notification-Widget) stillschweigend durch.
  const hasMedia = PLAYING_STATES.has(st) && Boolean(title || hasArt);

  // Pause-Timeout: manche Player melden ewig "paused mit eingelegtem Track".
  // Nach idleHideMin Minuten ohne Wiedergabe gilt das als "nichts läuft" —
  // sobald wieder gespielt wird, ist die Karte sofort zurück.
  const lastPlayingAtRef = useRef<number>(Date.now());
  if (isPlaying) lastPlayingAtRef.current = Date.now();
  const pausedTooLong = idleHideMin > 0 && !isPlaying &&
    Date.now() - lastPlayingAtRef.current > idleHideMin * 60000;
  const effectiveMedia = hasMedia && !pausedTooLong;

  // Fortschritt — nur sinnvoll, wenn der Player eine Dauer meldet.
  const duration: number = Number(attrs.media_duration) || 0;
  let position: number = Number(attrs.media_position) || 0;
  if (isPlaying && attrs.media_position_updated_at) {
    const upd = Date.parse(attrs.media_position_updated_at);
    if (Number.isFinite(upd)) position += Math.max(0, (nowMs - upd) / 1000);
  }
  position = Math.min(position, duration || position);

  // Seek-Override: nach einem Sprung zeigen wir die Zielposition weiter, bis
  // HA per Poll einen NEUEREN Stand liefert — sonst spränge der Balken bis zu
  // 10 s lang auf den alten Wert zurück.
  const seekLocal = useRef<{ sec: number; at: number } | null>(null);
  if (seekLocal.current) {
    const updAt = attrs.media_position_updated_at ? Date.parse(attrs.media_position_updated_at) : 0;
    if (Number.isFinite(updAt) && updAt > seekLocal.current.at) {
      seekLocal.current = null;
    } else {
      position = seekLocal.current.sec + (isPlaying ? Math.max(0, (nowMs - seekLocal.current.at) / 1000) : 0);
      position = Math.min(position, duration || position);
    }
  }
  const hasProgress = showProgress && duration > 0;
  const hasVolume = typeof attrs.volume_level === "number";
  // Anzeigename des aktiven Players (Apple-Stil "Badezimmer" überm Titel).
  const playerName: string = attrs.friendly_name
    || (activeId ? activeId.replace(/^media_player\./, "").replace(/_/g, " ") : "");

  // Lokaler Ticker: sekündlich für den Balken bei Wiedergabe; langsam (30 s)
  // im Pausen-Fall, damit das Pause-Timeout überhaupt neu bewertet wird.
  useEffect(() => {
    const fast = hasProgress && isPlaying;
    const slow = !isPlaying && hasMedia && idleHideMin > 0;
    if (!fast && !slow) return;
    const iv = setInterval(() => setNowMs(Date.now()), fast ? 1000 : 30000);
    return () => clearInterval(iv);
  }, [hasProgress, isPlaying, hasMedia, idleHideMin]);

  // Sichtbarkeit für "nur zeigen wenn etwas läuft" — mit GNADENFRIST beim
  // Ausblenden: HA leert beim Track-Wechsel kurz die Media-Attribute, ohne
  // Frist klappte die Karte pro Songwechsel einmal zu und wieder auf.
  // Einblenden passiert dagegen sofort. Callback als Ref, damit die stets
  // neue Inline-Funktion des Hosts den Timer nicht dauernd neu startet.
  const visCbRef = useRef(onVisibilityChange);
  visCbRef.current = onVisibilityChange;
  const hideGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!visCbRef.current) return;
    if (!hideWhenIdle) {
      // Wichtig: eine noch laufende Ausblend-Frist abbrechen. Sonst feuert
      // sie später und klappt die Karte wieder zu, obwohl gar nicht mehr
      // ausgeblendet werden soll — sichtbar z. B. beim Umschalten von
      // "Live" auf "Beispieldaten" in der Editor-Vorschau.
      if (hideGraceRef.current) { clearTimeout(hideGraceRef.current); hideGraceRef.current = null; }
      visCbRef.current(true);
      return;
    }
    if (effectiveMedia) {
      if (hideGraceRef.current) { clearTimeout(hideGraceRef.current); hideGraceRef.current = null; }
      visCbRef.current(true);
    } else if (!hideGraceRef.current) {
      hideGraceRef.current = setTimeout(() => {
        hideGraceRef.current = null;
        visCbRef.current?.(false);
      }, 6000);
    }
  }, [hideWhenIdle, effectiveMedia]);
  useEffect(() => () => { if (hideGraceRef.current) clearTimeout(hideGraceRef.current); }, []);

  // Artwork pro Track + Player cache-busten.
  const artTokenRef = useRef<string>("");
  if (title || activeId) artTokenRef.current = `${activeId}|${title}`;
  const artSrc = activeId
    ? `/api/ha/media/${encodeURIComponent(activeId)}/artwork?ts=${encodeURIComponent(artTokenRef.current)}`
    : "";
  const [artOk, setArtOk] = useState(true);
  useEffect(() => { setArtOk(true); }, [artTokenRef.current]);

  const control = async (service: string, data?: Record<string, any>) => {
    if (!activeId) return;
    await haAction({ entityId: activeId, domain: "media_player", service, ...(data ? { data } : {}) });
  };

  // Vorspulen über die Zeitleiste: während des Ziehens Vorschau, beim
  // Loslassen media_seek + optimistische Position (siehe seekLocal oben).
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const doSeek = (frac: number) => {
    if (!duration) return;
    const sec = Math.round(frac * duration);
    seekLocal.current = { sec, at: Date.now() };
    setSeekPreview(null);
    control("media_seek", { seek_position: sec });
  };

  // Lautstärke: live beim Ziehen (gedrosselt), final beim Loslassen. Die
  // Vorschau bleibt stehen, bis HA den neuen Pegel zurückmeldet — sonst
  // schnappte der Regler bis zum nächsten Poll auf den alten Wert zurück.
  const [volPreview, setVolPreview] = useState<number | null>(null);
  const volSentAt = useRef(0);
  useEffect(() => { setVolPreview(null); }, [attrs.volume_level]);
  const sendVolume = (frac: number, force = false) => {
    const now2 = Date.now();
    if (!force && now2 - volSentAt.current < 180) return;
    volSentAt.current = now2;
    control("volume_set", { volume_level: Math.round(frac * 100) / 100 });
  };

  // Wischen auf der Kachel wechselt den Player (nur bei mehreren). Die
  // Drag-Leisten stoppen ihre Pointer-Events, Buttons erzeugen nur Mini-
  // Deltas — ein echter horizontaler Wisch bleibt eindeutig.
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const onRootDown = (e: { pointerType?: string; clientX?: number; clientY?: number }) => {
    pokeInteract(e);
    if (typeof e.clientX === "number" && typeof e.clientY === "number") {
      swipeStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    }
  };
  const onRootUp = (e: { clientX?: number; clientY?: number }) => {
    const st = swipeStart.current;
    swipeStart.current = null;
    if (!st || ids.length < 2) return;
    if (typeof e.clientX !== "number" || typeof e.clientY !== "number") return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - st.t < 700) {
      setManualIdx((((activeIdx + (dx < 0 ? 1 : -1)) % ids.length) + ids.length) % ids.length);
    }
  };

  // ---- Layout-Engine -------------------------------------------------------
  const { w, h } = box;
  const measured = w > 4 && h > 4;
  const ratio = measured ? w / h : 1.6;
  const layout: "row" | "stack" | "cover" | "bar" =
    layoutCfg === "row" || layoutCfg === "stack" || layoutCfg === "cover" || layoutCfg === "bar"
      ? (layoutCfg as any)
      : ratio >= 1.7 ? "row" : ratio <= 0.8 ? "stack" : "cover";

  // Skala: 1.0 bei ~170 px kleinster Kachelseite; Text-Tab-Schriftgröße wirkt
  // als Multiplikator (Default 20 = neutral), damit der Regler nicht tot ist.
  const userScale = clamp((Number(config?.fontSize) || 20) / 20, 0.7, 1.8);
  const s = clamp(Math.min(w, h) / 170, 0.55, 2.6) * userScale;

  // Host-Modus (frameRadius gesetzt, z. B. Notification-Karte): Padding folgt
  // dem Karten-Radius, sonst quetscht sich das Cover bei kompakter Höhe in
  // die stark gerundete Ecke und die Zeiten kleben am rechten Rand.
  const hostRadius = typeof config?.frameRadius === "number" ? config.frameRadius : null;
  const pad = hostRadius !== null ? Math.max(10 * s, hostRadius * 0.5) : 10 * s;
  const gap = 7 * s;
  const titlePx = clamp(16 * s, 11, 44);
  const artistPx = clamp(12 * s, 9, 32);
  const timePx = clamp(9.5 * s, 8, 22);
  const iconSm = clamp(15 * s, 12, 34);
  const iconLg = clamp(21 * s, 16, 46);
  // frameRadius: Host-Container (z. B. Notification-Karte) gibt den Radius
  // vor, damit die Ecken exakt zu den Geschwister-Karten passen. Der Cover-
  // Radius folgt konzentrisch (Innenradius = Außenradius − Abstand).
  const tileRadius = hostRadius ?? clamp(12 * s, 8, 22);
  const coverRadius = coverCorners === "circle" ? 9999 : coverCorners === "square" ? 0
    : hostRadius !== null ? Math.max(5, hostRadius - pad + 2) : clamp(9 * s, 5, 18);

  // Platz-Budget: Zeilenhöhen der optionalen Elemente. Wenn die Summe nicht in
  // die verfügbare Höhe passt, fliegen Elemente in dieser Reihenfolge raus:
  // Punkte → Fortschritt → Steuerung → Interpret. Titel bleibt immer.
  const rows = {
    title: titlePx * 1.25,
    name: artistPx * 1.1,
    artist: artistPx * 1.3,
    progress: 4 * s + timePx * 1.3 + 3 * s,
    volume: clamp(14 * s, 12, 30),
    controls: iconLg * 1.15,
    dots: 10 * s,
  };
  function fitElements(availH: number, availW: number) {
    const want = {
      name: showPlayerName && !!playerName,
      artist: showArtist && !!artist,
      progress: hasProgress,
      volume: showVolume && hasVolume && availW >= 120 * s,
      controls: showControls && availW >= 150 * s,
      // Bei "nur anzeigen wenn etwas läuft" keine Punkte: manuell zu einem
      // stillen Player zu wechseln würde das Widget sofort ausblenden —
      // dann entscheidet Auto-Follow allein.
      dots: ids.length > 1 && !hideWhenIdle && availW >= 90 * s,
    };
    const need = () =>
      rows.title +
      (want.name ? rows.name + gap * 0.3 : 0) +
      (want.artist ? rows.artist + gap * 0.5 : 0) +
      (want.progress ? rows.progress + gap * 0.7 : 0) +
      (want.volume ? rows.volume + gap * 0.6 : 0) +
      (want.controls ? rows.controls + gap : 0) +
      (want.dots ? rows.dots + gap * 0.5 : 0);
    // Drop-Reihenfolge: Punkte → Fortschritt → Lautstärke → Player-Name →
    // Interpret → Steuerung. Play/Pause überlebt am längsten — Titel bleibt.
    for (const key of ["dots", "progress", "volume", "name", "artist", "controls"] as const) {
      if (need() <= availH) break;
      want[key] = false;
    }
    return { ...want, fitsTitle: rows.title <= availH + 2 };
  }

  // ---- Kleinst-Zustände ----------------------------------------------------
  const textMain = glass.isLight ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.96)";
  const textSub = glass.isLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.6)";

  // Player-Umschalter: dezente Punkte mit Deckel-Größe, aber großzügiger
  // (unsichtbarer) Tap-Fläche — das Padding schafft zugleich Abstand zum Rest.
  const dotBtns = (main: string, faint: string) => (
    <div className="flex items-center" style={{ gap: 2 * s }}>
      {ids.map((id, i) => (
        <button key={`${id}-${i}`} onClick={(e) => { e.stopPropagation(); setManualIdx(i); }} aria-label={id}
          className="flex items-center justify-center" style={{ padding: clamp(5 * s, 5, 11) }}>
          <span className="rounded-full transition-all" style={{
            width: clamp((i === activeIdx ? 6 : 4.5) * s, 4, i === activeIdx ? 10 : 7),
            height: clamp((i === activeIdx ? 6 : 4.5) * s, 4, i === activeIdx ? 10 : 7),
            backgroundColor: i === activeIdx ? main : faint,
          }} />
        </button>
      ))}
    </div>
  );

  // Punkte als positionierbarer Overlay (unten rechts / oben rechts / unten
  // mittig) — optional nur bei Hover/Tipp sichtbar, mit sanfter Blende.
  const dotsVisible = !dotsOnInteract || interacting;
  const dotsPosStyle: React.CSSProperties =
    dotsPos === "top-right" ? { top: pad * 0.35, right: pad * 0.4 } :
    dotsPos === "bottom-center" ? { bottom: pad * 0.3, left: "50%", transform: "translateX(-50%)" } :
    { bottom: pad * 0.3, right: pad * 0.4 };
  const dotsWrap = (main: string, faint: string) => (
    <div className="absolute" style={{ ...dotsPosStyle, zIndex: 2, opacity: dotsVisible ? 1 : 0, transition: "opacity 0.25s", pointerEvents: dotsVisible ? "auto" : "none" }}>
      {dotBtns(main, faint)}
    </div>
  );

  if (ids.length === 0) {
    return (
      <div ref={setEl} className="w-full h-full flex flex-col items-center justify-center text-white/40 gap-2 text-center p-2" style={{ fontSize: 13 }}>
        <Music size={18} className="opacity-60" />
        {t("Kein Media-Player gewählt — im Inspector wählen.")}
      </div>
    );
  }
  if (error && Object.keys(statesDict).length === 0) {
    return (
      <div ref={setEl} className="w-full h-full flex items-center justify-center text-red-400/70 text-center p-3" style={{ fontSize: 12 }}>
        {t(error)}
      </div>
    );
  }
  if (!hasMedia) {
    return (
      <div ref={setEl} onPointerEnter={pokeInteract} onPointerDown={onRootDown} onPointerUp={onRootUp} onPointerLeave={endInteract}
        className="relative w-full h-full flex flex-col items-center justify-center gap-2 text-center overflow-hidden" style={{ ...cardBox, borderRadius: tileRadius }}>
        <Music size={clamp(20 * s, 16, 40)} style={{ color: textSub }} />
        {h >= 70 && <span style={{ fontSize: clamp(12 * s, 10, 24), color: textSub }}>{t("Nichts läuft gerade")}</span>}
        {/* Auch im Leerlauf umschaltbar bleiben — sonst gäbe es von einem
            stillen Player keinen Weg zurück zu den anderen. */}
        {ids.length > 1 && !hideWhenIdle && dotsWrap(textMain, glass.isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.35)")}
      </div>
    );
  }

  // ---- Bausteine -----------------------------------------------------------
  const isVinyl = coverCorners === "circle";
  const coverImg = (side: number, radius: number | string) => (
    <div className="relative shrink-0 overflow-hidden" style={{ width: side, height: side, borderRadius: radius, backgroundColor: glass.isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)", boxShadow: "0 4px 18px rgba(0,0,0,0.28)" }}>
      {artOk && artSrc ? (
        // borderRadius am Bild selbst: WebKit/Blink verlieren das runde Clipping
        // des Parents, sobald das Kind transformiert/animiert wird (Spin) —
        // dann schaut das eckige Cover durch. So ist das Bild selbst rund.
        <img src={artSrc} alt={album || title} decoding="async" onError={() => setArtOk(false)}
          className="w-full h-full object-cover"
          style={{ borderRadius: "inherit", ...(isVinyl && vinylSpin ? { animation: "mf-vinyl-spin 4s linear infinite", animationPlayState: isPlaying ? "running" : "paused" } : {}) }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><Music size={clamp(side * 0.4, 14, 60)} style={{ color: textSub }} /></div>
      )}
      {isVinyl && (
        <>
          {/* Rillen-Vignette zum Rand — macht aus dem Kreis eine Platte */}
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, transparent 34%, rgba(0,0,0,0.14) 62%, rgba(0,0,0,0.38) 100%)" }} />
          {/* Spindel-Loch mit hellem Label-Ring (dreht nicht mit — sitzt mittig) */}
          <div className="absolute rounded-full pointer-events-none"
            style={{
              left: "50%", top: "50%", transform: "translate(-50%, -50%)",
              width: Math.max(6, side * 0.11), height: Math.max(6, side * 0.11),
              backgroundColor: "#0b0b0b",
              boxShadow: `0 0 0 ${Math.max(1.5, side * 0.014)}px rgba(255,255,255,0.35), 0 0 0 ${side * 0.055}px rgba(0,0,0,0.22)`,
            }} />
        </>
      )}
    </div>
  );

  const titleEl = (color: string, sub: string, fit: ReturnType<typeof fitElements>, center = false) => (
    <div className="min-w-0 w-full">
      {fit.name && (
        // Apple-Stil: Player-Name als gedimmte Zeile überm Titel — bei
        // mehreren Playern schaltet ein Tipp darauf zum nächsten weiter.
        <button
          onClick={(e) => { if (ids.length < 2) return; e.stopPropagation(); setManualIdx((activeIdx + 1) % ids.length); }}
          className={`block max-w-full truncate ${center ? "mx-auto text-center" : "text-left"} ${ids.length > 1 ? "cursor-pointer active:opacity-60" : "cursor-default"}`}
          style={{ fontSize: artistPx * 0.85, lineHeight: 1.3, color: sub, fontWeight: 600, letterSpacing: "0.02em", textAlign: "inherit" }}
          aria-label={t("Tipp auf den Namen wechselt den Player.")}>
          {playerName}
        </button>
      )}
      <SmartText text={title || t("Unbekannter Titel")} px={titlePx} color={color} weight={600} mode={overflowMode} center={center} />
      {fit.artist && <SmartText text={artist} px={artistPx} color={sub} mode={overflowMode} center={center} />}
    </div>
  );

  const progressBar = (accent: string, sub: string, track: string) => {
    const shownSec = seekPreview !== null ? seekPreview * duration : position;
    return (
      <div className="w-full" style={{ marginTop: gap * 0.4 }}>
        <DragBar value={duration ? shownSec / duration : 0} height={4 * s} hitPad={Math.max(6, 5 * s)}
          accent={accent} track={track}
          onDrag={(f) => setSeekPreview(f)} onCommit={doSeek} />
        <div className="flex justify-between" style={{ fontSize: timePx, color: sub, fontVariantNumeric: "tabular-nums", marginTop: 1 * s }}>
          <span>{fmtTime(shownSec)}</span>
          <span>-{fmtTime(Math.max(0, duration - shownSec))}</span>
        </div>
      </div>
    );
  };

  // Lautstärke im Apple-Stil: das leiseste Element der Karte — ganz unten,
  // dünner als die Zeitleiste, ohne Akzentfarbe, gedimmte Speaker an beiden
  // Enden. Präsenz kommt erst beim Anfassen (große unsichtbare Trefferfläche).
  const volumeRow = (sub: string, track: string) => {
    const vol = volPreview ?? (hasVolume ? Number(attrs.volume_level) : 0);
    const iconStyle = { color: sub, opacity: 0.7, flexShrink: 0 } as React.CSSProperties;
    return (
      <div className="w-full flex items-center" style={{ gap: 5 * s, marginTop: gap * 0.6 }}>
        <Volume size={clamp(10 * s, 9, 20)} style={iconStyle} />
        <DragBar value={vol} height={Math.max(2, 2.5 * s)} hitPad={Math.max(7, 6 * s)} accent={sub} track={track}
          onDrag={(f) => { setVolPreview(f); sendVolume(f); }}
          onCommit={(f) => { setVolPreview(f); sendVolume(f, true); }} />
        <Volume2 size={clamp(11 * s, 10, 22)} style={iconStyle} />
      </div>
    );
  };

  const controlBtns = (color: string, big: number = iconLg, small: number = iconSm) => (
    <div className="flex items-center" style={{ gap: Math.max(10, 14 * s), color }}>
      <button onClick={(e) => { e.stopPropagation(); control("media_previous_track"); }} className="opacity-70 hover:opacity-100 active:scale-90 transition" aria-label={t("Zurück")}>
        <SkipBack size={small} fill="currentColor" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); control("media_play_pause"); }} className="opacity-95 hover:opacity-100 active:scale-90 transition" aria-label={isPlaying ? t("Pause") : t("Abspielen")}>
        {isPlaying ? <Pause size={big} fill="currentColor" /> : <Play size={big} fill="currentColor" />}
      </button>
      <button onClick={(e) => { e.stopPropagation(); control("media_next_track"); }} className="opacity-70 hover:opacity-100 active:scale-90 transition" aria-label={t("Weiter")}>
        <SkipForward size={small} fill="currentColor" />
      </button>
    </div>
  );

  const bgArt = artworkBg && artOk && artSrc ? (
    <>
      <img src={artSrc} alt="" aria-hidden="true" decoding="async" onError={() => setArtOk(false)}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ filter: `blur(${bgBlur}px)`, transform: "scale(1.15)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0,0,0,${bgDarken / 100})` }} />
    </>
  ) : null;
  // Auf Artwork-Hintergrund ist heller Text immer lesbarer als das Glas-Theme.
  const onArt = artworkBg && artOk && artSrc;
  const cMain = onArt ? "rgba(255,255,255,0.96)" : textMain;
  const cSub = onArt ? "rgba(255,255,255,0.68)" : textSub;
  const cTrack = onArt ? "rgba(255,255,255,0.22)" : (glass.isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)");
  // Fortschritts-Farbe: eigener Picker gewinnt, sonst bewusst DEZENT
  // (gedimmtes Weiß/Schwarz im Apple-Stil statt Signal-Blau).
  // NUR der eigene Picker. Der frühere Rückfall auf config.color hieß: wer im
  // Text-&-Farbe-Tab die Schriftfarbe ändert, verstellt damit die
  // Fortschrittsleiste — zwei Regler, ein sichtbarer Effekt.
  const accentPick: string = config?.accentColor || "";
  const cAccent = accentPick || (onArt ? "rgba(255,255,255,0.8)" : glass.isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.75)");
  const cFaint = onArt ? "rgba(255,255,255,0.4)" : (glass.isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.35)");

  // ---- COVER: Artwork füllt die Kachel, Info auf Verlauf unten -------------
  if (layout === "cover") {
    // Der Info-Verlauf darf fast die ganze Kachel hochwachsen — oben ist ja
    // nur Artwork. So passen alle aktivierten Elemente immer; erst auf
    // wirklich winzigen Kacheln greift die Prioritäts-Ausblendung.
    const avail = h * 0.9 - pad;
    const fit = fitElements(avail, w - pad * 2);
    const scrimTop = Math.round(h * 0.55);
    return (
      <div ref={setEl} onPointerEnter={pokeInteract} onPointerDown={onRootDown} onPointerUp={onRootUp} onPointerLeave={endInteract}
        className="relative w-full h-full overflow-hidden" style={{ borderRadius: tileRadius, backgroundColor: "rgba(0,0,0,0.35)" }}>
        {artOk && artSrc ? (
          <img src={artSrc} alt={album || title} decoding="async" onError={() => setArtOk(false)} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><Music size={clamp(26 * s, 18, 64)} className="text-white/50" /></div>
        )}
        {fit.fitsTitle && (
          <div className={`absolute inset-x-0 bottom-0 flex flex-col ${itemsClass(alignCfg)}`}
            style={{ padding: pad, paddingTop: scrimTop * 0.45, gap: gap * 0.6, textAlign: alignCfg, background: `linear-gradient(to top, rgba(0,0,0,${0.9 * (scrim / 100)}), rgba(0,0,0,${0.45 * (scrim / 100)}) 55%, transparent)` }}>
            {titleEl("rgba(255,255,255,0.97)", "rgba(255,255,255,0.72)", fit, alignCfg === "center")}
            {fit.progress && progressBar(accentPick || "rgba(255,255,255,0.85)", "rgba(255,255,255,0.65)", "rgba(255,255,255,0.22)")}
            {fit.controls && <div style={{ color: "#fff", marginTop: gap * 0.3 }}>{controlBtns("#fff")}</div>}
            {fit.volume && volumeRow("rgba(255,255,255,0.6)", "rgba(255,255,255,0.18)")}
          </div>
        )}
        {fit.dots && dotsWrap("#fff", "rgba(255,255,255,0.45)")}
      </div>
    );
  }

  // ---- BAR: kompakte Host-Karte (Notification-Stack) -----------------------
  // Deterministisch, KEINE Ausblende-Logik: der Host bestimmt die Höhe, alles
  // Aktivierte rendert immer und skaliert nur. Cover links in Kartenhöhe,
  // Text mittig, Steuerung rechts, Fortschritt als Hairline unten (Apple-
  // Mini-Player-Stil).
  if (layout === "bar") {
    // Text erbt die HOST-Schriftgröße (gemessen am Wurzel-Element) — so
    // skaliert die Karte exakt mit den Geschwister-Notifications, auf jedem
    // Bildschirm. textScale (50–180 %) ist der Fein-Regler obendrauf.
    const txScale = clamp(Number(config?.textScale) || 100, 50, 180) / 100;
    const emPx = (box.fs || 20) * txScale;
    const tPx = emPx * 1.0;   // wie der Notification-Titel (1em, bold)
    const aPx = emPx * 0.8;   // wie deren Sub-Zeilen
    const nPx = emPx * 0.7;
    const tmPx = emPx * 0.62;
    const icL = clamp(emPx * 1.15, 16, 56);
    const icS = clamp(emPx * 0.85, 12, 40);
    // Streifen-Höhe (Balken + Trefferfläche + Zeiten) — reserviert NUR in der
    // Text-/Steuerungs-Spalte. Das Cover füllt die volle Kartenhöhe: der
    // Fortschritt läuft rechts daneben, nicht darunter.
    const stripH = hasProgress
      ? tmPx * 1.3 + Math.max(6, 5 * s) * 2 + Math.max(2.5, 3 * s) + 2
      : 0;
    // Großzügige Seitenränder, Artwork füllt die Kartenhöhe (minus Luft oben/
    // unten) — wie die Icon-Box der Nachbarkarten wirkt es dadurch verankert
    // statt verloren. Cover-Größe-Regler wirkt als Faktor obendrauf.
    const hPad = emPx * 0.75;
    const vPad = emPx * 0.5;
    const side = showCover ? Math.max(0, (h - vPad * 2) * (coverScalePct / 100)) : 0;
    const coverR = coverCorners === "circle" ? 9999 : coverCorners === "square" ? 0 : emPx * 0.8;
    const shownSec = seekPreview !== null ? seekPreview * duration : position;
    return (
      <div ref={setEl} onPointerEnter={pokeInteract} onPointerDown={onRootDown} onPointerUp={onRootUp} onPointerLeave={endInteract}
        className="relative w-full h-full flex items-center overflow-hidden"
        style={{ ...cardBox, borderRadius: tileRadius, paddingLeft: hPad, paddingRight: hPad, paddingTop: vPad, paddingBottom: vPad, gap: gap * 1.6 }}>
        {bgArt}
        {showCover && side > 18 && <div className="relative shrink-0">{coverImg(side, coverR)}</div>}
        {/* Nur die halbe Streifen-Höhe reservieren: der Text rückt dadurch
            weiter nach unten an den Balken — je weniger Elemente aktiv sind,
            desto zentrierter wirkt das Ganze. */}
        <div className="relative flex-1 min-w-0 flex flex-col justify-center" style={{ gap: emPx * 0.12, textAlign: alignCfg, paddingBottom: stripH * 0.45 }}>
          {showPlayerName && playerName && (
            <button onClick={(e) => { if (ids.length < 2) return; e.stopPropagation(); setManualIdx((activeIdx + 1) % ids.length); }}
              className={`block max-w-full truncate ${alignCfg === "center" ? "mx-auto" : ""} ${ids.length > 1 ? "cursor-pointer active:opacity-60" : "cursor-default"}`}
              style={{ fontSize: nPx, lineHeight: 1.25, color: cSub, fontWeight: 600, letterSpacing: "0.02em", textAlign: "inherit" }}
              aria-label={t("Tipp auf den Namen wechselt den Player.")}>
              {playerName}
            </button>
          )}
          <SmartText text={title || t("Unbekannter Titel")} px={tPx} color={cMain} weight={600} mode={overflowMode} center={alignCfg === "center"} />
          {showArtist && artist && <SmartText text={artist} px={aPx} color={cSub} mode={overflowMode} center={alignCfg === "center"} />}
        </div>
        {showControls && <div className="relative shrink-0" style={{ color: cMain, paddingRight: 2 * s, paddingBottom: stripH * 0.45 }}>{controlBtns(cMain, icL, icS)}</div>}
        {hasProgress && (
          <div className="absolute" style={{ left: hPad + (side > 18 ? side + gap * 1.6 : 0), right: hPad + emPx * 0.5, bottom: vPad * 0.45 }}>
            <DragBar value={duration ? shownSec / duration : 0} height={Math.max(2.5, 3 * s)} hitPad={Math.max(6, 5 * s)}
              accent={cAccent} track={cTrack}
              onDrag={(f) => setSeekPreview(f)} onCommit={doSeek} />
            <div className="flex justify-between" style={{ fontSize: tmPx, color: cSub, fontVariantNumeric: "tabular-nums", marginTop: 1 }}>
              <span>{fmtTime(shownSec)}</span>
              <span>-{fmtTime(Math.max(0, duration - shownSec))}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- STACK: Cover oben, Info darunter (hohe Kacheln) ---------------------
  if (layout === "stack") {
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    // ALLE eingeschalteten Elemente haben im Hochkant Vorrang: ihr Platz wird
    // komplett reserviert (Titel, Interpret, Fortschritt, Steuerung, Punkte),
    // das Cover bekommt die restliche Höhe. Deine Auswahl gewinnt — das Cover
    // passt sich an, nicht umgekehrt.
    const reserved =
      rows.title +
      (showArtist && artist ? rows.artist + gap * 0.5 : 0) +
      (hasProgress ? rows.progress + gap * 0.7 : 0) +
      (showVolume && hasVolume ? rows.volume + gap * 0.6 : 0) +
      (showPlayerName && playerName ? rows.name + gap * 0.3 : 0) +
      (showControls ? rows.controls + gap : 0) +
      (ids.length > 1 ? rows.dots + gap * 0.5 : 0) +
      gap * 1.5;
    let side = showCover ? Math.max(0, Math.min(innerW, innerH - reserved)) * (coverScalePct / 100) : 0;
    side = Math.max(0, side);
    const below = innerH - (side ? side + gap : 0);
    const fit = fitElements(below, innerW);
    return (
      <div ref={setEl} onPointerEnter={pokeInteract} onPointerDown={onRootDown} onPointerUp={onRootUp} onPointerLeave={endInteract}
        className="relative w-full h-full flex flex-col items-center overflow-hidden" style={{ ...cardBox, borderRadius: tileRadius, padding: pad, gap }}>
        {bgArt}
        {showCover && side > 24 && <div className="relative">{coverImg(side, coverRadius)}</div>}
        {/* Hochkant = klassische Musik-Karte: Default mittig, align gewinnt. */}
        <div className={`relative flex-1 min-h-0 w-full flex flex-col justify-center ${itemsClass(stackAlign)}`} style={{ gap: gap * 0.6, textAlign: stackAlign }}>
          {fit.fitsTitle && titleEl(cMain, cSub, fit, stackAlign === "center")}
          {fit.progress && <div className="w-full" style={{ maxWidth: Math.max(side, 220 * s) }}>{progressBar(cAccent, cSub, cTrack)}</div>}
          {fit.controls && <div style={{ color: cMain, marginTop: gap * 0.3 }}>{controlBtns(cMain)}</div>}
          {fit.volume && <div className="w-full" style={{ maxWidth: Math.max(side, 220 * s) }}>{volumeRow(cSub, cTrack)}</div>}
        </div>
        {fit.dots && dotsWrap(cMain, cFaint)}
      </div>
    );
  }

  // ---- ROW: Cover links, Info daneben — linksbündig ------------------------
  const innerH = h - pad * 2;
  const side = showCover ? clamp(innerH * (coverScalePct / 100), 0, innerH) : 0;
  const fit = fitElements(innerH, w - pad * 2 - (side ? side + gap * 1.6 : 0));
  return (
    <div ref={setEl} onPointerEnter={pokeInteract} onPointerDown={onRootDown} onPointerUp={onRootUp} onPointerLeave={endInteract}
      className="relative w-full h-full flex items-center overflow-hidden" style={{ ...cardBox, borderRadius: tileRadius, padding: pad, gap: gap * 1.6 }}>
      {bgArt}
      {showCover && side > 20 && <div className="relative">{coverImg(side, coverRadius)}</div>}
      <div className={`relative flex-1 min-w-0 h-full flex flex-col justify-center ${itemsClass(alignCfg)}`} style={{ gap: gap * 0.6, textAlign: alignCfg }}>
        {fit.fitsTitle && titleEl(cMain, cSub, fit, alignCfg === "center")}
        {fit.progress && progressBar(cAccent, cSub, cTrack)}
        {fit.controls && <div style={{ color: cMain, marginTop: gap * 0.4 }}>{controlBtns(cMain)}</div>}
        {fit.volume && volumeRow(cSub, cTrack)}
      </div>
      {fit.dots && dotsWrap(cMain, cFaint)}
    </div>
  );
}

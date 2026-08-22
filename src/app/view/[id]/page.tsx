"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { connectLiveSync } from "@/lib/live-socket";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import WallpaperEngine from "@/components/WallpaperEngine";
import { renderWidget } from "@/components/widgets/renderWidget";
import { ViewThemeScope } from "@/lib/ui/view-theme";
import { useHaLiveStates } from "@/lib/ha/useHaLiveStates";
import { calendarOwnSurface } from "@/lib/widgets/calendar-surface";
import { cameraFullscreenTriggers, cameraTriggerMatches } from "@/lib/widgets/camera-fullscreen";
import ActionRefusedToast from "@/components/ActionRefusedToast";
import { useT } from "@/lib/i18n/LocaleProvider";

const ResponsiveGridLayout = WidthProvider(Responsive);

/**
 * "Diese Ansicht gibt es nicht."
 *
 * Bewusst ruhig gehalten — das hängt an einer Wand, nicht auf einem
 * Schreibtisch — aber unmissverständlich. Bis 1.5.0 stand hier ein fest
 * eingebautes Uhr-Kalender-Wetter, für einen Tippfehler genauso wie für eine
 * gelöschte Ansicht. Das sah vollständig aus, also fiel der Fehler erst auf,
 * wenn Änderungen aus dem Editor tagelang nicht ankamen.
 *
 * Eigene Komponente, weil sie INNERHALB des LocaleProvider stehen muss: die
 * Seite selbst rendert den Provider erst und kann useT() darum nicht rufen.
 */
function MissingViewNotice({ viewId }: { viewId: string }) {
  const t = useT();
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm p-8">
      <div className="max-w-md text-center">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-3">Magic Frame</p>
        <h1 className="text-2xl font-semibold mb-3">{t("Diese Ansicht gibt es nicht")}</h1>
        <p className="text-white/60 text-sm leading-relaxed">
          {t("Unter dieser Adresse ist keine Ansicht gespeichert:")}{" "}
          <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[0.9em]">/view/{viewId}</code>
        </p>
        <p className="text-white/35 text-[13px] leading-relaxed mt-4">
          {t("Vertippt, oder die Ansicht wurde umbenannt oder gelöscht. Die richtige Adresse steht im Editor unter „Views“ — jede Karte zeigt ihre eigene.")}
        </p>
      </div>
    </div>
  );
}

export default function DashboardView({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const dashboardId = unwrappedParams.id;
  
  const [layout, setLayout] = useState<any[]>([]);
  // null = noch nichts geladen, true = diese Ansicht gibt es nicht.
  const [viewMissing, setViewMissing] = useState(false);
  // Use the last-known wallpaper config from localStorage as the initial state
  // so a reload starts the right wallpaper source immediately, without the
  // ~200 ms window where the Engine used to fall through to a generic
  // Pollinations request. First-ever visit on a fresh browser is still
  // briefly empty (no cache yet) — every reload after that is instant.
  // Bytes-wise this stores only the config (source, query, interval, …),
  // not the images themselves, so image quality + size stay untouched.
  const [wallpaperConfig, setWallpaperConfig] = useState<any>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(`mf-wallpaper-${dashboardId}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [rowHeight, setRowHeight] = useState(40);
  const [userHiddenWidgets, setUserHiddenWidgets] = useState<Record<string, boolean>>({});
  const [autoHiddenWidgets, setAutoHiddenWidgets] = useState<Record<string, boolean>>({});
  // #6: widgets with showWhenEntity are shown/hidden from a LIVE HA entity state.
  // We listen via the SSE bridge (same broadcaster the HA widget uses) → instant,
  // no polling. autoHideSeconds turns it into a pulse (show on trigger, hide after N s).
  const [triggerHiddenWidgets, setTriggerHiddenWidgets] = useState<Record<string, boolean>>({});
  // #41: welche Kamera gerade im Vollbild stehen soll. Eigener Zustand statt
  // aus der Sichtbarkeit abgeleitet — eine dauerhaft sichtbare Kamera kann so
  // auf eine eigene Entity hin aufpoppen. `seq` zählt die Befehle, damit ein
  // zweites Klingeln auch nach einem Schliessen von Hand wieder ankommt.
  const [cameraFullscreen, setCameraFullscreen] = useState<
    Record<string, { open: boolean; seq: number }>
  >({});
  // Per-view settings (orientation, autoRefreshHours, …) from /api/layout/get.
  const [viewSettings, setViewSettings] = useState<any>(null);

  // Trigger configs from the current layout. The entity list feeds the live
  // subscription; per-widget config drives visibility. Rebuilt each render but
  // cheap, and the SSE hook + effect both key off stable values (idsKey/layout).
  const triggerConfigs = (layout || [])
    .map((w: any) => ({
      i: w.i,
      ent: (w.config?.showWhenEntity || "").trim(),
      st: (w.config?.showWhenState ?? "").trim(),
      autoHide: Math.max(0, Number(w.config?.autoHideSeconds) || 0),
    }))
    .filter((tg: any) => tg.ent);
  // Button widgets with an HA auto-trigger: HA "presses" one of the button's
  // slots (haTriggerButton 1-4), which runs THAT slot's own action + targets via
  // the existing WIDGET_ACTION path — same as a tap. No separate group to keep.
  const buttonTriggers = (layout || [])
    .filter((w: any) => w.type === "ButtonWidget.tsx" && (w.config?.haTriggerEntity || "").trim())
    .map((w: any) => {
      const slot = w.config.haTriggerButton || "1";
      const suffix = slot === "1" ? "" : slot;
      return {
        i: w.i,
        ent: (w.config.haTriggerEntity || "").trim(),
        st: (w.config.haTriggerState ?? "").trim(),
        action: w.config[`actionType${suffix}`] || "toggle",
        targets: Array.isArray(w.config[`targets${suffix}`]) ? w.config[`targets${suffix}`] : [],
        autoHide: Math.max(0, Number(w.config.haTriggerAutoHide) || 0),
      };
    });

  // #41: Kameras, die auf einen HA-Auslöser hin ins VOLLBILD springen sollen
  // statt nur in Kachelgrösse zu erscheinen. Die Ableitung (eigene Entity oder
  // Sichtbarkeitsregel, Haltezeit, Altlast-Schlüssel) steht in camera-fullscreen.ts.
  const camFsTriggers = cameraFullscreenTriggers(layout);

  const triggerEntityIds = Array.from(
    new Set([
      ...triggerConfigs.map((tg: any) => tg.ent),
      ...buttonTriggers.map((b: any) => b.ent),
      ...camFsTriggers.map((c) => c.ent),
    ]),
  );

  // Live states for ALL trigger entities (per-widget + button), pushed over SSE
  // the moment they change in HA. enabled=false (no triggers) opens no stream.
  const { states: liveTriggerStates } = useHaLiveStates(triggerEntityIds, triggerEntityIds.length > 0);

  // Edge-detection + auto-hide timers live in refs so they survive re-renders
  // without being effect dependencies (which would reset the timers).
  const triggerMatchRef = useRef<Record<string, boolean>>({});
  const autoHideTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Display-Heartbeat: meldet Viewport-Größe an die App (In-Memory-Registry),
  // damit die Karten-Vorschau im Editor optional mit der ECHTEN Display-Größe
  // rechnen kann. Fire-and-forget — darf den Kiosk niemals stören.
  useEffect(() => {
    let cid = "";
    try {
      cid = localStorage.getItem("mf-client-id") || "";
      if (!cid) {
        cid = Math.random().toString(36).slice(2, 10);
        localStorage.setItem("mf-client-id", cid);
      }
    } catch { cid = "anon"; }
    const send = () => {
      try {
        fetch("/api/view-clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dashboardId,
            clientId: cid,
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: window.devicePixelRatio || 1,
          }),
          keepalive: true,
        }).catch(() => {});
      } catch { /* nie den View brechen */ }
    };
    send();
    const iv = setInterval(send, 60_000);
    let rt: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(send, 1500); };
    window.addEventListener("resize", onResize);
    return () => { clearInterval(iv); clearTimeout(rt); window.removeEventListener("resize", onResize); };
  }, [dashboardId]);

  // Derive each trigger widget's visibility from the live states.
  //  - autoHide = 0 → "show while active": visible exactly while the entity matches.
  //  - autoHide > 0 → "pulse": on the rising edge (became matching) show it, then
  //    auto-hide after N seconds, regardless of the entity going inactive again —
  //    so a doorbell that's "on" for only a moment still shows the cam for N s.
  useEffect(() => {
    if (triggerConfigs.length === 0) {
      setTriggerHiddenWidgets((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }
    const updates: Record<string, boolean> = {};
    const startHidden: string[] = [];
    for (const tg of triggerConfigs) {
      const cur = String(liveTriggerStates[tg.ent]?.state ?? "").toLowerCase();
      const match = tg.st
        ? cur === tg.st.toLowerCase()
        : !!cur && !["off", "unavailable", "unknown", "none", ""].includes(cur);
      const prevMatch = triggerMatchRef.current[tg.i] ?? false;
      triggerMatchRef.current[tg.i] = match;

      if (tg.autoHide > 0) {
        // Pulse: only the rising edge reveals it; a timer hides it again.
        if (match && !prevMatch) {
          updates[tg.i] = false; // show now
          if (autoHideTimersRef.current[tg.i]) clearTimeout(autoHideTimersRef.current[tg.i]);
          autoHideTimersRef.current[tg.i] = setTimeout(() => {
            setTriggerHiddenWidgets((p) => ({ ...p, [tg.i]: true }));
            delete autoHideTimersRef.current[tg.i];
          }, tg.autoHide * 1000);
        } else {
          startHidden.push(tg.i); // hidden until first trigger; keep state after
        }
      } else {
        // Show-while-active: visibility mirrors the live match.
        updates[tg.i] = !match;
      }
    }

    setTriggerHiddenWidgets((prev) => {
      const next = { ...prev };
      for (const id of startHidden) if (!(id in next)) next[id] = true;
      Object.assign(next, updates);
      // Drop bookkeeping for widgets that no longer carry a trigger.
      for (const k of Object.keys(next)) {
        if (!triggerConfigs.some((tg: any) => tg.i === k)) delete next[k];
      }
      const same =
        Object.keys(next).length === Object.keys(prev).length &&
        Object.keys(next).every((k) => prev[k] === next[k]);
      return same ? prev : next;
    });
  }, [liveTriggerStates, layout]);

  // Button HA auto-trigger: on the rising edge of the entity match, dispatch the
  // button's action (show/hide/toggle) onto its target GROUP via WIDGET_ACTION —
  // the exact path a tap uses. autoHide fires the inverse action after N seconds
  // (a doorbell shows the group, then hides it again on its own).
  const buttonTriggerMatchRef = useRef<Record<string, boolean>>({});
  const buttonAutoHideTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (buttonTriggers.length === 0) return;
    for (const bt of buttonTriggers) {
      const cur = String(liveTriggerStates[bt.ent]?.state ?? "").toLowerCase();
      const match = bt.st
        ? cur === bt.st.toLowerCase()
        : !!cur && !["off", "unavailable", "unknown", "none", ""].includes(cur);
      const prevMatch = buttonTriggerMatchRef.current[bt.i] ?? false;
      buttonTriggerMatchRef.current[bt.i] = match;

      // Only the rising edge fires — avoids re-firing on every SSE delta.
      if (match && !prevMatch) {
        if (bt.action === "refresh") {
          // HA-triggered full reload — refresh a display from an entity (e.g.
          // an input_boolean pulse to clear the cache on all wall panels).
          if (typeof window !== "undefined") window.location.reload();
        } else if (bt.targets.length > 0) {
          window.dispatchEvent(
            new CustomEvent("WIDGET_ACTION", { detail: { targets: bt.targets, actionType: bt.action } }),
          );
          if (bt.autoHide > 0) {
            if (buttonAutoHideTimersRef.current[bt.i]) clearTimeout(buttonAutoHideTimersRef.current[bt.i]);
            const inverse = bt.action === "show" ? "hide" : bt.action === "hide" ? "show" : "toggle";
            buttonAutoHideTimersRef.current[bt.i] = setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("WIDGET_ACTION", { detail: { targets: bt.targets, actionType: inverse } }),
              );
              delete buttonAutoHideTimersRef.current[bt.i];
            }, bt.autoHide * 1000);
          }
        }
      }
    }
  }, [liveTriggerStates, layout]);

  // #41: Vollbild auf Auslöser. Die Flankenerkennung spiegelt die
  // Sichtbarkeits-Logik oben — sie reagiert auf den WECHSEL, nicht auf den
  // Zustand. Sonst risse ein von Hand geschlossenes Vollbild sofort wieder auf,
  // solange die Klingel noch „an" meldet.
  //
  // Aus PR #83 von @chimmidev übernommen, inklusive der beiden Fälle, die die
  // erste Fassung nicht konnte: Puls-Auslöser (Klingel ist nur einen Moment
  // „an", das Vollbild bleibt trotzdem die Haltezeit stehen) und zweimal
  // klingeln (die Haltezeit beginnt neu, statt dass sich Timer stapeln).
  const camFsMatchRef = useRef<Record<string, boolean>>({});
  const camFsTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  /** Was zuletzt befohlen wurde — damit „zu" nicht sinnlos wiederholt wird. */
  const camFsOpenRef = useRef<Record<string, boolean>>({});

  const commandFullscreen = useCallback((id: string, open: boolean) => {
    // Ein „zu" an eine schon geschlossene Kamera wäre ein Befehl ohne Wirkung
    // und würde nur Render auslösen. Ein „auf" geht IMMER durch — genau das
    // macht das zweite Klingeln nach einem Schliessen von Hand wieder sichtbar.
    if (!open && camFsOpenRef.current[id] !== true) return;
    camFsOpenRef.current[id] = open;
    setCameraFullscreen((prev) => ({
      ...prev,
      [id]: { open, seq: (prev[id]?.seq ?? 0) + 1 },
    }));
  }, []);

  const clearCamFsTimer = (id: string) => {
    if (!camFsTimersRef.current[id]) return;
    clearTimeout(camFsTimersRef.current[id]);
    delete camFsTimersRef.current[id];
  };

  useEffect(() => {
    // 1) Kameras, die keinen Auslöser mehr haben — Schalter aus, Entity
    //    gelöscht, Kachel entfernt. Ohne diesen Durchgang bliebe ein gerade
    //    offenes Vollbild für immer stehen: die Schleife unten sieht die
    //    Kamera nicht mehr, also käme nie ein „zu". Ausgerechnet der Handgriff,
    //    mit dem man ein hängendes Vollbild loswerden will, machte es
    //    unlösbar. Die Sichtbarkeits-Logik weiter oben räumt genauso auf.
    const live = new Set(camFsTriggers.map((c) => c.i));
    for (const id of Object.keys(camFsMatchRef.current)) {
      if (live.has(id)) continue;
      delete camFsMatchRef.current[id];
      clearCamFsTimer(id);
      commandFullscreen(id, false);
    }

    for (const cam of camFsTriggers) {
      const match = cameraTriggerMatches(liveTriggerStates[cam.ent]?.state, cam.st);
      const prevMatch = camFsMatchRef.current[cam.i] ?? false;
      // Die Flanke wird IMMER mitgeführt, auch wenn unten nichts passiert —
      // sonst poppt eine versteckte Kamera nach dem Einblenden verspätet auf.
      camFsMatchRef.current[cam.i] = match;

      // Wer die Kamera von Hand weggeschaltet hat (Knopf-Widget), will sie
      // nicht beim nächsten Klingeln bildschirmfüllend zurückbekommen. Das
      // war schon in v1.5.0 so und bleibt so.
      if (userHiddenWidgets[cam.i] || autoHiddenWidgets[cam.i]) {
        clearCamFsTimer(cam.i);
        commandFullscreen(cam.i, false);
        continue;
      }

      if (match && !prevMatch) {
        commandFullscreen(cam.i, true);
        // Zweimal klingeln: die Haltezeit beginnt neu, statt dass sich Timer stapeln.
        clearCamFsTimer(cam.i);
        if (cam.hold > 0) {
          camFsTimersRef.current[cam.i] = setTimeout(() => {
            delete camFsTimersRef.current[cam.i];
            commandFullscreen(cam.i, false);
          }, cam.hold * 1000);
        }
      } else if (!match && prevMatch && !camFsTimersRef.current[cam.i]) {
        // Kein Puls läuft, also folgt das Vollbild der Entity und geht zu.
        // Absichtlich am laufenden Timer festgemacht und nicht an `hold`: wird
        // die Haltezeit im Editor geändert, während das Vollbild offen steht,
        // passt die Bedingung sonst nicht mehr und es bliebe hängen.
        commandFullscreen(cam.i, false);
      }
    }
  }, [liveTriggerStates, layout, userHiddenWidgets, autoHiddenWidgets, commandFullscreen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear pending auto-hide timers on unmount (the ref objects are stable).
  useEffect(() => {
    const widgetTimers = autoHideTimersRef.current;
    const btnTimers = buttonAutoHideTimersRef.current;
    const camTimers = camFsTimersRef.current;
    return () => {
      for (const id of Object.keys(widgetTimers)) clearTimeout(widgetTimers[id]);
      for (const id of Object.keys(btnTimers)) clearTimeout(btnTimers[id]);
      for (const id of Object.keys(camTimers)) clearTimeout(camTimers[id]);
    };
  }, []);

  // Per-view auto-refresh: a full reload every N hours clears the in-page cache
  // (image blobs, accumulated DOM) that piles up on long-running wall displays
  // — Tizen / tablets especially. Set per view in View Settings
  // (settings.autoRefreshHours); 0 / unset = off. Timer resets on value change.
  useEffect(() => {
    const hours = Number(viewSettings?.autoRefreshHours) || 0;
    if (hours <= 0) return;
    const id = setTimeout(() => {
      if (typeof window !== "undefined") window.location.reload();
    }, hours * 3600 * 1000);
    return () => clearTimeout(id);
  }, [viewSettings?.autoRefreshHours]);

  // Randlos-Modus (opt-in pro View): kein Außenrand, keine Bodenreserve,
  // Kachelabstand einstellbar (Default 0 im Randlos-Modus). Bestehende Views
  // (edgeToEdge unset) rechnen exakt wie bisher — kein Pixel ändert sich.
  const edgeToEdge = viewSettings?.edgeToEdge === true;
  const tileGap = edgeToEdge
    ? Math.max(0, Math.min(16, Number(viewSettings?.tileGap ?? 0) || 0))
    : 16;

  useEffect(() => {
     if (typeof window !== "undefined") {
       const computeRowHeight = () => {
          if (edgeToEdge) {
             // Randlos: volle Höhe minus 23 Kachelabstände.
             const availableH = window.innerHeight - tileGap * 23;
             return Math.max(10, Math.floor(availableH / 24));
          }
          // Bottom offset is 65px. Padding top is 32px (md:pt-8).
          // 23 vertical gaps of 16px = 368px.
          const availableH = (window.innerHeight - 65) - 32 - 368;
          return Math.max(10, Math.floor(availableH / 24));
       };
       // Initial: synchron, ohne Delay.
       setRowHeight((prev) => {
          const next = computeRowHeight();
          return prev === next ? prev : next;
       });
       // Debounced + diff-aware: Tizen feuert manchmal Resize-Bursts
       // (OS-Overlays, Statusbar-Toggles), die sonst rowHeight wackeln lassen.
       let raf = 0;
       let to: any = null;
       const resize = () => {
          if (to) clearTimeout(to);
          to = setTimeout(() => {
             cancelAnimationFrame(raf);
             raf = requestAnimationFrame(() => {
                setRowHeight((prev) => {
                   const next = computeRowHeight();
                   // Nur committen wenn sich tatsächlich was geändert hat.
                   return prev === next ? prev : next;
                });
             });
          }, 150);
       };
       window.addEventListener('resize', resize);
       return () => {
          window.removeEventListener('resize', resize);
          if (to) clearTimeout(to);
          cancelAnimationFrame(raf);
       };
     }
     // edgeToEdge/tileGap kommen async mit den View-Settings — neu rechnen.
  }, [edgeToEdge, tileGap]);

  // Dummy Wallpapers for initial view
  const wallpapers = [
    { id: "1", url: "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=1080&q=80", metadata: { cameraModel: "Sony A7III", locationName: "Yosemite" } },
    { id: "2", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80", metadata: { cameraModel: "Leica M10", locationName: "Beach Sunset" } }
  ];

  const objectsEqual = (o1: any, o2: any): boolean => {
    if (o1 === o2) return true;
    if (typeof o1 !== 'object' || o1 === null || typeof o2 !== 'object' || o2 === null) return false;
    const keys1 = Object.keys(o1);
    const keys2 = Object.keys(o2);
    if (keys1.length !== keys2.length) return false;
    for (let key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!objectsEqual(o1[key], o2[key])) return false;
    }
    return true;
  };

  const [overrideDashboardId, setOverrideDashboardId] = useState<string | null>(null);
  const effectiveDashboardId = overrideDashboardId || dashboardId;

  // Use ref to avoid stale closures in socket events
  const effectiveIdRef = useRef(effectiveDashboardId);
  // Server-Version beim ersten Connect merken — ändert sie sich bei einem
  // späteren Reconnect (= Update wurde deployt), lädt das Display einmal neu.
  const serverVersionRef = useRef<string>("");
  useEffect(() => {
     effectiveIdRef.current = effectiveDashboardId;
  }, [effectiveDashboardId]);

  const fetchLayout = async () => {
    try {
      const res = await fetch(`/api/layout/get?dashboardId=${effectiveIdRef.current}&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      // Array (auch leer) = gültiges Layout des Views → übernehmen. Ein leeres
      // Array ist ein bewusst geleerter View und darf NICHT die Defaults
      // zurückholen (#27). Nur null (Dashboard existiert nicht) löst den
      // Fallback unten aus.
      if (Array.isArray(data.layout)) {
        setViewMissing(false);
        setLayout((prev: any[]) => objectsEqual(prev, data.layout) ? prev : data.layout);
        
        setUserHiddenWidgets(prev => {
            const nextHidden = { ...prev };
            let changed = false;
            data.layout.forEach((w: any) => {
                if (!(w.i in prev)) {
                    const hide = !!w.config?.defaultHidden;
                    nextHidden[w.i] = hide;
                    changed = true;
                }
            });
            return changed ? nextHidden : prev;
        });

        if (data.wallpaper) {
           setWallpaperConfig((prev: any) => objectsEqual(prev, data.wallpaper) ? prev : data.wallpaper);
           // Stash the config so the next reload starts on the right
           // wallpaper source immediately. Only the config, not the image
           // bytes — original resolution + source quality stay 1:1.
           try {
             localStorage.setItem(
               `mf-wallpaper-${effectiveIdRef.current}`,
               JSON.stringify(data.wallpaper),
             );
           } catch {
             // Quota exceeded / private mode — just skip caching.
           }
        }

        if (data.settings) {
          setViewSettings((prev: any) => (objectsEqual(prev, data.settings) ? prev : data.settings));
        }
      } else {
         // Die API unterscheidet: [] ist eine bewusst geleerte Ansicht (#27),
         // null heisst "gibt es nicht". Hier stand bis 1.5.0 ein fest
         // eingebautes Uhr-Kalender-Wetter für BEIDE Fälle — wer sich am
         // Tablet vertippte, sah ein vollständig aussehendes Dashboard und
         // hielt es für seins. Der Irrtum fiel erst auf, wenn Änderungen aus
         // dem Editor nie ankamen. Lieber ehrlich leer als falsch voll.
         setLayout([]);
         setViewMissing(true);
      }
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLayout();
    const interval = setInterval(fetchLayout, 5000);
    return () => clearInterval(interval);
  }, [effectiveDashboardId]);

  useEffect(() => {
    const handleWidgetAction = (e: any) => {
        const { targets, actionType } = e.detail;
        console.log('Received WIDGET_ACTION!', targets, actionType);
        if (!targets || !Array.isArray(targets)) return;
        
        setUserHiddenWidgets(prev => {
            const next = { ...prev };
            for (const tId of targets) {
                if (actionType === 'show') {
                    next[tId] = false;
                } else if (actionType === 'hide') {
                    next[tId] = true;
                } else {
                    // toggle
                    next[tId] = !prev[tId];
                }
            }
            return next;
        });
    };
    window.addEventListener('WIDGET_ACTION', handleWidgetAction);

    const socket = connectLiveSync();
    socket.on('connect', () => {
       console.log('Connected to socket', socket.id);
       // Auto-Reload nach Server-Update: Ein Reconnect passiert genau dann,
       // wenn der Server neu gestartet wurde. Meldet er eine andere Version
       // als beim Seitenaufbau, läuft hier noch das alte Frontend → einmal
       // neu laden (mit Jitter, damit nicht alle Displays gleichzeitig ziehen;
       // sessionStorage-Sperre verhindert Reload-Schleifen).
       fetch('/api/version', { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => {
             const v = typeof d?.version === 'string' ? d.version : '';
             if (!v) return;
             if (!serverVersionRef.current) { serverVersionRef.current = v; return; }
             if (v === serverVersionRef.current) return;
             const last = Number(sessionStorage.getItem('mf-version-reload') || 0);
             if (Date.now() - last < 60000) return;
             sessionStorage.setItem('mf-version-reload', String(Date.now()));
             console.log(`Server updated (${serverVersionRef.current} → ${v}) — reloading view`);
             setTimeout(() => window.location.reload(), Math.random() * 3000);
          })
          .catch(() => { /* Version nicht erreichbar → nichts tun */ });
    });
    socket.on('LAYOUT_UPDATED', () => {
       console.log('Websocket: Layout update received');
       fetchLayout();
    });
    socket.on('FORCE_NAVIGATE', (targetDashboardId) => {
       if (targetDashboardId && targetDashboardId !== dashboardId) {
          setOverrideDashboardId(targetDashboardId);
       }
    });
    socket.on('CLEAR_NAVIGATE', () => {
       setOverrideDashboardId(null);
    });
    socket.on('REFRESH_DEVICE', (targetId: string | null) => {
       // null = alle Displays. Sonst nur das aktuelle Dashboard.
       if (!targetId || targetId === effectiveIdRef.current || targetId === dashboardId) {
          window.location.reload();
       }
    });
    return () => {
       window.removeEventListener('WIDGET_ACTION', handleWidgetAction);
       socket.disconnect();
    };
  }, [dashboardId]); // Only recreate socket mount if base ID changes.

  // Rendert über die geteilte Map (renderWidget.tsx) — dieselbe Quelle wie
  // die Live-Vorschau im Editor (#42), damit beide nie auseinanderlaufen.
  const renderWidgetContent = (type: string, config: any, id: string) =>
    renderWidget(type, config, {
      dashboardId,
      onVisibilityChange: (isVisible) =>
        setAutoHiddenWidgets(prev => prev[id] === !isVisible ? prev : { ...prev, [id]: !isVisible }),
      // #41: soll diese Kamera gerade im Vollbild stehen? Der View rechnet das
      // vollständig aus (Auslöser, Haltezeit, Puls, absichtlich versteckt) —
      // das Widget führt nur aus. Ohne Auslöser bleibt die Nummer bei 0 und im
      // Widget passiert nie etwas; der Editor gibt beides gar nicht erst mit.
      openFullscreen: cameraFullscreen[id]?.open === true,
      fullscreenSeq: cameraFullscreen[id]?.seq,
    });

  return (
    <LocaleProvider>
    {/* Zentrale Hell/Dunkel-Steuerung: löst die View-Einstellung auf und
        stellt sie allen Widgets bereit, die kein festes Theme haben. */}
    <ViewThemeScope settings={viewSettings}>
    <div className="relative w-screen h-screen overflow-hidden text-white font-sans bg-black">
      <WallpaperEngine dashboardId={dashboardId} config={wallpaperConfig} />
      <ActionRefusedToast />

      {/* Diese Ansicht gibt es nicht. Bewusst ruhig gehalten — das hier haengt
          an einer Wand, nicht auf einem Schreibtisch — aber unmissverstaendlich:
          vorher stand hier ein fertig aussehendes Dashboard, und der Tippfehler
          fiel tagelang niemandem auf. */}
      {viewMissing && <MissingViewNotice viewId={dashboardId} />}

      <div
        className={`absolute inset-x-0 top-0 z-20 dashboard-static-grid ${edgeToEdge ? "p-0" : "p-4 md:px-8 md:pt-8"}`}
        style={{
          bottom: edgeToEdge ? 0 : "65px",
          ["--mf-tile-radius" as any]: edgeToEdge ? "0px" : "1.5rem",
          // Nur im Randlos-Modus gesetzt: Widget-interne Flächen (Bild-Radius,
          // Wetter-Hintergrund …) nutzen sie mit je eigenem Fallback — normale
          // Views sehen dadurch exakt ihre bisherigen Radien.
          ...(edgeToEdge ? ({ ["--mf-inner-radius" as any]: "0px" } as Record<string, string>) : {}),
        }}
      >
         <ResponsiveGridLayout
           className="layout"
           layouts={{ lg: layout }}
           breakpoints={{ lg: 0 }}
           cols={{ lg: 24 }}
           rowHeight={rowHeight}
           margin={[tileGap, tileGap]}
           containerPadding={edgeToEdge ? [0, 0] : undefined}
           isDraggable={false}  // Static for the live dashboard
           isResizable={false}  // Static for the live dashboard
           compactType={null}
           allowOverlap={true}
           preventCollision={false}
         >
           {layout.map((w, index) => {
             const isCardBased =
               (w.type === 'HomeAssistantWidget.tsx') ||
               (w.type === 'HANotificationWidget.tsx') ||
               // Minimal-Kalender (nur Linien) zeichnet selbst keine Fläche —
               // seine Fläche IST die Host-Box (Verhalten vor dem Karten-
               // Umbau). Nur die expliziten Panel-Ansichten bringen eigene mit.
               (w.type === 'CalendarWidget.tsx' && (w.config?.design !== 'minimal' || calendarOwnSurface(w.config)));
             // Bild füllt seine Kachel randlos (object-cover) — dahinter ist
             // nie etwas zu sehen, also keine Host-Box (#39).
             // Die KAMERA dagegen passt ihr Bild ein (object-contain, sobald
             // das Seitenverhältnis nicht exakt zur Kachel passt) und zeigt
             // Lade-/Fehlerzustände auf leerer Fläche — da war der Hintergrund
             // sehr wohl sichtbar. #39 hatte sie zu Unrecht mitgenommen.
             const fillsOwnTile = w.type === 'ImageWidget.tsx';
             // …aber ohne Innen-Padding: das Kamerabild soll die Karte
             // ausfüllen, nicht in einem dicken Rahmen sitzen.
             const noInnerPadding = w.type === 'CameraWidget.tsx';
             const hasOuterBox = !isCardBased && !fillsOwnTile && w.bgOpacity > 0;
             const outerBgOpacity = (isCardBased || fillsOwnTile) ? 0 : w.bgOpacity / 100;
             const paddingClass = isCardBased || noInnerPadding
               ? 'p-0'
               : (hasOuterBox ? 'p-4 md:p-6' : 'p-0');
             // Schwebende Karte im Randlos-Modus: Widget liegt ÜBER dem
             // Hintergrund-Raster (z. B. Wetter auf dem Foto) und behält den
             // normalen runden Karten-Look. "initial" macht die Innen-Radius-
             // Variable ungültig → Widget-interne Flächen fallen auf ihre
             // Normal-Radien zurück.
             const floating = edgeToEdge && w.config?.floatingCard === true;
             const justifyClass = isCardBased ? 'justify-start' : 'justify-center';

             // Hidden = fully transparent AND click-through. The
             // pointer-events-none MUST also sit on the outer react-grid-item
             // wrapper: it covers the cell absolutely and would otherwise catch
             // every tap even though nothing is visible — exactly what blocked a
             // button UNDER a hidden full-screen widget (the pop-up case).
             const isHidden = userHiddenWidgets[w.i] || autoHiddenWidgets[w.i] || triggerHiddenWidgets[w.i];

              return (
               <div
                 key={w.i}
                 className={isHidden ? 'pointer-events-none' : undefined}
                 style={{ zIndex: typeof w.config?.zIndex === "number" ? w.config.zIndex : index }}
               >
                 <div className={`w-full h-full flex ${justifyClass} flex-col ${paddingClass} rounded-3xl overflow-hidden transition-opacity duration-500 ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                      style={{
                        containerType: 'size',
                        // Randlos-Modus: eckige Kacheln (CSS-Var vom Canvas);
                        // schwebende Karten behalten den normalen Radius.
                        borderRadius: floating ? '1.5rem' : 'var(--mf-tile-radius, 1.5rem)',
                        ...(floating ? ({ ['--mf-inner-radius' as any]: 'initial' } as Record<string, string>) : {}),
                        backgroundColor: `rgba(0,0,0, ${outerBgOpacity})`,
                        backdropFilter: outerBgOpacity > 0 ? "blur(12px)" : "none",
                        border: outerBgOpacity > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                        transform: (w.config?.offsetX || w.config?.offsetY) ? `translate(${w.config?.offsetX || 0}px, ${w.config?.offsetY || 0}px)` : "none",
                      }}>
                      <div className="w-full h-full flex flex-col justify-center"
                           style={{
                            fontSize: w.config?.responsiveText ? `${(w.config.fontSize || 20) / 2}${['HomeAssistantWidget.tsx', 'HANotificationWidget.tsx'].includes(w.type) ? 'cqw' : 'cqmin'}` : (w.config?.fontSize ? `${w.config.fontSize}px` : '20px'),
                            fontFamily: `${w.config?.fontFamily || 'var(--font-geist-sans)'}, sans-serif`,
                            color: w.config?.color || 'inherit',
                            fontWeight: w.config?.fontWeight ? parseInt(w.config.fontWeight) : 'inherit',
                            textShadow: ((w.config?.textShadowBlur ?? 0) > 0 || (w.config?.textShadowX ?? 0) !== 0 || (w.config?.textShadowY ?? 0) !== 0) ? `${w.config?.textShadowX ?? 0}px ${w.config?.textShadowY ?? 4}px ${w.config?.textShadowBlur ?? 0}px rgba(0,0,0,0.8)` : 'none'
                           }}>
                         {renderWidgetContent(w.type, w.config, w.i)}
                      </div>
                 </div>
               </div>
              );
            })}
         </ResponsiveGridLayout>
      </div>

    </div>
    </ViewThemeScope>
    </LocaleProvider>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { BUNDLED_WALLPAPERS } from "@/lib/wallpaper-engine/bundled";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export interface WallpaperData {
  id: string;
  url: string;
  orientation?: "portrait" | "landscape"; // für Split-View (Schritt 3)
  metadata?: {
    cameraModel?: string;
    locationName?: string;
    dateTaken?: string;
  };
}

type TransitionKind = "crossfade" | "kenburns" | "slide" | "none";

function resolveTransition(config: any): TransitionKind {
  const t = config?.transitionEffect;
  if (t === "crossfade" || t === "kenburns" || t === "slide" || t === "none") return t;
  if (config?.zoomEffect) return "kenburns"; // backward-compat
  return "crossfade";
}

// object-fit-Modus fürs Wallpaper (issue #17). Default `cover` = bisheriges
// Verhalten (füllt den Screen, schneidet Ränder ab). Die anderen Modi geben
// Nutzern Kontrolle, damit z.B. keine Köpfe abgeschnitten werden.
const WALLPAPER_FIT: Record<string, string> = {
  cover: "object-cover", // Fill
  contain: "object-contain", // Fit — ganzes Bild, ggf. Balken
  fill: "object-fill", // Stretch — verzerrt
  none: "object-none", // Center — Originalgröße (Position separat, s.u.)
};

// Bild-Position im Rahmen (object-position). Greift v.a. bei "Füllen" (cover)
// und "Zentriert" (none) — damit z.B. Köpfe nicht abgeschnitten werden.
// Default center = bisheriges Verhalten (cover ohne Position = 50%/50%, none
// war vorher fest object-center).
const WALLPAPER_POS: Record<string, string> = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
};

export default function WallpaperEngine({
  config,
  dashboardId = "1"
}: {
  config?: any;
  dashboardId?: string;
}) {
  const { locale, t } = useLocale();
  const [images, setImages] = useState<WallpaperData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for a real config from the parent. Live-View starts with
    // wallpaperConfig=null and fetches the saved config async — during
    // that ~200 ms window we used to fall through to the "unsplash"
    // branch and render a fresh Pollinations request. On a reload that
    // flashed a random / cached generic image before the actual wallpaper
    // (Immich / WebDAV / bundled) took over. Black-on-mount is much
    // calmer, and the real wallpaper still appears as soon as it lands.
    if (!config) {
      setIsReady(false);
      setImages([]);
      return;
    }

    const source = config?.source || 'unsplash';
    const query = config?.query || 'nature,dark';

    if (source === 'color') {
      // Solid-colour wallpaper — nothing to load, no slideshow.
      setImages([]);
      setIsReady(true);
      return;
    }

    if (source === 'url') {
      setImages([{ id: 'fixed', url: query }]);
      setIsReady(true);
    } else if (source === 'bundled') {
      // Mitgelieferte Bilder aus public/wallpapers/ — gemischt für Abwechslung.
      const list = BUNDLED_WALLPAPERS.map((url, i) => ({ id: `bundled-${i}`, url }));
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      setImages(list);
      setIsReady(true);
    } else if (source === 'webdav') {
      fetch(`/api/wallpaper/webdav/playlist?dashboardId=${dashboardId}&lang=${locale}&t=${Date.now()}`)
        .then(async res => {
           const data = await res.json();
           // Die Route antwortet im Fehlerfall mit {error}. Vorher lief das in
           // den catch und landete als "Failed to load…" in der Konsole — der
           // eigentliche Grund ging dabei verloren (#80).
           if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
           return data;
        })
        .then(data => {
           if (Array.isArray(data) && data.length > 0) setImages(data);
           setIsReady(true);
        })
        .catch(err => {
           console.error("WebDAV-Wallpaper:", err?.message || err);
           setIsReady(true);
        });
    } else if (source === 'immich') {
      fetch(`/api/wallpaper/immich/playlist?dashboardId=${dashboardId}&lang=${locale}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data) && data.length > 0) setImages(data);
           setIsReady(true);
        })
        .catch(err => {
           console.error("Failed to load Immich playlist", err);
           setIsReady(true);
        });
    } else {
      const generated = Array.from({ length: 20 }).map((_, i) => ({
        id: `unsplash-${i}-${Date.now()}`,
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(query + ' cinematic 4k high resolution realistic photography')}?width=3840&height=2160&seed=${i + Math.floor(Math.random() * 9999999)}&nologo=true`,
        metadata: config?.showMetadata ? { locationName: `${t("Thema")}: ${query}` } : undefined
      }));
      setImages(generated);
      setIsReady(true);
    }
  }, [config, locale]);

  useEffect(() => {
    if (images.length === 0) return;
    setCurrentIndex((prev) => (prev >= images.length ? 0 : prev));
  }, [images.length]);

  const intervalMs = (config?.intervalSec || 60) * 1000;
  const transition = resolveTransition(config);
  // "blur" = Einpassen (contain) + weiche, gezoomte Kopie füllt die Balken.
  // Im Split-Raster bekommt jede Kachel ihre eigene Kopie (siehe <Tile>) —
  // ein gemeinsamer Hintergrund hinter dem ganzen Raster zeigte unter jeder
  // Kachel das falsche Bild, deshalb galt blur dort früher als cover (#72).
  const blurFill = config?.fit === "blur";
  const isBlurFill = blurFill && (((config?.splitMode as string) || "off") === "off");
  const fitClass = blurFill
    ? "object-contain"
    : WALLPAPER_FIT[config?.fit as string] ?? "object-cover";
  const posClass = WALLPAPER_POS[config?.imagePosition as string] ?? "object-center";
  // Bildinfo einmal auflösen — Leiste und Kachel-Beschriftung teilen sich
  // dieselben Einstellungen, damit beides gleich aussieht (#44).
  const metaOptions: MetaOptions = {
    show: config?.showMetadata !== false,
    showDate: config?.metaShowDate !== false,
    showLocation: config?.metaShowLocation !== false,
    showCamera: config?.metaShowCamera !== false,
    align: config?.metaPosition === "left" ? "left" : "right",
    cameraLabel: t("Aufgenommen mit"),
    style: {
      fontFamily: `${config?.metaFontFamily || "Inter"}, sans-serif`,
      fontSize: config?.metaFontSize ? `${config.metaFontSize}px` : "12px",
      fontWeight: config?.metaFontWeight || 500,
      textShadow: config?.metaTextShadow || "none",
      color: config?.metaColor || "rgba(255,255,255,0.8)",
    },
  };
  // Übergangs-Dauer: konfigurierbar, Defaults = bisherige hartkodierte Werte
  // (crossfade/kenburns 1500 ms, slide 1200 ms) → kein Tizen-Regress.
  const transitionMs =
    typeof config?.transitionMs === "number"
      ? config.transitionMs
      : transition === "slide"
        ? 1200
        : 1500;
  // Ken-Burns-Zielzoom: Default 15 % (scale 1.15) = bisheriges Verhalten.
  const kenBurnsScale =
    1 + (typeof config?.kenBurnsIntensity === "number" ? config.kenBurnsIntensity : 15) / 100;
  // Split-View (Schritt 3). "off" = bisheriger Einzelbild-Pfad, komplett
  // unverändert. Sonst übernimmt <SplitSlideshow> Frame-Bildung + Crossfade.
  const splitMode = (config?.splitMode as string) || "off";

  useEffect(() => {
    if (!isReady || images.length <= 1 || splitMode !== "off") return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isReady, images.length, intervalMs, splitMode]);

  // Preload über Image()-Instanzen statt DOM-<img>. Browser-Cache reicht.
  // Im Split-Modus übernimmt <SplitSlideshow> das Preloading selbst.
  useEffect(() => {
    if (images.length === 0 || splitMode !== "off") return;
    const urls = Array.from(new Set([
      images[(currentIndex + 1) % images.length]?.url,
      images[(currentIndex + 2) % images.length]?.url,
    ].filter(Boolean))) as string[];
    const loaders = urls.map((url) => {
      const img = new Image();
      img.src = url;
      return img;
    });
    return () => { for (const img of loaders) img.src = ""; };
  }, [currentIndex, images, splitMode]);

  // ── Artwork-Takeover: media_player-Zustand pollen (token-frei über die
  //    App-Proxy-Route, wie das Media-Widget). Leerer Entity = Feature aus.
  // An/Aus-Schalter gated das ganze Feature — Player kann konfiguriert bleiben.
  const artworkPlayer = config?.artworkEnabled === true ? (config?.artworkPlayer || "").trim() : "";
  const artFit: "blur" | "cover" = config?.artworkFit === "cover" ? "cover" : "blur";
  const artBlur = typeof config?.artworkBlur === "number" ? config.artworkBlur : 40;
  const artDarken = typeof config?.artworkDarken === "number" ? config.artworkDarken : 30;
  const [artAttrs, setArtAttrs] = useState<any>(null);
  const [artOk, setArtOk] = useState(true);
  useEffect(() => {
    if (!artworkPlayer) { setArtAttrs(null); return; }
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/ha/state?ids=${encodeURIComponent(artworkPlayer)}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setArtAttrs(d?.[artworkPlayer] ?? null);
      } catch { /* nächster Poll */ }
    };
    poll();
    const iv = setInterval(poll, 8000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [artworkPlayer]);

  const artPlaying = artAttrs?.state === "playing";
  const artPic = artAttrs?.attributes?.entity_picture || artAttrs?.attributes?.entity_picture_local;
  const artTitle: string = artAttrs?.attributes?.media_title || "";
  const artworkActive = Boolean(artworkPlayer && artPlaying && artPic);
  // Ziel-URL pro Track cache-busten. Doppelpuffer gegen das Durchblitzen der
  // Diashow beim Track-Wechsel: das neue Cover wird erst VORgeladen (new Image)
  // und die sichtbare URL erst nach onload umgeschaltet — das alte Bild bleibt
  // bis dahin stehen, es entsteht nie ein leeres <img>.
  const targetArtUrl = artworkActive
    ? `/api/ha/media/${encodeURIComponent(artworkPlayer)}/artwork?ts=${encodeURIComponent(artTitle)}`
    : "";
  const [artDisplayUrl, setArtDisplayUrl] = useState("");
  useEffect(() => {
    if (!targetArtUrl || targetArtUrl === artDisplayUrl) return;
    let cancelled = false;
    const im = new Image();
    im.onload = () => { if (!cancelled) { setArtDisplayUrl(targetArtUrl); setArtOk(true); } };
    im.onerror = () => { if (!cancelled) setArtOk(false); };
    im.src = targetArtUrl;
    return () => { cancelled = true; };
  }, [targetArtUrl, artDisplayUrl]);

  // Artwork-Takeover (#50, Phase 2): läuft ein konfigurierter media_player,
  // legt sich dessen Album-Cover als eigene Ebene ÜBER die Diashow und blendet
  // wieder aus, sobald die Musik stoppt. Rein additiv — die Diashow-Pipeline
  // bleibt unberührt (Tizen-schonend: statischer Layer, nur Opacity-Transition).
  const artUrl = artDisplayUrl; // vorgeladenes Bild; bleibt auch beim Ausblenden sichtbar
  const artworkLayer = artworkPlayer ? (
    <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
      style={{ opacity: (artworkActive && artDisplayUrl) ? 1 : 0 }} aria-hidden="true">
      {artUrl && artOk && (
        <>
          {/* Unscharfe Füllung — deckt die Ränder, egal welches Seitenverhältnis */}
          <img src={artUrl} alt="" decoding="async" onError={() => setArtOk(false)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: `blur(${artFit === "cover" ? Math.min(artBlur, 12) : artBlur}px)`, transform: "scale(1.12)" }} />
          {/* Im Blur-Modus zusätzlich das scharfe Cover mittig darüber */}
          {artFit === "blur" && (
            <img src={artUrl} alt="" decoding="async"
              className="absolute inset-0 w-full h-full object-contain" />
          )}
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${artDarken / 100})` }} />
        </>
      )}
    </div>
  ) : null;

  // Solid-colour wallpaper — skip the entire image / crossfade pipeline
  // (and its Tizen quirks). Just paint the chosen colour.
  if ((config?.source) === 'color') {
    return <div className="absolute inset-0 z-0 overflow-hidden" style={{ backgroundColor: config?.bgColor || '#0f172a' }}>{artworkLayer}</div>;
  }

  if (images.length === 0) return <div className="absolute inset-0 bg-black z-0 overflow-hidden">{artworkLayer}</div>;

  const currentImage = images[currentIndex];

  return (
    <div className="absolute inset-0 overflow-hidden bg-black z-0">
      {isBlurFill && currentImage ? (
        <img
          src={currentImage.url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110"
          decoding="async"
        />
      ) : null}
      {splitMode !== "off" ? (
        <SplitSlideshow
          images={images}
          mode={splitMode as "auto" | "grid2" | "grid4"}
          fitClass={`${fitClass} ${posClass}`}
          blurFill={blurFill}
          meta={metaOptions}
          durationMs={transitionMs}
          intervalMs={intervalMs}
        />
      ) : transition === "kenburns" ? (
        <KenBurnsSlot
          image={currentImage}
          intervalMs={intervalMs}
          fitClass={`${fitClass} ${posClass}`}
          durationMs={transitionMs}
          targetScale={kenBurnsScale}
        />
      ) : transition === "none" ? (
        <img
          src={currentImage.url}
          alt=""
          className={`absolute inset-0 w-full h-full ${fitClass} ${posClass}`}
          decoding="async"
        />
      ) : (
        <TwoSlotTransition
          image={currentImage}
          mode={transition}
          fitClass={`${fitClass} ${posClass}`}
          durationMs={transitionMs}
        />
      )}

      {artworkLayer}

      {/* Overlays */}
      {config?.overlayVignette && config.overlayVignette > 0 ? (
         <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: `inset 0 0 300px rgba(0,0,0,${config.overlayVignette / 100})` }}
         ></div>
      ) : null}

      {config?.overlayBlur && config.overlayBlur > 0 ? (
         <div
            className="absolute inset-0 pointer-events-none"
            style={{ backdropFilter: `blur(${config.overlayBlur}px)`, WebkitBackdropFilter: `blur(${config.overlayBlur}px)` }}
         ></div>
      ) : null}

      <div
         className="absolute top-0 inset-x-0 h-[50vh] pointer-events-none"
         style={{
            opacity: (config?.gradientTop ?? 30) / 100,
            background: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)"
         }}
      ></div>

      <div
         className="absolute bottom-0 inset-x-0 h-[60vh] pointer-events-none"
         style={{
            opacity: (config?.gradientBottom ?? 80) / 100,
            background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)"
         }}
      ></div>

      {(() => {
         // Bar zeigt sich wenn mindestens eine Seite (Ring ODER Metadata)
         // tatsächlich gerendert würde. Sind beide leer, fällt sie weg.
         // Die jeweils leere Seite bleibt als Platzhalter-Div drin, damit
         // justify-between (links/rechts) stabil bleibt.
         // Im Split-Modus hängt die Bildinfo an jeder Kachel (siehe <Tile>),
         // weil eine gemeinsame Leiste nicht sagen könnte, zu welchem der
         // Bilder Datum und Ort gehören (#44).
         if (splitMode !== "off") return null;
         const showRing =
            images.length > 1 && intervalMs > 0 && config?.showTimer !== false;
         const showMeta = metaOptions.show && hasMetadata(currentImage);
         if (!showRing && !showMeta) return null;
         // Seite der Bildinfo (#44). Der Ring sitzt jeweils gegenüber, damit
         // sich beide nicht in die Quere kommen.
         const metaLeft = metaOptions.align === "left";
         return (
            <div
               className={`absolute bottom-0 inset-x-0 z-10 flex flex-row items-center justify-between px-6 py-3 ${(config?.metaBgOpacity ?? 40) > 0 ? "backdrop-blur-md border-t border-white/5" : ""}`}
               style={{ backgroundColor: `rgba(0,0,0,${(config?.metaBgOpacity ?? 40) / 100})` }}
            >
              <div className="flex items-center order-1">
                 {metaLeft
                    ? (showMeta ? <MetaLines image={currentImage} opts={metaOptions} /> : <div />)
                    : (showRing ? <ProgressRing key={currentImage.id} durationMs={intervalMs} /> : <div />)}
              </div>
              <div className="flex items-center order-2">
                 {metaLeft
                    ? (showRing ? <ProgressRing key={currentImage.id} durationMs={intervalMs} /> : <div />)
                    : (showMeta ? <MetaLines image={currentImage} opts={metaOptions} /> : <div />)}
              </div>
           </div>
         );
      })()}
    </div>
  );
}

// Ken-Burns (langsamer Zoom + Opacity-Crossfade) — via Framer-Motion weil
// die Scale-Animation über viele Sekunden läuft und Exit-Animation braucht.
function KenBurnsSlot({
  image,
  intervalMs,
  fitClass,
  durationMs,
  targetScale,
}: {
  image: WallpaperData;
  intervalMs: number;
  fitClass: string;
  durationMs: number;
  targetScale: number;
}) {
  return (
    <AnimatePresence initial={false}>
      <motion.img
        key={image.id}
        src={image.url}
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: 1, scale: targetScale }}
        exit={{ opacity: 0, scale: targetScale + 0.05 }}
        transition={{
          opacity: { duration: durationMs / 1000, ease: "easeInOut" },
          scale: { duration: Math.min(intervalMs / 1000 + 1.5, 30), ease: "linear" },
        }}
        className={`absolute inset-0 w-full h-full ${fitClass}`}
        decoding="async"
      />
    </AnimatePresence>
  );
}

// Zwei-Slot-Ping-Pong, ohne Framer-Motion. Two fixed <img> elements that
// never unmount — only the active slot changes. Cheap on Tizen / Smart-TV
// browsers because nothing gets created or destroyed mid-transition; the
// browser only animates opacity (or transform) between two stable layers.
//
// Both slots are mounted from the start so neither has a "first paint"
// during a transition (which Tizen renders as a hard cut). slotB initially
// shows the same image as slotA so the very first crossfade still has
// something to fade from.
function TwoSlotTransition({ image, mode, fitClass, durationMs }: { image: WallpaperData; mode: "crossfade" | "slide"; fitClass: string; durationMs: number }) {
  const [slotA, setSlotA] = useState<WallpaperData>(image);
  const [slotB, setSlotB] = useState<WallpaperData>(image);
  const [active, setActive] = useState<"A" | "B">("A");
  const prevIdRef = useRef<string>(image.id);

  useEffect(() => {
    if (image.id === prevIdRef.current) return;
    prevIdRef.current = image.id;

    // Wait until the new image is actually decoded before triggering the
    // transition. Without this, slow-loading wallpapers (Pollinations
    // generation, large Immich originals) caused the "sometimes smooth,
    // sometimes hard cut" pattern: a cached image faded nicely, an
    // uncached one snapped because the <img> still had no pixels when
    // opacity hit 1. Solved by preloading via a detached Image() — the
    // browser caches the decode, then the in-DOM <img> picks it up
    // instantly from the cache and the transition runs on a ready frame.
    const preloader = new Image();
    let cancelled = false;

    const swap = () => {
      if (cancelled) return;
      // Load into the inactive slot, two rAFs to give the browser one
      // paint cycle with the start state before we trigger the transition.
      if (active === "A") {
        setSlotB(image);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) setActive("B");
          });
        });
      } else {
        setSlotA(image);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) setActive("A");
          });
        });
      }
    };

    preloader.onload = swap;
    // Network error or 404 — still swap so the playlist doesn't get stuck.
    preloader.onerror = swap;
    preloader.src = image.url;

    // Hard safety net: if neither onload nor onerror fires within 4 s
    // (some Smart-TV browsers go silent on huge images), force the swap
    // anyway — better a hard cut than a frozen wallpaper.
    const failsafe = setTimeout(swap, 4000);

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      preloader.onload = null;
      preloader.onerror = null;
      preloader.src = "";
    };
  }, [image.id, active, image]);

  const slotStyle = (slotName: "A" | "B"): React.CSSProperties => {
    const isActive = slotName === active;
    if (mode === "crossfade") {
      return {
        opacity: isActive ? 1 : 0,
        transition: `opacity ${durationMs}ms ease-in-out`,
        // Force GPU compositing on Tizen / older Chromium forks. Without
        // an explicit transform the browser composites opacity on the CPU,
        // which on a Samsung TV browser shows up as a hard jump instead of
        // a smooth fade for large 4K wallpapers. translate3d(0,0,0) (a.k.a.
        // the "translateZ hack") promotes each slot to its own GPU layer.
        // Both prefixed and unprefixed for older webkit-derived browsers.
        transform: "translate3d(0,0,0)",
        WebkitTransform: "translate3d(0,0,0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        willChange: "opacity, transform",
      };
    }
    // slide: aktiv → 0, inaktiv → +100% (wartet rechts auf seinen Einsatz).
    // Während des Wechsels läuft es linear von +100% nach 0 bzw. 0 nach -100%.
    return {
      transform: isActive ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
      WebkitTransform: isActive ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
      transition: `transform ${durationMs}ms cubic-bezier(0.77, 0, 0.175, 1)`,
      backfaceVisibility: "hidden",
      WebkitBackfaceVisibility: "hidden",
      willChange: "transform",
    };
  };

  return (
    <>
      <img
        src={slotA.url}
        alt=""
        className={`absolute inset-0 w-full h-full ${fitClass}`}
        style={slotStyle("A")}
        decoding="async"
      />
      <img
        src={slotB.url}
        alt=""
        className={`absolute inset-0 w-full h-full ${fitClass}`}
        style={slotStyle("B")}
        decoding="async"
      />
    </>
  );
}

// ─────────────── Split-View (Schritt 3) ───────────────
// Orientierungs-bewusste bzw. Grid-Slideshow. Baut aus der Playlist "Frames"
// (1–4 Bilder) und blendet zwischen zwei Frame-Slots über — dieselbe
// Tizen-sichere Mechanik wie <TwoSlotTransition>: beide Slots dauerhaft
// gemountet, GPU-Layer-Promotion, Preload ALLER Bilder des nächsten Frames
// vor dem Opacity-Swap.
type SplitMode = "auto" | "grid2" | "grid4";
type Frame = { key: string; images: WallpaperData[] };

function buildFrames(images: WallpaperData[], mode: SplitMode): Frame[] {
  if (images.length === 0) return [];
  const frames: Frame[] = [];

  if (mode === "grid2" || mode === "grid4") {
    const n = mode === "grid2" ? 2 : 4;
    for (let i = 0; i < images.length; i += n) {
      const group = images.slice(i, i + n);
      frames.push({ key: group.map((g) => g.id).join("_"), images: group });
    }
    return frames;
  }

  // auto + Greedy-Pairing: ALLE Hochformat-Bilder paaren, nicht nur direkt
  // benachbarte (wie ImmichFrame). Die Playlist ist server-seitig schon
  // gemischt, also kostet das Umsortieren nichts — und es bleiben (außer ggf.
  // einem ungeraden Rest) keine ungepaarten Portraits übrig. Das behebt
  // ImmichFrames #541-Schwäche (verstreute Portraits werden sonst gecroppt).
  // Ohne bekannte Orientierung (Nicht-Immich-Quellen) zählt ein Bild als
  // Querformat → Einzelbild, also kein Regress.
  const portraits = images.filter((im) => im.orientation === "portrait");
  const singles: Frame[] = images
    .filter((im) => im.orientation !== "portrait")
    .map((im) => ({ key: im.id, images: [im] }));

  const pairs: Frame[] = [];
  for (let p = 0; p + 1 < portraits.length; p += 2) {
    pairs.push({ key: `${portraits[p].id}_${portraits[p + 1].id}`, images: [portraits[p], portraits[p + 1]] });
  }
  // Ungerades letztes Portrait → Einzelbild (fit greift, kein harter Crop nötig).
  if (portraits.length % 2 === 1) {
    const last = portraits[portraits.length - 1];
    singles.push({ key: last.id, images: [last] });
  }

  // Paare und Einzelbilder proportional verschränken, damit nicht erst alle
  // Paare und danach alle Einzelbilder kommen.
  let pi = 0;
  let si = 0;
  while (pi < pairs.length || si < singles.length) {
    if (pi >= pairs.length) { frames.push(singles[si++]); continue; }
    if (si >= singles.length) { frames.push(pairs[pi++]); continue; }
    if ((pi + 1) / pairs.length <= (si + 1) / singles.length) frames.push(pairs[pi++]);
    else frames.push(singles[si++]);
  }
  return frames;
}

// ── Bildinfo (Datum / Ort / Kamera) ──────────────────────────────────────────
// Einmal beschrieben, zweimal benutzt: in der Leiste unter dem Einzelbild und
// als kleine Beschriftung an jeder Kachel im geteilten Modus (#44).
type MetaOptions = {
  show: boolean;
  showDate: boolean;
  showLocation: boolean;
  showCamera: boolean;
  align: "left" | "right";
  cameraLabel: string;
  style: React.CSSProperties;
};

function hasMetadata(image: WallpaperData | undefined): boolean {
  return !!image?.metadata && Object.keys(image.metadata).length > 0;
}

function MetaLines({
  image,
  opts,
  compact = false,
}: {
  image: WallpaperData;
  opts: MetaOptions;
  compact?: boolean;
}) {
  const m = image.metadata;
  if (!m) return null;
  const lines: string[] = [];
  if (opts.showDate && m.dateTaken) lines.push(m.dateTaken);
  if (opts.showLocation && m.locationName) lines.push(m.locationName);
  if (opts.showCamera && m.cameraModel) lines.push(`${opts.cameraLabel} ${m.cameraModel}`);
  if (lines.length === 0) return null;

  const alignClass = opts.align === "left" ? "items-start text-left" : "items-end text-right";
  // An der Kachel wird eine Zeile daraus: mehrzeilig frisst zu viel Bild, und
  // die Beschriftung soll das Foto begleiten, nicht überdecken.
  if (compact) {
    return (
      <div
        className={`absolute bottom-0 inset-x-0 px-2.5 py-1.5 flex ${opts.align === "left" ? "justify-start" : "justify-end"} pointer-events-none`}
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }}
      >
        <span className="uppercase tracking-[0.12em] truncate" style={opts.style}>
          {lines.join(" · ")}
        </span>
      </div>
    );
  }
  return (
    <div className={`flex flex-col uppercase tracking-[0.15em] ${alignClass}`} style={opts.style}>
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

// Eine Rasterzelle. Bei blurFill bekommt JEDE Zelle ihre eigene weiche Kopie —
// ein gemeinsamer Hintergrund hinter dem ganzen Raster wäre falsch, weil dann
// unter jeder Kachel das Bild einer anderen läge (#72).
function Tile({
  im,
  fitClass,
  blurFill,
  className,
  meta,
}: {
  im: WallpaperData;
  fitClass: string;
  blurFill: boolean;
  className: string;
  meta?: MetaOptions;
}) {
  const caption = meta?.show && hasMetadata(im) ? <MetaLines image={im} opts={meta} compact /> : null;

  // Ohne weichen Hintergrund UND ohne Beschriftung bleibt es das nackte <img>
  // wie bisher — kein zusätzliches Element im Split-Raster.
  if (!blurFill && !caption) {
    return <img src={im.url} alt="" className={`${className} ${fitClass}`} decoding="async" />;
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {blurFill && (
        <img
          src={im.url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110"
          decoding="async"
        />
      )}
      <img src={im.url} alt="" className={`absolute inset-0 w-full h-full ${fitClass}`} decoding="async" />
      {caption}
    </div>
  );
}

function FrameView({
  frame,
  fitClass,
  blurFill,
  meta,
}: {
  frame: Frame;
  fitClass: string;
  blurFill: boolean;
  meta?: MetaOptions;
}) {
  const imgs = frame.images;
  if (imgs.length <= 1) {
    // Einzelbild → respektiert den globalen fit-/Position-Modus.
    if (!imgs[0]) return null;
    return <Tile im={imgs[0]} fitClass={fitClass} blurFill={blurFill} meta={meta} className="absolute inset-0 w-full h-full" />;
  }
  // 2 → nebeneinander; 3–4 → 2×2-Raster. Die Zellen respektieren den globalen
  // fit (Füllen=cover füllt die Zelle, Einpassen=contain zeigt das ganze Bild —
  // wie ImmichFrames imageFill-Schalter). gap-[3px] lässt den schwarzen
  // Hintergrund als dezente Trennlinie durch (ImmichFrame nutzt dort einen
  // Border in der Akzentfarbe).
  if (imgs.length === 2) {
    return (
      <div className="absolute inset-0 flex gap-[3px]">
        {imgs.map((im) => (
          <Tile key={im.id} im={im} fitClass={fitClass} blurFill={blurFill} meta={meta} className="w-1/2 h-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[3px]">
      {imgs.map((im) => (
        <Tile key={im.id} im={im} fitClass={fitClass} blurFill={blurFill} meta={meta} className="w-full h-full" />
      ))}
    </div>
  );
}

function SplitSlideshow({
  images,
  mode,
  fitClass,
  blurFill = false,
  meta,
  durationMs,
  intervalMs,
}: {
  images: WallpaperData[];
  mode: SplitMode;
  fitClass: string;
  blurFill?: boolean;
  meta?: MetaOptions;
  durationMs: number;
  intervalMs: number;
}) {
  const frames = useMemo(() => buildFrames(images, mode), [images, mode]);
  const [idx, setIdx] = useState(0);
  const [slotA, setSlotA] = useState<Frame | null>(null);
  const [slotB, setSlotB] = useState<Frame | null>(null);
  const [active, setActive] = useState<"A" | "B">("A");
  const prevKey = useRef<string | null>(null);

  // Beide Slots initial mit dem ersten Frame füllen, damit der erste
  // Crossfade etwas zum Überblenden hat (analog TwoSlotTransition).
  useEffect(() => {
    if (frames.length > 0 && !slotA && !slotB) {
      setSlotA(frames[0]);
      setSlotB(frames[0]);
      prevKey.current = frames[0].key;
    }
  }, [frames, slotA, slotB]);

  useEffect(() => {
    if (frames.length <= 1) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % frames.length), intervalMs);
    return () => clearInterval(t);
  }, [frames.length, intervalMs]);

  // Crossfade: alle Bilder des neuen Frames vorladen, dann in den inaktiven
  // Slot mounten und nach zwei rAF aktiv schalten.
  useEffect(() => {
    const frame = frames[idx];
    if (!frame || frame.key === prevKey.current) return;
    prevKey.current = frame.key;
    let cancelled = false;

    const swap = () => {
      if (cancelled) return;
      if (active === "A") {
        setSlotB(frame);
        requestAnimationFrame(() => requestAnimationFrame(() => { if (!cancelled) setActive("B"); }));
      } else {
        setSlotA(frame);
        requestAnimationFrame(() => requestAnimationFrame(() => { if (!cancelled) setActive("A"); }));
      }
    };

    // Erst überblenden, wenn alle Frame-Bilder dekodiert sind (sonst Hartschnitt
    // mitten im Fade bei großen/ungecachten Bildern — derselbe Grund wie beim
    // Einzelbild-Pfad).
    let remaining = frame.images.length;
    const tick = () => { if (--remaining <= 0) swap(); };
    const loaders = frame.images.map((im) => {
      const pre = new Image();
      pre.onload = tick;
      pre.onerror = tick;
      pre.src = im.url;
      return pre;
    });
    const failsafe = setTimeout(swap, 4000);

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      for (const l of loaders) { l.onload = null; l.onerror = null; l.src = ""; }
    };
  }, [idx, frames, active]);

  if (!slotA && !slotB) return null;

  const slotStyle = (slotName: "A" | "B"): React.CSSProperties => ({
    opacity: active === slotName ? 1 : 0,
    transition: `opacity ${durationMs}ms ease-in-out`,
    transform: "translate3d(0,0,0)",
    WebkitTransform: "translate3d(0,0,0)",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    willChange: "opacity, transform",
  });

  return (
    <>
      <div className="absolute inset-0" style={slotStyle("A")}>
        {slotA && <FrameView frame={slotA} fitClass={fitClass} blurFill={blurFill} meta={meta} />}
      </div>
      <div className="absolute inset-0" style={slotStyle("B")}>
        {slotB && <FrameView frame={slotB} fitClass={fitClass} blurFill={blurFill} meta={meta} />}
      </div>
    </>
  );
}

function ProgressRing({ durationMs }: { durationMs: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const circumference = 2 * Math.PI * 40;
  return (
    <div className="w-3.5 h-3.5 drop-shadow-md">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" className="stroke-white/30" strokeWidth="16" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="40"
          className="stroke-white"
          strokeWidth="16"
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: ready ? circumference : 0,
            transition: `stroke-dashoffset ${durationMs}ms linear`,
          }}
        />
      </svg>
    </div>
  );
}

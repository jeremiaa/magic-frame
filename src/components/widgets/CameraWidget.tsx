"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X, VideoOff } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type CameraConfig = {
  /** "ha" = HA camera entity (default), "url" = direct snapshot/MJPEG URL. */
  source?: "ha" | "url";
  entityId?: string;
  /** Direct snapshot or MJPEG URL when source = "url". */
  streamUrl?: string;
  /** 1 / 2 / 5 / 10 / 30 (default 5). */
  refreshIntervalSec?: number;
  /** "auto" lets the source dictate; otherwise fixed ratio. */
  aspectRatio?: "auto" | "16:9" | "4:3" | "1:1";
  /** snapshot = polled JPEG, mjpeg = continuous stream, webrtc = live low-latency (HA source only). */
  streamMode?: "snapshot" | "mjpeg" | "webrtc";
  /** Tap the image → expand to fullscreen overlay. */
  clickFullscreen?: boolean;
  /** Optional caption shown as small chip in the corner. */
  caption?: string;
};

/**
 * `openFullscreen` + `fullscreenSeq` are the live view's trigger signal (#41):
 * the doorbell fires and the camera fills the screen without anyone touching it.
 *
 * Warum eine Nummer und nicht nur der Schalter: das hier ist ein BEFEHL, kein
 * Zustand. Wer das Vollbild von Hand schliesst, während die Klingel noch „an"
 * meldet, soll zu bleiben — beim NÄCHSTEN Klingeln aber wieder aufgehen. Mit
 * einem blossen Ja/Nein wäre das zweite Klingeln kein Wechsel und würde still
 * verschluckt. `fullscreenSeq` zählt jeden Befehl hoch, also kommt auch
 * derselbe Befehl zweimal an.
 *
 * Ohne Nummer (Editor-Vorschau) passiert hier nie etwas.
 */
export default function CameraWidget({
  config,
  openFullscreen,
  fullscreenSeq,
}: {
  config?: CameraConfig;
  openFullscreen?: boolean;
  fullscreenSeq?: number;
}) {
  const { t } = useLocale();
  const source: "ha" | "url" = config?.source === "url" ? "url" : "ha";
  const entityId = config?.entityId?.trim() || "";
  const streamUrl = config?.streamUrl?.trim() || "";
  const refreshSec = Math.max(1, Math.min(60, config?.refreshIntervalSec ?? 5));
  const aspect = config?.aspectRatio || "auto";
  const fullscreenable = config?.clickFullscreen !== false;
  const caption = config?.caption?.trim() || "";

  // WebRTC only applies to HA sources — it needs the HA signaling endpoint. A
  // direct URL can only be a snapshot JPEG or an MJPEG stream the browser
  // fetches itself, so coerce webrtc → mjpeg for url sources.
  const rawMode = config?.streamMode || "snapshot";
  const streamMode =
    source === "url" && rawMode === "webrtc" ? "mjpeg" : rawMode;

  // "Configured" depends on the source: HA needs an entity, url needs a URL.
  const configured = source === "url" ? !!streamUrl : !!entityId;

  // For snapshot mode: cache-buster timestamp, ticked every `refreshSec`.
  const [ts, setTs] = useState(() => Date.now());
  const [errored, setErrored] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // The live WebRTC MediaStream, kept in state so BOTH the tile <video> and the
  // fullscreen-overlay <video> can bind it (one stream → many video sinks is fine).
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fsVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // Snapshot refresh cadence — runs for both HA and direct-URL snapshot modes.
  useEffect(() => {
    if (!configured || streamMode !== "snapshot") return;
    intervalRef.current = setInterval(() => {
      setTs(Date.now());
    }, refreshSec * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [configured, refreshSec, streamMode]);

  // WebRTC offer/answer dance — HA source only. Tears down the peer connection
  // on unmount or when the user switches away from WebRTC mode.
  useEffect(() => {
    if (source !== "ha" || !entityId || streamMode !== "webrtc") return;
    let cancelled = false;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    pc.ontrack = (e) => {
      if (e.streams[0]) setMediaStream(e.streams[0]);
    };

    (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering to finish so all candidates are in the SDP
        // (we don't trickle ICE — keeps the signaling stupidly simple).
        await new Promise<void>((resolveGather) => {
          if (pc.iceGatheringState === "complete") return resolveGather();
          const check = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", check);
              resolveGather();
            }
          };
          pc.addEventListener("icegatheringstatechange", check);
          setTimeout(resolveGather, 3000);
        });

        if (cancelled) return;

        const res = await fetch(
          `/api/ha/camera/${encodeURIComponent(entityId)}/webrtc`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ offer: pc.localDescription?.sdp }),
          },
        );
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok || !data?.answer) {
          throw new Error(
            data?.error || `Signaling failed (HTTP ${res.status})`,
          );
        }

        await pc.setRemoteDescription({ type: "answer", sdp: data.answer });
        // Add HA's trickled ICE candidates (the route collected + forwarded
        // them). Without these the connection never establishes → black. (#3)
        const haCands: any[] = Array.isArray(data.candidates) ? data.candidates : [];
        for (const c of haCands) {
          try {
            await pc.addIceCandidate(c);
          } catch {}
        }
        setErrored(false);
        setErrorMsg(null);
      } catch (err: any) {
        if (cancelled) return;
        setErrored(true);
        setErrorMsg(err?.message || "WebRTC failed");
        try {
          pc.close();
        } catch {}
      }
    })();

    return () => {
      cancelled = true;
      try {
        pc.close();
      } catch {}
      pcRef.current = null;
      setMediaStream(null);
    };
  }, [source, entityId, streamMode]);

  // Bind the live WebRTC stream to whichever <video> elements are mounted — the
  // tile always, the fullscreen overlay only while it's open. Re-runs when the
  // stream arrives (ontrack) or when fullscreen toggles (overlay <video> mounts
  // /unmounts with it). React can't set srcObject via a prop, so we do it here.
  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
    if (fsVideoRef.current && fsVideoRef.current.srcObject !== mediaStream) {
      fsVideoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, fullscreen]);

  // #41: jeder neue Befehl des Live-Views wird EINMAL ausgeführt — nicht der
  // Schalter gespiegelt. Gespiegelt würde das Vollbild gegen den Schliessen-
  // Knopf ankämpfen und sofort wieder aufgehen, solange der Auslöser hält.
  //
  // Die laufende Nummer ist der Wechsel, auf den es ankommt: zweimal klingeln
  // heisst zweimal aufmachen, auch wenn dazwischen jemand von Hand zugemacht hat.
  const prevSeqRef = useRef(0);
  useEffect(() => {
    const seq = fullscreenSeq ?? 0;
    if (seq === 0 || seq === prevSeqRef.current) return;
    prevSeqRef.current = seq;
    setFullscreen(openFullscreen === true);
  }, [fullscreenSeq, openFullscreen]);

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-white/50 text-sm text-center p-4 gap-2">
        <VideoOff size={28} className="opacity-40" />
        <div>
          {source === "url"
            ? t("Stream-URL in den Einstellungen eintragen (Snapshot- oder MJPEG-URL).")
            : t("HA-Kamera-Entity in Config eintragen, z.B. camera.front_door")}
        </div>
      </div>
    );
  }

  // Resolve the image src for snapshot / MJPEG. WebRTC uses the <video> branch.
  //   - url source: snapshot appends a cache-buster, MJPEG binds the URL as-is.
  //   - ha source:  hits the snapshot / stream API routes.
  const src = (() => {
    if (source === "url") {
      if (streamMode === "snapshot") {
        const sep = streamUrl.includes("?") ? "&" : "?";
        return `${streamUrl}${sep}mfts=${ts}`;
      }
      return streamUrl; // mjpeg — bind directly
    }
    return streamMode === "mjpeg"
      ? `/api/ha/camera/${encodeURIComponent(entityId)}/stream`
      : streamMode === "snapshot"
        ? `/api/ha/camera/${encodeURIComponent(entityId)}/snapshot?ts=${ts}`
        : null;
  })();

  const aspectClass =
    aspect === "16:9"
      ? "aspect-video"
      : aspect === "4:3"
        ? "aspect-[4/3]"
        : aspect === "1:1"
          ? "aspect-square"
          : "";

  // Fullscreen overlay — rendered through a portal to <body>. The live-view
  // tile sets `container-type: size` (and a transform when an offset is used),
  // both of which make `position: fixed` resolve against the TILE instead of
  // the viewport — that's why the overlay used to stay trapped inside the small
  // widget box. Portalling to <body> escapes that containing block so it really
  // fills the screen.
  const overlay =
    fullscreen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[2000] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
            // stopPropagation: React bubbles portal events through the COMPONENT
            // tree, so without this a backdrop click would bubble up to the
            // tile's onClick and immediately reopen fullscreen.
            onClick={(e) => {
              e.stopPropagation();
              setFullscreen(false);
            }}
          >
            {streamMode === "webrtc" ? (
              // Same MediaStream as the tile, bound via the fsVideoRef effect.
              <video
                ref={fsVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
            ) : src ? (
              <img
                src={src}
                alt={caption || entityId || "camera"}
                // w/h-full + object-contain scales the frame UP to fill the
                // screen too (keeping aspect — letterbox bars if it doesn't
                // match), instead of capping at the stream's native size.
                className="w-full h-full object-contain"
              />
            ) : null}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreen(false);
              }}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label={t("Schließen")}
            >
              <X size={20} />
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={`group relative w-full h-full overflow-hidden flex items-center justify-center ${
        fullscreenable && !errored ? "cursor-zoom-in" : ""
      }`}
      // Click anywhere in the tile (not just the centred, letterboxed image)
      // opens fullscreen — clicking the dead space around an object-contain
      // image used to miss the <img> and do nothing.
      onClick={() => {
        if (fullscreenable && !errored) setFullscreen(true);
      }}
    >
      {errored ? (
        <div className="flex flex-col items-center justify-center text-red-400/80 text-sm text-center p-4 gap-2">
          <VideoOff size={28} className="opacity-50" />
          <div>
            {streamMode === "webrtc"
              ? errorMsg || t("WebRTC-Verbindung fehlgeschlagen")
              : t("Snapshot konnte nicht geladen werden")}
          </div>
        </div>
      ) : streamMode === "webrtc" ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`${aspectClass} ${aspect === "auto" ? "max-w-full max-h-full object-contain" : "w-full h-full object-cover"} ${fullscreenable ? "cursor-zoom-in" : ""} rounded-lg bg-black`}
          onClick={() => fullscreenable && setFullscreen(true)}
        />
      ) : (
        <img
          src={src!}
          alt={caption || entityId || "camera"}
          className={`${aspectClass} ${aspect === "auto" ? "max-w-full max-h-full object-contain" : "w-full h-full object-cover"} ${fullscreenable ? "cursor-zoom-in" : ""} rounded-lg`}
          onClick={() => fullscreenable && setFullscreen(true)}
          onError={() => setErrored(true)}
          onLoad={() => {
            if (errored) setErrored(false);
          }}
        />
      )}

      {/* Optional caption chip — bottom-left, subtle. */}
      {caption && (
        <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-md px-2 py-0.5 text-[0.7em] text-white/90 max-w-[80%] truncate">
          {caption}
        </div>
      )}

      {/* Fullscreen hint — only fades in on hover (and stays hidden on touch
          displays, where there's no hover), so it doesn't sit on the image all
          the time. Tapping the image still opens fullscreen. */}
      {fullscreenable && !errored && (
        <div className="absolute top-2 right-2 rounded-md p-1 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <Maximize2 size={12} />
        </div>
      )}

      {overlay}
    </div>
  );
}

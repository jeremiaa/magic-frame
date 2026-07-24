"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

type Slide = { id: string; url: string };

const FIT_CLASS: Record<string, string> = {
  cover: "object-cover",
  contain: "object-contain",
  fill: "object-fill",
  none: "object-none object-center",
};

// Bild-Widget — Immich-Album-Slideshow in einem Widget (#16). Nutzt die globale
// Immich-Verbindung über /api/immich-widget. Schlanke 2-Slot-Crossfade (kein
// Ken-Burns/Tizen-Spezialfall wie beim Vollbild-Wallpaper nötig).
export default function ImageWidget({ config, dashboardId }: { config?: any; dashboardId?: string }) {
  const t = useT();
  const albumId: string = config?.immichAlbumId ?? "";
  const source: string = config?.immichSource ?? "global";
  const intervalSec: number = Math.max(5, config?.intervalSec ?? 30);
  const fitClass = FIT_CLASS[config?.fit as string] ?? "object-cover";
  // Expliziter Ecken-Radius: rounded-[inherit] erbt vom direkten Parent (= 0),
  // darum blieb das Bild eckig. Default 16 px = dezent abgerundet — außer der
  // View läuft im Randlos-Modus: dann setzt der Canvas --mf-img-radius auf 0
  // und das Bild füllt eckig bis an die Kachelkante ("zusammensnappen").
  // Ein explizit gesetzter Radius bleibt User-Wille und gewinnt immer.
  const cornerRadius: number | string =
    typeof config?.cornerRadius === "number" ? config.cornerRadius : "var(--mf-inner-radius, 16px)";

  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);

  const [slotA, setSlotA] = useState<Slide | null>(null);
  const [slotB, setSlotB] = useState<Slide | null>(null);
  const [active, setActive] = useState<"A" | "B">("A");
  const lastId = useRef<string | null>(null);

  // Playlist laden
  useEffect(() => {
    if (!albumId) {
      setSlides([]);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/immich-widget?mode=playlist&albumId=${encodeURIComponent(albumId)}&source=${source}&dashboardId=${encodeURIComponent(dashboardId ?? "")}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d.playlist)) {
          setSlides(d.playlist);
          setError("");
        } else {
          setError(d.error || "Fehler beim Laden");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Verbindung fehlgeschlagen");
      });
    return () => {
      cancelled = true;
    };
  }, [albumId]);

  // Ersten Slot füllen
  useEffect(() => {
    if (slides.length > 0 && !slotA && !slotB) {
      setSlotA(slides[0]);
      lastId.current = slides[0].id;
    }
  }, [slides, slotA, slotB]);

  // Weiterschalten
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setIdx((p) => (p + 1) % slides.length), intervalSec * 1000);
    return () => clearInterval(id);
  }, [slides.length, intervalSec]);

  // Crossfade: neues Bild in den inaktiven Slot, dann nach einem Paint umschalten
  useEffect(() => {
    const cur = slides[idx];
    if (!cur || cur.id === lastId.current) return;
    lastId.current = cur.id;
    if (active === "A") setSlotB(cur);
    else setSlotA(cur);
    const r = requestAnimationFrame(() =>
      requestAnimationFrame(() => setActive(active === "A" ? "B" : "A")),
    );
    return () => cancelAnimationFrame(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, slides]);

  if (!albumId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/40 text-[0.8em] gap-2 text-center p-2">
        <ImageIcon size={18} className="opacity-60" />
        {t("Kein Album gewählt — im Inspector einstellen.")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400/70 text-[0.7em] text-center p-3">
        {t(error)}
      </div>
    );
  }
  if (slides.length === 0) return <div className="w-full h-full bg-black/40" style={{ borderRadius: cornerRadius }} />;

  const slotStyle = (slot: "A" | "B"): React.CSSProperties => ({
    opacity: active === slot ? 1 : 0,
    transition: "opacity 1200ms ease-in-out",
    transform: "translate3d(0,0,0)",
    backfaceVisibility: "hidden",
  });

  return (
    <div className="relative w-full h-full overflow-hidden bg-black" style={{ borderRadius: cornerRadius }}>
      {slotA && (
        <img src={slotA.url} alt="" className={`absolute inset-0 w-full h-full ${fitClass}`} style={slotStyle("A")} decoding="async" />
      )}
      {slotB && (
        <img src={slotB.url} alt="" className={`absolute inset-0 w-full h-full ${fitClass}`} style={slotStyle("B")} decoding="async" />
      )}
    </div>
  );
}

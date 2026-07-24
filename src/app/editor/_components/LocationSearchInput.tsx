"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Ortssuche für Standort-Felder: Stadt tippen → Vorschläge → Klick füllt
// lat/lon. Niemand soll Koordinaten von Hand eingeben müssen. Backed by
// /api/geocode (Open-Meteo Geocoding, gratis, ohne Key).

type Hit = { name: string; region: string; lat: string; lon: string };

export default function LocationSearchInput({
  onPick,
  placeholder,
}: {
  onPick: (hit: Hit) => void;
  placeholder?: string;
}) {
  const { locale, t } = useLocale();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounce: erst nach 300 ms Tipppause suchen.
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&lang=${locale}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setHits(Array.isArray(data.results) ? data.results : []);
        setOpen(true);
      } catch {
        /* Tippabbruch/Netz — still bleiben */
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q, locale]);

  // Klick außerhalb schließt die Liste.
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mf-fg)]/30 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder={placeholder ?? t("Ort suchen (z. B. Gießen) …")}
          className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 pl-9 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        {busy && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-[var(--mf-fg)]/20 border-t-[var(--mf-fg)]/60 animate-spin" />
        )}
      </div>
      {open && hits.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-[var(--mf-bdr)]/15 bg-[var(--mf-surface)] shadow-xl overflow-hidden">
          {hits.map((h, i) => (
            <button
              key={`${h.lat},${h.lon},${i}`}
              type="button"
              onClick={() => {
                onPick(h);
                setQ("");
                setHits([]);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--mf-elev)]/10 transition-colors"
            >
              <MapPin size={13} className="shrink-0 text-[var(--mf-fg)]/40" />
              <span className="text-sm text-[var(--mf-fg)] truncate">{h.name}</span>
              {h.region && <span className="text-xs text-[var(--mf-fg)]/40 truncate">{h.region}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

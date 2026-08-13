"use client";

import React, { useEffect, useState } from "react";
import { ACTION_REFUSED_EVENT } from "@/lib/ha/action-client";

/**
 * Zeigt kurz an, warum eine Aktion nicht ausgeführt wurde.
 *
 * Bewusst klein gehalten: fest positioniert, ausserhalb des Rasters, ohne
 * eigenen Zustand in der Ansicht. Ein Wandtablet zeigt sonst nichts an, wenn
 * /api/ha/action ablehnt — und "es passiert einfach nichts" ist bei einem
 * Schalter die verwirrendste aller Rückmeldungen.
 */
export default function ActionRefusedToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onRefused = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message;
      if (!msg) return;
      setMessage(String(msg));
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 6000);
    };
    window.addEventListener(ACTION_REFUSED_EVENT, onRefused);
    return () => {
      window.removeEventListener(ACTION_REFUSED_EVENT, onRefused);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] max-w-[90vw] pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl bg-black/80 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-md border border-white/10">
        {message}
      </div>
    </div>
  );
}

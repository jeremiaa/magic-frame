"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Sparkles, X } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

type UpdateInfo = {
  current: string;
  latest: string | null;
  available: boolean;
  releaseUrl: string | null;
  releaseName: string | null;
  publishedAt: string | null;
  status: "ok" | "error";
};

// localStorage-Key — wir merken uns pro Version dass der User den Banner
// dismisst hat. Wenn eine neuere Version erscheint, zeigt der Banner wieder.
const DISMISS_KEY = "magicframe.updateBanner.dismissedVersion";

export default function UpdateBanner() {
  const t = useT();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/update-check", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: UpdateInfo) => {
        if (cancelled) return;
        if (d?.status === "ok" && d.available && d.latest) {
          // Check dismissal — nur dismissen wenn der gemerkte Wert gleich
          // dem aktuell beworbenen latest ist.
          try {
            const dismissedVer = localStorage.getItem(DISMISS_KEY);
            if (dismissedVer === d.latest) {
              setDismissed(true);
            }
          } catch {
            // localStorage kann in Private-Modus etc. fehlschlagen — ignorieren.
          }
          setInfo(d);
        }
      })
      .catch(() => {
        // Stiller Fehler — Banner einfach nicht zeigen.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info || !info.available || !info.latest || dismissed) return null;

  const handleDismiss = () => {
    try {
      if (info.latest) localStorage.setItem(DISMISS_KEY, info.latest);
    } catch {}
    setDismissed(true);
  };

  return (
    <div className="border-b border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 shrink-0">
      <div className="flex items-center gap-3 px-4 py-2 text-sm">
        <Sparkles size={16} className="text-amber-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-amber-100 font-medium">
            {t("Neue Version verfügbar")}:{" "}
            <span className="font-mono font-semibold">{info.latest}</span>
          </span>
          <span className="text-amber-200/60 ml-2 text-xs">
            ({t("aktuell")}{" "}
            <span className="font-mono">{info.current}</span>)
          </span>
        </div>
        {info.releaseUrl && (
          <a
            href={info.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-amber-100 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-md transition-colors"
          >
            {t("Release ansehen")}
            <ExternalLink size={12} />
          </a>
        )}
        <button
          onClick={handleDismiss}
          className="text-amber-200/60 hover:text-amber-100 p-1 rounded hover:bg-amber-500/10 transition-colors"
          aria-label={t("Banner schließen")}
          title={t("Banner schließen")}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

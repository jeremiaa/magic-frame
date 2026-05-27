"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { EN } from "./en";

export type Locale = "de" | "en";

type LocaleCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translates — key is the German source text. Missing translation → returns key (German). */
  t: (de: string) => string;
};

const Ctx = createContext<LocaleCtx>({
  locale: "en",
  setLocale: () => {},
  // Even without a provider, render English when a translation exists.
  // If a key is missing in EN, we fall through to the original German text.
  t: (de) => EN[de] ?? de,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // English is the strict app default — but every Magic Frame installation
  // can set its own preferred locale via Settings → General. Resolution
  // order on first mount:
  //
  //   1. localStorage["mf-lang"] (per-browser override, set by the switcher)
  //   2. /api/locale-default (per-installation default, set by the admin)
  //   3. "en" (fallback for fresh repos / new installations)
  //
  // This solves the "laptop shows German, kitchen monitor shows English"
  // problem: any browser that hasn't been to the editor before still picks
  // up the installation's preferred locale.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    let cancelled = false;
    const saved = localStorage.getItem("mf-lang");
    if (saved === "en" || saved === "de") {
      setLocaleState(saved);
      return;
    }
    // No per-browser preference yet — ask the server for its default.
    fetch("/api/locale-default", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.locale === "de" || d?.locale === "en") {
          setLocaleState(d.locale);
        }
      })
      .catch(() => {
        // Network failure → stay on "en", non-critical.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auch <html lang> aktualisieren (a11y / Browser-Hints)
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("mf-lang", l);
    } catch {}
  };

  const t = (de: string) => (locale === "en" ? EN[de] ?? de : de);

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx);
/** Just the translation function. Outside a provider it falls back to the EN dict. */
export const useT = () => useContext(Ctx).t;

import "server-only";
import { prisma } from "@/lib/companion/prisma";

// Server-side default locale for this Magic Frame instance.
// Stored at AppSettings.extra.defaultLocale.
//
// Why this exists: localStorage is per-browser, so a user who picks German
// in the editor on their laptop didn't change anything for the kitchen
// monitor's browser. This setting gives the *installation* a default that
// every fresh browser inherits — the strict-EN fallback in LocaleProvider
// only kicks in when neither localStorage nor a server default exists.

export type DefaultLocale = "de" | "en";

async function readExtra(): Promise<any> {
  try {
    const row = await prisma.appSettings.findUnique({
      where: { id: "global" },
    });
    return (row?.extra as any) ?? {};
  } catch {
    return {};
  }
}

/**
 * Returns the configured default locale for this instance.
 * Falls back to `null` (no global default set — LocaleProvider then uses "en").
 */
export async function getDefaultLocale(): Promise<DefaultLocale | null> {
  const extra = await readExtra();
  const stored = extra?.defaultLocale;
  if (stored === "de" || stored === "en") return stored;
  return null;
}

/**
 * Sets (or clears, with `null`) the global default locale.
 */
export async function setDefaultLocale(
  locale: DefaultLocale | null,
): Promise<void> {
  const extra = await readExtra();
  const next = { ...extra };
  if (locale === "de" || locale === "en") {
    next.defaultLocale = locale;
  } else {
    delete next.defaultLocale;
  }
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { extra: next as any, updatedAt: new Date() },
    create: { id: "global", haUrl: "", haToken: "", extra: next as any },
  });
}

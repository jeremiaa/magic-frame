import "server-only";
import { supervisorHaCredentials } from "@/lib/runtime/addon";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export type AppSettingsShape = {
  haUrl: string;
  haToken: string;
  // Globale Immich-Verbindung (optionaler Default). Liegt in AppSettings.extra,
  // damit kein DB-Schema-Change nötig ist. Wird von Wallpaper UND Bild-Widget
  // genutzt — aber nur, wenn dort KEINE eigenen Immich-Daten hinterlegt sind
  // (per-View/per-Widget-Override gewinnt). So bricht nichts bei bestehenden
  // Installationen: deren Immich-Daten stehen pro View und zählen als Override.
  immichUrl: string;
  immichApiKey: string;
};

async function legacyFromDashboardOne(): Promise<Partial<AppSettingsShape>> {
  try {
    const d = await prisma.dashboard.findUnique({ where: { id: "1" } });
    const s = d?.settings as any;
    if (s && (s.haUrl || s.haToken)) {
      return { haUrl: s.haUrl ?? "", haToken: s.haToken ?? "" };
    }
  } catch {}
  return {};
}

function immichFromExtra(extra: any): { immichUrl: string; immichApiKey: string } {
  const e = extra ?? {};
  return {
    immichUrl: typeof e.immichUrl === "string" ? e.immichUrl : "",
    immichApiKey: typeof e.immichApiKey === "string" ? e.immichApiKey : "",
  };
}

export async function getAppSettings(): Promise<AppSettingsShape> {
  const row = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const immich = immichFromExtra(row?.extra);

  // Als HA-Add-on über den Supervisor-Proxy verbinden. Damit muss niemand mehr
  // einen langlebigen Token anlegen — die Integration funktioniert direkt nach
  // der Installation.
  //
  // Der Proxy gewinnt IMMER, gespeicherte Eingaben werden im Add-on-Betrieb
  // nicht gelesen. Auf eine andere Home-Assistant-Instanz als die eigene zu
  // zeigen, geht als Add-on also nicht — bewusst: ein alter, längst
  // abgelaufener Token aus der Zeit vor dem Add-on würde sonst den
  // funktionierenden Proxy verdrängen, und der Fehler wäre für den Nutzer
  // nicht zu erkennen.
  //
  // Diese Abfrage stand bis 1.5.0 UNTER der Datenbank-Zeile — der Kommentar
  // beschrieb also das Gegenteil dessen, was der Code tat. Wer je etwas in die
  // HA-Felder getippt hatte, bekam den Proxy nie zu sehen, und niemand konnte
  // erkennen warum. Gefunden, als Jeremia fragte, ob das Add-on nicht von
  // selbst an die Entitäten kommt — es sollte, und tat es je nach Vorgeschichte
  // eben nicht.
  const sup = supervisorHaCredentials();
  if (sup) return { ...sup, ...immich };

  if (row && (row.haUrl || row.haToken)) {
    return { haUrl: row.haUrl, haToken: row.haToken, ...immich };
  }
  const legacy = await legacyFromDashboardOne();
  if (row) {
    return {
      haUrl: row.haUrl || legacy.haUrl || "",
      haToken: row.haToken || legacy.haToken || "",
      ...immich,
    };
  }
  return { haUrl: legacy.haUrl ?? "", haToken: legacy.haToken ?? "", ...immich };
}

export async function updateAppSettings(patch: Partial<AppSettingsShape>) {
  const now = new Date();
  // extra mergen, NICHT überschreiben — sonst geht z.B. defaultLocale verloren.
  const existing = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const extra: any = { ...((existing?.extra as any) ?? {}) };
  if (patch.immichUrl !== undefined) extra.immichUrl = patch.immichUrl;
  if (patch.immichApiKey !== undefined) extra.immichApiKey = patch.immichApiKey;

  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: {
      ...(patch.haUrl !== undefined ? { haUrl: patch.haUrl } : {}),
      ...(patch.haToken !== undefined ? { haToken: patch.haToken } : {}),
      extra,
      updatedAt: now,
    },
    create: {
      id: "global",
      haUrl: patch.haUrl ?? "",
      haToken: patch.haToken ?? "",
      extra,
    },
  });
}

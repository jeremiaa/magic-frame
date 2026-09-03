import "server-only";
import { prisma } from "@/lib/companion/prisma";

async function readExtra(): Promise<any> {
  try {
    const row = await prisma.appSettings.findUnique({ where: { id: "global" } });
    return (row?.extra as any) ?? {};
  } catch {
    return {};
  }
}

export async function getPirateWeatherKey(): Promise<string> {
  const stored = (await readExtra())?.pirateweather ?? {};
  return (stored.apiKey || process.env.PIRATEWEATHER_API_KEY || "").trim();
}

export async function getPirateWeatherStatus() {
  const stored = (await readExtra())?.pirateweather ?? {};
  const hasStored = !!stored.apiKey;
  const hasEnv = !!process.env.PIRATEWEATHER_API_KEY;
  return {
    configured: hasStored || hasEnv,
    fromEnv: !hasStored && hasEnv,
  };
}

export async function setPirateWeatherKey(apiKey: string): Promise<void> {
  const extra = await readExtra();
  const trimmed = (apiKey || "").trim();
  const pw: Record<string, string> = { ...(extra.pirateweather ?? {}) };
  if (trimmed) {
    pw.apiKey = trimmed;
  } else {
    delete pw.apiKey;
  }
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { extra: { ...extra, pirateweather: pw } as any, updatedAt: new Date() },
    create: { id: "global", haUrl: "", haToken: "", extra: { pirateweather: pw } as any },
  });
}

export async function clearPirateWeatherKey(): Promise<void> {
  const extra = await readExtra();
  const next = { ...extra };
  delete next.pirateweather;
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { extra: next as any, updatedAt: new Date() },
    create: { id: "global", haUrl: "", haToken: "" },
  });
}
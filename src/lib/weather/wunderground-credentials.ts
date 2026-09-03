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

export async function getWuKey(): Promise<string> {
  const stored = (await readExtra())?.wunderground ?? {};
  return (stored.apiKey || process.env.WUNDERGROUND_API_KEY || "").trim();
}

export async function getWuStatus() {
  const stored = (await readExtra())?.wunderground ?? {};
  const hasStored = !!stored.apiKey;
  const hasEnv = !!process.env.WUNDERGROUND_API_KEY;
  return {
    configured: hasStored || hasEnv,
    fromEnv: !hasStored && hasEnv,
  };
}

export async function setWuKey(apiKey: string): Promise<void> {
  const extra = await readExtra();
  const trimmed = (apiKey || "").trim();
  const wu: Record<string, string> = { ...(extra.wunderground ?? {}) };
  if (trimmed) {
    wu.apiKey = trimmed;
  } else {
    delete wu.apiKey;
  }
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { extra: { ...extra, wunderground: wu } as any, updatedAt: new Date() },
    create: { id: "global", haUrl: "", haToken: "", extra: { wunderground: wu } as any },
  });
}

export async function clearWuKey(): Promise<void> {
  const extra = await readExtra();
  const next = { ...extra };
  delete next.wunderground;
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { extra: next as any, updatedAt: new Date() },
    create: { id: "global", haUrl: "", haToken: "" },
  });
}
import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Brute-Force-Schutz im App-Layer (statt klassischem fail2ban).
 *
 * Funktional äquivalent: pro IP und pro Email-Konto zählen wir fehlgeschlagene
 * Login-Versuche in einem Sliding Window und sperren bei Überschreitung.
 *
 * Defaults bewusst konservativ — bei Bedarf in Settings tunbar.
 */
export type SecurityConfig = {
  ipWindowMin: number; // Fenster für IP-Tracking
  ipMaxFails: number; // ab dieser Anzahl in Fenster → IP sperren
  ipLockoutMin: number; // Sperrdauer für IP
  userWindowMin: number;
  userMaxFails: number;
  userLockoutMin: number;
};

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  ipWindowMin: 15,
  ipMaxFails: 5,
  ipLockoutMin: 30,
  userWindowMin: 60,
  userMaxFails: 10,
  userLockoutMin: 60,
};

export async function getSecurityConfig(): Promise<SecurityConfig> {
  const row = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const raw = ((row?.extra as any)?.security ?? {}) as Partial<SecurityConfig>;
  return {
    ipWindowMin: clamp(raw.ipWindowMin, DEFAULT_SECURITY_CONFIG.ipWindowMin, 1, 1440),
    ipMaxFails: clamp(raw.ipMaxFails, DEFAULT_SECURITY_CONFIG.ipMaxFails, 1, 1000),
    ipLockoutMin: clamp(raw.ipLockoutMin, DEFAULT_SECURITY_CONFIG.ipLockoutMin, 1, 10080),
    userWindowMin: clamp(raw.userWindowMin, DEFAULT_SECURITY_CONFIG.userWindowMin, 1, 1440),
    userMaxFails: clamp(raw.userMaxFails, DEFAULT_SECURITY_CONFIG.userMaxFails, 1, 1000),
    userLockoutMin: clamp(raw.userLockoutMin, DEFAULT_SECURITY_CONFIG.userLockoutMin, 1, 10080),
  };
}

function clamp(v: any, def: number, lo: number, hi: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}

export async function setSecurityConfig(patch: Partial<SecurityConfig>): Promise<SecurityConfig> {
  const cur = await getSecurityConfig();
  const next = { ...cur, ...patch };
  const row = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const extra = (row?.extra as Record<string, any>) ?? {};
  const merged = { ...extra, security: next };
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { extra: merged, updatedAt: new Date() },
    create: { id: "global", haUrl: "", haToken: "", extra: merged, updatedAt: new Date() },
  });
  return next;
}

/** Aktive Sperre? Liefert das Lockout-Objekt oder null. */
export async function getActiveLockout(scope: string) {
  const now = new Date();
  const lock = await prisma.loginLockout.findUnique({ where: { scope } });
  if (!lock) return null;
  if (lock.until <= now) {
    // abgelaufen — gleich aufräumen
    await prisma.loginLockout
      .delete({ where: { scope } })
      .catch(() => {});
    return null;
  }
  return lock;
}

/** Beide Scopes (IP + User) prüfen. Wirft LockedError wenn aktiv. */
/**
 * `ip` may be null: on some setups the client address cannot be established
 * (see src/lib/auth/ip.ts). Then the per-address lock is SKIPPED rather than
 * filed under a placeholder — a shared bucket turns this protection into a
 * denial of service anyone can trigger. The per-account lock below still
 * applies, and that is the one that actually stops guessing at a known email.
 */
export async function assertNotLocked(ip: string | null, email: string | null) {
  if (ip) {
    const ipLock = await getActiveLockout(scopeIp(ip));
    if (ipLock) throw new LockedError("ip", ipLock.until);
  }
  if (email) {
    const userLock = await getActiveLockout(scopeUser(email));
    if (userLock) throw new LockedError("user", userLock.until);
  }
}

export class LockedError extends Error {
  constructor(public readonly kind: "ip" | "user", public readonly until: Date) {
    super(`Locked (${kind}) until ${until.toISOString()}`);
    this.name = "LockedError";
  }
}

export function scopeIp(ip: string) {
  return `ip:${ip}`;
}
export function scopeUser(email: string) {
  return `user:${email.toLowerCase().trim()}`;
}

/**
 * Schreibt einen Login-Versuch und triggert ggf. einen Lockout, wenn die
 * Anzahl fehlgeschlagener Versuche im Sliding Window überschritten wird.
 *
 * Bei `success=true` werden bestehende Lockouts für IP+User aufgehoben
 * (das fühlt sich richtig an: korrekte Credentials sind ein starkes Signal).
 */
export async function recordAttempt(opts: {
  ip: string | null;
  email: string | null;
  success: boolean;
  reason?: string;
}) {
  const cfg = await getSecurityConfig();
  await prisma.loginAttempt.create({
    data: {
      // The column is NOT NULL; "unknown" is an honest label and, unlike the
      // old "0.0.0.0", it is never used as a lockout scope.
      ip: opts.ip ?? "unknown",
      email: opts.email,
      success: opts.success,
      reason: opts.reason ?? null,
    },
  });

  if (opts.success) {
    await prisma.loginLockout
      .deleteMany({
        where: {
          scope: {
            in: [
              ...(opts.ip ? [scopeIp(opts.ip)] : []),
              ...(opts.email ? [scopeUser(opts.email)] : []),
            ],
          },
        },
      })
      .catch(() => {});
    return;
  }

  // IP-Window — nur wenn wir überhaupt wissen, wer geklopft hat.
  if (opts.ip) {
    const ipSince = new Date(Date.now() - cfg.ipWindowMin * 60_000);
    const ipFails = await prisma.loginAttempt.count({
      where: { ip: opts.ip, success: false, at: { gte: ipSince } },
    });
    if (ipFails >= cfg.ipMaxFails) {
      await upsertLockout(
        scopeIp(opts.ip),
        cfg.ipLockoutMin,
        `Zu viele Fehlversuche von dieser IP (${ipFails}/${cfg.ipMaxFails} in ${cfg.ipWindowMin} Min)`,
      );
    }
  }

  // User-Window
  if (opts.email) {
    const userSince = new Date(Date.now() - cfg.userWindowMin * 60_000);
    const userFails = await prisma.loginAttempt.count({
      where: { email: opts.email, success: false, at: { gte: userSince } },
    });
    if (userFails >= cfg.userMaxFails) {
      await upsertLockout(
        scopeUser(opts.email),
        cfg.userLockoutMin,
        `Zu viele Fehlversuche für dieses Konto (${userFails}/${cfg.userMaxFails} in ${cfg.userWindowMin} Min)`,
      );
    }
  }
}

async function upsertLockout(scope: string, minutes: number, reason: string) {
  const until = new Date(Date.now() + minutes * 60_000);
  await prisma.loginLockout.upsert({
    where: { scope },
    create: { scope, until, reason },
    update: { until, reason },
  });
}

export async function clearLockout(scope: string) {
  await prisma.loginLockout.deleteMany({ where: { scope } });
}

export async function listLockouts() {
  // Abgelaufene gleich rauswerfen — die DB hält trotzdem den Index sauber.
  await prisma.loginLockout.deleteMany({ where: { until: { lte: new Date() } } });
  return prisma.loginLockout.findMany({
    orderBy: { until: "desc" },
    take: 100,
  });
}

export async function listRecentAttempts(limit = 50) {
  return prisma.loginAttempt.findMany({
    orderBy: { at: "desc" },
    take: limit,
  });
}

/** Maintenance — alte Attempts pruning (Standard: 30 Tage). */
export async function pruneOldAttempts(daysOld = 30) {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return prisma.loginAttempt.deleteMany({ where: { at: { lt: cutoff } } });
}

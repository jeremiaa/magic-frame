import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * „Kam diese Anfrage durch den Cloudflare-Tunnel?"
 *
 * Die Schranke (server-tunnel.js) schreibt an jede Anfrage, die sie durchlässt,
 * ein Kennzeichen. Es ist aus dem SESSION_SECRET abgeleitet, also von aussen
 * nicht zu erraten, und server.js entfernt es von allem, was am normalen Port
 * ankommt. Steht es an einer Anfrage, hat es die Schranke gesetzt.
 *
 * Dieselbe Rechnung steht in server-tunnel.js. scripts/check-tunnel.mjs prüft,
 * dass beide Seiten dasselbe ergeben.
 */
export const TUNNEL_HEADER = "x-mf-tunnel";

export function tunnelTag(): string | null {
  const secret = process.env.SESSION_SECRET || "";
  if (secret.length < 32) return null;
  return createHmac("sha256", secret).update("mf-tunnel-tag").digest("hex");
}

export function isViaTunnel(headers: { get(name: string): string | null }): boolean {
  const tag = tunnelTag();
  const got = headers.get(TUNNEL_HEADER);
  if (!tag || !got || got.length !== tag.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(tag));
}

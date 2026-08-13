import "server-only";
import { NextRequest } from "next/server";

/**
 * The client address, for locking out password guessing — or null when we
 * genuinely cannot tell who is knocking.
 *
 * Returning null matters more than it sounds. This used to end in a hardcoded
 * "0.0.0.0" whenever the address could not be worked out, and on the default
 * LAN install it could never be worked out: `NextRequest.ip` does not exist in
 * Next 16, and the generated no-domain Caddyfile set no `X-Real-IP`. So every
 * attempt in the house was filed under the same placeholder and the per-address
 * lock became ONE SHARED LOCK — five wrong guesses by anybody, from anywhere,
 * locked the login page for the whole household for half an hour. A protection
 * that any passer-by can turn into a denial of service is worse than none.
 *
 * So: an address we cannot establish is not a bucket. The caller falls back to
 * the per-account counter, which still stops guessing at a known email and
 * cannot be aimed at somebody else.
 *
 * (The proxy side of this is fixed too — every reverse_proxy block Magic Frame
 * generates now sets X-Real-IP from Caddy's own `{remote_host}`. See
 * src/lib/caddy/generate.ts and caddy/Dockerfile.)
 */
export function clientIp(req: NextRequest): string | null {
  // What our own proxy put there, from the peer it actually accepted the
  // connection from. A client cannot forge this at that hop, because Caddy
  // overwrites whatever arrived.
  const realIp = normalize(req.headers.get("x-real-ip") ?? "");
  if (realIp && realIp !== "0.0.0.0" && realIp !== "::") {
    // With another proxy of your own in front, X-Real-IP is that proxy's
    // address and everyone behind it shares a bucket. Declaring how many hops
    // sit in front lets us take the right entry out of X-Forwarded-For instead.
    const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
    if (Number.isFinite(hops) && hops > 1) {
      const chain = (req.headers.get("x-forwarded-for") ?? "")
        .split(",")
        .map((s) => normalize(s.trim()))
        .filter(Boolean);
      // Count from the RIGHT: the rightmost entry is the closest proxy, and
      // each further step to the left is one hop further from us. Only entries
      // added by hops we trust can be believed — anything left of that was
      // written by the client and is free text.
      const idx = chain.length - hops;
      if (idx >= 0 && chain[idx]) return chain[idx];
      // The chain is shorter than declared: the request did not come through
      // the proxy chain we were told about. Do not guess — guessing here is
      // how one person's mistake becomes everybody's lockout.
      return null;
    }
    return realIp;
  }

  // No X-Real-IP: either an old Caddyfile from before this fix (the volume
  // keeps the file until the admin saves the hosting settings once), or a
  // setup with no proxy at all. Either way we cannot attribute the attempt.
  return null;
}

function normalize(ip: string): string {
  const v = ip.trim();
  if (!v) return "";
  // IPv6-mapped IPv4 (::ffff:1.2.3.4) → 1.2.3.4
  const m = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return m ? m[1] : v;
}

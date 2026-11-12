// Which Immich address and key belong together.
//
// The key from Settings → Integrations is only ever sent to the address saved
// next to it. A view, or a form in the editor, that names another address has
// to bring its own key. Up to 1.5.11 the global key was the fallback for any
// address, so whoever could name an address received the key — without even
// signing in, through the album and people lists of the editor.
//
// No server-only import here: the rule is tested on its own.

export type ImmichPair = { url: string; key: string };
export type ImmichPairProblem = { error: "missing" | "key-needed" };

/** The same Immich server? Scheme, host, port and path, ignoring a trailing slash. */
export function sameImmichAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (s: string) => {
    const t = s.trim();
    try {
      const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `http://${t}`);
      return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, "")}`;
    } catch {
      return t.replace(/\/+$/, "").toLowerCase();
    }
  };
  if (!a?.trim() || !b?.trim()) return false;
  return norm(a) === norm(b);
}

/**
 * The connection to use, from what a view or a form brings (`own`) and the
 * saved global connection.
 *   own address + own key → those two
 *   no own address        → the global address, with the own key if given
 *   own address, no key   → the global key only if it is the global address
 */
export function pairImmich(
  own: { url?: string | null; key?: string | null },
  global: { url?: string | null; key?: string | null },
): ImmichPair | ImmichPairProblem {
  const url = own.url?.trim() || "";
  const key = own.key?.trim() || "";
  const gUrl = global.url?.trim() || "";
  const gKey = global.key?.trim() || "";
  if (url && key) return { url, key };
  if (!url) return gUrl && (key || gKey) ? { url: gUrl, key: key || gKey } : { error: "missing" };
  if (gKey && sameImmichAddress(url, gUrl)) return { url, key: gKey };
  return { error: "key-needed" };
}

export function isImmichProblem(p: ImmichPair | ImmichPairProblem): p is ImmichPairProblem {
  return "error" in p;
}

/**
 * Immich ids (assets, albums, people) are UUIDs. Anything with a slash or a
 * dot would let a caller walk to another Immich endpoint through our proxy,
 * with our key — so only letters, digits and dashes pass.
 */
export function isImmichId(id: string | null | undefined): id is string {
  return typeof id === "string" && /^[A-Za-z0-9-]{1,64}$/.test(id);
}

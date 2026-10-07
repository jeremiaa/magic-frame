/** Helpers for Apple's public iCloud Shared Album links and photo stream. */
export type IcloudAlbum = {
  token: string;
  serverPartition: number;
  streamGuid?: string;
};

export type IcloudPhoto = {
  photoGuid: string;
  width?: number;
  height?: number;
  caption?: string;
  timestamp?: number;
  derivatives: Array<{ checksum: string; width?: number; height?: number }>
    | Record<string, { checksum: string; width?: number; height?: number }>;
};

const MAX_SHARED_ALBUM_TOKEN_LENGTH = 512;

/**
 * Parse links copied from Photos on Apple platforms. Apple currently shares
 * version 2 links (#v2;...) as well as version 3 links (#B..., #C..., etc.).
 */
export function parseIcloudSharedAlbumUrl(input: string): IcloudAlbum {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a valid iCloud Shared Album URL.");
  }

  if (url.protocol !== "https:" || !/(^|\.)icloud\.com$/i.test(url.hostname)) {
    throw new Error("Use a public https://www.icloud.com/sharedalbum/ link.");
  }

  if (!/^\/sharedalbum(?:\/|$)/i.test(url.pathname)) {
    throw new Error("This is not an iCloud Shared Album link. Copy the link from the album’s Share menu.");
  }

  const hash = decodeURIComponent(url.hash.replace(/^#/, "")).trim();
  if (!hash || hash.length > MAX_SHARED_ALBUM_TOKEN_LENGTH) {
    throw new Error("The iCloud Shared Album link is missing its share token.");
  }

  if (hash.startsWith("v2;")) {
    const parts = hash.split(";");
    const serverPartition = Number(parts[1]);
    const streamGuid = parts[2];
    const token = parts[3];
    if (!Number.isInteger(serverPartition) || serverPartition < 0 || !streamGuid || !token) {
      throw new Error("This iCloud Shared Album link is incomplete or unsupported.");
    }
    return { token, serverPartition, streamGuid };
  }

  // Current links use a capital-letter token. Apple base62-decodes the
  // character after A, or the next two after B/C/D, as the initial partition.
  // The complete token is sent to Apple, matching its official web client.
  if (/^A[0-9A-Za-z]{7,}$/.test(hash)) {
    return { token: hash, serverPartition: base62ToNumber(hash.slice(1, 2)) };
  }
  if (/^[BCD][0-9A-Za-z]{7,}$/.test(hash)) {
    return { token: hash, serverPartition: base62ToNumber(hash.slice(1, 3)) };
  }

  throw new Error("This iCloud Shared Album link format is unsupported. Please copy a fresh public link from Photos.");
}

function base62ToNumber(value: string) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = 0;
  for (const character of value) result = result * 62 + alphabet.indexOf(character);
  return result;
}

export function sharedAlbumBaseUrl(album: IcloudAlbum) {
  const partition = String(album.serverPartition).padStart(2, "0");
  return `https://p${partition}-sharedstreams.icloud.com/${encodeURIComponent(album.token)}/sharedstreams`;
}

/** Apple selects the actual stream host with a JSON response and status 330. */
export async function fetchSharedAlbumJson<T>(
  album: IcloudAlbum,
  path: "webstream" | "webasseturls",
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  let baseUrl = sharedAlbumBaseUrl(album);
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(`${baseUrl}/${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
      redirect: "manual",
    });
    if (response.status === 330 || response.status === 301 || response.status === 302) {
      let host = response.headers.get("X-Apple-MMe-Host");
      if (!host && response.status === 330) {
        const redirect = await response.json() as { [key: string]: string };
        host = redirect["X-Apple-MMe-Host"];
      }
      if (!host || !/^[a-z0-9.-]+\.icloud\.com$/i.test(host)) {
        throw new Error("Apple returned an invalid Shared Album server host.");
      }
      baseUrl = `https://${host}/${encodeURIComponent(album.token)}/sharedstreams`;
      continue;
    }
    if (!response.ok) {
      throw new Error(response.status === 404
        ? "The shared album was not found. Check that the link is public and still active."
        : `Apple's Shared Album service returned ${response.status}.`);
    }
    return await response.json() as T;
  }
  throw new Error("Apple could not resolve the Shared Album server.");
}

export function choosePhotoDerivative(photo: IcloudPhoto) {
  const derivatives = (Array.isArray(photo.derivatives)
    ? photo.derivatives
    : Object.values(photo.derivatives ?? {}))
    .filter((d) => d?.checksum);
  if (derivatives.length === 0) return null;
  // Prefer a usable large derivative without downloading the original full
  // resolution on the server. Dimensions are optional in some stream versions.
  const sized = derivatives.filter((d) => Number.isFinite(d.width) && Number.isFinite(d.height));
  const best = (sized.length ? sized : derivatives).reduce((a, b) =>
    ((b.width ?? 0) * (b.height ?? 0)) > ((a.width ?? 0) * (a.height ?? 0)) ? b : a
  );
  return best.checksum;
}

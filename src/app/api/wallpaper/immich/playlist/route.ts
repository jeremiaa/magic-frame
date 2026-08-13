import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getAppSettings } from '@/lib/settings/store';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const dynamic = 'force-dynamic';

// Holt die Asset-Liste je nach gewählter Immich-Quelle (issue #16, Schritt 2).
//   album      → /api/albums/{id}                  (Default, bisheriges Verhalten)
//   favorites  → POST /api/search/metadata {isFavorite}
//   memories   → GET /api/memories  (alle Rückblick-Assets zusammengeführt)
//   people     → POST /api/search/metadata {personIds}
// Alle Pfade liefern Immich-Assets mit (optional) exifInfo — die Metadata-/
// Proxy-Logik darunter bleibt identisch.
// Wie viele Bilder EIN Abruf ausliefert. Bewusst begrenzt: die Liste geht als
// JSON an jedes Display, auch an schwache Tizen-TVs (~240 Byte pro Eintrag).
const MAX_PLAYLIST = 1500;
// Wie viele Assets wir aus Immich HOLEN, bevor gemischt wird. Deutlich höher
// als die Auslieferung — nur so hat auch Foto Nr. 4999 dieselbe Chance,
// gezogen zu werden. Vorher war hier bei 4000 Schluss (Rest unerreichbar).
const MAX_SEARCH_PAGES = 20;
const SEARCH_PAGE_SIZE = 1000;

/**
 * Rückblick-Assets nachreichen (#76).
 *
 * `/api/memories` liefert die Assets ohne `exifInfo` — anders als die
 * Metadata-Suche, die alle anderen Quellen benutzen (`withExif: true`). Dadurch
 * fehlt bei Rückblicken der Ort in der Bildinfo-Leiste, und weil dieselbe
 * exifInfo auch Breite/Höhe trägt, gilt jedes Rückblick-Foto im Split-Raster
 * als Querformat. Das Asset-Detail hat beides, also holen wir es einzeln nach.
 *
 * Bewusst gedeckelt und nur bei Bedarf: pro Tag sind das eine Handvoll Fotos,
 * aber eine grosse Instanz soll nicht hunderte Einzelabrufe abbekommen.
 */
const MAX_MEMORY_ENRICH = 120;
const ENRICH_CONCURRENCY = 8;

async function withExifInfo(baseUrl: string, headers: Record<string, string>, assets: any[]): Promise<any[]> {
  const todo = assets.slice(0, MAX_MEMORY_ENRICH).filter((a) => a?.id && !a.exifInfo);
  if (todo.length === 0) return assets;

  const byId = new Map<string, any>();
  for (let i = 0; i < todo.length; i += ENRICH_CONCURRENCY) {
    const batch = todo.slice(i, i + ENRICH_CONCURRENCY);
    await Promise.all(batch.map(async (a) => {
      try {
        const r = await fetch(`${baseUrl}/api/assets/${a.id}`, { headers, signal: AbortSignal.timeout(8_000) });
        if (!r.ok) return;
        const full = await r.json();
        if (full?.exifInfo) byId.set(a.id, full.exifInfo);
      } catch {
        /* Ein fehlgeschlagenes Detail darf den Rückblick nicht kippen. */
      }
    }));
  }
  if (byId.size === 0) return assets;
  return assets.map((a) => (byId.has(a?.id) ? { ...a, exifInfo: byId.get(a.id) } : a));
}

/** Metadata-Suche mit Seitenlauf — sonst endet ein Album bei 1000 Fotos. */
async function searchAllPages(baseUrl: string, headers: Record<string, string>, body: any): Promise<any[]> {
  const out: any[] = [];
  for (let page = 1; page <= MAX_SEARCH_PAGES; page++) {
    const r = await fetch(`${baseUrl}/api/search/metadata`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, size: SEARCH_PAGE_SIZE, page }),
    });
    if (!r.ok) {
      if (page === 1) throw new Error(`Immich search ${r.status}`);
      break; // spätere Seite kaputt → mit dem nehmen, was da ist
    }
    const d = await r.json();
    const items = d?.assets?.items ?? [];
    out.push(...items);
    // Immich meldet die nächste Seite; fehlt sie, sind wir durch.
    if (!d?.assets?.nextPage || items.length === 0) break;
  }
  return out;
}

async function fetchImmichAssets(baseUrl: string, apiKey: string, wp: any): Promise<any[]> {
  const headers = { 'x-api-key': apiKey, 'Accept': 'application/json' };
  const mode = wp.immichMode || 'album';

  if (mode === 'favorites' || mode === 'people') {
    // Vorher fix 250 Treffer — bei vielen Favoriten fiel der Rest weg.
    const body: any = { type: 'IMAGE', withExif: true };
    if (mode === 'favorites') body.isFavorite = true;
    if (mode === 'people') {
      // #75: mehrere Personen möglich. immichPersonIds ist der neue Weg,
      // immichPersonId bleibt als Einzel-Fallback, damit vorhandene Views
      // unverändert weiterlaufen. Immich sucht mit mehreren personIds nach
      // Fotos, auf denen ALLE genannten Personen zu sehen sind — gefragt war
      // aber "irgendeine davon", also fragen wir je Person und führen zusammen.
      const personIds: string[] = (Array.isArray(wp.immichPersonIds) ? wp.immichPersonIds : [])
        .map((x: any) => String(x || '').trim())
        .filter(Boolean);
      if (personIds.length === 0 && wp.immichPersonId) personIds.push(String(wp.immichPersonId));
      if (personIds.length === 0) throw new Error('Keine Person gewählt — bitte im Wallpaper-Menü mindestens eine auswählen.');

      const perPerson = await Promise.all(personIds.map(async (personId) => {
        try {
          return await searchAllPages(baseUrl, headers, { ...body, personIds: [personId] });
        } catch (e: any) {
          // Eine gelöschte Person darf die anderen nicht mitreißen.
          console.warn(`[immich] Personen-Suche ${personId} fehlgeschlagen: ${e?.message}`);
          return [];
        }
      }));
      // Ein Foto mit mehreren ausgewählten Personen darf nur einmal vorkommen.
      const seen = new Set<string>();
      return perPerson.flat().filter((a: any) => {
        const id = String(a?.id ?? '');
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }
    return searchAllPages(baseUrl, headers, body);
  }

  if (mode === 'memories') {
    // #61: /api/memories ohne Parameter liefert ALLE Rückblicke — dadurch
    // liefen wahllos Fotos statt "heute in früheren Jahren". Immich filtert
    // serverseitig, wenn man ?for=<Datum> mitgibt; zusätzlich filtern wir
    // selbst auf Tag+Monat, falls die Immich-Version ?for= ignoriert.
    const now = new Date();
    const fetchMemories = async (query: string): Promise<any[]> => {
      const r = await fetch(`${baseUrl}/api/memories${query}`, { headers });
      if (!r.ok) throw new Error(`Immich memories ${r.status}`);
      const d = await r.json();
      return Array.isArray(d) ? d : [];
    };

    let list: any[] = [];
    let serverFiltered = false;
    try {
      list = await fetchMemories(`?for=${encodeURIComponent(now.toISOString())}`);
      serverFiltered = list.length > 0;
    } catch {
      list = []; // ältere Immich-Versionen kennen ?for= nicht
    }
    if (list.length === 0) list = await fetchMemories('');

    // Hat Immich schon selbst auf heute gefiltert, übernehmen wir das Ergebnis
    // unverändert. Nur die ungefilterte Notfall-Liste sieben wir selbst — sonst
    // würde ein abweichender Feldname bei irgendeiner Immich-Version dazu
    // führen, dass wir ALLES wegwerfen und der Rahmen schwarz bleibt.
    let use = list;
    if (!serverFiltered) {
      const dayKey = (d: Date) => `${d.getMonth()}-${d.getDate()}`;
      const today = dayKey(now);
      const sameDay = list.filter((m: any) => {
        const at = m?.memoryAt ?? m?.showAt ?? m?.data?.date;
        if (!at) return false;
        const d = new Date(at);
        return !isNaN(d.getTime()) && dayKey(d) === today;
      });
      // Greift unser Filter ins Leere, obwohl es Rückblicke gibt, kennen wir
      // das Datumsfeld nicht — dann lieber die alte Anzeige als gar keine.
      use = sameDay.length > 0 || list.length === 0 ? sameDay : list;
    }

    // Jede Memory hat ein eigenes assets[]-Array — alle zusammenführen.
    const memoryAssets = use.flatMap((m: any) => (Array.isArray(m?.assets) ? m.assets : []));
    // Ort und Bildmaße fehlen hier, anders als bei allen anderen Quellen (#76).
    return withExifInfo(baseUrl, headers, memoryAssets);
  }

  // album (default) — #40: mehrere Alben möglich. immichAlbumIds ist der
  // neue Weg, immichAlbumId bleibt als Einzel-Fallback bestehen, damit
  // vorhandene Views unverändert weiterlaufen.
  const albumIds: string[] = (Array.isArray(wp.immichAlbumIds) ? wp.immichAlbumIds : [])
    .map((x: any) => String(x || '').trim())
    .filter(Boolean);
  if (albumIds.length === 0 && wp.immichAlbumId) albumIds.push(String(wp.immichAlbumId));
  if (albumIds.length === 0) throw new Error('Missing albumId');

  const perAlbum = await Promise.all(albumIds.map(async (albumId) => {
    const r = await fetch(`${baseUrl}/api/albums/${albumId}`, { headers });
    if (!r.ok) {
      // Ein gelöschtes Album darf die anderen nicht mitreißen.
      console.warn(`[immich] Album ${albumId} nicht abrufbar (${r.status})`);
      return [];
    }
    const d = await r.json();
    // Immich <= 2.x liefert die Assets direkt im Album-Detail.
    if (Array.isArray(d?.assets) && d.assets.length > 0) return d.assets;
    // Immich >= 3.0: Breaking Change — das Album-Detail enthält kein assets[]
    // mehr (nur noch assetCount). Assets stattdessen über die Metadata-Suche
    // mit albumIds holen — gleiche Response-Form wie favorites/people
    // (assets.items); exifInfo via withExif bleibt für die Metadata-Bar erhalten.
    if ((d?.assetCount ?? 0) > 0) {
      try {
        return await searchAllPages(baseUrl, headers, { albumIds: [albumId], type: 'IMAGE', withExif: true });
      } catch (e: any) {
        console.warn(`[immich] Album-Suche ${albumId} fehlgeschlagen: ${e?.message}`);
        return [];
      }
    }
    return [];
  }));

  // Zusammenführen und doppelte Assets entfernen (ein Foto kann in mehreren
  // Alben liegen — sonst käme es doppelt so oft in der Rotation vor).
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const asset of perAlbum.flat()) {
    const key = asset?.id ?? asset?.deviceAssetId;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(asset);
  }
  return merged;
}

export async function GET(req: NextRequest) {
  try {
     const dashboardId = req.nextUrl.searchParams.get('dashboardId') || "1";
     // en-US matches the Clock + Calendar + Weather widgets — gives
     // "May 27, 2026" for English and "27. Mai 2026" for German, so the
     // photo metadata under the wallpaper reads the same as the rest of
     // the dashboard.
     const dateLocale = req.nextUrl.searchParams.get('lang') === 'en' ? 'en-US' : 'de-DE';
     const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
     if (!dashboard || !dashboard.wallpaper) return new NextResponse("Not Found", { status: 404 });
     const wp = dashboard.wallpaper as any;

     if (wp.source !== 'immich') return new NextResponse("Not Immich", { status: 400 });
     // Per-View-Daten gewinnen, sonst globale Immich-Verbindung (issue #16).
     const settings = await getAppSettings();
     const immichUrl = wp.immichUrl || settings.immichUrl;
     const immichApiKey = wp.immichApiKey || settings.immichApiKey;
     if (!immichUrl || !immichApiKey) return new NextResponse("Missing Immich configuration", { status: 400 });

     const baseUrl = immichUrl.replace(/\/$/, "");

     const assets = await fetchImmichAssets(baseUrl, immichApiKey, wp);

     if (assets.length === 0) return new NextResponse("No assets found for this Immich source", { status: 404 });

     // Mischen und begrenzen. Das alte Limit von 200 war für große Alben viel
     // zu knapp — bei 1000+ Fotos sah man nie mehr als ein Fünftel davon.
     // `sort(() => 0.5 - Math.random())` war zudem kein echtes Mischen
     // (verzerrt und je nach Engine instabil) → Fisher-Yates.
     const shuffled = [...assets];
     for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
     }
     const selected = shuffled.slice(0, MAX_PLAYLIST);

     const playlist = [];

     for (const asset of selected) {
        let metadata: any = undefined;

        if (wp.showMetadata) {
           metadata = {};
           const exif = asset.exifInfo;

           if (exif) {
              if (exif.dateTimeOriginal) {
                  const dateObj = new Date(exif.dateTimeOriginal);
                  if (!isNaN(dateObj.getTime())) {
                     const formattedDate = new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: 'long', year: 'numeric' }).format(dateObj);
                     metadata.dateTaken = formattedDate;
                  }
              }
              if (exif.model) {
                 metadata.cameraModel = exif.model;
              }
              if (exif.city || exif.state || exif.country) {
                 // Try to formulate a nice location name
                 const parts = [];
                 if (exif.city) parts.push(exif.city);
                 if (exif.state && !exif.city) parts.push(exif.state);
                 if (exif.country) parts.push(exif.country);
                 if (parts.length > 0) metadata.locationName = parts.join(', ');
              }
           }

           // Fallback to file creation date if no EXIF date
           if (!metadata.dateTaken && asset.fileCreatedAt) {
               const dateObj = new Date(asset.fileCreatedAt);
               if (!isNaN(dateObj.getTime())) {
                   const formattedDate = new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: 'long', year: 'numeric' }).format(dateObj);
                   metadata.dateTaken = formattedDate;
               }
           }
        }

        // Orientierung für den Split-View (Schritt 3) — exakt wie ImmichFrame
        // (home-page.svelte/isPortrait): das EXIF-Rotation-Flag 5–8 dreht das
        // Bild um 90°, also Höhe/Breite tauschen, bevor verglichen wird. Ohne
        // das landen hochkant aufgenommene (aber landscape gespeicherte) Fotos
        // im falschen Topf. Fallback landscape, wenn keine Maße da sind.
        let ow = typeof asset.exifInfo?.exifImageWidth === "number" ? asset.exifInfo.exifImageWidth : 0;
        let oh = typeof asset.exifInfo?.exifImageHeight === "number" ? asset.exifInfo.exifImageHeight : 0;
        if ([5, 6, 7, 8].includes(Number(asset.exifInfo?.orientation ?? 0))) {
           [ow, oh] = [oh, ow];
        }
        const orientation: "portrait" | "landscape" = oh > ow ? "portrait" : "landscape";

        playlist.push({
           id: asset.id,
           // Points to our secure proxy
           url: `/api/wallpaper/immich?id=${asset.id}&dashboardId=${dashboardId}`,
           metadata,
           orientation,
        });
     }

     return NextResponse.json(playlist);
  } catch (error) {
     console.error("Immich Playlist Error:", error);
     return new NextResponse("Internal Server Error", { status: 500 });
  }
}

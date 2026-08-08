import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from "webdav";
import { extractEXIFFromBuffer } from "@/lib/wallpaper-engine/exif";
import { normalizeWebdavUrl, isSupportedWebdavImage, countWebdavImages } from "@/lib/wallpaper-engine/webdav";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
     const dashboardId = req.nextUrl.searchParams.get('dashboardId') || "1";
     // en-US matches Clock + Calendar + Weather + Immich playlist —
     // "May 27, 2026" for English, "27. Mai 2026" for German.
     const dateLocale = req.nextUrl.searchParams.get('lang') === 'en' ? 'en-US' : 'de-DE';
     const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
     if (!dashboard || !dashboard.wallpaper) return NextResponse.json({ error: "Not Found" }, { status: 404 });
     const wp = dashboard.wallpaper as any;

     if (wp.source !== 'webdav') return NextResponse.json({ error: "Not WebDAV" }, { status: 400 });
     if (!wp.webdavUrl || !wp.webdavUser || !wp.webdavPass) {
        return NextResponse.json({ error: "Missing NAS credentials" }, { status: 400 });
     }

     const cleanUrl = normalizeWebdavUrl(wp.webdavUrl);
     const client = createClient(cleanUrl, { username: wp.webdavUser, password: wp.webdavPass });
     const targetPath = wp.webdavPath || "/";
     const directoryItems = await client.getDirectoryContents(targetPath);
     const images = (directoryItems as any[]).filter(
        i => i.type === 'file' && isSupportedWebdavImage(i.filename)
     );

     if (images.length === 0) {
        // Sagen, WARUM nichts übrig blieb (#80). "Keine Bilder gefunden" schickt
        // den Nutzer sonst auf die Suche nach einem Verbindungsfehler, obwohl der
        // Ordner schlicht nur HEIC oder gar keine Bilder enthält.
        const { unsupported } = countWebdavImages(directoryItems as any[]);
        const error = unsupported > 0
           ? `Der Ordner enthält ${unsupported} Bilder in einem Format, das Browser nicht anzeigen können (z. B. HEIC oder RAW). Bitte JPG, PNG oder WebP verwenden.`
           : "In diesem Ordner liegen keine Bilder.";
        return NextResponse.json({ error, path: targetPath }, { status: 404 });
     }

     // Pick up to 100 random images to drastically increase variety
     const shuffled = images.sort(() => 0.5 - Math.random());
     const selected = shuffled.slice(0, 100);
     
     const playlist = [];

     const baseAuth = "Basic " + Buffer.from(`${wp.webdavUser}:${wp.webdavPass}`).toString('base64');
     const baseUrl = cleanUrl.replace(/\/$/, "");

     for (const img of selected) {
        let metadata: any = undefined;

         if (wp.showMetadata) {
            metadata = {};

            // Efficiently fetch only the first 128KB of the image for EXIF parsing using Range
            try {
               const fileUrl = `${baseUrl}${encodeURI(img.filename).replace(/#/g, '%23')}`;
               const imgRes = await fetch(fileUrl, {
                  headers: {
                     'Authorization': baseAuth,
                     'Range': 'bytes=0-131071'
                  }
               });

               if (imgRes.ok || imgRes.status === 206) {
                  const arrayBuffer = await imgRes.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  const exif = await extractEXIFFromBuffer(buffer);

                  if (exif.dateTaken) {
                     const dateObj = new Date(exif.dateTaken);
                     if (!isNaN(dateObj.getTime())) {
                        const formattedDate = new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: 'long', year: 'numeric' }).format(dateObj);
                        metadata.dateTaken = formattedDate;
                     }
                  }
                  if (exif.cameraModel) {
                     metadata.cameraModel = exif.cameraModel;
                  }
                  if (exif.latitude && exif.longitude) {
                     metadata.locationName = `${exif.latitude.toFixed(4)}, ${exif.longitude.toFixed(4)}`;
                  }
               }
            } catch(err) {
               console.error("EXIF chunk fetch failed for", img.filename, err);
            }
            
            // Fallback: If no EXIF was found at all but they want the date, use the file modification date (when it was added to the NAS)
            if (!metadata.dateTaken && img.lastmod) {
               const dateObj = new Date(img.lastmod);
               if (!isNaN(dateObj.getTime())) {
                  const formattedDate = new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: 'long', year: 'numeric' }).format(dateObj);
                  metadata.dateTaken = formattedDate;
               }
            }
         }

        playlist.push({
           id: img.filename,
           // Client will now fetch this specific file. dashboardId mitgeben,
           // damit die Single-Image-Route das richtige Wallpaper findet (#29).
           url: `/api/wallpaper/webdav?dashboardId=${encodeURIComponent(dashboardId)}&file=${encodeURIComponent(img.filename)}`,
           metadata
        });
     }

     return NextResponse.json(playlist);
  } catch (error: any) {
     console.error("WebDAV Playlist Error:", error);
     const status = error?.response?.status;
     const message = status === 401
        ? "Falscher Benutzername oder Passwort."
        : status === 404
           ? "Der eingestellte Ordner existiert auf dem Server nicht."
           : "NAS nicht erreichbar.";
     return NextResponse.json({ error: message }, { status: 500 });
  }
}

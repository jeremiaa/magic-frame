import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  choosePhotoDerivative,
  fetchSharedAlbumJson,
  parseIcloudSharedAlbumUrl,
  type IcloudPhoto,
} from "@/lib/wallpaper-engine/icloud";

const pool = new Pool({ connectionString: `${process.env.DATABASE_URL}` });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
export const dynamic = "force-dynamic";

const MAX_PLAYLIST = 1500;

export async function GET(req: NextRequest) {
  try {
    const dashboardId = req.nextUrl.searchParams.get("dashboardId") || "1";
    const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
    if (!dashboard?.wallpaper) return NextResponse.json({ error: "View not found." }, { status: 404 });

    const wp = dashboard.wallpaper as Record<string, unknown>;
    if (wp.source !== "icloud") return NextResponse.json({ error: "This view does not use iCloud." }, { status: 400 });
    if (typeof wp.icloudUrl !== "string" || !wp.icloudUrl) return NextResponse.json({ error: "Add a public iCloud Shared Album link in Wallpaper settings." }, { status: 400 });

    const album = parseIcloudSharedAlbumUrl(String(wp.icloudUrl));
    const stream = await fetchSharedAlbumJson<{ photos?: IcloudPhoto[] }>(
      album,
      "webstream",
      { ...(album.streamGuid ? { streamGuid: album.streamGuid } : {}), streamCtag: null },
      AbortSignal.timeout(15_000),
    );
    const photos = Array.isArray(stream.photos) ? stream.photos : [];
    if (photos.length === 0) {
      return NextResponse.json({ error: "This shared album has no photos available." }, { status: 404 });
    }

    const withDerivatives = photos
      .map((photo) => ({ photo, checksum: choosePhotoDerivative(photo) }))
      .filter((item): item is { photo: IcloudPhoto; checksum: string } => Boolean(item.checksum));

    if (withDerivatives.length === 0) {
      return NextResponse.json({ error: "Apple did not provide displayable photo versions for this album." }, { status: 404 });
    }

    // Fisher–Yates sample to avoid returning an excessive playlist to displays.
    for (let i = withDerivatives.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [withDerivatives[i], withDerivatives[j]] = [withDerivatives[j], withDerivatives[i]];
    }

    const playlist = withDerivatives.slice(0, MAX_PLAYLIST).map(({ photo, checksum }) => {
      const width = Number(photo.width || 0);
      const height = Number(photo.height || 0);
      const dateLocale = req.nextUrl.searchParams.get("lang") === "en" ? "en-US" : "de-DE";
      let metadata: Record<string, string> | undefined;
      if (wp.showMetadata === true) {
        metadata = {};
        if (photo.caption) metadata.locationName = String(photo.caption).slice(0, 160);
        if (photo.timestamp) {
          const date = new Date(Number(photo.timestamp));
          if (!Number.isNaN(date.getTime())) {
            metadata.dateTaken = new Intl.DateTimeFormat(dateLocale, { day: "2-digit", month: "long", year: "numeric" }).format(date);
          }
        }
      }
      return {
        id: photo.photoGuid,
        url: `/api/wallpaper/icloud/photo?dashboardId=${encodeURIComponent(dashboardId)}&checksum=${encodeURIComponent(checksum)}`,
        orientation: height > width ? "portrait" : "landscape",
        metadata,
      };
    });

    return NextResponse.json(playlist, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const caught = error instanceof Error ? error : new Error("Unable to load the iCloud Shared Album.");
    const status = caught.name === "TimeoutError" || caught.name === "AbortError" ? 504 : 400;
    console.error("iCloud Shared Album playlist error:", caught.message);
    return NextResponse.json({ error: status === 504 ? "Apple's Shared Album service timed out." : caught.message }, { status });
  }
}

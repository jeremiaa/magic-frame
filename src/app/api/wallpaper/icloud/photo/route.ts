import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { fetchSharedAlbumJson, parseIcloudSharedAlbumUrl } from "@/lib/wallpaper-engine/icloud";

type AppleUrlItem = { url_location?: string; url_path?: string };
type AppleUrlResponse = { items?: Record<string, AppleUrlItem> };
type AppleDerivative = { checksum?: string; width?: number; height?: number };
type ApplePhoto = { photoGuid: string; derivatives?: AppleDerivative[] | Record<string, AppleDerivative> };
type AppleStreamResponse = { photos?: ApplePhoto[] };

const pool = new Pool({ connectionString: `${process.env.DATABASE_URL}` });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const dashboardId = req.nextUrl.searchParams.get("dashboardId") || "1";
    const checksum = req.nextUrl.searchParams.get("checksum");
    if (!checksum || !/^[0-9a-z]{16,128}$/i.test(checksum)) {
      return new NextResponse("Invalid photo checksum", { status: 400 });
    }

    const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
    if (!dashboard?.wallpaper) return new NextResponse("View not found", { status: 404 });
    const wp = dashboard.wallpaper as Record<string, unknown>;
    if (wp.source !== "icloud" || typeof wp.icloudUrl !== "string" || !wp.icloudUrl) return new NextResponse("iCloud source not configured", { status: 400 });

    const album = parseIcloudSharedAlbumUrl(String(wp.icloudUrl));
    const stream = await fetchSharedAlbumJson<AppleStreamResponse>(
      album,
      "webstream",
      { ...(album.streamGuid ? { streamGuid: album.streamGuid } : {}), streamCtag: null },
      AbortSignal.timeout(15_000),
    );
    const photo = Array.isArray(stream.photos)
      ? stream.photos.find((item) => {
        const derivatives = Array.isArray(item.derivatives)
          ? item.derivatives
          : Object.values(item.derivatives ?? {});
        return derivatives.some((derivative) => derivative.checksum === checksum);
      })
      : null;
    if (!photo?.photoGuid) return new NextResponse("Photo is no longer in this shared album", { status: 404 });

    const data = await fetchSharedAlbumJson<AppleUrlResponse>(album, "webasseturls", {
      photoGuids: [photo.photoGuid],
    }, AbortSignal.timeout(15_000));
    const photoData = data.items?.[checksum];
    const host = photoData?.url_location;
    const path = photoData?.url_path;
    const url = host && /^[a-z0-9.-]+\.icloud-content\.com$/i.test(host) && path?.startsWith("/")
      ? `https://${host}${path}`
      : undefined;
    if (!url) return new NextResponse("Apple did not return a photo URL", { status: 502 });

    const image = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!image.ok || !image.body) return new NextResponse("Apple photo download failed", { status: 502 });
    const contentType = image.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return new NextResponse("Apple returned a non-image file", { status: 502 });

    return new NextResponse(image.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    const caught = error instanceof Error ? error : new Error("Unable to load iCloud photo");
    console.error("iCloud Shared Album photo error:", caught.message);
    const status = caught.name === "TimeoutError" || caught.name === "AbortError" ? 504 : 400;
    return new NextResponse(status === 504 ? "Apple's Shared Album service timed out" : "Unable to load iCloud photo", { status });
  }
}

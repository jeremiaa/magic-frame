import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from "webdav";
import { normalizeWebdavUrl, webdavContentType } from "@/lib/wallpaper-engine/webdav";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
     // dashboardId aus der Query (von der Playlist mitgegeben). Fällt auf "1"
     // zurück, damit alte Single-Dashboard-Setups unverändert weiterlaufen.
     // Vorher war "1" hart verdrahtet → WebDAV-Bilder luden nur, wenn das
     // Wallpaper auf Dashboard "1" lag; jeder andere View gab "Not WebDAV". (#29)
     const dashboardId = req.nextUrl.searchParams.get('dashboardId') || "1";
     const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
     if (!dashboard || !dashboard.wallpaper) return new NextResponse("Not Found", { status: 404 });
     const wp = dashboard.wallpaper as any;

     if (wp.source !== 'webdav') return new NextResponse("Not WebDAV", { status: 400 });
     if (!wp.webdavUrl || !wp.webdavUser || !wp.webdavPass) return new NextResponse("Missing NAS credentials", { status: 400 });

     const targetFile = req.nextUrl.searchParams.get('file');

     if (!targetFile) {
        return new NextResponse("Missing file parameter", { status: 400 });
     }

     const client = createClient(normalizeWebdavUrl(wp.webdavUrl), { username: wp.webdavUser, password: wp.webdavPass });
     
     // Fetch as buffer to avoid native Node stream to Web stream conversion complexity overhead for basic images
     const buffer = await client.getFileContents(targetFile) as Buffer;
     
     const headers = new Headers();
     headers.set('Content-Type', webdavContentType(targetFile));
     headers.set('Cache-Control', 'public, max-age=864000');
     
     return new NextResponse(buffer as unknown as BodyInit, { status: 200, headers });
  } catch (error) {
     console.error("WebDAV Error:", error);
     return new NextResponse("Internal NAS Error", { status: 500 });
  }
}

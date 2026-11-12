import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getAppSettings } from '@/lib/settings/store';
import { pairImmich, isImmichProblem, isImmichId } from '@/lib/immich/pair';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
     const id = req.nextUrl.searchParams.get('id');
     const dashboardId = req.nextUrl.searchParams.get('dashboardId') || "1";
     
     if (!id) return new NextResponse("Missing file id", { status: 400 });
     // Only an Immich id, nothing with a slash or a dot: the id ends up in the
     // path we call with our key, and must not lead to another endpoint.
     if (!isImmichId(id)) return new NextResponse("Invalid file id", { status: 400 });

     const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
     if (!dashboard || !dashboard.wallpaper) return new NextResponse("Not Found", { status: 404 });
     const wp = dashboard.wallpaper as any;

     if (wp.source !== 'immich') return new NextResponse("Not Immich", { status: 400 });
     const settings = await getAppSettings();
     // The view's address with the view's key, or the saved pair. The saved key
     // never goes to an address someone typed into a view (pairImmich).
     const pair = pairImmich({ url: wp.immichUrl, key: wp.immichApiKey }, { url: settings.immichUrl, key: settings.immichApiKey });
     if (isImmichProblem(pair)) return new NextResponse("Missing NAS credentials", { status: 400 });
     const immichApiKey = pair.key;

     const baseUrl = pair.url.replace(/\/$/, "");

     // We request the 'preview' size. This is technically a 1080p/approximate 4k scaling managed natively by Immich.
     // It guarantees fast load times while still looking amazing on Smart TVs.
     const imgRes = await fetch(`${baseUrl}/api/assets/${id}/thumbnail?size=preview`, {
        headers: {
           // resolved key (per-view ?? global) — wp.immichApiKey allein wäre
           // undefined, sobald ein View nur die globale Verbindung nutzt (#16).
           'x-api-key': immichApiKey,
           'Accept': 'application/json'
        }
     });

     if (!imgRes.ok) {
        return new NextResponse("Immich Proxy Error", { status: imgRes.status });
     }

     const headers = new Headers();
     headers.set('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
     headers.set('Cache-Control', 'public, max-age=604800, immutable'); // Cache for 1 week

     return new NextResponse(imgRes.body, {
        status: 200,
        headers
     });
     
  } catch (error) {
     console.error("Immich Proxy Error:", error);
     return new NextResponse("Internal Server Error", { status: 500 });
  }
}

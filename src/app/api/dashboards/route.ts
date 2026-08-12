import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { resolveUserId } from "@/lib/auth/shortcut";
import { DEFAULT_WALLPAPER } from "@/lib/wallpaper-engine/bundled";
import { remapButtonTargets } from "@/lib/widgets/remap-targets";
import { forgetAllowedEntities } from "@/lib/ha/action-policy";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // POST and DELETE below have always checked the session; GET did not, so
    // the list of every view — ids, names, orientation, widget geometry — was
    // public. A display never calls this; it loads its own view by id.
    //
    // `resolveUserId` and not `verifySession`, because this is also the
    // discovery call the companion recipes use ("GET /api/dashboards lists
    // every view with its id" sits right above the navigate/refresh Shortcut
    // in wiki/companion-api.md). Those authenticate with ?key=<token>, which a
    // session-only check would refuse with no working alternative.
    if (!(await resolveUserId(req))) return unauthorizedResponse();

    const dashboards = await prisma.dashboard.findMany({
      select: {
        id: true,
        name: true,
        settings: true,
        widgets: { select: { id: true, type: true, x: true, y: true, w: true, h: true } },
      },
      orderBy: { id: 'asc' }
    });
    const shaped = dashboards.map((d) => {
      const orientation = (d.settings as any)?.orientation;
      return {
        id: d.id,
        name: d.name,
        orientation: orientation === "landscape" ? "landscape" : "portrait",
        layout: d.widgets,
      };
    });
    return NextResponse.json(shaped, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } });
  } catch(error) {
    // Not signed in must answer 401, not 500 — the editor pages redirect on
    // 401 and would otherwise show "Failed to fetch dashboards" to somebody
    // whose session simply expired.
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch dashboards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifySession();
    const { id, name, oldId, sourceId, orientation } = await req.json();
    const orient = orientation === "landscape" ? "landscape" : "portrait";

    if (!id || !name) {
       return NextResponse.json({ error: "Missing id or name" }, { status: 400 });
    }

    // Clean up ID (lowercase, alphanumeric, dashes)
    const safeId = id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    if (!safeId) return NextResponse.json({ error: "Invalid path ID" }, { status: 400 });

    if (sourceId && sourceId !== safeId) {
       // DUPLICATE: copy the dashboard + its widgets under a new ID, leave the
       // source untouched. Widget IDs get a unique suffix per target so the
       // copies never collide with the originals.
       const source = await prisma.dashboard.findUnique({
          where: { id: sourceId },
          include: { widgets: true }
       });
       if (!source) return NextResponse.json({ error: "Source dashboard not found" }, { status: 404 });

       await prisma.dashboard.create({
          data: {
             id: safeId,
             name,
             wallpaper: source.wallpaper || {},
             settings: source.settings || { orientation: orient }
          }
       });

       const widgetSuffix = `_${safeId}`;
       // Map every source widget id to its new (suffixed) id first, so button
       // target references can be rewritten as we copy.
       const idMap: Record<string, string> = {};
       for (const w of source.widgets) idMap[w.id] = w.id + widgetSuffix;
       for (const w of source.widgets) {
          await prisma.widget.create({
             data: {
                id: idMap[w.id], // unique per target dashboard
                type: w.type,
                x: w.x, y: w.y, w: w.w, h: w.h,
                bgOpacity: w.bgOpacity,
                config: remapButtonTargets(w.config, (id) => idMap[id] ?? id),
                dashboardId: safeId
             }
          });
       }

    } else if (oldId && oldId !== safeId) {
       // RENAME: change the URL slug. Prisma doesn't easily CASCADE UPDATE
       // primary keys, so we copy → delete the old. Widget IDs get a suffix
       // to avoid clashing with anything else in the table.
       const oldDashboard = await prisma.dashboard.findUnique({
          where: { id: oldId },
          include: { widgets: true }
       });
       if (!oldDashboard) return NextResponse.json({ error: "Old dashboard not found" }, { status: 404 });

       // Create new
       await prisma.dashboard.create({
          data: {
             id: safeId,
             name: name,
             wallpaper: oldDashboard.wallpaper || {},
             settings: oldDashboard.settings || {}
          }
       });

       // Copy widgets — remap button target references to the new ids too.
       const idMap: Record<string, string> = {};
       for (const w of oldDashboard.widgets) idMap[w.id] = w.id + "_copy";
       for (const w of oldDashboard.widgets) {
          await prisma.widget.create({
             data: {
                id: idMap[w.id], // prevent duplicate widget IDs
                type: w.type,
                x: w.x, y: w.y, w: w.w, h: w.h,
                bgOpacity: w.bgOpacity,
                config: remapButtonTargets(w.config, (id) => idMap[id] ?? id),
                dashboardId: safeId
             }
          });
       }

       // Delete old
       await prisma.dashboard.delete({ where: { id: oldId } });

    } else {
       // CREATE or UPDATE-IN-PLACE: same ID — just upsert the name.
       await prisma.dashboard.upsert({
          where: { id: safeId },
          update: { name }, // bestehender View: nur Name, Wallpaper bleibt unangetastet
          create: {
             id: safeId,
             name,
             wallpaper: DEFAULT_WALLPAPER as any,
             settings: { orientation: orient },
             // Starter-Widgets direkt in die DB seeden statt über einen Client-
             // Fallback. Sonst tauchen die Defaults bei einem BEWUSST geleerten
             // View wieder auf, weil leeres Layout sonst nicht von "neu, nie
             // konfiguriert" zu unterscheiden ist (#27).
             widgets: {
                create: [
                   { id: `${safeId}_clk`, type: "ClockWidget.tsx", x: 0, y: 0, w: 6, h: 4, bgOpacity: 20, config: {} },
                   { id: `${safeId}_cal`, type: "CalendarWidget.tsx", x: 0, y: 4, w: 6, h: 6, bgOpacity: 20, config: {} },
                   { id: `${safeId}_wth`, type: "WeatherWidget.tsx", x: 0, y: 10, w: 12, h: 6, bgOpacity: 50, config: {} },
                ],
             },
          }
       });
    }

    // Anlegen, Duplizieren und Umbenennen ändern alle die Widget-Configs —
    // und damit die Erlaubnisliste von /api/ha/action.
    forgetAllowedEntities();
    return NextResponse.json({ success: true, id: safeId });
  } catch(error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("Dashboard POST Error:", error);
    if (error.code === 'P2002') {
       return NextResponse.json({ error: "This URL path already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save dashboard" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
     await verifySession();
     const id = req.nextUrl.searchParams.get('id');
     if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

     await prisma.dashboard.delete({ where: { id } });
     forgetAllowedEntities();
     return NextResponse.json({ success: true });
  } catch(error) {
     if (error instanceof UnauthorizedError) return unauthorizedResponse();
     console.error(error);
     return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

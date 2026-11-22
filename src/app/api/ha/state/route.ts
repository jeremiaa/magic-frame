import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";
import { readableEntities } from "@/lib/ha/action-policy";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
     const entityId = req.nextUrl.searchParams.get('entityId');
     const idsParam = req.nextUrl.searchParams.get('ids');

     if (!entityId && !idsParam) return new NextResponse("Missing entity IDs", { status: 400 });

     // Support both old `entityId` and new `ids=A,B,C`
     const rawIds = idsParam ? idsParam.split(',') : [entityId as string];
     const asked = rawIds.map(e => e.trim()).filter(e => e);

     // No login here on purpose — a wall tablet reads its tiles without one.
     // Without a session only what is on a saved view comes back, and nobody
     // gets an id past that is not shaped like one (see readableEntities).
     // A refused id is simply missing from the answer, like an unknown one.
     const entities = await readableEntities("ha/state", asked);
     if (entities.length === 0) return NextResponse.json({});

     const settings = await getAppSettings();
     if (!settings.haUrl || !settings.haToken) {
        return new NextResponse("Home Assistant not configured", { status: 400 });
     }

     const fetchEntity = async (id: string) => {
        const url = `${settings.haUrl.replace(/\/$/, '')}/api/states/${encodeURIComponent(id)}`;
        const response = await fetch(url, {
           headers: {
              "Authorization": `Bearer ${settings.haToken}`,
              "Content-Type": "application/json",
           },
           cache: 'no-store'
        });
        if (!response.ok) return null;
        return response.json();
     };

     const results = await Promise.all(entities.map(id => fetchEntity(id)));

     const dict: Record<string, any> = {};
     entities.forEach((id, index) => {
         if (results[index]) dict[id] = results[index];
     });

     return NextResponse.json(dict);
  } catch (error) {
     console.error("HA Proxy Error:", error);
     return new NextResponse("Internal Proxy Error", { status: 500 });
  }
}

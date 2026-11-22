import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";
import { describeHaFetchError } from "@/lib/ha/fetch-error";
import { callerMayRead } from "@/lib/ha/action-policy";

export const dynamic = "force-dynamic";

type Point = { t: string; v: number };

export async function GET(req: NextRequest) {
  const entityId = req.nextUrl.searchParams.get("entityId");
  const hoursParam = parseInt(req.nextUrl.searchParams.get("hours") ?? "6", 10);
  const hours = Math.min(168, Math.max(1, isNaN(hoursParam) ? 6 : hoursParam));
  const sample = Math.min(
    500,
    Math.max(10, parseInt(req.nextUrl.searchParams.get("sample") ?? "80", 10)),
  );

  if (!entityId) {
    return NextResponse.json({ error: "Missing entityId" }, { status: 400 });
  }
  // A sparkline on a tablet needs no login — but then only for an entity that
  // is on a saved view, like every other read (see readableEntities).
  if (!(await callerMayRead("ha/history", entityId))) {
    return NextResponse.json({ error: "This entity is not on any of your views." }, { status: 403 });
  }

  const settings = await getAppSettings();
  if (!settings.haUrl || !settings.haToken) {
    return NextResponse.json(
      { error: "Home Assistant not configured" },
      { status: 400 },
    );
  }

  try {
    const start = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const url = `${settings.haUrl.replace(/\/$/, "")}/api/history/period/${start}?filter_entity_id=${encodeURIComponent(entityId)}&minimal_response&no_attributes`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${settings.haToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `HA returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const series: Point[] = Array.isArray(data?.[0])
      ? data[0]
          .map((row: any) => ({ t: row.last_changed, v: parseFloat(row.state) }))
          .filter((p: Point) => Number.isFinite(p.v))
      : [];

    // Downsample: nur bei viel Zu Daten jedes n-te Sample behalten.
    let compacted = series;
    if (series.length > sample) {
      const step = Math.ceil(series.length / sample);
      compacted = series.filter((_, i) => i % step === 0);
    }

    return NextResponse.json({
      entityId,
      hours,
      series: compacted,
    });
  } catch (err: any) {
    console.error("[HA History] error:", err);
    return NextResponse.json(
      { error: describeHaFetchError(err) },
      { status: 500 },
    );
  }
}

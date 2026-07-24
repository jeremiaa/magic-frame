import { NextResponse } from "next/server";

// Ortssuche für Inspector-Standortfelder: Proxy auf die freie Open-Meteo
// Geocoding-API (kein Key nötig). Proxy statt Direktzugriff, damit alle
// Widget-Datenpfade über unsere API laufen (CORS-/Netz-Politik einheitlich).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const lang = searchParams.get("lang") === "en" ? "en" : "de";
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${lang}&format=json`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) throw new Error(`geocoding ${res.status}`);
    const data = await res.json();
    const results = Array.isArray(data.results)
      ? data.results.map((r: any) => ({
          name: r.name as string,
          region: [r.admin1, r.country].filter(Boolean).join(", "),
          lat: String(r.latitude),
          lon: String(r.longitude),
        }))
      : [];
    return NextResponse.json({ results });
  } catch (e) {
    console.error("[Geocode API] failed:", e);
    return NextResponse.json({ results: [], error: "Ortssuche nicht verfügbar" }, { status: 502 });
  }
}

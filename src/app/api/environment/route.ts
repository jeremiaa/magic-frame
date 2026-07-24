import { NextResponse } from "next/server";

// Umwelt-Daten für das EnvironmentWidget: Luftqualität + Pollen von der
// Open-Meteo Air-Quality-API, Solar-Strahlung + Wind von der Forecast-API.
// Beide werden parallel geholt; fällt eine aus, liefert die andere trotzdem
// (partial result statt Totalausfall). Pollen gibt es nur in Europa (CAMS) —
// außerhalb kommen null-Werte, das Widget blendet die Kacheln dann aus.

const ALLOWED_WIND = new Set(["kmh", "mph", "ms", "kn"]);

const AQ_FIELDS = [
  "european_aqi",
  "us_aqi",
  "pm10",
  "pm2_5",
  "nitrogen_dioxide",
  "ozone",
  "sulphur_dioxide",
  "carbon_monoxide",
  "uv_index",
  "alder_pollen",
  "birch_pollen",
  "grass_pollen",
  "mugwort_pollen",
  "olive_pollen",
  "ragweed_pollen",
].join(",");

const FC_FIELDS = [
  "shortwave_radiation",
  "direct_radiation",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
].join(",");

const numOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const windUnitRaw = searchParams.get("wind_speed_unit") ?? "kmh";
  const windUnit = ALLOWED_WIND.has(windUnitRaw) ? windUnitRaw : "kmh";

  if (!lat || !lon) {
    return NextResponse.json({ error: "Latitude and Longitude are required" }, { status: 400 });
  }

  const aqUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}` +
    `&current=${AQ_FIELDS}&timezone=auto`;
  const fcUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}` +
    `&current=${FC_FIELDS}&wind_speed_unit=${windUnit}&timezone=auto`;

  const fetchJson = async (url: string) => {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    return res.json();
  };

  const [aqRes, fcRes] = await Promise.allSettled([fetchJson(aqUrl), fetchJson(fcUrl)]);
  const aq = aqRes.status === "fulfilled" ? aqRes.value?.current ?? {} : null;
  const fc = fcRes.status === "fulfilled" ? fcRes.value?.current ?? {} : null;

  if (!aq && !fc) {
    console.error(
      "[Environment API] both sources failed:",
      aqRes.status === "rejected" ? aqRes.reason : "",
      fcRes.status === "rejected" ? fcRes.reason : "",
    );
    return NextResponse.json({ error: "Umweltdaten nicht verfügbar" }, { status: 502 });
  }

  return NextResponse.json({
    aqi: aq ? { european: numOrNull(aq.european_aqi), us: numOrNull(aq.us_aqi) } : null,
    pollutants: aq
      ? {
          pm2_5: numOrNull(aq.pm2_5),
          pm10: numOrNull(aq.pm10),
          ozone: numOrNull(aq.ozone),
          nitrogen_dioxide: numOrNull(aq.nitrogen_dioxide),
          sulphur_dioxide: numOrNull(aq.sulphur_dioxide),
          carbon_monoxide: numOrNull(aq.carbon_monoxide),
        }
      : null,
    pollen: aq
      ? {
          alder: numOrNull(aq.alder_pollen),
          birch: numOrNull(aq.birch_pollen),
          grass: numOrNull(aq.grass_pollen),
          mugwort: numOrNull(aq.mugwort_pollen),
          olive: numOrNull(aq.olive_pollen),
          ragweed: numOrNull(aq.ragweed_pollen),
        }
      : null,
    uv: aq ? numOrNull(aq.uv_index) : null,
    solar: fc
      ? { shortwave: numOrNull(fc.shortwave_radiation), direct: numOrNull(fc.direct_radiation) }
      : null,
    wind: fc
      ? {
          speed: numOrNull(fc.wind_speed_10m),
          gusts: numOrNull(fc.wind_gusts_10m),
          direction: numOrNull(fc.wind_direction_10m),
          unit: windUnit,
        }
      : null,
  });
}

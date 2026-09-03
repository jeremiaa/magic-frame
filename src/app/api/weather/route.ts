import { NextResponse } from 'next/server';
import {
  fetchHomeAssistantWeather,
  fetchOpenMeteo,
  fetchOpenWeatherMap,
  fetchWeatherUnderground,
} from "@/lib/weather/providers";

const ALLOWED_TEMP = new Set(['celsius', 'fahrenheit']);
const ALLOWED_WIND = new Set(['kmh', 'mph', 'ms', 'kn']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const tempUnitRaw = searchParams.get('temperature_unit') ?? 'celsius';
  const windUnitRaw = searchParams.get('wind_speed_unit') ?? 'kmh';
  const provider = searchParams.get('provider') ?? 'open-meteo';
  const haEntity = searchParams.get('haEntity');

  const tempUnit = ALLOWED_TEMP.has(tempUnitRaw) ? (tempUnitRaw as "celsius" | "fahrenheit") : "celsius";
  const windUnit = ALLOWED_WIND.has(windUnitRaw) ? (windUnitRaw as "kmh" | "mph" | "ms" | "kn") : "kmh";

  try {
    if (provider === 'home-assistant' || provider === 'ha') {
      if (!haEntity) {
        return NextResponse.json({ error: "haEntity required for provider home-assistant" }, { status: 400 });
      }
      const data = await fetchHomeAssistantWeather(haEntity, { tempUnit, windUnit });
      return NextResponse.json(data);
    }

    if (provider === 'openweathermap' || provider === 'owm') {
      if (!lat || !lon) {
        return NextResponse.json({ error: 'Latitude and Longitude are required' }, { status: 400 });
      }
      const data = await fetchOpenWeatherMap(lat, lon, { tempUnit, windUnit });
      return NextResponse.json(data);
    }

    if (provider === 'wunderground' || provider === 'wu') {
      if (!lat || !lon) {
        return NextResponse.json({ error: 'Latitude and Longitude are required' }, { status: 400 });
      }
      const wuStation = searchParams.get('wuStation') || undefined;
      const data = await fetchWeatherUnderground(lat, lon, { tempUnit, windUnit }, wuStation);
      return NextResponse.json(data);
    }

    if (provider === 'dwd' || provider === 'dwd-icon') {
      if (!lat || !lon) {
        return NextResponse.json({ error: 'Latitude and Longitude are required' }, { status: 400 });
      }
      const data = await fetchOpenMeteo(lat, lon, { tempUnit, windUnit }, "dwd-icon");
      return NextResponse.json(data);
    }

    // default: open-meteo
    if (!lat || !lon) {
      return NextResponse.json({ error: 'Latitude and Longitude are required' }, { status: 400 });
    }
    const data = await fetchOpenMeteo(lat, lon, { tempUnit, windUnit });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Weather API] Error fetching:', error);
    return NextResponse.json({ error: error?.message ?? 'weather_failed' }, { status: 500 });
  }
}

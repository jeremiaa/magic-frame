import "server-only";
import { getAppSettings } from "@/lib/settings/store";

export type WeatherUnits = {
  tempUnit: "celsius" | "fahrenheit";
  windUnit: "kmh" | "mph" | "ms" | "kn";
};

export type NormalizedWeather = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    is_day?: number;
    uv_index?: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise?: string[];
    sunset?: string[];
    uv_index_max?: number[];
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability?: number[];
    is_day?: number[];
  };
  _provider?: string;
};

export async function fetchOpenMeteo(
  lat: string,
  lon: string,
  units: WeatherUnits,
  endpoint: "forecast" | "dwd-icon" = "forecast",
): Promise<NormalizedWeather> {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,is_day,uv_index",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    forecast_days: "7",
    timezone: "auto",
    temperature_unit: units.tempUnit,
    wind_speed_unit: units.windUnit,
  });

  // DWD-ICON-Modell liefert keinen UV-Index. Wir feuern parallel einen
  // schlanken Request gegen das Standard-Open-Meteo-Forecast-Modell nur für
  // UV (current + daily.uv_index_max) und mergen das später ins DWD-Result.
  // Schlägt der Fallback fehl → einfach kein UV (silent), Haupt-Fetch bleibt
  // funktional.
  const uvFallbackPromise =
    endpoint === "dwd-icon"
      ? fetchUvFromStandardOpenMeteo(lat, lon).catch(() => null)
      : null;

  const res = await fetch(`https://api.open-meteo.com/v1/${endpoint}?${params.toString()}`, {
    next: { revalidate: 60 * 15 },
  });
  if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
  const data = await res.json();

  if (uvFallbackPromise) {
    const uv = await uvFallbackPromise;
    if (uv) {
      if (data.current && (data.current.uv_index === undefined || data.current.uv_index === null)) {
        data.current.uv_index = uv.current;
      }
      if (data.daily && Array.isArray(uv.dailyMax) && uv.dailyMax.length > 0) {
        // DWD daily-Array könnte bereits da sein, aber `uv_index_max` fehlt
        data.daily.uv_index_max = uv.dailyMax;
      }
    }
  }

  return { ...data, _provider: endpoint === "dwd-icon" ? "dwd" : "open-meteo" };
}

async function fetchUvFromStandardOpenMeteo(
  lat: string,
  lon: string,
): Promise<{ current: number | undefined; dailyMax: number[] | undefined } | null> {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "uv_index",
    daily: "uv_index_max",
    forecast_days: "7",
    timezone: "auto",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    next: { revalidate: 60 * 15 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    current: typeof data.current?.uv_index === "number" ? data.current.uv_index : undefined,
    dailyMax: Array.isArray(data.daily?.uv_index_max) ? data.daily.uv_index_max : undefined,
  };
}

export async function fetchOpenWeatherMap(
  lat: string,
  lon: string,
  units: WeatherUnits,
): Promise<NormalizedWeather> {
  const { getOwmKey } = await import("./owm-credentials");
  const key = await getOwmKey();
  if (!key) throw new Error("owm_not_configured");

  // OWM: 'metric' (°C, m/s) oder 'imperial' (°F, mph). Wind-Umrechnung danach.
  const owmUnits = units.tempUnit === "fahrenheit" ? "imperial" : "metric";
  const url = new URL("https://api.openweathermap.org/data/3.0/onecall");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("units", owmUnits);
  url.searchParams.set("exclude", "minutely,alerts");
  url.searchParams.set("appid", key);

  const res = await fetch(url.toString(), { next: { revalidate: 60 * 15 } });
  if (!res.ok) throw new Error(`owm ${res.status}`);
  const data = await res.json();

  const convertWind = (n: number): number => {
    // OWM metric = m/s, imperial = mph.
    if (owmUnits === "metric") {
      if (units.windUnit === "kmh") return n * 3.6;
      if (units.windUnit === "ms") return n;
      if (units.windUnit === "kn") return n * 1.94384;
      return n * 3.6;
    }
    // imperial → mph
    if (units.windUnit === "mph") return n;
    if (units.windUnit === "kmh") return n * 1.60934;
    if (units.windUnit === "ms") return n * 0.44704;
    if (units.windUnit === "kn") return n * 0.868976;
    return n;
  };

  const currentCode = owmToWmo(data.current?.weather?.[0]?.id);
  const dailyArr = Array.isArray(data.daily) ? data.daily.slice(0, 6) : [];

  const toISODate = (sec: number) => new Date(sec * 1000).toISOString().slice(0, 10);
  const toISODateTime = (sec: number) => new Date(sec * 1000).toISOString();

  return {
    current: {
      temperature_2m: data.current?.temp ?? 0,
      apparent_temperature: data.current?.feels_like ?? data.current?.temp ?? 0,
      weather_code: currentCode,
      relative_humidity_2m: data.current?.humidity,
      wind_speed_10m:
        typeof data.current?.wind_speed === "number" ? convertWind(data.current.wind_speed) : undefined,
      is_day:
        data.current?.sunrise && data.current?.sunset && data.current?.dt
          ? data.current.dt >= data.current.sunrise && data.current.dt <= data.current.sunset
            ? 1
            : 0
          : undefined,
      uv_index: typeof data.current?.uvi === "number" ? data.current.uvi : undefined,
    },
    daily: {
      time: dailyArr.map((d: any) => toISODate(d.dt)),
      weather_code: dailyArr.map((d: any) => owmToWmo(d.weather?.[0]?.id)),
      temperature_2m_max: dailyArr.map((d: any) => d.temp?.max ?? 0),
      temperature_2m_min: dailyArr.map((d: any) => d.temp?.min ?? 0),
      sunrise: dailyArr.map((d: any) => (d.sunrise ? toISODateTime(d.sunrise) : "")),
      sunset: dailyArr.map((d: any) => (d.sunset ? toISODateTime(d.sunset) : "")),
      uv_index_max: dailyArr.map((d: any) => (typeof d.uvi === "number" ? d.uvi : 0)),
    },
    hourly: (() => {
      const hourlyArr = Array.isArray(data.hourly) ? data.hourly.slice(0, 48) : [];
      if (hourlyArr.length === 0) return undefined;
      return {
        time: hourlyArr.map((h: any) => toISODateTime(h.dt)),
        temperature_2m: hourlyArr.map((h: any) => h.temp ?? 0),
        weather_code: hourlyArr.map((h: any) => owmToWmo(h.weather?.[0]?.id)),
        precipitation_probability: hourlyArr.map((h: any) => Math.round((h.pop ?? 0) * 100)),
        is_day: hourlyArr.map((h: any) =>
          data.current?.sunrise && data.current?.sunset
            ? h.dt % 86400 >= (data.current.sunrise % 86400) && h.dt % 86400 <= (data.current.sunset % 86400)
              ? 1 : 0
            : 1,
        ),
      };
    })(),
    _provider: "openweathermap",
  };
}

// Pirate Weather (Dark Sky drop-in) icon strings → WMO codes
function pirateIconToWmo(icon?: string | null): number {
  if (!icon) return 0;
  switch (icon) {
    case "clear-day":
    case "clear-night":
      return 0;
    case "mostly-clear-day":
    case "mostly-clear-night":
      return 1;
    case "partly-cloudy-day":
    case "partly-cloudy-night":
      return 2;
    case "mostly-cloudy-day":
    case "mostly-cloudy-night":
    case "cloudy":
      return 3;
    case "fog":
    case "mist":
    case "haze":
      return 45;
    case "smoke":
      return 45;
    case "drizzle":
    case "light-rain":
    case "possible-rain-day":
    case "possible-rain-night":
      return 51;
    case "rain":
      return 63;
    case "heavy-rain":
      return 65;
    case "sleet":
    case "light-sleet":
    case "very-light-sleet":
    case "possible-sleet-day":
    case "possible-sleet-night":
      return 66;
    case "heavy-sleet":
      return 67;
    case "flurries":
    case "light-snow":
    case "possible-snow-day":
    case "possible-snow-night":
      return 71;
    case "snow":
      return 73;
    case "heavy-snow":
      return 75;
    case "wind":
    case "breezy":
    case "dangerous-wind":
      return 0;
    case "thunderstorm":
    case "possible-thunderstorm-day":
    case "possible-thunderstorm-night":
      return 95;
    case "precipitation":
    case "possible-precipitation-day":
    case "possible-precipitation-night":
    case "mixed":
      return 61;
    default:
      return 0;
  }
}

export async function fetchPirateWeather(
  lat: string,
  lon: string,
  units: WeatherUnits,
): Promise<NormalizedWeather> {
  const { getPirateWeatherKey } = await import("./pirateweather-credentials");
  const key = await getPirateWeatherKey();
  if (!key) throw new Error("pirateweather_not_configured");

  const pwUnits = units.tempUnit === "fahrenheit" ? "us" : "ca";

  const convertWind = (n: number | null | undefined): number | undefined => {
    if (n == null) return undefined;
    if (pwUnits === "ca") {
      // ca = km/h
      if (units.windUnit === "kmh") return n;
      if (units.windUnit === "mph") return n * 0.621371;
      if (units.windUnit === "ms") return n / 3.6;
      if (units.windUnit === "kn") return n * 0.539957;
      return n;
    }
    // us = mph
    if (units.windUnit === "mph") return n;
    if (units.windUnit === "kmh") return n * 1.60934;
    if (units.windUnit === "ms") return n * 0.44704;
    if (units.windUnit === "kn") return n * 0.868976;
    return n;
  };

  const url = `https://api.pirateweather.net/forecast/${key}/${lat},${lon}?units=${pwUnits}&exclude=minutely,alerts`;
  const res = await fetch(url, { next: { revalidate: 60 * 15 } });
  if (!res.ok) throw new Error(`pirateweather ${res.status}`);
  const data = await res.json();

  const cur = data.currently ?? {};
  const daily = data.daily?.data ?? [];
  const hourly = data.hourly?.data ?? [];

  const toISO = (ts?: number) => (ts ? new Date(ts * 1000).toISOString() : "");
  const toDateStr = (ts?: number) => (ts ? new Date(ts * 1000).toISOString().slice(0, 10) : "");

  const isDay = (() => {
    if (!daily[0]?.sunriseTime || !daily[0]?.sunsetTime) return undefined;
    const now = cur.time ?? Math.floor(Date.now() / 1000);
    return now >= daily[0].sunriseTime && now < daily[0].sunsetTime ? 1 : 0;
  })();

  return {
    current: {
      temperature_2m: cur.temperature ?? 0,
      apparent_temperature: cur.apparentTemperature ?? cur.temperature ?? 0,
      weather_code: pirateIconToWmo(cur.icon),
      relative_humidity_2m: typeof cur.humidity === "number" ? Math.round(cur.humidity * 100) : undefined,
      wind_speed_10m: convertWind(cur.windSpeed),
      is_day: isDay,
      uv_index: typeof cur.uvIndex === "number" ? cur.uvIndex : undefined,
    },
    daily: {
      time: daily.slice(0, 6).map((d: any) => toDateStr(d.time)),
      weather_code: daily.slice(0, 6).map((d: any) => pirateIconToWmo(d.icon)),
      temperature_2m_max: daily.slice(0, 6).map((d: any) => d.temperatureHigh ?? 0),
      temperature_2m_min: daily.slice(0, 6).map((d: any) => d.temperatureLow ?? 0),
      sunrise: daily.slice(0, 6).map((d: any) => toISO(d.sunriseTime)),
      sunset: daily.slice(0, 6).map((d: any) => toISO(d.sunsetTime)),
      uv_index_max: daily.slice(0, 6).map((d: any) => d.uvIndex ?? 0),
    },
    hourly: hourly.length > 0
      ? {
          time: hourly.map((h: any) => toISO(h.time)),
          temperature_2m: hourly.map((h: any) => h.temperature ?? 0),
          weather_code: hourly.map((h: any) => pirateIconToWmo(h.icon)),
          is_day: hourly.map((h: any) => {
            const dayForHour = daily.find(
              (d: any) => h.time >= d.sunriseTime && h.time < (d.sunsetTime ?? Infinity),
            );
            return dayForHour ? 1 : 0;
          }),
          precipitation_probability: hourly.map((h: any) =>
            typeof h.precipProbability === "number" ? Math.round(h.precipProbability * 100) : 0,
          ),
        }
      : undefined,
    _provider: "pirateweather",
  };
}

export async function fetchHomeAssistantWeather(
  entityId: string,
  _units: WeatherUnits,
): Promise<NormalizedWeather> {
  const settings = await getAppSettings();
  if (!settings.haUrl || !settings.haToken) throw new Error("ha_not_configured");

  const base = settings.haUrl.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${settings.haToken}`,
    "Content-Type": "application/json",
  };

  // 1. Aktueller Zustand inkl. attributes
  const stateRes = await fetch(`${base}/api/states/${encodeURIComponent(entityId)}`, {
    headers,
    cache: "no-store",
  });
  if (!stateRes.ok) throw new Error(`ha ${stateRes.status}`);
  const entity = await stateRes.json();

  const attr = entity?.attributes ?? {};
  const condition: string = entity?.state ?? attr.condition ?? "unknown";
  const currentCode = haConditionToWmo(condition);

  // 2. Forecast. Zuerst den modernen Service-Call (HA 2024.3+), der
  //    attributes.forecast ersetzt hat. Fallback: altes attributes.forecast.
  let dailyForecast: any[] = [];
  try {
    const fcRes = await fetch(
      `${base}/api/services/weather/get_forecasts?return_response`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ entity_id: entityId, type: "daily" }),
        cache: "no-store",
      },
    );
    if (fcRes.ok) {
      const payload = await fcRes.json();
      // payload: { changed_states: [...], service_response: { [entityId]: { forecast: [...] } } }
      const sr = payload?.service_response ?? payload?.[0]?.service_response ?? {};
      const entry = sr?.[entityId];
      const arr = Array.isArray(entry?.forecast) ? entry.forecast : [];
      dailyForecast = arr.slice(0, 6);
    }
  } catch {
    // ignore, fällt auf attributes.forecast zurück
  }
  if (dailyForecast.length === 0 && Array.isArray(attr.forecast)) {
    dailyForecast = attr.forecast.slice(0, 6);
  }

  // Stündliche Vorhersage (optional — nicht jede HA-Weather-Integration bietet das)
  let hourlyForecast: any[] = [];
  try {
    const hfRes = await fetch(
      `${base}/api/services/weather/get_forecasts?return_response`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ entity_id: entityId, type: "hourly" }),
        cache: "no-store",
      },
    );
    if (hfRes.ok) {
      const payload = await hfRes.json();
      const sr = payload?.service_response ?? {};
      const entry = sr?.[entityId];
      const arr = Array.isArray(entry?.forecast) ? entry.forecast : [];
      hourlyForecast = arr.slice(0, 24);
    }
  } catch {}

  // Nacht-Erkennung:
  //  1) Condition-String (clear-night) als stärkstes Signal
  //  2) sun.sun-Entity abfragen (steht in fast jedem HA; state = above_horizon / below_horizon)
  //  3) Wenn beides nicht verfügbar → is_day weglassen, Widget fällt auf
  //     Browser-Time-Check zurück (Server läuft in UTC, darum NICHT hier raten).
  const isNightByCondition = condition === "clear-night" || condition.includes("night");
  let is_day: number | undefined = undefined;
  if (isNightByCondition) {
    is_day = 0;
  } else {
    try {
      const sunRes = await fetch(`${base}/api/states/sun.sun`, { headers, cache: "no-store" });
      if (sunRes.ok) {
        const sun = await sunRes.json();
        if (sun?.state === "above_horizon") is_day = 1;
        else if (sun?.state === "below_horizon") is_day = 0;
      }
    } catch {}
  }

  return {
    current: {
      temperature_2m: typeof attr.temperature === "number" ? attr.temperature : 0,
      apparent_temperature:
        typeof attr.apparent_temperature === "number" ? attr.apparent_temperature : (attr.temperature ?? 0),
      weather_code: currentCode,
      relative_humidity_2m: attr.humidity,
      wind_speed_10m: attr.wind_speed,
      is_day,
      uv_index: typeof attr.uv_index === "number" ? attr.uv_index : undefined,
    },
    daily: {
      time: dailyForecast.map((d: any) => String(d.datetime ?? "").slice(0, 10)),
      weather_code: dailyForecast.map((d: any) => haConditionToWmo(d.condition ?? "")),
      temperature_2m_max: dailyForecast.map((d: any) => d.temperature ?? 0),
      temperature_2m_min: dailyForecast.map((d: any) => d.templow ?? d.temperature ?? 0),
      sunrise: [],
      sunset: [],
    },
    hourly: hourlyForecast.length > 0 ? {
      time: hourlyForecast.map((h: any) => String(h.datetime ?? "")),
      temperature_2m: hourlyForecast.map((h: any) => h.temperature ?? 0),
      weather_code: hourlyForecast.map((h: any) => haConditionToWmo(h.condition ?? "")),
      precipitation_probability: hourlyForecast.map((h: any) =>
        typeof h.precipitation_probability === "number" ? h.precipitation_probability : 0,
      ),
    } : undefined,
    _provider: "home-assistant",
  };
}

// OWM-Condition-IDs → WMO-Codes (grobe Abbildung, Icon-Parität mit Open-Meteo)
function owmToWmo(id?: number): number {
  if (!id) return 0;
  if (id >= 200 && id < 300) return 95; // Thunderstorm
  if (id >= 300 && id < 400) return 51; // Drizzle
  if (id >= 500 && id < 600) {
    if (id >= 502) return 65; // heavy rain
    return 63; // rain
  }
  if (id >= 600 && id < 700) return 73; // snow
  if (id >= 700 && id < 800) return 45; // atmosphere (fog, haze)
  if (id === 800) return 0; // clear
  if (id === 801) return 1; // few clouds
  if (id === 802) return 2; // scattered clouds
  if (id === 803 || id === 804) return 3; // broken / overcast
  return 0;
}

// HA-weather.* conditions → WMO-Codes
function haConditionToWmo(c: string): number {
  switch (c) {
    case "sunny":
    case "clear":
    case "clear-night":
      return 0;
    case "partlycloudy":
      return 2;
    case "cloudy":
      return 3;
    case "rainy":
      return 61;
    case "pouring":
      return 65;
    case "snowy":
      return 73;
    case "snowy-rainy":
      return 67;
    case "fog":
      return 45;
    case "lightning":
    case "lightning-rainy":
      return 95;
    case "hail":
      return 77;
    case "windy":
    case "windy-variant":
      return 0;
    case "exceptional":
    default:
      return 3;
  }
}

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

// TWC/Weather Underground icon codes (0-47) → WMO-Codes
function twcIconToWmo(icon?: number | null): number {
  if (icon == null) return 0;
  if (icon <= 4) return 95;   // tornado, tropical storm, hurricane, thunderstorms
  if (icon <= 6) return 67;   // rain/snow, rain/sleet
  if (icon === 7) return 77;  // snow/sleet
  if (icon === 8) return 56;  // freezing drizzle
  if (icon === 9) return 51;  // drizzle
  if (icon === 10) return 66; // freezing rain
  if (icon === 11) return 61; // showers
  if (icon === 12) return 63; // rain
  if (icon <= 14) return 71;  // flurries, snow showers
  if (icon === 15) return 77; // blowing snow
  if (icon === 16) return 73; // snow
  if (icon === 17) return 77; // hail
  if (icon === 18) return 67; // sleet
  if (icon <= 22) return 45;  // dust, fog, haze, smoke
  if (icon <= 25) return 0;   // breezy, windy, frigid
  if (icon <= 28) return 3;   // cloudy, mostly cloudy (day/night)
  if (icon <= 30) return 2;   // partly cloudy (night/day)
  if (icon <= 32) return 0;   // clear night, sunny
  if (icon <= 34) return 1;   // fair (night/day)
  if (icon === 35) return 65; // mixed rain/hail
  if (icon === 36) return 0;  // hot
  if (icon <= 39) return 95;  // isolated/scattered thunderstorms, scattered showers → 95 for thunder
  if (icon === 39 || icon === 45) return 61; // scattered showers
  if (icon === 40) return 65; // heavy rain
  if (icon === 41 || icon === 46) return 71; // scattered snow showers
  if (icon === 42) return 75; // heavy snow
  if (icon === 43) return 75; // blizzard
  if (icon === 47) return 95; // scattered thunderstorms
  return 0;
}

export async function fetchWeatherUnderground(
  lat: string,
  lon: string,
  units: WeatherUnits,
  stationId?: string,
): Promise<NormalizedWeather> {
  const { getWuKey } = await import("./wunderground-credentials");
  const key = await getWuKey();
  if (!key) throw new Error("wunderground_not_configured");

  const wuUnits = units.tempUnit === "fahrenheit" ? "e" : "m";

  const convertWind = (n: number | null | undefined): number | undefined => {
    if (n == null) return undefined;
    if (wuUnits === "m") {
      // WU metric wind = km/h
      if (units.windUnit === "kmh") return n;
      if (units.windUnit === "mph") return n * 0.621371;
      if (units.windUnit === "ms") return n / 3.6;
      if (units.windUnit === "kn") return n * 0.539957;
      return n;
    }
    // imperial wind = mph
    if (units.windUnit === "mph") return n;
    if (units.windUnit === "kmh") return n * 1.60934;
    if (units.windUnit === "ms") return n * 0.44704;
    if (units.windUnit === "kn") return n * 0.868976;
    return n;
  };

  // Parallel fetches: TWC current (for conditions) + TWC forecast + optionally PWS
  const geocode = `${lat},${lon}`;
  const twcCurrentUrl = `https://api.weather.com/v3/wx/observations/current?geocode=${geocode}&format=json&units=${wuUnits}&language=en-US&apiKey=${key}`;
  const twcForecastUrl = `https://api.weather.com/v3/wx/forecast/daily/5day?geocode=${geocode}&format=json&units=${wuUnits}&language=en-US&apiKey=${key}`;

  const fetches: Promise<any>[] = [
    fetch(twcCurrentUrl, { next: { revalidate: 60 * 15 } }).then((r) => {
      if (!r.ok) throw new Error(`wunderground current ${r.status}`);
      return r.json();
    }),
    fetch(twcForecastUrl, { next: { revalidate: 60 * 15 } }).then((r) => {
      if (!r.ok) throw new Error(`wunderground forecast ${r.status}`);
      return r.json();
    }),
  ];

  // PWS fetch (optional — supplements with hyper-local sensor data)
  if (stationId) {
    const pwsUrl = `https://api.weather.com/v2/pws/observations/current?stationId=${encodeURIComponent(stationId)}&format=json&units=${wuUnits}&apiKey=${key}`;
    fetches.push(
      fetch(pwsUrl, { next: { revalidate: 60 * 10 } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    );
  }

  const [twcCurrent, twcForecast, pwsData] = await Promise.all(fetches);

  // PWS sensor readings (if available)
  const pws = pwsData?.observations?.[0];
  const pwsMetrics = pws?.[wuUnits === "m" ? "metric" : "imperial"];

  // Current conditions — merge PWS sensor readings with TWC condition data
  const temp = pwsMetrics?.temp ?? twcCurrent?.temperature ?? 0;
  const feelsLike =
    pwsMetrics?.windChill ?? pwsMetrics?.heatIndex ?? twcCurrent?.temperatureFeelsLike ?? temp;
  const humidity = pws?.humidity ?? twcCurrent?.relativeHumidity;
  const windSpeed = convertWind(pwsMetrics?.windSpeed ?? twcCurrent?.windSpeed);
  const uvIndex = typeof pws?.uv === "number" ? pws.uv : twcCurrent?.uvIndex;

  const isDay =
    twcCurrent?.dayOrNight === "D" ? 1 : twcCurrent?.dayOrNight === "N" ? 0 : undefined;

  // Forecast — TWC 5-day format uses parallel arrays
  const fc = twcForecast ?? {};
  const dayCount = Math.min(Array.isArray(fc.temperatureMax) ? fc.temperatureMax.length : 0, 6);
  const daypart = fc.daypart?.[0];

  const toISODate = (s: string | undefined) => (s ? String(s).slice(0, 10) : "");

  const dailyWeatherCodes: number[] = [];
  const dailyUvMax: number[] = [];
  for (let i = 0; i < dayCount; i++) {
    // daypart alternates day(2i) / night(2i+1). Use daytime if available, else night.
    const dpDay = daypart?.iconCode?.[i * 2];
    const dpNight = daypart?.iconCode?.[i * 2 + 1];
    dailyWeatherCodes.push(twcIconToWmo(dpDay ?? dpNight));
    const uvDay = daypart?.uvIndex?.[i * 2];
    dailyUvMax.push(typeof uvDay === "number" ? uvDay : 0);
  }

  return {
    current: {
      temperature_2m: temp,
      apparent_temperature: feelsLike,
      weather_code: twcIconToWmo(twcCurrent?.iconCode),
      relative_humidity_2m: humidity,
      wind_speed_10m: windSpeed,
      is_day: isDay,
      uv_index: typeof uvIndex === "number" ? uvIndex : undefined,
    },
    daily: {
      time: Array.from({ length: dayCount }, (_, i) => toISODate(fc.validTimeLocal?.[i])),
      weather_code: dailyWeatherCodes,
      temperature_2m_max: Array.from({ length: dayCount }, (_, i) => fc.temperatureMax?.[i] ?? 0),
      temperature_2m_min: Array.from({ length: dayCount }, (_, i) => fc.temperatureMin?.[i] ?? 0),
      sunrise: Array.from({ length: dayCount }, (_, i) => fc.sunriseTimeLocal?.[i] ?? ""),
      sunset: Array.from({ length: dayCount }, (_, i) => fc.sunsetTimeLocal?.[i] ?? ""),
      uv_index_max: dailyUvMax,
    },
    _provider: "wunderground",
  };
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

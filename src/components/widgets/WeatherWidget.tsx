"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Droplets, Wind, Sunrise, Sunset, Sun } from "lucide-react";
import { wmoToIcon, uvToMeteoconName, windToBeaufortMeteoconName, moonPhaseFraction } from "@/lib/weather/wmo";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const clampN = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Wetter-Stimmung → weiche Farbfelder für den atmosphärischen Hintergrund.
// Gruppiert nach WMO-Code; nachts eigene, tiefere Paletten. [c1,c2,c3] bilden
// den Verlauf, glow ist ein Akzent-Leuchten (Sonne/Mond).
function weatherMood(code: number, isNight: boolean): { c1: string; c2: string; c3: string; glow: string } {
  const g = (n: number) =>
    n === 0 ? 0 : n <= 3 ? 1 : n <= 48 ? 2 : n <= 57 ? 3 : n <= 67 ? 4 : n <= 77 ? 5 : n <= 82 ? 4 : n <= 86 ? 5 : 6;
  const grp = g(code); // 0 klar · 1 wolkig · 2 nebel · 3 niesel · 4 regen · 5 schnee · 6 gewitter
  if (isNight) {
    const N = [
      { c1: "#12203f", c2: "#213456", c3: "#3b4f80", glow: "#8ea6d8" }, // klar
      { c1: "#1a2334", c2: "#2b3548", c3: "#404b63", glow: "#6b7690" }, // wolkig
      { c1: "#20242e", c2: "#333844", c3: "#474d5b", glow: "#7c8394" }, // nebel
      { c1: "#152438", c2: "#26384f", c3: "#374d66", glow: "#5f7fa0" }, // niesel
      { c1: "#101d30", c2: "#213247", c3: "#31465f", glow: "#4f7099" }, // regen
      { c1: "#23344c", c2: "#3a5170", c3: "#546e91", glow: "#a9c4e6" }, // schnee
      { c1: "#171526", c2: "#2c2340", c3: "#463063", glow: "#8b6bd0" }, // gewitter
    ];
    return N[grp];
  }
  const D = [
    { c1: "#3a7bc8", c2: "#6aa9e6", c3: "#a9d3f5", glow: "#ffd98a" }, // klar
    { c1: "#5c82ab", c2: "#8aa8c6", c3: "#bcd0e2", glow: "#f2e2c0" }, // wolkig
    { c1: "#8a95a3", c2: "#aeb7c3", c3: "#ccd3dc", glow: "#e6e2d6" }, // nebel
    { c1: "#3f5f82", c2: "#5f809f", c3: "#8aa6bf", glow: "#b9cfe0" }, // niesel
    { c1: "#33506f", c2: "#4d7092", c3: "#7597b5", glow: "#9fc0da" }, // regen
    { c1: "#7ba6cf", c2: "#aecbe6", c3: "#dcebf7", glow: "#ffffff" }, // schnee
    { c1: "#2b2f45", c2: "#474a69", c3: "#6a5b8a", glow: "#c9a9ff" }, // gewitter
  ];
  return D[grp];
}

function weatherBgCss(code: number, isNight: boolean): string {
  const { c1, c2, c3, glow } = weatherMood(code, isNight);
  // Akzent-Leuchten oben rechts + weicher Diagonal-Verlauf.
  return [
    `radial-gradient(60% 55% at 78% 20%, ${glow}88, transparent 60%)`,
    `radial-gradient(90% 80% at 15% 90%, ${c3}55, transparent 65%)`,
    `linear-gradient(158deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`,
  ].join(", ");
}

type StatIconKey = "droplets" | "wind" | "sunrise" | "sunset" | "uv";

// Stage 2: welchen Meteocons-Namen ein Stat-Icon bekommt. UV und Wind sind
// wertabhängig (uv-index-N farbcodiert, wind-beaufort-N nach Windstärke).
function statMeteoconName(k: StatIconKey, value?: number, windUnit?: string): string | null {
  if (k === "droplets") return "humidity";
  if (k === "sunrise") return "sunrise";
  if (k === "sunset") return "sunset";
  if (k === "uv") return typeof value === "number" ? uvToMeteoconName(value) : "uv-index";
  if (k === "wind") return typeof value === "number" ? windToBeaufortMeteoconName(value, windUnit) : "wind";
  return null;
}

function StatIcon({ k, sizeEm = 1, iconSet, meteoStyle, value, windUnit }: {
  k: StatIconKey; iconSet?: string; sizeEm?: number;
  meteoStyle?: "fill" | "line"; value?: number; windUnit?: string;
}) {
  const style: CSSProperties = { width: `${sizeEm}em`, height: `${sizeEm}em` };
  const cls = "opacity-80";
  // Meteocons (Opt-in via meteoconsStats): eigene, statische Stat-Icons.
  // Sonst immer Lucide-Line-Icons, unabhängig vom Wetter-iconSet — das ist
  // die Grundregel für konsistente Info-Zeilen.
  if (iconSet === "meteocons") {
    const name = statMeteoconName(k, value, windUnit);
    if (name) {
      const s = meteoStyle === "line" ? "line" : "fill";
      return <img src={`/weather/meteocons/${s}/static/${name}.svg`} style={{ ...style, width: `${sizeEm * 1.25}em`, height: `${sizeEm * 1.25}em` }} className="object-contain shrink-0 -my-[0.15em]" alt="" />;
    }
  }
  if (k === "droplets") return <Droplets style={style} strokeWidth={2} className={cls} />;
  if (k === "wind") return <Wind style={style} strokeWidth={2} className={cls} />;
  if (k === "sunrise") return <Sunrise style={style} strokeWidth={2} />;
  if (k === "sunset") return <Sunset style={style} strokeWidth={2} />;
  if (k === "uv") return <Sun style={style} strokeWidth={2} className={cls} />;
  return null;
}

export default function WeatherWidget({ config, location, lat, lon }: { config?: any, location?: string, lat?: string, lon?: string }) {
  const { locale, t } = useLocale();
  // en-US → 12-hour clock with AM/PM (sunrise/sunset), US weekday format
  // ("Tue"). de-DE → 24-hour, German weekday ("Di."). Matches what
  // ClockWidget does so the whole dashboard reads consistently.
  const dateLocale = locale === "en" ? "en-US" : "de-DE";
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Minuten-Tick: erzwingt ein Re-Render, damit sich Tag/Nacht auch ohne
  // frischen Fetch zum Sonnenaufgang selbst umstellt (Mond-Bug).
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  // Atmosphärischer Wetter-Hintergrund (opt-in, Default AUS): weiche, unscharfe
  // Farbfelder, die die aktuelle Wetterlage darstellen — wie der Artwork-Blur
  // beim Media-Widget, nur aus dem Wetter erzeugt statt aus einem Cover.
  const weatherBgOn = config?.weatherBg === true;
  const weatherBgOpacity = clampN(config?.weatherBgOpacity ?? 90, 0, 100);
  const weatherBgBlur = clampN(config?.weatherBgBlur ?? 28, 0, 60);

  const unitTemp: "celsius" | "fahrenheit" = config?.unitTemp === "fahrenheit" ? "fahrenheit" : "celsius";
  const unitWind: "kmh" | "mph" | "ms" | "kn" =
    config?.unitWind === "mph" || config?.unitWind === "ms" || config?.unitWind === "kn"
      ? config.unitWind
      : "kmh";

  const provider: string = config?.provider || "open-meteo";
  const haEntity: string = config?.haEntity || "";
  const wuStation: string = config?.wuStation || "";
  const needsLatLon = provider !== "home-assistant";

  useEffect(() => {
    if (needsLatLon && (!lat || !lon)) return;
    if (provider === "home-assistant" && !haEntity) return;

    const controller = new AbortController();
    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const qs = new URLSearchParams({
          temperature_unit: unitTemp,
          wind_speed_unit: unitWind,
          provider,
        });
        if (lat) qs.set("lat", String(lat));
        if (lon) qs.set("lon", String(lon));
        if (haEntity) qs.set("haEntity", haEntity);
        if (wuStation) qs.set("wuStation", wuStation);
        const res = await fetch(`/api/weather?${qs.toString()}`, { signal: controller.signal });
        const result = await res.json();
        if (cancelled) return;
        if (result.error) {
          setError(result.error);
          return;
        }
        setData(result);
        setError(null);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        if (!cancelled) setError(t("Wetterdaten nicht verfügbar"));
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    // Kiosk-Fix (Mond bleibt morgens stehen): wacht der Monitor auf, war der
    // Interval-Timer im Standby pausiert — sofort neu laden statt bis zum
    // nächsten 15-Min-Tick auf dem Nacht-Stand zu hängen.
    const onWake = () => { if (document.visibilityState === "visible") fetchWeather(); };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [lat, lon, unitTemp, unitWind, provider, haEntity, wuStation, needsLatLon]);

  if (needsLatLon && (!lat || !lon)) {
     return <div className="text-white/50 text-sm text-center">{t("Wetter")}<br/>({t("Lat/Lon in Config eintragen")})</div>;
  }
  if (provider === "home-assistant" && !haEntity) {
     return <div className="text-white/50 text-sm text-center">{t("Wetter")}<br/>({t("HA-Entity in Config eintragen, z.B. weather.home")})</div>;
  }

  if (error) return <div className="text-red-400/80 text-sm text-center">⚠ {t(error)}</div>;
  if (!data) return <div className="text-white/50 text-sm">{t("Lade Wetter…")}</div>;

  const tempSuffix = unitTemp === "fahrenheit" ? "°F" : "°";
  const windUnitLabel = unitWind === "mph" ? "mph" : unitWind === "ms" ? "m/s" : unitWind === "kn" ? "kn" : "km/h";
  const currentTemp = Math.round(data.current.temperature_2m);
  const feelsLike = Math.round(data.current.apparent_temperature);
  const currentCode = data.current.weather_code;
  const humidity = data.current.relative_humidity_2m;
  const windSpeed = data.current.wind_speed_10m;
  
  // Tag/Nacht aus Sonnenauf-/untergangs-UHRZEIT gegen die aktuelle Zeit
  // (Minuten des Tages, nowTick) — korrigiert sich zum Sonnenaufgang selbst,
  // auch ohne frischen Fetch. Uhrzeit-Vergleich (nicht Timestamp), damit ein
  // veralteter Datensatz nicht "dauerhaft Nacht" produziert. Fallback:
  // is_day aus den Daten, dann grobe Uhrzeit.
  const minOfDay = (iso: string) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); };
  const nowD = new Date(nowTick);
  const nowMinOfDay = nowD.getHours() * 60 + nowD.getMinutes();
  const srIso0 = data.daily?.sunrise?.[0];
  const ssIso0 = data.daily?.sunset?.[0];
  const isNight = (srIso0 && ssIso0)
    ? (nowMinOfDay < minOfDay(srIso0) || nowMinOfDay >= minOfDay(ssIso0))
    : (typeof data.current.is_day === "number"
        ? data.current.is_day === 0
        : (nowD.getHours() < 6 || nowD.getHours() > 20));

  const sunrise = data.daily?.sunrise?.[0];
  const sunset = data.daily?.sunset?.[0];
  const formatHm = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  };

  // Forecast: Tage ab morgen (idx 0 = heute, wird bereits als current oben angezeigt).
  const forecastDays = Math.max(1, Math.min(6, config?.forecastDays ?? 4));
  const forecastRaw = data.daily.time.slice(1, 1 + forecastDays);
  const forecast = forecastRaw
    .map((dateStr: string, idx: number) => {
      const realIdx = idx + 1;
      if (data.daily.weather_code[realIdx] === undefined) return null;
      const dayName = new Date(dateStr).toLocaleDateString(dateLocale, { weekday: 'short' });
      return {
        day: dayName,
        code: data.daily.weather_code[realIdx],
        max: Math.round(data.daily.temperature_2m_max[realIdx]),
        min: Math.round(data.daily.temperature_2m_min[realIdx]),
      };
    })
    .filter(Boolean);

  const isVertical = config?.forecastLayout === 'vertical';
  const flexDirectionClass = isVertical ? 'flex-col gap-[1.5em]' : 'gap-[2em] md:gap-[3em]';
  const subtextSizeEm = 1.2 * (config?.subtextSize ? config.subtextSize / 100 : 1);
  // Stats-Zeile (Luftfeuchte/Wind/UV) wird in Pixel angegeben, nicht in em.
  // Grund: em skaliert mit der Widget-Schriftgröße — wenn das Widget groß
  // war, wurden bei 200% die Stats fast so groß wie die Hauptanzeige.
  // Mit px bleibt die Stats-Größe absolut und unabhängig vom Widget.
  const statsSizePx = typeof config?.statsSize === 'number' ? config.statsSize : 14;
  const subtextOpacity = (config?.subtextOpacity ?? 80) / 100;
  const subtextUppercase = config?.subtextUppercase === true;
  const subtextTracking = config?.subtextTracking ?? "wide";
  const subtextTrackingClass =
    subtextTracking === "normal" ? "" : subtextTracking === "widest" ? "tracking-widest" : "tracking-wide";

  // Ort-Label-Styling
  const locationSizeEm = 0.8 * ((config?.locationSize ?? 100) / 100);
  const locationOpacity = (config?.locationOpacity ?? 60) / 100;
  const locationUppercase = config?.locationUppercase !== false;
  const locationTracking = config?.locationTracking ?? "widest";
  const trackingClass =
    locationTracking === "normal" ? "" : locationTracking === "wide" ? "tracking-wide" : "tracking-widest";

  const uv = typeof data.current?.uv_index === "number" ? data.current.uv_index : undefined;
  const iconSet = config?.iconSet;
  // Stat-Icons (UV/Wind/Feuchte/Sonnenzeiten) bleiben standardmäßig Lucide —
  // das ist die dokumentierte Grundregel. Die wertbasierten Meteocons-Varianten
  // (uv-index-N, wind-beaufort-N) sind reines Opt-in über meteoconsStats.
  const statIconSet = iconSet === "meteocons" && config?.meteoconsStats === true ? "meteocons" : "lucide";
  // Größe der Vorschau-/Stunden-Icons, einstellbar in % (Default 100 = wie
  // bisher: 1.4em Vorschau, 1.2em Stunden-Strip).
  const fcIconScale = (config?.forecastIconSize ?? 100) / 100;
  // Größe des Haupticons (aktuelles Wetter), Default 100 = 2.2em wie bisher.
  const curIconScale = (config?.currentIconSize ?? 100) / 100;

  // Hourly-Strip
  const showHourly = !!config?.showHourly;
  const hourlyHours = Math.max(4, Math.min(24, config?.hourlyHours ?? 12));
  const hourlyData = (() => {
    const h = data.hourly;
    if (!showHourly || !h || !Array.isArray(h.time)) return null;
    const now = Date.now();
    // erste zukunfts-Stunde finden
    let startIdx = h.time.findIndex((t: string) => new Date(t).getTime() >= now - 60 * 60 * 1000);
    if (startIdx < 0) startIdx = 0;
    const slice = h.time.slice(startIdx, startIdx + hourlyHours);
    if (slice.length === 0) return null;
    return slice.map((iso: string, i: number) => {
      const idx = startIdx + i;
      const d = new Date(iso);
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      const isNow = i === 0;
      return {
        label: isNow ? t("Jetzt") : `${hh}:${mm}`,
        temp: Math.round(h.temperature_2m[idx] ?? 0),
        code: h.weather_code[idx] ?? 0,
        pop: typeof h.precipitation_probability?.[idx] === "number" ? h.precipitation_probability[idx] : 0,
        isDay: typeof h.is_day?.[idx] === "number" ? h.is_day[idx] === 1 : true,
      };
    });
  })();

  return (
    <div className={`relative flex flex-col w-full h-full overflow-hidden ${weatherBgOn ? "p-[0.8em]" : ""}`}
         style={weatherBgOn ? { borderRadius: "var(--mf-inner-radius, 1.4em)" } : undefined}>
      {weatherBgOn && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true" style={{ opacity: weatherBgOpacity / 100, borderRadius: "var(--mf-inner-radius, 1.4em)" }}>
          {/* skaliert + geblurrt = weiche, unscharfe Wetterstimmung */}
          <div className="absolute inset-0" style={{ background: weatherBgCss(currentCode, isNight), filter: `blur(${weatherBgBlur}px)`, transform: "scale(1.25)" }} />
          {/* leichte Abdunkelung für Text-Lesbarkeit */}
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.18)" }} />
        </div>
      )}
      <div className={`relative z-[1] flex items-center justify-center flex-1 overflow-hidden ${flexDirectionClass}`}>
      {/* Current Weather */}
      {/* Kein overflow-hidden hier: das würde das per transform vergrößerte
          Haupticon abschneiden. Location/Subtext kürzen sich über ihr eigenes
          text-ellipsis; der äußere Content-Container clippt am Widget-Rand. */}
      <div className="flex flex-col min-w-0 shrink-0">
        {location && (
           <span
              style={{ fontSize: `${locationSizeEm}em`, opacity: locationOpacity }}
              className={`mb-[0.2em] ${locationUppercase ? "uppercase" : ""} ${trackingClass} text-ellipsis whitespace-nowrap overflow-hidden block`}
           >
              {location}
           </span>
        )}
        <div className="flex items-center gap-[0.5em]">
          <span style={{ fontSize: '4.2em' }} className="tracking-tighter leading-none">{currentTemp}{tempSuffix}</span>
          {/* Größe per transform statt Box-Maße → das Icon skaliert in den
              vorhandenen Freiraum (Zeilenhöhe kommt von der 4.2em-Temperatur),
              ohne das Widget zu vergrößern. Origin links = wächst nach rechts,
              überlappt die Temperatur nicht. */}
          <div style={{ width: '2.2em', height: '2.2em', transform: `scale(${curIconScale})`, transformOrigin: 'left center' }} className="shrink-0">
             {wmoToIcon(currentCode, !isNight, config?.iconSet, { style: config?.meteoconsStyle, animated: config?.meteoconsAnimated, moonPhase: (config?.meteoconsMoonPhase ?? true) ? moonPhaseFraction(new Date(nowTick)) : undefined })}
          </div>
        </div>
        <div
           style={{ fontSize: `${subtextSizeEm}em`, opacity: subtextOpacity }}
           className={`mt-[0.5em] ${subtextUppercase ? "uppercase" : ""} ${subtextTrackingClass} text-ellipsis whitespace-nowrap overflow-hidden`}
        >
          {t("Fühlt sich an wie")} {feelsLike}{tempSuffix}
        </div>
        {/* Stats-Zeile separat — darf auf neue Zeile umbrechen wenn Widget
            schmal/groß ist (zB große Hauptansicht). Vorher in der Subtext-Zeile
            mit whitespace-nowrap → wurde abgeschnitten. Eigener statsSize-Slider,
            damit User UV/Wind/Feuchte unabhängig von "Fühlt sich an wie" skaliert. */}
        {((config?.showHumidity && humidity !== undefined) || (config?.showWind && windSpeed !== undefined) || (config?.showUv && uv !== undefined)) && (
          <div
             style={{ fontSize: `${statsSizePx}px`, opacity: subtextOpacity }}
             className={`mt-[0.3em] ${subtextUppercase ? "uppercase" : ""} ${subtextTrackingClass} flex flex-wrap items-center gap-x-[0.8em] gap-y-[0.2em]`}
          >
            {config?.showHumidity && humidity !== undefined && (
              <span className="inline-flex items-center gap-[0.3em]">
                 <StatIcon k="droplets" iconSet={statIconSet} meteoStyle={config?.meteoconsStyle} />
                 {humidity}%
              </span>
            )}
            {config?.showWind && windSpeed !== undefined && (
              <span className="inline-flex items-center gap-[0.3em]">
                 <StatIcon k="wind" iconSet={statIconSet} meteoStyle={config?.meteoconsStyle} value={windSpeed} windUnit={unitWind} />
                 {Math.round(windSpeed)} {windUnitLabel}
              </span>
            )}
            {config?.showUv && uv !== undefined && (
              <span className="inline-flex items-center gap-[0.3em]">
                 <StatIcon k="uv" iconSet={statIconSet} meteoStyle={config?.meteoconsStyle} value={uv} />
                 UV {Math.round(uv)}
              </span>
            )}
          </div>
        )}
        {config?.showSunTimes !== false && (sunrise || sunset) && (
          <div style={{ fontSize: `${subtextSizeEm * 0.8}em` }} className="mt-[0.3em] opacity-60 inline-flex items-center gap-[0.8em]">
            {sunrise && (
               <span className="inline-flex items-center gap-[0.3em]">
                  <StatIcon k="sunrise" iconSet={statIconSet} meteoStyle={config?.meteoconsStyle} />
                  {formatHm(sunrise)}
               </span>
            )}
            {sunset && (
               <span className="inline-flex items-center gap-[0.3em]">
                  <StatIcon k="sunset" iconSet={statIconSet} meteoStyle={config?.meteoconsStyle} />
                  {formatHm(sunset)}
               </span>
            )}
          </div>
        )}
      </div>

      {/* Forecast Row */}
      {!config?.hideForecast && (
        <div className="flex gap-[1em] md:gap-[1.5em] shrink-0 items-center justify-end">
          {forecast.map((day: any, i: number) => (
            <div key={i} className="flex flex-col items-center gap-[0.4em]">
              <span style={{ fontSize: '0.9em' }} className="opacity-80 tracking-wide font-medium">{day.day}</span>
              {/* transform statt Box → Icon wächst in den Zeilenabstand,
                  Spaltenhöhe (und damit das Widget) bleibt konstant. */}
              <div style={{ width: '1.4em', height: '1.4em', transform: `scale(${fcIconScale})` }} className="opacity-90 drop-shadow-sm">
                 {/* Vorhersage per Default statisch — 5-20 gleichzeitige
                     Animationen ruckeln auf Tablets/TVs. iconAnimatedAll
                     (Opt-in) animiert auch hier. */}
                 {wmoToIcon(day.code, true, config?.iconSet, { style: config?.meteoconsStyle, animated: (config?.meteoconsAnimated ?? false) && (config?.iconAnimatedAll ?? false) })}
              </div>
              <div className="flex flex-col items-center leading-tight mt-1" style={{ fontSize: '0.85em' }}>
                <span className="font-bold">{day.max}{tempSuffix}</span>
                <span className="opacity-50">{day.min}{tempSuffix}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Hourly Strip */}
      {hourlyData && hourlyData.length > 0 && (
        <div
          className="relative z-[1] mt-[0.8em] pt-[0.8em] border-t border-white/10 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          <div className="flex gap-[1.2em] items-end" style={{ minWidth: "max-content" }}>
            {hourlyData.map((h: any, i: number) => (
              <div key={i} className="flex flex-col items-center gap-[0.25em] shrink-0">
                <span style={{ fontSize: '0.65em' }} className="opacity-70 uppercase tracking-wider font-medium whitespace-nowrap">
                  {h.label}
                </span>
                <div style={{ width: '1.2em', height: '1.2em', transform: `scale(${fcIconScale})` }} className="opacity-90 drop-shadow-sm">
                  {wmoToIcon(h.code, h.isDay, config?.iconSet, { style: config?.meteoconsStyle, animated: (config?.meteoconsAnimated ?? false) && (config?.iconAnimatedAll ?? false) })}
                </div>
                {h.pop > 5 && (
                  <span style={{ fontSize: '0.55em' }} className="text-cyan-300 font-medium leading-none">
                    {h.pop}%
                  </span>
                )}
                <span style={{ fontSize: '0.85em' }} className="font-bold leading-none">
                  {h.temp}{tempSuffix}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

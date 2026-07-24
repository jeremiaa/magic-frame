"use client";

import { useEffect, useState } from "react";
import { Droplets, Wind, Sun } from "lucide-react";
import { wmoToIcon, wmoToText, moonPhaseFraction } from "@/lib/weather/wmo";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function ClockWidget({ config }: { config?: any }) {
  const { locale, t } = useLocale();
  // Defaults follow the App locale (en → 12h + US date, de → 24h + DE date),
  // but the user can override per widget via the Inspector — same pattern as
  // unitTemp / unitWind on the Weather widget. Settings:
  //   timeFormat: "auto" | "12h" | "24h"
  //   dateFormat: "auto" | "en-US" | "en-GB" | "de-DE"
  const localeBased = locale === "en" ? "en-US" : "de-DE";
  const dateLocale: string = (() => {
    const f = config?.dateFormat;
    if (f === "en-US" || f === "en-GB" || f === "de-DE") return f;
    return localeBased; // "auto"
  })();
  const is12h: boolean = (() => {
    const f = config?.timeFormat;
    if (f === "12h") return true;
    if (f === "24h") return false;
    return locale === "en"; // "auto"
  })();
  const [time, setTime] = useState<Date | null>(null);
  const [weather, setWeather] = useState<any>(null);

  // Time Loop
  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Weather Loop
  const unitTemp: "celsius" | "fahrenheit" =
    config?.unitTemp === "fahrenheit" ? "fahrenheit" : "celsius";
  useEffect(() => {
    if (!config?.showMiniWeather || !config?.lat || !config?.lon) return;
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `/api/weather?lat=${config.lat}&lon=${config.lon}&temperature_unit=${unitTemp}`
        );
        const result = await res.json();
        if (!result.error) setWeather(result);
      } catch (e) {
        console.error("Failed to fetch mini weather", e);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [config?.showMiniWeather, config?.lat, config?.lon, unitTemp]);

  if (!time) return <div className="animate-pulse w-full h-full bg-white/5 rounded-xl min-h-[4em]"></div>;

  // Defensive: if the stored timezone isn't a valid IANA zone (we shipped a
  // build where the picker accepted free text and saved garbage like
  // "America/New_York)"), drop it. Otherwise the first Intl call below
  // throws and the whole widget renders in the catch-block fallback —
  // which used to ignore is12h and always show 24h.
  let timezone = config?.timezone as string | undefined;
  if (timezone) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      timezone = undefined;
    }
  }
  const options: Intl.DateTimeFormatOptions = timezone ? { timeZone: timezone } : {};

  // Day/Night bestimmen: wenn timezone gesetzt, deren Stunde nutzen.
  let hoursInTz = time.getHours();
  if (timezone) {
    try {
      const h = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone }).format(time);
      const parsed = parseInt(h, 10);
      if (!isNaN(parsed)) hoursInTz = parsed;
    } catch {}
  }
  const isDay = hoursInTz > 6 && hoursInTz < 20;
  
  let hours = "00", minutes = "00", seconds = "00";
  let dayPeriod = ""; // "AM" / "PM" — only populated when is12h
  let dateStr = "";

  try {
     const timeFormatter = new Intl.DateTimeFormat(dateLocale, { ...options, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: is12h });
     const timeParts = timeFormatter.formatToParts(time);
     hours = timeParts.find(p => p.type === 'hour')?.value || '00';
     minutes = timeParts.find(p => p.type === 'minute')?.value || '00';
     seconds = timeParts.find(p => p.type === 'second')?.value || '00';
     // dayPeriod only appears in 12h locales. Some Intl implementations
     // emit a lowercase "am"/"pm" — we uppercase for visual consistency.
     dayPeriod = (timeParts.find(p => p.type === 'dayPeriod')?.value || '').toUpperCase();

     // en-US: "Tue, May 27", de-DE: "Di., 27. Mai"
     const dateFormatter = new Intl.DateTimeFormat(dateLocale, { ...options, weekday: 'short', day: '2-digit', month: 'short' });
     dateStr = dateFormatter.format(time);
  } catch (error) {
     // Fallback path — should be rare now that the timezone is validated
     // above, but if Intl misbehaves we still honour the 12h/24h pick
     // instead of silently forcing 24h.
     const rawHours = time.getHours();
     if (is12h) {
        const h12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
        hours = h12.toString().padStart(2, '0');
        dayPeriod = rawHours >= 12 ? 'PM' : 'AM';
     } else {
        hours = rawHours.toString().padStart(2, '0');
     }
     minutes = time.getMinutes().toString().padStart(2, '0');
     seconds = time.getSeconds().toString().padStart(2, '0');
     const days = locale === "en"
        ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        : ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];
     const months = locale === "en"
        ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        : ["Jan.", "Feb.", "Mär.", "Apr.", "Mai", "Jun.", "Jul.", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
     dateStr = locale === "en"
        ? `${days[time.getDay()]} ${time.getDate()} ${months[time.getMonth()]}`
        : `${days[time.getDay()]} ${time.getDate().toString().padStart(2, '0')}. ${months[time.getMonth()]}`;
  }

  // Alignment
  const alignClass = config?.align === 'center' ? 'items-center text-center' : config?.align === 'right' ? 'items-end text-right' : 'items-start text-left';
  
  return (
    <div className={`flex flex-col w-full h-full justify-center overflow-hidden ${alignClass} p-4`}>
       {/* Small Top Date */}
       {!config?.hideDate && (
         <div style={{ fontSize: '0.85em' }} className="opacity-90 tracking-wide text-ellipsis whitespace-nowrap overflow-hidden mb-1">
           {dateStr}
         </div>
       )}
       
       {/* Main Clock
           Layout note: parent uses `items-baseline` so HH:MM and the seconds
           share the same text baseline — that's the visual rhythm a digital
           clock wants. When AM/PM is needed we position it absolutely above
           the seconds (bottom: 100% sits its bottom edge at the seconds' top)
           so it doesn't disturb baseline alignment and doesn't drift when
           the seconds digit widths change. tabular-nums on both digit
           clusters keeps widths constant. */}
       <div className="flex items-baseline tracking-tight leading-none mb-2">
         <span style={{ fontSize: '4.5em', fontVariantNumeric: 'tabular-nums' }} className="font-bold">{hours}:{minutes}</span>

         {(!config || config?.hideSeconds !== true) ? (
            <span
               style={{ position: 'relative', fontSize: '1.8em', fontVariantNumeric: 'tabular-nums' }}
               className="opacity-70 ml-[0.3em] font-medium"
            >
               {seconds}
               {dayPeriod && (
                  <span
                     style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        fontSize: '0.5em',
                        marginBottom: '0.15em',
                     }}
                     className="opacity-60 font-semibold tracking-[0.18em] whitespace-nowrap leading-none"
                  >
                     {dayPeriod}
                  </span>
               )}
            </span>
         ) : (
            // Seconds hidden → AM/PM inline at larger size next to HH:MM.
            dayPeriod && (
               <span style={{ fontSize: '1.6em' }} className="opacity-60 ml-[0.4em] font-medium tracking-wide">{dayPeriod}</span>
            )
         )}
       </div>

       {/* Zusätzliche Zeitzonen (Worldclock) */}
       {Array.isArray(config?.extraTimezones) && config.extraTimezones.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 opacity-70 mb-1" style={{ fontSize: '0.65em' }}>
             {config.extraTimezones.map((entry: any, idx: number) => {
                const tz = typeof entry === "string" ? entry : entry?.tz;
                const label = typeof entry === "string"
                   ? tz.split("/").pop()?.replace("_", " ") ?? tz
                   : (entry?.label || (tz?.split("/").pop()?.replace("_", " ") ?? tz));
                if (!tz) return null;
                let h = "--:--";
                try {
                   // World-clock entries follow the App locale too — English
                   // gets "8:32 AM", German gets "08:32".
                   h = new Intl.DateTimeFormat(dateLocale, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: is12h }).format(time);
                } catch {}
                return (
                   <div key={idx} className="flex items-baseline gap-1">
                      <span className="uppercase tracking-wider opacity-80">{label}</span>
                      <span className="font-mono">{h}</span>
                   </div>
                );
             })}
          </div>
       )}

       {/* Mini Weather */}
       {config?.showMiniWeather && weather?.current && (() => {
          // Stats-Größe in Pixel (absolut), nicht in em — sonst skaliert die
          // Stats-Zeile mit der Widget-Schriftgröße mit. Default 12px.
          const statsSizePx = typeof config?.statsSize === 'number' ? config.statsSize : 12;
          return (
          <div className="flex flex-col gap-1 mt-1">
             <div className="flex items-center gap-2">
                <div style={{ width: '1.5em', height: '1.5em' }} className="shrink-0 opacity-90 inline-block drop-shadow-md">
                   {wmoToIcon(weather.current.weather_code, isDay, config.iconSet, { style: (config as any)?.meteoconsStyle, animated: (config as any)?.meteoconsAnimated, moonPhase: ((config as any)?.meteoconsMoonPhase ?? true) ? moonPhaseFraction(new Date()) : undefined })}
                </div>
                <span style={{ fontSize: '1.2em' }} className="font-bold drop-shadow-md tracking-wide">
                   {config.location ? config.location.split(',')[0] : t("Wetter")}, {Math.round(weather.current.temperature_2m)}{unitTemp === "fahrenheit" ? "°F" : "°C"}
                </span>
             </div>
             {/* Subtext */}
             <div style={{ fontSize: '0.9em' }} className="font-medium opacity-80 pl-2">
                {wmoToText(weather.current.weather_code, locale)}
                {((config.showHumidity && weather.current.relative_humidity_2m !== undefined) || (config.showWind && weather.current.wind_speed_10m !== undefined) || (config.showUv && typeof weather.current.uv_index === "number")) && (
                   <span
                      style={{ fontSize: `${statsSizePx}px` }}
                      className="ml-[0.8em] opacity-80 inline-flex flex-wrap items-center gap-x-[0.6em] gap-y-[0.1em]"
                   >
                      {config.showHumidity && weather.current.relative_humidity_2m !== undefined && (
                         <span className="flex items-center gap-[0.25em]">
                            <Droplets style={{ width: '1em', height: '1em' }} strokeWidth={2} className="opacity-80" />
                            {weather.current.relative_humidity_2m}%
                         </span>
                      )}
                      {config.showWind && weather.current.wind_speed_10m !== undefined && (
                         <span className="flex items-center gap-[0.25em]">
                            <Wind style={{ width: '1em', height: '1em' }} strokeWidth={2} className="opacity-80" />
                            {Math.round(weather.current.wind_speed_10m)} km/h
                         </span>
                      )}
                      {config.showUv && typeof weather.current.uv_index === "number" && (
                         <span className="flex items-center gap-[0.25em]">
                            <Sun style={{ width: '1em', height: '1em' }} strokeWidth={2} className="opacity-80" />
                            UV {Math.round(weather.current.uv_index)}
                         </span>
                      )}
                   </span>
                )}
             </div>
          </div>
          );
       })()}
    </div>
  );
}

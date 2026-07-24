import { CloudRain, Cloud, Sun, CloudDrizzle, CloudLightning, CloudSnow, CloudFog, Moon } from "lucide-react";
import {
  SolidSun,
  SolidMoon,
  SolidPartlyCloudyDay,
  SolidPartlyCloudyNight,
  SolidCloud,
  SolidCloudHeavy,
  SolidCloudRain,
  SolidCloudSnow,
  SolidCloudLightning,
  SolidCloudFog,
  SolidCloudDrizzle,
  SolidSleet,
  SolidHail,
} from "@/components/widgets/SolidWeatherIcons";
import { MeteoconIcon } from "@/components/widgets/MeteoconIcon";

// Zentrale Mapping-Funktionen für Open-Meteo WMO-Weather-Codes.
// Bis Batch B waren diese Funktionen in ClockWidget und WeatherWidget
// wortgleich dupliziert.

// WMO-Code → Meteocons-Dateiname (Bas Milius, MIT). Tag/Nacht-bewusst, nutzt
// die reichen Varianten (Schauer, Gewitter-Regen, overcast day/night …).
export function wmoToMeteoconName(code: number, isDay: boolean): string {
  const dn = (d: string, n: string) => (isDay ? d : n);
  if (code === 0) return dn("clear-day", "clear-night");
  if (code === 1) return dn("partly-cloudy-day", "partly-cloudy-night");
  if (code === 2) return "cloudy";
  if (code === 3) return dn("overcast-day", "overcast-night");
  if ([45, 48].includes(code)) return dn("fog-day", "fog-night");
  if ([51, 53, 55].includes(code)) return "drizzle";
  if ([56, 57, 66, 67].includes(code)) return "sleet"; // gefrierender Niesel/Regen
  if ([61, 63, 65].includes(code)) return "rain";
  if ([71, 73, 75, 77].includes(code)) return "snow";
  if ([80, 81, 82].includes(code)) return dn("partly-cloudy-day-rain", "partly-cloudy-night-rain"); // Schauer
  if ([85, 86].includes(code)) return dn("partly-cloudy-day-snow", "partly-cloudy-night-snow");
  if (code === 95) return dn("thunderstorms-day", "thunderstorms-night");
  if ([96, 99].includes(code)) return dn("thunderstorms-day-rain", "thunderstorms-night-rain"); // Gewitter + Hagel
  return "cloudy";
}

// ── Stage 2: wertabhängige Meteocons-Extras ───────────────────────────────
// UV-Wert → uv-index-1…11 (farbcodiert). >11 wird auf 11 gedeckelt.
export function uvToMeteoconName(uv: number): string {
  const n = Math.max(1, Math.min(11, Math.round(uv)));
  return `uv-index-${n}`;
}

// Windgeschwindigkeit → Beaufort-Stufe (0…12) → wind-beaufort-N. Eingabe ist
// der Anzeigewert + Einheit; intern in m/s umgerechnet (Beaufort ist auf m/s
// definiert).
export function windToBeaufortMeteoconName(speed: number, unit: string = "kmh"): string {
  const ms =
    unit === "ms" ? speed :
    unit === "mph" ? speed * 0.44704 :
    unit === "kn" ? speed * 0.514444 :
    speed / 3.6; // kmh
  const limits = [0.5, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
  let b = 0;
  for (let i = 0; i < limits.length; i++) if (ms >= limits[i]) b = i + 1;
  return `wind-beaufort-${Math.min(12, b)}`;
}

// Mondphasen-Anteil p∈[0,1) → einer von 8 Meteocons-Mondnamen.
export function moonPhaseName(p: number): string {
  const names = [
    "moon-new", "moon-waxing-crescent", "moon-first-quarter", "moon-waxing-gibbous",
    "moon-full", "moon-waning-gibbous", "moon-last-quarter", "moon-waning-crescent",
  ];
  const idx = ((Math.round(p * 8) % 8) + 8) % 8;
  return names[idx];
}

// Aktueller Mondphasen-Anteil aus einem Datum. Referenz-Neumond 2000-01-06
// 18:14 UTC, synodischer Monat 29.53058867 Tage.
export function moonPhaseFraction(date: Date): number {
  const synodic = 29.53058867;
  const knownNew = Date.UTC(2000, 0, 6, 18, 14, 0);
  const days = (date.getTime() - knownNew) / 86400000;
  let p = (days % synodic) / synodic;
  if (p < 0) p += 1;
  return p;
}

// WMO-Code → Dateiname im eigenen 3D-Set (public/weather/3d, generiert via
// scripts/gen-weather-3d-icons.py — eigene Icons in der DNA des entfernten
// celestial-Sets, daher lizenzfrei). Vollmond-Nächte bekommen das
// Vollmond-Icon; das Fenster entspricht moonPhaseName (Index 4 von 8).
export function wmoTo3dName(code: number, isDay: boolean, moonPhase?: number): string {
  if (code === 0) {
    if (isDay) return "sun";
    if (typeof moonPhase === "number" && Math.round(moonPhase * 8) % 8 === 4) return "full-moon";
    return "moon";
  }
  if (code === 1) return isDay ? "partly-day" : "partly-night";
  if (code === 2) return isDay ? "cloudy" : "cloudy-night";
  if (code === 3) return isDay ? "overcast" : "overcast-night";
  if ([45, 48].includes(code)) return "fog";
  if ([56, 57, 66, 67].includes(code)) return "sleet";
  if ([51, 53, 55].includes(code)) return "drizzle";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([96, 99].includes(code)) return "hail";
  if (code === 95) return "thunder";
  return "cloudy";
}

export type IconOpts = { style?: "fill" | "line"; animated?: boolean; moonPhase?: number };

export function wmoToIcon(
  code: number,
  isDay: boolean = true,
  iconSet: string = "lucide",
  opts?: IconOpts,
) {
  const props = { strokeWidth: 1.5, className: "w-full h-full drop-shadow-md" };

  // Die IconScout-Sets (celestial/forecast) wurden aus Lizenzgründen entfernt
  // (No-Redistribution — Rohdateien dürfen nicht im öffentlichen Repo liegen).
  // Bestehende Layouts mit diesen Werten fallen sauber auf Meteocons (MIT)
  // zurück, statt auf ein kaputtes Bild.
  if (iconSet === "celestial" || iconSet === "forecast") iconSet = "meteocons";

  if (iconSet === "meteocons") {
    const style = opts?.style === "line" ? "line" : "fill";
    const animated = !!opts?.animated;
    let name = wmoToMeteoconName(code, isDay);
    // Echte Mondphase, nur im klaren Nachthimmel und nur wenn opts.moonPhase
    // gesetzt ist (Hauptsymbol). Vorhersage/Stunden lassen es weg → generisch.
    if (!isDay && code === 0 && typeof opts?.moonPhase === "number") {
      name = moonPhaseName(opts.moonPhase);
    }
    const src = `/weather/meteocons/${style}/${animated ? "animated" : "static"}/${name}.svg`;
    return <MeteoconIcon src={src} animated={animated} />;
  }

  // Eigenes 3D-Set — wie Meteocons bewusst immer als <img>: die
  // CSS-Animationen leben im SVG-Dokument selbst und laufen dort isoliert
  // (keine Keyframe-/ID-Kollisionen zwischen mehreren Icons auf der Seite).
  if (iconSet === "3d") {
    const animated = !!opts?.animated;
    const name = wmoTo3dName(code, isDay, opts?.moonPhase);
    const src = `/weather/3d/${animated ? "animated" : "static"}/${name}.svg`;
    return (
      <img
        src={src}
        className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
        alt="Weather"
      />
    );
  }

  if (iconSet === "solid") {
    // Differenzierung in den ersten 3 Wolken-Codes:
    //   1 = "leicht bewölkt"   → Sonne/Mond mit kleiner Wolke
    //   2 = "bewölkt"          → einfache helle Cloud
    //   3 = "stark bewölkt"    → CloudHeavy (zwei Schichten)
    // Spezialfälle:
    //   56, 57 = freezing drizzle → Sleet (Niesel + Flocken-Mix)
    //   66, 67 = freezing rain    → Sleet
    //   96, 99 = Gewitter mit Hagel → Hail statt nur Blitz
    if (code === 0) return isDay ? <SolidSun {...props} /> : <SolidMoon {...props} />;
    if (code === 1) return isDay ? <SolidPartlyCloudyDay {...props} /> : <SolidPartlyCloudyNight {...props} />;
    if (code === 2) return <SolidCloud {...props} />;
    if (code === 3) return <SolidCloudHeavy {...props} />;
    if ([45, 48].includes(code)) return <SolidCloudFog {...props} />;
    if ([56, 57, 66, 67].includes(code)) return <SolidSleet {...props} />;
    if ([51, 53, 55].includes(code)) return <SolidCloudDrizzle {...props} />;
    if ([61, 63, 65, 80, 81, 82].includes(code)) return <SolidCloudRain {...props} />;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return <SolidCloudSnow {...props} />;
    if ([96, 99].includes(code)) return <SolidHail {...props} />;
    if (code === 95) return <SolidCloudLightning {...props} />;
    return <SolidCloud {...props} />;
  }

  if (code === 0) return isDay ? <Sun {...props} className="w-full h-full opacity-90 text-yellow-400" fill="currentColor" /> : <Moon {...props} className="w-full h-full opacity-80 text-blue-200" fill="currentColor" />;
  if ([1, 2, 3].includes(code)) return <Cloud {...props} className="w-full h-full opacity-80" />;
  if ([45, 48].includes(code)) return <CloudFog {...props} className="w-full h-full opacity-70" />;
  if ([51, 53, 55, 56, 57].includes(code)) return <CloudDrizzle {...props} className="w-full h-full opacity-90 text-blue-300" />;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <CloudRain {...props} className="w-full h-full opacity-90 text-blue-400" />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow {...props} className="w-full h-full opacity-90 text-white" />;
  if ([95, 96, 99].includes(code)) return <CloudLightning {...props} className="w-full h-full opacity-100 text-yellow-300" />;

  return <Cloud {...props} className="w-full h-full opacity-80" />;
}

export function wmoToText(code: number, locale: "de" | "en" = "de"): string {
  const en = locale === "en";
  if (code === 0) return en ? "Clear" : "Klar";
  if (code === 1) return en ? "Mostly clear" : "Leicht bewölkt";
  if (code === 2) return en ? "Cloudy" : "Bewölkt";
  if (code === 3) return en ? "Overcast" : "Stark bewölkt";
  if ([45, 48].includes(code)) return en ? "Fog" : "Nebel";
  if ([51, 53, 55, 56, 57].includes(code)) return en ? "Drizzle" : "Nieselregen";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return en ? "Rain" : "Regen";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return en ? "Snow" : "Schnee";
  if ([95, 96, 99].includes(code)) return en ? "Thunderstorm" : "Gewitter";
  return en ? "Overcast" : "Wolkig";
}

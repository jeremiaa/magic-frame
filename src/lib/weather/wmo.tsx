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

// Zentrale Mapping-Funktionen für Open-Meteo WMO-Weather-Codes.
// Bis Batch B waren diese Funktionen in ClockWidget und WeatherWidget
// wortgleich dupliziert.

export function wmoToIcon(code: number, isDay: boolean = true, iconSet: string = "lucide") {
  const props = { strokeWidth: 1.5, className: "w-full h-full drop-shadow-md" };

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

  if (iconSet === "celestial") {
    let src = "/weather/celestial/";
    if (code === 0) src += isDay ? "sun-12913245.svg" : "moon-12913244.svg";
    else if ([1, 2, 3].includes(code)) src += isDay ? "sunny-day-with-fluffy-clouds-12913267.svg" : "moon-and-clouds-12913257.svg";
    else if ([45, 48].includes(code)) src += "foggy-weather-12913253.svg";
    else if ([51, 53, 55, 56, 57].includes(code)) src += "monsoon-sunny-showers-weather-12913242.svg";
    else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) src += isDay ? "rainy-cloud-12913259.svg" : "rainy-night-12913261.svg";
    else if ([71, 73, 75, 77, 85, 86].includes(code)) src += "snowy-and-rainy-weather-12913265.svg";
    else if ([95, 96, 99].includes(code)) src += isDay ? "rainy-weather-with-thunderstorm-12913262.svg" : "rainy-night-thunderstorm-12913260.svg";
    else src += "cloudy-day-12913249.svg";

    return <img src={src} className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] object-contain" alt="Weather" />;
  }

  if (iconSet === "forecast") {
    let src = "/weather/forecast/";
    if (code === 0) src += isDay ? "sun-4202032.svg" : "moon-4202048.svg";
    else if ([1, 2, 3].includes(code)) src += isDay ? "cloud-4202046.svg" : "night-4202049.svg";
    else if ([45, 48].includes(code)) src += "fog-4202047.svg";
    else if ([51, 53, 55, 56, 57].includes(code)) src += "raindrop-4202052.svg";
    else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) src += "rain-4202050.svg";
    else if ([71, 73, 75, 77, 85, 86].includes(code)) src += "snow-4202054.svg";
    else if ([95, 96, 99].includes(code)) src += "thunder-4202039.svg";
    else src += "cloud-4202046.svg";

    return <img src={src} className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] object-contain" alt="Weather" />;
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

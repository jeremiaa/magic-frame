"use client";

import { useEffect, useState } from "react";
import { Icon as IconifyIcon } from "./WidgetIcon";
import {
  Gauge,
  Haze,
  Atom,
  Factory,
  Flower2,
  TreeDeciduous,
  Sprout,
  Flower,
  Sun,
  Zap,
  Wind,
  Leaf,
} from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useGlassStyle } from "@/lib/ui/glass";
import { uvToMeteoconName, windToBeaufortMeteoconName } from "@/lib/weather/wmo";

// Umwelt-Widget: Pollen, Luftqualität (AQI + Schadstoffe), UV, Solar und Wind
// als Glass-Kacheln — Anzeige-Pendant zum Sensor-Widget, aber mit Open-Meteo
// als Quelle statt Home Assistant (keine Zusatz-Hardware nötig).
// Pollen liefert Open-Meteo nur für Europa (CAMS); außerhalb kommen null-Werte
// und die Kacheln verschwinden automatisch.

type EnvData = {
  aqi?: { european: number | null; us: number | null } | null;
  pollutants?: Record<string, number | null> | null;
  pollen?: Record<string, number | null> | null;
  uv?: number | null;
  solar?: { shortwave: number | null; direct: number | null } | null;
  wind?: { speed: number | null; gusts: number | null; direction: number | null; unit: string } | null;
};

// Beispieldaten für die Editor-Vorschau (#42) — zeigen alle Kachel-Typen.
const DEMO_DATA: EnvData = {
  aqi: { european: 28, us: 42 },
  pollutants: { pm2_5: 6.2, pm10: 11.4, ozone: 74, nitrogen_dioxide: 9.1, sulphur_dioxide: 1.2, carbon_monoxide: 142 },
  pollen: { alder: 0, birch: 24, grass: 38, mugwort: 4, olive: 0, ragweed: 1 },
  uv: 5.4,
  solar: { shortwave: 486, direct: 342 },
  wind: { speed: 14, gusts: 33, direction: 240, unit: "kmh" },
};

type Level = { label: string; color: string; suffix?: string };

// EU-AQI (0–100+): Skala der Europäischen Umweltagentur, grob vereinfacht.
function euAqiLevel(v: number): Level {
  if (v <= 20) return { label: "Gut", color: "#22c55e" };
  if (v <= 40) return { label: "Okay", color: "#84cc16" };
  if (v <= 60) return { label: "Mäßig", color: "#eab308" };
  if (v <= 80) return { label: "Schlecht", color: "#f97316" };
  if (v <= 100) return { label: "Sehr schlecht", color: "#ef4444" };
  return { label: "Extrem", color: "#a855f7" };
}

// US-AQI (0–500): EPA-Skala.
function usAqiLevel(v: number): Level {
  if (v <= 50) return { label: "Gut", color: "#22c55e" };
  if (v <= 100) return { label: "Mäßig", color: "#eab308" };
  if (v <= 150) return { label: "Empfindliche", color: "#f97316" };
  if (v <= 200) return { label: "Ungesund", color: "#ef4444" };
  if (v <= 300) return { label: "Sehr ungesund", color: "#a855f7" };
  return { label: "Gefährlich", color: "#7f1d1d" };
}

function uvLevel(v: number): Level {
  if (v < 3) return { label: "Niedrig", color: "#22c55e" };
  if (v < 6) return { label: "Mittel", color: "#eab308" };
  if (v < 8) return { label: "Hoch", color: "#f97316" };
  if (v < 11) return { label: "Sehr hoch", color: "#ef4444" };
  return { label: "Extrem", color: "#a855f7" };
}

// Pollen-Belastung aus Körnern/m³ — grobe Einstufung je Pflanzengruppe
// (Bäume streuen deutlich mehr Körner als Gräser/Kräuter bei gleicher Wirkung).
function pollenLevel(species: string, v: number): Level {
  const bands: Record<string, [number, number, number, number]> = {
    // [Gering-ab, Mäßig-ab, Hoch-ab, SehrHoch-ab]
    alder: [1, 16, 91, 1500],
    birch: [1, 16, 91, 1500],
    olive: [1, 16, 91, 1500],
    grass: [1, 6, 21, 201],
    mugwort: [1, 11, 51, 501],
    ragweed: [1, 11, 51, 501],
  };
  const [g, m, h, sh] = bands[species] ?? [1, 11, 51, 501];
  // suffix = Meteocons-Variante mit Belastungs-Badge (pollen-grass-low …).
  if (v < g) return { label: "Keine", color: "#9ca3af", suffix: "" };
  if (v < m) return { label: "Gering", color: "#22c55e", suffix: "-low" };
  if (v < h) return { label: "Mäßig", color: "#eab308", suffix: "-moderate" };
  if (v < sh) return { label: "Hoch", color: "#f97316", suffix: "-high" };
  return { label: "Sehr hoch", color: "#ef4444", suffix: "-very-high" };
}

// mc = Meteocons-Basisname; die Belastungsstufe hängt das Badge-Suffix an
// (pollen-grass-low … pollen-tree-very-high).
const POLLEN_META: { key: string; label: string; Icon: typeof Flower2; mc: string }[] = [
  { key: "grass", label: "Gräser", Icon: Sprout, mc: "pollen-grass" },
  { key: "birch", label: "Birke", Icon: TreeDeciduous, mc: "pollen-tree" },
  { key: "alder", label: "Erle", Icon: TreeDeciduous, mc: "pollen-tree" },
  { key: "olive", label: "Olive", Icon: TreeDeciduous, mc: "pollen-tree" },
  { key: "mugwort", label: "Beifuß", Icon: Flower, mc: "pollen-weed" },
  { key: "ragweed", label: "Ambrosia", Icon: Flower2, mc: "pollen-weed" },
];

const WIND_UNIT_LABEL: Record<string, string> = { kmh: "km/h", mph: "mph", ms: "m/s", kn: "kn" };

type Tile = {
  key: string;
  Icon?: typeof Gauge; // Lucide (Fallback / Pollen) …
  meteocon?: string; // … oder Meteocons-Dateiname (Standard, farbig, teils wertbasiert) …
  iconify?: string; // … oder Iconify-Name (HA-Kacheln, z.B. mdi:flower-pollen)
  iconColor?: string;
  label: string;
  value: string;
  sub?: string; // kleine Zusatzinfo neben dem Wert: Einheit ODER Level-Wort
  subColor?: string; // Level-Wörter in Ampelfarbe, Einheiten grau (undefined)
  dot?: string; // Ampel-Punkt neben dem Kachel-Namen
};

// Eigene HA-Sensoren als zusätzliche Kacheln (DWD Pollenflug, PV-Leistung,
// CO2, Feinstaub vom eigenen Sensor …) — dieselbe Slot-Form wie im
// Sensor-Widget, gepollt über /api/ha/state.
type HaSlot = { entityId?: string; icon?: string; label?: string; color?: string; unit?: string; decimals?: number };

export default function EnvironmentWidget({ config }: { config?: any }) {
  const t = useT();
  const glass = useGlassStyle(config);
  const lat: string = config?.lat || "";
  const lon: string = config?.lon || "";
  const unitWind: string = ["mph", "ms", "kn"].includes(config?.unitWind) ? config.unitWind : "kmh";
  const aqiScale: "european" | "us" = config?.aqiScale === "us" ? "us" : "european";
  const isDemo = config?.__demo === true;

  const [data, setData] = useState<EnvData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // HA-Sensor-Slots (optional): Live-Werte via /api/ha/state, wie im
  // Sensor-Widget (15s-Poll).
  const haSlots: HaSlot[] = Array.isArray(config?.haEntities) ? config.haEntities : [];
  const haIds = haSlots.map((s) => s.entityId).filter(Boolean) as string[];
  const [haStates, setHaStates] = useState<Record<string, any>>({});
  useEffect(() => {
    if (isDemo || haIds.length === 0) return;
    let cancelled = false;
    const fetchHa = async () => {
      try {
        const res = await fetch(`/api/ha/state?ids=${encodeURIComponent(haIds.join(","))}`, { cache: "no-store" });
        if (!res.ok) return;
        const dict = await res.json();
        if (!cancelled) setHaStates(dict ?? {});
      } catch {}
    };
    fetchHa();
    const interval = setInterval(fetchHa, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haIds.join(","), isDemo]);

  useEffect(() => {
    if (isDemo) return;
    if (!lat || !lon) return;
    const controller = new AbortController();
    let cancelled = false;
    const fetchEnv = async () => {
      try {
        const res = await fetch(
          `/api/environment?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&wind_speed_unit=${unitWind}`,
          { signal: controller.signal },
        );
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
        if (!cancelled) setError(t("Umweltdaten nicht verfügbar"));
      }
    };
    fetchEnv();
    // Luftqualität/Pollen ändern sich langsam — 30 Minuten reichen.
    const interval = setInterval(fetchEnv, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, unitWind, isDemo]);

  const d: EnvData | null = isDemo ? DEMO_DATA : data;
  const envConfigured = Boolean(lat && lon);

  // Reines HA-Setup (nur eigene Sensoren, kein Standort) ist gültig —
  // die Hinweise greifen nur, wenn wirklich gar keine Quelle da ist.
  if (!envConfigured && haIds.length === 0 && !isDemo) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/40 text-[0.8em] gap-2 text-center p-2">
        <Leaf size={18} className="opacity-60" />
        {t("Keine Quelle gewählt — im Inspector Ort suchen oder HA-Sensoren hinzufügen.")}
      </div>
    );
  }

  if (error && !d && haIds.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400/70 text-[0.7em] text-center p-3">
        {t(error)}
      </div>
    );
  }

  if (envConfigured && !d && haIds.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/30 text-[0.75em]">
        …
      </div>
    );
  }

  const fmt = (v: number | null | undefined, digits = 0): string =>
    typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : "—";

  // Meteocons als Standard-Kachel-Icons (farbig; UV + Wind sogar wertbasiert:
  // uv-index-N farbcodiert, wind-beaufort-N nach Windstärke). Abschaltbar →
  // Lucide. Pollen bleiben immer Lucide-Pflanzen (dafür gibt es keine
  // Meteocons; die Ampelfarbe trägt dort die Information).
  const useMeteocons = config?.meteoconsIcons !== false;
  const mc = (name: string): string | undefined => (useMeteocons ? name : undefined);

  const tiles: Tile[] = [];

  if (config?.showAqi !== false && d?.aqi) {
    const v = aqiScale === "us" ? d.aqi.us : d.aqi.european;
    if (typeof v === "number") {
      const level = aqiScale === "us" ? usAqiLevel(v) : euAqiLevel(v);
      tiles.push({
        key: "aqi",
        Icon: Gauge,
        meteocon: mc("barometer"),
        label: aqiScale === "us" ? "AQI (US)" : "AQI (EU)",
        value: fmt(v),
        sub: t(level.label),
        subColor: level.color,
        dot: level.color,
      });
    }
  }
  if (config?.showPm25 !== false && typeof d?.pollutants?.pm2_5 === "number") {
    tiles.push({ key: "pm25", Icon: Haze, meteocon: mc("smoke-particles"), label: "PM2.5", value: fmt(d.pollutants.pm2_5, 1), sub: "µg/m³" });
  }
  if (config?.showPm10 === true && typeof d?.pollutants?.pm10 === "number") {
    tiles.push({ key: "pm10", Icon: Haze, meteocon: mc("dust"), label: "PM10", value: fmt(d.pollutants.pm10, 1), sub: "µg/m³" });
  }
  if (config?.showOzone === true && typeof d?.pollutants?.ozone === "number") {
    tiles.push({ key: "o3", Icon: Atom, label: t("Ozon"), value: fmt(d.pollutants.ozone), sub: "µg/m³" });
  }
  if (config?.showNo2 === true && typeof d?.pollutants?.nitrogen_dioxide === "number") {
    tiles.push({ key: "no2", Icon: Factory, meteocon: mc("smoke"), label: "NO₂", value: fmt(d.pollutants.nitrogen_dioxide, 1), sub: "µg/m³" });
  }
  if (config?.showPollen !== false && d?.pollen) {
    for (const meta of POLLEN_META) {
      const v = d.pollen[meta.key];
      // null = außerhalb des CAMS-Gebiets → Kachel weglassen. 0 = "Keine" zeigen
      // (außer hidePollenZero, dann nur aktive Belastungen).
      if (typeof v !== "number") continue;
      if (config?.hidePollenZero === true && v < 1) continue;
      const level = pollenLevel(meta.key, v);
      tiles.push({
        key: `pollen-${meta.key}`,
        Icon: meta.Icon,
        meteocon: mc(`${meta.mc}${level.suffix ?? ""}`),
        label: t(meta.label),
        value: t(level.label),
        dot: level.color,
      });
    }
  }
  if (config?.showUv === true && typeof d?.uv === "number") {
    const level = uvLevel(d.uv);
    tiles.push({ key: "uv", Icon: Sun, meteocon: typeof d?.uv === "number" ? mc(uvToMeteoconName(d.uv)) : mc("uv-index"), label: "UV-Index", value: fmt(d.uv, 1), sub: t(level.label), subColor: level.color, dot: level.color });
  }
  if (config?.showSolar === true && typeof d?.solar?.shortwave === "number") {
    tiles.push({ key: "solar", Icon: Zap, meteocon: mc("clear-day"), label: t("Solar"), value: fmt(d.solar.shortwave), sub: "W/m²" });
  }
  const w = d?.wind;
  if (config?.showWind === true && typeof w?.speed === "number") {
    const gusts = typeof w.gusts === "number" ? ` (${fmt(w.gusts)})` : "";
    tiles.push({
      key: "wind",
      Icon: Wind,
      meteocon: typeof w?.speed === "number" ? mc(windToBeaufortMeteoconName(w.speed, w.unit)) : mc("wind"),
      label: t("Wind"),
      value: `${fmt(w.speed)}${gusts}`,
      sub: WIND_UNIT_LABEL[w.unit] ?? "km/h",
    });
  }

  // Eigene HA-Sensoren als zusätzliche Kacheln (nach den Open-Meteo-Kacheln).
  for (const s of haSlots) {
    if (!s.entityId) continue;
    const st = haStates[s.entityId];
    const attrs = st?.attributes ?? {};
    const raw = st?.state;
    let value = "—";
    if (raw != null && raw !== "unavailable" && raw !== "unknown") {
      const num = parseFloat(raw);
      value = typeof s.decimals === "number" && !isNaN(num) ? num.toFixed(s.decimals) : String(raw);
    }
    tiles.push({
      key: `ha-${s.entityId}`,
      iconify: s.icon || attrs.icon || "mdi:leaf",
      iconColor: (s.color ?? "").trim() || undefined,
      label: (s.label ?? "").trim() || attrs.friendly_name || s.entityId,
      value,
      sub: (s.unit ?? "").trim() || attrs.unit_of_measurement || undefined,
    });
  }

  if (tiles.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/40 text-[0.8em] gap-2 text-center p-2">
        <Leaf size={18} className="opacity-60" />
        {t("Keine Umwelt-Daten für diesen Standort.")}
      </div>
    );
  }

  const textMain = glass.isLight ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.95)";
  const textSub = glass.isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.55)";
  const iconDefault = glass.isLight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)";

  return (
    <div
      className="w-full h-full grid gap-[0.45em] p-[0.2em] content-start overflow-y-auto [&::-webkit-scrollbar]:hidden"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(6.5em, 1fr))" }}
    >
      {tiles.map(({ key, Icon, meteocon, iconify, iconColor, label, value, sub, subColor, dot }) => (
        <div
          key={key}
          className="flex flex-col items-center justify-center text-center rounded-[0.8em] px-[0.4em] py-[0.55em] gap-[0.25em] overflow-hidden"
          style={glass.cardStyle}
        >
          {meteocon ? (
            // Meteocons-Illustration (statisch — viele Kacheln, Animation wäre
            // Last). Etwas größer, weil die SVGs Innenabstand mitbringen.
            <img
              src={`/weather/meteocons/${config?.meteoconsStyle === "line" ? "line" : "fill"}/static/${meteocon}.svg`}
              className="w-[2.4em] h-[2.4em] object-contain -my-[0.45em]"
              alt=""
            />
          ) : Icon ? (
            <Icon style={{ width: "1.3em", height: "1.3em", color: dot || iconDefault }} strokeWidth={2} />
          ) : iconify ? (
            <IconifyIcon icon={iconify} style={{ fontSize: "1.3em", color: iconColor || dot || iconDefault }} />
          ) : null}
          <div className="flex items-baseline gap-[0.2em] max-w-full">
            <span className="font-semibold leading-none truncate" style={{ fontSize: "1.25em", color: config?.color || textMain }}>
              {value}
            </span>
            {sub && (
              <span className="leading-none shrink-0" style={{ fontSize: "0.6em", color: subColor || textSub }}>
                {sub}
              </span>
            )}
          </div>
          <div className="flex items-center gap-[0.3em] max-w-full">
            {dot && <span className="w-[0.5em] h-[0.5em] rounded-full shrink-0" style={{ backgroundColor: dot }} />}
            <span className="uppercase tracking-wide truncate" style={{ fontSize: "0.55em", color: textSub }}>
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

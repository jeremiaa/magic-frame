"use client";

import { useEffect, useState } from "react";
import { Icon } from "./WidgetIcon";
import { Activity } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useGlassStyle } from "@/lib/ui/glass";
import Sparkline from "./ha/Sparkline";

// Sensor-Widget (#20): Anzeige-Pendant zum HA-Widget. Mehrere HA-Entities als
// gut lesbare Werte (Icon + kurzer Name + großer Wert), Cards- oder Grid-Layout.
// Teilt das Glass-Styling (Theme/Opacity/Blur) + Icon-Rahmen mit dem HA-Widget.
type Slot = { entityId?: string; icon?: string; label?: string; color?: string; unit?: string; decimals?: number };

function formatValue(rawState: any, decimals?: number): string {
  if (rawState == null || rawState === "unavailable" || rawState === "unknown") return "—";
  const num = parseFloat(rawState);
  if (typeof decimals === "number" && !isNaN(num)) return num.toFixed(decimals);
  return String(rawState);
}

export default function SensorWidget({ config }: { config?: any }) {
  const t = useT();
  const slots: Slot[] = Array.isArray(config?.entities) ? config.entities : [];
  const design: string = config?.design === "grid" ? "grid" : "cards";
  const iconFrame: boolean = config?.iconFrame === true;
  const iconSize: number = typeof config?.iconSize === "number" ? config.iconSize : 1;
  const frameScale: number = typeof config?.frameScale === "number" ? config.frameScale : 1;
  const showSparkline: boolean = config?.showSparkline === true;
  const sparklineHours: number = Math.max(1, Math.min(168, Number(config?.sparklineHours) || 6));
  const glass = useGlassStyle(config);
  const ids = slots.map((s) => s.entityId).filter(Boolean) as string[];

  const [statesDict, setStatesDict] = useState<Record<string, any>>({});
  const [histories, setHistories] = useState<Record<string, number[]>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (ids.length === 0) {
      setStatesDict({});
      return;
    }
    let cancelled = false;
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/ha/state?ids=${encodeURIComponent(ids.join(","))}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HA ${res.status}`);
        const dict = await res.json();
        if (!cancelled) {
          setStatesDict(dict ?? {});
          setError("");
        }
      } catch {
        if (!cancelled) setError("Verbindung fehlgeschlagen");
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  // Sparkline-Verlauf je Sensor (#20 / iz3man) — nur Zahlen-Entities haben
  // sinnvolle History; Fetch wie im HA-Widget über /api/ha/history.
  useEffect(() => {
    if (!showSparkline || ids.length === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    const fetchHistories = async () => {
      const next: Record<string, number[]> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(
              `/api/ha/history?entityId=${encodeURIComponent(id)}&hours=${sparklineHours}`,
              { signal: controller.signal },
            );
            if (!res.ok) return;
            const data = await res.json();
            const values: number[] = Array.isArray(data.series)
              ? data.series.map((p: any) => p.v).filter((v: any) => Number.isFinite(v))
              : [];
            if (values.length > 1) next[id] = values;
          } catch {}
        }),
      );
      if (!cancelled) setHistories(next);
    };
    fetchHistories();
    const interval = setInterval(fetchHistories, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSparkline, ids.join(","), sparklineHours]);

  if (ids.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-white/40 text-[0.8em] gap-2 text-center p-2">
        <Activity size={18} className="opacity-60" />
        {t("Keine Sensoren gewählt — im Inspector hinzufügen.")}
      </div>
    );
  }

  const textMain = glass.isLight ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.95)";
  const textSub = glass.isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.55)";
  const iconDefaultColor = glass.isLight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)";

  const rows = slots
    .filter((s) => s.entityId)
    .map((s) => {
      const st = statesDict[s.entityId!];
      const attrs = st?.attributes ?? {};
      return {
        key: s.entityId!,
        icon: s.icon || attrs.icon || "mdi:gauge",
        color: (s.color ?? "").trim(),
        label: (s.label ?? "").trim() || attrs.friendly_name || s.entityId!,
        value: formatValue(st?.state, s.decimals),
        unit: (s.unit ?? "").trim() || attrs.unit_of_measurement || "",
      };
    });

  // Icon, optional in einer Rahmen-Box (wie HA-Widget). Ohne Rahmen: nacktes Icon.
  const iconEl = (r: (typeof rows)[number], baseEm: number) => {
    const fs = baseEm * iconSize;
    const ic = <Icon icon={r.icon} style={{ fontSize: `${fs}em`, color: r.color || iconDefaultColor }} />;
    if (!iconFrame) return ic;
    return (
      <div
        className="flex items-center justify-center rounded-[0.5em] shrink-0"
        style={{
          width: `${fs * 1.5 * frameScale}em`,
          height: `${fs * 1.5 * frameScale}em`,
          backgroundColor: r.color ? `${r.color}26` : glass.isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
        }}
      >
        {ic}
      </div>
    );
  };

  if (error && Object.keys(statesDict).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400/70 text-[0.7em] text-center p-3">
        {t(error)}
      </div>
    );
  }

  if (design === "grid") {
    return (
      <div
        className="w-full h-full grid gap-[0.5em] p-[0.2em]"
        style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(rows.length, 1), 2)}, minmax(0,1fr))` }}
      >
        {rows.map((r) => (
          <div
            key={r.key}
            className="relative flex flex-col items-center justify-center text-center rounded-[0.8em] p-[0.6em] gap-[0.3em] overflow-hidden"
            style={glass.cardStyle}
          >
            {showSparkline && histories[r.key] && (
              <Sparkline
                values={histories[r.key]}
                color={r.color || (glass.isLight ? "#0ea5e9" : "#60a5fa")}
                className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
              />
            )}
            {iconEl(r, 1.3)}
            <div className="flex items-baseline gap-[0.1em] max-w-full">
              <span className="font-semibold leading-none truncate" style={{ fontSize: "1.7em", color: config?.color || textMain }}>
                {r.value}
              </span>
              {r.unit && <span className="leading-none" style={{ fontSize: "0.85em", color: textSub }}>{r.unit}</span>}
            </div>
            <div className="uppercase tracking-wide truncate max-w-full" style={{ fontSize: "0.6em", color: textSub }}>
              {r.label}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // cards (default)
  return (
    <div className="w-full h-full flex flex-col gap-[0.4em] p-[0.2em] overflow-y-auto [&::-webkit-scrollbar]:hidden">
      {rows.map((r) => (
        <div
          key={r.key}
          className="relative flex items-center gap-[0.6em] rounded-[0.8em] px-[0.7em] py-[0.5em] overflow-hidden"
          style={glass.cardStyle}
        >
          {showSparkline && histories[r.key] && (
            <Sparkline
              values={histories[r.key]}
              color={r.color || (glass.isLight ? "#0ea5e9" : "#60a5fa")}
              className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
            />
          )}
          {iconEl(r, 1.5)}
          <span className="text-[0.82em] truncate flex-1" style={{ color: textSub }}>{r.label}</span>
          <div className="flex items-baseline gap-[0.1em] shrink-0">
            <span className="font-semibold leading-none" style={{ fontSize: "1.5em", color: config?.color || textMain }}>{r.value}</span>
            {r.unit && <span style={{ fontSize: "0.75em", color: textSub }}>{r.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

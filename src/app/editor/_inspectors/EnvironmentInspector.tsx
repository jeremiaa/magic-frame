"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";
import LocationSearchInput from "../_components/LocationSearchInput";
import HAEntityInput from "../_components/HAEntityInput";
import IconPicker from "../_components/IconPicker";
import AccordionCard from "../_components/AccordionCard";

type HaSlot = { entityId?: string; icon?: string; label?: string; color?: string; unit?: string; decimals?: number };

// Inspector für das Umwelt-Widget: Standort, AQI-Skala, Kachel-Auswahl
// (Pollen/Luft/UV/Solar/Wind) und das Standard-Glass-Styling.

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-lime-500"></div>
      </div>
      <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{label}</span>
    </label>
  );
}

export function EnvironmentInspector({ widget, updateConfig }: { widget: any; updateConfig: (id: string, key: string, value: any) => void }) {
  const t = useT();
  const cfg = (widget.config ?? {}) as any;
  const set = (key: string, value: any) => updateConfig(widget.i, key, value);

  // Eigene HA-Sensoren (Zusatz-Kacheln) — Slot-Editor wie im Sensor-Widget.
  const slots: HaSlot[] = Array.isArray(cfg.haEntities) ? cfg.haEntities : [];
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const setSlots = (next: HaSlot[]) => set("haEntities", next);
  const updateSlot = (idx: number, key: keyof HaSlot, value: any) =>
    setSlots(slots.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  const removeSlot = (idx: number) => {
    setSlots(slots.filter((_, i) => i !== idx));
    if (openIdx === idx) setOpenIdx(null);
  };

  const inputCls =
    "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-lime-500/50";

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Standort")}</label>
        <LocationSearchInput
          onPick={(h) => {
            set("lat", h.lat);
            set("lon", h.lon);
          }}
        />
        {cfg.lat && cfg.lon ? (
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1.5">
            {t("Aktuell:")} {cfg.lat}, {cfg.lon}
          </p>
        ) : (
          <p className="text-[11px] text-amber-400/80 mt-1.5">{t("Noch kein Standort gewählt.")}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-[var(--mf-fg)]/50 block mb-1.5">{t("Breitengrad")}</label>
          <input type="text" value={cfg.lat ?? ""} onChange={(e) => set("lat", e.target.value)} placeholder="50.58" className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--mf-fg)]/50 block mb-1.5">{t("Längengrad")}</label>
          <input type="text" value={cfg.lon ?? ""} onChange={(e) => set("lon", e.target.value)} placeholder="8.68" className={inputCls} />
        </div>
      </div>
      <p className="text-[11px] text-[var(--mf-fg)]/40 -mt-3">
        {t("Daten von Open-Meteo (Luftqualität, Pollen, Solar). Pollen gibt es nur für Europa.")}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("AQI-Skala")}</label>
          <select value={cfg.aqiScale || "european"} onChange={(e) => set("aqiScale", e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
            <option value="european">{t("Europäisch (0–100)")}</option>
            <option value="us">{t("US EPA (0–500)")}</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Wind-Einheit")}</label>
          <select value={cfg.unitWind || "kmh"} onChange={(e) => set("unitWind", e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
            <option value="kmh">km/h</option>
            <option value="mph">mph</option>
            <option value="ms">m/s</option>
            <option value="kn">{t("Knoten")}</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--mf-bdr)]/10">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-3">{t("Kacheln")}</label>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Toggle checked={cfg.showAqi !== false} onChange={(v) => set("showAqi", v)} label={t("Luftqualität (AQI)")} />
          <Toggle checked={cfg.showPm25 !== false} onChange={(v) => set("showPm25", v)} label="PM2.5" />
          <Toggle checked={cfg.showPm10 === true} onChange={(v) => set("showPm10", v)} label="PM10" />
          <Toggle checked={cfg.showOzone === true} onChange={(v) => set("showOzone", v)} label={t("Ozon")} />
          <Toggle checked={cfg.showNo2 === true} onChange={(v) => set("showNo2", v)} label="NO₂" />
          <Toggle checked={cfg.showPollen !== false} onChange={(v) => set("showPollen", v)} label={t("Pollen")} />
          <Toggle checked={cfg.showUv === true} onChange={(v) => set("showUv", v)} label={t("UV-Index")} />
          <Toggle checked={cfg.showSolar === true} onChange={(v) => set("showSolar", v)} label={t("Solar (W/m²)")} />
          <Toggle checked={cfg.showWind === true} onChange={(v) => set("showWind", v)} label={t("Wind")} />
        </div>
        {cfg.showPollen !== false && (
          <div className="mt-3">
            <Toggle checked={cfg.hidePollenZero === true} onChange={(v) => set("hidePollenZero", v)} label={t("Nur aktive Pollen zeigen")} />
            <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1.5">
              {t("Blendet Pollenarten ohne aktuelle Belastung aus — außerhalb der Saison bleibt das Widget kompakt.")}
            </p>
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-[var(--mf-bdr)]/10 space-y-2.5">
          <Toggle checked={cfg.meteoconsIcons !== false} onChange={(v) => set("meteoconsIcons", v)} label={t("Meteocons-Icons")} />
          <p className="text-[11px] text-[var(--mf-fg)]/40">
            {t("Farbige Wetter-Illustrationen als Kachel-Icons — UV-Index, Windstärke und Pollen sogar wertbasiert. Aus = schlichte Linien-Icons.")}
          </p>
          {cfg.meteoconsIcons !== false && (
            <div className="grid grid-cols-2 gap-1.5 max-w-[16rem]">
              {([["fill", t("Gefüllt")], ["line", t("Umriss")]] as const).map(([val, lbl]) => {
                const active = (cfg.meteoconsStyle || "fill") === val;
                return (
                  <button key={val} type="button" onClick={() => set("meteoconsStyle", val)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${active ? "border-lime-500 bg-lime-500/10 text-[var(--mf-fg)]" : "border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"}`}>
                    {lbl}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--mf-bdr)]/10">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-1">{t("Eigene Sensoren (Home Assistant)")}</label>
        <p className="text-[11px] text-[var(--mf-fg)]/40 mb-3">
          {t("Zusätzliche Kacheln aus HA — z. B. DWD Pollenflug, PV-Leistung, CO2 oder eigene Feinstaub-Sensoren.")}
        </p>
        <div className="space-y-2">
          {slots.map((slot, idx) => (
            <AccordionCard
              key={idx}
              open={openIdx === idx}
              onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
              title={(slot.label ?? "").trim() || slot.entityId || t("Neuer Sensor")}
              dotColor={(slot.color ?? "").trim() || undefined}
              onDelete={() => removeSlot(idx)}
            >
              <div className="space-y-3">
                <HAEntityInput
                  value={slot.entityId || ""}
                  onChange={(v) => updateSlot(idx, "entityId", v)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Name (optional)")}</label>
                    <input type="text" value={slot.label || ""} onChange={(e) => updateSlot(idx, "label", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Einheit (optional)")}</label>
                    <input type="text" value={slot.unit || ""} onChange={(e) => updateSlot(idx, "unit", e.target.value)} placeholder="µg/m³" className={inputCls} />
                  </div>
                </div>
                <IconPicker
                  label={t("Icon")}
                  value={slot.icon || ""}
                  onChange={(iconId: string) => updateSlot(idx, "icon", iconId)}
                  placeholder="mdi:flower-pollen"
                  defaultPrefix="mdi"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Farbe (optional)")}</label>
                    <input type="color" value={(slot.color ?? "").trim() || "#84cc16"} onChange={(e) => updateSlot(idx, "color", e.target.value)} className="w-full h-10 rounded-lg bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Nachkommastellen")}</label>
                    <input type="number" min={0} max={3} value={slot.decimals ?? ""} placeholder={t("Auto")}
                      onChange={(e) => updateSlot(idx, "decimals", e.target.value === "" ? undefined : parseInt(e.target.value))} className={inputCls} />
                  </div>
                </div>
              </div>
            </AccordionCard>
          ))}
          <button
            type="button"
            onClick={() => {
              setSlots([...slots, { entityId: "" }]);
              setOpenIdx(slots.length);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--mf-bdr)]/20 hover:border-lime-500/40 hover:bg-lime-500/5 text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)] text-sm font-medium py-2.5 transition-colors"
          >
            <Plus size={15} />
            {t("Sensor hinzufügen")}
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--mf-bdr)]/10 space-y-4">
        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Helligkeit")}</label>
          <div className="grid grid-cols-3 gap-1.5">
            {([["auto", t("Automatisch")], ["dark", t("Dunkel")], ["light", t("Hell")]] as const).map(([val, lbl]) => {
              const active = (cfg.cardTheme || "auto") === val;
              return (
                <button key={val} type="button" onClick={() => set("cardTheme", val)}
                  className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors border ${active ? "border-lime-500 bg-lime-500/10 text-[var(--mf-fg)]" : "border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"}`}>
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
            <span>{t("Karten-Deckkraft")}</span>
            <span className="text-lime-400">{cfg.cardOpacity ?? 40}%</span>
          </label>
          <input type="range" min={0} max={100} step={5} value={cfg.cardOpacity ?? 40}
            onChange={(e) => set("cardOpacity", parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-lime-500 bg-[var(--mf-elev)]/10" />
        </div>
        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
            <span>{t("Hintergrund-Unschärfe")}</span>
            <span className="text-lime-400">{cfg.cardBlur ?? 12}px</span>
          </label>
          <input type="range" min={0} max={40} step={2} value={cfg.cardBlur ?? 12}
            onChange={(e) => set("cardBlur", parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-lime-500 bg-[var(--mf-elev)]/10" />
        </div>
      </div>
    </div>
  );
}

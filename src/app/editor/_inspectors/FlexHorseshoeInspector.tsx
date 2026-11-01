"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";
import HAEntityInput from "../_components/HAEntityInput";
import AccordionCard from "../_components/AccordionCard";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

type RingStyleType = "fixed" | "colorstop" | "interpolated" | "segments" | "gradient";

type Ring = {
  entityId: string;
  min: number;
  max: number;
  style: RingStyleType;
  stops?: string;
  thicknessPct?: number;
};

type EntityRow = {
  entityId: string;
  label?: string;
  color?: string;
};

const RING_STYLES: RingStyleType[] = ["fixed", "colorstop", "interpolated", "segments", "gradient"];

const RING_STYLE_LABELS: Record<RingStyleType, string> = {
  fixed: "Fixed colour",
  colorstop: "Colour stops (discrete)",
  interpolated: "Colour stops (interpolated)",
  segments: "Colour stops (segments)",
  gradient: "Gradient along arc",
};

const RING_COLORS: Record<RingStyleType, string> = {
  fixed: "#4dd0e1",
  colorstop: "#4caf50",
  interpolated: "#ff9800",
  segments: "#7986cb",
  gradient: "#ab47bc",
};

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500";

export function FlexHorseshoeInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};

  // ── Entities card-list ─────────────────────────────────────────────────
  const entities: EntityRow[] = Array.isArray(cfg.entities) ? cfg.entities : [];
  const [openEntity, setOpenEntity] = useState<number | null>(null);

  const setEntities = (next: EntityRow[]) => updateConfig(widget.i, "entities", next);
  const addEntity = () => {
    setEntities([...entities, { entityId: "" }]);
    setOpenEntity(entities.length);
  };
  const removeEntity = (idx: number) => {
    setEntities(entities.filter((_, i) => i !== idx));
    if (openEntity === idx) setOpenEntity(null);
  };
  const updateEntity = (idx: number, key: keyof EntityRow, value: any) =>
    setEntities(entities.map((e, i) => (i === idx ? { ...e, [key]: value } : e)));
  const moveEntity = (idx: number, dir: number) => {
    const target = idx + dir;
    if (target < 0 || target >= entities.length) return;
    const next = [...entities];
    [next[idx], next[target]] = [next[target], next[idx]];
    setEntities(next);
  };

  // ── Rings card-list ────────────────────────────────────────────────────
  const rings: Ring[] = Array.isArray(cfg.rings) ? cfg.rings : [];
  const [openRing, setOpenRing] = useState<number | null>(null);

  const setRings = (next: Ring[]) => updateConfig(widget.i, "rings", next);
  const addRing = () => {
    setRings([...rings, { entityId: "", min: 0, max: 100, style: "colorstop" }]);
    setOpenRing(rings.length);
  };
  const removeRing = (idx: number) => {
    setRings(rings.filter((_, i) => i !== idx));
    if (openRing === idx) setOpenRing(null);
  };
  const updateRing = (idx: number, key: keyof Ring, value: any) =>
    setRings(rings.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  const moveRing = (idx: number, dir: number) => {
    const target = idx + dir;
    if (target < 0 || target >= rings.length) return;
    const next = [...rings];
    [next[idx], next[target]] = [next[target], next[idx]];
    setRings(next);
  };

  // ── Render helpers ─────────────────────────────────────────────────────

  const renderColorPicker = (key: string, label: string, defaultValue: string) => {
    const val = cfg[key] ?? defaultValue;
    return (
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={val}
            onChange={(e) => updateConfig(widget.i, key, e.target.value)}
            className="h-9 w-14 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg cursor-pointer"
          />
          {cfg[key] ? (
            <button
              type="button"
              onClick={() => updateConfig(widget.i, key, undefined)}
              className="text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]"
            >
              {t("Default")}
            </button>
          ) : (
            <span className="text-xs text-[var(--mf-fg)]/40">{t("Default (no colour)")}</span>
          )}
        </div>
      </div>
    );
  };

  const renderRange = (
    key: string,
    label: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    suffix: string = "",
    toDisplay: (v: number) => string = String,
  ) => {
    const raw = cfg[key] ?? defaultValue;
    return (
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 mb-1.5 flex justify-between">
          <span>{label}</span>
          <span className="text-blue-400">{toDisplay(raw)}{suffix}</span>
        </label>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={raw}
          onChange={(e) => updateConfig(widget.i, key, parseFloat(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
        />
      </div>
    );
  };

  const renderSwitch = (key: string, label: string, defaultOn: boolean = false) => {
    const checked = defaultOn ? cfg[key] !== false : cfg[key] === true;
    return (
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => updateConfig(widget.i, key, e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-[var(--mf-elev)]/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
        </div>
        <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">
          {label}
        </span>
      </label>
    );
  };

  const renderNumber = (key: string, label: string, defaultValue: number) => {
    const raw = cfg[key] ?? defaultValue;
    return (
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{label}</label>
        <input
          type="number"
          value={raw}
          onChange={(e) => updateConfig(widget.i, key, parseFloat(e.target.value))}
          className={INPUT}
        />
      </div>
    );
  };

  const headerExtra = (idx: number, count: number, move: (idx: number, dir: number) => void) => (
    <div className="flex gap-0.5 shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); move(idx, -1); }}
        disabled={idx === 0}
        className="text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)] disabled:opacity-20 px-1.5 py-0.5 text-xs"
        title={t("Move up")}
      >
        ▲
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); move(idx, 1); }}
        disabled={idx === count - 1}
        className="text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)] disabled:opacity-20 px-1.5 py-0.5 text-xs"
        title={t("Move down")}
      >
        ▼
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── 1. Title ──────────────────────────────────────────────────────── */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Title")}</label>
        <input
          type="text"
          value={cfg.title || ""}
          onChange={(e) => updateConfig(widget.i, "title", e.target.value)}
          placeholder={t("Flex Horseshoe")}
          className={INPUT}
        />
      </div>

      {/* ── 2. Entities card-list ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Entities")}</label>
          <button
            onClick={addEntity}
            className="flex items-center gap-1.5 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Plus size={14} />
            {t("Add entity")}
          </button>
        </div>
        {entities.length === 0 && (
          <p className="text-xs text-[var(--mf-fg)]/40 px-1">{t("No entities yet — rows below the gauge come from this list. Entities used by rings are shown automatically.")}</p>
        )}
        {entities.map((ent, idx) => {
          const title = ent.label?.trim() || ent.entityId || `${t("Entity")} ${idx + 1}`;
          return (
            <AccordionCard
              key={idx}
              open={openEntity === idx}
              onToggle={() => setOpenEntity(openEntity === idx ? null : idx)}
              dotColor={ent.color}
              title={title}
              onDelete={() => removeEntity(idx)}
              headerExtra={headerExtra(idx, entities.length, moveEntity)}
            >
              <div className="space-y-3">
                <HAEntityInput
                  value={ent.entityId || ""}
                  onChange={(v) => updateEntity(idx, "entityId", v)}
                  placeholder="sensor.living_room_temperature"
                  clearable
                />
                <input
                  type="text"
                  value={ent.label || ""}
                  onChange={(e) => updateEntity(idx, "label", e.target.value)}
                  placeholder={t("Label (empty = HA name)")}
                  className={INPUT}
                />
                <div>
                  <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Colour")}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={ent.color || "#4dd0e1"}
                      onChange={(e) => updateEntity(idx, "color", e.target.value)}
                      className="h-9 w-14 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg cursor-pointer"
                    />
                    {ent.color ? (
                      <button
                        type="button"
                        onClick={() => updateEntity(idx, "color", undefined)}
                        className="text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]"
                      >
                        {t("Default")}
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--mf-fg)]/40">{t("Default (no colour)")}</span>
                    )}
                  </div>
                </div>
              </div>
            </AccordionCard>
          );
        })}
      </div>

      {/* ── 3. Rings card-list ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Gauge rings")}</label>
          <button
            onClick={addRing}
            className="flex items-center gap-1.5 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Plus size={14} />
            {t("Add ring")}
          </button>
        </div>
        <p className="text-xs text-[var(--mf-fg)]/40 px-1">
          {t("Rings are drawn from the outside in — the first ring's value shows large in the centre.")}
        </p>
        {rings.map((ring, idx) => {
          const title = ring.entityId || `${t("Ring")} ${idx + 1}`;
          const dotColor = RING_COLORS[ring.style] || "#4dd0e1";
          return (
            <AccordionCard
              key={idx}
              open={openRing === idx}
              onToggle={() => setOpenRing(openRing === idx ? null : idx)}
              dotColor={dotColor}
              title={title}
              onDelete={() => removeRing(idx)}
              headerExtra={headerExtra(idx, rings.length, moveRing)}
            >
              <div className="space-y-3">
                <HAEntityInput
                  value={ring.entityId || ""}
                  onChange={(v) => updateRing(idx, "entityId", v)}
                  placeholder="sensor.living_room_temperature"
                  clearable
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Min")}</label>
                    <input
                      type="number"
                      value={ring.min ?? 0}
                      onChange={(e) => updateRing(idx, "min", parseFloat(e.target.value))}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Max")}</label>
                    <input
                      type="number"
                      value={ring.max ?? 100}
                      onChange={(e) => updateRing(idx, "max", parseFloat(e.target.value))}
                      className={INPUT}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Colour style")}</label>
                  <select
                    value={ring.style || "colorstop"}
                    onChange={(e) => updateRing(idx, "style", e.target.value)}
                    className={INPUT}
                  >
                    {RING_STYLES.map((s) => (
                      <option key={s} value={s}>{RING_STYLE_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                {ring.style && ring.style !== "fixed" && (
                  <div>
                    <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">
                      {t("Colour stops")}
                    </label>
                    <input
                      type="text"
                      value={ring.stops || ""}
                      onChange={(e) => updateRing(idx, "stops", e.target.value)}
                      placeholder="0:#2196f3,20:#4caf50,30:#ff9800,40:#f44336"
                      className={`${INPUT} font-mono text-xs`}
                    />
                    <p className="text-xs text-[var(--mf-fg)]/40 mt-1">
                      {t("value:colour pairs, comma separated, ascending values")}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Thickness (% of radius)")}</label>
                  <input
                    type="number"
                    value={ring.thicknessPct ?? ""}
                    placeholder={t("Default")}
                    onChange={(e) =>
                      updateRing(idx, "thicknessPct", e.target.value === "" ? undefined : parseFloat(e.target.value))
                    }
                    className={INPUT}
                  />
                </div>
              </div>
            </AccordionCard>
          );
        })}
      </div>

      {/* ── 4. Geometry ───────────────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-[var(--mf-bdr)]/10 pt-3">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Geometry")}</label>
        {renderRange("arcDegrees", t("Arc degrees"), 90, 360, 5, 260, "°")}
        {renderRange("ringWidth", t("Ring width"), 4, 60, 1, 18, "%")}
        {renderRange("ringGap", t("Ring gap"), 0, 30, 1, 5, "%")}
      </div>

      {/* ── 5. Ticks & marker ─────────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-[var(--mf-bdr)]/10 pt-3">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Ticks & marker")}</label>
        <div className="flex flex-wrap gap-4">
          {renderSwitch("showTicks", t("Tick marks"))}
          {renderSwitch("showMarker", t("Value marker"))}
        </div>
        {renderRange("tickCount", t("Tick count"), 2, 60, 1, 11)}
        {renderRange("tickSize", t("Tick size"), 1, 30, 1, 6, "%")}
        {renderColorPicker("tickColor", t("Tick colour"), "#8a9099")}
        {renderColorPicker("markerColor", t("Marker colour"), "#ffffff")}
      </div>

      {/* ── 6. Values ─────────────────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-[var(--mf-bdr)]/10 pt-3">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Values")}</label>
        <div className="flex flex-wrap gap-4">
          {renderSwitch("showCentreValue", t("Big centre value"), true)}
          {renderSwitch("showUnit", t("Show units"), true)}
          {renderSwitch("showEntityList", t("Entity rows"), true)}
          {renderSwitch("showIcons", t("Entity icons"), true)}
        </div>
        {renderRange("centreScale", t("Centre value size"), 0.5, 3, 0.1, 1, "×", (v) => Number(v).toFixed(1))}
        {renderRange("decimals", t("Decimals"), 0, 3, 1, 1)}
      </div>

      {/* ── 7. Colours ────────────────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-[var(--mf-bdr)]/10 pt-3">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Colours")}</label>
        {renderColorPicker("trackColor", t("Track colour"), "#6b7280")}
        {renderColorPicker("fixedColor", t("Fixed colour"), "#4dd0e1")}
      </div>
    </div>
  );
}

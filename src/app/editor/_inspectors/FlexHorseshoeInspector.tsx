"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";
import HAEntityInput from "../_components/HAEntityInput";
import AccordionCard from "../_components/AccordionCard";
import IconPicker from "../_components/IconPicker";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

type RingStyleType = "fixed" | "colorstop" | "interpolated" | "segments" | "gradient";

/** Entity = gauge ring. Max two: first (mandatory) = outside, second = inside. */
type EntityCfg = {
  entityId: string;
  label?: string;
  color?: string;
  min?: number;
  max?: number;
  style?: RingStyleType;
  stops?: string;
  thicknessPct?: number;
  showRing?: boolean;
  showMarker?: boolean;
  unitOverride?: string;
  showUnit?: boolean;
  decimals?: number;
  // entity-row display - per entity
  showRowIcon?: boolean;
  showRowName?: boolean;
  showRowValue?: boolean;
  iconPlacement?: string;
  icon?: string;
  iconColor?: string;
  rowValueColor?: string;
  rowNameColor?: string;
  rowScale?: number;
  valuePlacement?: string;
  rowAlign?: string;
  // attention state (active-on-sensor) - per entity
  attentionOn?: boolean;
  attentionEntity?: string;
  attentionState?: string;
  attentionColor?: string;
  attentionShowText?: boolean;
  attentionTextMode?: string;
  attentionText?: string;
  attentionTextAlign?: string;
  attentionTextX?: number;
  attentionTextY?: number;
  attentionTextPulse?: boolean;
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

const ROW_PLACEMENTS: { value: string; label: string }[] = [
  { value: "far-left", label: "Far left" },
  { value: "before-name", label: "Before name" },
  { value: "after-name", label: "After name" },
  { value: "far-right", label: "Far right" },
];

const ROW_ALIGNS: { value: string; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500";

export function FlexHorseshoeInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};

  // ── Entities card-list (max 2) ──────────────────────────────────────────
  const entities: EntityCfg[] = Array.isArray(cfg.entities) ? cfg.entities : [];
  const [openEntity, setOpenEntity] = useState<number | null>(null);

  const setEntities = (next: EntityCfg[]) => updateConfig(widget.i, "entities", next);
  const addEntity = () => {
    if (entities.length >= 2) return;
    setEntities([...entities, { entityId: "" }]);
    setOpenEntity(entities.length);
  };
  const removeEntity = (idx: number) => {
    setEntities(entities.filter((_, i) => i !== idx));
    if (openEntity === idx) setOpenEntity(null);
  };
  const updateEntity = (idx: number, key: keyof EntityCfg, value: any) =>
    setEntities(entities.map((e, i) => (i === idx ? { ...e, [key]: value } : e)));
  const moveEntity = (idx: number, dir: number) => {
    const target = idx + dir;
    if (target < 0 || target >= entities.length) return;
    const next = [...entities];
    [next[idx], next[target]] = [next[target], next[idx]];
    setEntities(next);
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

  const renderSelect = (
    key: string,
    label: string,
    options: { value: string; label: string }[],
    defaultValue: string,
    numeric: boolean = false,
  ) => (
    <div>
      <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{label}</label>
      <select
        value={String(cfg[key] ?? defaultValue)}
        onChange={(e) => updateConfig(widget.i, key, numeric ? parseInt(e.target.value) : e.target.value)}
        className={INPUT}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.label)}
          </option>
        ))}
      </select>
    </div>
  );

  // Per-entity colour (writes into entities[idx][key]; undefined = automatic)
  const renderEntityColour = (idx: number, key: keyof EntityCfg, label: string, autoHint: string) => {
    const val = entities[idx][key] as string | undefined;
    return (
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={val || "#4dd0e1"}
            onChange={(e) => updateEntity(idx, key, e.target.value)}
            className="h-9 w-14 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg cursor-pointer"
          />
          {val ? (
            <button
              type="button"
              onClick={() => updateEntity(idx, key, undefined)}
              className="text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]"
            >
              {t("Reset")}
            </button>
          ) : (
            <span className="text-xs text-[var(--mf-fg)]/40">{autoHint}</span>
          )}
        </div>
      </div>
    );
  };

  // Per-entity switch (writes into entities[idx][key])
  const renderEntitySwitch = (idx: number, key: keyof EntityCfg, label: string, defaultOn: boolean) => {
    const ent = entities[idx];
    const checked = defaultOn ? ent[key] !== false : ent[key] === true;
    return (
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => updateEntity(idx, key, e.target.checked)}
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

  // Per-entity range (writes into entities[idx][key])
  const renderEntityRange = (
    idx: number,
    key: keyof EntityCfg,
    label: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
  ) => {
    const raw = (entities[idx][key] as number) ?? defaultValue;
    return (
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 mb-1.5 flex justify-between">
          <span>{label}</span>
          <span className="text-blue-400">{raw}</span>
        </label>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={raw}
          onChange={(e) => updateEntity(idx, key, parseFloat(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
        />
      </div>
    );
  };

  // Per-entity select (writes into entities[idx][key])
  const renderEntitySelect = (
    idx: number,
    key: keyof EntityCfg,
    label: string,
    options: { value: string; label: string }[],
    defaultValue: string,
  ) => (
    <div>
      <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{label}</label>
      <select
        value={String(entities[idx][key] ?? defaultValue)}
        onChange={(e) => updateEntity(idx, key, e.target.value)}
        className={INPUT}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.label)}
          </option>
        ))}
      </select>
    </div>
  );

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
      <div className="grid grid-cols-2 gap-2">
        {renderSelect(
          "titleAlign",
          "Title justification",
          [
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ],
          "left",
        )}
        {renderSelect(
          "titlePosition",
          "Title position",
          [
            { value: "top", label: "Top" },
            { value: "bottom", label: "Bottom" },
          ],
          "top",
        )}
      </div>

      {/* ── 1b. Widget layout ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Widget layout")}</label>
        {renderRange("outerPadding", t("Outer padding"), 0, 48, 1, 0, "px")}
        <p className="text-xs text-[var(--mf-fg)]/40">
          {t("Padding inside the tile, between the tile edge and this widget's content. 0 lets the content fill the whole widget - a background from the Layout tab adds no extra padding.")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {renderRange("contentOffsetX", t("Content horizontal fine-tune"), -100, 100, 1, 0, "px")}
          {renderRange("contentOffsetY", t("Content vertical fine-tune"), -100, 100, 1, 0, "px")}
        </div>
        <p className="text-xs text-[var(--mf-fg)]/40">
          {t("Nudges everything this widget draws (title, rows, gauge) in pixels, inside the tile.")}
        </p>
      </div>

      {/* ── 2. Entities (max two: first = outside, second = inside) ───────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Entities")}</label>
          <button
            onClick={addEntity}
            disabled={entities.length >= 2}
            className="flex items-center gap-1.5 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            {t("Add entity")}
          </button>
        </div>
        <p className="text-xs text-[var(--mf-fg)]/40 px-1">
          {t("Maximum two entities. The first (mandatory) entity is the main one drawn on the outside ring; the second (optional) is drawn on the inside. Each entity is one gauge ring.")}
        </p>
        {entities.length === 0 && (
          <p className="text-xs text-[var(--mf-fg)]/40 px-1">
            {t("No entities yet - add one to draw a horseshoe gauge.")}
          </p>
        )}
        {entities.map((ent, idx) => {
          const title = ent.label?.trim() || ent.entityId || `${t("Entity")} ${idx + 1}`;
          const dotColor = RING_COLORS[ent.style || "fixed"] || "#4dd0e1";
          return (
            <AccordionCard
              key={idx}
              open={openEntity === idx}
              onToggle={() => setOpenEntity(openEntity === idx ? null : idx)}
              dotColor={dotColor}
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
                <IconPicker
                  label={t("Custom icon")}
                  value={ent.icon || ""}
                  onChange={(iconId) => updateEntity(idx, "icon", iconId)}
                  placeholder="mdi:solar-power"
                  defaultPrefix="mdi"
                />
                <p className="text-xs text-[var(--mf-fg)]/40">
                  {t("Leave blank to use the icon Home Assistant provides for this entity.")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Min")}</label>
                    <input
                      type="number"
                      value={ent.min ?? 0}
                      onChange={(e) => updateEntity(idx, "min", parseFloat(e.target.value))}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Max")}</label>
                    <input
                      type="number"
                      value={ent.max ?? 100}
                      onChange={(e) => updateEntity(idx, "max", parseFloat(e.target.value))}
                      className={INPUT}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Colour style")}</label>
                  <select
                    value={ent.style || "fixed"}
                    onChange={(e) => updateEntity(idx, "style", e.target.value)}
                    className={INPUT}
                  >
                    {RING_STYLES.map((s) => (
                      <option key={s} value={s}>{RING_STYLE_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                {ent.style && ent.style !== "fixed" && (
                  <div>
                    <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">
                      {t("Colour stops")}
                    </label>
                    <input
                      type="text"
                      value={ent.stops || ""}
                      onChange={(e) => updateEntity(idx, "stops", e.target.value)}
                      placeholder="0:#2196f3,20:#4caf50,30:#ff9800"
                      className={`${INPUT} font-mono text-xs`}
                    />
                    <p className="text-xs text-[var(--mf-fg)]/40 mt-1">
                      {t("value:colour pairs, comma separated, ascending values")}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">
                    {t("Arc colour (fixed style + fallback)")}
                  </label>
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
                  <p className="text-xs text-[var(--mf-fg)]/40 mt-1">
                    {t("Draws the arc for the Fixed colour style, and is the fallback for the row value and centre value colours when the style has no usable stops.")}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">
                    {t("Ring thickness (% of radius)")}
                  </label>
                  <input
                    type="number"
                    value={ent.thicknessPct ?? ""}
                    placeholder={t("Default")}
                    onChange={(e) =>
                      updateEntity(idx, "thicknessPct", e.target.value === "" ? undefined : parseFloat(e.target.value))
                    }
                    className={INPUT}
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  {renderEntitySwitch(idx, "showRing", t("Horseshoe arc"), true)}
                  {renderEntitySwitch(idx, "showMarker", t("Value marker"), false)}
                </div>

                <div className="border-t border-[var(--mf-bdr)]/10 pt-3 space-y-3">
                  <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Value")}</label>
                  <div className="flex flex-wrap gap-4">
                    {renderEntitySwitch(idx, "showUnit", t("Show unit"), true)}
                  </div>
                  <div>
                    <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">
                      {t("Unit override (empty = HA unit)")}
                    </label>
                    <input
                      type="text"
                      value={ent.unitOverride || ""}
                      onChange={(e) => updateEntity(idx, "unitOverride", e.target.value)}
                      placeholder="°C, kW, %…"
                      className={INPUT}
                    />
                  </div>
                  {renderEntityRange(idx, "decimals", t("Decimals"), 0, 3, 1, 1)}
                </div>

                <div className="border-t border-[var(--mf-bdr)]/10 pt-3 space-y-3">
                  <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Entity row")}</label>
                  <p className="text-xs text-[var(--mf-fg)]/40">
                    {t("The row shows when any of these is on. Far left / far right pin to the row edges; before name / after name sit beside the name, positioned by the row justification.")}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {renderEntitySwitch(idx, "showRowIcon", t("Icon"), true)}
                    {renderEntitySwitch(idx, "showRowName", t("Name"), true)}
                    {renderEntitySwitch(idx, "showRowValue", t("Value"), true)}
                  </div>
                  {renderEntitySelect(idx, "iconPlacement", t("Icon justification"), ROW_PLACEMENTS, "before-name")}
                  {renderEntitySelect(idx, "valuePlacement", t("Value justification"), ROW_PLACEMENTS, "far-right")}
                  {renderEntitySelect(idx, "rowAlign", t("Row justification"), ROW_ALIGNS, "left")}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {renderEntityColour(idx, "iconColor", t("Icon colour"), t("Automatic (widget text)"))}
                    {renderEntityColour(idx, "rowValueColor", t("Value colour"), t("Automatic (value colour)"))}
                    {renderEntityColour(idx, "rowNameColor", t("Name colour"), t("Automatic (dimmed text)"))}
                  </div>
                  {renderEntityRange(idx, "rowScale", t("Row scale (icon, name, value)"), 0.5, 2, 0.1, 1)}
                </div>

                <div className="border-t border-[var(--mf-bdr)]/10 pt-3 space-y-3">
                  <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Attention state")}</label>
                  <p className="text-xs text-[var(--mf-fg)]/40">
                    {t("While the watched entity holds the active state, this entity's icon takes the attention colour - with Automatic it keeps the icon's own colour. A status text can sit anywhere on the widget while active.")}
                  </p>
                  {renderEntitySwitch(idx, "attentionOn", t("Active on sensor"), false)}
                  {ent.attentionOn === true && (
                    <>
                      <HAEntityInput
                        value={ent.attentionEntity || ""}
                        onChange={(v) => updateEntity(idx, "attentionEntity", v)}
                        placeholder={t("binary_sensor.door (empty = this entity)")}
                        clearable
                      />
                      <div>
                        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">
                          {t("Active state (empty = any but off)")}
                        </label>
                        <input
                          type="text"
                          value={ent.attentionState || ""}
                          onChange={(e) => updateEntity(idx, "attentionState", e.target.value)}
                          placeholder="on"
                          className={INPUT}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {renderEntityColour(idx, "attentionColor", t("Attention icon colour"), t("Automatic (icon colour)"))}
                      </div>
                      {renderEntitySwitch(idx, "attentionShowText", t("Show status text while active"), false)}
                      {ent.attentionShowText === true && (
                        <div className="rounded-xl border border-[var(--mf-bdr)]/10 bg-[var(--mf-elev)]/[0.02] p-3 space-y-3">
                          {renderEntitySelect(
                            idx,
                            "attentionTextMode",
                            t("Text source"),
                            [
                              { value: "state", label: "Watched entity state" },
                              { value: "custom", label: "Custom text" },
                            ],
                            "state",
                          )}
                          {ent.attentionTextMode === "custom" && (
                            <div>
                              <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">
                                {t("Status text")}
                              </label>
                              <input
                                type="text"
                                value={ent.attentionText || ""}
                                onChange={(e) => updateEntity(idx, "attentionText", e.target.value)}
                                placeholder={t("Door open")}
                                className={INPUT}
                              />
                            </div>
                          )}
                          {renderEntitySelect(idx, "attentionTextAlign", t("Text justification"), ROW_ALIGNS, "center")}
                          {renderEntityRange(idx, "attentionTextX", t("Text horizontal position"), 0, 100, 1, 50)}
                          {renderEntityRange(idx, "attentionTextY", t("Text vertical position"), 0, 100, 1, 50)}
                          <p className="text-xs text-[var(--mf-fg)]/40">
                            {t("Percent of the widget width/height - the text anchors there and justifies left/centre/right around the anchor.")}
                          </p>
                          {renderEntitySwitch(idx, "attentionTextPulse", t("Pulse text"), true)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </AccordionCard>
          );
        })}
      </div>

      {/* ── 3. Rows position ──────────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-[var(--mf-bdr)]/10 pt-3">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Rows position")}</label>
        <p className="text-xs text-[var(--mf-fg)]/40">
          {t("Each entity's row shows whenever its icon, name or value is toggled on inside the entity above.")}
        </p>
        {renderSelect(
          "entityListPosition",
          "Rows relative to gauge",
          [
            { value: "below", label: "Below horseshoe" },
            { value: "above", label: "Above horseshoe" },
          ],
          "below",
        )}
        {renderRange(
          "entityListOffset",
          "Rows offset from arc",
          -3,
          3,
          0.1,
          0,
          "em",
          (v) => Number(v).toFixed(1),
        )}
        <p className="text-xs text-[var(--mf-fg)]/40">
          {t("The rows start snug against the arc ends at 0 em. Positive pushes them further from the horseshoe, negative pulls them up into its mouth (they can overlap the arc).")}
        </p>
      </div>

      {/* ── 4. Big centre value ───────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-[var(--mf-bdr)]/10 pt-3">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Big centre value")}</label>
        <div className="flex flex-wrap gap-4">
          {renderSwitch("showCentreValue", t("Show centre value"), true)}
          {renderSwitch("showCentreIcon", t("Entity icon above value"), false)}
          {renderSwitch("centreShowUnit", t("Show unit"), true)}
        </div>
        {renderSelect(
          "centreEntity",
          "Centre value entity",
          [
            { value: "0", label: "First entity (outside)" },
            { value: "1", label: "Second entity (inside)" },
          ],
          "0",
          true,
        )}
        {renderSelect(
          "centreUnitPosition",
          "Centre unit position",
          [
            { value: "below", label: "Below value (stacked)" },
            { value: "above", label: "Above value (stacked)" },
            { value: "before", label: "Before value (inline)" },
            { value: "after", label: "After value (inline)" },
          ],
          "below",
        )}
        {renderRange(
          "centreUnitOffset",
          "Unit vertical offset",
          -2,
          2,
          0.1,
          0,
          "em",
          (v) => Number(v).toFixed(1),
        )}
        <p className="text-xs text-[var(--mf-fg)]/40">
          Positive raises the unit above the value baseline, negative lowers it. 0 leaves it sitting in line with the value text.
        </p>
        {renderSelect(
          "centreIconAlign",
          "Centre icon justification",
          [
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ],
          "center",
        )}
        <p className="text-xs text-[var(--mf-fg)]/40">
          {t("Justifies the entity icon left/centre/right within the centre value block.")}
        </p>
        {renderSelect(
          "centreColourMode",
          "Centre value colour",
          [
            { value: "value", label: "Match the value colour along the arc" },
            { value: "text", label: "Widget default text colour" },
          ],
          "value",
        )}
        <p className="text-xs text-[var(--mf-fg)]/40">
          {t("Match the value colour follows the arc/gradient at the current value (the previous behaviour); the widget default text colour uses the Text & colour tab colour instead.")}
        </p>
        {renderRange("centreScale", t("Centre value size"), 0.5, 3, 0.1, 1, "×", (v) => Number(v).toFixed(1))}
        <p className="text-xs text-[var(--mf-fg)]/40">
          {t("The master size scales the whole centre block. The per-item scales below multiply on top of it.")}
        </p>
        {renderRange("centreIconScale", t("Centre icon scale"), 0.1, 3, 0.1, 1, "×", (v) => Number(v).toFixed(1))}
        {renderRange("centreValueScale", t("Centre value scale"), 0.1, 3, 0.1, 1, "×", (v) => Number(v).toFixed(1))}
        {renderRange("centreUnitScale", t("Centre unit scale"), 0.1, 3, 0.1, 1, "×", (v) => Number(v).toFixed(1))}
        {renderRange("centreIconY", t("Centre icon vertical position"), 0, 100, 1, 50, "%")}
        <p className="text-xs text-[var(--mf-fg)]/40">
          {t("50 keeps the icon just above the value. 0 lifts it half the gauge height, 100 lowers it half.")}
        </p>
        {renderRange("centreValueY", t("Centre value + unit vertical position"), 0, 100, 1, 50, "%")}
        <p className="text-xs text-[var(--mf-fg)]/40">
          {t("50 keeps the value and unit centred in the horseshoe. 0 lifts them half the gauge height, 100 lowers them half. One slider moves both together; the icon keeps its own slider above.")}
        </p>
      </div>

      {/* ── 5. Geometry ───────────────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-[var(--mf-bdr)]/10 pt-3">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Geometry")}</label>
        {renderRange("arcDegrees", t("Arc degrees"), 90, 360, 5, 260, "°")}
        {renderRange("ringWidth", t("Ring width (default)"), 4, 60, 1, 18, "%")}
        {renderRange("ringGap", t("Ring gap"), 0, 30, 1, 5, "%")}
      </div>

      {/* ── 6. Ticks ──────────────────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-[var(--mf-bdr)]/10 pt-3">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Ticks")}</label>
        <div className="flex flex-wrap gap-4">
          {renderSwitch("showTicks", t("Tick marks"))}
        </div>
        {renderRange("tickCount", t("Tick count"), 2, 60, 1, 11)}
        {renderRange("tickSize", t("Tick size"), 1, 30, 1, 6, "%")}
        {renderColorPicker("tickColor", t("Tick colour"), "#8a9099")}
        {renderColorPicker("markerColor", t("Marker colour"), "#ffffff")}
      </div>

      {/* ── 7. Colours ────────────────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-[var(--mf-bdr)]/10 pt-3">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Colours")}</label>
        <div className="flex flex-wrap gap-4">
          {renderSwitch("showTrack", t("Track arc (shaded part after the value)"), true)}
        </div>
        {renderRange("trackOpacity", t("Track visibility"), 0, 100, 1, 38, "%")}
        {renderSwitch("trackGradient", t("Track follows gradient colours"), false)}
        {renderColorPicker("trackColor", t("Track colour"), "#6b7280")}
        {renderColorPicker("fixedColor", t("Fixed colour"), "#4dd0e1")}
      </div>
    </div>
  );
}

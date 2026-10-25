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

type FlowType = "grid" | "solar" | "battery" | "consumer";

type Flow = {
  entityId: string;
  label?: string;
  color?: string;
  type: FlowType;
};

const FLOW_TYPES: FlowType[] = ["grid", "solar", "battery", "consumer"];

const FLOW_LABELS: Record<FlowType, string> = {
  grid: "Grid",
  solar: "Solar",
  battery: "Battery",
  consumer: "Consumer",
};

const FLOW_COLORS: Record<FlowType, string> = {
  grid: "#6366f1",
  solar: "#f59e0b",
  battery: "#10b981",
  consumer: "#ef4444",
};

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500";

export function PowerSankeyInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};

  // ── Flows card-list ──────────────────────────────────────────────────────
  const flows: Flow[] = Array.isArray(cfg.flows) ? cfg.flows : [];
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const setFlows = (next: Flow[]) => updateConfig(widget.i, "flows", next);
  const addFlow = () => {
    setFlows([...flows, { entityId: "", type: "solar" }]);
    setOpenIdx(flows.length);
  };
  const removeFlow = (idx: number) => {
    setFlows(flows.filter((_, i) => i !== idx));
    if (openIdx === idx) setOpenIdx(null);
  };
  const updateFlow = (idx: number, key: keyof Flow, value: any) =>
    setFlows(flows.map((f, i) => (i === idx ? { ...f, [key]: value } : f)));
  const moveFlow = (idx: number, dir: number) => {
    const target = idx + dir;
    if (target < 0 || target >= flows.length) return;
    const next = [...flows];
    [next[idx], next[target]] = [next[target], next[idx]];
    setFlows(next);
  };

  // ── Render helpers ───────────────────────────────────────────────────────

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

  const renderSwitch = (key: string, label: string) => {
    const checked = cfg[key] === true;
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

  return (
    <div className="space-y-4">
      {/* ── 1. Title ──────────────────────────────────────────────────────── */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Title")}</label>
        <input
          type="text"
          value={cfg.title || ""}
          onChange={(e) => updateConfig(widget.i, "title", e.target.value)}
          placeholder={t("Power Sankey")}
          className={INPUT}
        />
      </div>

      {/* ── 2. Flows card-list ────────────────────────────────────────────── */}
      <div className="space-y-3">
        {flows.length === 0 && (
          <p className="text-xs text-[var(--mf-fg)]/40 px-1">{t("No flows yet — add one below.")}</p>
        )}
        {flows.map((flow, idx) => {
          const typeLabel = FLOW_LABELS[flow.type] || flow.type;
          const title = flow.label?.trim()
            ? `${typeLabel}: ${flow.label}`
            : flow.entityId
              ? `${typeLabel}: ${flow.entityId}`
              : `${typeLabel} ${idx + 1}`;
          const dotColor = flow.color || FLOW_COLORS[flow.type];

          return (
            <AccordionCard
              key={idx}
              open={openIdx === idx}
              onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
              dotColor={dotColor}
              title={title}
              onDelete={() => removeFlow(idx)}
              headerExtra={
                <div className="flex gap-0.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveFlow(idx, -1); }}
                    disabled={idx === 0}
                    className="text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)] disabled:opacity-20 px-1.5 py-0.5 text-xs"
                    title={t("Move up")}
                  >
                    ▲
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveFlow(idx, 1); }}
                    disabled={idx === flows.length - 1}
                    className="text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)] disabled:opacity-20 px-1.5 py-0.5 text-xs"
                    title={t("Move down")}
                  >
                    ▼
                  </button>
                </div>
              }
            >
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Type")}</label>
                  <select
                    value={flow.type}
                    onChange={(e) => updateFlow(idx, "type", e.target.value)}
                    className={INPUT}
                  >
                    {FLOW_TYPES.map((tp) => (
                      <option key={tp} value={tp}>{FLOW_LABELS[tp]}</option>
                    ))}
                  </select>
                </div>

                <HAEntityInput
                  value={flow.entityId || ""}
                  onChange={(v) => updateFlow(idx, "entityId", v)}
                  placeholder="sensor.grid_power"
                  clearable
                />

                <input
                  type="text"
                  value={flow.label || ""}
                  onChange={(e) => updateFlow(idx, "label", e.target.value)}
                  placeholder={t("Label (empty = HA name)")}
                  className={INPUT}
                />

                <div>
                  <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Colour")}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={flow.color || dotColor}
                      onChange={(e) => updateFlow(idx, "color", e.target.value)}
                      className="h-9 w-14 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg cursor-pointer"
                    />
                    {flow.color ? (
                      <button
                        type="button"
                        onClick={() => updateFlow(idx, "color", undefined)}
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

      <button
        type="button"
        onClick={addFlow}
        className="w-full flex items-center justify-center gap-2 bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/20 text-[var(--mf-fg)] py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        <Plus size={16} /> {t("Add flow")}
      </button>

      {/* ── 3. Appearance settings ────────────────────────────────────────── */}
      <div className="border-t border-[var(--mf-bdr)]/10 pt-4 space-y-3">
        <p className="text-xs text-[var(--mf-fg)]/40 uppercase tracking-wider px-1">{t("Appearance")}</p>

        <input
          type="text"
          value={cfg.homeLabel || ""}
          onChange={(e) => updateConfig(widget.i, "homeLabel", e.target.value)}
          placeholder={t("Home node label")}
          className={INPUT}
        />

        <input
          type="text"
          value={cfg.otherLabel || ""}
          onChange={(e) => updateConfig(widget.i, "otherLabel", e.target.value)}
          placeholder={t("Untracked node label")}
          className={INPUT}
        />

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {renderSwitch("showOther", "Show untracked consumption")}
          {renderSwitch("sourceLabelFirst", "Sources: name before value")}
          {renderSwitch("consumerLabelFirst", "Consumers: name before value")}
        </div>
      </div>

      {/* ─ 4. Icon toggles ────────────────────────────────────────────────── */}
      <div className="border-t border-[var(--mf-bdr)]/10 pt-4 space-y-3">
        <p className="text-xs text-[var(--mf-fg)]/40 uppercase tracking-wider px-1">{t("Icons")}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {renderSwitch("showSourceIcons", "Show HA entity icons on sources")}
          {renderSwitch("iconOnlySources", "Icons only (hide source names)")}
          {renderSwitch("showConsumerIcons", "Show HA entity icons on consumers")}
          {renderSwitch("iconOnlyConsumers", "Icons only (hide consumer names)")}
        </div>
      </div>

      {/* ── 5. Range sliders ──────────────────────────────────────────────── */}
      <div className="border-t border-[var(--mf-bdr)]/10 pt-4 space-y-3">
        <p className="text-xs text-[var(--mf-fg)]/40 uppercase tracking-wider px-1">{t("Scaling")}</p>
        {renderRange("batteryIconScale", "Battery Icon Scale", 0.5, 4, 0.1, 1, "%", (v) => String(Math.round(v * 100)))}
        {renderRange("minFlowW", "Minimum flow (W)", 0, 100, 1, 0, "W")}
        {renderRange("iconSize", "Icon size", 0.6, 2.4, 0.1, 1, "%", (v) => String(Math.round(v * 100)))}
      </div>

      {/* ── 6. Colour pickers ─────────────────────────────────────────────── */}
      <div className="border-t border-[var(--mf-bdr)]/10 pt-4 space-y-3">
        <p className="text-xs text-[var(--mf-fg)]/40 uppercase tracking-wider px-1">{t("Colours")}</p>
        {renderColorPicker("importColor", "Grid import colour", "#10b981")}
        {renderColorPicker("exportColor", "Grid export colour", "#ef4444")}
        {renderColorPicker("solarColor", "Solar colour", "#f59e0b")}
        {renderColorPicker("batteryOutColor", "Battery discharge colour", "#3b82f6")}
        {renderColorPicker("batteryInColor", "Battery charge colour", "#10b981")}
        {renderColorPicker("consumerColor", "Consumer colour (default)", "#ef4444")}
      </div>

      {/* ── 7. Legacy sensors ─────────────────────────────────────────────── */}
      <AccordionCard
        open={cfg._legacyOpen === true}
        onToggle={() => updateConfig(widget.i, "_legacyOpen", !cfg._legacyOpen)}
        title={t("Legacy sensors")}
      >
        <div className="space-y-3">
          <input
            type="text"
            value={cfg.gridSensor || ""}
            onChange={(e) => updateConfig(widget.i, "gridSensor", e.target.value)}
            placeholder="sensor.grid_power"
            className={INPUT}
          />
          <input
            type="text"
            value={cfg.solarSensor || ""}
            onChange={(e) => updateConfig(widget.i, "solarSensor", e.target.value)}
            placeholder="sensor.solar_power"
            className={INPUT}
          />
          <input
            type="text"
            value={cfg.batteryPowerSensor || ""}
            onChange={(e) => updateConfig(widget.i, "batteryPowerSensor", e.target.value)}
            placeholder="sensor.battery_power"
            className={INPUT}
          />
          <input
            type="text"
            value={cfg.batteryLevelSensor || ""}
            onChange={(e) => updateConfig(widget.i, "batteryLevelSensor", e.target.value)}
            placeholder="sensor.battery_level"
            className={INPUT}
          />
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {renderSwitch("invertGrid", "Invert grid sensor")}
            {renderSwitch("invertBattery", "Invert battery sensor")}
          </div>
        </div>
      </AccordionCard>
    </div>
  );
}
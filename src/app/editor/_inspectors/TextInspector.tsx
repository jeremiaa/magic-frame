"use client";

import React from "react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";
import IconPicker from "../_components/IconPicker";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-sky-500";

function Seg({ value, options, onChange }: { value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors border ${
              active ? "border-sky-500 bg-sky-500/10 text-sky-400" : "border-[var(--mf-bdr)]/10 bg-[var(--mf-surface)] text-[var(--mf-fg)]/70 hover:border-[var(--mf-bdr)]/25"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group px-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="appearance-none w-5 h-5 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-sky-500 checked:border-sky-500 transition-colors shrink-0"
      />
      <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)]">{label}</span>
    </label>
  );
}

export default function TextInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  const set = (key: string, value: any) => updateConfig(widget.i, key, value);

  return (
    <div className="space-y-5">
      {/* Text */}
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block">{t("Text")}</label>
        <input
          value={cfg.text || ""}
          onChange={(e) => set("text", e.target.value)}
          placeholder={t("z.B. Heute im Angebot")}
          className={INPUT}
        />
        <input
          value={cfg.subtext || ""}
          onChange={(e) => set("subtext", e.target.value)}
          placeholder={t("Zweite Zeile (optional)")}
          className={INPUT}
        />
        <p className="text-xs text-[var(--mf-fg)]/40 px-1 leading-relaxed">
          {t("Schriftgröße, Farbe und Schriftart stellst du im Reiter „Text“ ein — wie bei jedem Widget.")}
        </p>
      </div>

      {/* Ausrichtung */}
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block">{t("Ausrichtung")}</label>
        <Seg
          value={cfg.align || "left"}
          onChange={(v) => set("align", v)}
          options={[{ v: "left", label: t("Links") }, { v: "center", label: t("Mitte") }, { v: "right", label: t("Rechts") }]}
        />
        <Seg
          value={cfg.vAlign || "middle"}
          onChange={(v) => set("vAlign", v)}
          options={[{ v: "top", label: t("Oben") }, { v: "middle", label: t("Mittig") }, { v: "bottom", label: t("Unten") }]}
        />
        <p className="text-xs text-[var(--mf-fg)]/40 px-1 leading-relaxed">
          {t("Senkrecht „Unten“ setzt die Überschrift direkt über das Widget darunter.")}
        </p>
      </div>

      {/* Icon */}
      <div className="space-y-2.5">
        <IconPicker
          label={t("Icon (optional)")}
          value={cfg.icon || ""}
          onChange={(v) => set("icon", v)}
          defaultPrefix="lucide"
        />
        {(cfg.icon || "").trim() !== "" && (
          <div>
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
              <span>{t("Icon-Größe")}</span>
              <span className="text-sky-400">{Math.round(Number(cfg.iconScale) || 110)}%</span>
            </label>
            <input
              type="range"
              min={20}
              max={400}
              step={10}
              value={Number(cfg.iconScale) || 110}
              onChange={(e) => set("iconScale", parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--mf-elev)]/10"
            />
          </div>
        )}
      </div>

      {/* Stil */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block">{t("Stil")}</label>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Check label={t("Großbuchstaben")} checked={cfg.uppercase === true} onChange={(v) => set("uppercase", v)} />
          <Check label={t("Trennlinie darunter")} checked={cfg.divider === true} onChange={(v) => set("divider", v)} />
        </div>
        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
            <span>{t("Laufweite")}</span>
            <span className="text-sky-400">{(Number(cfg.letterSpacing) || 0) / 100}em</span>
          </label>
          <input
            type="range"
            min={-10}
            max={50}
            step={1}
            value={Number(cfg.letterSpacing) || 0}
            onChange={(e) => set("letterSpacing", parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--mf-elev)]/10"
          />
        </div>
        {(cfg.subtext || "").trim() !== "" && (
          <div>
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
              <span>{t("Größe der zweiten Zeile")}</span>
              <span className="text-sky-400">{Math.round(Number(cfg.subtextScale) || 60)}%</span>
            </label>
            <input
              type="range"
              min={20}
              max={200}
              step={5}
              value={Number(cfg.subtextScale) || 60}
              onChange={(e) => set("subtextScale", parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--mf-elev)]/10"
            />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Copy, Trash2, X, LayoutGrid, Type, SlidersHorizontal } from "lucide-react";
import type { WidgetLayoutItem } from "../_types";
import { widgetTitle, isAutoDefaultLabel } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";
import CollapsibleSection from "./CollapsibleSection";
import { accentFor, widgetIconFor } from "./widget-visuals";
import WidgetPreview from "./WidgetPreview";
import ClockInspector from "../_inspectors/ClockInspector";
import WeatherInspector from "../_inspectors/WeatherInspector";
import ButtonInspector from "../_inspectors/ButtonInspector";
import CalendarInspector from "../_inspectors/CalendarInspector";
import HomeAssistantInspector from "../_inspectors/HomeAssistantInspector";
import HANotificationInspector from "../_inspectors/HANotificationInspector";
import {
  TimerInspector,
  MessagesInspector,
  ShoppingInspector,
  TodosInspector,
} from "../_inspectors/CompanionInspectors";
import { ImageInspector } from "../_inspectors/ImageInspector";
import { SensorInspector } from "../_inspectors/SensorInspector";
import { EnvironmentInspector } from "../_inspectors/EnvironmentInspector";
import CameraInspector from "../_inspectors/CameraInspector";
import { MediaPlayerInspector } from "../_inspectors/MediaPlayerInspector";
import RssInspector from "../_inspectors/RssInspector";
import QrInspector from "../_inspectors/QrInspector";
import StatusInspector from "../_inspectors/StatusInspector";
import CustomModuleInspector from "../_inspectors/CustomModuleInspector";
import HAEntityInput from "./HAEntityInput";

type InspectorPanelProps = {
  activeWidget: WidgetLayoutItem;
  layout: WidgetLayoutItem[];
  /** View läuft im Randlos-Modus → "Schwebende Karte"-Schalter anbieten. */
  edgeToEdge?: boolean;
  onClose: () => void;
  updateLayoutGrid: (i: string, key: string, value: number) => void;
  updateOpacity: (i: string, opacity: number) => void;
  updateConfig: (i: string, key: string, value: any) => void;
  updateLabel: (i: string, label: string) => void;
  copyWidgetToClipboard: (widget: any) => void;
  removeWidget: (id: string) => void;
  citySearchQuery: string;
  citySearchResults: any[];
  isSearchingCity: boolean;
  searchCity: (query: string) => void;
  setCitySearchResults: (v: any[]) => void;
  setCitySearchQuery: (v: string) => void;
  buttonTab: string;
  setButtonTab: (v: string) => void;
  /** false = die Live-Vorschau rendert der Host in einer eigenen Spalte
   *  (breites Layout) — hier dann nicht doppelt mounten. */
  showPreview?: boolean;
};

type Tab = "layout" | "text" | "content";

const TYPE_LABELS: Record<string, string> = {
  "ClockWidget.tsx": "Uhr",
  "WeatherWidget.tsx": "Wetter",
  "CalendarWidget.tsx": "Kalender",
  "HomeAssistantWidget.tsx": "HA Entity",
  "ButtonWidget.tsx": "Buttons",
  "HANotificationWidget.tsx": "Benachrichtigungen",
};

// Inspektoren mit dynamischen Karten-Listen (Regeln/Feeds/Entities/Buttons)
// vertragen kein balanciertes Multi-Column-Layout — eine Karte ist höher als
// eine halbe Spalte, das Balancing reißt dann Lücken und macht Inhalte schwer
// erreichbar. Diese bekommen im Inhalt-Tab volle Breite (eine Spalte, scrollbar).
const NO_MULTICOL_CONTENT = new Set<string>([
  "HANotificationWidget.tsx",
  "CalendarWidget.tsx",
  "HomeAssistantWidget.tsx",
  "ButtonWidget.tsx",
  "ShoppingListWidget.tsx",
  "TodosWidget.tsx",
  "ImageWidget.tsx",
  "SensorWidget.tsx",
  "EnvironmentWidget.tsx",
  "CameraWidget.tsx",
  // Die Status-Felder sind EIN zusammenhängender Block (break-inside: avoid),
  // der sich nicht auf zwei Spalten verteilen lässt — er füllte Spalte 1 und
  // ließ rechts eine leere Spalte mit nur dem Schlusssatz stehen.
  "StatusWidget.tsx",
]);

export default function InspectorPanel(props: InspectorPanelProps) {
  const { activeWidget, onClose, copyWidgetToClipboard, removeWidget } = props;
  const t = useT();
  const [tab, setTab] = useState<Tab>("layout");

  const typeLabel = t(TYPE_LABELS[activeWidget.type] ?? activeWidget.type.replace("Widget.tsx", ""));
  const accent = accentFor(activeWidget.type);

  // Layout/Text-Tabs sind immer gleichförmig → 2 Spalten. Inhalt nur bei
  // Feld-basierten Widgets (Uhr/Wetter/Companion).
  const useCols = tab !== "content" || !NO_MULTICOL_CONTENT.has(activeWidget.type);

  return (
    <div className="h-full md:h-auto md:max-h-[88vh] w-full flex flex-col bg-[var(--mf-surface)] overflow-hidden nodrag md:rounded-2xl md:border md:border-[var(--mf-bdr)]/10 md:shadow-2xl">
      <header className="flex items-center gap-3 px-4 h-14 border-b border-[var(--mf-bdr)]/10 shrink-0">
        {/* Typ-Icon in der Akzentfarbe des Widgets — dieselbe Zuordnung wie
            in Palette und Ebenen-Liste, damit man sofort sieht, was man
            gerade bearbeitet. Custom-Module fallen auf das Regler-Icon zurück. */}
        <div
          className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
          style={{ color: accent.hex, backgroundColor: accent.tint, borderColor: `${accent.hex}33` }}
        >
          {widgetIconFor(activeWidget.type, 16) ?? <SlidersHorizontal size={15} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--mf-fg)]/40 font-medium">
            {typeLabel}
          </div>
          <div className="text-sm font-semibold text-[var(--mf-fg)] truncate">
            {widgetTitle(activeWidget.type, activeWidget.label, t)}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5 transition-colors"
          title={t("Schließen (Esc)")}
        >
          <X size={15} />
        </button>
      </header>

      <div className="flex border-b border-[var(--mf-bdr)]/10 shrink-0 px-2 pt-2 gap-1">
        <TabButton active={tab === "layout"} onClick={() => setTab("layout")} icon={<LayoutGrid size={13} />} label={t("Layout")} />
        <TabButton active={tab === "text"} onClick={() => setTab("text")} icon={<Type size={13} />} label={t("Text & Farbe")} />
        <TabButton active={tab === "content"} onClick={() => setTab("content")} icon={<SlidersHorizontal size={13} />} label={t("Inhalt")} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">
        <div className={useCols ? "settings-cols" : ""}>
          {tab === "layout" && <LayoutTab {...props} />}
          {tab === "text" && <TextTab {...props} />}
          {tab === "content" && <ContentTab {...props} />}
        </div>
      </div>

      <footer className="shrink-0 border-t border-[var(--mf-bdr)]/10 px-4 py-3 flex gap-2 bg-[var(--mf-surface)]">
        <button
          onClick={() => copyWidgetToClipboard(activeWidget)}
          className="flex-1 flex justify-center items-center gap-2 bg-[var(--mf-elev)]/5 hover:bg-[var(--mf-elev)]/10 text-[var(--mf-fg)]/80 hover:text-[var(--mf-fg)] py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <Copy size={14} /> {t("Kopieren")}
        </button>
        <button
          onClick={() => removeWidget(activeWidget.i)}
          className="flex-1 flex justify-center items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <Trash2 size={14} /> {t("Löschen")}
        </button>
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded-t-md transition-colors ${
        active
          ? "bg-[var(--mf-elev)]/5 text-[var(--mf-fg)] border-b-2 border-blue-500 -mb-px"
          : "text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]/80 hover:bg-[var(--mf-elev)]/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  const t = useT();
  return (
    <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--mf-fg)]/40 mb-3">
      {t(title)}
    </div>
  );
}

function Field({
  label,
  value,
  children,
  accent,
}: {
  label: string;
  value?: string | number;
  children: React.ReactNode;
  accent?: string;
}) {
  const t = useT();
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[var(--mf-fg)]/70">{t(label)}</span>
        {value !== undefined && (
          <span className={`text-xs font-mono ${accent ?? "text-[var(--mf-fg)]/50"}`}>{value}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function LayoutTab({
  activeWidget,
  updateLayoutGrid,
  updateOpacity,
  updateConfig,
  updateLabel,
  edgeToEdge,
}: InspectorPanelProps) {
  const t = useT();
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader title="Name" />
        <input
          type="text"
          // Auto-default / empty labels show blank with the localised default
          // name as placeholder — so the field is editable-from-clean and the
          // user always sees what the title currently renders as. Typing turns
          // it into a genuine custom label; clearing it reverts to the default.
          value={isAutoDefaultLabel(activeWidget.label) ? "" : activeWidget.label}
          onChange={(e) => updateLabel(activeWidget.i, e.target.value)}
          placeholder={widgetTitle(activeWidget.type, "", t)}
          className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1.5">
          {t("Eigener Name für dieses Modul — ersetzt den Typ in Canvas & Inspector.")}
        </p>
      </div>

      <div>
        <SectionHeader title="Raster-Position" />
        <div className="grid grid-cols-2 gap-3 bg-[var(--mf-elev)]/5 p-3 rounded-xl border border-[var(--mf-bdr)]/10">
          <Field label="X" value={activeWidget.x}>
            <input
              type="range"
              min="0"
              max="23"
              value={activeWidget.x}
              onChange={(e) => updateLayoutGrid(activeWidget.i, "x", parseInt(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer accent-blue-500 bg-[var(--mf-ovl)]/50 light:bg-[var(--mf-surface)]"
            />
          </Field>
          <Field label="Y" value={activeWidget.y}>
            <input
              type="range"
              min="0"
              max="30"
              value={activeWidget.y}
              onChange={(e) => updateLayoutGrid(activeWidget.i, "y", parseInt(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer accent-blue-500 bg-[var(--mf-ovl)]/50 light:bg-[var(--mf-surface)]"
            />
          </Field>
          <Field label="Breite" value={activeWidget.w}>
            <input
              type="range"
              min="1"
              max="24"
              value={activeWidget.w}
              onChange={(e) => updateLayoutGrid(activeWidget.i, "w", parseInt(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer accent-blue-500 bg-[var(--mf-ovl)]/50 light:bg-[var(--mf-surface)]"
            />
          </Field>
          <Field label="Höhe" value={activeWidget.h}>
            <input
              type="range"
              min="1"
              max="24"
              value={activeWidget.h}
              onChange={(e) => updateLayoutGrid(activeWidget.i, "h", parseInt(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer accent-blue-500 bg-[var(--mf-ovl)]/50 light:bg-[var(--mf-surface)]"
            />
          </Field>
        </div>
      </div>

      <div>
        <SectionHeader title="Feinjustierung (Pixel)" />
        <div className="grid grid-cols-2 gap-3 bg-[var(--mf-elev)]/5 p-3 rounded-xl border border-[var(--mf-bdr)]/10">
          <Field label="X-Offset" value={`${activeWidget.config?.offsetX ?? 0}px`} accent="text-cyan-300">
            <input
              type="range"
              min="-500"
              max="500"
              value={activeWidget.config?.offsetX ?? 0}
              onChange={(e) => updateConfig(activeWidget.i, "offsetX", parseInt(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer accent-cyan-500 bg-[var(--mf-ovl)]/50 light:bg-[var(--mf-surface)]"
            />
          </Field>
          <Field label="Y-Offset" value={`${activeWidget.config?.offsetY ?? 0}px`} accent="text-cyan-300">
            <input
              type="range"
              min="-500"
              max="500"
              value={activeWidget.config?.offsetY ?? 0}
              onChange={(e) => updateConfig(activeWidget.i, "offsetY", parseInt(e.target.value))}
              className="w-full h-1.5 rounded-lg cursor-pointer accent-cyan-500 bg-[var(--mf-ovl)]/50 light:bg-[var(--mf-surface)]"
            />
          </Field>
        </div>
      </div>

      <div>
        {/* #39: Bild + Kamera füllen die ganze Kachel — der Kachel-Hintergrund
            ist dort nie sichtbar und der Regler wirkungslos. Ausblenden statt
            Nutzer verwirren. */}
        {activeWidget.type !== "ImageWidget.tsx" && activeWidget.type !== "CameraWidget.tsx" && (
          <>
            <SectionHeader title="Hintergrund" />
            <Field label="Deckkraft" value={`${activeWidget.bgOpacity}%`} accent="text-blue-300">
              <input
                type="range"
                min="0"
                max="100"
                value={activeWidget.bgOpacity}
                onChange={(e) => updateOpacity(activeWidget.i, parseInt(e.target.value))}
                className="w-full h-2 rounded-lg cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
              />
            </Field>
          </>
        )}
        {edgeToEdge && (
          <div className="mt-6 pt-5 border-t border-[var(--mf-bdr)]/10">
            <SectionHeader title="Randlos-Modus" />
            <Toggle
              label="Schwebende Karte (dockt nicht an)"
              checked={activeWidget.config?.floatingCard ?? false}
              onChange={(v) => updateConfig(activeWidget.i, "floatingCard", v)}
              accent="cyan"
            />
            <p className="text-[11px] text-[var(--mf-fg)]/40 mt-2 leading-relaxed">
              {t("Standard: Widgets docken eckig ans Randlos-Raster an. Schwebend behält runde Ecken — für Widgets, die über dem Hintergrund-Raster liegen (z. B. Wetter über dem Foto).")}
            </p>
          </div>
        )}
        <div className="mt-6 pt-5 border-t border-[var(--mf-bdr)]/10">
          <SectionHeader title="Sichtbarkeit" />
          <Toggle
            label="Beim Laden versteckt (per Button einblendbar)"
            checked={activeWidget.config?.defaultHidden ?? false}
            onChange={(v) => updateConfig(activeWidget.i, "defaultHidden", v)}
            accent="purple"
          />

          <div className="mt-4 rounded-xl border border-[var(--mf-bdr)]/10 bg-[var(--mf-elev)]/[0.02] p-3.5 space-y-3">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--mf-fg)]/40 mb-1.5">
                {t("Automatisch über Home Assistant")}
              </div>
              <p className="text-[11px] text-[var(--mf-fg)]/40 leading-relaxed">
                {t("Blendet dieses Widget automatisch ein/aus, je nach Status einer HA-Entity. Für Gruppen den Button-Trigger nutzen.")}
              </p>
            </div>
            <Field label="Nur zeigen wenn HA-Entity einen Status hat">
              <HAEntityInput
                value={activeWidget.config?.showWhenEntity || ""}
                onChange={(v) => updateConfig(activeWidget.i, "showWhenEntity", v)}
                placeholder="binary_sensor.motion"
                clearable
              />
            </Field>
            {(activeWidget.config?.showWhenEntity || "").trim() !== "" && (
              <>
                <Field label="Status (leer = sobald aktiv / an)">
                  <input
                    type="text"
                    value={activeWidget.config?.showWhenState || ""}
                    onChange={(e) => updateConfig(activeWidget.i, "showWhenState", e.target.value)}
                    placeholder="on"
                    className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </Field>
                <Field label="Auto-ausblenden nach Sek. (0 = solange aktiv)">
                  <input
                    type="number"
                    min="0"
                    value={activeWidget.config?.autoHideSeconds ?? 0}
                    onChange={(e) =>
                      updateConfig(activeWidget.i, "autoHideSeconds", Math.max(0, parseInt(e.target.value) || 0))
                    }
                    placeholder="0"
                    className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </Field>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TextTab({ activeWidget, updateConfig }: InspectorPanelProps) {
  const t = useT();
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader title="Größe" />
        <Field
          label={activeWidget.config?.responsiveText ? "Responsive-Faktor" : "Basis-Schriftgröße"}
          value={`${activeWidget.config?.fontSize || 20}${activeWidget.config?.responsiveText ? "%" : "px"}`}
          accent="text-green-300"
        >
          <input
            type="range"
            min="8"
            max="150"
            value={activeWidget.config?.fontSize || 20}
            onChange={(e) => updateConfig(activeWidget.i, "fontSize", parseInt(e.target.value))}
            className="w-full h-2 rounded-lg cursor-pointer accent-green-500 bg-[var(--mf-elev)]/10"
          />
        </Field>
        <Toggle
          label="Responsive Auto-Scale (cqmin)"
          checked={activeWidget.config?.responsiveText ?? false}
          onChange={(v) => updateConfig(activeWidget.i, "responsiveText", v)}
          accent="green"
        />
      </div>

      <div>
        <SectionHeader title="Schriftart" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-[var(--mf-fg)]/70 block mb-1.5">{t("Familie")}</span>
            <select
              value={activeWidget.config?.fontFamily || "var(--font-geist-sans)"}
              onChange={(e) => updateConfig(activeWidget.i, "fontFamily", e.target.value)}
              className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-2 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="var(--font-geist-sans)">Geist</option>
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Montserrat">Montserrat</option>
              <option value="SF Pro Display">SF Pro</option>
              <option value="Playfair Display">Playfair</option>
              <option value="Lato">Lato</option>
              <option value="Oswald">Oswald</option>
              <option value="Outfit">Outfit</option>
            </select>
          </div>
          <div>
            <span className="text-xs text-[var(--mf-fg)]/70 block mb-1.5">{t("Gewicht")}</span>
            <select
              value={activeWidget.config?.fontWeight || "300"}
              onChange={(e) => updateConfig(activeWidget.i, "fontWeight", e.target.value)}
              className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-2 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="100">100 Thin</option>
              <option value="300">300 Light</option>
              <option value="400">400 Regular</option>
              <option value="500">500 Medium</option>
              <option value="700">700 Bold</option>
              <option value="900">900 Black</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title="Farbe & Schatten" />
        <div className="space-y-3">
          <div>
            <span className="text-xs text-[var(--mf-fg)]/70 block mb-1.5">{t("Schriftfarbe")}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={activeWidget.config?.color || "#ffffff"}
                onChange={(e) => updateConfig(activeWidget.i, "color", e.target.value)}
                className="w-12 h-9 rounded-lg cursor-pointer bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10"
              />
              <input
                type="text"
                value={activeWidget.config?.color || "#ffffff"}
                onChange={(e) => updateConfig(activeWidget.i, "color", e.target.value)}
                className="flex-1 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/80 text-xs font-mono rounded-lg px-2 h-9 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <Field label="Schatten Blur" value={`${activeWidget.config?.textShadowBlur || 0}px`} accent="text-purple-300">
            <input
              type="range"
              min="0"
              max="40"
              value={activeWidget.config?.textShadowBlur || 0}
              onChange={(e) => updateConfig(activeWidget.i, "textShadowBlur", parseInt(e.target.value))}
              className="w-full h-2 rounded-lg cursor-pointer accent-purple-500 bg-[var(--mf-elev)]/10"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Schatten X" value={`${activeWidget.config?.textShadowX ?? 0}px`}>
              <input
                type="range"
                min="-50"
                max="50"
                value={activeWidget.config?.textShadowX ?? 0}
                onChange={(e) => updateConfig(activeWidget.i, "textShadowX", parseInt(e.target.value))}
                className="w-full h-1.5 rounded-lg cursor-pointer accent-purple-400 bg-[var(--mf-elev)]/10"
              />
            </Field>
            <Field label="Schatten Y" value={`${activeWidget.config?.textShadowY ?? 4}px`}>
              <input
                type="range"
                min="-50"
                max="50"
                value={activeWidget.config?.textShadowY ?? 4}
                onChange={(e) => updateConfig(activeWidget.i, "textShadowY", parseInt(e.target.value))}
                className="w-full h-1.5 rounded-lg cursor-pointer accent-purple-400 bg-[var(--mf-elev)]/10"
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentTab(props: InspectorPanelProps) {
  const {
    activeWidget,
    layout,
    updateConfig,
    citySearchQuery,
    citySearchResults,
    isSearchingCity,
    searchCity,
    setCitySearchResults,
    setCitySearchQuery,
    buttonTab,
    setButtonTab,
  } = props;

  return (
    <>
      {/* #42: Live-Vorschau für JEDES Widget — rendert die echte Komponente
          mit echten Daten über die geteilte Render-Map. Auf breiten Screens
          rendert der Host sie stattdessen in einer eigenen Spalte rechts. */}
      {props.showPreview !== false && (
        <CollapsibleSection title="Live-Vorschau" subtitle="Zeigt das Widget mit echten Daten, während du unten Einstellungen änderst." defaultOpen>
          <WidgetPreview
            type={activeWidget.type}
            config={activeWidget.config}
            bgOpacity={activeWidget.bgOpacity}
            gridW={activeWidget.w}
            gridH={activeWidget.h}
          />
        </CollapsibleSection>
      )}
      {activeWidget.type === "ClockWidget.tsx" && (
        <ClockInspector
          widget={activeWidget}
          updateConfig={updateConfig}
          citySearchQuery={citySearchQuery}
          citySearchResults={citySearchResults}
          isSearchingCity={isSearchingCity}
          searchCity={searchCity}
          setCitySearchResults={setCitySearchResults}
          setCitySearchQuery={setCitySearchQuery}
        />
      )}
      {activeWidget.type === "WeatherWidget.tsx" && (
        <WeatherInspector
          widget={activeWidget}
          updateConfig={updateConfig}
          citySearchQuery={citySearchQuery}
          citySearchResults={citySearchResults}
          isSearchingCity={isSearchingCity}
          searchCity={searchCity}
          setCitySearchResults={setCitySearchResults}
          setCitySearchQuery={setCitySearchQuery}
        />
      )}
      {activeWidget.type === "ButtonWidget.tsx" && (
        <ButtonInspector
          widget={activeWidget}
          updateConfig={updateConfig}
          buttonTab={buttonTab}
          setButtonTab={setButtonTab}
          layout={layout}
        />
      )}
      {activeWidget.type === "CalendarWidget.tsx" && (
        <CalendarInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "HomeAssistantWidget.tsx" && (
        <HomeAssistantInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "HANotificationWidget.tsx" && (
        <HANotificationInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "TimerWidget.tsx" && (
        <TimerInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "MessagesWidget.tsx" && (
        <MessagesInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "ShoppingListWidget.tsx" && (
        <ShoppingInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "TodosWidget.tsx" && (
        <TodosInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "ImageWidget.tsx" && (
        <ImageInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "EnvironmentWidget.tsx" && (
        <EnvironmentInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "SensorWidget.tsx" && (
        <SensorInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "CameraWidget.tsx" && (
        <CameraInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "MediaPlayerWidget.tsx" && (
        <MediaPlayerInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "RssWidget.tsx" && (
        <RssInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "QrWidget.tsx" && (
        <QrInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type === "StatusWidget.tsx" && (
        <StatusInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
      {activeWidget.type.startsWith("custom:") && (
        <CustomModuleInspector widget={activeWidget} updateConfig={updateConfig} />
      )}
    </>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  accent = "blue",
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: "blue" | "green" | "purple" | "cyan";
}) {
  const t = useT();
  const accentClass: Record<string, string> = {
    blue: "peer-checked:bg-blue-500",
    green: "peer-checked:bg-green-500",
    purple: "peer-checked:bg-purple-500",
    cyan: "peer-checked:bg-cyan-500",
  };
  return (
    <label className="flex items-center gap-3 cursor-pointer group mt-3">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={`w-9 h-5 bg-[var(--mf-elev)]/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${accentClass[accent]}`}
        />
      </div>
      <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">
        {t(label)}
      </span>
    </label>
  );
}

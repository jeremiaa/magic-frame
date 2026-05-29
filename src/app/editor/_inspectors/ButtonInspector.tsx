"use client";

import React from 'react';
import type { WidgetLayoutItem } from '../_types';
import { widgetTitle } from '../_types';
import IconPicker from '../_components/IconPicker';
import HAEntityInput from '../_components/HAEntityInput';
import { useT } from "@/lib/i18n/LocaleProvider";

type ButtonInspectorProps = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
  buttonTab: string;
  setButtonTab: (v: string) => void;
  layout: WidgetLayoutItem[];
};

export default function ButtonInspector({
  widget: activeWidget,
  updateConfig,
  buttonTab,
  setButtonTab,
  layout,
}: ButtonInspectorProps) {
  const t = useT();
  const btnSuffix = buttonTab === '1' ? '' : buttonTab;
  return (
    <div className="space-y-4">
        <div className="flex bg-black/50 p-1 rounded-xl gap-1">
            <button onClick={() => setButtonTab('design')} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${buttonTab === 'design' ? 'bg-indigo-500 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>{t("Design")}</button>
            <button onClick={() => setButtonTab('1')} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${buttonTab === '1' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>{t("Btn")} 1</button>
            <button onClick={() => setButtonTab('2')} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${buttonTab === '2' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>{t("Btn")} 2</button>
            <button onClick={() => setButtonTab('3')} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${buttonTab === '3' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>{t("Btn")} 3</button>
            <button onClick={() => setButtonTab('4')} className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${buttonTab === '4' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>{t("Btn")} 4</button>
        </div>

        {buttonTab === 'design' ? (
            <div className="space-y-4 pt-2">
                <div>
                    <label className="text-xs font-medium text-white/70 block mb-2">{t("Matrix Layout")}</label>
                    <select value={(activeWidget.config as any)?.designLayout || 'auto'} onChange={(e) => updateConfig(activeWidget.i, 'designLayout', e.target.value)} className="w-full bg-black border border-white/20 text-white font-sans text-sm rounded-lg p-2">
                         <option value="auto">{t("Auto-Flow")}</option>
                         <option value="row">{t("Immer Horizontal")}</option>
                         <option value="col">{t("Immer Vertikal")}</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-white/70 block mb-2">{t("Button-Stil (Form)")}</label>
                    <select value={(activeWidget.config as any)?.btnShape || 'square'} onChange={(e) => updateConfig(activeWidget.i, 'btnShape', e.target.value)} className="w-full bg-black border border-white/20 text-white font-sans text-sm rounded-lg p-2">
                         <option value="square">{t("Standard Quadrat / Rechteck")}</option>
                         <option value="circle">{t("Rund (Kreis)")}</option>
                         <option value="subtle">{t("Dezent (Nur beim Hover sichtbar)")}</option>
                         <option value="fill">{t("Ganzflächig (Füllt Raster aus)")}</option>
                    </select>
                </div>
                <div>
                    <div className="flex justify-between mb-2"><label className="text-xs font-medium text-white/70">{t("Icon vergrößern / verkleinern")}</label><span className="text-xs text-indigo-400">{(activeWidget.config as any)?.iconScale ?? 100}%</span></div>
                    <input type="range" min="10" max="250" step="10" value={(activeWidget.config as any)?.iconScale ?? 100} onChange={(e) => updateConfig(activeWidget.i, 'iconScale', parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                    <div className="flex justify-between mb-2"><label className="text-xs font-medium text-white/70">{t("Rahmengröße anpassen (Padding)")}</label><span className="text-xs text-indigo-400">{(activeWidget.config as any)?.btnScale ?? 100}%</span></div>
                    <input type="range" min="30" max="100" step="2" value={(activeWidget.config as any)?.btnScale ?? 100} onChange={(e) => updateConfig(activeWidget.i, 'btnScale', parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                    <div className="flex justify-between mb-2"><label className="text-xs font-medium text-white/70">{t("Glas-Deckkraft (Opacity)")}</label><span className="text-xs text-indigo-400">{(activeWidget.config as any)?.bgOpacity ?? 5}%</span></div>
                    <input type="range" min="0" max="100" value={(activeWidget.config as any)?.bgOpacity ?? 5} onChange={(e) => updateConfig(activeWidget.i, 'bgOpacity', parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                    <div className="flex justify-between mb-2"><label className="text-xs font-medium text-white/70">{t("Glas-Milchigkeit (Blur)")}</label><span className="text-xs text-indigo-400">{(activeWidget.config as any)?.bgBlur ?? 10}px</span></div>
                    <input type="range" min="0" max="30" value={(activeWidget.config as any)?.bgBlur ?? 10} onChange={(e) => updateConfig(activeWidget.i, 'bgBlur', parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                    <div className="flex justify-between mb-2"><label className="text-xs font-medium text-white/70">{t("Kanten abrunden (Radius)")}</label><span className="text-xs text-indigo-400">{(activeWidget.config as any)?.bgRadius ?? 50}%</span></div>
                    <input type="range" min="0" max="50" step="5" value={(activeWidget.config as any)?.bgRadius ?? 50} onChange={(e) => updateConfig(activeWidget.i, 'bgRadius', parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
            </div>
        ) : (
            <div className="space-y-4 pt-2">
               <label className="flex items-center justify-between gap-3 cursor-pointer group bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                  <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{t("Diesen Button anzeigen")}</span>
                  <div className="relative">
                     <input
                        type="checkbox"
                        checked={!(activeWidget.config as any)?.[`btnHidden${btnSuffix}`]}
                        onChange={(e) => updateConfig(activeWidget.i, `btnHidden${btnSuffix}`, !e.target.checked)}
                        className="sr-only peer"
                     />
                     <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                  </div>
               </label>
               {(activeWidget.config as any)?.[`btnHidden${btnSuffix}`] && (
                  <p className="text-[11px] text-white/40 -mt-1">
                     {t("Button ist ausgeblendet — die Einstellungen bleiben erhalten.")}
                  </p>
               )}
               {!(activeWidget.config as any)?.[`btnHidden${btnSuffix}`] &&
                  !(activeWidget.config as any)?.[`icon${btnSuffix}`] &&
                  !(activeWidget.config as any)?.[`label${btnSuffix}`] &&
                  !((activeWidget.config as any)?.[`targets${btnSuffix}`]?.length) && (
                  <p className="text-[11px] text-amber-300/70 -mt-1">
                     {t("Noch leer — ein Icon oder Text zuweisen, damit der Button angezeigt wird.")}
                  </p>
               )}
               <div>
                  <label className="text-sm font-medium text-white/80 block mb-2">{t("Anzeige Text")}</label>
                  <input
                     type="text" value={(activeWidget.config as any)?.[`label${btnSuffix}`] || ''} placeholder={t("Kachel Leer lassen = Unsichtbar")}
                     onChange={(e) => updateConfig(activeWidget.i, `label${btnSuffix}`, e.target.value)}
                     className="w-full bg-black border border-white/20 text-white font-sans text-sm rounded-lg p-3"
                  />
               </div>
               <IconPicker
                  label={`${t("Icon")} (${t("Button")} ${buttonTab})`}
                  value={(activeWidget.config as any)?.[`icon${btnSuffix}`] || ""}
                  onChange={(iconId) => updateConfig(activeWidget.i, `icon${btnSuffix}`, iconId)}
                  placeholder={t("z.B. lucide:power — leer = Button inaktiv")}
                  defaultPrefix="lucide"
                  quickPicks={['lucide:power', 'lucide:eye', 'lucide:eye-off', 'lucide:lightbulb', 'lucide:zap', 'lucide:play', 'lucide:pause', 'lucide:home', 'lucide:layers', 'lucide:calendar', 'lucide:cpu', 'lucide:grid']}
               />
               <ActionEditor
                  activeWidget={activeWidget}
                  updateConfig={updateConfig}
                  layout={layout}
                  keyPrefix=""
                  btnSuffix={btnSuffix}
                  title={t("Kurzer Tipp")}
                  defaultAction="toggle"
               />

               <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-[11px] uppercase tracking-[0.15em] text-white/40 mb-2">
                     {t("Langer Druck (≥500 ms)")}
                  </div>
                  <ActionEditor
                     activeWidget={activeWidget}
                     updateConfig={updateConfig}
                     layout={layout}
                     keyPrefix="longPress"
                     btnSuffix={btnSuffix}
                     title={t("Langer Druck")}
                     defaultAction="none"
                  />
               </div>
            </div>
        )}
    </div>
  );
}

function ActionEditor({
  activeWidget,
  updateConfig,
  layout,
  keyPrefix,
  btnSuffix,
  defaultAction,
}: {
  activeWidget: any;
  updateConfig: (i: string, key: string, value: any) => void;
  layout: any[];
  keyPrefix: "" | "longPress";
  btnSuffix: string;
  title: string;
  defaultAction: string;
}) {
  const t = useT();
  const k = (base: string) =>
    keyPrefix === ""
      ? `${base}${btnSuffix}`
      : `${keyPrefix}${base[0].toUpperCase()}${base.slice(1)}${btnSuffix}`;

  const actionKey = keyPrefix === "" ? `actionType${btnSuffix}` : `longPressAction${btnSuffix}`;
  const action = (activeWidget.config as any)?.[actionKey] || defaultAction;

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-white/80 block mb-2">{t("Aktion")}</label>
        <select
          value={action}
          onChange={(e) => updateConfig(activeWidget.i, actionKey, e.target.value)}
          className="w-full bg-black border border-white/20 text-white font-sans text-sm rounded-lg p-3"
        >
          <option value="none">{t("Keine")}</option>
          <option value="toggle">{t("Widgets umschalten (toggle)")}</option>
          <option value="show">{t("Widgets einblenden")}</option>
          <option value="hide">{t("Widgets ausblenden")}</option>
          <option value="ha_toggle">{t("HA-Entity toggeln")}</option>
          <option value="ha_service">{t("HA-Service-Call")}</option>
          <option value="webhook">{t("Webhook (POST)")}</option>
        </select>
      </div>

      {(action === "toggle" || action === "show" || action === "hide") && (
        <div>
          <label className="text-sm font-medium text-white/80 block mb-2 text-violet-400">{t("Verlinkte Widgets")}</label>
          <div className="flex flex-col gap-2 p-2 bg-black/50 border border-white/10 rounded-lg max-h-48 overflow-y-auto">
            {layout.filter((w) => w.i !== activeWidget.i).length === 0 && (
              <span className="text-xs text-white/50 p-2">{t("Keine anderen Widgets verfügbar.")}</span>
            )}
            {layout
              .filter((w) => w.i !== activeWidget.i)
              .map((w) => {
                const targetsKey = keyPrefix === "" ? `targets${btnSuffix}` : `longPressTargets${btnSuffix}`;
                const isActive = ((activeWidget.config as any)?.[targetsKey] || []).includes(w.i);
                const widgetName = widgetTitle(w.type, w.label, t);
                return (
                  <label key={w.i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => {
                        const currentTargets = (activeWidget.config as any)?.[targetsKey] || [];
                        const newTargets = e.target.checked
                          ? [...currentTargets, w.i]
                          : currentTargets.filter((id: string) => id !== w.i);
                        updateConfig(activeWidget.i, targetsKey, newTargets);
                      }}
                      className="rounded bg-black border-white/20 text-violet-500 focus:ring-violet-500"
                    />
                    <span className="text-sm text-white/90">
                      {widgetName} <span className="opacity-40 text-xs ml-1">({w.i.substring(0, 6)})</span>
                    </span>
                  </label>
                );
              })}
          </div>
        </div>
      )}

      {(action === "ha_toggle" || action === "ha_service") && (
        <div>
          <label className="text-xs font-medium text-white/70 block mb-1">{t("HA Entity-ID")}</label>
          <HAEntityInput
            value={(activeWidget.config as any)?.[k("haEntity")] || ""}
            onChange={(v) => updateConfig(activeWidget.i, k("haEntity"), v)}
            placeholder="switch.kitchen_light"
            className="w-full bg-black border border-white/10 text-white text-sm rounded-lg p-2 focus:outline-none focus:border-cyan-500"
          />
        </div>
      )}

      {action === "ha_service" && (
        <div>
          <label className="text-xs font-medium text-white/70 block mb-1">{t("Service (domain.service)")}</label>
          <input
            type="text"
            value={(activeWidget.config as any)?.[k("haService")] || ""}
            onChange={(e) => updateConfig(activeWidget.i, k("haService"), e.target.value)}
            placeholder={t("script.good_night  oder  light.turn_on")}
            className="w-full bg-black border border-white/10 text-white text-sm font-mono rounded-lg p-2 focus:outline-none focus:border-cyan-500"
          />
          <p className="text-[11px] text-white/40 mt-1">{t("Beispiele:")} <code>script.foo</code>, <code>scene.movie_time</code>, <code>light.turn_on</code></p>
        </div>
      )}

      {action === "webhook" && (
        <div>
          <label className="text-xs font-medium text-white/70 block mb-1">{t("Webhook-URL (POST)")}</label>
          <input
            type="url"
            value={(activeWidget.config as any)?.[k("webhook")] || ""}
            onChange={(e) => updateConfig(activeWidget.i, k("webhook"), e.target.value)}
            placeholder="https://example.com/hook/xyz"
            className="w-full bg-black border border-white/10 text-white text-sm rounded-lg p-2 focus:outline-none focus:border-cyan-500"
          />
        </div>
      )}
    </div>
  );
}

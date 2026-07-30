"use client";

import React from 'react';
import type { WidgetLayoutItem } from '../_types';
import TimezonePicker from '../_components/TimezonePicker';
import { useT } from "@/lib/i18n/LocaleProvider";
import { normalizeIconSet } from "@/lib/weather/wmo";

type ClockInspectorProps = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
  citySearchQuery: string;
  citySearchResults: any[];
  isSearchingCity: boolean;
  searchCity: (query: string) => void;
  setCitySearchResults: (v: any[]) => void;
  setCitySearchQuery: (v: string) => void;
};

export default function ClockInspector({
  widget: activeWidget,
  updateConfig,
  citySearchQuery,
  citySearchResults,
  isSearchingCity,
  searchCity,
  setCitySearchResults,
  setCitySearchQuery,
}: ClockInspectorProps) {
  const t = useT();
  return (
    <div className="space-y-4">
       <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Zeitzone")}</label>
          <TimezonePicker
             value={activeWidget.config?.timezone || ''}
             onChange={(v) => updateConfig(activeWidget.i, 'timezone', v)}
             placeholder={t("Automatisch / Lokal")}
             clearable
          />
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
             {t("Leer = Browser-Zeit. Tippen filtert die Liste (z.B. berlin → Europe/Berlin).")}
          </p>
       </div>

       <ExtraTimezones widget={activeWidget} updateConfig={updateConfig} />

       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
             <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Uhrzeitformat")}</label>
             <select
                value={(activeWidget.config as any)?.timeFormat || 'auto'}
                onChange={(e) => updateConfig(activeWidget.i, 'timeFormat', e.target.value)}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500 cursor-pointer"
             >
                <option value="auto">{t("Automatisch (nach Sprache)")}</option>
                <option value="24h">{t("24 Stunden (18:32)")}</option>
                <option value="12h">{t("12 Stunden (6:32 PM)")}</option>
             </select>
          </div>
          <div>
             <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Datumsformat")}</label>
             <select
                value={(activeWidget.config as any)?.dateFormat || 'auto'}
                onChange={(e) => updateConfig(activeWidget.i, 'dateFormat', e.target.value)}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500 cursor-pointer"
             >
                <option value="auto">{t("Automatisch (nach Sprache)")}</option>
                <option value="de-DE">{t("Deutsch (Di., 27. Mai)")}</option>
                <option value="en-US">{t("US-Englisch (Tue, May 27)")}</option>
                <option value="en-GB">{t("UK-Englisch (Tue 27 May)")}</option>
             </select>
          </div>
       </div>

       <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Textausrichtung")}</label>
          <select
             value={activeWidget.config?.align || 'left'}
             onChange={(e) => updateConfig(activeWidget.i, 'align', e.target.value)}
             className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
             <option value="left">{t("Links")}</option>
             <option value="center">{t("Mittig")}</option>
             <option value="right">{t("Rechts")}</option>
          </select>
       </div>
       <label className="flex items-center gap-3 cursor-pointer group pt-2">
          <div className="relative">
             <input
                type="checkbox"
                checked={activeWidget.config?.hideSeconds ?? false}
                onChange={(e) => updateConfig(activeWidget.i, 'hideSeconds', e.target.checked)}
                className="sr-only peer"
             />
             <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
          </div>
          <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Sekunden ausblenden")}</span>
       </label>
       <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
             <input
                type="checkbox"
                checked={(activeWidget.config as any)?.hideDate ?? false}
                onChange={(e) => updateConfig(activeWidget.i, 'hideDate', e.target.checked)}
                className="sr-only peer"
             />
             <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
          </div>
          <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Datum ausblenden")}</span>
       </label>

       <div className="border-t border-[var(--mf-bdr)]/10 pt-4 mt-2 mb-2">
          <label className="flex items-center gap-3 cursor-pointer group">
             <div className="relative">
                <input
                   type="checkbox"
                   checked={activeWidget.config?.showMiniWeather ?? false}
                   onChange={(e) => updateConfig(activeWidget.i, 'showMiniWeather', e.target.checked)}
                   className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
             </div>
             <span className="text-sm font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors">{t("Wetter-Multiwidget Modus (Kompaktes Wetter hier aktivieren)")}</span>
          </label>
       </div>

       {activeWidget.config?.showMiniWeather && (
          <div className="bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] p-4 rounded-xl border border-[var(--mf-bdr)]/5 space-y-4">
              <div className="relative">
                 <label className="text-xs font-medium text-[var(--mf-fg)]/80 block mb-2 text-cyan-400">{t("Ort suchen (Auto-Ausfüllen)")}</label>
                 <input
                    type="text" value={citySearchQuery} placeholder={t("z.B. München...")}
                    onChange={(e) => searchCity(e.target.value)}
                    className="w-full bg-[var(--mf-surface)] border border-cyan-500/30 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:border-cyan-400 transition-colors"
                 />
                 {isSearchingCity && <div className="absolute right-3 top-10 text-xs text-[var(--mf-fg)]/50">{t("Sucht...")}</div>}

                 {citySearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 rounded-lg shadow-2xl max-h-[250px] overflow-y-auto">
                       {citySearchResults.map(city => (
                          <div key={city.id}
                               className="p-3 hover:bg-[var(--mf-elev)]/10 cursor-pointer border-b border-[var(--mf-bdr)]/5 last:border-0"
                               onClick={() => {
                                  updateConfig(activeWidget.i, 'lat', city.latitude.toString());
                                  updateConfig(activeWidget.i, 'lon', city.longitude.toString());
                                  updateConfig(activeWidget.i, 'location', `${city.name}, ${city.admin1 || city.country}`);
                                  setCitySearchResults([]);
                                  setCitySearchQuery("");
                               }}
                          >
                             <div className="font-bold text-[var(--mf-fg)]">{city.name}</div>
                             <div className="text-xs text-[var(--mf-fg)]/60 mt-0.5">{city.admin1 ? `${city.admin1}, ` : ''}{city.country}</div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-medium text-[var(--mf-fg)]/40 block mb-2">{t("Latitude (Auto)")}</label>
                    <input
                       type="text" value={activeWidget.config?.lat || ''} disabled
                       className="w-full bg-[var(--mf-elev)]/5 border border-transparent text-[var(--mf-fg)]/50 font-sans text-xs rounded p-2"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-[var(--mf-fg)]/40 block mb-2">{t("Longitude (Auto)")}</label>
                    <input
                       type="text" value={activeWidget.config?.lon || ''} disabled
                       className="w-full bg-[var(--mf-elev)]/5 border border-transparent text-[var(--mf-fg)]/50 font-sans text-xs rounded p-2"
                    />
                 </div>
              </div>
              <div className="mt-4 border-t border-[var(--mf-bdr)]/10 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Icon Stil (Wetter)")}</label>
                    <select
                       value={normalizeIconSet((activeWidget.config as any)?.iconSet) || 'lucide'}
                       onChange={(e) => updateConfig(activeWidget.i, 'iconSet', e.target.value)}
                       className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer"
                    >
                       <option value="lucide">{t("Lucide (Klar, Umriss)")}</option>
                       <option value="solid">{t("Solid (Gefüllt, Flach)")}</option>
                       <option value="meteocons">{t("Meteocons (Farbig, Animierbar)")}</option>
                       <option value="3d">{t("3D (Plastisch, Animierbar)")}</option>
                    </select>
                    {['meteocons', '3d'].includes(normalizeIconSet((activeWidget.config as any)?.iconSet) ?? '') && (
                       <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                          {/* fill/line gibt es nur bei Meteocons — das 3D-Set hat einen Stil */}
                          {normalizeIconSet((activeWidget.config as any)?.iconSet) === 'meteocons' && (
                             <div className="inline-flex rounded-lg border border-[var(--mf-bdr)]/10 overflow-hidden">
                                {([['fill', t("Gefüllt")], ['line', t("Umriss")]] as const).map(([val, lbl]) => {
                                   const active = ((activeWidget.config as any)?.meteoconsStyle || 'fill') === val;
                                   return (
                                      <button key={val} type="button"
                                         onClick={() => updateConfig(activeWidget.i, 'meteoconsStyle', val)}
                                         className={`px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-cyan-500/15 text-cyan-300' : 'text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]/80'}`}>
                                         {lbl}
                                      </button>
                                   );
                                })}
                             </div>
                          )}
                          <label className="flex items-center gap-2 cursor-pointer group">
                             <div className="relative">
                                <input type="checkbox"
                                   checked={(activeWidget.config as any)?.meteoconsAnimated ?? false}
                                   onChange={(e) => updateConfig(activeWidget.i, 'meteoconsAnimated', e.target.checked)}
                                   className="sr-only peer" />
                                <div className="w-9 h-5 bg-[var(--mf-elev)]/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                             </div>
                             <span className="text-xs font-medium text-[var(--mf-fg)]/70">{t("Animiert")}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer group">
                             <div className="relative">
                                <input type="checkbox"
                                   checked={(activeWidget.config as any)?.meteoconsMoonPhase ?? true}
                                   onChange={(e) => updateConfig(activeWidget.i, 'meteoconsMoonPhase', e.target.checked)}
                                   className="sr-only peer" />
                                <div className="w-9 h-5 bg-[var(--mf-elev)]/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                             </div>
                             <span className="text-xs font-medium text-[var(--mf-fg)]/70">{t("Echte Mondphasen")}</span>
                          </label>
                       </div>
                    )}
                 </div>
                 <div>
                    <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Temperatur-Einheit")}</label>
                    <select
                       value={(activeWidget.config as any)?.unitTemp || 'celsius'}
                       onChange={(e) => updateConfig(activeWidget.i, 'unitTemp', e.target.value)}
                       className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer"
                    >
                       <option value="celsius">{t("Celsius (°C)")}</option>
                       <option value="fahrenheit">{t("Fahrenheit (°F)")}</option>
                    </select>
                 </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2">
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                       <input
                          type="checkbox"
                          checked={activeWidget.config?.showHumidity ?? false}
                          onChange={(e) => updateConfig(activeWidget.i, 'showHumidity', e.target.checked)}
                          className="sr-only peer"
                       />
                       <div className="w-9 h-5 bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </div>
                    <span className="text-xs font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Luftfeuchte")}</span>
                 </label>
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                       <input
                          type="checkbox"
                          checked={activeWidget.config?.showWind ?? false}
                          onChange={(e) => updateConfig(activeWidget.i, 'showWind', e.target.checked)}
                          className="sr-only peer"
                       />
                       <div className="w-9 h-5 bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </div>
                    <span className="text-xs font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Wind")}</span>
                 </label>
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                       <input
                          type="checkbox"
                          checked={(activeWidget.config as any)?.showUv ?? false}
                          onChange={(e) => updateConfig(activeWidget.i, 'showUv', e.target.checked)}
                          className="sr-only peer"
                       />
                       <div className="w-9 h-5 bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                    </div>
                    <span className="text-xs font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("UV-Index")}</span>
                 </label>
              </div>

              {/* Schriftgröße UV/Wind/Feuchte in Pixel — absolut, skaliert nicht
                  mit der Clock-Schriftgröße mit. */}
              {(activeWidget.config?.showHumidity || activeWidget.config?.showWind || (activeWidget.config as any)?.showUv) && (
                 <div className="pt-1">
                    <label className="text-xs font-medium text-[var(--mf-fg)]/60 flex justify-between mb-1.5">
                       <span>{t("Schriftgröße Luftfeuchte / Wind / UV")}</span>
                       <span className="text-cyan-300">{(activeWidget.config as any)?.statsSize ?? 12} px</span>
                    </label>
                    <input
                       type="range" min="8" max="32" step="1"
                       value={(activeWidget.config as any)?.statsSize ?? 12}
                       onChange={(e) => updateConfig(activeWidget.i, 'statsSize', parseInt(e.target.value))}
                       className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500 bg-[var(--mf-elev)]/10"
                    />
                 </div>
              )}
          </div>
       )}
    </div>
  );
}

function ExtraTimezones({ widget, updateConfig }: { widget: any; updateConfig: (i: string, key: string, value: any) => void }) {
   const t = useT();
   const raw: any[] = Array.isArray(widget.config?.extraTimezones) ? widget.config.extraTimezones : [];
   const list = raw.map((e) => (typeof e === "string" ? { tz: e, label: "" } : { tz: e?.tz ?? "", label: e?.label ?? "" }));

   const update = (next: { tz: string; label: string }[]) => {
      updateConfig(widget.i, "extraTimezones", next);
   };

   return (
      <div className="bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10 rounded-xl p-3">
         <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--mf-fg)]/50 mb-2">
            {t("Weitere Zeitzonen (Worldclock)")}
         </div>
         <div className="space-y-2">
            {list.length === 0 && (
               <p className="text-[11px] text-[var(--mf-fg)]/40 italic">
                  {t("Leer = nur die Haupt-Uhr oben wird angezeigt.")}
               </p>
            )}
            {list.map((entry, idx) => (
               <div key={idx} className="flex gap-2 items-center">
                  <input
                     type="text"
                     value={entry.label}
                     placeholder="NYC"
                     onChange={(e) => {
                        const next = [...list];
                        next[idx] = { ...entry, label: e.target.value };
                        update(next);
                     }}
                     className="w-20 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs rounded-md px-2 h-8 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                     <TimezonePicker
                        value={entry.tz}
                        onChange={(v) => {
                           const next = [...list];
                           next[idx] = { ...entry, tz: v };
                           update(next);
                        }}
                        placeholder="America/New_York"
                        className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs font-mono rounded-md px-2 h-8 focus:outline-none focus:border-blue-500"
                     />
                  </div>
                  <button
                     onClick={() => update(list.filter((_, i) => i !== idx))}
                     className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-md"
                     title={t("Entfernen")}
                  >
                     ×
                  </button>
               </div>
            ))}
            <button
               onClick={() => update([...list, { tz: "", label: "" }])}
               className="w-full h-9 text-xs font-medium text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] border border-dashed border-[var(--mf-bdr)]/15 hover:border-[var(--mf-bdr)]/30 rounded-md transition-colors"
            >
               {t("+ Zeitzone hinzufügen")}
            </button>
         </div>
         <p className="text-[11px] text-[var(--mf-fg)]/40 mt-2 leading-relaxed">
            {t("IANA-Format (z.B. Europe/Berlin, America/New_York). Label ist optional.")}
         </p>
      </div>
   );
}

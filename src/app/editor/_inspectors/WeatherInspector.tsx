"use client";

import React from 'react';
import type { WidgetLayoutItem } from '../_types';
import { useT } from "@/lib/i18n/LocaleProvider";

type WeatherInspectorProps = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
  citySearchQuery: string;
  citySearchResults: any[];
  isSearchingCity: boolean;
  searchCity: (query: string) => void;
  setCitySearchResults: (v: any[]) => void;
  setCitySearchQuery: (v: string) => void;
};

export default function WeatherInspector({
  widget: activeWidget,
  updateConfig,
  citySearchQuery,
  citySearchResults,
  isSearchingCity,
  searchCity,
  setCitySearchResults,
  setCitySearchQuery,
}: WeatherInspectorProps) {
  const t = useT();
  const provider = (activeWidget.config as any)?.provider || "open-meteo";
  return (
    <div className="space-y-4">
       <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2 text-emerald-400">{t("Datenquelle")}</label>
          <select
             value={provider}
             onChange={(e) => updateConfig(activeWidget.i, 'provider', e.target.value)}
             className="w-full bg-[var(--mf-surface)] border border-emerald-500/30 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-emerald-400"
          >
             <option value="open-meteo">{t("Open-Meteo (global, kein Key)")}</option>
             <option value="dwd">{t("DWD ICON (Deutscher Wetterdienst, für DE am genauesten)")}</option>
             <option value="openweathermap">{t("OpenWeatherMap (braucht API-Key)")}</option>
             <option value="home-assistant">{t("Home Assistant (weather.* Entity)")}</option>
          </select>
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
             {provider === "open-meteo" && t("Globale Mix-Quelle. Default.")}
             {provider === "dwd" && t("DWD ICON-Modell über die Open-Meteo-Bridge — für Deutschland/Mitteleuropa meist näher an der tatsächlichen Wetterlage als globale Modelle.")}
             {provider === "openweathermap" && t("Benötigt OPENWEATHERMAP_API_KEY in der Server-Config. Kostenloses Tier: 1000 calls/Tag.")}
             {provider === "home-assistant" && t("Liest eine weather.*-Entity inkl. Vorhersage aus deinem HA-Server. Welches Modell dort reinkommt, hängt von deiner HA-Integration ab.")}
          </p>
       </div>

       {provider === "home-assistant" && (
          <div>
             <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("HA-Entity-ID")}</label>
             <input
                type="text"
                value={(activeWidget.config as any)?.haEntity || ""}
                placeholder="weather.home"
                onChange={(e) => updateConfig(activeWidget.i, 'haEntity', e.target.value)}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-mono text-sm rounded-lg p-3 focus:outline-none focus:border-emerald-500"
             />
             <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                {t("Beispiel:")} <code>weather.home</code>. {t("Die Forecast-Tage kommen aus")} <code>attributes.forecast</code>.
             </p>
          </div>
       )}

       <div className={`relative ${provider === "home-assistant" ? "opacity-50 pointer-events-none" : ""}`}>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2 text-cyan-400">{t("Ort suchen (Auto-Ausfüllen)")}</label>
          {(activeWidget.config as any)?.location && (
             <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-2 mb-2">
                <span className="text-cyan-300 text-base shrink-0">📍</span>
                <div className="flex-1 min-w-0">
                   <div className="text-xs text-[var(--mf-fg)]/60 uppercase tracking-wider">{t("Aktueller Ort")}</div>
                   <div className="text-sm font-medium text-[var(--mf-fg)] truncate">
                      {(activeWidget.config as any).location}
                   </div>
                   <div className="text-[11px] text-[var(--mf-fg)]/40 font-mono mt-0.5">
                      {(activeWidget.config as any)?.lat}, {(activeWidget.config as any)?.lon}
                   </div>
                </div>
                <button
                   onClick={() => {
                      updateConfig(activeWidget.i, 'location', '');
                      updateConfig(activeWidget.i, 'lat', '');
                      updateConfig(activeWidget.i, 'lon', '');
                   }}
                   title={t("Ort zurücksetzen")}
                   className="text-xs text-[var(--mf-fg)]/50 hover:text-red-300 hover:bg-red-500/10 rounded w-7 h-7 flex items-center justify-center shrink-0"
                >
                   ×
                </button>
             </div>
          )}
          <input
             type="text" value={citySearchQuery} placeholder={(activeWidget.config as any)?.location ? t("Anderen Ort suchen…") : t("z.B. München...")}
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

       <div className="pt-4 mt-4 border-t border-[var(--mf-bdr)]/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
             <label className="text-xs font-medium text-[var(--mf-fg)]/40 block mb-2">{t("Latitude")}</label>
             <input
                type="text" value={activeWidget.config?.lat || ''} placeholder="52.5200"
                onChange={(e) => updateConfig(activeWidget.i, 'lat', e.target.value)}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/5 text-[var(--mf-fg)]/50 font-sans text-sm rounded-lg p-2 focus:outline-none focus:border-[var(--mf-bdr)]/20"
             />
          </div>
          <div>
             <label className="text-xs font-medium text-[var(--mf-fg)]/40 block mb-2">{t("Longitude")}</label>
             <input
                type="text" value={activeWidget.config?.lon || ''} placeholder="13.4050"
                onChange={(e) => updateConfig(activeWidget.i, 'lon', e.target.value)}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/5 text-[var(--mf-fg)]/50 font-sans text-sm rounded-lg p-2 focus:outline-none focus:border-[var(--mf-bdr)]/20"
             />
          </div>
       </div>

       <div className="pt-4 mt-4 border-t border-[var(--mf-bdr)]/10 space-y-4">
          <div>
             <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2 text-orange-400">{t("Ort-Label (über der Temperatur)")}</label>
             <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="text-xs font-medium text-[var(--mf-fg)]/60 flex justify-between mb-1.5">
                      <span>{t("Schriftgröße")}</span>
                      <span className="text-orange-300">{(activeWidget.config as any)?.locationSize ?? 100}%</span>
                   </label>
                   <input
                      type="range" min="50" max="200" step="5"
                      value={(activeWidget.config as any)?.locationSize ?? 100}
                      onChange={(e) => updateConfig(activeWidget.i, 'locationSize', parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 bg-[var(--mf-elev)]/10"
                   />
                </div>
                <div>
                   <label className="text-xs font-medium text-[var(--mf-fg)]/60 flex justify-between mb-1.5">
                      <span>{t("Deckkraft")}</span>
                      <span className="text-orange-300">{(activeWidget.config as any)?.locationOpacity ?? 60}%</span>
                   </label>
                   <input
                      type="range" min="20" max="100" step="5"
                      value={(activeWidget.config as any)?.locationOpacity ?? 60}
                      onChange={(e) => updateConfig(activeWidget.i, 'locationOpacity', parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 bg-[var(--mf-elev)]/10"
                   />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-3 mt-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)]">
                   <input
                      type="checkbox"
                      checked={(activeWidget.config as any)?.locationUppercase !== false}
                      onChange={(e) => updateConfig(activeWidget.i, 'locationUppercase', e.target.checked)}
                      className="appearance-none w-4 h-4 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-orange-500 checked:border-orange-500"
                   />
                   {t("GROSSBUCHSTABEN")}
                </label>
                <select
                   value={(activeWidget.config as any)?.locationTracking ?? 'widest'}
                   onChange={(e) => updateConfig(activeWidget.i, 'locationTracking', e.target.value)}
                   className="bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs rounded-md px-2 h-8 focus:outline-none focus:border-orange-500"
                >
                   <option value="normal">{t("Normaler Abstand")}</option>
                   <option value="wide">{t("Weiter Abstand")}</option>
                   <option value="widest">{t("Sehr weiter Abstand")}</option>
                </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-1.5">{t("Temperatur")}</label>
                <select
                   value={(activeWidget.config as any)?.unitTemp || 'celsius'}
                   onChange={(e) => updateConfig(activeWidget.i, 'unitTemp', e.target.value)}
                   className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-2 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                   <option value="celsius">°C</option>
                   <option value="fahrenheit">°F</option>
                </select>
             </div>
             <div>
                <label className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-1.5">{t("Wind")}</label>
                <select
                   value={(activeWidget.config as any)?.unitWind || 'kmh'}
                   onChange={(e) => updateConfig(activeWidget.i, 'unitWind', e.target.value)}
                   className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-2 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                   <option value="kmh">km/h</option>
                   <option value="mph">mph</option>
                   <option value="ms">m/s</option>
                   <option value="kn">{t("Knoten")}</option>
                </select>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Ansicht (Layout)")}</label>
                <select
                   value={activeWidget.config?.forecastLayout || 'horizontal'}
                   onChange={(e) => updateConfig(activeWidget.i, 'forecastLayout', e.target.value)}
                   className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                >
                   <option value="horizontal">{t("Horizontal (Nebeneinander)")}</option>
                   <option value="vertical">{t("Vertikal (Untereinander)")}</option>
                </select>
             </div>
             <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Icon Stil")}</label>
                <select
                   value={(activeWidget.config as any)?.iconSet || 'lucide'}
                   onChange={(e) => updateConfig(activeWidget.i, 'iconSet', e.target.value)}
                   className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                >
                   <option value="lucide">{t("Lucide (Klar, Umriss)")}</option>
                   <option value="solid">{t("Solid (Gefüllt, Flach)")}</option>
                   <option value="meteocons">{t("Meteocons (Farbig, Animierbar)")}</option>
                   <option value="3d">{t("3D (Plastisch, Animierbar)")}</option>
                </select>
             </div>
          </div>

          <div className="mt-4">
             <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                <span>{t("Icon-Größe (Aktuelles Wetter)")}</span>
                <span className="text-emerald-400">{(activeWidget.config as any)?.currentIconSize ?? 100}%</span>
             </label>
             <input
                type="range" min="60" max="220" step="10"
                value={(activeWidget.config as any)?.currentIconSize ?? 100}
                onChange={(e) => updateConfig(activeWidget.i, 'currentIconSize', parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 bg-[var(--mf-elev)]/10"
             />
          </div>

          {((activeWidget.config as any)?.iconSet === 'meteocons') && (
             <div className="mt-4 rounded-xl border border-[var(--mf-bdr)]/10 bg-[var(--mf-surface)]/40 p-3 space-y-3">
                <div>
                   <label className="text-xs font-medium text-[var(--mf-fg)]/60 block mb-1.5">{t("Meteocons-Stil")}</label>
                   <div className="grid grid-cols-2 gap-1.5">
                      {([['fill', t("Gefüllt")], ['line', t("Umriss")]] as const).map(([val, lbl]) => {
                         const active = ((activeWidget.config as any)?.meteoconsStyle || 'fill') === val;
                         return (
                            <button key={val} type="button"
                               onClick={() => updateConfig(activeWidget.i, 'meteoconsStyle', val)}
                               className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors border ${active ? 'border-blue-500 bg-blue-500/10 text-[var(--mf-fg)]' : 'border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30'}`}>
                               {lbl}
                            </button>
                         );
                      })}
                   </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                      <input type="checkbox"
                         checked={(activeWidget.config as any)?.meteoconsAnimated ?? false}
                         onChange={(e) => updateConfig(activeWidget.i, 'meteoconsAnimated', e.target.checked)}
                         className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                   </div>
                   <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Animiert")}</span>
                </label>
                <p className="text-[11px] text-[var(--mf-fg)]/40">
                   {t("Animierte Icons bewegen sich sanft (Sonne dreht, Regen fällt). Statisch ist am ressourcenschonendsten für alte Displays.")}
                </p>
                {((activeWidget.config as any)?.meteoconsAnimated ?? false) && (
                   <>
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <div className="relative">
                            <input type="checkbox"
                               checked={(activeWidget.config as any)?.iconAnimatedAll ?? false}
                               onChange={(e) => updateConfig(activeWidget.i, 'iconAnimatedAll', e.target.checked)}
                               className="sr-only peer" />
                            <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                         </div>
                         <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Auch kleine Icons animieren")}</span>
                      </label>
                      <p className="text-[11px] text-[var(--mf-fg)]/40">
                         {t("Vorhersage- und Stunden-Icons laufen dann ebenfalls animiert. Kann auf schwachen Displays Leistung kosten.")}
                      </p>
                   </>
                )}
                <div className="pt-1 border-t border-[var(--mf-bdr)]/10"></div>
                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                      <input type="checkbox"
                         checked={(activeWidget.config as any)?.meteoconsMoonPhase ?? true}
                         onChange={(e) => updateConfig(activeWidget.i, 'meteoconsMoonPhase', e.target.checked)}
                         className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                   </div>
                   <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Echte Mondphasen")}</span>
                </label>
                <p className="text-[11px] text-[var(--mf-fg)]/40">
                   {t("Zeigt nachts bei klarem Himmel die tatsächliche Mondphase (Neumond bis Vollmond) statt eines generischen Monds.")}
                </p>
                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                      <input type="checkbox"
                         checked={(activeWidget.config as any)?.meteoconsStats ?? false}
                         onChange={(e) => updateConfig(activeWidget.i, 'meteoconsStats', e.target.checked)}
                         className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                   </div>
                   <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Info-Icons im Meteocons-Stil")}</span>
                </label>
                <p className="text-[11px] text-[var(--mf-fg)]/40">
                   {t("UV und Wind zeigen dann wertbasierte Icons (UV-Index farbcodiert, Windstärke in Beaufort). Aus = klassische Lucide-Icons.")}
                </p>
             </div>
          )}

          {((activeWidget.config as any)?.iconSet === '3d') && (
             <div className="mt-4 rounded-xl border border-[var(--mf-bdr)]/10 bg-[var(--mf-surface)]/40 p-3 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                      <input type="checkbox"
                         checked={(activeWidget.config as any)?.meteoconsAnimated ?? false}
                         onChange={(e) => updateConfig(activeWidget.i, 'meteoconsAnimated', e.target.checked)}
                         className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                   </div>
                   <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Animiert")}</span>
                </label>
                <p className="text-[11px] text-[var(--mf-fg)]/40">
                   {t("Animierte Icons bewegen sich sanft (Sonne dreht, Regen fällt). Statisch ist am ressourcenschonendsten für alte Displays.")}
                </p>
                {((activeWidget.config as any)?.meteoconsAnimated ?? false) && (
                   <>
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <div className="relative">
                            <input type="checkbox"
                               checked={(activeWidget.config as any)?.iconAnimatedAll ?? false}
                               onChange={(e) => updateConfig(activeWidget.i, 'iconAnimatedAll', e.target.checked)}
                               className="sr-only peer" />
                            <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                         </div>
                         <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Auch kleine Icons animieren")}</span>
                      </label>
                      <p className="text-[11px] text-[var(--mf-fg)]/40">
                         {t("Vorhersage- und Stunden-Icons laufen dann ebenfalls animiert. Kann auf schwachen Displays Leistung kosten.")}
                      </p>
                   </>
                )}
                <div className="pt-1 border-t border-[var(--mf-bdr)]/10"></div>
                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                      <input type="checkbox"
                         checked={(activeWidget.config as any)?.meteoconsMoonPhase ?? true}
                         onChange={(e) => updateConfig(activeWidget.i, 'meteoconsMoonPhase', e.target.checked)}
                         className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                   </div>
                   <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Echte Mondphasen")}</span>
                </label>
                <p className="text-[11px] text-[var(--mf-fg)]/40">
                   {t("Zeigt in klaren Vollmond-Nächten den Vollmond statt der Mondsichel.")}
                </p>
             </div>
          )}

          <div className="mt-4 pt-4 border-t border-[var(--mf-bdr)]/10 space-y-3">
             <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                   <input
                      type="checkbox"
                      checked={activeWidget.config?.hideForecast ?? false}
                      onChange={(e) => updateConfig(activeWidget.i, 'hideForecast', e.target.checked)}
                      data-purpose="hideForecast"
                      className="sr-only peer"
                   />
                   <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </div>
                <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Tages-Vorhersage ausblenden")}</span>
             </label>

             {!activeWidget.config?.hideForecast && (
                <div>
                   <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                      <span>{t("Anzahl Vorhersage-Tage")}</span>
                      <span className="text-emerald-400">{(activeWidget.config as any)?.forecastDays ?? 4}</span>
                   </label>
                   <input
                      type="range" min="1" max="6" step="1"
                      value={(activeWidget.config as any)?.forecastDays ?? 4}
                      onChange={(e) => updateConfig(activeWidget.i, 'forecastDays', parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 bg-[var(--mf-elev)]/10"
                   />
                   <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                      {t("Tage nach heute. Open-Meteo und DWD liefern bis zu 6 Tage, HA/OWM je nach Anbieter.")}
                   </p>
                   <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 mt-3 flex justify-between">
                      <span>{t("Icon-Größe (Vorschau & Stunden)")}</span>
                      <span className="text-emerald-400">{(activeWidget.config as any)?.forecastIconSize ?? 100}%</span>
                   </label>
                   <input
                      type="range" min="70" max="220" step="10"
                      value={(activeWidget.config as any)?.forecastIconSize ?? 100}
                      onChange={(e) => updateConfig(activeWidget.i, 'forecastIconSize', parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 bg-[var(--mf-elev)]/10"
                   />
                </div>
             )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer group mt-3">
             <div className="relative">
                <input
                   type="checkbox"
                   checked={(activeWidget.config as any)?.showSunTimes ?? true}
                   onChange={(e) => updateConfig(activeWidget.i, 'showSunTimes', e.target.checked)}
                   className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
             </div>
             <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Sonnenauf-/untergang anzeigen")}</span>
          </label>

          <div className="mt-3 pt-3 border-t border-[var(--mf-bdr)]/10">
             <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                   <input
                      type="checkbox"
                      checked={(activeWidget.config as any)?.showHourly ?? false}
                      onChange={(e) => updateConfig(activeWidget.i, 'showHourly', e.target.checked)}
                      className="sr-only peer"
                   />
                   <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </div>
                <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Stündlichen Verlauf anzeigen")}</span>
             </label>
             {(activeWidget.config as any)?.showHourly && (
                <div className="mt-3">
                   <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                      <span>{t("Anzahl Stunden")}</span>
                      <span className="text-cyan-400">{(activeWidget.config as any)?.hourlyHours ?? 12}</span>
                   </label>
                   <input
                      type="range" min="4" max="24" step="1"
                      value={(activeWidget.config as any)?.hourlyHours ?? 12}
                      onChange={(e) => updateConfig(activeWidget.i, 'hourlyHours', parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500 bg-[var(--mf-elev)]/10"
                   />
                   <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                      {t("Horizontaler Streifen unter dem Wetter. Bei HA nur verfügbar wenn deine Weather-Integration hourly-Forecasts liefert (viele tun's, manche nicht).")}
                   </p>
                </div>
             )}
          </div>

           {/* Toggles fließen über mehrere Zeilen wenn der Inspector schmal ist.
               Vorher 3-Spalten-Grid, dadurch überlappten lange deutsche Labels
               ("Windgeschwindigkeit") mit den Nachbar-Toggles. */}
           <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6 mb-6">
              <label className="flex items-center gap-3 cursor-pointer group shrink-0">
                 <div className="relative">
                    <input
                       type="checkbox"
                       checked={activeWidget.config?.showHumidity ?? false}
                       onChange={(e) => updateConfig(activeWidget.i, 'showHumidity', e.target.checked)}
                       className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                 </div>
                 <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors whitespace-nowrap">{t("Luftfeuchte")}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group shrink-0">
                 <div className="relative">
                    <input
                        type="checkbox"
                        checked={activeWidget.config?.showWind ?? false}
                        onChange={(e) => updateConfig(activeWidget.i, 'showWind', e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                 </div>
                 <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors whitespace-nowrap">{t("Wind")}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group shrink-0">
                 <div className="relative">
                     <input
                        type="checkbox"
                        checked={(activeWidget.config as any)?.showUv ?? false}
                        onChange={(e) => updateConfig(activeWidget.i, 'showUv', e.target.checked)}
                        className="sr-only peer"
                     />
                     <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                 </div>
                 <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors whitespace-nowrap">{t("UV-Index")}</span>
              </label>
           </div>

           {provider === "dwd" && (activeWidget.config as any)?.showUv && (
              <p className="text-[11px] text-amber-300/80 -mt-3 mb-4 leading-relaxed">
                 {t("Hinweis: Das DWD-Modell liefert keinen UV-Index. Magic Frame ergänzt den Wert automatisch aus dem Standard-Open-Meteo-Modell — UV erscheint also trotzdem.")}
              </p>
           )}

           {/* Schriftgröße der Stats-Zeile (UV/Wind/Feuchte) in Pixel.
               Px statt em, damit die Stats nicht mit der Widget-Größe skalieren —
               bei großen Widgets wurden sie sonst fast so groß wie die Hauptanzeige. */}
           {(activeWidget.config?.showHumidity || activeWidget.config?.showWind || (activeWidget.config as any)?.showUv) && (
              <div className="-mt-2 mb-6">
                 <label className="text-xs font-medium text-[var(--mf-fg)]/60 flex justify-between mb-1.5">
                    <span>{t("Schriftgröße Luftfeuchte / Wind / UV")}</span>
                    <span className="text-blue-300">{(activeWidget.config as any)?.statsSize ?? 14} px</span>
                 </label>
                 <input
                    type="range" min="8" max="40" step="1"
                    value={(activeWidget.config as any)?.statsSize ?? 14}
                    onChange={(e) => updateConfig(activeWidget.i, 'statsSize', parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                 />
              </div>
           )}

           <div>
             <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2 text-blue-400">{t("Infozeile „Fühlt sich an wie…\"")}</label>
             <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="text-xs font-medium text-[var(--mf-fg)]/60 flex justify-between mb-1.5">
                      <span>{t("Schriftgröße")}</span>
                      <span className="text-blue-300">{activeWidget.config?.subtextSize || 100}%</span>
                   </label>
                   <input
                      type="range" min="50" max="200" step="5"
                      value={activeWidget.config?.subtextSize || 100}
                      onChange={(e) => updateConfig(activeWidget.i, 'subtextSize', parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                   />
                </div>
                <div>
                   <label className="text-xs font-medium text-[var(--mf-fg)]/60 flex justify-between mb-1.5">
                      <span>{t("Deckkraft")}</span>
                      <span className="text-blue-300">{(activeWidget.config as any)?.subtextOpacity ?? 80}%</span>
                   </label>
                   <input
                      type="range" min="20" max="100" step="5"
                      value={(activeWidget.config as any)?.subtextOpacity ?? 80}
                      onChange={(e) => updateConfig(activeWidget.i, 'subtextOpacity', parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                   />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-3 mt-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)]">
                   <input
                      type="checkbox"
                      checked={(activeWidget.config as any)?.subtextUppercase === true}
                      onChange={(e) => updateConfig(activeWidget.i, 'subtextUppercase', e.target.checked)}
                      className="appearance-none w-4 h-4 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-blue-500 checked:border-blue-500"
                   />
                   {t("GROSSBUCHSTABEN")}
                </label>
                <select
                   value={(activeWidget.config as any)?.subtextTracking ?? 'wide'}
                   onChange={(e) => updateConfig(activeWidget.i, 'subtextTracking', e.target.value)}
                   className="bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs rounded-md px-2 h-8 focus:outline-none focus:border-blue-500"
                >
                   <option value="normal">{t("Normaler Abstand")}</option>
                   <option value="wide">{t("Weiter Abstand")}</option>
                   <option value="widest">{t("Sehr weiter Abstand")}</option>
                </select>
             </div>
          </div>
       </div>

       <div>
          <label className="text-xs font-medium text-[var(--mf-fg)]/40 block mb-2">{t("Anzeigename auf Dashboard")}</label>
          <input
             type="text" value={activeWidget.config?.location || ''} placeholder="Berlin"
             onChange={(e) => updateConfig(activeWidget.i, 'location', e.target.value)}
             className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/5 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:border-[var(--mf-bdr)]/20"
          />
        </div>

       {/* Atmosphärischer Wetter-Hintergrund */}
       <div className="pt-4 mt-4 border-t border-[var(--mf-bdr)]/10">
          <label className="flex items-center gap-3 cursor-pointer group">
             <div className="relative">
                <input type="checkbox"
                   checked={(activeWidget.config as any)?.weatherBg === true}
                   onChange={(e) => updateConfig(activeWidget.i, 'weatherBg', e.target.checked)}
                   className="sr-only peer" />
                <div className="w-11 h-6 bg-[var(--mf-elev)]/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
             </div>
             <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Wetter-Hintergrund")}</span>
          </label>
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1.5">{t("Weiche, unscharfe Farben, die die aktuelle Wetterlage darstellen.")}</p>
          {(activeWidget.config as any)?.weatherBg === true && (
             <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                   <label className="text-xs font-medium text-[var(--mf-fg)]/60 flex justify-between mb-1.5">
                      <span>{t("Deckkraft")}</span><span className="text-blue-300">{(activeWidget.config as any)?.weatherBgOpacity ?? 90}%</span>
                   </label>
                   <input type="range" min="10" max="100" step="5"
                      value={(activeWidget.config as any)?.weatherBgOpacity ?? 90}
                      onChange={(e) => updateConfig(activeWidget.i, 'weatherBgOpacity', parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10" />
                </div>
                <div>
                   <label className="text-xs font-medium text-[var(--mf-fg)]/60 flex justify-between mb-1.5">
                      <span>{t("Unschärfe")}</span><span className="text-blue-300">{(activeWidget.config as any)?.weatherBgBlur ?? 28}px</span>
                   </label>
                   <input type="range" min="0" max="60" step="2"
                      value={(activeWidget.config as any)?.weatherBgBlur ?? 28}
                      onChange={(e) => updateConfig(activeWidget.i, 'weatherBgBlur', parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10" />
                </div>
             </div>
          )}
       </div>
    </div>
  );
}

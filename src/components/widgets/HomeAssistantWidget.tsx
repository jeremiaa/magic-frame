"use client";

import { useEffect, useState, useRef } from "react";
import { Icon } from './WidgetIcon';

import EntityModal from "./ha/EntityModal";
import Sparkline from "./ha/Sparkline";
import { useGlassStyle } from "@/lib/ui/glass";
import { useHaLiveStates } from "@/lib/ha/useHaLiveStates";
import { useT } from "@/lib/i18n/LocaleProvider";
import { haAction } from "@/lib/ha/action-client";

const ACTIVE_STATES = [
  "on",
  "playing",
  "home",
  "open",
  "active",
  "detected",
  "unlocked",
  "charging",
  "cleaning",
  "heat",
  "cool",
  "mowing",
];

const TimerCountdown = ({ finishesAt, baseState }: { finishesAt?: string, baseState: string }) => {
   const [timeLeft, setTimeLeft] = useState<string>("");

   useEffect(() => {
      if (!finishesAt || baseState !== 'active') return;
      
      const updateTimer = () => {
         const target = new Date(finishesAt).getTime();
         const now = new Date().getTime();
         const diff = target - now;

         if (diff <= 0) {
            setTimeLeft("00:00:00");
            return;
         }

         const h = Math.floor(diff / (1000 * 60 * 60));
         const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
         const s = Math.floor((diff % (1000 * 60)) / 1000);

         if (h > 0) {
             setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
         } else {
             setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
         }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 500);
      return () => clearInterval(interval);
   }, [finishesAt, baseState]);

   if (baseState !== 'active') return <span className="font-medium opacity-70 tracking-wide capitalize">{baseState}</span>;
   if (!finishesAt) return <span className="font-medium opacity-70 tracking-wide capitalize">{baseState}</span>;
   
   return <span className="font-medium opacity-90 tracking-widest text-[0.85em] font-mono">{timeLeft || "..."}</span>;
};

export default function HomeAssistantWidget({ config, onVisibilityChange }: { config?: any, onVisibilityChange?: (isVisible: boolean) => void }) {
  const t = useT();
  const [statesDict, setStatesDict] = useState<Record<string, any>>({});
  const [error, setError] = useState("");
  const [openColorModal, setOpenColorModal] = useState<string | null>(null);

  const rawEntities: any[] = Array.isArray(config?.entities) ? config.entities : [];

  const slots = rawEntities
    .map(e => ({
      id: e?.entityId,
      icon: e?.icon,
      label: e?.label,
      color: e?.color,
      hideWhen: e?.hideWhen,
      colorWhen: e?.colorWhen,
      colorTarget: e?.colorTarget,
      showIfEntity: e?.showIfEntity,
      showIfState: e?.showIfState,
      tapAction: e?.tapAction,
      tapActionEntity: e?.tapActionEntity,
    }))
    .filter(s => s.id && s.id.trim() !== "");

  const slotIds = slots.map(s => s.id).filter(id => id && id.trim() !== "");
  const dependencyIds = slots.map(s => s.showIfEntity).filter(id => id && id.trim() !== "");
  const idsParam = Array.from(new Set([...slotIds, ...dependencyIds])).join(',');

  const pollIntervalMs = Math.max(2000, (config?.refreshInterval ?? 5) * 1000);
  const useLiveSync: boolean = config?.useLiveSync === true;

  // Live-SSE (opt-in). Wenn disabled liefert der Hook einen leeren Dict.
  const live = useHaLiveStates(useLiveSync ? [...slotIds, ...dependencyIds] : [], useLiveSync);

  useEffect(() => {
     if (useLiveSync) {
        // Live-Modus: Polling abgeschaltet. Statesdict kommt via Live-Hook.
        return;
     }
     if (!idsParam) return;
     const controller = new AbortController();
     let cancelled = false;

     const fetchState = async () => {
        try {
           const res = await fetch(`/api/ha/state?ids=${idsParam}`, { signal: controller.signal });
           if (!res.ok) throw new Error(await res.text());
           const data = await res.json();
           if (!cancelled) {
              setStatesDict(data);
              setError("");
           }
        } catch (err: any) {
           if (err?.name === "AbortError") return;
           if (!cancelled) setError(err.message);
        }
     };

     fetchState();
     const interval = setInterval(fetchState, pollIntervalMs);
     return () => {
        cancelled = true;
        controller.abort();
        clearInterval(interval);
     };
  }, [idsParam, pollIntervalMs, useLiveSync]);

  // Wenn Live-Modus, propagate states vom SSE-Hook in das bestehende Dict.
  useEffect(() => {
     if (!useLiveSync) return;
     setStatesDict(live.states);
     if (live.error) setError(live.error); else setError("");
  }, [useLiveSync, live.states, live.error]);

  // Sparkline / History
  const showSparkline: boolean = config?.showSparkline === true;
  const sparklineHours: number = Math.max(1, Math.min(168, Number(config?.sparklineHours) || 6));
  const [histories, setHistories] = useState<Record<string, number[]>>({});

  useEffect(() => {
     if (!showSparkline || slotIds.length === 0) return;
     const controller = new AbortController();
     let cancelled = false;

     const fetchHistories = async () => {
        const next: Record<string, number[]> = {};
        await Promise.all(
           slotIds.map(async (id) => {
              try {
                 const res = await fetch(
                    `/api/ha/history?entityId=${encodeURIComponent(id!)}&hours=${sparklineHours}`,
                    { signal: controller.signal }
                 );
                 if (!res.ok) return;
                 const data = await res.json();
                 const values: number[] = Array.isArray(data.series)
                    ? data.series.map((p: any) => p.v).filter((v: any) => Number.isFinite(v))
                    : [];
                 if (values.length > 1) next[id!] = values;
              } catch {}
           })
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
  }, [showSparkline, slotIds.join(","), sparklineHours]);

  const handleTap = async (slot: any) => {
      const action = slot.tapAction || 'toggle';
      if (action === 'none') return;

      const targetEntity = action === 'toggle_custom' ? slot.tapActionEntity : slot.id;
      if (!targetEntity) return;

      try {
         await haAction({ entityId: targetEntity, service: 'toggle' });
         // Refresh nach kurzer Pause, damit HA den State angewandt hat.
         setTimeout(() => {
            fetch(`/api/ha/state?ids=${idsParam}`)
               .then(r => r.ok ? r.json() : null)
               .then(d => { if (d) setStatesDict(d); })
               .catch(() => {});
         }, 500);
      } catch (e) {
         console.error("Tap action failed", e);
      }
  };

  const visibleCount = slots.filter(slot => {
      const stateObj = statesDict[slot.id as string];
      if (!stateObj) return true;
      const stateVal = stateObj.state;
      if (slot.hideWhen && slot.hideWhen.trim() !== "" && stateVal.toLowerCase() === slot.hideWhen.toLowerCase()) return false;
      
      if (slot.showIfEntity && slot.showIfEntity.trim() !== "") {
          const depStateObj = statesDict[slot.showIfEntity];
          const expectedState = slot.showIfState || "";
          if (!depStateObj || depStateObj.state.toLowerCase() !== expectedState.toLowerCase()) return false;
      }
      return true;
  }).length;

  const lastVisibleCountRef = useRef(-1);
  useEffect(() => {
      if (onVisibilityChange && Object.keys(statesDict).length > 0) {
         if (lastVisibleCountRef.current !== visibleCount) {
             lastVisibleCountRef.current = visibleCount;
             onVisibilityChange(visibleCount > 0);
         }
      }
  }, [visibleCount, onVisibilityChange, statesDict]);

  const glass = useGlassStyle(config);
  // Icon-Darstellung (issue #20 / iz3man): Rahmen-Box an/aus, Icon-Größe und
  // Kasten-Größe als Faktoren. Defaults reproduzieren exakt das bisherige
  // Verhalten (Box an, 3.2em-Box, 1.4em-Icon) → kein Regress für bestehende Views.
  const iconFrame = config?.iconFrame !== false;
  const iconScale = typeof config?.iconScale === "number" ? config.iconScale : 1;
  const frameScale = typeof config?.frameScale === "number" ? config.frameScale : 1;

  if (slots.length === 0) return <div className="text-white/50 text-sm tracking-wide flex items-center justify-center p-4 text-center">{t("Bitte mindestens eine Entity-ID im Editor konfigurieren")}</div>;
  if (error) return <div className="text-red-400 text-[0.8em]">{t(error)}</div>;
  if (Object.keys(statesDict).length === 0) return <div className="flex flex-col gap-2 w-full h-full justify-center">{slots.map((_, i) => <div key={i} className="animate-pulse bg-white/10 w-full h-[3em] rounded-full"></div>)}</div>;
  if (visibleCount === 0) return null; // Component hides correctly if all are hidden

  return (
    <div className="flex flex-col w-full h-full justify-start items-center gap-[0.6em] overflow-y-auto drop-shadow-md relative w-full no-scrollbar pb-2 pt-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
       {slots.map((slot, index) => {
          const stateObj = statesDict[slot.id as string];
          if (!stateObj) return <div key={index} className="animate-pulse bg-white/10 w-full h-[3em] rounded-full shrink-0"></div>;

          const friendlyName = (slot.label && String(slot.label).trim()) || stateObj.attributes?.friendly_name || slot.id;
          const stateVal = stateObj.state;
          const unit = stateObj.attributes?.unit_of_measurement || "";
          const finishesAt = stateObj.attributes?.finishes_at;
          
          if (slot.hideWhen && slot.hideWhen.trim() !== "" && stateVal.toLowerCase() === slot.hideWhen.toLowerCase()) {
              return null;
          }
          
          if (slot.showIfEntity && slot.showIfEntity.trim() !== "") {
              const depStateObj = statesDict[slot.showIfEntity];
              if (!depStateObj || depStateObj.state.toLowerCase() !== (slot.showIfState || "").toLowerCase()) {
                  return null;
              }
          }

          const iconStr = slot.icon || "mdi:home-assistant";
          const domain = (slot.id as string).split('.')[0];
          
          let isActive = false;
          let activeClass = "";
          let inlineIconStyle: any = {};
          
          const { cardOpacity, cardBlur, isLight, hasBg, baseRgb, borderRgba } = glass;

          const isLightDomain = domain === 'light';
          const isCoverDomain = domain === 'cover';
          const supportedColorModes = stateObj.attributes?.supported_color_modes || [];
          
          let sliderValue = 0;
          let hasSlider = false;
          let sliderMin = 0;
          let sliderMax = 100;
          
          const sliderSupportedModes = ['brightness', 'color_temp', 'hs', 'rgb', 'xy', 'rgbw', 'rgbww'];
          const meetsLightSliderCriteria = isLightDomain && supportedColorModes.some((m: string) => sliderSupportedModes.includes(m));
          const hasColorSupport = isLightDomain && supportedColorModes.some((m: string) => ['hs', 'rgb', 'xy', 'color_temp'].includes(m));
          
          if (meetsLightSliderCriteria) {
              hasSlider = true;
              sliderMax = 255;
              sliderValue = stateObj.attributes?.brightness || 0;
          } else if (isCoverDomain && stateObj.attributes?.current_position !== undefined) {
              hasSlider = true;
              sliderMax = 100;
              sliderValue = stateObj.attributes?.current_position || 0;
          }

          let inlineBgStyle: any = {
             backgroundColor: `rgba(${baseRgb},${cardOpacity / 100})`,
             border: hasBg ? `1px solid rgba(${borderRgba})` : 'none',
             backdropFilter: `blur(${cardBlur}px)`,
             WebkitBackdropFilter: `blur(${cardBlur}px)`
          };

          const applySliderAction = (val: number) => {
              const fetchAction = (domainStr: string, service: string, data: any) => {
                  void haAction({ entityId: slot.id, domain: domainStr, service, data });
              };
              if (isLightDomain) {
                  fetchAction('light', val === 0 ? 'turn_off' : 'turn_on', val > 0 ? { brightness: val } : {});
              } else if (isCoverDomain) {
                  fetchAction('cover', 'set_cover_position', { position: val });
              }
          };

          const valLower = stateVal.toLowerCase();
          
          if (slot.colorWhen && slot.colorWhen.trim() !== "") {
              const condition = slot.colorWhen.trim();
              if (condition.startsWith('>=')) {
                  const val = parseFloat(condition.slice(2));
                  if (!isNaN(val) && parseFloat(stateVal) >= val) isActive = true;
              } else if (condition.startsWith('<=')) {
                  const val = parseFloat(condition.slice(2));
                  if (!isNaN(val) && parseFloat(stateVal) <= val) isActive = true;
              } else if (condition.startsWith('>')) {
                  const val = parseFloat(condition.slice(1));
                  if (!isNaN(val) && parseFloat(stateVal) > val) isActive = true;
              } else if (condition.startsWith('<')) {
                  const val = parseFloat(condition.slice(1));
                  if (!isNaN(val) && parseFloat(stateVal) < val) isActive = true;
              } else if (condition.startsWith('!=')) {
                  if (valLower !== condition.slice(2).trim().toLowerCase()) isActive = true;
              } else {
                  if (valLower === condition.toLowerCase()) isActive = true;
              }
          } else if (ACTIVE_STATES.includes(valLower)) {
             isActive = true;
          } else if ((!slot.colorWhen || slot.colorWhen.trim() === '') && slot.color && slot.color.trim() !== "") {
             // always colored if custom color exists but no color condition
             isActive = true;
          }

          let customColor = slot.color && slot.color.trim() !== "" ? slot.color : null;
          
          if (isActive && !customColor) {
               if (isLightDomain && stateObj.attributes?.rgb_color) {
                   const [r, g, b] = stateObj.attributes.rgb_color;
                   customColor = `rgb(${r}, ${g}, ${b})`;
               } else {
                   customColor = (domain === 'person' || domain === 'device_tracker') ? '#38bdf8' : '#facc15';
               }
          }
          
          if (isActive && customColor) {
              const isBgTarget = slot.colorTarget === 'bg';
              
              if (isBgTarget) {
                 inlineBgStyle = { 
                    ...inlineBgStyle, 
                    backgroundColor: `${customColor}33`,
                    color: '#FFF',
                    border: `1px solid ${customColor}50`,
                    boxShadow: hasBg ? `0 8px 32px ${customColor}15` : 'none',
                    borderLeft: hasBg ? `0.3em solid ${customColor}` : 'none'
                 };
                 inlineIconStyle = { 
                    backgroundColor: `${customColor}20`, 
                    color: customColor,
                    boxShadow: `inset 0 0 12px ${customColor}40` 
                 };
              } else {
                 inlineIconStyle = {
                    backgroundColor: `${customColor}20`,
                    color: customColor, 
                    boxShadow: `inset 0 0 12px ${customColor}40` 
                 };
              }
          } else if (!isActive) {
             activeClass = "";
             inlineIconStyle = {
                 ...inlineIconStyle,
                 backgroundColor: hasBg ? (isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)") : "transparent",
                 color: isLight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)",
             }
          }

          const isMinimal = config?.design === 'minimal';

          if (isMinimal) {
             const accentColor = customColor || (isActive ? (isLight ? '#000' : '#fff') : (isLight ? '#00000080' : '#ffffff80'));
             const isTappable = (!slot.tapAction) || slot.tapAction !== 'none';
             return (
               <div key={index} onClick={() => handleTap(slot)} className={`flex gap-[0.8em] items-baseline mb-[0.6em] transition-transform ${isTappable ? 'cursor-pointer active:scale-95' : ''}`}>
                 <span className={`shrink-0 w-[4px] rounded-full self-stretch my-1 ${isLight ? 'bg-black' : 'bg-white'}`} style={{ backgroundColor: accentColor }}></span>
                 <div className="flex flex-col min-w-0" style={{ width: '4.5em' }}>
                   <div className="flex items-center justify-center w-full h-full opacity-80" style={{ color: accentColor }}>
                      <Icon icon={iconStr} className="text-[1.8em]" />
                   </div>
                 </div>
                 <div className="flex flex-col flex-1 min-w-0 justify-center">
                   <span className={`font-bold leading-tight truncate ${isLight ? 'text-black' : 'text-white'}`} style={{ fontSize: '1em' }}>{friendlyName}</span>
                   <span className={`flex flex-wrap gap-[0.3em] font-mono text-[0.8em] ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                       {domain === 'timer' ? (
                          <TimerCountdown finishesAt={finishesAt} baseState={stateVal} />
                       ) : (
                          <span>{stateVal}</span>
                       )}
                       {unit && <span>{unit}</span>}
                   </span>
                 </div>
               </div>
             );
          }

          const isTappable = (!slot.tapAction) || slot.tapAction !== 'none';
          
          const sparkValues = showSparkline ? histories[slot.id as string] : undefined;
          return (
             <div key={index} onClick={() => handleTap(slot)} style={inlineBgStyle} className={`relative overflow-hidden flex items-center justify-start gap-[0.8em] w-full rounded-3xl p-[0.6em] transform transition-transform shrink-0 ${hasBg ? 'shadow-xl' : ''} ${isTappable ? 'cursor-pointer active:scale-95' : ''}`}>
                {sparkValues && sparkValues.length > 1 && (
                   <Sparkline
                      values={sparkValues}
                      color={customColor || (isLight ? '#0ea5e9' : '#60a5fa')}
                      className="absolute inset-0 w-full h-full pointer-events-none opacity-50"
                   />
                )}
                {iconFrame ? (
                <div style={{ ...inlineIconStyle, width: `${3.2 * frameScale}em`, height: `${3.2 * frameScale}em` }} className={`relative shrink-0 rounded-[0.8em] flex items-center justify-center overflow-hidden transition-colors duration-500 ${hasBg ? (isLight ? 'border border-black/5' : 'border border-white/5') : ''} ${activeClass}`}>
                    <div className="absolute inset-0 opacity-20 blur-md" style={{ backgroundColor: inlineIconStyle.color || (isActive && !customColor ? 'white' : 'transparent') }}></div>
                    <Icon icon={iconStr} className="relative z-10" style={{ fontSize: `${1.4 * iconScale}em` }} />
                </div>
                ) : (
                <Icon icon={iconStr} className="relative z-10 shrink-0" style={{ fontSize: `${1.4 * iconScale}em`, color: inlineIconStyle.color || (isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)') }} />
                )}
                <div className="relative flex flex-col min-w-0 flex-1">
                    <span style={{ fontSize: '0.9em', color: isLight ? "rgba(0,0,0,0.9)" : "#fff" }} className={`font-bold tracking-tight leading-tight text-ellipsis whitespace-nowrap overflow-hidden`}>{friendlyName}</span>
                    <div style={{ color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }} className={`flex items-baseline gap-[0.3em] font-mono uppercase tracking-wider mt-[0.2em] text-ellipsis whitespace-nowrap overflow-hidden`}>
                       {domain === 'timer' ? (
                          <TimerCountdown finishesAt={finishesAt} baseState={stateVal} />
                       ) : (
                          <span style={{ fontSize: '0.7em' }}>{stateVal}</span>
                       )}
                       {unit && !['timer'].includes(domain) && <span style={{ fontSize: '0.6em' }}>{unit}</span>}
                    </div>
                </div>
                {(hasSlider || hasColorSupport) && !config?.hideControlButton && (
                   <button
                     onClick={(e) => { e.stopPropagation(); setOpenColorModal(slot.id as string); }}
                     className={`shrink-0 w-[2.2em] h-[2.2em] rounded-full flex items-center justify-center ${isLight ? 'bg-black/5 text-black/60' : 'bg-white/10 text-white/60'} hover:scale-110 active:scale-95 transition-transform`}
                   >
                     <Icon icon={isCoverDomain ? "lucide:sliders-horizontal" : (
                       isLightDomain && stateObj.attributes?.supported_color_modes?.some((m: string) => ['rgb', 'hs', 'xy', 'color_temp'].includes(m)) 
                       ? "lucide:palette" 
                       : "lucide:settings-2"
                     )} />
                   </button>
                )}
             </div>
          );
       })}
       
       {openColorModal && statesDict[openColorModal] && (
           <EntityModal 
               domain={(openColorModal as string).split('.')[0]}
               entityId={openColorModal}
               friendlyName={statesDict[openColorModal].attributes?.friendly_name || openColorModal}
               stateVal={statesDict[openColorModal].state}
               sliderValue={(openColorModal as string).split('.')[0] === 'cover' ? (statesDict[openColorModal].attributes?.current_position || 0) : (statesDict[openColorModal].attributes?.brightness || 0)}
               sliderMax={(openColorModal as string).split('.')[0] === 'cover' ? 100 : 255}
               supportedModes={statesDict[openColorModal].attributes?.supported_color_modes || []}
               isLight={glass.isLight}
               accentColor={statesDict[openColorModal].state === 'on' ? (statesDict[openColorModal].attributes?.rgb_color ? `rgb(${statesDict[openColorModal].attributes.rgb_color.join(',')})` : '#facc15') : '#ffffff80'}
               onClose={() => setOpenColorModal(null)}
           />
       )}
    </div>
  );
}

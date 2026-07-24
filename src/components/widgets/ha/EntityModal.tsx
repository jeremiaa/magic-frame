"use client";

import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../WidgetIcon";
import { useT } from "@/lib/i18n/LocaleProvider";

interface EntityModalProps {
    domain: string;
    entityId: string;
    friendlyName: string;
    stateVal: string;
    sliderValue: number;
    sliderMax: number;
    supportedModes: string[];
    onClose: () => void;
    isLight: boolean;
    accentColor: string;
}

export default function EntityModal({ domain, entityId, friendlyName, stateVal, sliderValue, sliderMax, supportedModes, onClose, isLight, accentColor }: EntityModalProps) {
    const t = useT();
    const [localVal, setLocalVal] = useState(sliderValue);
    const [localColor, setLocalColor] = useState(accentColor);
    const [customColors, setCustomColors] = useState<string[]>([]);
    const timerRef = useRef<any>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('ha_color_favorites');
            if (stored) {
                setCustomColors(JSON.parse(stored));
            } else {
                setCustomColors(['#ffffff', '#ffa500', '#3264ff', '#ff00ff']);
            }
        } catch(e) {}
    }, []);

    const applyAction = (service: string, data: any) => {
        fetch('/api/ha/action', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ entityId, domain, service, data })
        });
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setLocalVal(val);
    };

    const commitSliderChange = () => {
        if (domain === 'light') {
            applyAction(localVal === 0 ? 'turn_off' : 'turn_on', localVal > 0 ? { brightness: localVal } : {});
        } else if (domain === 'cover') {
            applyAction('set_cover_position', { position: localVal });
        }
    };

    const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }

    const applyColor = (hex: string) => {
        setLocalColor(hex);
        if (domain === 'light') {
            applyAction('turn_on', { rgb_color: hexToRgb(hex) });
        }
    };

    const saveToFavorite = (index: number) => {
        const newColors = [...customColors];
        newColors[index] = localColor;
        setCustomColors(newColors);
        localStorage.setItem('ha_color_favorites', JSON.stringify(newColors));
    };

    const bgClass = isLight ? "bg-white/80" : "bg-[#111111]/80";
    const textClass = isLight ? "text-black" : "text-white";
    
    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-end p-2 pb-3 rounded-3xl overflow-hidden" style={{ backgroundColor: isLight ? '#ffffff' : '#1a1a1a' }}>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/10 rounded-full text-white">
                <Icon icon="lucide:x" className={textClass} />
            </button>
            
            <h3 className={`font-bold text-base mb-1 ${textClass}`}>{friendlyName}</h3>
            <p className={`text-sm opacity-60 mb-3 ${textClass}`}>{stateVal} • {Math.round((localVal/sliderMax)*100)}%</p>

            {/* Fat Horizontal Slider */}
            <div className={`relative w-[85vw] max-w-[320px] h-16 shrink-0 rounded-3xl overflow-hidden mb-3 flex justify-start ${isLight ? 'bg-black/10' : 'bg-white/10'}`} style={{ boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)' }}>
                <input 
                    type="range" 
                    min="0" max={sliderMax}
                    value={localVal} 
                    onChange={handleSliderChange}
                    onMouseUp={commitSliderChange}
                    onTouchEnd={commitSliderChange}
                    className="absolute inset-0 opacity-0 cursor-pointer h-full w-full z-10"
                />
                <div 
                    className="h-full transition-all duration-150 ease-out"
                    style={{ width: `${(localVal / sliderMax) * 100}%`, backgroundColor: localColor !== '#ffffff' && localColor !== '#ffffff80' ? localColor : '#8b5cf6' }}
                ></div>
            </div>

            {/* Quick Colors (only for lights with color support) */}
            {domain === 'light' && supportedModes.some(m => ['rgb', 'hs', 'xy', 'color_temp'].includes(m)) && (
                <div className="flex flex-wrap gap-2 justify-center mb-3">
                   {customColors.slice(0, 4).map((hex, i) => (
                       <button
                           key={i}
                           onPointerDown={(e) => {
                               // Start timer on pointer down
                               timerRef.current = setTimeout(() => {
                                   saveToFavorite(i);
                                   timerRef.current = null;
                                   
                                   // Visual feedback
                                   const target = e.target as HTMLElement;
                                   target.style.transform = "scale(1.2)";
                                   setTimeout(() => { target.style.transform = ""; }, 200);
                               }, 600);
                           }}
                           onPointerUp={() => {
                               if (timerRef.current) {
                                   clearTimeout(timerRef.current);
                                   timerRef.current = null;
                                   applyColor(hex);
                               }
                           }}
                           onPointerLeave={() => {
                               if (timerRef.current) {
                                   clearTimeout(timerRef.current);
                                   timerRef.current = null;
                               }
                           }}
                           onContextMenu={(e) => e.preventDefault()}
                           className="w-10 h-10 rounded-full shadow-md border border-black/10 hover:scale-110 transition-transform active:scale-95 flex items-center justify-center relative touch-none"
                           style={{ backgroundColor: hex }}
                       >
                       </button>
                   ))}
                   
                   <div style={{ width: '1px', backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>
                   
                   {/* Dynamic ColorPicker Button */}
                   <label className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border border-black/10 overflow-hidden relative hover:scale-110 transition-transform ${isLight ? 'bg-black/5' : 'bg-white/10'}`}>
                        <div className="absolute inset-0 z-0" style={{ backgroundColor: localColor, opacity: 0.2 }}></div>
                        <Icon icon="lucide:pipette" className={textClass} style={{ width: '1.2em', height: '1.2em', zIndex: 1 }} />
                        <input 
                            type="color" 
                            value={localColor.startsWith('#') && localColor.length === 7 ? localColor : '#ffffff'}
                            className="absolute opacity-0 w-[200%] h-[200%] cursor-pointer left-0 top-0 z-10" 
                            onChange={(e) => {
                                applyColor(e.target.value);
                            }} 
                        />
                   </label>
                   
                   <p className="w-full text-center text-[0.6em] opacity-40 mt-1 uppercase tracking-widest">{t("Tippen = Farbe Setzen")} &bull; {t("Halten = Speichern")}</p>
                </div>
            )}
            
            {/* Quick Actions */}
            <div className={`flex items-center gap-4 p-1 rounded-2xl mb-1 ${isLight ? 'bg-white/50' : 'bg-black/50'}`}>
                {domain === 'cover' ? (
                    <>
                        <button onClick={() => applyAction('open_cover', {})} className={`p-2 rounded-full ${isLight ? 'bg-black/5' : 'bg-white/10'} ${textClass}`}>
                            <Icon icon="lucide:arrow-up" />
                        </button>
                        <button onClick={() => applyAction('stop_cover', {})} className={`p-2 rounded-full ${isLight ? 'bg-black/5' : 'bg-white/10'} ${textClass}`}>
                            <Icon icon="lucide:square" />
                        </button>
                        <button onClick={() => applyAction('close_cover', {})} className={`p-2 rounded-full ${isLight ? 'bg-black/5' : 'bg-white/10'} ${textClass}`}>
                            <Icon icon="lucide:arrow-down" />
                        </button>
                    </>
                ) : (
                    <button onClick={() => applyAction('toggle', {})} className={`p-2 rounded-full ${isLight ? 'bg-black/5' : 'bg-white/10'} ${textClass}`}>
                        <Icon icon="lucide:power" />
                    </button>
                )}
            </div>
        </div>
    );
}

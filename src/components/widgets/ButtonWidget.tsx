"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useT } from "@/lib/i18n/LocaleProvider";

interface ButtonWidgetProps {
  config?: any;
}

const LONG_PRESS_MS = 500;

async function runButtonAction(slot: any, longPress: boolean) {
    // actionType Varianten:
    //  'toggle' | 'show' | 'hide'  -> CustomEvent an Widget-Targets
    //  'ha_service'                -> HA-Service-Call (/api/ha/action)
    //  'ha_toggle'                 -> HA-toggle auf bestimmter Entity
    //  'webhook'                   -> fetch POST
    //  'none'                      -> nix
    const action = longPress ? (slot.longPressAction || "none") : (slot.actionType || "toggle");

    if (action === "none") return;

    if (action === "ha_service") {
        const entity = longPress ? slot.longPressEntity : slot.haEntity;
        const service = longPress ? slot.longPressService : slot.haService;
        if (!entity || !service) return;
        const parts = service.split(".");
        if (parts.length !== 2) return;
        try {
            await fetch("/api/ha/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entityId: entity, domain: parts[0], service: parts[1] }),
            });
        } catch (e) {
            console.error("HA-Service failed", e);
        }
        return;
    }

    if (action === "ha_toggle") {
        const entity = longPress ? slot.longPressEntity : slot.haEntity;
        if (!entity) return;
        try {
            await fetch("/api/ha/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entityId: entity, service: "toggle" }),
            });
        } catch (e) {
            console.error("HA-Toggle failed", e);
        }
        return;
    }

    if (action === "webhook") {
        const url = longPress ? slot.longPressWebhook : slot.webhook;
        if (!url) return;
        try {
            await fetch(url, { method: "POST", mode: "no-cors" });
        } catch (e) {
            console.error("Webhook failed", e);
        }
        return;
    }

    // Default: Widget-Targets toggeln/show/hide
    const targets = Array.isArray(slot.targetsConfig)
        ? slot.targetsConfig
        : (typeof slot.targetsConfig === "string"
            ? slot.targetsConfig.split(",").map((t: string) => t.trim()).filter(Boolean)
            : []);
    if (targets.length === 0) return;
    const event = new CustomEvent("WIDGET_ACTION", { detail: { targets, actionType: action } });
    window.dispatchEvent(event);
}

const ActionBtn = ({
    icon, label, slot, customColor, responsiveText, iconSize, fontSize,
    bgOpacity, bgBlur, bgRadius, btnShape, iconScale = 100, btnScale = 100
}: any) => {
    // btnShape: "square" | "circle" | "subtle" | "fill"
    const shape = btnShape || 'square';

    const [isPressing, setIsPressing] = useState(false);
    const touchStartPos = React.useRef<{x: number, y: number} | null>(null);
    const isTouchDevice = React.useRef(false);
    const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFired = React.useRef(false);

    const startLongPressTimer = () => {
        longPressFired.current = false;
        if (!slot?.longPressAction || slot.longPressAction === "none") return;
        longPressTimer.current = setTimeout(() => {
            longPressFired.current = true;
            if (navigator.vibrate) navigator.vibrate(25);
            runButtonAction(slot, true);
        }, LONG_PRESS_MS);
    };
    const cancelLongPressTimer = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleClick = () => {
        if (longPressFired.current) return;
        runButtonAction(slot, false);
    };

    const hasBox = bgOpacity > 0 || bgBlur > 0;
    
    // Style adjustments based on shape
    let overrideStyle: any = { flex: '1 1 0', width: '100%', height: '100%' };
    let bgStyle: any = {
        backgroundColor: shape === 'subtle' ? 'transparent' : `rgba(255,255,255, ${bgOpacity / 100})`,
        backdropFilter: (shape === 'subtle' || bgBlur === 0) ? 'none' : `blur(${bgBlur}px)`,
        transition: 'background-color 0.2s, box-shadow 0.2s',
        color: customColor || 'inherit',
        border: (hasBox && shape !== 'subtle') ? '1px solid rgba(255,255,255,0.05)' : 'none',
    };
    
    if (shape === 'fill') {
        overrideStyle = { ...overrideStyle, borderRadius: `${bgRadius}%` };
        bgStyle = { ...bgStyle, borderRadius: `${bgRadius}%` };
    } else if (shape === 'circle') {
        const sz = '80cqmin';
        bgStyle = { ...bgStyle, width: `calc(${sz} * ${btnScale/100})`, height: `calc(${sz} * ${btnScale/100})`, borderRadius: '50%', aspectRatio: '1/1', flex: 'none', margin: '0 auto' };
    } else if (shape === 'subtle') {
        bgStyle = { ...bgStyle, borderRadius: `${bgRadius}%` };
    } else {
        // Square
        const sz = '90cqmin';
        bgStyle = { ...bgStyle, width: sz, height: sz, borderRadius: `${bgRadius}%`, aspectRatio: '1/1', flex: 'none', margin: '0 auto' };
    }

    return (
        <div style={overrideStyle} className="flex items-center justify-center p-2 group">
            <div
               className={`relative flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${shape !== 'subtle' ? 'shadow-lg' : 'group-hover:bg-white/5 rounded-xl'} ${isPressing ? 'scale-90 opacity-50 bg-white/30' : 'opacity-80'}`}
               style={{...bgStyle, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent'}}

               onTouchStart={(e) => {
                   isTouchDevice.current = true;
                   setIsPressing(true);
                   if (e.touches.length > 0) {
                       touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                   }
                   startLongPressTimer();
               }}
               onTouchEnd={(e) => {
                   setIsPressing(false);
                   cancelLongPressTimer();
                   if (touchStartPos.current && e.changedTouches.length > 0) {
                       const dx = e.changedTouches[0].clientX - touchStartPos.current.x;
                       const dy = e.changedTouches[0].clientY - touchStartPos.current.y;
                       if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
                           e.preventDefault();
                           handleClick();
                       }
                   }
                   touchStartPos.current = null;
               }}
               onTouchCancel={() => {
                   setIsPressing(false);
                   cancelLongPressTimer();
                   touchStartPos.current = null;
               }}
               onMouseDown={(e) => {
                   if (!isTouchDevice.current) {
                       setIsPressing(true);
                       startLongPressTimer();
                   }
               }}
               onMouseUp={(e) => {
                   if (!isTouchDevice.current) {
                       setIsPressing(false);
                       cancelLongPressTimer();
                   }
               }}
               onMouseLeave={(e) => {
                   if (!isTouchDevice.current) {
                       setIsPressing(false);
                       cancelLongPressTimer();
                   }
               }}
               onClick={(e) => {
                   if (!isTouchDevice.current) {
                       setIsPressing(false);
                       handleClick();
                   }
               }}
            >
             <Icon 
                icon={icon || 'lucide:power'} 
                style={{ 
                   fontSize: responsiveText ? `calc(${label ? '35cqmin' : '55cqmin'} * ${iconScale / 100})` : `calc(${iconSize ? iconSize : 28}px * ${iconScale / 100})`,
                   marginBottom: label ? '0.2em' : '0'
                }} 
             />
             {label && (
                 <div 
                     className="text-center font-medium truncate w-[90%]"
                     style={{
                         fontSize: responsiveText ? '14cqmin' : (fontSize ? `${fontSize}px` : '10px')
                     }}
                 >
                     {label}
                 </div>
             )}
            </div>
        </div>
    );
};

export default function ButtonWidget({ config = {} }: ButtonWidgetProps) {
  const t = useT();

  // Extract up to 4 configured buttons.
  // We check if an icon or target is defined to consider a slot "active".
  // Note: config natively maps 1 without digit for backwards compat, mapping explicitly in editor.
  
  const extractBtn = (idx: number) => {
      const suffix = idx === 1 ? '' : String(idx);

      // Explicit per-slot hide — keeps the slot's config intact but drops it
      // from the rendered widget. Lets the user show e.g. only 1 of the 4
      // slots without having to clear icon / label / targets / actions.
      if (config[`btnHidden${suffix}`]) return null;

      const icon = config[`icon${suffix}`];
      const targets = config[`targets${suffix}`];
      const label = config[`label${suffix}`];

      // If none of these exist, the slot is technically "empty"
      if (!icon && (!targets || targets.length === 0) && !label) return null;
      
      return {
          id: idx,
          icon: icon || 'lucide:power',
          label: label || '',
          actionType: config[`actionType${suffix}`] || 'toggle',
          targetsConfig: targets,
          haEntity: config[`haEntity${suffix}`],
          haService: config[`haService${suffix}`],
          webhook: config[`webhook${suffix}`],
          longPressAction: config[`longPressAction${suffix}`] || 'none',
          longPressEntity: config[`longPressEntity${suffix}`],
          longPressService: config[`longPressService${suffix}`],
          longPressWebhook: config[`longPressWebhook${suffix}`],
          customColor: config[`color${suffix}`] || config.color
      };
  };

  const activeBtns = [extractBtn(1), extractBtn(2), extractBtn(3), extractBtn(4)].filter(Boolean);

  // Global Design Config
  // Background defaults back to fully transparent if not explicitly defined
  const designLayout = config.designLayout || 'auto';
  const bgOpacity = config.bgOpacity !== undefined ? Number(config.bgOpacity) : 5;
  const bgBlur = config.bgBlur !== undefined ? Number(config.bgBlur) : 10;
  const bgRadius = config.bgRadius !== undefined ? Number(config.bgRadius) : 50; 
  
  if (activeBtns.length === 0) {
      // Fallback for completely empty configuration
      return (
         <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">{t("Aktion konfigurieren...")}</div>
      );
  }

  // Layout Matrix Application
  let gridStyle = "";
  if (designLayout === 'row') {
      gridStyle = "flex flex-row gap-3 items-center justify-center w-full h-full";
  } else if (designLayout === 'col') {
      gridStyle = "flex flex-col gap-3 items-center justify-center w-full h-full";
  } else {
      if (activeBtns.length === 1) gridStyle = "flex items-center justify-center w-full h-full";
      else if (activeBtns.length === 2) gridStyle = "grid grid-cols-2 gap-4 place-items-center w-full h-full";
      else if (activeBtns.length === 3) gridStyle = "grid grid-cols-3 gap-3 place-items-center w-full h-full";
      else gridStyle = "grid grid-cols-2 grid-rows-2 gap-4 place-items-center w-full h-full";
  }
  
  // Special fallback if it's strictly 1 item in auto grid
  if (activeBtns.length === 1 && designLayout === 'auto') {
      gridStyle = "flex items-center justify-center w-full h-full";
  }

  return (
    <div 
      className="relative w-full h-full p-2 lg:p-4"
      style={{ containerType: 'size' }}
    >
        <div className={gridStyle}>
            {activeBtns.map(btn => (
               <ActionBtn
                  key={btn!.id}
                  icon={btn!.icon}
                  label={btn!.label}
                  customColor={btn!.customColor}
                  slot={btn}
                  responsiveText={config.responsiveText}
                  iconSize={config.iconSize}
                  fontSize={config.fontSize}
                  bgOpacity={bgOpacity}
                  bgBlur={bgBlur}
                  bgRadius={bgRadius}
                  iconScale={config.iconScale}
                  btnScale={config.btnScale}
                  btnShape={config.btnShape}
               />
            ))}
        </div>
    </div>
  );
}

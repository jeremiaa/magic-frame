"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "./WidgetIcon";
import { QrCode as QrIcon } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

// WLAN-Sonderzeichen im WIFI:-String escapen (\ ; , : ").
function wifiEscape(s: string): string {
  return (s || "").replace(/([\\;,:"])/g, "\\$1");
}

function buildPayload(config: any): string {
  const type = config?.qrType || "wifi";
  if (type === "wifi") {
    const enc = config?.wifiEncryption || "WPA";
    const ssid = wifiEscape(config?.wifiSsid || "");
    if (!ssid) return "";
    if (enc === "nopass") return `WIFI:T:nopass;S:${ssid};;`;
    const pw = wifiEscape(config?.wifiPassword || "");
    const hidden = config?.wifiHidden ? "H:true;" : "";
    return `WIFI:T:${enc};S:${ssid};P:${pw};${hidden};`;
  }
  return (config?.content || "").trim();
}

// Helligkeit einer Hex-Farbe → für automatischen Kontrast (Center-Icon).
function isLightColor(hex: string): boolean {
  let h = (hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

export default function QrWidget({ config }: { config?: any }) {
  const t = useT();

  const dotStyle: string = config?.dotStyle || "rounded";
  const eyeStyle: string = config?.eyeStyle || "rounded";
  const gradient: string = config?.gradient || "none";
  const bgMode: string = config?.bgMode || "solid";
  const solid = bgMode !== "transparent";
  const level: "L" | "M" | "Q" | "H" = config?.centerIcon ? "H" : (config?.level || "M");

  const bg: string | null = solid ? (config?.bgColor || "#ffffff") : null;
  const c1: string = config?.color1 || (solid ? "#0f172a" : "#ffffff");
  const c2: string = config?.color2 || (solid ? "#6366f1" : "#cbd5e1");
  const centerIcon: string = config?.centerIcon || "";

  const payload = buildPayload(config);
  const type = config?.qrType || "wifi";
  const showLabel = config?.showLabel !== false;
  const label: string = (config?.label || (type === "wifi" ? config?.wifiSsid : "") || "").trim();

  // Tile vermessen → QR quadratisch in den verfügbaren Platz einpassen.
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const matrix = useMemo(() => {
    if (!payload) return null;
    try { return QRCode.create(payload, { errorCorrectionLevel: level }).modules; }
    catch { return "toolong" as const; }
  }, [payload, level]);

  if (!payload) {
    return (
      <div ref={boxRef} className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/40 text-center p-3" style={{ fontSize: 13 }}>
        <QrIcon size={20} className="opacity-60" />
        {t(type === "wifi" ? "WLAN-Name im Inspector eintragen" : "Inhalt im Inspector eintragen")}
      </div>
    );
  }
  if (matrix === "toolong" || !matrix) {
    return <div ref={boxRef} className="w-full h-full flex items-center justify-center text-red-400/70 text-center p-3" style={{ fontSize: 12 }}>⚠ {t("Inhalt zu lang für einen QR-Code")}</div>;
  }

  const n = matrix.size;
  const data = matrix.data;
  const dark = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && !!data[y * n + x];
  const inFinder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);

  const fill = gradient === "none" ? c1 : "url(#mf-qr-grad)";

  // Module (ohne Finder-Ecken) im gewählten Stil.
  const mods: React.ReactNode[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!dark(x, y) || inFinder(x, y)) continue;
    const k = `${x}-${y}`;
    if (dotStyle === "dots") mods.push(<circle key={k} cx={x + 0.5} cy={y + 0.5} r={0.43} />);
    else if (dotStyle === "rounded") mods.push(<rect key={k} x={x + 0.07} y={y + 0.07} width={0.86} height={0.86} rx={0.32} />);
    else if (dotStyle === "classy") mods.push(<rect key={k} x={x + 0.04} y={y + 0.04} width={0.92} height={0.92} rx={0.46} />);
    else mods.push(<rect key={k} x={x} y={y} width={1.02} height={1.02} />);
  }

  const eye = (fx: number, fy: number) => {
    const orx = eyeStyle === "circle" ? 3.25 : eyeStyle === "rounded" ? 2 : 0;
    const irx = eyeStyle === "circle" ? 1.5 : eyeStyle === "rounded" ? 0.9 : 0;
    return (
      <g key={`e-${fx}-${fy}`}>
        <rect x={fx + 0.5} y={fy + 0.5} width={6} height={6} rx={orx} fill="none" stroke={fill} strokeWidth={1} />
        <rect x={fx + 2} y={fy + 2} width={3} height={3} rx={irx} fill={fill} />
      </g>
    );
  };

  const qrScale = Math.max(20, Math.min(100, Number(config?.qrScale) || 100)) / 100;
  const qrSize = Math.max(0, (Math.min(box.w || 240, (box.h || 240) - (showLabel && label ? 26 : 0)) - 8) * qrScale);
  const iconFg = isLightColor(c1) ? "#0f172a" : "#ffffff";

  return (
    <div ref={boxRef} className="w-full h-full flex flex-col items-center justify-center gap-[0.5em] p-[2%] overflow-hidden">
      <div className="relative shrink-0" style={{ width: qrSize, height: qrSize }}>
        <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width="100%" height="100%" shapeRendering="geometricPrecision">
          {gradient !== "none" && (
            <defs>
              {gradient === "linear" ? (
                <linearGradient id="mf-qr-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} />
                </linearGradient>
              ) : (
                <radialGradient id="mf-qr-grad" cx="0.5" cy="0.5" r="0.75">
                  <stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} />
                </radialGradient>
              )}
            </defs>
          )}
          {bg && <rect x={-2} y={-2} width={n + 4} height={n + 4} rx={4} fill={bg} />}
          <g fill={fill}>{mods}</g>
          <g>{eye(0, 0)}{eye(n - 7, 0)}{eye(0, n - 7)}</g>
        </svg>
        {centerIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full flex items-center justify-center" style={{ width: `${qrSize * 0.22}px`, height: `${qrSize * 0.22}px`, backgroundColor: c1, boxShadow: bg ? `0 0 0 ${qrSize * 0.02}px ${bg}` : undefined }}>
              <Icon icon={centerIcon} width={qrSize * 0.13} height={qrSize * 0.13} style={{ color: iconFg }} />
            </div>
          </div>
        )}
      </div>
      {showLabel && label && (
        <div className="shrink-0 text-center font-medium tracking-tight truncate max-w-full px-2" style={{ fontSize: "clamp(11px, 4cqw, 16px)", color: "rgba(255,255,255,0.85)" }}>
          {label}
        </div>
      )}
    </div>
  );
}

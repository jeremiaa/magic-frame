import React from 'react';

// Solid-Icon-Set für Wetter-Widgets.
// Designprinzipien:
//   - viewBox 100x100, alle Pfade innerhalb 5–95 (Sicherheits-Padding)
//   - Klare, satte Farben — bewusst KEINE drop-shadow-Filter im SVG selbst,
//     die Tiefe kommt von außen via Tailwind `drop-shadow-md` (gesetzt in wmo.tsx)
//   - Doppel-Wolken-Stil: dunkle Hinter-Wolke + helle Vorder-Wolke gibt Tiefe
//     ohne 3D-Shading
//   - Farben: Slate-Palette (Tailwind) für Wolken, Amber für Sonne, Yellow
//     für Sterne/Mond, Blue für Regen, Sky-Blue für Schnee/Eis

// ── Klar / Sonne ─────────────────────────────────────────────
export const SolidSun = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="50" cy="50" r="22" fill="#FBBF24" />
    <g stroke="#FBBF24" strokeWidth="6" strokeLinecap="round">
      <line x1="50" y1="14" x2="50" y2="8" />
      <line x1="50" y1="86" x2="50" y2="92" />
      <line x1="14" y1="50" x2="8" y2="50" />
      <line x1="86" y1="50" x2="92" y2="50" />
      <line x1="24.5" y1="24.5" x2="20" y2="20" />
      <line x1="75.5" y1="75.5" x2="80" y2="80" />
      <line x1="24.5" y1="75.5" x2="20" y2="80" />
      <line x1="75.5" y1="24.5" x2="80" y2="20" />
    </g>
  </svg>
);

// ── Klar Nacht / Mond + Sterne ───────────────────────────────
export const SolidMoon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M55 15 A 35 35 0 1 0 85 60 A 30 30 0 1 1 55 15 Z" fill="#FCD34D" />
    <circle cx="25" cy="30" r="3" fill="#FCD34D" />
    <circle cx="80" cy="25" r="2" fill="#FCD34D" />
    <circle cx="35" cy="75" r="2.5" fill="#FCD34D" />
  </svg>
);

// ── Leicht bewölkt — Sonne hinter Wolke ──────────────────────
// Sonne sitzt oben-links (cx=35, cy=45), Wolke schiebt sich davor.
// Sonne bewusst NICHT verdeckt, sondern oben rechts hinter der Wolke sichtbar.
export const SolidPartlyCloudyDay = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="35" cy="45" r="16" fill="#FBBF24" />
    <path d="M 30 75 A 15 15 0 0 1 30 45 A 22 22 0 0 1 67 47 A 14 14 0 0 1 67 75 Z" fill="#E2E8F0" />
  </svg>
);

// ── Leicht bewölkt Nacht — Mond hinter Wolke ─────────────────
// Eigenes Design im selben Stil wie PartlyCloudyDay, weil das HTML nur
// Day-Varianten lieferte. Mond oben-links, Wolke davor (in Grau statt
// Hellgrau, signalisiert "Nacht-Wolke").
export const SolidPartlyCloudyNight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M40 22 A 18 18 0 1 0 55 50 A 14 14 0 1 1 40 22 Z" fill="#FCD34D" />
    <circle cx="22" cy="22" r="2" fill="#FCD34D" />
    <circle cx="78" cy="20" r="1.5" fill="#FCD34D" />
    <path d="M 30 78 A 15 15 0 0 1 30 50 A 22 22 0 0 1 67 52 A 14 14 0 0 1 67 78 Z" fill="#94A3B8" />
  </svg>
);

// ── Bewölkt — eine einzelne helle Wolke ──────────────────────
export const SolidCloud = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M 25 80 A 15 15 0 0 1 25 50 A 22 22 0 0 1 62 52 A 14 14 0 0 1 62 80 Z" fill="#E2E8F0" />
  </svg>
);

// ── Stark bewölkt — zwei Wolken übereinander (hell + dunkel) ─
// Dunkle Hinter-Wolke + helle Vorder-Wolke gibt klar visuell "mehrere
// Wolkenschichten" ohne in einen Klecks zu degenerieren.
export const SolidCloudHeavy = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M 45 60 A 12 12 0 0 1 45 36 A 18 18 0 0 1 75 38 A 12 12 0 0 1 75 60 Z" fill="#94A3B8" />
    <path d="M 25 80 A 15 15 0 0 1 25 50 A 22 22 0 0 1 62 52 A 14 14 0 0 1 62 80 Z" fill="#E2E8F0" />
  </svg>
);

// ── Nebel — helle Wolke + horizontale Linien ─────────────────
export const SolidCloudFog = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M 35 55 A 15 15 0 0 1 35 25 A 22 22 0 0 1 72 27 A 14 14 0 0 1 72 55 Z" fill="#E2E8F0" />
    <g stroke="#94A3B8" strokeWidth="6" strokeLinecap="round">
      <line x1="25" y1="70" x2="75" y2="70" />
      <line x1="35" y1="82" x2="85" y2="82" />
    </g>
  </svg>
);

// ── Niesel / leichter Regen ──────────────────────────────────
export const SolidCloudDrizzle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M 30 65 A 15 15 0 0 1 30 35 A 22 22 0 0 1 67 37 A 14 14 0 0 1 67 65 Z" fill="#94A3B8" />
    <g stroke="#3B82F6" strokeWidth="4" strokeLinecap="round">
      <line x1="35" y1="75" x2="32" y2="88" />
      <line x1="48" y1="75" x2="45" y2="88" />
      <line x1="61" y1="75" x2="58" y2="88" />
    </g>
  </svg>
);

// ── Starker Regen — dunklere Wolke + 4 Tropfen ───────────────
export const SolidCloudRain = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M 30 60 A 15 15 0 0 1 30 30 A 22 22 0 0 1 67 32 A 14 14 0 0 1 67 60 Z" fill="#64748B" />
    <g stroke="#2563EB" strokeWidth="4" strokeLinecap="round">
      <line x1="28" y1="70" x2="23" y2="88" />
      <line x1="42" y1="70" x2="37" y2="88" />
      <line x1="56" y1="70" x2="51" y2="88" />
      <line x1="70" y1="70" x2="65" y2="88" />
    </g>
  </svg>
);

// ── Schnee — helle Wolke + 3 Flocken ─────────────────────────
export const SolidCloudSnow = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M 30 60 A 15 15 0 0 1 30 30 A 22 22 0 0 1 67 32 A 14 14 0 0 1 67 60 Z" fill="#E2E8F0" />
    <g fill="#7DD3FC">
      <circle cx="35" cy="75" r="4" />
      <circle cx="48" cy="85" r="4" />
      <circle cx="61" cy="72" r="4" />
    </g>
  </svg>
);

// ── Schneeregen / Eisregen — Mix Tropfen + Flocken ───────────
export const SolidSleet = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M 30 60 A 15 15 0 0 1 30 30 A 22 22 0 0 1 67 32 A 14 14 0 0 1 67 60 Z" fill="#CBD5E1" />
    <g fill="#7DD3FC">
      <circle cx="40" cy="78" r="4" />
      <circle cx="65" cy="75" r="4" />
    </g>
    <g stroke="#3B82F6" strokeWidth="3" strokeLinecap="round">
      <line x1="30" y1="70" x2="27" y2="85" />
      <line x1="53" y1="72" x2="50" y2="87" />
    </g>
  </svg>
);

// ── Gewitter — dunkle Wolke + Blitz ──────────────────────────
export const SolidCloudLightning = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M 30 55 A 15 15 0 0 1 30 25 A 22 22 0 0 1 67 27 A 14 14 0 0 1 67 55 Z" fill="#475569" />
    <polygon points="48,50 35,70 48,70 42,90 62,65 50,65" fill="#F59E0B" />
  </svg>
);

// ── Hagel — dunkle Wolke + Eiskugeln ─────────────────────────
export const SolidHail = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M 30 60 A 15 15 0 0 1 30 30 A 22 22 0 0 1 67 32 A 14 14 0 0 1 67 60 Z" fill="#94A3B8" />
    <g fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5">
      <circle cx="32" cy="75" r="4.5" />
      <circle cx="48" cy="72" r="4.5" />
      <circle cx="64" cy="78" r="4.5" />
      <circle cx="40" cy="88" r="4.5" />
      <circle cx="56" cy="85" r="4.5" />
    </g>
  </svg>
);

// ── Windig — zwei Wind-Linien mit Loops ──────────────────────
export const SolidWindy = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g fill="none" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round">
      <path d="M 20 40 L 70 40 A 10 10 0 1 0 70 20 L 60 20" />
      <path d="M 10 60 L 80 60 A 12 12 0 1 1 80 84 L 70 84" />
    </g>
  </svg>
);

// ── Regenbogen ───────────────────────────────────────────────
export const SolidRainbow = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g fill="none" strokeWidth="5" strokeLinecap="round">
      <path d="M 15 70 A 35 35 0 0 1 85 70" stroke="#EF4444" />
      <path d="M 23 70 A 27 27 0 0 1 77 70" stroke="#F59E0B" />
      <path d="M 31 70 A 19 19 0 0 1 69 70" stroke="#10B981" />
    </g>
    <path d="M 10 75 A 10 10 0 0 1 10 55 A 12 12 0 0 1 30 57 A 8 8 0 0 1 30 75 Z" fill="#E2E8F0" />
    <path d="M 65 75 A 10 10 0 0 1 65 55 A 12 12 0 0 1 85 57 A 8 8 0 0 1 85 75 Z" fill="#E2E8F0" />
  </svg>
);

// ── Tornado / Wirbelsturm ────────────────────────────────────
export const SolidTornado = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g fill="#64748B">
      <rect x="20" y="20" width="60" height="10" rx="5" />
      <rect x="25" y="35" width="50" height="10" rx="5" />
      <rect x="35" y="50" width="40" height="10" rx="5" />
      <rect x="42" y="65" width="26" height="10" rx="5" />
      <rect x="48" y="80" width="14" height="10" rx="5" />
    </g>
  </svg>
);

// ── Hitzewelle — Sonne + Thermometer ─────────────────────────
export const SolidHeatwave = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="40" cy="40" r="18" fill="#FBBF24" />
    <g stroke="#FBBF24" strokeWidth="4" strokeLinecap="round">
      <line x1="40" y1="12" x2="40" y2="5" />
      <line x1="40" y1="68" x2="40" y2="75" />
      <line x1="12" y1="40" x2="5" y2="40" />
      <line x1="68" y1="40" x2="75" y2="40" />
      <line x1="20" y1="20" x2="15" y2="15" />
      <line x1="60" y1="60" x2="65" y2="65" />
      <line x1="20" y1="60" x2="15" y2="65" />
      <line x1="60" y1="20" x2="65" y2="15" />
    </g>
    <rect x="65" y="20" width="12" height="50" rx="6" fill="#F8FAFC" stroke="#475569" strokeWidth="3" />
    <circle cx="71" cy="75" r="10" fill="#EF4444" />
    <rect x="69" y="35" width="4" height="35" fill="#EF4444" rx="2" />
  </svg>
);

// ── Schneesturm / Blizzard — Wolke + Wind + Flocken ──────────
export const SolidBlizzard = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M 35 50 A 15 15 0 0 1 35 20 A 22 22 0 0 1 72 22 A 14 14 0 0 1 72 50 Z" fill="#94A3B8" />
    <g fill="none" stroke="#BAE6FD" strokeWidth="5" strokeLinecap="round">
      <path d="M 15 65 L 75 65 A 8 8 0 0 0 75 49" />
      <path d="M 25 80 L 85 80 A 8 8 0 0 1 85 96" />
    </g>
    <g fill="#FFFFFF">
      <circle cx="45" cy="72" r="3" />
      <circle cx="70" cy="88" r="3" />
    </g>
  </svg>
);

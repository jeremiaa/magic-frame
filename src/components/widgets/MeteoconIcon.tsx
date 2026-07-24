"use client";

// Meteocons (Bas Milius, MIT) — bewusst IMMER ein <img>:
//
//   • Die animierten Originale tragen SMIL-Animationen, und SMIL läuft in
//     <img> zuverlässig (Chrome/Firefox/Safari, auch Tizen ~76). Inline-SVG
//     per innerHTML hatte zwei echte Probleme: Chrome startet nachträglich
//     eingefügte SMIL-Timelines nicht zuverlässig (Schalter wirkte
//     "invertiert"), und alle Meteocons teilen dieselben Gradient-IDs
//     (id="a") → dokumentweite Kollisionen färbten Icons um (Sonne weiß,
//     Wolken gelb). Ein <img> ist ein isoliertes SVG-Dokument — beide
//     Fehlerklassen sind damit konstruktionsbedingt unmöglich.
//
//   • Die "static"-Sets sind beim Import um alle SMIL-Elemente bereinigt
//     (Meteocons' production-Dateien sind ab Werk animiert!) — statisch
//     heißt hier also wirklich statisch, wichtig für schwache Displays.
export function MeteoconIcon({ src }: { src: string; animated?: boolean }) {
  // Größen-Normalisierung: Meteocons bringen konstruktionsbedingt Innenluft
  // im viewBox mit (Platz für Animationswege/Schatten) und wirken dadurch in
  // derselben Box deutlich kleiner als die früheren, randfüllenden Icon-Sets.
  // Einheitlich 1.25× für animiert UND statisch — transform skaliert nur
  // visuell, die Layoutbox bleibt identisch.
  return (
    <img
      src={src}
      className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
      style={{ transform: "scale(1.25)" }}
      alt="Weather"
    />
  );
}

"use client";

import type { CSSProperties } from "react";
import { Icon } from "./WidgetIcon";

/**
 * Freitext — eine Überschrift für den Rest der Ansicht (#69).
 *
 * Absichtlich klein gehalten: Schriftgröße, Familie, Farbe, Gewicht und
 * Schatten kommen aus dem "Text"-Reiter, den JEDES Widget hat — die Kachel legt
 * sie schon als CSS auf den Container. Ein Text-Widget, das dieselben Regler
 * noch einmal mitbringt, hätte zwei Wahrheiten für dieselbe Frage. Hier steht
 * darum nur, was ohne Beschriftungs-Zweck keinen Sinn ergibt: die zweite Zeile,
 * das Icon, die Linie darunter und die Ausrichtung in der Kachel.
 */
type TextConfig = {
  text?: string;
  /** Zweite, kleinere Zeile — Zusatz statt neuer Überschrift. */
  subtext?: string;
  /** Größe der zweiten Zeile in Prozent der ersten. */
  subtextScale?: number;
  /** Optionales Iconify-Icon links vom Text. */
  icon?: string;
  /** Icon-Größe als Vielfaches der Schriftgröße, in Prozent. */
  iconScale?: number;
  /** Waagerecht — aus baseConfig, dieselbe Bedeutung wie bei der Uhr. */
  align?: "left" | "center" | "right";
  /** Senkrecht in der Kachel: neben einem hohen Widget will man oben stehen. */
  vAlign?: "top" | "middle" | "bottom";
  uppercase?: boolean;
  /** Laufweite in Hundertstel em (12 = 0.12em) — Großbuchstaben brauchen Luft. */
  letterSpacing?: number;
  /** Trennlinie unter dem Text — macht aus einem Titel einen Abschnitt. */
  divider?: boolean;
};

export default function TextWidget({ config }: { config?: TextConfig }) {
  const text = (config?.text ?? "").trim();
  const subtext = (config?.subtext ?? "").trim();
  const icon = (config?.icon ?? "").trim();

  const align = config?.align === "center" ? "center" : config?.align === "right" ? "right" : "left";
  const vAlign = config?.vAlign === "top" ? "top" : config?.vAlign === "bottom" ? "bottom" : "middle";

  const itemsClass = align === "center" ? "items-center" : align === "right" ? "items-end" : "items-start";
  const textClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const justifyClass = vAlign === "top" ? "justify-start" : vAlign === "bottom" ? "justify-end" : "justify-center";

  // Passt der Text nicht in die Kachel, schneidet mittiges Ausrichten ihn OBEN
  // UND unten ab — man liest dann die Mitte einer Überschrift statt ihres
  // Anfangs. Das `safe`-Schlüsselwort sagt dem Browser: zentriere, aber rutsche
  // bei Überlauf auf den Anfang zurück. Ältere Engines (der Tizen-Fernseher in
  // der Küche) verwerfen den Wert als ungültig — dann greift die Klasse oben,
  // also genau das bisherige Verhalten. Kein Risiko, nur ein besserer Fall.
  const safeAxis: CSSProperties = {
    justifyContent: vAlign === "top" ? "flex-start" : vAlign === "bottom" ? "safe flex-end" : "safe center",
    alignItems: align === "left" ? "flex-start" : align === "right" ? "safe flex-end" : "safe center",
  };
  // Das Icon steht bei rechter Ausrichtung rechts — sonst klebt es mitten in
  // der Kachel und die Zeile franst nach aussen aus.
  const rowJustify = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";

  const subtextScale = Math.max(20, Math.min(200, config?.subtextScale ?? 60)) / 100;
  const iconScale = Math.max(20, Math.min(400, config?.iconScale ?? 110)) / 100;
  const tracking = Math.max(-10, Math.min(50, config?.letterSpacing ?? 0)) / 100;

  // Leer heisst leer: ein frisch hinzugefügtes Widget zeigt im EDITOR seinen
  // Platzhalter (widgetSkeletonFor), auf dem Display darf es nichts malen.
  if (!text && !subtext && !icon) return null;

  return (
    <div
      className={`w-full h-full flex flex-col ${justifyClass} ${itemsClass} ${textClass} gap-[0.15em] overflow-hidden`}
      style={safeAxis}
    >
      <div className={`flex items-center gap-[0.4em] ${rowJustify} max-w-full`}>
        {icon && (
          <Icon
            icon={icon}
            className="shrink-0"
            style={{ fontSize: `${iconScale}em` }}
          />
        )}
        {text && (
          <span
            className="min-w-0 leading-tight"
            style={{
              letterSpacing: tracking ? `${tracking}em` : undefined,
              textTransform: config?.uppercase ? "uppercase" : undefined,
            }}
          >
            {text}
          </span>
        )}
      </div>

      {config?.divider && (
        // currentColor: die Linie folgt der eingestellten Textfarbe, ohne dass
        // man sie separat wählen muss — hell auf dunkel wie dunkel auf hell.
        <div
          className="w-full rounded-full"
          style={{ height: "0.06em", backgroundColor: "currentColor", opacity: 0.25, marginTop: "0.2em" }}
        />
      )}

      {subtext && (
        <span
          className="min-w-0 leading-snug opacity-70"
          style={{ fontSize: `${subtextScale}em` }}
        >
          {subtext}
        </span>
      )}
    </div>
  );
}

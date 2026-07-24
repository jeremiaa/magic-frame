"use client";

import { Icon as IconifyIcon } from "@iconify/react";
import type { ComponentProps, CSSProperties } from "react";

// Drop-in-Ersatz für @iconify/react's <Icon>: versteht zusätzlich lokale
// Meteocons-IDs und rendert die als <img> direkt aus public/weather/meteocons/
// — komplett ohne Cloud/API. Alle anderen IDs (mdi:*, lucide:* …) gehen 1:1
// an Iconify durch, Call-Sites bleiben unverändert.
//
// ID-Format: "mc:fill/clear-day" oder "mc:line/rain" ("mc:clear-day" = fill).
// Größe: fontSize (das übliche Iconify-Sizing in den Widgets) bzw. width/height.
// Eine color-Angabe wird ignoriert — Meteocons sind fertige farbige
// Illustrationen.

type Props = ComponentProps<typeof IconifyIcon>;

export function Icon(props: Props) {
  const icon = props.icon;
  if (typeof icon === "string" && icon.startsWith("mc:")) {
    const style = (props.style ?? {}) as CSSProperties;
    const body = icon.slice(3);
    const slash = body.indexOf("/");
    const styleDir = slash > 0 && body.slice(0, slash) === "line" ? "line" : "fill";
    const name = slash > 0 ? body.slice(slash + 1) : body;
    const sz = style.fontSize ?? props.width ?? props.height ?? "1em";
    return (
      <img
        src={`/weather/meteocons/${styleDir}/static/${name}.svg`}
        className={props.className}
        style={{
          ...style,
          width: style.width ?? sz,
          height: style.height ?? sz,
          objectFit: "contain",
          display: "inline-block",
        }}
        alt=""
      />
    );
  }
  return <IconifyIcon {...props} />;
}

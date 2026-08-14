import React from "react";
import {
  Clock as ClockIcon,
  CloudSun,
  Calendar as CalendarIcon,
  Zap,
  Power,
  Bell,
  Timer as TimerIcon,
  MessageSquare,
  ShoppingCart,
  ClipboardList,
  Image as ImageIcon,
  Gauge,
  Video,
  Music,
  Rss,
  QrCode,
  Activity,
  Leaf,
  Type as TypeIcon,
} from "lucide-react";

// Einheitliche Optik pro Widget-Typ: Icon + Akzentfarbe. Wird von der
// Editor-Palette, der Ebenen-Liste UND der Inspector-Kopfzeile genutzt,
// damit ein Widget überall gleich aussieht.

export const WIDGET_ACCENT: Record<string, { hex: string; glow: string; tint: string }> = {
  "ClockWidget.tsx":           { hex: "#3b82f6", glow: "rgba(59,130,246,0.25)",  tint: "rgba(59,130,246,0.12)"  }, // blue
  "WeatherWidget.tsx":         { hex: "#06b6d4", glow: "rgba(6,182,212,0.25)",   tint: "rgba(6,182,212,0.12)"   }, // cyan
  "CalendarWidget.tsx":        { hex: "#8b5cf6", glow: "rgba(139,92,246,0.25)",  tint: "rgba(139,92,246,0.12)"  }, // violet
  "HomeAssistantWidget.tsx":   { hex: "#22c55e", glow: "rgba(34,197,94,0.25)",   tint: "rgba(34,197,94,0.12)"   }, // green
  "HANotificationWidget.tsx":  { hex: "#f97316", glow: "rgba(249,115,22,0.25)",  tint: "rgba(249,115,22,0.12)"  }, // orange
  "ButtonWidget.tsx":          { hex: "#f59e0b", glow: "rgba(245,158,11,0.25)",  tint: "rgba(245,158,11,0.12)"  }, // amber
  "TimerWidget.tsx":           { hex: "#10b981", glow: "rgba(16,185,129,0.25)",  tint: "rgba(16,185,129,0.12)"  }, // emerald
  "MessagesWidget.tsx":        { hex: "#d946ef", glow: "rgba(217,70,239,0.25)",  tint: "rgba(217,70,239,0.12)"  }, // fuchsia
  "ImageWidget.tsx":           { hex: "#a855f7", glow: "rgba(168,85,247,0.25)",  tint: "rgba(168,85,247,0.12)"  }, // purple
  "SensorWidget.tsx":          { hex: "#14b8a6", glow: "rgba(20,184,166,0.25)",  tint: "rgba(20,184,166,0.12)"  }, // teal
  "CameraWidget.tsx":          { hex: "#f43f5e", glow: "rgba(244,63,94,0.25)",   tint: "rgba(244,63,94,0.12)"   }, // rose
  "MediaPlayerWidget.tsx":     { hex: "#ec4899", glow: "rgba(236,72,153,0.25)",  tint: "rgba(236,72,153,0.12)"  }, // pink
  "ShoppingListWidget.tsx":    { hex: "#eab308", glow: "rgba(234,179,8,0.25)",   tint: "rgba(234,179,8,0.12)"   }, // yellow
  "TodosWidget.tsx":           { hex: "#6366f1", glow: "rgba(99,102,241,0.25)",  tint: "rgba(99,102,241,0.12)"  }, // indigo
  "RssWidget.tsx":             { hex: "#f59e0b", glow: "rgba(245,158,11,0.25)",  tint: "rgba(245,158,11,0.12)"  }, // amber
  "QrWidget.tsx":              { hex: "#06b6d4", glow: "rgba(6,182,212,0.25)",   tint: "rgba(6,182,212,0.12)"   }, // cyan
  "StatusWidget.tsx":          { hex: "#0ea5e9", glow: "rgba(14,165,233,0.25)",  tint: "rgba(14,165,233,0.12)"  }, // sky
  "EnvironmentWidget.tsx":     { hex: "#84cc16", glow: "rgba(132,204,22,0.25)",  tint: "rgba(132,204,22,0.12)"  }, // lime
  "TextWidget.tsx":            { hex: "#0ea5e9", glow: "rgba(14,165,233,0.25)",  tint: "rgba(14,165,233,0.12)"  }, // sky
};

export const DEFAULT_ACCENT = { hex: "#64748b", glow: "rgba(100,116,139,0.2)", tint: "rgba(100,116,139,0.1)" };

export function accentFor(type: string) {
  return WIDGET_ACCENT[type] ?? DEFAULT_ACCENT;
}

/** Typ-Icon eines Widgets. `null` für unbekannte / Custom-Modul-Typen. */
export function widgetIconFor(type: string, size = 12): React.ReactNode {
  switch (type) {
    case "ClockWidget.tsx":
      return <ClockIcon size={size} />;
    case "WeatherWidget.tsx":
      return <CloudSun size={size} />;
    case "CalendarWidget.tsx":
      return <CalendarIcon size={size} />;
    case "HomeAssistantWidget.tsx":
      return <Zap size={size} />;
    case "ButtonWidget.tsx":
      return <Power size={size} />;
    case "HANotificationWidget.tsx":
      return <Bell size={size} />;
    case "TimerWidget.tsx":
      return <TimerIcon size={size} />;
    case "MessagesWidget.tsx":
      return <MessageSquare size={size} />;
    case "ImageWidget.tsx":
      return <ImageIcon size={size} />;
    case "SensorWidget.tsx":
      return <Gauge size={size} />;
    case "CameraWidget.tsx":
      return <Video size={size} />;
    case "MediaPlayerWidget.tsx":
      return <Music size={size} />;
    case "RssWidget.tsx":
      return <Rss size={size} />;
    case "QrWidget.tsx":
      return <QrCode size={size} />;
    case "StatusWidget.tsx":
      return <Activity size={size} />;
    case "EnvironmentWidget.tsx":
      return <Leaf size={size} />;
    case "TextWidget.tsx":
      return <TypeIcon size={size} />;
    case "ShoppingListWidget.tsx":
      return <ShoppingCart size={size} />;
    case "TodosWidget.tsx":
      return <ClipboardList size={size} />;
    default:
      return null;
  }
}

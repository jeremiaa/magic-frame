"use client";

import React from "react";
import ClockWidget from "./ClockWidget";
import CalendarWidget from "./CalendarWidget";
import WeatherWidget from "./WeatherWidget";
import HomeAssistantWidget from "./HomeAssistantWidget";
import HANotificationWidget from "./HANotificationWidget";
import ButtonWidget from "./ButtonWidget";
import TimerWidget from "./TimerWidget";
import MessagesWidget from "./MessagesWidget";
import ShoppingListWidget from "./ShoppingListWidget";
import TodosWidget from "./TodosWidget";
import ImageWidget from "./ImageWidget";
import SensorWidget from "./SensorWidget";
import CameraWidget from "./CameraWidget";
import MediaPlayerWidget from "./MediaPlayerWidget";
import RssWidget from "./RssWidget";
import QrWidget from "./QrWidget";
import StatusWidget from "./StatusWidget";
import { CustomWidget } from "@/lib/modules/runtime";

// Die EINE Render-Map "type → Widget-Komponente". Genutzt vom Live-View
// (/view/[id]) UND von der Live-Vorschau im Editor (#42) — damit beide immer
// exakt dasselbe rendern. Reiner Umzug aus dem View, keine Logikänderung.

export type RenderWidgetOpts = {
  dashboardId?: string;
  onVisibilityChange?: (isVisible: boolean) => void;
};

export function renderWidget(type: string, config: any, opts: RenderWidgetOpts = {}): React.ReactNode {
  const { dashboardId, onVisibilityChange } = opts;
  if (type === "ClockWidget.tsx") return <ClockWidget config={config} />;
  if (type === "ButtonWidget.tsx") return <ButtonWidget config={config} />;
  if (type === "TimerWidget.tsx") return <TimerWidget config={config} dashboardId={dashboardId} />;
  if (type === "MessagesWidget.tsx") return <MessagesWidget config={config} dashboardId={dashboardId} />;
  if (type === "ShoppingListWidget.tsx") return <ShoppingListWidget config={config} />;
  if (type === "TodosWidget.tsx") return <TodosWidget config={config} />;
  if (type === "ImageWidget.tsx") return <ImageWidget config={config} dashboardId={dashboardId} />;
  if (type === "SensorWidget.tsx") return <SensorWidget config={config} />;
  if (type === "CameraWidget.tsx") return <CameraWidget config={config} />;
  if (type === "RssWidget.tsx") return <RssWidget config={config} />;
  if (type === "QrWidget.tsx") return <QrWidget config={config} />;
  if (type === "StatusWidget.tsx") return <StatusWidget config={config} onVisibilityChange={onVisibilityChange} />;
  if (type === "MediaPlayerWidget.tsx") return <MediaPlayerWidget config={config} onVisibilityChange={onVisibilityChange} />;
  if (type === "CalendarWidget.tsx") return <CalendarWidget config={config} dashboardId={dashboardId} onVisibilityChange={onVisibilityChange} />;
  if (type === "WeatherWidget.tsx") return <WeatherWidget config={config} location={config?.location} lat={config?.lat} lon={config?.lon} />;
  if (type === "HomeAssistantWidget.tsx") return <HomeAssistantWidget config={config} onVisibilityChange={onVisibilityChange} />;
  if (type === "HANotificationWidget.tsx") return <HANotificationWidget config={config} dashboardId={dashboardId} onVisibilityChange={onVisibilityChange} />;
  // Custom-Module: type beginnt mit "custom:". Werden zur Laufzeit via
  // <script>-Tag-Injection geladen und rendern via window.MagicFrame-Bridge.
  if (typeof type === "string" && type.startsWith("custom:")) {
    return <CustomWidget type={type} config={config} dashboardId={dashboardId} />;
  }
  return null;
}

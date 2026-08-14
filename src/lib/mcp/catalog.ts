import "server-only";
import { z } from "zod";
import { WIDGET_CONFIG_SCHEMAS } from "@/lib/widgets/schemas";
import { prisma } from "@/lib/companion/prisma";

/**
 * Der Wortschatz für Agenten. Ohne diesen Katalog müsste ein Agent die
 * Widget-Typnamen erraten — und die sind Dateinamen ("ClockWidget.tsx"), nicht
 * das, was man tippen würde.
 *
 * Die Schlüssel von WIDGET_CONFIG_SCHEMAS MÜSSEN den type-Literalen der
 * discriminatedUnion entsprechen. Hier wird das beim Laden geprüft: driftet die
 * eine Liste von der anderen weg, fällt es sofort auf statt still.
 */

const CORE_TYPES = Object.keys(WIDGET_CONFIG_SCHEMAS);

const PURPOSE: Record<string, string> = {
  "ClockWidget.tsx": "Time and date, optionally with a small live weather line.",
  "WeatherWidget.tsx": "Current weather and forecast; several data sources.",
  "CalendarWidget.tsx": "iCal, Google, Microsoft and Home Assistant calendars.",
  "ButtonWidget.tsx": "Tap tiles: Home Assistant service calls, webhooks, or show/hide other widgets.",
  "HomeAssistantWidget.tsx": "Live Home Assistant entities as tiles, with per-state colour and icon rules.",
  "HANotificationWidget.tsx": "Rule-based notification tiles that appear on an entity state and clear themselves.",
  "TimerWidget.tsx": "Live countdowns, started over the companion API.",
  "MessagesWidget.tsx": "Short posts pushed from a phone, with an optional image and a time-to-live.",
  "ImageWidget.tsx": "A photo tile from an Immich album or a WebDAV folder.",
  "SensorWidget.tsx": "Numeric sensor value tiles with icon, colour and an optional sparkline.",
  "EnvironmentWidget.tsx": "Air quality, pollen, particulates and UV.",
  "CameraWidget.tsx": "A Home Assistant camera entity, snapshot or fullscreen.",
  "MediaPlayerWidget.tsx": "A now-playing card for a media_player entity, with transport controls.",
  "ShoppingListWidget.tsx": "A shopping list: local, a Home Assistant todo list, or Todoist.",
  "TodosWidget.tsx": "A todo list: local, a Home Assistant todo list, or Todoist.",
  "RssWidget.tsx": "Headlines from RSS feeds, with a QR code to read on.",
  "QrWidget.tsx": "A QR code for Wi-Fi, a link or plain text.",
  "StatusWidget.tsx": "A device card with a picture and live details (car charging, printer, washer).",
  "TextWidget.tsx": "Free text: a heading or caption that labels the widgets around it.",
};

const GRID_CONTRACT = {
  grid: "24 columns wide. x is 0..23, w is 1..24. y and h scroll past 24 for tall portrait views.",
  commonFields: "Every widget carries { i, x, y, w, h, label?, bgOpacity? }. i is your id for the widget; it is stored prefixed with the view id, so read it back from get_view rather than assuming it.",
  buttons: "A Button that shows/hides other widgets stores their ids in targetsN / longPressTargetsN. Those ids are remapped automatically on save — reference the ids as get_view reports them.",
  customModules: "Uploaded custom modules have a type of `custom:<slug>` and are placed like any other widget. Their config is free-form; see the enabled list below.",
};

/**
 * Eine Warnung zur Ladezeit, wenn Schema-Map und Zweck-Liste auseinanderlaufen.
 * Kein throw: eine fehlende Zweckzeile soll den Server nicht daran hindern zu
 * starten, aber sie soll auffallen.
 */
for (const t of CORE_TYPES) {
  if (!PURPOSE[t]) console.warn(`[mcp/catalog] no purpose line for widget type ${t}`);
}

export async function widgetCatalog(type?: string): Promise<unknown> {
  if (type) {
    const schema = WIDGET_CONFIG_SCHEMAS[type];
    if (!schema) {
      return {
        error: `Unknown widget type: ${type}`,
        hint: `Valid core types are: ${CORE_TYPES.join(", ")}. Custom modules use custom:<slug>.`,
      };
    }
    return {
      type,
      purpose: PURPOSE[type],
      configSchema: z.toJSONSchema(schema, { target: "draft-2020-12" }),
    };
  }

  // Ohne Argument: die Übersicht. Der volle Schema-Dump aller 18 Typen wäre
  // riesig — deshalb pro Typ nur der Zweck, und die Aufforderung, das Schema
  // eines Typs einzeln zu holen.
  const modules = await prisma.customModule
    .findMany({ where: { enabled: true }, select: { type: true, label: true } })
    .catch(() => []);

  return {
    coreTypes: CORE_TYPES.map((t) => ({ type: t, purpose: PURPOSE[t] })),
    customModules: modules.map((m) => ({ type: m.type, label: m.label })),
    grid: GRID_CONTRACT,
    next: "Call get_widget_catalog with a type to get that widget's exact config schema before configuring it.",
  };
}

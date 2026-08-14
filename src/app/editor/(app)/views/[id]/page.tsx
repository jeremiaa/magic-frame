"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import io from "socket.io-client";
import {
  Monitor,
  Smartphone,
  Settings,
  Plus,
  Layers,
  EyeOff,
  Image as ImageIcon,
  Gauge,
  Video,
  Music,
  X,
  ClipboardPaste,
  Save,
  ExternalLink,
  Cast,
  Clock as ClockIcon,
  CloudSun,
  Calendar as CalendarIcon,
  Power,
  Bell,
  ChevronLeft,
  GripVertical,
  RefreshCw,
  Timer as TimerIcon,
  MessageSquare,
  ShoppingCart,
  ClipboardList,
  Plug,
  Zap,
  Rss,
  QrCode,
  Activity,
  Leaf,
  Type as TypeIcon,
} from "lucide-react";
import Link from "next/link";

import {
  WidgetLayoutItem,
  WallpaperConfig,
  defaultLayout,
  widgetTitle,
  WIDGET_DEFAULT_SIZE,
} from "@/app/editor/_types";
import InspectorPanel from "@/app/editor/_components/InspectorPanel";
import WidgetPreview from "@/app/editor/_components/WidgetPreview";
import { WIDGET_ACCENT, DEFAULT_ACCENT, widgetIconFor } from "@/app/editor/_components/widget-visuals";
import { ViewThemeScope, type ViewThemeMode } from "@/lib/ui/view-theme";
import WallpaperSettingsModal, {
  type ImmichAlbum,
  type ImmichPerson,
} from "@/app/editor/_components/WallpaperSettingsModal";
import { DEFAULT_WALLPAPER } from "@/lib/wallpaper-engine/bundled";
import { useT } from "@/lib/i18n/LocaleProvider";

const WIDGET_CATALOG: {
  type: string;
  label: string;
  icon: React.ReactNode;
}[] = [
  { type: "ClockWidget.tsx", label: "Uhr", icon: <ClockIcon size={16} /> },
  { type: "WeatherWidget.tsx", label: "Wetter", icon: <CloudSun size={16} /> },
  { type: "CalendarWidget.tsx", label: "Kalender", icon: <CalendarIcon size={16} /> },
  { type: "HomeAssistantWidget.tsx", label: "HA Entity", icon: <Zap size={16} /> },
  { type: "ButtonWidget.tsx", label: "Buttons", icon: <Power size={16} /> },
  { type: "HANotificationWidget.tsx", label: "Benachrichtigungen", icon: <Bell size={16} /> },
  { type: "TimerWidget.tsx", label: "Timer", icon: <TimerIcon size={16} /> },
  { type: "MessagesWidget.tsx", label: "Nachrichten", icon: <MessageSquare size={16} /> },
  { type: "ShoppingListWidget.tsx", label: "Einkaufsliste", icon: <ShoppingCart size={16} /> },
  { type: "TodosWidget.tsx", label: "Todos", icon: <ClipboardList size={16} /> },
  { type: "ImageWidget.tsx", label: "Bild", icon: <ImageIcon size={16} /> },
  { type: "SensorWidget.tsx", label: "Sensor", icon: <Gauge size={16} /> },
  { type: "EnvironmentWidget.tsx", label: "Umwelt", icon: <Leaf size={16} /> },
  { type: "CameraWidget.tsx", label: "Kamera", icon: <Video size={16} /> },
  { type: "MediaPlayerWidget.tsx", label: "Media Player", icon: <Music size={16} /> },
  { type: "RssWidget.tsx", label: "RSS Feed", icon: <Rss size={16} /> },
  { type: "QrWidget.tsx", label: "QR-Code", icon: <QrCode size={16} /> },
  { type: "StatusWidget.tsx", label: "Status", icon: <Activity size={16} /> },
  { type: "TextWidget.tsx", label: "Text", icon: <TypeIcon size={16} /> },
];


/**
 * Editor placeholder body — a low-fidelity skeleton that hints at the
 * widget's actual layout (rows, tiles, icons, etc.) in the accent colour.
 * All sizes are percentages so it scales to any widget size on the grid.
 *
 * Returns `null` for unknown / custom-module types; the caller falls back
 * to a single centred type-icon for those.
 */
function widgetSkeletonFor(type: string, accentHex: string): React.ReactNode {
  // 8-char hex with alpha — works in every modern browser.
  // 33 ≈ 20% / 1f ≈ 12% / 14 ≈ 8% (subtle layered effect).
  const dim = `${accentHex}33`;
  const dimmer = `${accentHex}1f`;
  const faint = `${accentHex}14`;

  switch (type) {
    case "ClockWidget.tsx":
      // Date strip on top, then a "HH : MM" time row — two big blocks with
      // a two-dot colon between them. Reads as a clock even at small sizes.
      // items-center keeps the strip and time row horizontally centred.
      return (
        <div className="w-full h-full flex flex-col p-[10%] gap-[8%] justify-center items-center overflow-hidden">
          <div
            className="rounded-full"
            style={{ width: "30%", height: "6%", backgroundColor: dimmer }}
          />
          <div className="flex items-center justify-center gap-[4%] w-full" style={{ height: "45%" }}>
            <div className="rounded-md h-full" style={{ width: "38%", backgroundColor: dim }} />
            <div
              className="flex flex-col justify-center gap-[40%] h-full"
              style={{ width: "6%" }}
            >
              <div className="rounded-full aspect-square w-full" style={{ backgroundColor: dim }} />
              <div className="rounded-full aspect-square w-full" style={{ backgroundColor: dim }} />
            </div>
            <div className="rounded-md h-full" style={{ width: "38%", backgroundColor: dim }} />
          </div>
        </div>
      );

    case "WeatherWidget.tsx":
      // Location strip / temp + icon row / "feels like" / forecast tiles.
      return (
        <div className="w-full h-full flex flex-col p-[8%] gap-[5%] overflow-hidden">
          <div className="rounded-full" style={{ width: "25%", height: "5%", backgroundColor: dimmer }} />
          <div className="flex items-center gap-[5%]" style={{ height: "32%" }}>
            <div className="rounded-md h-full" style={{ width: "42%", backgroundColor: dim }} />
            <div className="rounded-full h-full aspect-square" style={{ backgroundColor: dimmer }} />
          </div>
          <div className="rounded-full" style={{ width: "55%", height: "4%", backgroundColor: dimmer }} />
          <div className="flex gap-[3%] mt-auto" style={{ height: "26%" }}>
            <div className="flex-1 rounded-md" style={{ backgroundColor: faint }} />
            <div className="flex-1 rounded-md" style={{ backgroundColor: faint }} />
            <div className="flex-1 rounded-md" style={{ backgroundColor: faint }} />
            <div className="flex-1 rounded-md" style={{ backgroundColor: faint }} />
          </div>
        </div>
      );

    case "CalendarWidget.tsx":
      // Three event rows: date block + two text lines.
      return (
        <div className="w-full h-full flex flex-col p-[8%] gap-[8%] overflow-hidden justify-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-[5%]" style={{ height: "22%" }}>
              <div className="rounded-md h-full aspect-square" style={{ backgroundColor: dim }} />
              <div className="flex-1 flex flex-col gap-[18%] justify-center h-full">
                <div className="rounded-full" style={{ height: "32%", width: i === 2 ? "65%" : "85%", backgroundColor: dim }} />
                <div className="rounded-full" style={{ height: "22%", width: "50%", backgroundColor: dimmer }} />
              </div>
            </div>
          ))}
        </div>
      );

    case "HomeAssistantWidget.tsx":
      // Stacked horizontal pills — matches the real widget's flex-col layout
      // of long, flat entity cards (round icon + label + state on one line).
      return (
        <div className="w-full h-full flex flex-col p-[6%] gap-[5%] overflow-hidden justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-[4%] rounded-full"
              style={{
                height: "18%",
                padding: "0 4%",
                backgroundColor: i % 2 === 0 ? dimmer : faint,
              }}
            >
              <div
                className="rounded-full aspect-square"
                style={{ height: "60%", backgroundColor: dim }}
              />
              <div
                className="rounded-full"
                style={{
                  height: "30%",
                  width: `${68 - i * 6}%`,
                  backgroundColor: dim,
                }}
              />
            </div>
          ))}
        </div>
      );

    case "ButtonWidget.tsx":
      // 2×2 grid of square button tiles, each with a small power-icon dot in
      // the middle so they read as actual buttons (not just empty cells).
      return (
        <div
          className="w-full h-full grid grid-cols-2 grid-rows-2 p-[12%]"
          style={{ gap: "8%" }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-md flex items-center justify-center"
              style={{ backgroundColor: i === 0 ? dim : dimmer }}
            >
              <div
                className="rounded-full aspect-square"
                style={{
                  width: "32%",
                  backgroundColor: i === 0 ? dimmer : faint,
                }}
              />
            </div>
          ))}
        </div>
      );

    case "HANotificationWidget.tsx":
      // Stacked horizontal notification cards — matches the real widget's
      // flex-col layout. Each card: round bell + 2 short text lines, compact
      // rounded-3xl-style pill.
      return (
        <div className="w-full h-full flex flex-col p-[6%] gap-[5%] overflow-hidden justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-[4%] rounded-2xl"
              style={{
                height: "22%",
                padding: "0 4%",
                backgroundColor: i === 0 ? dimmer : faint,
              }}
            >
              <div
                className="rounded-full aspect-square shrink-0"
                style={{ height: "55%", backgroundColor: dim }}
              />
              <div className="flex-1 flex flex-col gap-[20%] justify-center">
                <div
                  className="rounded-full"
                  style={{
                    height: "22%",
                    width: `${80 - i * 8}%`,
                    backgroundColor: dim,
                  }}
                />
                <div
                  className="rounded-full"
                  style={{ height: "16%", width: "45%", backgroundColor: dimmer }}
                />
              </div>
            </div>
          ))}
        </div>
      );

    case "TimerWidget.tsx":
      // Big centred countdown block + small caption underneath.
      return (
        <div className="w-full h-full flex flex-col p-[10%] gap-[8%] justify-center items-center overflow-hidden">
          <div className="rounded-lg" style={{ height: "48%", width: "80%", backgroundColor: dim }} />
          <div className="rounded-full" style={{ height: "8%", width: "40%", backgroundColor: dimmer }} />
        </div>
      );

    case "MessagesWidget.tsx":
      // Four staggered text lines.
      return (
        <div className="w-full h-full flex flex-col p-[10%] gap-[8%] justify-center overflow-hidden">
          <div className="rounded-full" style={{ height: "10%", width: "85%", backgroundColor: dim }} />
          <div className="rounded-full" style={{ height: "10%", width: "70%", backgroundColor: dim }} />
          <div className="rounded-full" style={{ height: "10%", width: "82%", backgroundColor: dimmer }} />
          <div className="rounded-full" style={{ height: "10%", width: "60%", backgroundColor: dimmer }} />
        </div>
      );

    case "ImageWidget.tsx":
      // Single framed image.
      return (
        <div className="w-full h-full p-[8%] overflow-hidden">
          <div className="w-full h-full rounded-lg" style={{ backgroundColor: dim }} />
        </div>
      );

    case "SensorWidget.tsx":
      // Big value + small label.
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-[8%]">
          <div className="rounded-md" style={{ height: "34%", width: "52%", backgroundColor: dim }} />
          <div className="rounded-full" style={{ height: "8%", width: "38%", backgroundColor: dimmer }} />
        </div>
      );

    case "CameraWidget.tsx":
      // Camera frame + centred play triangle — reads as "video feed".
      return (
        <div className="w-full h-full flex items-center justify-center p-[10%]">
          <div className="w-full h-full rounded-lg flex items-center justify-center" style={{ border: `2px solid ${dim}` }}>
            <div className="w-0 h-0" style={{ borderTop: "0.7em solid transparent", borderBottom: "0.7em solid transparent", borderLeft: `1.1em solid ${dim}` }} />
          </div>
        </div>
      );

    case "MediaPlayerWidget.tsx":
      // Cover square on the left + title/artist bars + a row of control dots.
      return (
        <div className="w-full h-full flex items-center gap-[6%] p-[8%]">
          <div className="h-full aspect-square rounded-md shrink-0" style={{ backgroundColor: dim }} />
          <div className="flex-1 flex flex-col gap-[10%]">
            <div className="rounded-full" style={{ height: "16%", width: "80%", backgroundColor: dim }} />
            <div className="rounded-full" style={{ height: "12%", width: "55%", backgroundColor: dimmer }} />
            <div className="flex gap-[8%] mt-[6%]">
              <div className="rounded-full aspect-square" style={{ height: "0.9em", backgroundColor: dimmer }} />
              <div className="rounded-full aspect-square" style={{ height: "0.9em", backgroundColor: dim }} />
              <div className="rounded-full aspect-square" style={{ height: "0.9em", backgroundColor: dimmer }} />
            </div>
          </div>
        </div>
      );

    case "ShoppingListWidget.tsx":
    case "TodosWidget.tsx":
      // List rows: checkbox square + text line.
      return (
        <div className="w-full h-full flex flex-col p-[8%] gap-[8%] overflow-hidden justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-[5%]" style={{ height: "14%" }}>
              <div className="rounded h-full aspect-square" style={{ backgroundColor: dim }} />
              <div
                className="flex-1 rounded-full"
                style={{
                  height: "50%",
                  width: `${80 - i * 8}%`,
                  backgroundColor: i < 2 ? dim : dimmer,
                }}
              />
            </div>
          ))}
        </div>
      );

    case "RssWidget.tsx":
      // News rows: small source tag over a headline line.
      return (
        <div className="w-full h-full flex flex-col p-[8%] gap-[9%] overflow-hidden justify-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-[10%]" style={{ height: "22%" }}>
              <div className="rounded-full" style={{ height: "22%", width: "26%", backgroundColor: dim }} />
              <div className="rounded-full" style={{ height: "26%", width: `${88 - i * 10}%`, backgroundColor: dimmer }} />
            </div>
          ))}
        </div>
      );

    case "StatusWidget.tsx":
      // Bild-Quadrat + Titel + zwei Wert-Chips + Fortschritts-Linie.
      return (
        <div className="w-full h-full flex items-center gap-[6%] p-[8%]">
          <div className="h-[70%] aspect-square rounded-md shrink-0" style={{ backgroundColor: dim }} />
          <div className="flex-1 flex flex-col gap-[10%]">
            <div className="rounded-full" style={{ height: "16%", width: "62%", backgroundColor: dim }} />
            <div className="flex gap-[6%]">
              <div className="rounded-full" style={{ height: "10%", width: "26%", backgroundColor: dimmer, minHeight: 3 }} />
              <div className="rounded-full" style={{ height: "10%", width: "22%", backgroundColor: dimmer, minHeight: 3 }} />
            </div>
            <div className="rounded-full" style={{ height: "7%", width: "88%", backgroundColor: dimmer, minHeight: 2 }} />
          </div>
        </div>
      );

    case "QrWidget.tsx":
      // QR-Raster-Andeutung: 4×4-Karo mit betonten Ecken.
      return (
        <div className="w-full h-full flex items-center justify-center p-[15%]">
          <div className="grid w-full h-full gap-[7%]" style={{ gridTemplateColumns: "repeat(4,1fr)", gridTemplateRows: "repeat(4,1fr)" }}>
            {[1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0].map((on, i) => (
              <div key={i} className="rounded-[2px]" style={{ backgroundColor: on ? dim : dimmer, opacity: on ? 1 : 0.4 }} />
            ))}
          </div>
        </div>
      );

    case "TextWidget.tsx":
      // Zwei Schriftzeilen: eine kräftige Überschrift, darunter eine kürzere,
      // blassere Zweitzeile. Genau das, was das Widget später zeichnet.
      return (
        <div className="w-full h-full flex flex-col justify-center gap-[8%] p-[14%]">
          <div className="rounded-full" style={{ height: "22%", width: "78%", backgroundColor: dim, minHeight: 3 }} />
          <div className="rounded-full" style={{ height: "12%", width: "46%", backgroundColor: faint, minHeight: 2 }} />
        </div>
      );

    default:
      // Custom modules etc — caller falls back to a single big icon.
      return null;
  }
}


const ResponsiveGridLayout = WidthProvider(Responsive);

export default function ViewEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useT();
  const { id: viewId } = use(params);

  const [viewName, setViewName] = useState<string>("");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(defaultLayout);
  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);
  // Drag-reorder state for the layer list (front→back stacking order).
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>({ ...DEFAULT_WALLPAPER });
  const [settings, setSettings] = useState<any>({ haUrl: "", haToken: "" });

  const [webdavFolders, setWebdavFolders] = useState<any[]>([]);
  // Bildzahl des gerade geöffneten Ordners (#80) — {usable, unsupported}.
  const [webdavImages, setWebdavImages] = useState<{ usable: number; unsupported: number } | null>(null);
  const [isFetchingFolders, setIsFetchingFolders] = useState(false);
  const [webdavError, setWebdavError] = useState("");

  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [immichAlbums, setImmichAlbums] = useState<ImmichAlbum[]>([]);
  const [isFetchingAlbums, setIsFetchingAlbums] = useState(false);
  const [immichPeople, setImmichPeople] = useState<ImmichPerson[]>([]);
  const [isFetchingPeople, setIsFetchingPeople] = useState(false);
  const [immichError, setImmichError] = useState("");

  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [citySearchResults, setCitySearchResults] = useState<any[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [hasClipboardData, setHasClipboardData] = useState(false);
  const [buttonTab, setButtonTab] = useState("1");
  const [showMobileWidgets, setShowMobileWidgets] = useState(false);
  // Custom-Module: dynamisch geladene Plug-Ins für den Widget-Katalog.
  const [customModules, setCustomModules] = useState<
    Array<{
      type: string;
      label: string;
      iconEmoji: string;
      fields: Array<{ key: string; label: string; type: string; default?: any; placeholder?: string; help?: string; required?: boolean }>;
    }>
  >([]);
  useEffect(() => {
    fetch("/api/modules", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCustomModules(Array.isArray(d.modules) ? d.modules : []))
      .catch(() => {});
  }, []);

  const [socket, setSocket] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<null | "saving" | "saved" | "error">(null);
  const [showViewSettings, setShowViewSettings] = useState(false);

  // #28: vertikale Grid-Grenze. Wird aus der ECHTEN gemessenen Grid-Höhe
  // abgeleitet (nicht geraten). Solange undefined → kein Limit (= bisheriges
  // freies Verhalten, damit nie was "kaputt" ist während des Messens).
  const gridAreaRef = useRef<HTMLDivElement | null>(null);
  const [gridMaxRows, setGridMaxRows] = useState<number | undefined>(undefined);

  // Verbundene Displays (Heartbeat-Registry): optional kann der Canvas das
  // ECHTE Seitenverhältnis eines Displays annehmen — Widgets wirken dann
  // proportional wie auf dem Gerät. Default "standard" = exakt wie bisher.
  const [displays, setDisplays] = useState<{ clientId: string; width: number; height: number; dpr: number }[]>([]);
  const [canvasDisplay, setCanvasDisplay] = useState<string>("standard");
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch(`/api/view-clients?dashboardId=${encodeURIComponent(viewId)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (!cancelled && Array.isArray(d.displays)) setDisplays(d.displays); })
        .catch(() => {});
    load();
    const iv = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [viewId]);
  const activeDisplay = displays.find((d) => d.clientId === canvasDisplay) || null;

  // Breites Fenster → Inspector-Modal zweispaltig (Einstellungen links,
  // Live-Vorschau rechts). Schmal/Tablet/Mobil → Vorschau wie gehabt oben im
  // Panel. Nur EINE Vorschau-Instanz gemountet (matchMedia, kein CSS-hidden).
  const [isWideScreen, setIsWideScreen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsWideScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Canvas-Maße: Standard = bisherige Idealmaße; Display gewählt = echtes
  // Seitenverhältnis, eingepasst in eine Bounding-Box (nichts wird verzerrt).
  const displayCanvas = activeDisplay
    ? (() => {
        const landscapeish = activeDisplay.width >= activeDisplay.height;
        const maxW = landscapeish ? 1100 : 500;
        const maxH = landscapeish ? 700 : 900;
        const scale = Math.min(maxW / activeDisplay.width, maxH / activeDisplay.height);
        return { w: Math.round(activeDisplay.width * scale), h: Math.round(activeDisplay.height * scale), scale };
      })()
    : null;

  // Randlos-Modus: kein Grid-Padding, keine Metadata-Reserve, Kachelabstand
  // aus den View-Settings — Zeilenhöhe muss dieselbe Realität rechnen wie das
  // Raster selbst, sonst enden die 24 Reihen mitten im Canvas und maxRows
  // verriegelt den Rest ("hängt oben fest").
  const edgeOn = settings?.edgeToEdge === true;
  const editorGap = edgeOn ? Math.max(0, Math.min(16, Number(settings?.tileGap ?? 0) || 0)) : 16;

  // rowHeight-Formel generalisiert: (Grid-Höhe − Padding 16 − 23×16 Margins) / 24.
  // Die bisherigen Konstanten sind exakt dieser Ausdruck mit 900/700er-Canvas
  // und 65px Metadata-Leiste — Standard bleibt damit unverändert.
  const rowHeight = edgeOn
    ? Math.max(4, Math.floor(((displayCanvas ? displayCanvas.h : orientation === "portrait" ? 900 : 700) - editorGap * 23) / 24))
    : displayCanvas
    ? Math.max(4, Math.floor((displayCanvas.h - (wallpaper.showMetadata !== false ? 65 : 0) - 16 - 368) / 24))
    : orientation === "portrait"
      ? Math.floor((835 - 16 - 368) / 24)
      : Math.floor((635 - 16 - 368) / 24);

  // Untere Metadata-Leiste (65px) nur reservieren, wenn sie auch angezeigt wird.
  // Ohne Leiste reicht das Grid bis zum Canvas-Boden — der ResizeObserver misst
  // die geänderte Höhe und maxRows passt sich automatisch an (#28).
  // Die Leiste ist auf dem echten Display 65 px hoch. Im 1:1-Modus wird der
  // Canvas verkleinert — bliebe sie bei 65 px, beanspruchte sie mehr als das
  // Doppelte ihres echten Anteils (bei 2560x1358: 11 % statt 5 %) und würde
  // dem Raster Höhe wegnehmen, die es in Wirklichkeit hat.
  const metaBarPx = wallpaper.showMetadata !== false
    ? (displayCanvas ? Math.max(10, Math.round(65 * displayCanvas.scale)) : 65)
    : 0;

  useEffect(() => {
    const el = gridAreaRef.current;
    if (!el) return;
    // Randlos: Abstand aus den Settings (0–16), sonst wie immer 16.
    const MARGIN = editorGap;
    const measure = () => {
      const h = el.clientHeight;
      if (!h || h <= 0 || rowHeight <= 0) {
        setGridMaxRows(undefined);
        return;
      }
      // Anzahl Reihen, die in die gemessene Höhe passen. round (nicht floor):
      // das Grid ist konzeptionell 24 Reihen hoch (= cols, = Live-View); floor
      // schnitt durch Rundung 1 Reihe ab. (833-16)/34 = 24.03 → 24.
      const rows = Math.round((h - MARGIN) / (rowHeight + MARGIN));
      setGridMaxRows(rows > 0 ? rows : undefined);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rowHeight, orientation, editorGap]);

  useEffect(() => {
    const s = io();
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    fetch(`/api/layout/get?dashboardId=${encodeURIComponent(viewId)}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.layout)) {
          const populated = data.layout.map((item: any) => ({
            ...item,
            config: item.config?.fontSize ? item.config : { fontSize: 20, fontFamily: "Inter" },
          }));
          setLayout(populated);
        } else {
          setLayout(defaultLayout);
        }
        if (data.wallpaper) setWallpaper(data.wallpaper);
        if (data.settings) {
          setSettings(data.settings);
          if (data.settings.orientation === "landscape" || data.settings.orientation === "portrait") {
            setOrientation(data.settings.orientation);
          }
        }
      })
      .catch((err) => console.error("Error loading layout:", err));

    fetch(`/api/dashboards?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) {
          const found = list.find((d: any) => d.id === viewId);
          setViewName(found?.name || viewId);
        }
      })
      .catch(() => {});

    setHasClipboardData(!!localStorage.getItem("magic_widget_clipboard"));
  }, [viewId]);

  const onLayoutChange = (newLayout: any) => {
    const updated = layout.map((item) => {
      const gl = newLayout.find((l: any) => l.i === item.i);
      return gl ? { ...item, x: gl.x, y: gl.y, w: gl.w, h: gl.h } : item;
    });
    setLayout(updated);
  };

  const updateLayoutGrid = (i: string, key: string, value: number) => {
    setLayout((prev) => prev.map((item) => (item.i === i ? { ...item, [key]: value } : item)));
  };

  const updateOpacity = (i: string, opacity: number) => {
    setLayout((prev) => prev.map((item) => (item.i === i ? { ...item, bgOpacity: opacity } : item)));
  };

  const updateConfig = (i: string, key: string, value: any) => {
    setLayout((prev) =>
      prev.map((item) => (item.i === i ? { ...item, config: { ...item.config, [key]: value } } : item)),
    );
  };

  const updateLabel = (i: string, label: string) => {
    setLayout((prev) => prev.map((item) => (item.i === i ? { ...item, label } : item)));
  };

  // Stacking z-order. An explicit config.zIndex (a plain number) survives
  // save/load regardless of DB row order; fall back to the array index for
  // widgets that never got one. Higher zIndex = drawn on top (front).
  const zIndexOf = (w: any, idx: number) =>
    typeof w.config?.zIndex === "number" ? w.config.zIndex : idx;

  // Drag-reorder: drop `draggedId` onto `targetId`'s slot in the visual
  // (front→back) order, then re-stamp every zIndex 0..n-1 so it persists.
  const reorderLayers = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setLayout((prev) => {
      const ordered = prev
        .map((w, i) => ({ w, z: zIndexOf(w, i) }))
        .sort((a, b) => b.z - a.z) // front (top of list) first
        .map((o) => o.w);
      const from = ordered.findIndex((w) => w.i === draggedId);
      const to = ordered.findIndex((w) => w.i === targetId);
      if (from < 0 || to < 0) return prev;
      const [moved] = ordered.splice(from, 1);
      ordered.splice(to, 0, moved);
      const n = ordered.length;
      const zMap = new Map<string, number>();
      ordered.forEach((w, listIdx) => zMap.set(w.i, n - 1 - listIdx)); // top of list = highest z
      return prev.map((w) => ({
        ...w,
        config: { ...w.config, zIndex: zMap.get(w.i) ?? 0 },
      }));
    });
  };

  const addWidget = (type: string) => {
    const newId = Math.random().toString(36).substring(7);
    // Core widgets store an EMPTY label — the display title is derived from
    // the type via widgetTitle() and localised at render. No German string is
    // baked into the DB, so a new view's widgets read correctly in whatever
    // locale the display is set to (issue #7). Only custom modules carry a
    // stored label (their manifest name).
    let label = "";
    // Custom-Modul: label aus dem Manifest, Felder mit Defaults vorbelegen.
    const initialConfig: any = { fontSize: 20, fontFamily: "var(--font-geist-sans)" };
    if (type.startsWith("custom:")) {
      const mod = customModules.find((m) => m.type === type);
      if (mod) {
        label = mod.label;
        for (const f of mod.fields ?? []) {
          if (f.default !== undefined) initialConfig[f.key] = f.default;
        }
      }
    }

    const size = WIDGET_DEFAULT_SIZE[type];
    const newWidget: WidgetLayoutItem = {
      i: newId,
      x: 0,
      y: 5,
      w: size?.w ?? 8,
      h: size?.h ?? 4,
      type,
      label,
      bgOpacity: size?.bgOpacity ?? 20,
      config: initialConfig,
    };
    setLayout((prev) => [...prev, newWidget]);
    setActiveSettingsId(newId);
  };

  const removeWidget = (id: string) => {
    setLayout((prev) => prev.filter((w) => w.i !== id));
    setActiveSettingsId(null);
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const settingsWithOrientation = { ...settings, orientation };
      const res = await fetch("/api/layout/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout, wallpaper, settings: settingsWithOrientation, dashboardId: viewId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[save] failed:", res.status, data);
        const details = data?.details
          ? `\n\n${t("Details:")}\n${JSON.stringify(data.details, null, 2)}`
          : "";
        alert(`${t("Speichern fehlgeschlagen")} (HTTP ${res.status}): ${data?.error ? t(data.error) : t("unbekannt")}${details}`);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(null), 2500);
        return;
      }
      // LAYOUT_UPDATED kommt serverseitig aus /api/layout/sync — kein Emit nötig.
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error("[save] network error:", err);
      alert(t("Netzwerkfehler beim Speichern. Details in der Konsole."));
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  // Steuerbefehle laufen über die API, nicht mehr über den Socket (#63):
  // der Server schickt sie erst nach bestandener Anmeldung an die Displays.
  const sendDeviceCommand = async (path: string, body?: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/devices/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(`${t("Befehl fehlgeschlagen")}: ${d?.error || res.status}`);
        return false;
      }
      return true;
    } catch {
      alert(t("Netzwerkfehler — Befehl nicht gesendet."));
      return false;
    }
  };

  const handleCastToTV = async () => {
    if (await sendDeviceCommand("navigate", { dashboardId: viewId })) {
      alert(`${t("Befehl gesendet: Alle verbundenen Displays wechseln auf")} "${viewName || viewId}".`);
    }
  };

  const handleStopCast = async () => {
    if (await sendDeviceCommand("clear-navigate")) {
      alert(t("Befehl gesendet: Alle Displays kehren zurück."));
    }
  };

  const handleRefreshDevices = (onlyThisView: boolean) => {
    void sendDeviceCommand("refresh", onlyThisView ? { dashboardId: viewId } : {});
  };

  const copyWidgetToClipboard = (widget: any) => {
    localStorage.setItem("magic_widget_clipboard", JSON.stringify(widget));
    setHasClipboardData(true);
    alert(t("Modul kopiert — öffne einen anderen View und klick oben auf 'Einfügen'."));
  };

  const pasteFromClipboard = () => {
    const data = localStorage.getItem("magic_widget_clipboard");
    if (!data) return;
    try {
      const widget = JSON.parse(data);
      widget.i = Math.random().toString(36).substring(7);
      widget.y = 5;
      widget.x = 0;
      setLayout((prev) => [...prev, widget]);
    } catch {
      alert(t("Wiederherstellen fehlgeschlagen!"));
    }
  };

  const searchCity = async (query: string) => {
    setCitySearchQuery(query);
    if (query.trim().length < 2) {
      setCitySearchResults([]);
      return;
    }
    setIsSearchingCity(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=de&format=json`,
      );
      const data = await res.json();
      setCitySearchResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingCity(false);
    }
  };

  const fetchWebdavFolders = async (path: string = "/") => {
    if (!wallpaper.webdavUrl || !wallpaper.webdavUser || !wallpaper.webdavPass) {
      setWebdavError(t("Bitte URL, Benutzer und Passwort ausfüllen."));
      return;
    }
    setIsFetchingFolders(true);
    setWebdavError("");
    setWebdavFolders([]);
    setWebdavImages(null);
    try {
      const res = await fetch("/api/webdav/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wallpaper.webdavUrl,
          username: wallpaper.webdavUser,
          password: wallpaper.webdavPass,
          path,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Unbekannter Fehler"));
      setWebdavFolders(data.folders);
      setWebdavImages(data.images ?? null);
      setWallpaper((prev) => ({ ...prev, webdavPath: path }));
    } catch (err: any) {
      setWebdavError(err.message);
    } finally {
      setIsFetchingFolders(false);
    }
  };

  const fetchImmichPeople = async () => {
    // Wie bei den Alben: leere Felder heissen "globale Verbindung" (#75).
    setIsFetchingPeople(true);
    setImmichError("");
    try {
      const res = await fetch("/api/wallpaper/immich/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wallpaper.immichUrl,
          apiKey: wallpaper.immichApiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Unbekannter Fehler"));
      setImmichPeople(data.people || []);
      if ((data.people || []).length === 0) {
        setImmichError(t("Keine benannten Personen gefunden — in Immich zuerst Gesichtern Namen geben."));
      }
    } catch (err: any) {
      setImmichError(err.message);
      setImmichPeople([]);
    } finally {
      setIsFetchingPeople(false);
    }
  };

  const fetchImmichAlbums = async () => {
    // Nicht mehr vorab blocken: leere Felder heissen "globale Verbindung
    // benutzen", und die Route löst das auf (#78). Nur wenn auch global
    // nichts hinterlegt ist, kommt von dort eine verständliche Meldung.
    setIsFetchingAlbums(true);
    setImmichError("");
    try {
      const res = await fetch("/api/wallpaper/immich/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wallpaper.immichUrl,
          apiKey: wallpaper.immichApiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Unbekannter Fehler"));
      setImmichAlbums(data.albums || []);
      if ((data.albums || []).length === 0) {
        setImmichError(t("Keine Alben gefunden — hat der API-Key Album-Rechte?"));
      }
    } catch (err: any) {
      setImmichError(err.message);
      setImmichAlbums([]);
    } finally {
      setIsFetchingAlbums(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape" && activeSettingsId) {
        setActiveSettingsId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, wallpaper, settings, viewId, activeSettingsId, socket]);

  return (
    <>
      <header className="h-14 shrink-0 border-b border-[var(--mf-bdr)]/10 bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] flex items-center px-3 gap-2">
        <Link
          href="/editor/views"
          className="flex items-center gap-1 text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] px-2 h-8 rounded-md hover:bg-[var(--mf-elev)]/5"
        >
          <ChevronLeft size={14} /> {t("Views")}
        </Link>
        <div className="w-px h-6 bg-[var(--mf-elev)]/10" />
        <div className="min-w-0 flex-1 flex items-baseline gap-2">
          <h1 className="text-sm font-semibold truncate">{viewName || viewId}</h1>
          <code className="text-[11px] text-[var(--mf-fg)]/40 font-mono truncate hidden sm:inline">
            /view/{viewId}
          </code>
        </div>

        <div className="hidden md:inline-flex rounded-lg bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10 p-0.5 shrink-0">
          <button
            onClick={() => setOrientation("landscape")}
            className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium transition-colors ${orientation === "landscape" ? "bg-[var(--mf-elev)]/15 text-[var(--mf-fg)]" : "text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]"}`}
          >
            <Monitor size={13} /> {t("Quer")}
          </button>
          <button
            onClick={() => setOrientation("portrait")}
            className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium transition-colors ${orientation === "portrait" ? "bg-[var(--mf-elev)]/15 text-[var(--mf-fg)]" : "text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]"}`}
          >
            <Smartphone size={13} /> {t("Hoch")}
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowViewSettings(true)}
            title={t("View-Einstellungen")}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5 transition-colors"
          >
            <Settings size={15} />
          </button>
          <a
            href={`/view/${encodeURIComponent(viewId)}`}
            target="_blank"
            rel="noreferrer"
            title={t("View in neuem Tab öffnen")}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5 transition-colors"
          >
            <ExternalLink size={15} />
          </a>
          <button
            onClick={handleStopCast}
            title={t("TV Sync beenden")}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--mf-fg)]/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <X size={15} />
          </button>
          <button
            onClick={handleCastToTV}
            title={t("Alle TVs auf dieses Dashboard")}
            className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-sm font-medium text-indigo-300 hover:text-[var(--mf-fg)] bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
          >
            <Cast size={14} />
            <span className="hidden lg:inline">{t("TV Sync")}</span>
          </button>
          <button
            onClick={() => handleRefreshDevices(false)}
            title={t("Alle verbundenen Displays neu laden (Shift+Klick: nur diesen View)")}
            onMouseDown={(e) => {
              if (e.shiftKey) {
                e.preventDefault();
                handleRefreshDevices(true);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-sm font-medium text-amber-300 hover:text-[var(--mf-fg)] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
          >
            <RefreshCw size={14} />
            <span className="hidden lg:inline">{t("Refresh")}</span>
          </button>
          <button
            onClick={handleSave}
            title={t("Layout speichern (⌘S)")}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              saveStatus === "saved"
                ? "bg-green-600 text-white shadow-green-500/30"
                : saveStatus === "error"
                  ? "bg-red-600 text-white shadow-red-500/30"
                  : "bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-blue-500/30"
            }`}
          >
            <Save size={14} />
            {/* Aufs Telefon passt die Leiste mit deutschem "Speichern" nicht —
                der Knopf ragte rechts raus. Unter sm spricht der Knopf über
                Symbol und Farbe (grün = gespeichert, rot = Fehler), wie es
                TV-Sync und Refresh mit ihren Chips längst tun. */}
            <span className="hidden sm:inline">
              {saveStatus === "saving" && t("Speichere…")}
              {saveStatus === "saved" && t("Gespeichert")}
              {saveStatus === "error" && t("Fehler")}
              {!saveStatus && t("Speichern")}
            </span>
          </button>
        </div>
      </header>

      <div className="border-b border-[var(--mf-bdr)]/5 bg-[var(--mf-ovl)]/20 light:bg-[var(--mf-surface)] px-4 flex items-center gap-2 overflow-x-auto">
        {hasClipboardData && (
          <button
            onClick={pasteFromClipboard}
            className="flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-blue-300 hover:text-blue-200 hover:bg-blue-500/10 border-b-2 border-transparent hover:border-blue-500/40 transition-colors"
          >
            <ClipboardPaste size={14} /> {t("Einfügen")}
          </button>
        )}
        <button
          onClick={() => setShowWallpaperModal(true)}
          className="flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-[var(--mf-fg)]/80 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5 border-b-2 border-transparent hover:border-[var(--mf-bdr)]/20 transition-colors"
          title={t("Hintergrund / Wallpaper für diesen View")}
        >
          <ImageIcon size={14} /> {t("Wallpaper")}
        </button>
        <Link
          href="/editor/integrations"
          className="flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5 border-b-2 border-transparent hover:border-[var(--mf-bdr)]/20 transition-colors"
        >
          <Plug size={14} /> {t("Integrationen")}
        </Link>
        <div className="flex-1" />
        <div className="md:hidden inline-flex rounded-lg bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10 p-0.5 my-2 shrink-0">
          <button
            onClick={() => setOrientation("landscape")}
            className={`flex items-center gap-1 px-2 h-6 rounded-md text-xs font-medium transition-colors ${orientation === "landscape" ? "bg-[var(--mf-elev)]/15 text-[var(--mf-fg)]" : "text-[var(--mf-fg)]/50"}`}
          >
            <Monitor size={12} />
          </button>
          <button
            onClick={() => setOrientation("portrait")}
            className={`flex items-center gap-1 px-2 h-6 rounded-md text-xs font-medium transition-colors ${orientation === "portrait" ? "bg-[var(--mf-elev)]/15 text-[var(--mf-fg)]" : "text-[var(--mf-fg)]/50"}`}
          >
            <Smartphone size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden md:flex flex-col w-48 lg:w-56 shrink-0 border-r border-[var(--mf-bdr)]/10 bg-[var(--mf-ovl)]/20 light:bg-[var(--mf-surface)] overflow-y-auto">
          <div className="px-3 pt-4 pb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--mf-fg)]/40">
            {t("Widget hinzufügen")}
          </div>
          <div className="px-2 pb-3 space-y-0.5">
            {WIDGET_CATALOG.map((w) => (
              <button
                key={w.type}
                onClick={() => addWidget(w.type)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--mf-fg)]/80 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5 transition-colors group"
                title={t("{x} hinzufügen").replace("{x}", t(w.label))}
              >
                <span className="w-5 flex justify-center text-[var(--mf-fg)]/60 group-hover:text-[var(--mf-fg)]">
                  {w.icon}
                </span>
                <span className="flex-1 text-left truncate">{t(w.label)}</span>
                <Plus size={13} className="text-[var(--mf-fg)]/30 group-hover:text-[var(--mf-fg)]/70 shrink-0" />
              </button>
            ))}
            {customModules.length > 0 && (
              <>
                <div className="px-3 pt-3 pb-1 text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--mf-fg)]/30">
                  {t("Custom")}
                </div>
                {customModules.map((m) => (
                  <button
                    key={m.type}
                    onClick={() => addWidget(m.type)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--mf-fg)]/80 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5 transition-colors group"
                    title={t("{x} hinzufügen").replace("{x}", m.label)}
                  >
                    <span className="w-5 flex justify-center text-base leading-none">{m.iconEmoji}</span>
                    <span className="flex-1 text-left truncate">{m.label}</span>
                    <Plus size={13} className="text-[var(--mf-fg)]/30 group-hover:text-[var(--mf-fg)]/70 shrink-0" />
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Ebenen-Liste — alle platzierten Widgets. Klick wählt aus, auch wenn
              ein Widget komplett verdeckt ist (für Stacking unverzichtbar). */}
          {layout.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--mf-fg)]/40 border-t border-[var(--mf-bdr)]/10 flex items-center gap-1.5">
                <Layers size={11} /> {t("Ebenen")}
              </div>
              <div className="px-2 pb-4 space-y-0.5">
                {layout
                  .map((w, i) => ({ w, z: zIndexOf(w, i) }))
                  .sort((a, b) => b.z - a.z) // top of stack first
                  .map(({ w }) => {
                    const isActive = activeSettingsId === w.i;
                    const hidden = !!w.config?.defaultHidden;
                    const accent = WIDGET_ACCENT[w.type] ?? DEFAULT_ACCENT;
                    const isDragged = draggedLayerId === w.i;
                    const isDropTarget = dragOverLayerId === w.i && draggedLayerId !== w.i;
                    return (
                      <div
                        key={w.i}
                        draggable
                        onDragStart={(e) => {
                          setDraggedLayerId(w.i);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (draggedLayerId && draggedLayerId !== w.i) setDragOverLayerId(w.i);
                        }}
                        onDragLeave={() => setDragOverLayerId((p) => (p === w.i ? null : p))}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedLayerId) reorderLayers(draggedLayerId, w.i);
                          setDraggedLayerId(null);
                          setDragOverLayerId(null);
                        }}
                        onDragEnd={() => {
                          setDraggedLayerId(null);
                          setDragOverLayerId(null);
                        }}
                        className={`group/layer w-full flex items-center rounded-lg transition-all ${
                          isActive ? "bg-[var(--mf-elev)]/10 ring-1 ring-[var(--mf-bdr)]/15" : "hover:bg-[var(--mf-elev)]/5"
                        } ${isDragged ? "opacity-40" : ""} ${isDropTarget ? "ring-1 ring-blue-400/70" : ""}`}
                      >
                        <span
                          className="pl-2 pr-0.5 text-[var(--mf-fg)]/25 group-hover/layer:text-[var(--mf-fg)]/50 cursor-grab active:cursor-grabbing shrink-0"
                          title={t("Zum Sortieren ziehen")}
                        >
                          <GripVertical size={13} />
                        </span>
                        <button
                          onClick={() => setActiveSettingsId(w.i)}
                          className={`flex-1 min-w-0 flex items-center gap-2.5 pr-3 py-1.5 text-sm ${
                            isActive ? "text-[var(--mf-fg)]" : "text-[var(--mf-fg)]/70 group-hover/layer:text-[var(--mf-fg)]"
                          }`}
                          title={widgetTitle(w.type, w.label, t)}
                        >
                          <span className="w-4 flex justify-center shrink-0" style={{ color: accent.hex }}>
                            {widgetIconFor(w.type, 13)}
                          </span>
                          <span className="flex-1 text-left truncate">{widgetTitle(w.type, w.label, t)}</span>
                          {hidden && <EyeOff size={12} className="text-[var(--mf-fg)]/30 shrink-0" />}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </aside>

        {/* Canvas follows the editor theme (#21): in light mode it goes light
            too — keeping it dark would defeat the purpose (you switch to light
            because dark was hard to read). Widget cards are accent-tinted, so
            they read on either background. */}
        <div className="flex-1 overflow-auto p-2 md:p-6 relative bg-[var(--mf-surface)]">
          <button
            onClick={() => setShowMobileWidgets(true)}
            className="md:hidden fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-500 text-white w-14 h-14 rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center active:scale-95 transition-transform"
            title={t("Widget hinzufügen")}
          >
            <Plus size={22} />
          </button>

          <div className="mx-auto md:max-w-[1200px]">
            {/* Raster-Quelle: Standard (ideal) oder das echte Seitenverhältnis
                eines verbundenen Displays — Chips nur sichtbar, wenn Views
                ihre Größe gemeldet haben. Rein visuell, wird nicht gespeichert. */}
            {displays.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5 justify-center">
                <span className="text-[10px] uppercase tracking-wider text-[var(--mf-fg)]/40 mr-1">{t("Raster")}</span>
                <button type="button" onClick={() => setCanvasDisplay("standard")}
                  className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${canvasDisplay === "standard" ? "border-sky-500 bg-sky-500/10 text-sky-400" : "border-[var(--mf-bdr)]/15 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"}`}>
                  {t("Standard")}
                </button>
                {displays.map((d) => (
                  <button key={d.clientId} type="button" onClick={() => setCanvasDisplay(d.clientId)}
                    className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors tabular-nums ${canvasDisplay === d.clientId ? "border-sky-500 bg-sky-500/10 text-sky-400" : "border-[var(--mf-bdr)]/15 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"}`}
                    title={t("Verbundenes Display — Canvas übernimmt das echte Seitenverhältnis")}>
                    {d.width}×{d.height}
                  </button>
                ))}
              </div>
            )}
            <div
              className={`
                ${orientation === "portrait" ? "max-w-[500px] h-[900px]" : "w-full h-[700px]"}
                mx-auto bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-300
              `}
              style={displayCanvas ? { width: displayCanvas.w, height: displayCanvas.h, maxWidth: "none" } : undefined}
            >
              <div
                className="absolute inset-x-0 top-0 z-0"
                style={{
                  bottom: `${metaBarPx}px`,
                  backgroundImage:
                    "linear-gradient(var(--mf-grid) 1px, transparent 1px), linear-gradient(90deg, var(--mf-grid) 1px, transparent 1px)",
                  backgroundSize: "calc(100% / 12) 50px",
                }}
              ></div>

              <div
                ref={gridAreaRef}
                className={`absolute inset-x-0 top-0 z-10 slider-container editor-grid ${settings?.edgeToEdge ? "p-0" : "p-4"}`}
                style={{ bottom: settings?.edgeToEdge ? 0 : `${metaBarPx}px` }}
              >
                <ResponsiveGridLayout
                  className="layout"
                  layouts={{ lg: layout }}
                  breakpoints={{ lg: 0 }}
                  cols={{ lg: 24 }}
                  rowHeight={rowHeight}
                  onLayoutChange={onLayoutChange}
                  isDraggable={true}
                  isResizable={true}
                  margin={[editorGap, editorGap]}
                  containerPadding={edgeOn ? [0, 0] : undefined}
                  compactType={null}
                  allowOverlap={true}
                  preventCollision={false}
                  maxRows={gridMaxRows}
                  draggableCancel=".nodrag"
                >
                  {layout.map((w, index) => {
                    const isActive = activeSettingsId === w.i;
                    const accent = WIDGET_ACCENT[w.type] ?? DEFAULT_ACCENT;
                    return (
                      <div
                        key={w.i}
                        className={`group relative flex flex-col rounded-2xl border shadow-md transition-all overflow-hidden cursor-grab active:cursor-grabbing ${isActive ? "ring-2 ring-blue-500/60" : "hover:ring-1 hover:ring-[var(--mf-bdr)]/20"}`}
                        style={{
                          backgroundColor: `${accent.hex}12`,
                          backdropFilter: w.bgOpacity > 0 ? "blur(12px)" : "none",
                          borderColor: isActive ? accent.hex : `${accent.hex}40`,
                          // Stacking: each widget sits at its own zIndex; the
                          // selected one floats above everything so an overlapped
                          // widget stays editable once picked from the layer list.
                          zIndex: isActive ? 1000 : zIndexOf(w, index),
                        }}
                      >
                        <div
                          className="flex items-center gap-2 px-3 py-2.5 md:px-2.5 md:py-2 rounded-t-2xl border-b text-[var(--mf-fg)] transition-colors min-h-[40px]"
                          style={{
                             backgroundColor: `${accent.hex}20`,
                             borderColor: `${accent.hex}30`,
                          }}
                        >
                          <span
                             className="w-4 h-4 flex items-center justify-center shrink-0"
                             style={{ color: accent.hex }}
                          >
                            {widgetIconFor(w.type, 14)}
                          </span>
                          <span className="text-xs font-semibold tracking-wide font-sans text-[var(--mf-fg)]/95 truncate flex-1">
                            {widgetTitle(w.type, w.label, t)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSettingsId(w.i);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            title={t("Widget-Einstellungen")}
                            className="nodrag shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/10 transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Editor placeholder body: low-fidelity skeleton in the
                            accent colour that hints at the actual widget layout
                            (event rows, entity tiles, button grid, etc.). All
                            sizes are percentage-based so it scales to any widget
                            size on the grid. Custom modules without a matching
                            skeleton fall through to a single centred icon. */}
                        <div className="flex-1 pointer-events-none overflow-hidden">
                          {widgetSkeletonFor(w.type, accent.hex) ?? (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{ color: accent.hex, opacity: 0.15 }}
                            >
                              {widgetIconFor(w.type, 56)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </ResponsiveGridLayout>
              </div>

              {wallpaper.showMetadata !== false && (
                <div
                  className={`absolute bottom-0 inset-x-0 z-20 pointer-events-none flex flex-row items-center justify-between px-6 transition-all ${(wallpaper.metaBgOpacity ?? 40) > 0 ? "backdrop-blur-md border-t border-[var(--mf-bdr)]/10" : ""}`}
                  style={{
                    // Höhe bleibt 65 px wie auf dem echten Display; im
                    // 1:1-Modus schrumpft `zoom` die Box MIT Inhalt auf
                    // denselben Anteil, den sie dort einnimmt (= metaBarPx).
                    height: "65px",
                    backgroundColor: `color-mix(in srgb, var(--mf-ovl) ${(wallpaper.metaBgOpacity ?? 40)}%, transparent)`,
                    ...(displayCanvas ? { zoom: displayCanvas.scale } : {}),
                  }}
                >
                  <div className="flex items-center gap-2">
                    {wallpaper.showTimer !== false && (
                      <div className="w-4 h-4 rounded-full border-4 border-[var(--mf-bdr)]/20"></div>
                    )}
                    <span className="text-[var(--mf-fg)]/30 text-xs font-semibold pl-2 drop-shadow-md">
                      {t("Metadaten Platzhalter")}
                    </span>
                  </div>
                  <div
                    className="text-right text-[10px] uppercase tracking-[0.15em] leading-relaxed font-medium drop-shadow-md"
                    style={{
                      color: wallpaper.metaColor || "rgba(255,255,255,0.5)",
                      textShadow: wallpaper.metaTextShadowBlur
                        ? `0 0 ${wallpaper.metaTextShadowBlur}px rgba(0,0,0,0.8)`
                        : "none",
                      fontFamily: `${wallpaper.metaFontFamily || "Inter"}, sans-serif`,
                    }}
                  >
                    {wallpaper.metaShowDate !== false && (
                      <>
                        {t("07. Juli 2025")}
                        <br />
                      </>
                    )}
                    {wallpaper.metaShowLocation !== false && (
                      <>
                        {t("München")}
                        <br />
                      </>
                    )}
                    {wallpaper.metaShowCamera !== false && <>{t("Shot on iPhone")}</>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {activeSettingsId && (() => {
        const activeWidget = layout.find((w) => w.i === activeSettingsId);
        if (!activeWidget) return null;
        return (
          // Vorschau rechnet mit derselben zentralen Hell/Dunkel-Auflösung
          // wie der Live-View — sonst lügt sie beim Theme.
          <ViewThemeScope settings={settings}>
          <div
            className="fixed inset-0 z-[60] flex items-stretch md:items-center md:justify-center bg-[var(--mf-backdrop)]/60 backdrop-blur-sm md:bg-[var(--mf-backdrop)]/40 md:backdrop-blur-none md:p-6"
            onClick={() => setActiveSettingsId(null)}
          >
            <div
              className={`w-full h-full md:h-auto ${isWideScreen ? "md:w-[1200px] md:max-h-[88vh] md:flex md:gap-4 md:items-stretch" : "md:w-[760px] md:max-h-[88vh]"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={isWideScreen ? "md:flex-1 md:min-w-0 md:max-h-[88vh] h-full md:h-auto" : "w-full h-full"}>
                <InspectorPanel
                  activeWidget={activeWidget}
                  layout={layout}
                  edgeToEdge={edgeOn}
                  onClose={() => setActiveSettingsId(null)}
                  updateLayoutGrid={updateLayoutGrid}
                  updateOpacity={updateOpacity}
                  updateConfig={updateConfig}
                  updateLabel={updateLabel}
                  copyWidgetToClipboard={copyWidgetToClipboard}
                  removeWidget={removeWidget}
                  citySearchQuery={citySearchQuery}
                  citySearchResults={citySearchResults}
                  isSearchingCity={isSearchingCity}
                  searchCity={searchCity}
                  setCitySearchResults={setCitySearchResults}
                  setCitySearchQuery={setCitySearchQuery}
                  buttonTab={buttonTab}
                  setButtonTab={setButtonTab}
                  showPreview={!isWideScreen}
                />
              </div>
              {/* Breites Layout: Live-Vorschau als eigene Spalte — sichtbar in
                  ALLEN Tabs (auch Text & Farbe wirken sofort). */}
              {isWideScreen && (
                <div className="hidden md:block w-[440px] shrink-0 max-h-[88vh] overflow-y-auto rounded-2xl bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 shadow-2xl p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--mf-fg)]/55 mb-2.5">{t("Live-Vorschau")}</div>
                  <WidgetPreview
                    type={activeWidget.type}
                    config={activeWidget.config}
                    bgOpacity={activeWidget.bgOpacity}
                    gridW={activeWidget.w}
                    gridH={activeWidget.h}
                  />
                </div>
              )}
            </div>
          </div>
          </ViewThemeScope>
        );
      })()}

      {showWallpaperModal && (
        <WallpaperSettingsModal
          variant="modal"
          onClose={() => setShowWallpaperModal(false)}
          wallpaper={wallpaper}
          setWallpaper={setWallpaper}
          webdavFolders={webdavFolders}
          fetchWebdavFolders={fetchWebdavFolders}
          webdavImages={webdavImages}
          isFetchingFolders={isFetchingFolders}
          webdavError={webdavError}
          immichAlbums={immichAlbums}
          immichPeople={immichPeople}
          fetchImmichPeople={fetchImmichPeople}
          isFetchingPeople={isFetchingPeople}
          fetchImmichAlbums={fetchImmichAlbums}
          isFetchingAlbums={isFetchingAlbums}
          immichError={immichError}
        />
      )}

      {showViewSettings && (
        <div
          className="fixed inset-0 z-[9999] bg-[var(--mf-backdrop)]/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowViewSettings(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("View-Einstellungen")}</h2>
              <button
                onClick={() => setShowViewSettings(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Auto-Aktualisierung")}</label>
              <select
                value={settings?.autoRefreshHours ?? 0}
                onChange={(e) => setSettings({ ...settings, autoRefreshHours: parseInt(e.target.value) })}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/20 text-[var(--mf-fg)] text-sm rounded-lg p-2.5"
              >
                <option value={0}>{t("Aus")}</option>
                {[1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
                  <option key={h} value={h}>{h} {h === 1 ? t("Stunde") : t("Stunden")}</option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--mf-fg)]/40">{t("Lädt diese View regelmäßig neu — hält Dauer-Displays frisch (leert den Browser-Cache).")}</p>
            </div>

            {/* Zentrale Hell/Dunkel-Steuerung — greift für alle Widgets,
                die kein festes Theme eingestellt haben. */}
            <div className="flex flex-col gap-1.5 border-t border-[var(--mf-bdr)]/10 pt-4">
              <label className="text-sm font-medium text-[var(--mf-fg)]/80">{t("Hell / Dunkel")}</label>
              <select
                value={(settings?.themeMode as ViewThemeMode) ?? "dark"}
                onChange={(e) => setSettings({ ...settings, themeMode: e.target.value })}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/20 text-[var(--mf-fg)] text-sm rounded-lg p-2.5"
              >
                <option value="dark">{t("Immer dunkel")}</option>
                <option value="light">{t("Immer hell")}</option>
                <option value="sun">{t("Nach Sonnenstand (HA)")}</option>
                <option value="time">{t("Nach Uhrzeit")}</option>
                <option value="entity">{t("Nach HA-Entität")}</option>
              </select>

              {settings?.themeMode === "entity" && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input
                    value={settings?.themeEntity ?? ""}
                    onChange={(e) => setSettings({ ...settings, themeEntity: e.target.value })}
                    placeholder="input_boolean.tag"
                    className="bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/20 text-[var(--mf-fg)] text-sm rounded-lg p-2.5 font-mono text-xs"
                  />
                  <input
                    value={settings?.themeLightState ?? ""}
                    onChange={(e) => setSettings({ ...settings, themeLightState: e.target.value })}
                    placeholder={t("Zustand für hell (z. B. on)")}
                    className="bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/20 text-[var(--mf-fg)] text-sm rounded-lg p-2.5 font-mono text-xs"
                  />
                </div>
              )}

              {(settings?.themeMode === "time" || settings?.themeMode === "sun" || settings?.themeMode === "entity") && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <label className="flex flex-col gap-1 text-[11px] text-[var(--mf-fg)]/50">
                    {t("Hell ab")}
                    <input type="time" value={settings?.themeLightFrom ?? "07:00"}
                      onChange={(e) => setSettings({ ...settings, themeLightFrom: e.target.value })}
                      className="bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/20 text-[var(--mf-fg)] text-sm rounded-lg p-2.5" />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-[var(--mf-fg)]/50">
                    {t("Dunkel ab")}
                    <input type="time" value={settings?.themeLightTo ?? "20:00"}
                      onChange={(e) => setSettings({ ...settings, themeLightTo: e.target.value })}
                      className="bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/20 text-[var(--mf-fg)] text-sm rounded-lg p-2.5" />
                  </label>
                </div>
              )}

              <p className="text-[11px] text-[var(--mf-fg)]/40">
                {settings?.themeMode === "sun"
                  ? t("Folgt sun.sun aus Home Assistant. Fehlt die Entität, greifen die Zeiten als Sicherheitsnetz.")
                  : settings?.themeMode === "entity"
                    ? t("Folgt einer freien HA-Entität — z. B. einer Szene. Fehlt sie, greifen die Zeiten.")
                    : t("Gilt für alle Widgets, die auf „Automatisch“ stehen. Widgets mit fest eingestelltem Theme bleiben unberührt.")}
              </p>
              <button
                type="button"
                onClick={() => setLayout(layout.map((w) => ({ ...w, config: { ...(w.config ?? {}), cardTheme: "auto" } })))}
                className="mt-1 self-start text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
              >
                {t("Alle Widgets auf „Automatisch“ setzen")}
              </button>
            </div>

            {/* Randlos-Modus (opt-in): Widgets bis an den Bildschirmrand —
                DAKboard-Mosaik. Ecken werden automatisch eckig. */}
            <div className="flex flex-col gap-2 border-t border-[var(--mf-bdr)]/10 pt-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings?.edgeToEdge === true}
                    onChange={(e) => setSettings({ ...settings, edgeToEdge: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                </div>
                <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Randlos (bis zum Bildschirmrand)")}</span>
              </label>
              <p className="text-[11px] text-[var(--mf-fg)]/40">
                {t("Widgets füllen den Bildschirm ohne Außenrand — Ecken werden automatisch eckig. Ideal für Vollbild-Layouts wie Foto über Kalender.")}
              </p>
              {settings?.edgeToEdge === true && (
                <div>
                  <label className="text-xs font-medium text-[var(--mf-fg)]/60 mb-1.5 flex justify-between">
                    <span>{t("Kachelabstand")}</span>
                    <span className="text-sky-400">{Number(settings?.tileGap ?? 0) || 0}px</span>
                  </label>
                  <input
                    type="range" min={0} max={16} step={2}
                    value={Number(settings?.tileGap ?? 0) || 0}
                    onChange={(e) => setSettings({ ...settings, tileGap: parseInt(e.target.value) })}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--mf-elev)]/10"
                  />
                </div>
              )}
            </div>

            <p className="text-[11px] text-[var(--mf-fg)]/50 border-t border-[var(--mf-bdr)]/10 pt-3">{t("Nicht vergessen: oben Speichern, sonst greift die Änderung nicht.")}</p>
          </div>
        </div>
      )}

      {showMobileWidgets && (
        <div
          className="md:hidden fixed inset-0 z-50 flex items-end bg-[var(--mf-backdrop)]/60 backdrop-blur-sm"
          onClick={() => setShowMobileWidgets(false)}
        >
          <div
            // max-h + eigenes Scrollen: 19 Widgets plus Module sind länger als
            // jedes Telefon. Ohne Limit ankert items-end das Sheet unten und
            // schiebt Uhr/Wetter/Kalender unerreichbar über den Bildrand —
            // genau so auf dem iPhone passiert. dvh statt vh wegen der
            // ein-/ausfahrenden Safari-Leiste; der Puffer unten ist die
            // Home-Geste (safe-area).
            className="w-full max-h-[80dvh] overflow-y-auto overscroll-contain bg-[var(--mf-surface-2)] border-t border-[var(--mf-bdr)]/10 rounded-t-3xl p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full bg-[var(--mf-elev)]/20 mx-auto mb-4" />
            <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--mf-fg)]/40 px-2 mb-3">
              {t("Widget hinzufügen")}
            </div>
            <div className="space-y-1">
              {WIDGET_CATALOG.map((w) => (
                <button
                  key={w.type}
                  onClick={() => {
                    addWidget(w.type);
                    setShowMobileWidgets(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[var(--mf-fg)]/80 hover:text-[var(--mf-fg)] active:bg-[var(--mf-elev)]/10 transition-colors min-h-[48px]"
                >
                  <span className="w-7 flex justify-center text-[var(--mf-fg)]/60">{w.icon}</span>
                  <span className="flex-1 text-left truncate">{t(w.label)}</span>
                  <Plus size={15} className="text-[var(--mf-fg)]/30" />
                </button>
              ))}
              {customModules.map((m) => (
                <button
                  key={m.type}
                  onClick={() => {
                    addWidget(m.type);
                    setShowMobileWidgets(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-[var(--mf-fg)]/80 hover:text-[var(--mf-fg)] active:bg-[var(--mf-elev)]/10 transition-colors min-h-[48px]"
                >
                  <span className="w-7 flex justify-center text-lg leading-none">{m.iconEmoji}</span>
                  <span className="flex-1 text-left truncate">{m.label}</span>
                  <Plus size={15} className="text-[var(--mf-fg)]/30" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </>
  );
}

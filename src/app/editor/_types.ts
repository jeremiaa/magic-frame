export interface WidgetLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  label: string;
  bgOpacity: number;
  config: {
    fontSize: number;
    fontFamily: string;
    fontWeight?: string;
    textShadowBlur?: number;
  textShadowX?: number;
  textShadowY?: number;
  offsetX?: number;
  offsetY?: number;
  responsiveText?: boolean;
  defaultHidden?: boolean;
  showHumidity?: boolean;
  showWind?: boolean;
    subtextSize?: number;
    forecastLayout?: 'horizontal' | 'vertical';
    iconSet?: string;
    hideForecast?: boolean;
    hideSeconds?: boolean;
    showMiniWeather?: boolean;
    // Weather widget: atmosphärischer Wetter-Hintergrund
    weatherBg?: boolean;
    weatherBgOpacity?: number;
    weatherBgBlur?: number;
    // RSS widget (limit + color werden mit den bestehenden Feldern geteilt)
    feeds?: string | string[];
    rssMode?: 'list' | 'rotate';
    rotateSec?: number;
    showSource?: boolean;
    showDate?: boolean;
    showImage?: boolean;
    showSummary?: boolean;
    linkable?: boolean;
    showQr?: boolean;
    showDots?: boolean;
    rssAccent?: string;
    titleLines?: number;
    descLines?: number;
    // QR-Code widget
    qrType?: 'wifi' | 'url' | 'text';
    wifiSsid?: string;
    wifiPassword?: string;
    wifiEncryption?: 'WPA' | 'WEP' | 'nopass';
    wifiHidden?: boolean;
    content?: string;
    level?: 'L' | 'M' | 'Q' | 'H';
    dotStyle?: 'square' | 'rounded' | 'dots' | 'classy';
    eyeStyle?: 'square' | 'rounded' | 'circle';
    gradient?: 'none' | 'linear' | 'radial';
    color1?: string;
    bgMode?: 'solid' | 'transparent';
    centerIcon?: string;
    showLabel?: boolean;
    qrScale?: number;
    // Status widget (Auto lädt, Drucker druckt, …)
    statusEntity?: string;
    statusAccent?: string;
    statusStates?: string;
    alertStates?: string;
    alertPulse?: boolean;
    alertRing?: boolean;
    tapEntity?: string;
    statusLayout?: 'bar' | 'stack' | 'center';
    imageMode?: 'entity' | 'url' | 'icon';
    imageStyle?: 'box' | 'free';
    imageScale?: number;
    bgZoom?: number;
    imageEntity?: string;
    imageUrl?: string;
    statusDetails?: { entity?: string; label?: string }[];
    progressEntity?: string;
    progressStyle?: 'bar' | 'ring';
    progressShowPercent?: boolean;
    alwaysShow?: boolean;
    showState?: boolean;
    align?: string;
    timezone?: string;
    location?: string;
    lat?: string;
    lon?: string;
    icalUrl?: string;
    limit?: number;
    days?: number;
    color?: string;
    hideOnEmpty?: boolean;
    // Calendar views (DAKboard-Parität)
    calendarView?: 'list' | 'agenda' | 'month';
    calendarTheme?: 'dark' | 'light';
    entityId?: string;
    icon?: string;
    hideWhen?: string;
    colorWhen?: string;
    colorTarget?: string;
    showIfEntity?: string;
    showIfState?: string;
    entityId2?: string;
    icon2?: string;
    color2?: string;
    hideWhen2?: string;
    colorWhen2?: string;
    colorTarget2?: string;
    showIfEntity2?: string;
    showIfState2?: string;
    entityId3?: string;
    icon3?: string;
    color3?: string;
    hideWhen3?: string;
    colorWhen3?: string;
    colorTarget3?: string;
    showIfEntity3?: string;
    showIfState3?: string;
    entityId4?: string;
    icon4?: string;
    color4?: string;
    colorWhen4?: string;
    colorTarget4?: string;
    showIfEntity4?: string;
    showIfState4?: string;
    maxNotifications?: number;
    dismissButton?: 'auto' | 'hover' | 'always' | 'off';
    rules?: any[]; // NotificationRule array
    tintStrength?: number;
    tintDirection?: 'left' | 'right';
    tintAnimate?: boolean;
    notifyBorder?: 'off' | 'accent' | 'custom';
    notifyBorderColor?: string;
    notifyBorderWidth?: number;
    // Now-Playing-Karte im Notification-Stack (Discussion #50)
    mediaEnabled?: boolean;
    mediaPlayers?: string[];
    mediaBorderColor?: string;
    borderColor?: string;
    mediaShowControls?: boolean;
    mediaShowProgress?: boolean;
    mediaShowName?: boolean;
    mediaShowVolume?: boolean;
    mediaArtworkBg?: boolean;
    mediaCardHeightEm?: number;
    mediaCoverCorners?: 'rounded' | 'square' | 'circle';
    mediaTextScale?: number;
    mediaShowBorder?: boolean;
    mediaPosition?: 'top' | 'bottom';
    mediaTextOverflow?: 'truncate' | 'scroll' | 'shrink';
    mediaIdleHideMinutes?: number;
    // Laufende RSS-Karte im Notification-Stack
    rssEnabled?: boolean;
    rssFeeds?: string[];
    rssLimit?: number;
    rssRotateSec?: number;
    rssShowSource?: boolean;
    rssShowDate?: boolean;
    rssShowImage?: boolean;
    rssShowSummary?: boolean;
    rssTitleLines?: number;
    rssDescLines?: number;
    rssLinkable?: boolean;
    rssShowQr?: boolean;
    rssShowDots?: boolean;
    rssTextOverflow?: 'truncate' | 'shrink' | 'scroll';
    rssColor?: string;
    rssCardHeightEm?: number;
    rssPosition?: 'top' | 'bottom';
    rssShowBorder?: boolean;
    rssBorderColor?: string;
    // Status-Karten im Notification-Stack
    statusEnabled?: boolean;
    statusCards?: any[];
    statusCardHeightEm?: number;
    statusPosition?: 'top' | 'bottom';
    statusShowBorder?: boolean;
    statusBorderColor?: string;
    statusBorderWidth?: number;
    frameRadius?: number;
    textScale?: number;
    showBorder?: boolean;
    idleHideMinutes?: number;
    cardOpacity?: number;
    cardTheme?: 'dark' | 'light' | 'auto';
    cardBlur?: number;
    design?: 'cards' | 'minimal' | 'tint';
    hideControlButton?: boolean;
    // #6 HA-triggered visibility (baseConfig)
    showWhenEntity?: string;
    showWhenState?: string;
    autoHideSeconds?: number;
    // #33 calendar time-format override
    calendarTimeFormat?: 'auto' | '12h' | '24h';
    // Media Player widget (Discussion #50)
    layout?: 'auto' | 'row' | 'stack' | 'cover';
    entityIds?: string[];
    showCover?: boolean;
    coverScale?: number;
    coverCorners?: 'rounded' | 'square' | 'circle';
    vinylSpin?: boolean;
    textOverflow?: 'truncate' | 'scroll' | 'shrink';
    showArtist?: boolean;
    showControls?: boolean;
    showProgress?: boolean;
    showVolume?: boolean;
    showPlayerName?: boolean;
    accentColor?: string;
    artworkAsTileBg?: boolean;
    bgBlur?: number;
    bgDarken?: number;
    scrim?: number;
    hideWhenIdle?: boolean;
    autoFollow?: boolean;
    dotsPosition?: 'bottom-right' | 'top-right' | 'bottom-center';
    dotsShowOnInteract?: boolean;
  };
}

export interface WallpaperConfig {
  source: string; // 'unsplash', 'url', 'webdav', 'immich'
  query: string; // keywords or image url
  intervalSec: number;
  showMetadata: boolean;
  webdavUrl?: string;
  webdavPath?: string;
  webdavUser?: string;
  webdavPass?: string;
  immichUrl?: string;
  immichApiKey?: string;
  immichAlbumId?: string;
  immichAlbumIds?: string[]; // #40: mehrere Alben als Quelle
  immichMode?: "album" | "favorites" | "memories" | "people"; // Immich-Quelle (#16, Schritt 2)
  immichPersonId?: string; // bei immichMode === "people"
  showDateTaken?: boolean; // deprecated, use metaShowDate
  metaShowDate?: boolean;
  metaShowLocation?: boolean;
  metaShowCamera?: boolean;
  metaFontFamily?: string;
  metaFontSize?: number;
  metaFontWeight?: string;
  metaTextShadow?: string;
  metaTextShadowBlur?: number;
  metaColor?: string;
  metaBgOpacity?: number;
  overlayBlur?: number;
  overlayVignette?: number;
  gradientTop?: number;
  gradientBottom?: number;
  zoomEffect?: boolean;
  transitionEffect?: "crossfade" | "kenburns" | "slide" | "none";
  transitionMs?: number; // Übergangs-Dauer (Default crossfade/kenburns 1500, slide 1200)
  fit?: "cover" | "contain" | "fill" | "none" | "blur";
  imagePosition?: "top" | "center" | "bottom"; // object-position (gegen abgeschnittene Köpfe)
  kenBurnsIntensity?: number; // Ken-Burns-Zielzoom in % (Default 15 = scale 1.15)
  splitMode?: "off" | "auto" | "grid2" | "grid4"; // Split-View (#16/#17, Schritt 3)
  showTimer?: boolean;
  bgColor?: string; // Vollfarb-Hintergrund (source === "color")
  // Artwork-Takeover: Album-Cover als Hintergrund, wenn ein media_player läuft
  artworkEnabled?: boolean; // An/Aus-Schalter fürs ganze Feature
  artworkPlayer?: string; // media_player.* — leer = aus
  artworkFit?: 'blur' | 'cover'; // Blur-Rahmen mit scharfem Cover / bildschirmfüllend
  artworkBlur?: number; // Blur-Stärke der Füllung (px)
  artworkDarken?: number; // Abdunkelung (%)
}

// ── Widget display titles ────────────────────────────────────────────────
// Canonical default label per widget type, stored as the GERMAN source key.
// The title is ALWAYS rendered through t(), so it follows the active app
// locale. New widgets store an EMPTY label and derive their title from the
// type via widgetTitle() — no German string is ever baked into the DB.
export const WIDGET_DEFAULT_LABEL: Record<string, string> = {
  "ClockWidget.tsx": "Uhr",
  "WeatherWidget.tsx": "Wetter",
  "CalendarWidget.tsx": "Kalender",
  "HomeAssistantWidget.tsx": "HA Entity",
  "ButtonWidget.tsx": "Buttons",
  "HANotificationWidget.tsx": "Benachrichtigungen",
  "TimerWidget.tsx": "Timer",
  "MessagesWidget.tsx": "Nachrichten",
  "ImageWidget.tsx": "Bild",
  "SensorWidget.tsx": "Sensor",
  "ShoppingListWidget.tsx": "Einkaufsliste",
  "TodosWidget.tsx": "Todos",
  "CameraWidget.tsx": "Kamera",
  "MediaPlayerWidget.tsx": "Media Player",
  "RssWidget.tsx": "RSS Feed",
  "QrWidget.tsx": "QR-Code",
  "StatusWidget.tsx": "Status",
};

// Every German default string we have ever auto-assigned (the current types
// above plus historical ones like the old "Uhr & Datum" clock default). Lets
// us recognise a stored label as an auto-default — not a user customisation —
// on existing DB rows, so we localise it instead of showing German verbatim
// on an English display.
const AUTO_DEFAULT_LABELS = new Set<string>([
  ...Object.values(WIDGET_DEFAULT_LABEL),
  "Uhr & Datum",
]);

/** True when a label is empty or one of our auto-assigned German defaults. */
export function isAutoDefaultLabel(label: string | undefined): boolean {
  const l = (label ?? "").trim();
  return l === "" || AUTO_DEFAULT_LABELS.has(l);
}

/**
 * Display title for a widget. Empty / auto-default labels derive from the
 * widget type and localise via t(); genuine user labels pass through as-is.
 *
 * NB: widget *targeting* (Button show/hide links) keys off the widget id
 * (`w.i`), never the label — so deriving the title here is display-only and
 * cannot break those dependencies.
 */
export function widgetTitle(
  type: string,
  label: string | undefined,
  t: (s: string) => string,
): string {
  if (isAutoDefaultLabel(label)) {
    const def = WIDGET_DEFAULT_LABEL[type];
    return def ? t(def) : type.replace("Widget.tsx", "");
  }
  return label as string;
}

export const defaultLayout: WidgetLayoutItem[] = [
  { i: 'clk', x: 2, y: 2, w: 10, h: 4, type: 'ClockWidget.tsx', label: '', bgOpacity: 20, config: { fontSize: 24, fontFamily: 'Inter' } },
  { i: 'cal', x: 2, y: 7, w: 10, h: 6, type: 'CalendarWidget.tsx', label: '', bgOpacity: 20, config: { fontSize: 18, fontFamily: 'Inter' } },
  { i: 'wth', x: 2, y: 14, w: 20, h: 6, type: 'WeatherWidget.tsx', label: '', bgOpacity: 50, config: { fontSize: 20, fontFamily: 'Inter' } },
];

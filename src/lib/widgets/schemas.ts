import { z } from "zod";

export const WIDGET_TYPES = [
  "ClockWidget.tsx",
  "WeatherWidget.tsx",
  "CalendarWidget.tsx",
  "ButtonWidget.tsx",
  "HomeAssistantWidget.tsx",
  "HANotificationWidget.tsx",
  "TimerWidget.tsx",
  "MessagesWidget.tsx",
  "ShoppingListWidget.tsx",
  "TodosWidget.tsx",
] as const;

const baseConfig = z
  .object({
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
    fontWeight: z.string().optional(),
    color: z.string().optional(),
    textShadowBlur: z.number().optional(),
    textShadowX: z.number().optional(),
    textShadowY: z.number().optional(),
    offsetX: z.number().optional(),
    offsetY: z.number().optional(),
    responsiveText: z.boolean().optional(),
    defaultHidden: z.boolean().optional(),
    // #6: Widget nur einblenden, wenn eine HA-Entity einen bestimmten State hat
    // (z.B. Kamera nur bei "Bewegung erkannt" / Türklingel). Leer = immer sichtbar.
    // Generisch für ALLE Widgets (baseConfig); der View hört live via SSE und
    // blendet ein/aus. Instant, kein Polling (HA-Bridge broadcaster).
    showWhenEntity: z.string().optional(),
    showWhenState: z.string().optional(),
    // Puls-Modus: >0 = beim Auslösen X Sekunden zeigen, dann automatisch wieder
    // ausblenden (z.B. Türklingel). 0/leer = sichtbar solange die Entity aktiv ist.
    autoHideSeconds: z.number().optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    // Randlos-Modus: true = Widget schwebt als runde Karte ÜBER dem
    // Hintergrund-Raster statt eckig anzudocken. Ohne Randlos wirkungslos.
    floatingCard: z.boolean().optional(),
  })
  .passthrough();

const clockConfig = baseConfig.extend({
  timezone: z.string().optional(),
  hideSeconds: z.boolean().optional(),
  // "auto" follows the App locale (en → 12h, de → 24h). User can pin either.
  timeFormat: z.enum(["auto", "12h", "24h"]).optional(),
  // "auto" follows the App locale (en → en-US, de → de-DE). Explicit picks
  // for users who want a specific regional format.
  dateFormat: z.enum(["auto", "en-US", "en-GB", "de-DE"]).optional(),
  showMiniWeather: z.boolean().optional(),
  lat: z.string().optional(),
  lon: z.string().optional(),
  location: z.string().optional(),
  showHumidity: z.boolean().optional(),
  showWind: z.boolean().optional(),
  showUv: z.boolean().optional(),
  iconSet: z.string().optional(),
  meteoconsStyle: z.enum(["fill", "line"]).optional(),
  meteoconsAnimated: z.boolean().optional(),
  meteoconsMoonPhase: z.boolean().optional(),
  unitTemp: z.enum(["celsius", "fahrenheit"]).optional(),
  statsSize: z.number().optional(),
});

const weatherConfig = baseConfig.extend({
  lat: z.string().optional(),
  lon: z.string().optional(),
  location: z.string().optional(),
  forecastLayout: z.enum(["horizontal", "vertical"]).optional(),
  iconSet: z.string().optional(),
  // Meteocons (MIT): Stil fill/line + optionale SMIL-Animation. Nur relevant
  // wenn iconSet === "meteocons"; Defaults = fill / statisch.
  meteoconsStyle: z.enum(["fill", "line"]).optional(),
  meteoconsAnimated: z.boolean().optional(),
  // Echte Mondphase im klaren Nachthimmel (nur Meteocons). Default an.
  meteoconsMoonPhase: z.boolean().optional(),
  // Opt-in: Info-Icons (UV/Wind/Feuchte/Sonnenzeiten) im Meteocons-Stil,
  // wertbasiert (uv-index-N, wind-beaufort-N). Default aus = Lucide.
  meteoconsStats: z.boolean().optional(),
  // Opt-in: auch Vorhersage-/Stunden-Icons animieren (Meteocons + 3D-Set).
  // Default aus — viele parallele Animationen kosten auf schwachen Displays
  // Leistung, deshalb animiert sonst nur das Haupticon.
  iconAnimatedAll: z.boolean().optional(),
  // Größe der Vorschau-/Stunden-Icons in Prozent (Default 100).
  forecastIconSize: z.number().optional(),
  // Größe des Haupticons (aktuelles Wetter) in Prozent (Default 100).
  currentIconSize: z.number().optional(),
  hideForecast: z.boolean().optional(),
  showHumidity: z.boolean().optional(),
  showWind: z.boolean().optional(),
  showUv: z.boolean().optional(),
  showSunTimes: z.boolean().optional(),
  subtextSize: z.number().optional(),
  statsSize: z.number().optional(),
  unitTemp: z.enum(["celsius", "fahrenheit"]).optional(),
  unitWind: z.enum(["kmh", "mph", "ms", "kn"]).optional(),
  // Atmosphärischer Wetter-Hintergrund (opt-in, Default aus)
  weatherBg: z.boolean().optional(),
  weatherBgOpacity: z.number().optional(),
  weatherBgBlur: z.number().optional(),
});

const calendarConfig = baseConfig.extend({
  icalUrl: z.string().optional(),
  // Monats-Ansicht: Titel (Monat+Jahr, default an), KW-Spalte (opt-in),
  // Termin-Schrift-Skalierung (0.6–2, default 1).
  showMonthTitle: z.boolean().optional(),
  showWeekNumbers: z.boolean().optional(),
  monthTextScale: z.number().optional(),
  // Monatsgitter: was pro Termin in der Tages-Spalte steht + wie viele
  // Termine ("auto" = füllt die gemessene Spaltenhöhe, "all" = alle, Zahl =
  // fest gedeckelt).
  monthShowTime: z.boolean().optional(),
  monthShowLocation: z.boolean().optional(),
  monthShowDescription: z.boolean().optional(),
  monthPerDay: z.union([z.literal("auto"), z.literal("all"), z.number()]).optional(),
  limit: z.number().optional(),
  days: z.number().optional(),
  hideOnEmpty: z.boolean().optional(),
  hideWeekday: z.boolean().optional(),
  // #33: Uhrzeit-Format der Termine. "auto" = nach App-Sprache (12h EN / 24h DE),
  // wie bisher → ändert für bestehende Layouts nichts. "12h"/"24h" = fester Override.
  calendarTimeFormat: z.enum(["auto", "12h", "24h"]).optional(),
  // Ansicht: list (bisheriges Verhalten) | agenda (nach Tagen gruppiert) |
  // month (Monatsgitter). Nicht gesetzt = list; der alte showEmptyDays=true
  // wird transparent als agenda gelesen — bestehende Layouts ändern sich nicht.
  calendarView: z.enum(["list", "agenda", "month"]).optional(),
  // Karten-Fläche wie bei den anderen Karten-Widgets: cardTheme (auto/dark/
  // light) + cardOpacity + cardBlur über useGlassStyle.
  cardTheme: z.enum(["dark", "light", "auto"]).optional(),
  cardBlur: z.number().optional(),
});

const buttonConfig = baseConfig
  .extend({
    designLayout: z.enum(["auto", "row", "col"]).optional(),
    btnShape: z.enum(["square", "circle", "subtle", "fill"]).optional(),
    iconScale: z.number().optional(),
    btnScale: z.number().optional(),
    bgOpacity: z.number().optional(),
    bgBlur: z.number().optional(),
    bgRadius: z.number().optional(),
  })
  .passthrough();

const haEntitySlot = z.object({
  entityId: z.string().optional(),
  icon: z.string().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
  hideWhen: z.string().optional(),
  colorWhen: z.string().optional(),
  colorTarget: z.string().optional(),
  showIfEntity: z.string().optional(),
  showIfState: z.string().optional(),
});

const homeAssistantConfig = baseConfig
  .extend({
    design: z.enum(["cards", "minimal", "tint"]).optional(), // tint = Media-Stil (farbige Tönung)
    cardOpacity: z.number().optional(),
    cardTheme: z.enum(["dark", "light", "auto"]).optional(),
    cardBlur: z.number().optional(),
    iconFrame: z.boolean().optional(), // Icon-Box an/aus (Default an)
    iconScale: z.number().optional(), // Icon-Größe-Faktor (Default 1)
    frameScale: z.number().optional(), // Kasten-Größe-Faktor (Default 1)
    hideControlButton: z.boolean().optional(), // Steuerungs-Button (Farbe/Slider) auf Kacheln ausblenden
    entities: z.array(haEntitySlot).optional(),
  })
  .passthrough();

const haNotificationConfig = baseConfig
  .extend({
    maxNotifications: z.number().optional(),
    rules: z.array(z.any()).optional(),
    cardOpacity: z.number().optional(),
    cardTheme: z.enum(["dark", "light", "auto"]).optional(),
    cardBlur: z.number().optional(),
    iconFrame: z.boolean().optional(),
    iconScale: z.number().optional(),
    frameScale: z.number().optional(),
    timeFormat: z.enum(["auto", "minutes", "hours", "days", "combined"]).optional(),
    showTimers: z.boolean().optional(),
    dismissButton: z.enum(["auto", "hover", "always", "off"]).optional(),
    // Tint-Design: Stärke + Richtung des Farbverlaufs + optionaler Rahmen
    tintStrength: z.number().optional(),
    tintDirection: z.enum(["left", "right"]).optional(),
    tintAnimate: z.boolean().optional(), // sanft driftender Farbverlauf
    notifyBorder: z.enum(["off", "accent", "custom"]).optional(),
    notifyBorderColor: z.string().optional(),
    notifyBorderWidth: z.number().optional(), // Rand-Dicke in px (Default 1.5)
    // Now-Playing-Karte: dockt wie die Timer in den Stack, wenn Musik läuft
    mediaEnabled: z.boolean().optional(), // Feature an/aus, ohne Player zu löschen
    mediaPlayers: z.array(z.string()).optional(),
    mediaBorderColor: z.string().optional(), // Rahmenfarbe der Media-Karte
    mediaShowControls: z.boolean().optional(), // Default an
    mediaShowProgress: z.boolean().optional(), // Default an
    mediaShowName: z.boolean().optional(), // Default aus
    mediaShowVolume: z.boolean().optional(), // Default aus
    mediaArtworkBg: z.boolean().optional(), // Cover als Blur-Hintergrund, Default an
    mediaCardHeightEm: z.number().optional(), // Karten-Höhe (em), Default 5
    mediaCoverCorners: z.enum(["rounded", "square", "circle"]).optional(),
    mediaTextScale: z.number().optional(), // Text-Skalierung in % relativ zu den Notifications
    mediaShowBorder: z.boolean().optional(), // weißer Glas-Rand der Media-Karte (Default an)
    mediaPosition: z.enum(["top", "bottom"]).optional(), // über/unter den Benachrichtigungen
    mediaTextOverflow: z.enum(["truncate", "scroll", "shrink"]).optional(), // Titel-Überlauf
    mediaIdleHideMinutes: z.number().optional(), // pausierte Karte nach X Min ausblenden (0 = nie)
    // Laufende RSS-Karte im Stack (analog zur Now-Playing-Karte)
    rssEnabled: z.boolean().optional(), // Feature an/aus, ohne Feeds zu löschen
    rssFeeds: z.array(z.string()).optional(),
    rssLimit: z.number().optional(),
    rssRotateSec: z.number().optional(),
    rssShowSource: z.boolean().optional(),
    rssShowDate: z.boolean().optional(),
    rssShowImage: z.boolean().optional(),
    rssShowSummary: z.boolean().optional(),
    rssTitleLines: z.number().optional(),
    rssDescLines: z.number().optional(),
    rssLinkable: z.boolean().optional(),
    rssShowQr: z.boolean().optional(),
    rssShowDots: z.boolean().optional(),
    rssTextOverflow: z.enum(["truncate", "shrink", "scroll"]).optional(),
    rssColor: z.string().optional(),
    rssCardHeightEm: z.number().optional(), // Karten-Höhe (em), Default 6
    rssPosition: z.enum(["top", "bottom"]).optional(),
    rssShowBorder: z.boolean().optional(),
    rssBorderColor: z.string().optional(),
    // Status-Karten im Stack (Auto lädt, Drucker druckt, … — wie Media/RSS)
    statusEnabled: z.boolean().optional(),
    statusCards: z.array(z.any()).optional(), // gleiche Felder wie statusConfig, je Karte
    statusCardHeightEm: z.number().optional(), // Karten-Höhe (em), Default 4.5
    statusPosition: z.enum(["top", "bottom"]).optional(),
    statusShowBorder: z.boolean().optional(),
    statusBorderColor: z.string().optional(),
    statusBorderWidth: z.number().optional(), // Rand-Dicke in px (Default 1)
  })
  .passthrough();

// Companion-Widgets: Config ist minimal, Widgets sind v.a. API-getrieben.
const timerConfig = baseConfig
  .extend({
    maxTimers: z.number().optional(),
    hideWhenEmpty: z.boolean().optional(),
  })
  .passthrough();

const messagesConfig = baseConfig
  .extend({
    maxMessages: z.number().optional(),
    hideWhenEmpty: z.boolean().optional(),
  })
  .passthrough();

const imageConfig = baseConfig
  .extend({
    immichSource: z.enum(["global", "view"]).optional(),
    immichAlbumId: z.string().optional(),
    immichAlbumIds: z.array(z.string()).optional(),
    fit: z.enum(["cover", "contain", "fill", "none", "blur"]).optional(),
    intervalSec: z.number().optional(),
    cornerRadius: z.number().optional(),
  })
  .passthrough();

const sensorSlot = z.object({
  entityId: z.string().optional(),
  icon: z.string().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
  unit: z.string().optional(),
  decimals: z.number().optional(),
});

const sensorConfig = baseConfig
  .extend({
    design: z.enum(["cards", "grid"]).optional(),
    cardTheme: z.enum(["dark", "light", "auto"]).optional(),
    cardOpacity: z.number().optional(),
    cardBlur: z.number().optional(),
    iconFrame: z.boolean().optional(),
    iconSize: z.number().optional(), // Icon-Größe-Faktor, 1 = Standard
    frameScale: z.number().optional(), // Kasten-Größe-Faktor, 1 = Standard
    showSparkline: z.boolean().optional(),
    sparklineHours: z.number().optional(),
    entities: z.array(sensorSlot).optional(),
  })
  .passthrough();

// EnvironmentWidget — Pollen/Luftqualität/UV/Solar/Wind via Open-Meteo.
// Kachel-Toggles: AQI/PM2.5/Pollen default an (≠ false), Rest default aus (=== true).
const environmentConfig = baseConfig
  .extend({
    lat: z.string().optional(),
    lon: z.string().optional(),
    aqiScale: z.enum(["european", "us"]).optional(),
    unitWind: z.enum(["kmh", "mph", "ms", "kn"]).optional(),
    showAqi: z.boolean().optional(),
    showPm25: z.boolean().optional(),
    showPm10: z.boolean().optional(),
    showOzone: z.boolean().optional(),
    showNo2: z.boolean().optional(),
    showPollen: z.boolean().optional(),
    hidePollenZero: z.boolean().optional(),
    showUv: z.boolean().optional(),
    showSolar: z.boolean().optional(),
    showWind: z.boolean().optional(),
    cardTheme: z.enum(["dark", "light", "auto"]).optional(),
    cardOpacity: z.number().optional(),
    cardBlur: z.number().optional(),
    // Meteocons als Kachel-Icons (Default an; UV/Wind wertbasiert). Aus = Lucide.
    meteoconsIcons: z.boolean().optional(),
    meteoconsStyle: z.enum(["fill", "line"]).optional(),
    // Eigene HA-Sensoren als Zusatz-Kacheln (DWD Pollenflug, PV, CO2 …) —
    // gleiche Slot-Form wie im Sensor-Widget.
    haEntities: z.array(sensorSlot).optional(),
  })
  .passthrough();

// CameraWidget — Home Assistant camera entity (snapshot-refresh MVP).
// MJPEG and WebRTC streamModes are reserved for follow-up releases.
const cameraConfig = baseConfig
  .extend({
    source: z.enum(["ha", "url"]).optional(),
    entityId: z.string().optional(),
    streamUrl: z.string().optional(),
    refreshIntervalSec: z.number().optional(),
    aspectRatio: z.enum(["auto", "16:9", "4:3", "1:1"]).optional(),
    streamMode: z.enum(["snapshot", "mjpeg", "webrtc"]).optional(),
    clickFullscreen: z.boolean().optional(),
    caption: z.string().optional(),
    // #41: Bei einem HA-Auslöser (Person/Bewegung/Türklingel) soll die Kamera
    // von selbst als Vollbild über Wallpaper/Galerie aufpoppen statt nur in
    // Kachelgröße zu erscheinen. Auslöser ist standardmäßig der Sichtbarkeits-
    // Trigger (showWhenEntity/showWhenState) aus der baseConfig; eine eigene
    // Entity hier überschreibt ihn — so kann eine dauerhaft sichtbare Kamera
    // trotzdem auf einen separaten Trigger hin ins Vollbild springen.
    fullscreenOnTrigger: z.boolean().optional(),
    fullscreenTriggerEntity: z.string().optional(),
    fullscreenTriggerState: z.string().optional(),
    // Sekunden im Vollbild (Puls). Leer/undefined = autoHideSeconds aus der
    // baseConfig, 0 = Vollbild bleibt, solange der Auslöser aktiv ist.
    fullscreenSeconds: z.number().optional(),
  })
  .passthrough();

const mediaPlayerConfig = baseConfig
  .extend({
    // auto wählt nach Kachelform (breit → row, hoch → stack, quadratisch → cover)
    layout: z.enum(["auto", "row", "stack", "cover"]).optional(),
    entityId: z.string().optional(), // legacy single media_player.*
    entityIds: z.array(z.string()).optional(), // mehrere Player, auto-follow
    showCover: z.boolean().optional(), // Cover-Bild in row/stack (Default an)
    coverScale: z.number().optional(), // Cover-Größe in % (50–130, Default 100)
    coverCorners: z.enum(["rounded", "square", "circle"]).optional(),
    vinylSpin: z.boolean().optional(), // Kreis-Cover dreht beim Abspielen (Default an)
    textOverflow: z.enum(["truncate", "scroll", "shrink"]).optional(), // zu langer Text
    showArtist: z.boolean().optional(), // Interpret-Zeile (Default an)
    showControls: z.boolean().optional(), // Wiedergabe-Buttons (Default an)
    showProgress: z.boolean().optional(), // Fortschrittsbalken + Zeit (Default an)
    showVolume: z.boolean().optional(), // Lautstärke-Regler (opt-in, Default aus)
    accentColor: z.string().optional(), // Fortschritts-Farbe (leer = dezent)
    showPlayerName: z.boolean().optional(), // Player-Name überm Titel (opt-in)
    frameRadius: z.number().optional(), // Radius-Vorgabe vom Host (z. B. Notification-Karte)
    textScale: z.number().optional(), // Bar-Layout: Text-Skalierung in % (Default 100)
    showBorder: z.boolean().optional(), // feiner Glas-Rand (Default an)
    borderColor: z.string().optional(), // überschreibt die weiße Glas-Linie
    artworkAsTileBg: z.boolean().optional(), // Cover unscharf als Kachel-Hintergrund
    bgBlur: z.number().optional(), // Blur-Stärke des Artwork-Hintergrunds (px)
    bgDarken: z.number().optional(), // Abdunkelung des Artwork-Hintergrunds (%)
    scrim: z.number().optional(), // Text-Verlauf unten im Cover-Layout (%)
    hideWhenIdle: z.boolean().optional(), // nur zeigen wenn etwas läuft
    idleHideMinutes: z.number().optional(), // pausierte Player nach X Min ausblenden (0 = nie)
    autoFollow: z.boolean().optional(), // aktiven Player automatisch anzeigen (Default an)
    dotsPosition: z.enum(["bottom-right", "top-right", "bottom-center"]).optional(), // Player-Punkte
    dotsShowOnInteract: z.boolean().optional(), // Punkte nur bei Hover/Tipp einblenden
  })
  .passthrough();

const shoppingConfig = baseConfig
  .extend({
    title: z.string().optional(),
    hideHeader: z.boolean().optional(),
    hideCount: z.boolean().optional(),
    hideAddForm: z.boolean().optional(),
    listSource: z.enum(["local", "ha", "todoist"]).optional(),
    haListEntity: z.string().optional(),
    todoistProjectId: z.string().optional(),
  })
  .passthrough();

const todosConfig = baseConfig
  .extend({
    title: z.string().optional(),
    hideHeader: z.boolean().optional(),
    hideCount: z.boolean().optional(),
    assignee: z.string().optional(),
    hideAddForm: z.boolean().optional(),
    listSource: z.enum(["local", "ha", "todoist"]).optional(),
    haListEntity: z.string().optional(),
    todoistProjectId: z.string().optional(),
  })
  .passthrough();

// Custom-Modul-Widget: type beginnt mit "custom:". Config ist beliebig
// (passthrough), weil jedes Modul sein eigenes Field-Schema im Manifest hat.
// Validierung der Felder passiert client-seitig im Inspector.
const customWidgetConfig = baseConfig.passthrough();
const customWidgetSchema = z
  .object({
    type: z.string().regex(/^custom:[a-z0-9][a-z0-9_-]{0,63}$/i),
    config: customWidgetConfig,
  })
  .merge(commonWidgetFields());

const rssConfig = baseConfig.extend({
  feeds: z.union([z.string(), z.array(z.string())]).optional(), // einzelne URLs (alt: String)
  rssMode: z.enum(["list", "rotate"]).optional(),
  limit: z.number().optional(),
  rotateSec: z.number().optional(),
  showSource: z.boolean().optional(),
  showDate: z.boolean().optional(),
  showImage: z.boolean().optional(),
  showSummary: z.boolean().optional(),
  linkable: z.boolean().optional(),
  showQr: z.boolean().optional(),
  showDots: z.boolean().optional(),
  rssAccent: z.string().optional(),
  titleLines: z.number().optional(),
  descLines: z.number().optional(),
  textOverflow: z.enum(["truncate", "shrink", "scroll"]).optional(), // Titel: abschneiden/verkleinern/scrollen
  cardTheme: z.enum(["light", "dark", "auto"]).optional(), // gesetzt, wenn als Notification-Karte eingebettet
});

const qrConfig = baseConfig.extend({
  qrType: z.enum(["wifi", "url", "text"]).optional(),
  wifiSsid: z.string().optional(),
  wifiPassword: z.string().optional(),
  wifiEncryption: z.enum(["WPA", "WEP", "nopass"]).optional(),
  wifiHidden: z.boolean().optional(),
  content: z.string().optional(),
  level: z.enum(["L", "M", "Q", "H"]).optional(),
  dotStyle: z.enum(["square", "rounded", "dots", "classy"]).optional(),
  eyeStyle: z.enum(["square", "rounded", "circle"]).optional(),
  gradient: z.enum(["none", "linear", "radial"]).optional(),
  color1: z.string().optional(),
  color2: z.string().optional(),
  bgMode: z.enum(["solid", "transparent"]).optional(),
  bgColor: z.string().optional(),
  centerIcon: z.string().optional(),
  showLabel: z.boolean().optional(),
  label: z.string().optional(),
  qrScale: z.number().optional(),
});

const statusDetailSlot = z.object({
  entity: z.string().optional(),
  label: z.string().optional(),
});

const statusConfig = baseConfig.extend({
  statusEntity: z.string().optional(),
  statusAccent: z.string().optional(),
  statusStates: z.string().optional(), // Komma-Liste; leer = aktiv wenn nicht aus/idle
  alertStates: z.string().optional(), // Zustände, bei denen die Karte markant wird (Puls + Tönung)
  alertPulse: z.boolean().optional(), // Tönung pulsiert (Default an)
  alertRing: z.boolean().optional(), // Akzent-Ring um die Karte (Default an)
  tapEntity: z.string().optional(), // Antippen der Karte löst diese Entität aus (Touch)
  statusLayout: z.enum(["bar", "stack", "center"]).optional(), // Zeile / gestapelt / zentriert
  imageMode: z.enum(["entity", "url", "icon"]).optional(),
  imageStyle: z.enum(["box", "free"]).optional(), // Kachel-Crop vs. freigestelltes PNG
  imageScale: z.number().optional(), // Bild-Größe in % (50–200, Default 100)
  bgBlur: z.number().optional(), // Hintergrund-Blur in px (Default 16)
  bgZoom: z.number().optional(), // Hintergrund-Füllung in % (Default 120)
  imageEntity: z.string().optional(), // leer = statusEntity
  imageUrl: z.string().optional(),
  icon: z.string().optional(),
  label: z.string().optional(),
  statusDetails: z.array(statusDetailSlot).optional(),
  progressEntity: z.string().optional(),
  progressStyle: z.enum(["bar", "ring"]).optional(), // Balken unten vs. Kreis rechts
  progressShowPercent: z.boolean().optional(), // %-Zahl im Kreis (Default an)
  alwaysShow: z.boolean().optional(),
  showState: z.boolean().optional(),
  artworkAsTileBg: z.boolean().optional(), // Bild als Blur-Hintergrund (Default an)
  cardTheme: z.enum(["light", "dark", "auto"]).optional(), // gesetzt, wenn eingebettet
});

export const widgetLayoutItemSchema = z.union([
  customWidgetSchema,
  z.discriminatedUnion("type", [
  z
    .object({ type: z.literal("ClockWidget.tsx"), config: clockConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("WeatherWidget.tsx"), config: weatherConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("CalendarWidget.tsx"), config: calendarConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("ButtonWidget.tsx"), config: buttonConfig })
    .merge(commonWidgetFields()),
  z
    .object({
      type: z.literal("HomeAssistantWidget.tsx"),
      config: homeAssistantConfig,
    })
    .merge(commonWidgetFields()),
  z
    .object({
      type: z.literal("HANotificationWidget.tsx"),
      config: haNotificationConfig,
    })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("TimerWidget.tsx"), config: timerConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("MessagesWidget.tsx"), config: messagesConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("ShoppingListWidget.tsx"), config: shoppingConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("TodosWidget.tsx"), config: todosConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("ImageWidget.tsx"), config: imageConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("SensorWidget.tsx"), config: sensorConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("EnvironmentWidget.tsx"), config: environmentConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("CameraWidget.tsx"), config: cameraConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("MediaPlayerWidget.tsx"), config: mediaPlayerConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("RssWidget.tsx"), config: rssConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("QrWidget.tsx"), config: qrConfig })
    .merge(commonWidgetFields()),
  z
    .object({ type: z.literal("StatusWidget.tsx"), config: statusConfig })
    .merge(commonWidgetFields()),
  ]),
]);

function commonWidgetFields() {
  return z.object({
    i: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    label: z.string().optional().default(""),
    bgOpacity: z.number().default(20),
  });
}

export const layoutSchema = z.array(widgetLayoutItemSchema);

export const wallpaperSchema = z
  .object({
    source: z.string().optional(),
    query: z.string().optional(),
    intervalSec: z.number().optional(),
    showMetadata: z.boolean().optional(),
    // Wie das Bild skaliert wird (issue #17). cover = Fill (default, croppt),
    // contain = Fit, fill = Stretch, none = Center.
    fit: z.enum(["cover", "contain", "fill", "none", "blur"]).optional(),
    // Dia-/Bild-Einstellungen: Übergangs-Dauer (ms), Bild-Position (object-
    // position), Ken-Burns-Intensität (%). Defaults reproduzieren das bisherige
    // Verhalten exakt — keine Migration nötig.
    transitionMs: z.number().optional(),
    imagePosition: z.enum(["top", "center", "bottom"]).optional(),
    kenBurnsIntensity: z.number().optional(),
    // Artwork-Takeover: Cover eines laufenden media_player als Hintergrund
    artworkEnabled: z.boolean().optional(),
    artworkPlayer: z.string().optional(),
    artworkFit: z.enum(["blur", "cover"]).optional(),
    artworkBlur: z.number().optional(),
    artworkDarken: z.number().optional(),
  })
  .passthrough();

export const layoutSyncBodySchema = z.object({
  layout: layoutSchema,
  wallpaper: wallpaperSchema.optional(),
  settings: z.record(z.string(), z.any()).optional(),
  dashboardId: z.string().optional(),
});

export type WidgetType = (typeof WIDGET_TYPES)[number];
export type ClockConfig = z.infer<typeof clockConfig>;
export type WeatherConfig = z.infer<typeof weatherConfig>;
export type CalendarConfig = z.infer<typeof calendarConfig>;
export type ButtonConfig = z.infer<typeof buttonConfig>;
export type HomeAssistantConfig = z.infer<typeof homeAssistantConfig>;
export type HANotificationConfig = z.infer<typeof haNotificationConfig>;

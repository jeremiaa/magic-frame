// Englische Übersetzungen. Key = deutscher Original-Text.
// Fehlt ein Key, fällt useT() automatisch auf Deutsch zurück (nichts bricht).

export const EN: Record<string, string> = {
  // ── Navigation / Layout ──
  "Dashboard": "Dashboard",
  "Views": "Views",
  "Integrationen": "Integrations",
  "Module": "Modules",
  "Einstellungen": "Settings",
  "Backups": "Backups",
  "Control Center": "Control Center",
  "Angemeldet als": "Signed in as",
  "Abmelden": "Sign out",
  "Heller Modus": "Light mode",
  "Dunkler Modus": "Dark mode",
  "Seite neu laden": "Reload page",
  "Auto-Aktualisierung": "Auto-refresh",
  "View-Einstellungen": "View settings",
  "Nicht vergessen: oben Speichern, sonst greift die Änderung nicht.": "Don't forget to hit Save above, or the change won't apply.",
  "Aus": "Off",
  "Stunde": "hour",
  "Stunden": "hours",
  "Lädt diese View regelmäßig neu — hält Dauer-Displays frisch (leert den Browser-Cache).": "Reloads this view periodically — keeps always-on displays fresh (clears the browser cache).",
  "Menü schließen": "Close menu",
  "Menü öffnen": "Open menu",
  "Bald": "Soon",

  // ── Settings ──
  "Globale App-Settings": "Global app settings",
  "Shortcut-Token, Passwort, Session-Sicherheit, Server-Status und weitere Nutzer.":
    "Shortcut token, password, session security, server status and additional users.",
  "Aktiv": "Active",
  "Shortcut-Token (iOS/Android/External)": "Shortcut token (iOS/Android/external)",
  "Dein persönlicher API-Key. Lege damit Timer per iOS-Shortcut, Android-Tasker oder curl an, ohne Login.":
    "Your personal API key. Create timers via iOS Shortcut, Android Tasker or curl — no login needed.",
  "anzeigen": "show",
  "verbergen": "hide",
  "Kopieren": "Copy",
  "kopiert": "copied",
  "lade…": "loading…",
  "Beispiel: Timer aus iOS-Shortcut starten": "Example: start a timer from an iOS Shortcut",
  "Passwort ändern": "Change password",
  "Eigenes Admin-Passwort rotieren. Mindestens 8 Zeichen.":
    "Rotate your own admin password. At least 8 characters.",
  "Aktuelles Passwort": "Current password",
  "Neues Passwort": "New password",
  "Neues Passwort bestätigen": "Confirm new password",
  "Passwort speichern": "Save password",
  "Passwort geändert.": "Password changed.",
  "Neue Passwörter stimmen nicht überein.": "New passwords don’t match.",
  "Neues Passwort muss mindestens 8 Zeichen haben.": "New password must be at least 8 characters.",
  "Weitere Nutzer": "Additional users",
  "Mehrere Admin- oder Nur-Ansehen-Accounts. Nur Admins können Nutzer verwalten.":
    "Multiple admin or view-only accounts. Only admins can manage users.",
  "Lade Nutzer…": "Loading users…",
  "Keine Nutzer.": "No users.",
  "Administrator": "Administrator",
  "Nur ansehen": "View only",
  "Shortcut-Token aktiv": "Shortcut token active",
  "Löschen": "Delete",
  "Nutzer angelegt.": "User created.",
  "Passwort (≥ 8 Zeichen)": "Password (≥ 8 characters)",
  "Admin": "Admin",
  "Anlegen": "Create",
  "Du bist als": "You are signed in as",
  "angemeldet —": "—",
  "Nutzer-Verwaltung ist Admins vorbehalten.": "user management is reserved for admins.",
  "Server": "Server",
  "Host-Info, Build-Version, Uptime, Datenbank-Status.":
    "Host info, build version, uptime, database status.",
  "Lade Server-Status…": "Loading server status…",
  "App-Version": "App version",
  "Datenbank": "Database",
  "verbunden": "connected",
  "Fehler": "Error",
  "Prozess-Uptime": "Process uptime",
  "Host-Uptime": "Host uptime",
  "CPU-Kerne": "CPU cores",
  "RAM (Prozess)": "RAM (process)",
  "RAM (Host frei)": "RAM (host free)",
  "Nutzer": "Users",
  "Cookie Secure": "Cookie secure",
  "an": "on",
  "aus": "off",
  "Plattform": "Platform",
  "Aktualisieren": "Refresh",
  "Session & Cookies": "Session & cookies",
  "Sicherheits-Status deiner Anmeldung.": "Security status of your session.",
  "Lade…": "Loading…",
  "Rolle": "Role",
  "an (HTTPS)": "on (HTTPS)",
  "Gültigkeit": "Lifetime",
  "Tage": "days",
  "Session-Secret": "Session secret",
  "stark": "strong",
  "schwach": "weak",
  "Auf diesem Gerät abmelden": "Sign out on this device",
  "Sprache": "Language",
  "Sprache der Editor-Oberfläche. Wird lokal gespeichert.":
    "Language of the editor interface. Stored locally.",
  "Sprache der Oberfläche. Pro Browser merkbar + als Default für alle Displays gespeichert.":
    "UI language. Remembered per browser and saved as the default for all displays.",
  "Deutsch": "German",
  "Englisch": "English",

  // ── Modules ──
  "Installierte Module": "Installed modules",
  "Market bald": "Market soon",
  "Installiert": "Installed",
  "Eigenes Modul bauen": "Build your own module",
  "Modul-Market (geplant)": "Module market (planned)",
  "Diese Widget-Typen stehen dir zur Verfügung. Eigene Module kannst du schon jetzt bauen — die Anleitung steht unten. Der Modul-Market (Installer & Updates im Browser) kommt im nächsten großen Schritt.":
    "These widget types are available to you. You can build your own modules right now — the guide is below. The module market (installer & updates in the browser) is the next big step.",
  "Zeit, Datum, optional Mini-Wetter.": "Time, date, optional mini weather.",
  "Open-Meteo / DWD / OWM / HA, inkl. Vorhersage & Icons.": "Open-Meteo / DWD / OWM / HA, incl. forecast & icons.",
  "iCal, Google & Microsoft-Feeds mit Farb-Coding.": "iCal, Google & Microsoft feeds with colour coding.",
  "Home-Assistant-Entities mit Regeln + Live-WS.": "Home Assistant entities with rules + live WS.",
  "Tap-Tiles mit HA-Services / Webhook-Actions.": "Tap tiles with HA services / webhook actions.",
  "Regelbasierte Push-Kacheln aus HA.": "Rule-based push tiles from HA.",
  "Live-Countdown, per Companion-App oder Siri startbar.": "Live countdown, startable via companion app or Siri.",
  "Quick-Post aus der Companion-App mit TTL.": "Quick post from the companion app with TTL.",
  "Gemeinsame Familienliste, sync mit Apple-Erinnerungen.": "Shared family list, syncs with Apple Reminders.",
  "Aufgaben mit Assignee + Due-Date, Apple-Reminders-Sync.": "Tasks with assignee + due date, Apple Reminders sync.",
  "Uhr": "Clock",
  "Wetter": "Weather",
  "Kalender": "Calendar",
  "HA Entity": "HA entity",
  "Buttons": "Buttons",
  "HA Benachrichtigungen": "HA notifications",
  "Timer": "Timer",
  "Nachrichten": "Messages",
  "Einkaufsliste": "Shopping list",
  "Todos": "To-dos",
  "Konventionen": "Conventions",

  // ── Backups ──
  "Layout-Sicherungen": "Layout backups",
  "Kompletter Export aller Views als JSON, Import mit Vorschau, plus automatische Snapshots vor jedem Speichern (1-Klick-Rückkehr).":
    "Full export of all views as JSON, import with preview, plus automatic snapshots before every save (one-click restore).",
  "Alle Views exportieren": "Export all views",
  "Ein JSON-File mit Layouts, Wallpapers & View-Settings. (Ohne globale Secrets wie HA-Token.)":
    "A JSON file with layouts, wallpapers & view settings. (Without global secrets like the HA token.)",
  "Backup-Datei wählen — du siehst eine Vorschau vor dem Überschreiben.":
    "Choose a backup file — you’ll see a preview before overwriting.",
  "Vor jedem Speichern wird automatisch eine Version gesichert (letzte 20). Du kannst auch jetzt einen Snapshot anlegen.":
    "A version is saved automatically before every save (last 20). You can also take a snapshot now.",
  "Versionen": "Versions",
  "Import": "Import",
  "Auto-Snapshots": "Auto snapshots",
  "Exportieren": "Export",
  "Backup heruntergeladen.": "Backup downloaded.",
  "Datei wählen": "Choose file",
  "Überschreiben": "Overwrite",
  "Abbruch": "Cancel",
  "Snapshot jetzt": "Snapshot now",
  "Lade Versionen…": "Loading versions…",
  "Noch keine Versionen": "No versions yet",
  "Wiederherstellen": "Restore",
  "Keine gültige Magic-Frame-Backup-Datei.": "Not a valid Magic Frame backup file.",
  "Widgets": "widgets",
  "View(s):": "view(s):",
  "Sobald du einen View speicherst, legt das System automatisch einen Snapshot an. Oder klick oben auf „Snapshot jetzt\".":
    "As soon as you save a view, the system automatically creates a snapshot. Or click “Snapshot now” above.",
  "vor Speichern": "before save",
  "manuell": "manual",
  "vor Import": "before import",
  "vor Wiederherstellen": "before restore",
  "Snapshot verwerfen": "Discard snapshot",
  "Export fehlgeschlagen.": "Export failed.",
  "Fehlgeschlagen.": "Failed.",
  "Import fehlgeschlagen.": "Import failed.",
  "Datei konnte nicht gelesen werden.": "File could not be read.",
  "Snapshot von {n} View(s) angelegt.": "Snapshot of {n} view(s) created.",
  "{n} View(s) importiert.": "{n} view(s) imported.",
  "„{name}“ auf diese Version zurücksetzen? Der aktuelle Stand wird vorher als Snapshot gesichert.":
    "Reset “{name}” to this version? The current state is saved as a snapshot first.",
  "„{name}“ wiederhergestellt.": "“{name}” restored.",
  "{n} View(s) überschreiben? Der aktuelle Stand wird vorher als Snapshot gesichert.":
    "Overwrite {n} view(s)? The current state is saved as a snapshot first.",

  // ── Views list ──
  "Neuer View": "New view",
  "Speichern": "Save",
  "Speichere…": "Saving…",
  "Gespeichert": "Saved",
  "Abbrechen": "Cancel",
  "Alle Dashboards & Displays": "All dashboards & displays",
  "Ein View = was auf einem Display gerendert wird. Du kannst beliebig viele anlegen und pro Display eine eigene Layout-URL ansteuern.":
    "A view = what gets rendered on a display. Create as many as you like and point each display to its own layout URL.",
  "Wird geladen…": "Loading…",
  "Noch keine Views angelegt.": "No views created yet.",
  "Ersten View anlegen": "Create first view",
  "Live öffnen": "Open live",
  "Mindestens ein View muss bestehen bleiben.": "At least one view must remain.",
  "Nach dem Anlegen wirst du direkt in den Editor geschickt.":
    "After creating it you’ll be taken straight to the editor.",
  "Anzeigename": "Display name",
  "Ausrichtung": "Orientation",

  // ── Integrations ──
  "Daten- & Medienquellen": "Data & media sources",
  "Home Assistant": "Home Assistant",
  "Kalender-Konten": "Calendar accounts",
  "Weitere Quellen": "More sources",
  "Google verbinden": "Connect Google",
  "Microsoft 365 verbinden": "Connect Microsoft 365",
  "Noch keine Konten verbunden.": "No accounts connected yet.",
  "Lade Konten…": "Loading accounts…",
  "Trennen": "Disconnect",
  "Home Assistant gilt global für alle Views. Das Wallpaper konfigurierst du direkt im View-Editor (Button „Wallpaper\").":
    "Home Assistant applies globally to all views. You configure the wallpaper directly in the view editor (the “Wallpaper” button).",
  "URL + Long-Lived Access Token. Gilt global. Token-Generator: HA-UI → Profil (unten links) → Long-Lived Access Tokens.":
    "URL + long-lived access token. Applies globally. Token generator: HA UI → Profile (bottom left) → Long-Lived Access Tokens.",
  "Home-Assistant-URL": "Home Assistant URL",
  "Immich (global)": "Immich (global)",
  "Bild (Immich)": "Image (Immich)",
  "Sensor": "Sensor",
  "Bild": "Image",
  "Immich-Slideshow oder WebDAV/URL-Bild, mit Ken-Burns & Split-View.": "Immich slideshow or WebDAV/URL image, with Ken Burns & split-view.",
  "Mehrere HA-Sensorwerte als Kacheln mit Icon, Farbe & History-Sparkline.": "Multiple HA sensor values as tiles with icon, colour & history sparkline.",
  "HA-Kamera-Entities — Snapshot, MJPEG oder WebRTC-Livestream.": "HA camera entities — snapshot, MJPEG or WebRTC livestream.",
  "Läuft-gerade-Karte mit Cover, Fortschritt und Steuerung.":
    "Now-playing card with artwork, progress and controls.",
  "Schlagzeilen mit Vorschaubild, Teaser und QR zum Weiterlesen.":
    "Headlines with a thumbnail, teaser and a QR code to read on.",
  "WLAN, Links & Texte als QR — runde Punkte, Farbverläufe, Icon in der Mitte.":
    "Wi-Fi, links and text as a QR code — rounded dots, gradients, icon in the middle.",
  "Gerätekarte mit Bild und Live-Details — wahlweise dauerhaft oder nur bei aktivem Ereignis.":
    "Device card with a picture and live details — permanently, or only while the event is active.",
  "Keine Sensoren gewählt — im Inspector hinzufügen.": "No sensors selected — add them in the inspector.",
  "Media Player": "Media Player",
  "Kein Media-Player gewählt — im Inspector wählen.": "No media player selected — pick one in the inspector.",
  "Nichts läuft gerade": "Nothing playing",
  "Unbekannter Titel": "Unknown title",
  "Weiter": "Next",
  "Pause": "Pause",
  "Abspielen": "Play",
  "Media-Player-Entity": "Media player entity",
  "Farbverlauf-Stärke": "Colour gradient strength",
  "Richtung": "Direction",
  "Von links": "From the left",
  "Von rechts": "From the right",
  "Farbverlauf sanft animieren": "Gently animate the gradient",
  "Rahmen": "Border",
  "In Alarm-Farbe": "In alert colour",
  "Eigene Farbe": "Custom colour",
  "Rand anzeigen": "Show border",
  "Rand-Farbe": "Border colour",
  "Weiß": "White",
  "Wetter-Hintergrund": "Weather background",
  "Weiche, unscharfe Farben, die die aktuelle Wetterlage darstellen.": "Soft, blurred colours that reflect the current weather.",
  "Artwork bei Musik": "Artwork while playing",
  "Wenn Musik läuft, wird das Album-Cover zum Hintergrund. Leer = aus.": "When music plays, the album artwork becomes the background. Empty = off.",
  "Blur-Rahmen + scharfes Cover": "Blurred fill + sharp cover",
  "Bildschirmfüllend": "Fill the screen",
  "Media-Player": "Media players",
  "Cover": "Cover",
  "Elemente": "Elements",
  "Verhalten": "Behaviour",
  "Zeile": "Row",
  "Hochkant": "Portrait",
  "Cover (Art füllt Kachel)": "Cover (art fills tile)",
  "Automatisch (nach Kachelform)": "Automatic (by tile shape)",
  "Cover anzeigen": "Show cover art",
  "Cover-Größe": "Cover size",
  "Cover-Ecken": "Cover corners",
  "Abgerundet": "Rounded",
  "Eckig": "Square",
  "Kreis": "Circle",
  "Vinyl (Kreis)": "Vinyl (circle)",
  "Vinyl dreht sich beim Abspielen": "Vinyl spins while playing",
  "Wenn Text nicht passt": "When text doesn't fit",
  "Abschneiden (…)": "Truncate (…)",
  "Laufschrift": "Marquee scroll",
  "Automatisch verkleinern": "Shrink to fit",
  "Interpret anzeigen": "Show artist",
  "Blur-Stärke": "Blur strength",
  "Abdunkeln": "Darken",
  "Text-Verlauf (nur Cover-Layout)": "Text gradient (cover layout only)",
  "Player-Punkte": "Player dots",
  "Punkte-Position": "Dot position",
  "Unten rechts": "Bottom right",
  "Oben rechts": "Top right",
  "Unten mittig": "Bottom center",
  "Nur bei Hover/Tippen anzeigen": "Only show on hover/tap",
  "Lautstärke-Regler anzeigen": "Show volume slider",
  "Wischen auf der Kachel wechselt den Player.": "Swipe on the tile to switch players.",
  "Zeitleiste antippen/ziehen springt im Track.": "Tap or drag the timeline to seek.",
  "Fortschritt-Farbe": "Progress colour",
  "Player-Name anzeigen": "Show player name",
  "Linksbündig": "Left-aligned",
  "Zentriert": "Centred",
  "Rechtsbündig": "Right-aligned",
  "Steuerung anzeigen": "Show controls",
  "Fortschritt anzeigen": "Show progress",
  "Now Playing (Media-Player)": "Now playing (media player)",
  "Zeigt eine Musik-Karte im Stack, solange ein Player läuft.": "Shows a music card in the stack while a player is playing.",
  "Cover als Hintergrund (Blur)": "Artwork as background (blur)",
  "Karten-Höhe": "Card height",
  "100 % = passt sich der Schrift der Benachrichtigungen an.": "100% = matches the notification text size.",
  "Karten (Standard)": "Cards (default)",
  "Minimal": "Minimal",
  "Media-Stil (farbig getönt)": "Media style (colour tinted)",
  "Weißer Rand anzeigen": "Show white border",
  "Andocken": "Dock position",
  "Über den Benachrichtigungen": "Above the notifications",
  "Unter den Benachrichtigungen": "Below the notifications",
  "Bei Pause ausblenden nach (Minuten)": "Hide when paused after (minutes)",
  "0 = nie ausblenden": "0 = never hide",
  "Tipp auf den Namen wechselt den Player.": "Tap the name to switch players.",
  "Größen, Layout und sichtbare Elemente passen sich automatisch der Kachel an — wird es zu klein, blenden sich Steuerung/Details sauber aus.": "Sizes, layout and visible elements adapt to the tile automatically — when it gets too small, controls/details hide cleanly instead of squishing.",
  "Weiteren Player hinzufügen": "Add another player",
  "Funktioniert mit jedem HA media_player — Sonos, Chromecast, Music Assistant usw.": "Works with any HA media_player — Sonos, Chromecast, Music Assistant, etc.",
  "Funktioniert mit jedem HA media_player — Sonos, HomePod, Chromecast, Music Assistant usw.": "Works with any HA media_player — Sonos, HomePod, Chromecast, Music Assistant, etc.",
  "Aktiven Player automatisch anzeigen": "Auto-follow the active player",
  "Fortschritt anzeigen (Balken + Zeit)": "Show progress (bar + time)",
  "Wiedergabe-Steuerung anzeigen": "Show playback controls",
  "Cover als Kachel-Hintergrund": "Cover art as tile background",
  "Nur anzeigen wenn etwas läuft": "Only show while playing",
  "Noch keine Sensoren — unten hinzufügen.": "No sensors yet — add one below.",
  "Sensor hinzufügen": "Add sensor",
  "Verlauf anzeigen (Sparkline)": "Show history (sparkline)",
  "Nur Zahlen-Entities (Sensoren) haben einen sinnvollen Verlauf. HA-History muss aktiv sein.": "Only numeric entities (sensors) have a usable history. HA's history API must be enabled.",
  "Darstellung": "Layout",
  "Cards (Zeilen)": "Cards (rows)",
  "Kacheln (Grid)": "Tiles (grid)",
  "Einheit / Nachkommastellen": "Unit / decimals",
  "Icon-Farbe": "Icon color",
  "Kachel-Theme": "Tile theme",
  "Dunkel (Glas)": "Dark (glass)",
  "Hell (weißes Glas)": "Light (white glass)",
  "Unschärfe": "Blur",
  "Icon mit Rahmen": "Icon with frame",
  "Icon-Größe": "Icon size",
  "Icon im Kasten": "Icon in box",
  "Steuerungs-Button ausblenden": "Hide control button",
  "Kasten-Größe": "Box size",
  "Standard": "Default",
  "Standard (keine Farbe)": "Default (no color)",
  "Keine Entity gewählt — im Inspector einstellen.": "No entity selected — set it in the inspector.",
  "Entity (Sensor)": "Entity (sensor)",
  "Zeigt den Wert einer HA-Entity als große Kachel — z.B. eine Temperatur.": "Shows a HA entity's value as a large tile — e.g. a temperature.",
  "Label (leer = HA-Name)": "Label (empty = HA name)",
  "z.B. Pool": "e.g. Pool",
  "Eigener Name (leer = HA-Name)": "Custom name (empty = HA name)",
  "Einheit (leer = HA)": "Unit (empty = HA)",
  "Nachkommastellen": "Decimals",
  "Auto": "Auto",
  "Ecken-Rundung": "Corner rounding",
  "0 = eckig. Passt das Bild an die runden Widget-Ecken an.": "0 = square. Matches the image to the rounded widget corners.",
  "Immich-Quelle": "Immich source",
  "Favoriten": "Favorites",
  "Rückblicke (Memories)": "Memories",
  "Zeigt alle in Immich favorisierten Fotos (Stern). Kein Album nötig.": "Shows all photos favorited in Immich (star). No album needed.",
  "Zeigt deine Immich-Rückblicke („vor X Jahren an diesem Tag“). Aktualisiert sich automatisch.": "Shows your Immich memories (“X years ago today”). Updates automatically.",
  "Global (Einstellungen)": "Global (Settings)",
  "Vom View (Wallpaper)": "From this view (wallpaper)",
  "Nutzt die Immich-Daten aus dem Wallpaper dieses Views.": "Uses the Immich data from this view's wallpaper.",
  "Keine Alben gefunden — ist im Wallpaper dieses Views Immich hinterlegt?": "No albums found — is Immich set in this view's wallpaper?",
  "Kein Album gewählt — im Inspector einstellen.": "No album selected — set it in the inspector.",
  "Nutzt die globale Immich-Verbindung (Einstellungen → Integrationen).": "Uses the global Immich connection (Settings → Integrations).",
  "Album": "Album",
  "Neu laden": "Reload",
  "Keine Alben gefunden — ist Immich global konfiguriert?": "No albums found — is Immich configured globally?",
  "Verbindung fehlgeschlagen": "Connection failed",
  "Immich nicht konfiguriert (Einstellungen → Integrationen, oder im Wallpaper dieses Views).": "Immich not configured (Settings → Integrations, or in this view's wallpaper).",
  "Globale Immich-Verbindung für Wallpaper + Bild-Widget. Pro View/Widget überschreibbar — wer dort eigene Daten einträgt, nutzt die.": "Global Immich connection for wallpaper + image widget. Overridable per view/widget — whoever enters their own data there uses it.",
  "Immich-URL": "Immich URL",
  "Wird am Server gespeichert. Views ohne eigene Immich-Daten nutzen diese Verbindung.": "Stored on the server. Views without their own Immich data use this connection.",
  "Globale Verbindung konfiguriert.": "Global connection configured.",
  "Optional — nur nötig, wenn Views keine eigenen Daten haben.": "Optional — only needed when views don't have their own data.",
  "Wird verschlüsselt am Server gespeichert und beim HA-Proxy eingesetzt. Niemals im Frontend-Bundle.":
    "Stored encrypted on the server and used by the HA proxy. Never in the frontend bundle.",
  "Verbindung konfiguriert.": "Connection configured.",
  "Nicht konfiguriert — HA-Widgets bleiben leer.": "Not configured — HA widgets stay empty.",
  "iCal-Feeds werden weiterhin direkt pro Kalender-Widget im View-Editor konfiguriert. Generische MQTT- und REST-Integrationen kommen mit dem Modul-Market.":
    "iCal feeds are still configured per calendar widget in the view editor. Generic MQTT and REST integrations come with the module market.",
  "Verbinde Google oder Microsoft 365, um echte Kalenderdaten im Kalender-Widget anzuzeigen. iCal-URLs bleiben als separate Feed-Art erhalten.":
    "Connect Google or Microsoft 365 to show real calendar data in the calendar widget. iCal URLs remain as a separate feed type.",
  "OAuth-Zugangsdaten einrichten (Klick-Verbinden aktivieren)":
    "Set up OAuth credentials (enable click-to-connect)",

  // ── Views list ──
  "Konfiguriere deine Display-Layouts. Jeder View ist über seine URL erreichbar.":
    "Configure your display layouts. Each view is reachable via its URL.",
  "Öffnen": "Open",
  "Bearbeiten": "Edit",
  "Duplizieren": "Duplicate",

  // ── Editor toolbar ──
  "Quer": "Landscape",
  "Hoch": "Portrait",
  "Wallpaper": "Wallpaper",
  "Refresh": "Refresh",
  "TV Sync": "TV sync",
  "Widget hinzufügen": "Add widget",
  "Ebenen": "Layers",
  "Zum Sortieren ziehen": "Drag to reorder",
  "Einfügen": "Paste",
  "{x} hinzufügen": "Add {x}",
  "Widget-Einstellungen": "Widget settings",
  "Hintergrund / Wallpaper für diesen View": "Background / wallpaper for this view",
  "View in neuem Tab öffnen": "Open view in new tab",
  "TV Sync beenden": "Stop TV sync",
  "Alle TVs auf dieses Dashboard": "All TVs to this dashboard",
  "Alle verbundenen Displays neu laden (Shift+Klick: nur diesen View)": "Reload all connected displays (Shift+Click: only this view)",
  "Layout speichern (⌘S)": "Save layout (⌘S)",
  "Befehl gesendet: Alle verbundenen Displays wechseln auf": "Command sent: all connected displays are switching to",
  "Keine Verbindung zum WebSocket-Server.": "No connection to the WebSocket server.",
  "Befehl gesendet: Alle Displays kehren zurück.": "Command sent: all displays are returning.",
  "Modul kopiert — öffne einen anderen View und klick oben auf 'Einfügen'.": "Module copied — open another view and click 'Paste' at the top.",
  "Wiederherstellen fehlgeschlagen!": "Restore failed!",
  "Bitte URL, Benutzer und Passwort ausfüllen.": "Please fill in URL, username and password.",
  "Unbekannter Fehler": "Unknown error",
  "Bitte Immich-URL und API-Key ausfüllen.": "Please fill in the Immich URL and API key.",
  "Keine Alben gefunden — hat der API-Key Album-Rechte?": "No albums found — does the API key have album permissions?",

  // ── Inspector chrome ──
  "Benachrichtigungen": "Notifications",
  "Text & Farbe": "Text & colour",
  "Inhalt": "Content",
  "Schließen (Esc)": "Close (Esc)",
  "Name": "Name",
  "Raster-Position": "Grid position",
  "Feinjustierung (Pixel)": "Fine tuning (pixels)",
  "Hintergrund": "Background",
  "Breite": "Width",
  "Höhe": "Height",
  "Deckkraft": "Opacity",
  "Nur zeigen wenn HA-Entity einen Status hat": "Only show when an HA entity has a state",
  "Status (leer = sobald aktiv / an)": "State (empty = whenever active / on)",
  "Auto-ausblenden nach Sek. (0 = solange aktiv)": "Auto-hide after sec. (0 = while active)",
  "Sichtbarkeit": "Visibility",
  "Automatisch über Home Assistant": "Automatic via Home Assistant",
  "Beim Laden versteckt (per Button einblendbar)": "Hidden on load (shown via a button)",
  "Blendet dieses Widget automatisch ein/aus, je nach Status einer HA-Entity. Für Gruppen den Button-Trigger nutzen.": "Shows/hides this widget automatically based on an HA entity's state. Use the button trigger for groups.",
  "Lässt eine Home-Assistant-Entity einen deiner Knöpfe automatisch auslösen — der Knopf führt dann genau seine Aktion und Widget-Gruppe aus, wie ein Fingertipp. So schaltest du ganze Gruppen per HA.": "Lets a Home Assistant entity press one of your buttons automatically — the button then runs its own action and widget group, just like a tap. That's how you switch whole groups via HA.",
  "Welchen Knopf auslösen?": "Which button to fire?",
  "Knopf": "Button",
  "Knopf macht:": "Button does:",
  "Widget(s)": "widget(s)",
  "Dieser Knopf blendet keine Widgets ein/aus. Stell ihn im jeweiligen Btn-Tab auf einblenden/ausblenden/umschalten und verlinke Widgets.": "This button doesn't show/hide widgets. Set it in its Btn tab to show/hide/toggle and link some widgets.",
  "Auto-ausblenden nach Sek. (0 = aus)": "Auto-hide after sec. (0 = off)",
  "Türklingel: einblenden, dann nach X Sek. automatisch wieder weg (gilt sinngemäß auch für ausblenden/umschalten).": "Doorbell: reveal, then auto-hide after X sec. (applies analogously to hide/toggle).",
  "Größe": "Size",
  "Schriftart": "Font",
  "Farbe & Schatten": "Colour & shadow",
  "Responsive-Faktor": "Responsive factor",
  "Basis-Schriftgröße": "Base font size",
  "Familie": "Family",
  "Gewicht": "Weight",
  "Schriftfarbe": "Text colour",
  "Schatten Blur": "Shadow blur",
  "Schatten X": "Shadow X",
  "Schatten Y": "Shadow Y",
  "Responsive Auto-Scale (cqmin)": "Responsive auto-scale (cqmin)",
  "Eigener Name für dieses Modul — ersetzt den Typ in Canvas & Inspector.":
    "Custom name for this module — replaces the type in canvas & inspector.",

  // ── Wallpaper modal ──
  "Wallpaper Engine": "Wallpaper engine",
  "Display-Hintergründe konfigurieren": "Configure display backgrounds",
  "Anzeige": "Display",
  "Overlays & Text": "Overlays & text",
  "Provider": "Provider",
  "Mitgelieferte Bilder (Standard)": "Bundled images (default)",
  "Vollfarbe (einfarbiger Hintergrund)": "Solid colour (single-colour background)",
  "Hintergrundfarbe": "Background colour",
  "Einfarbiger Hintergrund statt Bild — keine Slideshow, kein Cache.": "A single colour instead of an image — no slideshow, no cache.",
  "Übergangseffekt": "Transition effect",
  "Aufteilung (Split-View)": "Layout (split view)",
  "Aus (ein Bild)": "Off (single image)",
  "Auto (Hochformat paaren)": "Auto (pair portraits)",
  "2 nebeneinander": "2 side by side",
  "2×2 (vier Bilder)": "2×2 (four images)",
  "Auto zeigt Querformat einzeln und legt zwei Hochformat-Bilder nebeneinander — gut für gemischte Alben. Im Split-Modus wird sanft übergeblendet (Crossfade).": "Auto shows landscape photos on their own and places two portraits side by side — great for mixed albums. Split mode always crossfades.",
  "Übergangs-Dauer": "Transition duration",
  "Ken-Burns-Intensität": "Ken Burns intensity",
  "Wie weit das Bild langsam einzoomt. Höher = stärkerer Effekt.": "How far the image slowly zooms in. Higher = stronger effect.",
  "Bild-Position": "Image position",
  "Oben": "Top",
  "Mitte (Standard)": "Center (default)",
  "Unten": "Bottom",
  "Bei „Füllen“: welcher Bildausschnitt sichtbar bleibt — z.B. „Oben“ gegen abgeschnittene Köpfe.": "With “Fill”: which part of the image stays visible — e.g. “Top” to avoid cropped heads.",
  "Bildanzeige": "Image display",
  "Füllen (Ausschnitt, Standard)": "Fill (crop, default)",
  "Einpassen (ganzes Bild)": "Fit (whole image)",
  "Einpassen + Blur-Rand": "Fit + blurred fill",
  "Zeigt das ganze Bild und füllt die Ränder mit einer unscharfen Kopie statt mit Schwarz — gut für Hochformat in einer breiten Kachel.": "Shows the whole image and fills the edges with a blurred copy instead of black — good for portrait photos in a wide tile.",
  "Strecken (verzerrt)": "Stretch (distorted)",
  "Zentriert (Originalgröße)": "Center (original size)",
  "Füllen schneidet Ränder ab. Einpassen zeigt das ganze Bild ohne Beschneiden — gut für Hochformat-Fotos.": "Fill crops the edges. Fit shows the whole image without cropping — good for portrait photos.",
  "Metadata/EXIF einblenden": "Show metadata / EXIF",
  "Ladekreis (Timer) anzeigen": "Show loading ring (timer)",
  "Bildwechsel Intervall (Sekunden)": "Image change interval (seconds)",
  "Schatten Oben": "Shadow top",
  "Schatten Unten": "Shadow bottom",
  "Vignette Effekt": "Vignette effect",
  "Unschärfe (Blur)": "Blur",
  "Mit Immich verbinden / Alben laden": "Connect to Immich / load albums",
  "Lade Alben…": "Loading albums…",
  "Album auswählen": "Choose album",
  "Datum & Uhrzeit": "Date & time",
  "Kamera-Modell": "Camera model",
  "Aufnahmeort (GPS)": "Capture location (GPS)",
  "Schließen": "Close",

  // ── Widget empty states ──
  "Keine Nachrichten": "No messages",
  "Kein aktiver Timer": "No active timer",
  "FERTIG": "DONE",
  "Keine": "None",

  // ── Live-view widget runtime ──
  "Wetterdaten nicht verfügbar": "Weather data unavailable",
  "Lat/Lon in Config eintragen": "Set lat/lon in config",
  "HA-Entity in Config eintragen, z.B. weather.home": "Set HA entity in config, e.g. weather.home",
  "Lade Wetter…": "Loading weather…",
  "Jetzt": "Now",
  "Fühlt sich an wie": "Feels like",
  "Kalender konnte nicht geladen werden": "Calendar could not be loaded",
  "Bitte Kalender-URL(s) im Editor hinterlegen": "Please add calendar URL(s) in the editor",
  "Kalender wird gesammelt...": "Collecting calendar…",
  "Keine anstehenden Termine": "No upcoming events",
  "Keine Termine an diesem Tag": "No events this day",
  "Heute": "Today",
  "Morgen": "Tomorrow",
  "Ganztägig": "All day",
  "Erledigt (12h)": "Done (12h)",
  "Erledigt": "Done",
  "{name} ist durch 🎉": "{name} is all done 🎉",
  "Nichts zu tun": "Nothing to do",
  "+ Todo für {name}": "+ To-do for {name}",
  "+ Neues Todo": "+ New to-do",
  "heute": "today",
  "morgen": "tomorrow",
  "weitere": "more",
  "Timer beenden": "Stop timer",
  "Wegwischen (auch in HA)": "Dismiss (also in HA)",
  "Wegwischen": "Dismiss",
  "Nichts auf der Liste": "Nothing on the list",
  "Alle abgehakten löschen?": "Delete all checked items?",
  "Abgehakte löschen": "Delete checked items",
  "+ Artikel hinzufügen": "+ Add item",
  "Aktion konfigurieren...": "Configure action…",
  "Bitte mindestens eine Entity-ID im Editor konfigurieren": "Please configure at least one entity ID in the editor",
  "Tippen = Farbe Setzen": "Tap = set colour",
  "Halten = Speichern": "Hold = save",

  // ── Clock inspector ──
  "Zeitzone (z.B. Europe/Berlin)": "Time zone (e.g. Europe/Berlin)",
  "Automatisch / Lokal": "Automatic / local",
  "Textausrichtung": "Alignment",
  "Links": "Left",
  "Mittig": "Centre",
  "Rechts": "Right",
  "Sekunden ausblenden": "Hide seconds",
  "Datum ausblenden": "Hide date",
  "Wetter-Multiwidget Modus (Kompaktes Wetter hier aktivieren)": "Weather multi-widget mode (enable compact weather here)",
  "Ort suchen (Auto-Ausfüllen)": "Search location (auto-fill)",
  "z.B. München...": "e.g. Munich...",
  "Sucht...": "Searching...",
  "Latitude (Auto)": "Latitude (auto)",
  "Longitude (Auto)": "Longitude (auto)",
  "Icon Stil (Wetter)": "Icon style (weather)",
  "Lucide (Klar, Umriss)": "Lucide (clean, outline)",
  "Solid (Gefüllt, Flach)": "Solid (filled, flat)",
  "Meteocons (Farbig, Animierbar)": "Meteocons (colour, animatable)",
  "3D (Plastisch, Animierbar)": "3D (glossy, animatable)",
  "Auch kleine Icons animieren": "Animate small icons too",
  "Vorhersage- und Stunden-Icons laufen dann ebenfalls animiert. Kann auf schwachen Displays Leistung kosten.": "Forecast and hourly icons animate as well. May cost performance on weak displays.",
  "Zeigt in klaren Vollmond-Nächten den Vollmond statt der Mondsichel.": "Shows the full moon instead of the crescent on clear full-moon nights.",
  "Icon-Größe (Vorschau & Stunden)": "Icon size (forecast & hourly)",
  "Icon-Größe (Aktuelles Wetter)": "Icon size (current weather)",
  "Wird von Home Assistant übernommen.": "Handled by Home Assistant.",
  "Magic Frame läuft als Home-Assistant-Add-on. Reverse-Proxy und HTTPS macht dort Home Assistant selbst — ein eigenes Caddy ist nicht dabei. Für Zugriff von außen nutze die Fernzugriff-Einstellungen von Home Assistant.": "Magic Frame is running as a Home Assistant add-on. Home Assistant handles the reverse proxy and HTTPS itself — no separate Caddy is bundled. For access from outside, use Home Assistant's own remote access settings.",
  "Meteocons-Stil": "Meteocons style",
  "Gefüllt": "Filled",
  "Umriss": "Outline",
  "Animiert": "Animated",
  "Animierte Icons bewegen sich sanft (Sonne dreht, Regen fällt). Statisch ist am ressourcenschonendsten für alte Displays.": "Animated icons move gently (sun rotates, rain falls). Static is the lightest on old displays.",
  "Echte Mondphasen": "Real moon phases",
  "Info-Icons im Meteocons-Stil": "Meteocons-style info icons",
  // Umwelt-Widget (EnvironmentWidget)
  "Umwelt": "Environment",
  "Umweltdaten nicht verfügbar": "Environmental data unavailable",
  "Keine Quelle gewählt — im Inspector Ort suchen oder HA-Sensoren hinzufügen.": "No source selected — search a location or add HA sensors in the inspector.",
  "Ort suchen (z. B. Gießen) …": "Search location (e.g. Berlin) …",
  "Standort": "Location",
  "Aktuell:": "Current:",
  "Noch kein Standort gewählt.": "No location selected yet.",
  "Eigene Sensoren (Home Assistant)": "Own sensors (Home Assistant)",
  "Zusätzliche Kacheln aus HA — z. B. DWD Pollenflug, PV-Leistung, CO2 oder eigene Feinstaub-Sensoren.": "Additional tiles from HA — e.g. DWD pollen, PV power, CO2 or your own particulate sensors.",
  "Neuer Sensor": "New sensor",
  "Meteocons-Icons": "Meteocons icons",
  "Randlos (bis zum Bildschirmrand)": "Edge-to-edge (fill the screen)",
  "Randlos-Modus": "Edge-to-edge mode",
  "Schwebende Karte (dockt nicht an)": "Floating card (doesn't dock)",
  "Standard: Widgets docken eckig ans Randlos-Raster an. Schwebend behält runde Ecken — für Widgets, die über dem Hintergrund-Raster liegen (z. B. Wetter über dem Foto).": "Default: widgets dock squarely into the edge-to-edge grid. Floating keeps rounded corners — for widgets sitting on top of the background grid (e.g. weather over the photo).",
  "Widgets füllen den Bildschirm ohne Außenrand — Ecken werden automatisch eckig. Ideal für Vollbild-Layouts wie Foto über Kalender.": "Widgets fill the screen without an outer margin — corners go square automatically. Ideal for full-screen layouts like photo above calendar.",
  "Kachelabstand": "Tile spacing",
  "Monatsname": "Month name",
  "Kalenderwochen": "Week numbers",
  "Termin-Schriftgröße": "Event font size",
  "Uhrzeit": "Time",
  "Ort": "Location",
  "Ohne Uhrzeit bleibt dem Titel deutlich mehr Platz in der Tages-Spalte.": "Without the time the title gets noticeably more room in the day column.",
  "Termine pro Tag": "Events per day",
  "Feste Anzahl": "Fixed number",
  "Anzahl": "Number",
  "Zeigt jeden Termin — volle Tage werden in der Spalte scrollbar (Touch).": "Shows every event — busy days become scrollable in the column (touch).",
  "Automatisch füllt jeden Tag so weit, wie die Spalte hoch ist. Der Rest erscheint als Farbpunkte mit Anzahl.": "Automatic fills each day as far as the column is tall. The rest appears as coloured dots with a count.",
  "Skaliert nur die Termine im Gitter — Datum und Wochentage bleiben.": "Scales only the events in the grid — dates and weekdays stay.",
  "Meteocons durchsuchen (lokal)…": "Search Meteocons (local)…",
  "122 Icons, lokal gebündelt — funktioniert offline": "122 icons, bundled locally — works offline",
  "Farbige Wetter-Illustrationen als Kachel-Icons — UV-Index, Windstärke und Pollen sogar wertbasiert. Aus = schlichte Linien-Icons.": "Colourful weather illustrations as tile icons — UV index, wind force and pollen are even value-based. Off = plain line icons.",
  "Name (optional)": "Name (optional)",
  "Einheit (optional)": "Unit (optional)",
  "Farbe (optional)": "Colour (optional)",
  "Keine Umwelt-Daten für diesen Standort.": "No environmental data for this location.",
  "Gräser": "Grass",
  "Birke": "Birch",
  "Erle": "Alder",
  "Olive": "Olive",
  "Beifuß": "Mugwort",
  "Ambrosia": "Ragweed",
  "Gering": "Low",
  "Mäßig": "Moderate",
  "Sehr hoch": "Very high",
  "Gut": "Good",
  "Okay": "Fair",
  "Schlecht": "Poor",
  "Sehr schlecht": "Very poor",
  "Extrem": "Extreme",
  "Empfindliche": "Sensitive",
  "Ungesund": "Unhealthy",
  "Sehr ungesund": "Very unhealthy",
  "Gefährlich": "Hazardous",
  "Niedrig": "Low",
  "Mittel": "Moderate",
  "Solar": "Solar",
  "Ozon": "Ozone",
  "Breitengrad": "Latitude",
  "Längengrad": "Longitude",
  "AQI-Skala": "AQI scale",
  "Europäisch (0–100)": "European (0–100)",
  "US EPA (0–500)": "US EPA (0–500)",
  "Wind-Einheit": "Wind unit",
  "Kacheln": "Tiles",
  "Luftqualität (AQI)": "Air quality (AQI)",
  "Pollen": "Pollen",
  "Solar (W/m²)": "Solar (W/m²)",
  "Nur aktive Pollen zeigen": "Only show active pollen",
  "Automatisch": "Automatic",
  "Karten-Deckkraft": "Card opacity",
  "Hintergrund-Unschärfe": "Background blur",
  "Daten von Open-Meteo (Luftqualität, Pollen, Solar). Pollen gibt es nur für Europa.": "Data from Open-Meteo (air quality, pollen, solar). Pollen is only available for Europe.",
  "Blendet Pollenarten ohne aktuelle Belastung aus — außerhalb der Saison bleibt das Widget kompakt.": "Hides pollen types with no current load — the widget stays compact outside the season.",
  "UV und Wind zeigen dann wertbasierte Icons (UV-Index farbcodiert, Windstärke in Beaufort). Aus = klassische Lucide-Icons.": "UV and wind then show value-based icons (colour-coded UV index, wind force in Beaufort). Off = classic Lucide icons.",
  "Zeigt nachts bei klarem Himmel die tatsächliche Mondphase (Neumond bis Vollmond) statt eines generischen Monds.": "Shows the actual moon phase at night under a clear sky (new moon to full moon) instead of a generic moon.",
  "Temperatur-Einheit": "Temperature unit",
  "Celsius (°C)": "Celsius (°C)",
  "Fahrenheit (°F)": "Fahrenheit (°F)",
  "Luftfeuchte": "Humidity",
  "Wind": "Wind",
  "Weitere Zeitzonen (Worldclock)": "Additional time zones (world clock)",
  "Leer = nur die Haupt-Uhr oben wird angezeigt.": "Empty = only the main clock above is shown.",
  "Entfernen": "Remove",
  "+ Zeitzone hinzufügen": "+ Add time zone",
  "IANA-Format (z.B. Europe/Berlin, America/New_York). Label ist optional.":
    "IANA format (e.g. Europe/Berlin, America/New_York). Label is optional.",

  // ── Weather inspector ──
  "Datenquelle": "Data source",
  "Open-Meteo (global, kein Key)": "Open-Meteo (global, no key)",
  "DWD ICON (Deutscher Wetterdienst, für DE am genauesten)": "DWD ICON (German weather service, most accurate for DE)",
  "OpenWeatherMap (braucht API-Key)": "OpenWeatherMap (needs API key)",
  "Home Assistant (weather.* Entity)": "Home Assistant (weather.* entity)",
  "Globale Mix-Quelle. Default.": "Global mixed source. Default.",
  "DWD ICON-Modell über die Open-Meteo-Bridge — für Deutschland/Mitteleuropa meist näher an der tatsächlichen Wetterlage als globale Modelle.":
    "DWD ICON model via the Open-Meteo bridge — usually closer to actual conditions for Germany/Central Europe than global models.",
  "Benötigt OPENWEATHERMAP_API_KEY in der Server-Config. Kostenloses Tier: 1000 calls/Tag.":
    "Requires OPENWEATHERMAP_API_KEY in the server config. Free tier: 1000 calls/day.",
  "Liest eine weather.*-Entity inkl. Vorhersage aus deinem HA-Server. Welches Modell dort reinkommt, hängt von deiner HA-Integration ab.":
    "Reads a weather.* entity incl. forecast from your HA server. Which model feeds it depends on your HA integration.",
  "HA-Entity-ID": "HA entity ID",
  "Die Forecast-Tage kommen aus": "Forecast days come from",
  "Aktueller Ort": "Current location",
  "Ort zurücksetzen": "Reset location",
  "Anderen Ort suchen…": "Search another location…",
  "Latitude": "Latitude",
  "Longitude": "Longitude",
  "Ort-Label (über der Temperatur)": "Location label (above temperature)",
  "Schriftgröße": "Font size",
  "Größe Luftfeuchte / Wind / UV": "Humidity / wind / UV size",
  "Schriftgröße Luftfeuchte / Wind / UV": "Humidity / wind / UV font size",
  "Neue Version verfügbar": "New version available",
  "aktuell": "current",
  "Release ansehen": "View release",
  "Banner schließen": "Dismiss banner",
  "GROSSBUCHSTABEN": "UPPERCASE",
  "Normaler Abstand": "Normal spacing",
  "Weiter Abstand": "Wide spacing",
  "Sehr weiter Abstand": "Very wide spacing",
  "Temperatur": "Temperature",
  "Knoten": "Knots",
  "Ansicht (Layout)": "View (layout)",
  "Horizontal (Nebeneinander)": "Horizontal (side by side)",
  "Vertikal (Untereinander)": "Vertical (stacked)",
  "Icon Stil": "Icon style",
  "Tages-Vorhersage ausblenden": "Hide daily forecast",
  "Anzahl Vorhersage-Tage": "Number of forecast days",
  "Tage nach heute. Open-Meteo und DWD liefern bis zu 6 Tage, HA/OWM je nach Anbieter.":
    "Days after today. Open-Meteo and DWD provide up to 6 days, HA/OWM depending on provider.",
  "Sonnenauf-/untergang anzeigen": "Show sunrise/sunset",
  "Stündlichen Verlauf anzeigen": "Show hourly forecast",
  "Anzahl Stunden": "Number of hours",
  "Horizontaler Streifen unter dem Wetter. Bei HA nur verfügbar wenn deine Weather-Integration hourly-Forecasts liefert (viele tun's, manche nicht).":
    "Horizontal strip below the weather. With HA only available if your weather integration provides hourly forecasts (many do, some don’t).",
  "Luftfeuchtigkeit": "Humidity",
  "Windgeschwindigkeit": "Wind speed",
  "UV-Index": "UV index",
  "Infozeile „Fühlt sich an wie…\"": "Info line “Feels like…”",
  "Anzeigename auf Dashboard": "Display name on dashboard",

  // ── Calendar inspector ──
  "Darstellungs-Design": "Display design",
  "Uhrzeit-Format": "Time format",
  "24 Stunden": "24-hour",
  "12 Stunden (AM/PM)": "12-hour (AM/PM)",
  "Moderne Kacheln (Glassmorphism)": "Modern tiles (glassmorphism)",
  "Minimalistisch (Nur Linien)": "Minimalist (lines only)",
  "Max. Termine anzeigen": "Max. events to show",
  "Max. Termine pro Tag": "Max events per day",
  "Tage im Voraus (Zeitfenster)": "Days ahead (time window)",
  "Akzentfarbe (Hex, z.B. #FF0055)": "Accent colour (hex, e.g. #FF0055)",
  "Widget kompett ausblenden, wenn leer": "Hide widget completely when empty",
  "Leere Tage anzeigen": "Show empty days",
  "Nicht verfügbar zusammen mit 'Leere Tage anzeigen'": "Not available together with 'Show empty days'",
  "Wochentag ausblenden": "Hide weekday",
  "Hinweis: Das DWD-Modell liefert keinen UV-Index. Magic Frame ergänzt den Wert automatisch aus dem Standard-Open-Meteo-Modell — UV erscheint also trotzdem.": "Note: the DWD model does not provide a UV index. Magic Frame automatically backfills the value from the standard Open-Meteo model — so UV still shows up.",
  "via ENV": "via ENV",
  "Alternativer Wetter-Provider. Optional — der Default (Open-Meteo) braucht keinen Key. Free-Tier: 1000 Calls/Tag.": "Alternative weather provider. Optional — the default (Open-Meteo) needs no key. Free tier: 1000 calls/day.",
  "Key aus Umgebungsvariable OPENWEATHERMAP_API_KEY (read-only). UI-Override jederzeit möglich.": "Key from environment variable OPENWEATHERMAP_API_KEY (read-only). UI override possible any time.",
  "API-Key gespeichert, OWM-Provider ist nutzbar.": "API key saved, OWM provider is usable.",
  "Override setzen": "Set override",
  "Key ändern": "Change key",
  "Key wirklich entfernen?": "Really remove key?",
  "OpenWeatherMap API-Keys-Seite öffnen": "Open OpenWeatherMap API-keys page",
  "Account anlegen falls noch nicht passiert. Free-Tier reicht (1000 Calls/Tag).": "Create an account if you haven't already. Free tier is enough (1000 calls/day).",
  "Default-API-Key kopieren (oder neuen erstellen) und hier unten einfügen.": "Copy the default API key (or create a new one) and paste it below.",
  "API-Key einfügen…": "Paste API key…",
  "Nach dem Speichern dauert es ~5-10 Minuten bis OpenWeatherMap deinen neuen Key freischaltet. Bis dahin kommen 401-Fehler.": "After saving it takes ~5-10 minutes for OpenWeatherMap to activate your new key. Until then you'll see 401 errors.",
  "Key gespeichert.": "Key saved.",
  "Key entfernt.": "Key removed.",
  "Kalender-Quellen": "Calendar sources",
  "Noch kein Feed. Wähle unten einen Typ und klick hinzufügen.": "No feed yet. Pick a type below and click add.",
  "Label (z.B. Arbeit)": "Label (e.g. Work)",
  "Feed entfernen": "Remove feed",
  "iCal / Webcal": "iCal / Webcal",
  "Google-Konto": "Google account",
  "Noch kein Konto verbunden → Integrationen öffnen": "No account connected → open Integrations",
  "— Konto wählen —": "— Choose account —",
  "(unbenannt)": "(unnamed)",
  "Lade Kalender…": "Loading calendars…",
  "Fehler:": "Error:",
  "— Standard-Kalender —": "— Default calendar —",
  "— Primary —": "— Primary —",
  "Fehler beim Laden": "Error loading",

  // ── HA Entity inspector ──
  "Entity": "Entity",
  "Nach oben": "Move up",
  "Nach unten": "Move down",
  "Entity-ID (z.B. light.kitchen)": "Entity ID (e.g. light.kitchen)",
  "Sichtbarkeit abhängig von anderer Entity": "Visibility based on another entity",
  "Zeigen, wenn Entity": "Show when entity",
  "… den Status hat": "… has the state",
  "Verbergen wenn eigener Status =": "Hide when own state =",
  "Farbe": "Colour",
  "Farblogik (optional)": "Colour logic (optional)",
  "Farbe nur bei Status (leer = immer)": "Colour only on state (empty = always)",
  "Farbe anwenden auf": "Apply colour to",
  "Nur Icon (Kreis)": "Icon only (circle)",
  "Ganze Kachel (Hintergrund)": "Whole tile (background)",
  "Entity hinzufügen": "Add entity",
  "Kacheln: Theme (Hell/Dunkel)": "Tiles: theme (light/dark)",
  "Dunkel (Standard)": "Dark (default)",
  "Hell (Weißes Glas)": "Light (white glass)",
  "Hintergrund Kacheln (Deckkraft)": "Tile background (opacity)",
  "Hintergrund Kacheln (Unschärfe/Blur)": "Tile background (blur)",
  "Kacheln-Design": "Tile design",
  "Kacheln (Standard)": "Tiles (default)",
  "Minimal (nur Icons + Text)": "Minimal (icons + text only)",
  "Live-Sync (WebSocket)": "Live sync (WebSocket)",
  "Sofortige Updates via HA-WebSocket statt Polling. Empfohlen — spart Requests.":
    "Instant updates via HA WebSocket instead of polling. Recommended — saves requests.",
  "Poll-Intervall": "Poll interval",
  "Verlaufs-Graph (Sparkline) anzeigen": "Show history graph (sparkline)",
  "Zeitraum": "Time range",
  "Nur numerische Entities (Sensoren) haben einen verwertbaren Verlauf. HA's History-API muss aktiv sein.":
    "Only numeric entities (sensors) have a usable history. HA's history API must be enabled.",

  // ── HA Notification inspector ──
  "Quelle": "Source",
  "Eigene Regeln": "Custom rules",
  "HA Persistent": "HA persistent",
  "Du definierst unten Trigger-Regeln pro Entity und bekommst bei Statuswechseln einen Alert.":
    "Define trigger rules per entity below and get an alert on state changes.",
  "Zeigt automatisch alle Home-Assistant-persistent_notification-Einträge — kein Regel-Schreiben nötig.":
    "Automatically shows all Home Assistant persistent_notification entries — no rule writing needed.",
  "Abfrage-Intervall": "Poll interval",
  "Kacheln: Theme": "Tiles: theme",
  "Dunkel (Standard Black)": "Dark (default black)",
  "Max. gleichzeitige Alerts": "Max. simultaneous alerts",
  "Kacheln Deckkraft": "Tile opacity",
  "Kacheln Blur": "Tile blur",
  "Zeitformat": "Time format",
  "Automatisch (vor 5 Min.)": "Automatic (5 min ago)",
  "Nur Minuten (vor 120 min)": "Minutes only (120 min ago)",
  "Nur Stunden (vor 5 h)": "Hours only (5 h ago)",
  "Nur Tage (vor 3 Tagen)": "Days only (3 days ago)",
  "Kombiniert (vor 1d 2h 5m)": "Combined (1d 2h 5m ago)",
  "Aktive Timer unten andocken": "Dock active timers at the bottom",
  "Laufende Timer erscheinen als Notification-Karte mit Countdown, einsortiert unter den Alerts. Start via":
    "Running timers appear as a notification card with countdown, sorted below the alerts. Start via",
  "Regel": "Rule",
  "Regel löschen": "Delete rule",
  "Trigger Entity": "Trigger entity",
  "Trigger Status": "Trigger state",
  "z.b. on oder fertig": "e.g. on or done",
  "Alert Message (Anzeigetext)": "Alert message (display text)",
  "Waschmaschine ist durch!": "Washing machine is done!",
  "Dauer (Min)": "Duration (min)",
  "0 = unendlich (bis Statuswechsel)": "0 = infinite (until state change)",
  "Klick-Aktion (Wenn angetippt)": "Click action (when tapped)",
  "Keine Aktion": "No action",
  "Trigger-Entität umschalten (Toggle)": "Toggle trigger entity",
  "Andere Entität umschalten...": "Toggle another entity...",
  "Ziel-Entität (z.B. light.kitchen)": "Target entity (e.g. light.kitchen)",
  "Entität eingeben...": "Enter entity...",
  "Wann soll die Notification wieder verschwinden?": "When should the notification disappear again?",
  "Dauer abgelaufen ODER manuell quittiert": "Duration elapsed OR dismissed manually",
  "NUR wenn Zeit-Dauer abgelaufen ist (Timer)": "ONLY when the time duration has elapsed (timer)",
  "NUR durch Quittierungs-Entität (Zeit ignorieren)": "ONLY via acknowledgement entity (ignore time)",
  "Quittierung durch Entität (ID)": "Acknowledgement via entity (ID)",
  "Erwarteter Zustand": "Expected state",
  "Status wird: \"on\"": "State becomes: \"on\"",
  "Status wird: \"off\"": "State becomes: \"off\"",
  "Beliebiger Status-Wechsel": "Any state change",
  "Eigener Wert...": "Custom value...",
  "z.B. open": "e.g. open",
  "Alert droppen sobald Trigger weg ist (ohne explizites Clear)":
    "Drop alert as soon as the trigger is gone (without explicit clear)",
  "+ Neue Benachrichtigungs-Regel": "+ New notification rule",
  "Quelle: Home Assistant Persistent-Notifications": "Source: Home Assistant persistent notifications",
  "Alle persistent_notification.*-Einträge deiner HA-Instanz erscheinen hier automatisch. Das Wegwischen-X im Widget ruft auch HA's persistent_notification.dismiss auf.":
    "All persistent_notification.* entries from your HA instance appear here automatically. The dismiss × in the widget also calls HA's persistent_notification.dismiss.",

  // ── Button inspector ──
  "Design": "Design",
  "Matrix Layout": "Matrix layout",
  "Auto-Flow": "Auto flow",
  "Immer Horizontal": "Always horizontal",
  "Immer Vertikal": "Always vertical",
  "Button-Stil (Form)": "Button style (shape)",
  "Standard Quadrat / Rechteck": "Standard square / rectangle",
  "Rund (Kreis)": "Round (circle)",
  "Dezent (Nur beim Hover sichtbar)": "Subtle (only visible on hover)",
  "Ganzflächig (Füllt Raster aus)": "Full bleed (fills the grid)",
  "Icon vergrößern / verkleinern": "Enlarge / shrink icon",
  "Rahmengröße anpassen (Padding)": "Adjust frame size (padding)",
  "Glas-Deckkraft (Opacity)": "Glass opacity",
  "Glas-Milchigkeit (Blur)": "Glass frostiness (blur)",
  "Kanten abrunden (Radius)": "Round corners (radius)",
  "Anzeige Text": "Display text",
  "Kachel Leer lassen = Unsichtbar": "Leave tile empty = invisible",
  "Icon": "Icon",
  "Button": "Button",
  "z.B. lucide:power — leer = Button inaktiv": "e.g. lucide:power — empty = button inactive",
  "Kurzer Tipp": "Short tap",
  "Langer Druck (≥500 ms)": "Long press (≥500 ms)",
  "Langer Druck": "Long press",
  "Aktion": "Action",
  "Widgets umschalten (toggle)": "Toggle widgets",
  "Widgets einblenden": "Show widgets",
  "Widgets ausblenden": "Hide widgets",
  "HA-Entity toggeln": "Toggle HA entity",
  "HA-Service-Call": "HA service call",
  "Webhook (POST)": "Webhook (POST)",
  "Verlinkte Widgets": "Linked widgets",
  "Keine anderen Widgets verfügbar.": "No other widgets available.",
  "HA Entity-ID": "HA entity ID",
  "Service (domain.service)": "Service (domain.service)",
  "Beispiele:": "Examples:",
  "Service-Daten (JSON, optional)": "Service data (JSON, optional)",
  "Für Services mit Parametern, z.B.": "For services with parameters, e.g.",
  "Webhook-URL (POST)": "Webhook URL (POST)",

  // ── Companion inspectors ──
  "Max. gleichzeitig angezeigte Timer": "Max. timers shown at once",
  "Widget komplett ausblenden wenn kein Timer läuft": "Hide widget completely when no timer is running",
  "Max. Nachrichten anzeigen": "Max. messages to show",
  "Widget komplett ausblenden wenn keine Nachrichten": "Hide widget completely when no messages",
  "Eingabe-Feld ausblenden (nur lesen)": "Hide input field (read only)",
  "Titel der Liste (optional)": "List title (optional)",
  "Titelzeile ausblenden": "Hide title bar",
  "Anzahl ausblenden": "Hide count",
  "leer = Standard": "empty = default",
  "Filter auf Person (optional)": "Filter by person (optional)",
  "z.B. Emma — leer = alle": "e.g. Emma — empty = everyone",
  "Nur Todos mit diesem Assignee werden angezeigt; neue Todos werden dieser Person zugewiesen.":
    "Only to-dos with this assignee are shown; new to-dos are assigned to this person.",

  // ── Login / Setup ──
  "Anmelden": "Sign in",
  "Email": "Email",
  "Passwort": "Password",
  "Wird geprüft…": "Checking…",
  "Einloggen": "Log in",
  "Login fehlgeschlagen.": "Login failed.",
  "Netzwerkfehler. Bitte erneut versuchen.": "Network error. Please try again.",
  "Ersten Admin anlegen": "Create the first admin",
  "Einmalige Einrichtung. Du wirst danach direkt eingeloggt.":
    "One-time setup. You’ll be logged in right after.",
  "Passwort (min. 8 Zeichen)": "Password (min. 8 characters)",
  "Passwort bestätigen": "Confirm password",
  "Wird angelegt…": "Creating…",
  "Admin anlegen & einloggen": "Create admin & log in",
  "Passwörter stimmen nicht überein.": "Passwords don’t match.",
  "Passwort muss mindestens 8 Zeichen lang sein.": "Password must be at least 8 characters.",
  "Anlegen fehlgeschlagen.": "Creation failed.",

  // ── Editor home (control center) ──
  "Willkommen zurück.": "Welcome back.",
  "Alles, was deine Magic Frames rendern, steuerst du von hier aus. Wähle links einen Bereich oder spring direkt in einen View unten.": "Everything your Magic Frames render is controlled from here. Pick a section on the left or jump straight into a view below.",
  "Live-Sync": "Live sync",
  "Verbunden": "Connected",
  "Änderungen werden sofort an alle Displays gepusht.": "Changes are pushed to all displays instantly.",
  "Keine Verbindung zum Push-Server.": "No connection to the push server.",
  "Verbinde…": "Connecting…",
  "konfigurierbar": "configurable",
  "noch nichts": "nothing yet",
  "Home Assistant, Wallpaper-Quellen, Kalender.": "Home Assistant, wallpaper sources, calendar.",
  "Deine Views": "Your views",
  "Klick, um ihn zu bearbeiten.": "Click to edit.",
  "Alle anzeigen": "Show all",
  "Ersten View erstellen": "Create first view",
  "Mehr Bereiche": "More sections",
  "HA, Kalender, Todoist, Wallpaper-Quellen.": "HA, calendar, Todoist, wallpaper sources.",
  "Deine Views — klick, um zu bearbeiten.": "Your views — click to edit.",
  "System & Status": "System & status",
  "Home Assistant, Kalender, Todoist, Wallpaper-Quellen.":
    "Home Assistant, calendar, Todoist, wallpaper sources.",
  Live: "Live",
  "Live-View öffnen": "Open live view",
  "Eigene Widget-Typen hochladen + verwalten.": "Upload + manage your own widget types.",
  "Snapshots, Export & Import deiner Layouts.": "Snapshots, export & import of your layouts.",
  "README auf GitHub.": "README on GitHub.",

  // ── Inspector name field ──
  "z.B. Küche-Uhr": "e.g. kitchen clock",

  // ── New-view modal ──
  "z.B. Küche": "e.g. Kitchen",
  "Hochformat": "Portrait",
  "Querformat": "Landscape",
  "Beeinflusst das Canvas-Seitenverhältnis im Editor. Kannst du später jederzeit umstellen.": "Affects the canvas aspect ratio in the editor. You can change it any time.",

  // ── Wallpaper modal (sources, fields, options) ──
  "Unsplash (Dynamisch via Suchbegriff)": "Unsplash (dynamic via search term)",
  "Feste Bild-URL": "Fixed image URL",
  "Lokaler NAS Ordner (WebDAV)": "Local NAS folder (WebDAV)",
  "Immich API (Album)": "Immich API (album)",
  "20 mitgelieferte Bilder — kein Setup nötig. Ideal als Start für einen neuen View. Du kannst jederzeit auf eine eigene Quelle (Immich, NAS, URL) wechseln.": "20 bundled images — no setup needed. Ideal as a start for a new view. You can switch to your own source (Immich, NAS, URL) any time.",
  "Immich Instanz URL (Domain)": "Immich instance URL (domain)",
  "API-Key (Read Only)": "API key (read only)",
  "Album auswählen ({n} gefunden)": "Select album ({n} found)",
  "— Album wählen —": "— Select album —",
  "Fotos": "photos",
  "Noch keine Alben geladen. „Alben laden“ drücken — ohne eigene Zugangsdaten wird die globale Verbindung benutzt.": "No albums loaded yet. Press “Load albums” — without your own credentials the global connection is used.",
  "Beides leer lassen, um die globale Immich-Verbindung aus Einstellungen → Integrationen zu benutzen.": "Leave both empty to use the global Immich connection from Settings → Integrations.",
  "Keine Immich-Verbindung — bitte hier eintragen oder unter Einstellungen → Integrationen hinterlegen.": "No Immich connection — enter one here or set it up under Settings → Integrations.",
  "Personen": "People",
  "Position": "Position",
  "Im geteilten Modus steht die Info an jedem Bild einzeln, damit klar bleibt, wozu sie gehört.": "In split mode the info sits on each photo separately, so it stays clear what it belongs to.",
  "Lade Personen…": "Loading people…",
  "Mit Immich verbinden / Personen laden": "Connect to Immich / load people",
  "Personen auswählen ({n} gefunden)": "Select people ({n} found)",
  "Noch niemand gewählt — ohne Auswahl bleibt der Rahmen leer.": "Nobody selected yet — without a selection the frame stays empty.",
  "Zeigt jedes Foto, auf dem mindestens eine der gewählten Personen zu sehen ist.": "Shows every photo containing at least one of the selected people.",
  "Noch keine Personen geladen. Es erscheinen nur Personen, denen in Immich ein Name gegeben wurde.": "No people loaded yet. Only people you have named in Immich appear here.",
  "Keine benannten Personen gefunden — in Immich zuerst Gesichtern Namen geben.": "No named people found — name some faces in Immich first.",
  "Personen-ID (manuell)": "Person ID (manual)",
  "API-Key ungültig oder hat keine Rechte für Personen.": "API key invalid or lacking permission to read people.",
  "Keine Person gewählt — bitte im Wallpaper-Menü mindestens eine auswählen.": "No person selected — pick at least one in the wallpaper menu.",
  "Ausgewählte ID:": "Selected ID:",
  "Album ID (manuell)": "Album ID (manual)",
  "z.B. a2f...": "e.g. a2f...",
  "WebDAV Server-URL (z.B. NAS)": "WebDAV server URL (e.g. NAS)",
  "Benutzername": "Username",
  "Verbinde...": "Connecting...",
  "NAS Verbinden / Ordner wählen": "Connect NAS / choose folder",
  "Zurück": "Back",
  "Keine Unterordner": "No subfolders",
  "Bilder in diesem Ordner": "images in this folder",
  "Bilder hier kann kein Browser anzeigen (HEIC/RAW) — bitte JPG, PNG oder WebP": "images here can't be displayed by any browser (HEIC/RAW) — please use JPG, PNG or WebP",
  "Keine Bilder in diesem Ordner — bitte einen Unterordner wählen": "No images in this folder — pick a subfolder",
  "In diesem Ordner liegen keine Bilder.": "There are no images in this folder.",
  "Der eingestellte Ordner existiert auf dem Server nicht.": "The configured folder does not exist on the server.",
  "NAS nicht erreichbar.": "NAS not reachable.",
  "Suchbegriffe (komma-getrennt)": "Search terms (comma-separated)",
  "Bild-URL (https://...)": "Image URL (https://...)",
  "Crossfade (sanfte Blende)": "Crossfade (smooth fade)",
  "Ken Burns (langsamer Zoom)": "Ken Burns (slow zoom)",
  "Slide (Push von rechts)": "Slide (push from right)",
  "Hart (kein Effekt)": "Hard (no effect)",
  "Ken Burns ist effektvoll, aber auf alten TV-Browsern (Tizen) spürbar schwerer. Bei Stottern auf Crossfade oder Hart wechseln.": "Ken Burns looks great but is noticeably heavier on old TV browsers (Tizen). If it stutters, switch to crossfade or hard.",
  "Hintergrund-Balken Deckkraft": "Background bar opacity",
  "Schatten (Blur)": "Shadow (blur)",
  "Basis-Schriftart": "Base font",
  "Inter (Clean)": "Inter (clean)",
  "Courier (Retro)": "Courier (retro)",
  "Orbitron (Digital)": "Orbitron (digital)",
  "Cutive Mono (Typewriter)": "Cutive Mono (typewriter)",
  "Roboto (Android)": "Roboto (Android)",
  "Montserrat (Modern)": "Montserrat (modern)",
  "SF Pro (Apple)": "SF Pro (Apple)",
  "Playfair (Serif)": "Playfair (serif)",
  "Lato (Rund)": "Lato (round)",
  "Oswald (Kompakt)": "Oswald (compact)",
  "Outfit (Rund)": "Outfit (round)",
  "Dicke (Weight)": "Weight",
  "100 - Sehr dünn": "100 - very thin",
  "300 - Dünn (Standard)": "300 - thin (default)",
  "400 - Normal": "400 - normal",
  "500 - Medium": "500 - medium",
  "700 - Fett": "700 - bold",
  "900 - Ultra Fett": "900 - ultra bold",
  "Schriftgröße (Standard: 12px)": "Font size (default: 12px)",
  "Hinweis: Speichern Sie das Layout über den blauen Button oben rechts, damit die Wallpaper Engine auf dem Display aktualisiert wird.": "Note: save the layout via the blue button at the top right so the wallpaper engine updates on the display.",

  // ── Modules page + dev guide ──
  "Unser eigener Markt: Module im Magic-Frame-Format durchsuchen, installieren und automatisch updaten — direkt im Browser, ohne Server-Restart. Jedes Modul bringt sein eigenes module.json mit (Manifest + Bundle), aus dem Inspector & Registrierung automatisch entstehen.": "Our own market: browse, install and auto-update modules in the Magic Frame format — right in the browser, no server restart. Each module ships its own module.json (manifest + bundle) from which inspector & registration are generated automatically.",
  "Ein Modul ist ein Widget-Typ (Uhr, Wetter, …). Schreib eine": "A module is a widget type (clock, weather, …). Write a",
  "-Komponente und trag sie an 7 Stellen ein. Aufklappen für die Anleitung.": " component and register it in 7 places. Expand for the guide.",
  "Die": "The",
  "Typ-ID": "type ID",
  "ist immer der Dateiname, z.B.": "is always the file name, e.g.",
  "Größen in": "Sizes in",
  "— erbt die Editor-Schriftgröße und skaliert mit „Responsive Auto-Scale“ (cqmin).": "— inherits the editor font size and scales with “Responsive auto-scale” (cqmin).",
  "kommen vom Wrapper — nicht selbst hart setzen.": "come from the wrapper — don’t hard-set them yourself.",
  "Hintergrund/Glas regelt": "Background/glass is controlled by",
  "automatisch.": "automatically.",
  "Live-Updates via": "Live updates via",
  "+ Server-Event (siehe Timer-Widget).": "+ server event (see timer widget).",
  "Inspector mit Karten-Listen → Typ in": "Inspector with card lists → add the type to",
  "aufnehmen.": ".",
  "Minimal-Beispiel „HelloWidget“ anzeigen": "Show minimal “HelloWidget” example",
  "Vollständige Referenz inkl. Props-Contract, Live-Sync, Checkliste und dem geplanten Market-Manifest:": "Full reference incl. props contract, live sync, checklist and the planned market manifest:",
  "im Repo. Einfachstes Vorbild im Code:": "in the repo. Simplest example in code:",

  // ── Icon picker ──
  "Icon suchen (Iconify)…": "Search icon (Iconify)…",
  "Suche löschen": "Clear search",
  "Sucht…": "Searching…",

  // ── Add-widget modal (mobile) ──
  "Neues Modul wählen": "Choose a new module",
  "Uhr & Datum": "Clock & date",
  "Live Wetter": "Live weather",
  "HA Alerts": "HA alerts",
  "Aktions-Button": "Action button",

  // ── Dashboard settings modal (mobile) ──
  "Dashboard Verwalten": "Manage dashboard",
  "Sichtbar hier im Editor als Tab.": "Visible here in the editor as a tab.",
  "URL Pfad (Kürzel)": "URL path (slug)",
  "Keine Leerzeichen. Ändert auch die Abruf-URL auf dem Tablet!": "No spaces. Also changes the fetch URL on the tablet!",
  "Übernehmen": "Apply",

  // ── Integrations modal (mobile) ──
  "Globale REST API Verbindung": "Global REST API connection",
  "Home Assistant Base-URL": "Home Assistant base URL",
  "Tipp: Generieren Sie einen Token im Home Assistant Profil unter „Langlebige Zugangsdaten“.": "Tip: generate a token in your Home Assistant profile under “Long-lived access tokens”.",

  // ── Mobile editor chrome ──
  "Menü": "Menu",
  "Gespeichert & mit Displays synchronisiert.": "Saved & synced with displays.",
  "Speichern fehlgeschlagen. Sitzung evtl. abgelaufen.": "Save failed. Session may have expired.",
  "Keine Widgets auf diesem Dashboard.": "No widgets on this dashboard.",
  "Erstes Modul hinzufügen": "Add first module",
  "Modul hinzufügen": "Add module",
  "Dashboard-Einstellungen": "Dashboard settings",
  "Neues Dashboard": "New dashboard",
  "View öffnen": "Open view",
  "Desktop-Editor": "Desktop editor",
  "Fehler beim Speichern des Dashboards.": "Error saving the dashboard.",
  "Dashboard wirklich löschen? Diese Aktion löscht alle Widgets auf diesem View und kann nicht rückgängig gemacht werden.": "Really delete this dashboard? This deletes all widgets on this view and cannot be undone.",
  "Fehler beim Löschen.": "Error deleting.",
  "Modul kopiert.": "Module copied.",

  // ── iOS Companion App card ──
  "iOS Companion App": "iOS Companion App",
  "Native iOS-App für Schnellzugriff auf Timer, Nachrichten, Einkaufsliste und To-dos. Liegt parallel in einem eigenen Repo und nutzt den Companion-API-Token oben.": "Native iOS app for quick access to timers, messages, shopping list and to-dos. Lives in its own repo and uses the companion API token above.",
  "Bis die App im App Store ist, funktioniert die gleiche API bereits über iOS-Shortcuts, Android-Tasker oder curl.": "Until the app is in the App Store, the same API already works via iOS Shortcuts, Android Tasker or curl.",
  "Timer starten/stoppen vom Sperrbildschirm": "Start/stop timers from the lock screen",
  "Nachrichten an einzelne Displays pushen": "Push messages to individual displays",
  "Einkaufsliste & To-dos synchron — auch via Home Assistant Lists (siehe unten)": "Shopping list & to-dos in sync — also via Home Assistant Lists (see below)",
  "Live-Status der verbundenen Displays": "Live status of connected displays",

  // ── HA Lists card ──
  "Home Assistant Lists": "Home Assistant Lists",
  "Nutzt Listen aus deinem Home Assistant (Domain todo.*) als Quelle für Einkaufsliste- und To-do-Widgets. Im Widget-Inspector wählst du dann pro Widget die Quelle.": "Uses lists from your Home Assistant (todo.* domain) as a source for shopping list and to-do widgets. Choose the source per widget in the widget inspector.",
  "Listen aktualisieren": "Refresh lists",
  "Liste": "list",
  "Listen": "lists",
  "gefunden": "found",
  "Keine todo.* Entities in Home Assistant gefunden. Prüfe ob die HA-Verbindung in Integrationen aktiv ist und ob mindestens eine Todo-Liste/Einkaufsliste in HA existiert.": "No todo.* entities found in Home Assistant. Check that the HA connection in Integrations is active and that at least one to-do/shopping list exists in HA.",
  "Eintrag": "item",
  "Einträge": "items",

  // ── DDNS card ──
  "Dynamic DNS (DDNS)": "Dynamic DNS (DDNS)",
  "Hält deinen DNS-A-Record automatisch auf deiner aktuellen öffentlichen IP. Cloudflare wird zuerst unterstützt — der Container prüft alle paar Minuten und updated bei Änderung.": "Keeps your DNS A record automatically pointed at your current public IP. Cloudflare is supported first — the container checks every few minutes and updates on change.",
  "Konfiguration gespeichert.": "Configuration saved.",
  "Update fehlgeschlagen.": "Update failed.",
  "DNS-Record aktualisiert.": "DNS record updated.",
  "Keine Änderung — IP ist gleich.": "No change — IP is the same.",
  "aktiv": "active",
  "unvollständig": "incomplete",
  "Aktuelle IP": "Current IP",
  "DNS-Record": "DNS record",
  "Letzter Check": "Last check",
  "Letzter Fehler:": "Last error:",
  "DDNS aktiv (Background-Update alle X Minuten)": "DDNS active (background update every X minutes)",
  "Intervall (Minuten)": "Interval (minutes)",
  "API-Token": "API token",
  "Zone:Read + DNS:Edit": "Zone:Read + DNS:Edit",
  "Zone (Domain)": "Zone (domain)",
  "Record-Name (FQDN)": "Record name (FQDN)",
  "Jetzt aktualisieren": "Update now",
  optional: "optional",

  // 2FA
  "Zwei-Faktor-Authentifizierung (TOTP)": "Two-factor authentication (TOTP)",
  "Zwei-Faktor-Code": "Two-factor code",
  "Zusätzlicher 6-stelliger Code aus deiner Authenticator-App (Google Authenticator, 1Password, Authy, …) beim Login. Recovery-Codes als Fallback wenn das Telefon weg ist.":
    "Additional 6-digit code from your authenticator app (Google Authenticator, 1Password, Authy, …) on login. Recovery codes as fallback if your phone is gone.",
  "2FA einrichten": "Set up 2FA",
  "Scanne den QR-Code mit deiner Authenticator-App und gib dann den 6-stelligen Code aus der App ein.":
    "Scan the QR code with your authenticator app and then enter the 6-digit code from the app.",
  "Oder Secret manuell eingeben:": "Or enter secret manually:",
  "Bestätigen + aktivieren": "Confirm + activate",
  "2FA aktiviert. Recovery-Codes jetzt sichern!": "2FA activated. Save recovery codes now!",
  "Bitte Passwort eingeben.": "Please enter your password.",
  "2FA deaktiviert.": "2FA deactivated.",
  "Neue Recovery-Codes erzeugen (alte werden ungültig)":
    "Generate new recovery codes (old ones become invalid)",
  "Neu erzeugen": "Regenerate",
  "2FA deaktivieren": "Deactivate 2FA",
  Deaktivieren: "Deactivate",
  "Recovery-Codes — JETZT sichern. Werden nur dieses eine Mal angezeigt.":
    "Recovery codes — save NOW. Shown only this one time.",
  "In Zwischenablage kopiert.": "Copied to clipboard.",
  "Ich habe sie gesichert": "I saved them",
  "Neue Recovery-Codes erzeugt. Alte sind nicht mehr gültig.":
    "New recovery codes generated. Old ones are no longer valid.",
  "2FA ist aktiv.": "2FA is active.",
  "Verbleibende Recovery-Codes: ": "Remaining recovery codes: ",
  "Keine Recovery-Codes mehr — bitte neu erzeugen.":
    "No recovery codes left — please regenerate.",
  "6-stelliger Code aus deiner Authenticator-App":
    "6-digit code from your authenticator app",
  "Recovery-Code eingeben": "Enter recovery code",
  "Recovery-Code": "Recovery code",
  Code: "Code",
  Bestätigen: "Confirm",
  "Recovery-Code verwenden": "Use recovery code",
  "← Zurück zum Code": "← Back to code",

  // Login-Sicherheit
  "Login-Sicherheit (Brute-Force-Schutz)": "Login security (brute-force protection)",
  "Sperrt IP-Adressen und Konten nach zu vielen fehlgeschlagenen Login-Versuchen. Wirkt wie fail2ban, läuft aber direkt in der App — auch hinter Reverse-Proxy zuverlässig.":
    "Locks IPs and accounts after too many failed login attempts. Works like fail2ban, but runs in-app — reliable behind a reverse proxy too.",
  "Aktive Sperren": "Active lockouts",
  noch: "still",
  min: "min",
  Freigeben: "Release",
  "IP — max. Fehler": "IP — max failures",
  "IP — Fenster (min)": "IP — window (min)",
  "IP — Sperre (min)": "IP — lockout (min)",
  "Konto — max. Fehler": "Account — max failures",
  "Konto — Fenster (min)": "Account — window (min)",
  "Konto — Sperre (min)": "Account — lockout (min)",
  "Sicherheitseinstellungen gespeichert.": "Security settings saved.",
  "Sperre wirklich aufheben?": "Really release this lockout?",
  "Sperre aufgehoben.": "Lockout released.",
  "Aufheben fehlgeschlagen.": "Release failed.",
  "Letzte Login-Versuche": "Recent login attempts",
  Zeit: "Time",
  Ergebnis: "Result",

  // Caddy / HTTPS
  "HTTPS (Caddy Reverse-Proxy)": "HTTPS (Caddy reverse proxy)",
  "Caddy steht vor der App, macht Reverse-Proxy + automatisches HTTPS via Let's Encrypt. DNS-01 nutzt deinen DDNS-API-Token — kein zusätzlicher Token nötig.":
    "Caddy sits in front of the app, doing reverse proxy + automatic HTTPS via Let's Encrypt. DNS-01 reuses your DDNS API token — no extra token needed.",
  "TLS aktiv": "TLS active",
  "HTTP-Proxy": "HTTP proxy",
  "nicht erreichbar": "unreachable",
  Domain: "Domain",
  Modus: "Mode",
  "Letzter Reload": "Last reload",
  "HTTPS aktivieren (Caddy holt Let's-Encrypt-Cert für die Domain)":
    "Enable HTTPS (Caddy obtains a Let's Encrypt cert for the domain)",
  "Domain (FQDN)": "Domain (FQDN)",
  "Zusätzliche Domains (optional)": "Additional domains (optional)",
  Hinzufügen: "Add",
  "ACME-Email (Let's Encrypt)": "ACME email (Let's Encrypt)",
  "Challenge-Modus": "Challenge mode",
  "DNS-01 (nutzt DDNS-Token)": "DNS-01 (uses DDNS token)",
  "HTTP-01 (Port 80 muss offen sein)": "HTTP-01 (port 80 must be open)",
  "DNS-Provider (für DNS-01)": "DNS provider (for DNS-01)",
  "Nutzt den API-Token, den du oben in den DDNS-Einstellungen für diesen Provider gesetzt hast.":
    "Uses the API token you set above in the DDNS settings for that provider.",
  "HTTP → HTTPS Redirect (empfohlen)": "HTTP → HTTPS redirect (recommended)",
  "Speichern + Reload": "Save + reload",
  "Nur Reload": "Reload only",
  "Caddyfile ausblenden": "Hide Caddyfile",
  "Caddyfile anzeigen": "Show Caddyfile",
  "Caddy reloaded. Wenn Domain neu: Cert wird im Hintergrund geholt (ein paar Sekunden).":
    "Caddy reloaded. New domain → cert fetched in background (a few seconds).",
  "Caddy reloaded.": "Caddy reloaded.",

  // Settings-Sub-Nav
  Allgemein: "General",
  Konto: "Account",
  Sicherheit: "Security",
  "Hosting & Netzwerk": "Hosting & network",
  System: "System",
  "Konto, Sicherheit, Hosting, Integrationen und Diagnostik — gruppiert nach Bereich.":
    "Account, security, hosting, integrations and diagnostics — grouped by area.",
  "Sprache und Editor-Grundeinstellungen.": "Language and editor basics.",
  "Passwort und Zwei-Faktor-Authentifizierung für dein eigenes Konto.":
    "Password and two-factor authentication for your own account.",
  "Brute-Force-Schutz und aktive Sessions.":
    "Brute-force protection and active sessions.",
  "Weitere Editor-Nutzer einladen und verwalten.":
    "Invite and manage additional editor users.",
  "Öffentliche Erreichbarkeit (DDNS) und automatisches HTTPS (Caddy).":
    "Public reachability (DDNS) and automatic HTTPS (Caddy).",
  "Shortcut-Token, iOS-Companion, Home Assistant Listen.":
    "Shortcut token, iOS companion, Home Assistant lists.",
  "Geräte & Apps": "Devices & apps",
  "Shortcut-Token und iOS-Companion-App für dieses Dashboard. Externe Service-Verknüpfungen wie HA oder Todoist liegen unter Integrationen.":
    "Shortcut token and iOS companion app for this dashboard. External service links like HA or Todoist live under Integrations.",
  "Externe Service-Verknüpfungen": "External service links",
  "Home Assistant, Kalender-Konten (Google/Microsoft), Home-Assistant-Listen und Todoist findest du jetzt unter":
    "Home Assistant, calendar accounts (Google/Microsoft), Home Assistant lists and Todoist now live under",
  "Home Assistant Listen": "Home Assistant lists",
  "Listen aus deinem Home Assistant (Domain todo.*) als Quelle für Einkaufslisten- und Todos-Widgets. Im Widget-Inspector wählst du dann pro Widget die Quelle.":
    "Lists from your Home Assistant (domain todo.*) as a source for shopping and todo widgets. Pick the source per widget in the inspector.",
  "Keine todo.* Entities in Home Assistant gefunden. Prüfe ob die HA-Verbindung oben aktiv ist und ob mindestens eine Todo-Liste/Einkaufsliste in HA existiert.":
    "No todo.* entities found in Home Assistant. Check that the HA connection above is active and that at least one todo/shopping list exists in HA.",
  "Deine Todoist-Projekte als Quelle für Todos- und Einkaufslisten-Widgets — der Token aus deinem Todoist-Konto reicht.":
    "Your Todoist projects as a source for todo + shopping widgets — the token from your Todoist account is all you need.",
  "Todoist Developer-Settings öffnen": "Open Todoist developer settings",
  "Loggt dich in Todoist ein (falls noch nicht passiert) und öffnet die Integrationen-Seite.":
    "Logs you into Todoist (if not yet) and opens the integrations page.",
  "Unter „API-Token\" auf „Token kopieren\" klicken.":
    "Under 'API token' click 'Copy token'.",
  "Hier einfügen + Speichern.": "Paste here + save.",
  "(OAuth-Anmeldung wäre mehr Setup-Aufwand für gleich viel Nutzen — Token ist 1-Klick.)":
    "(OAuth login would be more setup for the same benefit — token is 1-click.)",
  "aus deinem Todoist-Konto verfügbar.": "from your Todoist account available.",
  "Server-Status, Version und Diagnostik.":
    "Server status, version and diagnostics.",

  // Caddy generischer
  "Caddy steht vor der App, macht Reverse-Proxy + automatisches HTTPS via Let's Encrypt. 10 DNS-Provider sind integriert (Cloudflare/Hetzner/Route53/DigitalOcean/DuckDNS/Porkbun/Namecheap/IONOS/Netcup/Linode), für alles andere: Custom-Caddyfile-Modus.":
    "Caddy sits in front of the app for reverse proxy + automatic HTTPS via Let's Encrypt. 10 DNS providers built in (Cloudflare/Hetzner/Route53/DigitalOcean/DuckDNS/Porkbun/Namecheap/IONOS/Netcup/Linode), anything else: custom Caddyfile mode.",
  Konfiguriert: "Configured",
  "Custom-Caddyfile": "Custom Caddyfile",
  "Eigenes Caddyfile (Power-User)": "Custom Caddyfile (power user)",
  "Wird beim Speichern direkt an Caddy übergeben (atomares Validate + Load). Bei Syntaxfehler bleibt die alte Config aktiv.":
    "Passed directly to Caddy on save (atomic validate + load). On syntax error the previous config stays active.",
  "DNS-01 (Wildcards + Port 80 darf zu sein)":
    "DNS-01 (wildcards + port 80 may be closed)",
  "Token wird automatisch aus den DDNS-Einstellungen übernommen wenn dort konfiguriert.":
    "Token auto-filled from the DDNS settings if configured there.",

  // Todoist
  "Konnte Todoist-Projekte nicht laden.": "Could not load Todoist projects.",
  "— Projekt wählen —": "— pick a project —",
  "Aufgaben werden direkt via Todoist-REST-API gelesen + geschrieben. Token in Integrationen → Todoist setzen.":
    "Tasks are read + written directly via Todoist's REST API. Set the token in Integrations → Todoist.",
  "Token aktiv. ": "Token active. ",
  Projekt: "project",
  Projekte: "projects",
  "Token gespeichert, aber Verbindung fehlgeschlagen.":
    "Token saved but connection failed.",
  "Token ändern": "Change token",
  "Token wirklich entfernen?": "Really remove token?",
  "Todoist API-Token": "Todoist API token",
  "In der Todoist-App: Einstellungen → Integrationen → Entwickler → API-Token kopieren.":
    "In Todoist: Settings → Integrations → Developer → copy API token.",
  "Speichern + Verbinden": "Save + connect",
  "Token gespeichert + verifiziert.": "Token saved + verified.",
  "Token entfernt.": "Token removed.",

  // ── HA source selector (Shopping/Todos inspector) ──
  "Konnte HA-Listen nicht laden.": "Could not load HA lists.",
  "Lokal": "Local",
  "— Liste wählen —": "— Select list —",
  "Items werden direkt aus dem todo.* Entity gelesen/geschrieben.": "Items are read/written directly from the todo.* entity.",

  // ─────────────────────────────────────────────────────────────────────────
  // v1.0.2 — i18n sweep: gaps closed across editor pages, inspectors, widgets,
  // shared components, integrations, settings, login/setup.
  // ─────────────────────────────────────────────────────────────────────────

  // Editor home / status strip
  "HTTPS": "HTTPS",
  "TLS": "TLS",
  "HTTP": "HTTP",
  "DDNS": "DDNS",
  "Todoist": "Todoist",
  "Lockouts": "Lockouts",
  "Caddy: TLS aktiv für": "Caddy: TLS active for",
  "Caddy läuft als HTTP-Proxy — keine TLS-Domain konfiguriert": "Caddy is running as HTTP proxy — no TLS domain configured",
  "DDNS nicht konfiguriert": "DDNS not configured",
  "aktive Login-Sperren — bitte prüfen": "active login lockouts — please review",
  "OK": "OK",
  "Offline": "Offline",
  "Docs": "Docs",

  // Login / setup
  "Magic Frame Editor": "Magic Frame Editor",
  "TOTP-Verifikation fehlgeschlagen.": "TOTP verification failed.",

  // Settings — Shortcut token, Todoist hint, DDNS hint, 2FA, sessions, mobile
  "Dein persönlicher API-Key für externe Clients (iOS-Shortcuts, Android-Tasker, curl, die kommende Companion-App).":
    "Your personal API key for external clients (iOS Shortcuts, Android Tasker, curl, the upcoming companion app).",
  "Neuen Shortcut-Token erzeugen? Alle bestehenden Shortcuts müssen aktualisiert werden.":
    "Generate a new shortcut token? All existing shortcuts will need to be updated.",
  "Neuen Token erzeugen": "Generate new token",
  "Rotate": "Rotate",
  "Alle Endpoints, Socket-Events und Beispiele:": "All endpoints, socket events and examples:",
  "(im Repo).": "(in the repo).",
  "Beispiel:": "Example:",
  "Nutze deine Todoist-Projekte als Quelle für Todos- und Einkaufslisten-Widgets. Setze einen API-Token (Todoist → Einstellungen → Integrationen → Entwickler → API-Token), danach erscheint Todoist im Quelle-Dropdown der Widgets.":
    "Use your Todoist projects as a source for to-do and shopping-list widgets. Set an API token (Todoist → Settings → Integrations → Developer → API token), then Todoist appears in the source dropdown of the widgets.",
  "Hält deinen DNS-A-Record automatisch auf der aktuellen öffentlichen IP. Cloudflare, Hetzner DNS und alle DynDNS-v2-kompatiblen Dienste (Strato, No-IP, DuckDNS, IONOS …) werden unterstützt.":
    "Keeps your DNS A record automatically pointed at your current public IP. Cloudflare, Hetzner DNS and all DynDNS-v2-compatible services (Strato, No-IP, DuckDNS, IONOS …) are supported.",
  "Setup fehlgeschlagen.": "Setup failed.",
  "Code ungültig.": "Invalid code.",
  "Deaktivieren fehlgeschlagen.": "Deactivation failed.",
  "Regenerierung fehlgeschlagen.": "Regeneration failed.",
  "2FA QR": "2FA QR",
  "Reload fehlgeschlagen.": "Reload failed.",
  "Nur-Ansehen": "View-only",
  "(du)": "(you)",
  "Alle Geräte abmelden / Secret rotieren:": "Sign out everywhere / rotate secret:",
  "Das Session-Secret ist bewusst nur per Umgebungsvariable":
    "The session secret is intentionally only settable via environment variable",
  "(≥ 32 Zeichen) setzbar — ein Rotieren per Klick wäre ein Sicherheitsrisiko. Beim Ändern + Redeploy werden alle bestehenden Sessions automatisch ungültig (alte Cookies sind nicht mehr entschlüsselbar). Gleiches gilt für":
    "(≥ 32 characters) — rotating it via a click would be a security risk. Changing it + redeploying invalidates all existing sessions automatically (old cookies are no longer decryptable). The same applies to",
  "(erzwingt HTTPS-only-Cookies).": "(forces HTTPS-only cookies).",
  "email@beispiel.de": "email@example.com",
  "wirklich löschen?": "really delete?",
  "View 1": "View 1",

  // Integrations — calendar accounts, OAuth credentials, errors
  "schließen": "close",
  "kein E-Mail ermittelbar": "no email available",
  "Konto wirklich trennen? Alle Feeds, die dieses Konto nutzen, werden ungültig.":
    "Really disconnect this account? All feeds using it will be invalidated.",
  "Microsoft-Konto": "Microsoft account",
  "erfolgreich verbunden.": "successfully connected.",
  "Provider ist serverseitig nicht konfiguriert (GOOGLE_CLIENT_ID / MS_CLIENT_ID fehlt in .env).":
    "Provider is not configured on the server (GOOGLE_CLIENT_ID / MS_CLIENT_ID missing in .env).",
  "Autorisierung abgebrochen — kein Code vom Anbieter.":
    "Authorization cancelled — no code from the provider.",
  "State-Parameter ungültig (Session oder CSRF-Check fehlgeschlagen).":
    "Invalid state parameter (session or CSRF check failed).",
  "Token-Tausch fehlgeschlagen — Redirect-URI oder Secret falsch?":
    "Token exchange failed — wrong redirect URI or secret?",
  "Unbekannter Fehler bei der Verknüpfung.": "Unknown error during linking.",
  "Zugangsdaten gespeichert. Die Verbinden-Buttons sind jetzt aktiv.":
    "Credentials saved. The Connect buttons are now active.",
  "Gespeicherte OAuth-Zugangsdaten löschen?": "Delete saved OAuth credentials?",
  "Client-ID (…apps.googleusercontent.com)": "Client ID (…apps.googleusercontent.com)",
  "Secret gesetzt — leer = unverändert": "Secret set — empty = unchanged",
  "Client-Secret": "Client secret",
  "Application (Client) ID": "Application (client) ID",
  "Client-Secret (Value)": "Client secret (value)",
  "Aktuell aus .env (env hat Vorrang, falls hier leer).":
    "Currently from .env (env wins if this field is empty).",
  "Einmalig eine OAuth-App bei Google Cloud bzw. Microsoft Entra anlegen, dann Client-ID + Secret hier eintragen — danach läuft das Verbinden per Klick & Zustimmung. Trage bei der App-Registrierung diese Redirect-URIs ein:":
    "Create an OAuth app once in Google Cloud or Microsoft Entra, then enter Client ID + secret here — afterwards connecting works with a click and a consent screen. Add these redirect URIs in the app registration:",
  "Zurücksetzen": "Reset",
  "Speichern fehlgeschlagen.": "Save failed.",

  // Modules / Backups / Views pages
  "Diese Widget-Typen stehen dir zur Verfügung. Eigene Custom-Module kannst du unten direkt als JS-Bundle hochladen — Hot-Loading, kein Container-Restart nötig.":
    "These widget types are available. You can upload your own custom modules as a JS bundle below — hot-loaded, no container restart needed.",
  "Custom-Module": "Custom modules",
  "Hochgeladen + sofort aktiv im View-Editor. Build aus deinem Modul-Source mit":
    "Uploaded + instantly active in the view editor. Build from your module source with",
  "— Doku in": "— docs in",
  "Konnte Datei nicht lesen.": "Could not read file.",
  "Bitte module.json UND bundle.js auswählen.": "Please pick both module.json AND bundle.js.",
  "module.json ist kein valides JSON.": "module.json is not valid JSON.",
  "Upload fehlgeschlagen.": "Upload failed.",
  "Modul '{x}' hochgeladen ({y} Bytes). Im View-Editor verfügbar.":
    "Module '{x}' uploaded ({y} bytes). Available in the view editor.",
  "Lade hoch…": "Uploading…",
  "Hochladen": "Upload",
  "Noch keine Custom-Module hochgeladen. Beispiel:": "No custom modules uploaded yet. Example:",
  "Modul '{x}' wirklich löschen? Views die es nutzen brechen.":
    "Really delete module '{x}'? Views that use it will break.",
  "Gelöscht.": "Deleted.",
  "Felder": "fields",
  "Bytes": "bytes",
  "hochgeladen": "uploaded",
  "Aktivieren": "Enable",
  "Manifest": "Manifest",
  "Konnte nicht angelegt werden.": "Could not be created.",
  "Netzwerkfehler.": "Network error.",
  "View „{name}“ wirklich löschen? Alle Widgets dieses Views gehen verloren.":
    "Really delete view “{name}”? All widgets in this view will be lost.",
  "URL-Pfad": "URL path",
  "Keine Leerzeichen. Wird die URL auf dem Display.":
    "No spaces. Becomes the URL on the display.",
  "Anlegen & öffnen": "Create & open",
  "Details:": "Details:",
  "Speichern fehlgeschlagen": "Save failed",
  "unbekannt": "unknown",
  "Netzwerkfehler beim Speichern. Details in der Konsole.":
    "Network error while saving. Details in the console.",
  "Metadaten Platzhalter": "Metadata placeholder",
  "07. Juli 2025": "07 July 2025",
  "München": "Munich",
  "Shot on iPhone": "Shot on iPhone",

  // Shared editor components — IconPicker, IntegrationsModal
  "Keine Treffer für": "No matches for",
  "Schnellauswahl": "Quick picks",
  "Long-Lived Access Token": "Long-lived access token",

  // Inspectors — Calendar / Button / HA / HA-Notification / Companion
  "iCal-Kalender": "iCal calendar",
  "Noch kein Google-Konto verbunden → Integrationen öffnen":
    "No Google account connected → open Integrations",
  "Noch kein Microsoft-Konto verbunden → Integrationen öffnen":
    "No Microsoft account connected → open Integrations",
  "script.good_night  oder  light.turn_on": "script.good_night  or  light.turn_on",
  "Btn": "Btn",
  "z.B. switch.washer": "e.g. switch.washer",
  "z.B. on": "e.g. on",
  "z.B. off oder idle": "e.g. off or idle",
  "z.B. binary_sensor.door": "e.g. binary_sensor.door",
  "Timer werden per API/Shortcut gestartet.": "Timers are started via API/Shortcut.",
  "Nachrichten per API:": "Messages via API:",
  "Gemeinsame Familien-Einkaufsliste. Abhaken auf dem Board syncet live auf Phone und andere Displays. Artikel per Shortcut:":
    "Shared family shopping list. Ticking items off on the board syncs live to phone and other displays. Add items via Shortcut:",
  "Todos per Shortcut:": "To-dos via Shortcut:",
  "Modul '{x}' nicht gefunden. Eventuell wurde es gelöscht oder deaktiviert.":
    "Module '{x}' not found. It may have been deleted or disabled.",
  "Dieses Modul hat keine konfigurierbaren Felder.":
    "This module has no configurable fields.",

  // Live widgets — HA notifications, Wallpaper Engine
  "Bitte Notification-Regeln im Editor konfigurieren":
    "Please configure notification rules in the editor",
  "Thema": "Topic",
  "Aufgenommen mit": "Shot on",

  // ─────────────────────────────────────────────────────────────────────────
  // v1.0.2 — final i18n sweep, exhaustive pass
  // Adds: API error parallels, settings Stat labels/values, DDNS provider
  // metadata, banner-flow strings, OWM-credentials route messages, lockout
  // error templates, calendar-account OAuth errors, misc UI gaps surfaced
  // by the final audit.
  // ─────────────────────────────────────────────────────────────────────────

  // — Live-view runtime errors (HA, EventSource) —
  "EventSource nicht verfügbar": "EventSource not available",

  // — Runtime template errors (DDNS providers, custom modules) —
  "Update-URL fehlt.": "Update URL missing.",
  "Update-URL muss den Platzhalter {ip} enthalten.":
    "Update URL must contain the {ip} placeholder.",

  // — Module dev guide (STEPS.what strings on /editor/modules) —
  "Die React-Komponente. \"use client\", Props { config, dashboardId? }, Größen in em.":
    "The React component. \"use client\", props { config, dashboardId? }, sizes in em.",
  "Live-Registry: import + eine Zeile in renderWidgetContent (rendert auf dem Display).":
    "Live registry: import + one line in renderWidgetContent (renders on the display).",
  "Editor-Katalog: WIDGET_CATALOG, WIDGET_ACCENT, widgetIconFor, addWidget.":
    "Editor catalog: WIDGET_CATALOG, WIDGET_ACCENT, widgetIconFor, addWidget.",
  "Config + Union-Mitglied (z.literal). PFLICHT — ohne Schema schlägt das Speichern fehl!":
    "Config + union member (z.literal). REQUIRED — without a schema, saving fails!",
  "Einstellungen rechts + Routing in InspectorPanel.tsx (ContentTab).":
    "Settings on the right + routing in InspectorPanel.tsx (ContentTab).",
  "WIDGET_META — Farbe + Icon im Views-Listen-Thumbnail (optional).":
    "WIDGET_META — colour + icon in the views-list thumbnail (optional).",
  "INSTALLED-Liste — damit das Modul hier als „Installiert\" auftaucht (optional).":
    "INSTALLED list — so the module shows up here as “Installed” (optional).",

  // — Generic Stat values + labels (Server / Session cards) —
  "Node": "Node",
  "SameSite": "SameSite",
  "HttpOnly": "HttpOnly",
  "Status": "Status",
  "Last (1m)": "Load (1m)",
  // "Sicherheit" already declared earlier as shorthand-key
  "Layout": "Layout",
  "Custom": "Custom",
  "ja": "yes",
  "nein": "no",

  // — Confirms / banners / status —
  "Auf diesem Gerät abmelden?": "Sign out on this device?",
  "Gespeichert.": "Saved.",
  "Token aktiv.": "Token active.",
  "Verbleibende Recovery-Codes:": "Remaining recovery codes:",

  // — API errors (auth / setup / 2FA / login / users / password) —
  // These are returned by /api/* routes and rendered through t() at display sites.
  "Interner Fehler.": "Internal error.",
  "Setup bereits abgeschlossen — bitte einloggen.":
    "Setup already complete — please sign in.",
  "Ungültige Email-Adresse.": "Invalid email address.",
  "Ungültige E-Mail.": "Invalid email.",
  "Email und Passwort erforderlich.": "Email and password are required.",
  "E-Mail und Passwort erforderlich.": "Email and password are required.",
  // "Passwort muss mindestens 8 Zeichen lang sein." already declared earlier
  "Passwort muss mindestens 8 Zeichen haben.": "Password must be at least 8 characters.",
  "Aktuelles und neues Passwort erforderlich.":
    "Current and new password are required.",
  // "Neues Passwort muss mindestens 8 Zeichen haben." already declared earlier
  "Neues Passwort muss sich vom aktuellen unterscheiden.":
    "New password must differ from the current one.",
  "Aktuelles Passwort ist falsch.": "Current password is incorrect.",
  "Email oder Passwort falsch.": "Email or password incorrect.",
  "Diese E-Mail ist bereits vergeben.": "This email is already taken.",
  "Nutzer nicht gefunden.": "User not found.",
  "User nicht gefunden.": "User not found.",
  "Nur Admins dürfen Nutzer anlegen.": "Only admins can create users.",
  "Nur Admins dürfen Nutzer löschen.": "Only admins can delete users.",
  "Nur Admins dürfen API-Keys setzen.": "Only admins can set API keys.",
  "Nur Admins dürfen OAuth-Zugangsdaten setzen.":
    "Only admins can set OAuth credentials.",
  "Nur Admins.": "Admins only.",
  "Du kannst dich nicht selbst löschen.": "You can't delete yourself.",
  "Der letzte Admin kann nicht gelöscht werden.":
    "The last admin can't be deleted.",
  "Passwort falsch.": "Wrong password.",
  "2FA ist nicht aktiv.": "2FA is not active.",
  "2FA ist bereits aktiv.": "2FA is already active.",
  "2FA ist aktiv — bitte /disable verwenden.":
    "2FA is active — please use /disable.",
  "Bitte zuerst GET aufrufen, um ein Secret zu erzeugen.":
    "Please call GET first to generate a secret.",
  "Code ungültig — bitte aktuellen Code aus der Authenticator-App eingeben.":
    "Invalid code — please enter the current code from your authenticator app.",
  "Keine offene 2FA-Challenge.": "No open 2FA challenge.",
  "2FA-Challenge abgelaufen — bitte neu einloggen.":
    "2FA challenge expired — please sign in again.",
  "Bitte neu einloggen.": "Please sign in again.",
  "Recovery-Code ungültig.": "Recovery code invalid.",
  "TOTP-Code ungültig.": "TOTP code invalid.",
  "Snapshot nicht gefunden.": "Snapshot not found.",
  "Wiederherstellen fehlgeschlagen.": "Restore failed.",
  "Token wurde nicht akzeptiert (401). Bitte API-Token in Todoist neu erzeugen.":
    "Token was not accepted (401). Please regenerate the API token in Todoist.",
  "Google Client-ID fehlt — bitte unter Integrationen eintragen.":
    "Google Client ID missing — please add it under Integrations.",
  "Microsoft Client-ID fehlt — bitte unter Integrationen eintragen.":
    "Microsoft Client ID missing — please add it under Integrations.",
  "ungültiges dueDate (ISO 8601)": "invalid dueDate (ISO 8601)",
  "ungültiges dueDate": "invalid dueDate",

  // — Lockout error formats (templated) —
  // The exact strings are templated at the API; we register the static parts here
  // so plain `t()` finds them even though templates won't match exactly.
  "Zu viele Fehlversuche für dieses Konto": "Too many failed attempts for this account",
  "IP gesperrt. Bitte in {duration} erneut versuchen.":
    "IP locked. Please try again in {duration}.",
  "Konto gesperrt. Bitte in {duration} erneut versuchen.":
    "Account locked. Please try again in {duration}.",

  // — Immich albums API —
  "Immich-URL und API-Key sind erforderlich.":
    "Immich URL and API key are required.",
  "API-Key ungültig oder hat keine Album-Leserechte.":
    "API key invalid or has no album read permissions.",
  "Zeitüberschreitung — ist die Immich-URL korrekt und im selben Netz erreichbar?":
    "Timeout — is the Immich URL correct and reachable on the same network?",
  "Konnte Immich nicht erreichen. URL korrekt? (z.B. http://192.168.x.x:2283)":
    "Could not reach Immich. URL correct? (e.g. http://192.168.x.x:2283)",
  "(ohne Name)": "(no name)",

  // — DDNS providers (label / description / field labels / help / placeholder) —
  "Cloudflare": "Cloudflare",
  "Cloudflare DNS via API-Token (Zone:Read + DNS:Edit). Update via offizielle Cloudflare-API.":
    "Cloudflare DNS via API token (Zone:Read + DNS:Edit). Update via the official Cloudflare API.",
  "Token braucht Zone:Read + DNS:Edit für die Zone.":
    "Token needs Zone:Read + DNS:Edit for the zone.",
  "Hetzner DNS": "Hetzner DNS",
  "Hetzner DNS via Auth-API-Token (in der Hetzner-DNS-Konsole erstellbar).":
    "Hetzner DNS via Auth API token (create one in the Hetzner DNS console).",
  "Auth-API-Token": "Auth API token",
  "DNS-Console → Access Tokens → neuer Token.":
    "DNS console → Access Tokens → new token.",
  "Record-Name (FQDN oder Sub)": "Record name (FQDN or sub)",
  "FQDN oder Sub-Name relativ zur Zone. „@\" = Apex.":
    "FQDN or sub-name relative to the zone. “@” = apex.",
  "Generisch (URL / DynDNS v2)": "Generic (URL / DynDNS v2)",
  "Universell für Strato, No-IP, DuckDNS, All-Inkl, IONOS, Selfhost.de & alle DynDNS-v2-kompatiblen Dienste. URL mit {ip}-Platzhalter.":
    "Universal for Strato, No-IP, DuckDNS, All-Inkl, IONOS, Selfhost.de & all DynDNS-v2-compatible services. URL with {ip} placeholder.",
  "Update-URL": "Update URL",
  "Platzhalter {ip} wird durch die aktuelle öffentliche IP ersetzt. Basic-Auth direkt in der URL möglich.":
    "The {ip} placeholder is replaced with the current public IP. Basic-Auth directly in the URL is allowed.",
  "Erfolg-Marker (optional)": "Success marker (optional)",
  "Substring in der Antwort, der „IP wurde gesetzt\" bedeutet. Default: good":
    "Substring in the response that means “IP set”. Default: good",
  "Unverändert-Marker (optional)": "Unchanged marker (optional)",
  "Substring, der „IP war schon korrekt\" bedeutet. Default: nochg":
    "Substring that means “IP was already correct”. Default: nochg",

  // — Caddy DNS providers (labels + fields + help) —
  "AWS Route 53": "AWS Route 53",
  "DigitalOcean": "DigitalOcean",
  "DuckDNS": "DuckDNS",
  "DuckDNS-Token": "DuckDNS token",
  "Aus dem DuckDNS-Konto. Hostname muss in den DuckDNS-Domains existieren.":
    "From your DuckDNS account. Hostname must exist among the DuckDNS domains.",
  "Porkbun": "Porkbun",
  "API-Key": "API key",
  "API-Secret": "API secret",
  "Namecheap": "Namecheap",
  "Username": "Username",
  "API-Endpoint (optional)": "API endpoint (optional)",
  "IONOS": "IONOS",
  "Aus dem IONOS Developer Portal (publicKey.secret).":
    "From the IONOS Developer Portal (publicKey.secret).",
  "Netcup": "Netcup",
  "Kunden-Nr": "Customer no.",
  "API-Passwort": "API password",
  "Linode": "Linode",
  "Cloudflare API-Token mit Zone:Read + DNS:Edit. Identisch zum DDNS-Token.":
    "Cloudflare API token with Zone:Read + DNS:Edit. Identical to the DDNS token.",
  "Hetzner DNS Console → Access Tokens. Identisch zum DDNS-Token.":
    "Hetzner DNS Console → Access Tokens. Identical to the DDNS token.",
  "AWS Access Key ID": "AWS Access Key ID",
  "AWS Secret Access Key": "AWS Secret Access Key",
  "AWS Region": "AWS Region",

  // v1.0.2 — HA entity autocomplete (HAEntityInput component)
  "Eintrag löschen": "Clear entry",
  "Entities konnten nicht geladen werden": "Could not load entities",
  "Keine passenden Entities": "No matching entities",

  // v1.0.2 — IconPicker set filter
  "Alle": "All",

  // v1.0.2 — Views: edit + duplicate
  // (note: "Bearbeiten", "Duplizieren", "Speichern", "Speichere…" are already
  // in this dict — only the new strings are added here)
  "Kopie": "Copy",
  "View bearbeiten": "Edit view",
  "View duplizieren": "Duplicate view",
  "Anzeigename oder URL-Pfad ändern. Layout + Widgets bleiben erhalten.":
    "Change display name or URL path. Layout + widgets stay intact.",
  "Kopiert Layout + Widgets in einen neuen View. Original bleibt unverändert.":
    "Copies layout + widgets into a new view. Original stays untouched.",
  "Duplikat anlegen & öffnen": "Create duplicate & open",
  "Ändert die URL auf dem Display. Bestehende Tablets müssen ggf. neu konfiguriert werden.":
    "Changes the URL on the display. Existing tablets may need to be reconfigured.",
  // URL-slug placeholder paired with "z.B. Küche" — keep the language
  // consistent so "Kitchen / kitchen" reads naturally in EN mode.
  "kueche": "kitchen",
  // Custom file-picker label (replaces the browser's native locale-dependent
  // "Keine ausgewählt" / "No file chosen" status text)
  "Keine Datei ausgewählt": "No file chosen",

  // v1.1.0 — Camera widget
  "Kamera": "Camera",
  "HA-Kamera-Entity": "HA camera entity",
  "HA-Kamera-Entity in Config eintragen, z.B. camera.front_door":
    "Set an HA camera entity in the config, e.g. camera.front_door",
  "Direkte URL": "Direct URL",
  "Stream- / Snapshot-URL": "Stream / snapshot URL",
  "Stream-URL in den Einstellungen eintragen (Snapshot- oder MJPEG-URL).":
    "Set a stream URL in the settings (snapshot or MJPEG URL).",
  "Direkte Kamera-URL ohne HA — ein Snapshot-JPEG (wird im Intervall neu geladen) oder ein MJPEG-Stream. RTSP kann der Browser nicht abspielen; dafür HA/go2rtc nutzen.":
    "Direct camera URL without HA — a snapshot JPEG (refetched on the interval) or an MJPEG stream. The browser can't play RTSP; use HA/go2rtc for that.",
  "Stream-Modus noch nicht verfügbar — Snapshot wählen":
    "Stream mode not available yet — pick Snapshot",
  "WebRTC noch nicht verfügbar — Snapshot oder MJPEG wählen":
    "WebRTC not available yet — pick Snapshot or MJPEG",
  "WebRTC-Verbindung fehlgeschlagen": "WebRTC connection failed",
  "HD, niedrige Latenz": "HD, low latency",
  "flüssig, mehr BW": "smooth, more bw",
  "Snapshot ist bandbreitenfreundlich. MJPEG ist flüssig. WebRTC liefert HD mit niedriger Latenz, braucht aber eine WebRTC-fähige HA-Konfiguration (go2rtc bzw. eine Kamera-Integration mit eigenem WebRTC-Provider).":
    "Snapshot is bandwidth-friendly. MJPEG is smooth. WebRTC delivers HD with low latency but needs a WebRTC-capable HA setup (go2rtc or a camera integration with its own WebRTC provider).",
  "WebRTC braucht eine HA-Instanz mit go2rtc-Setup (Standard bei Frigate, UniFi Protect via go2rtc, ESPHome cams etc.). Bei nicht-WebRTC-fähigen Kameras zeigt das Widget einen Fehler — dann auf MJPEG zurückschalten. Qualität von Snapshot und MJPEG hängt am HA-Stream-Profil der Kamera.":
    "WebRTC needs an HA setup with go2rtc (default for Frigate, UniFi Protect via go2rtc, ESPHome cams, etc.). On cameras without WebRTC support the widget shows an error — fall back to MJPEG then. Snapshot/MJPEG quality depends on the camera's HA stream profile.",
  "Anzeige-Modus": "Display mode",
  "Snapshot": "Snapshot",
  "alle paar Sekunden": "every few seconds",
  "Live-Stream (MJPEG)": "Live stream (MJPEG)",
  "flüssig, mehr Bandbreite": "smooth, more bandwidth",
  "Snapshot ist bandbreitenfreundlich, MJPEG ist flüssig. Qualität hängt am HA-Stream-Setup der Kamera.":
    "Snapshot is bandwidth-friendly, MJPEG is smooth. Quality depends on the camera's HA stream setup.",
  "Snapshot konnte nicht geladen werden": "Snapshot could not be loaded",
  "Liste enthält nur Kamera-Entities aus deiner verbundenen HA-Instanz.":
    "List only contains camera entities from your connected HA instance.",
  "Aktualisierungs-Intervall": "Refresh interval",
  "Wie oft das Vorschaubild neu geholt wird. Schneller = mehr Bandbreite + HA-Last.":
    "How often the snapshot is refetched. Faster = more bandwidth + HA load.",
  "Seitenverhältnis": "Aspect ratio",
  "„Auto“ passt sich an die Quelle an. Fixe Werte beschneiden das Bild, füllen aber das Widget vollständig.":
    "“Auto” follows the source. Fixed ratios crop the image but fill the widget.",
  "Bei Klick auf Bild Vollbild öffnen": "Click image to open fullscreen",
  "Beschriftung (optional)": "Caption (optional)",
  "z.B. Haustür": "e.g. Front door",
  "Kleiner Hinweis-Chip unten-links im Widget. Leer = kein Chip.":
    "Small caption chip in the lower-left corner. Empty = no chip.",
  "Snapshot-Modus: das Vorschaubild wird im konfigurierten Intervall neu geholt. MJPEG-Stream und WebRTC (go2rtc) folgen in späteren Releases.":
    "Snapshot mode: the preview image is refetched at the configured interval. MJPEG stream and WebRTC (go2rtc) come in later releases.",
  "MJPEG-Qualität hängt direkt am HA-Stream-Profil der Kamera — niedrige Auflösung im HA-Stream-Source liefert auch hier nur niedrige Auflösung. WebRTC (go2rtc) folgt in einem späteren Release.":
    "MJPEG quality depends directly on the camera's HA stream profile — a low-resolution stream source means low-resolution here too. WebRTC (go2rtc) comes in a later release.",
  // "Schließen" already exists earlier in this dict.

  // Clock widget: timezone picker + time/date format selects
  "Zeitzone": "Time zone",
  "Leer = Browser-Zeit. Tippen filtert die Liste (z.B. berlin → Europe/Berlin).":
    "Empty = browser time. Typing filters the list (e.g. berlin → Europe/Berlin).",
  "Keine passende Zeitzone": "No matching time zone",
  "Uhrzeitformat": "Time format",
  "Datumsformat": "Date format",
  "Automatisch (nach Sprache)": "Automatic (follow language)",
  "24 Stunden (18:32)": "24 hours (18:32)",
  "12 Stunden (6:32 PM)": "12 hours (6:32 PM)",
  "Deutsch (Di., 27. Mai)": "German (Di., 27. Mai)",
  "US-Englisch (Tue, May 27)": "US English (Tue, May 27)",
  "UK-Englisch (Tue 27 May)": "UK English (Tue 27 May)",

  // Button widget: per-slot visibility toggle
  "Diesen Button anzeigen": "Show this button",
  "Button ist ausgeblendet — die Einstellungen bleiben erhalten.":
    "Button is hidden — its settings are kept.",
  "Noch leer — ein Icon oder Text zuweisen, damit der Button angezeigt wird.":
    "Still empty — assign an icon or label so the button shows.",

  // RSS widget (#56)
  "RSS Feed": "RSS Feed",
  "Feed-URLs": "Feed URLs",
  "Feed-URL(s) im Inspector eintragen": "Add feed URL(s) in the inspector",
  "Eine URL pro Zeile. RSS oder Atom, bis zu 8 Feeds werden zusammengeführt und nach Datum sortiert.":
    "One URL per line. RSS or Atom, up to 8 feeds are merged and sorted by date.",
  "Feed konnte nicht geladen werden": "Feed could not be loaded",
  "Lade Feed…": "Loading feed…",
  "Einzeln": "single",
  "mehrere untereinander": "several stacked",
  "wechselt automatisch": "rotates automatically",
  "Anzahl Beiträge": "Number of posts",
  "Wechsel-Intervall": "Rotation interval",
  "Datum": "Date",
  "Beschreibung": "Description",
  "Vorschaubild": "Thumbnail",
  "Akzentfarbe": "Accent color",
  "Farbe der Quelle und der Pager-Punkte.": "Colour of the source label and pager dots.",
  "gerade eben": "just now",
  "Std": "h",
  "Beitrag öffnen": "Open article",
  "Titel anklickbar (öffnet im neuen Tab)": "Title clickable (opens in new tab)",
  "QR-Code zum Scannen (nur Einzeln-Modus)": "QR code to scan (single mode only)",
  "Im Einzeln-Modus kannst du zwischen den Beiträgen wischen. QR-Code am Beitrag → mit dem Handy scannen und dort weiterlesen.":
    "In single mode you can swipe between posts. QR code on the post → scan it with your phone and keep reading there.",
  "Für den QR-Code den Einzeln-Modus wählen. Klickbare Titel funktionieren auch in der Liste.":
    "Pick single mode for the QR code. Clickable titles also work in the list.",
  "Textzeilen": "Text lines",
  "Titel": "Title",
  "Auto passt die Zeilen an die Kachelhöhe an. Ein fester Wert zeigt genau so viele Zeilen — bei knapper Kachel wird der Rest abgeschnitten.":
    "Auto fits the lines to the tile height. A fixed value shows exactly that many lines — on a tight tile the rest is cut off.",
  "RSS oder Atom. Bis zu 8 Feeds werden zusammengeführt und nach Datum sortiert.":
    "RSS or Atom. Up to 8 feeds are merged and sorted by date.",
  "Feed hinzufügen": "Add feed",
  // RSS-Karte im Benachrichtigungs-Widget
  "RSS-Feed": "RSS Feed",
  "Zeigt eine laufende Schlagzeilen-Karte im Stack.": "Shows a running headline card in the stack.",
  "Quelle anzeigen": "Show source",
  "Datum anzeigen": "Show date",
  "Beschreibung anzeigen": "Show description",
  "Vorschaubild anzeigen": "Show thumbnail",
  "Titel anklickbar": "Title clickable",
  "QR-Code anzeigen": "Show QR code",
  "Punkte": "Dots",
  "Seiten-Punkte anzeigen": "Show page dots",

  // QR-Code widget
  "QR-Code": "QR Code",
  "WLAN": "Wi-Fi",
  "Link": "Link",
  "Text": "Text",
  "WLAN-Name (SSID)": "Wi-Fi name (SSID)",
  "Verstecktes Netz": "Hidden network",
  "Offen (kein Passwort)": "Open (no password)",
  "Gäste scannen den Code und verbinden sich automatisch.": "Guests scan the code and connect automatically.",
  "Beliebiger Text": "Any text",
  "WLAN-Name im Inspector eintragen": "Enter the Wi-Fi name in the inspector",
  "Inhalt im Inspector eintragen": "Enter the content in the inspector",
  "Inhalt zu lang für einen QR-Code": "Content too long for a QR code",
  "Form der Punkte": "Dot shape",
  "Rund": "Rounded",
  "Kreise": "Circles",
  "Ecken-Augen": "Corner eyes",
  "Einfarbig": "Solid",
  "Verlauf": "Gradient",
  "Strahlend": "Radial",
  "Farbe 1": "Color 1",
  "Farbe 2": "Color 2",
  "Fläche (präsent)": "Filled (bold)",
  "Transparent (dezent)": "Transparent (subtle)",
  "Ohne Fläche liegt der Code direkt auf dem Wallpaper — achte auf genug Kontrast, sonst lässt er sich schlecht scannen.":
    "Without a fill the code sits directly on the wallpaper — keep enough contrast or it scans poorly.",
  "Icon in der Mitte": "Center icon",
  "Fehlerkorrektur wird automatisch erhöht, damit der Code trotzdem scannbar bleibt.":
    "Error correction is raised automatically so the code stays scannable.",
  "Beschriftung anzeigen": "Show caption",
  "Standard: WLAN-Name": "Default: Wi-Fi name",
  "z. B. Speisekarte": "e.g. Menu",
  "Kleiner = dezent in einer Ecke. Größer = füllt die Kachel.": "Smaller = subtle in a corner. Larger = fills the tile.",
  "Wenn der Titel zu lang ist": "When the title is too long",
  "Verkleinern": "Shrink to fit",
  "Ein-/ausklappen": "Expand/collapse",

  // Status widget / status cards
  "Entität im Inspector wählen": "Pick an entity in the inspector",
  "Entität (Auslöser)": "Entity (trigger)",
  "Aktiv bei Zustand": "Active on state",
  "Auffällig bei Zustand": "Attention states",
  "Rand-Dicke": "Border width",
  "Pulsieren": "Pulse",
  "Alarm-Ring": "Alert ring",
  "Beim Antippen auslösen (optional)": "Trigger on tap (optional)",
  "Tippen auf die Karte drückt Tasten, schaltet Schalter oder startet Skripte — z. B. Wäsche direkt an der Karte quittieren. Nur für Touch-Displays relevant.":
    "Tapping the card presses buttons, toggles switches or starts scripts — e.g. acknowledge laundry right on the card. Only relevant on touch displays.",
  "Bei diesen Zuständen färbt sich die Karte kräftig ein und pulsiert — für alles, was niemand übersehen soll.":
    "On these states the card gets a bold colour wash and pulses — for anything nobody should miss.",
  "Mehrere mit Komma. Leer = aktiv, sobald der Zustand nicht aus/idle ist. Achtung: binary_sensor-Entitäten melden on/off — nicht charging o. ä.":
    "Comma-separate multiple. Empty = active whenever the state is not off/idle. Note: binary_sensor entities report on/off — not charging etc.",
  "Aus Entität": "From entity",
  "Eigene URL": "Custom URL",
  "Nur Icon": "Icon only",
  "leer = Auslöser-Entität": "empty = trigger entity",
  "Jede Entität mit Bild: image.*, camera.*, media_player.*, person.* …":
    "Any entity with a picture: image.*, camera.*, media_player.*, person.* …",
  "Icon (Fallback, wenn kein Bild da ist)": "Icon (fallback when no picture is available)",
  "Standard: Name der Entität": "Default: entity name",
  "Detail-Entitäten": "Detail entities",
  "Label": "Label",
  "Detail hinzufügen": "Add detail",
  "Live-Werte wie Ladestand oder Restzeit, mit optionalem Label.":
    "Live values like charge level or time remaining, with an optional label.",
  "Fortschritt (0–100, optional)": "Progress (0–100, optional)",
  "Zeigt einen Balken — Ladestand, Druck-Fortschritt …": "Shows a bar — charge level, print progress …",
  "Zustand anzeigen": "Show state",
  "Bild als Hintergrund (Blur)": "Picture as background (blur)",
  "Auch ohne Ereignis anzeigen": "Show even without an event",
    "Standardmäßig erscheint die Kachel nur bei aktivem Ereignis — perfekt zum Stapeln mit anderen Widgets. Mit „Auch ohne Ereignis anzeigen“ bleibt sie dauerhaft sichtbar.":
    "By default the tile only appears while the event is active — perfect for stacking with other widgets. With \"Show even without an event\" it stays visible all the time.",
  "Status-Karten": "Status cards",
    "Auto lädt, Drucker druckt, Toniebox spielt — Karte mit Bild und Live-Details, solange das Ereignis aktiv ist (pro Karte auch dauerhaft möglich).":
    "Car charging, printer printing, toniebox playing — a card with a picture and live details while the event is active (each card can also stay visible permanently).",
  "Karte": "Card",
  "Status-Karte hinzufügen": "Add status card",
  "Pfade aus dem HA-www-Ordner funktionieren direkt: /local/…": "Paths from HA's www folder work directly: /local/…",
  "Gestapelt": "Stacked",
  "Bild-Stil": "Picture style",
  "Kachel (Foto/Cover)": "Tile (photo/cover)",
  "Freigestellt (PNG)": "Cutout (PNG)",
  "Bild-Größe": "Picture size",
  "Hintergrund-Blur": "Background blur",
  "Hintergrund-Füllung": "Background fill",
  "Balken unten": "Bar at the bottom",
  "Kreis rechts": "Ring on the right",
  "% im Kreis anzeigen": "Show % inside the ring",
  "Status-Karte bearbeiten": "Edit status card",
  "Live-Vorschau": "Live preview",
  "Fertig": "Done",
  "Live-Vorschau mit echten Daten — die Karte wird hier auch gezeigt, wenn das Ereignis gerade nicht aktiv ist.":
    "Live preview with real data — the card is shown here even while the event is not active.",
  "Zustand jetzt:": "State right now:",
  "Live-Vorschau mit echten Daten — Größe hier ist nur zum Ausprobieren, die echte Kachel bestimmt die Maße.":
    "Live preview with real data — the size here is just for trying things out, the real tile sets the dimensions.",
  "Änderungen werden erst mit Übernehmen gespeichert.": "Changes are only saved when you hit Apply.",
  "Schrift skaliert mit der Breite (responsive) — genau wie auf dem Display.":
    "Font scales with the width (responsive) — exactly like on the display.",
  "Schrift fest:": "Fixed font:",
  "Manuell": "Manual",
  "Hell = helle Fläche + dunkler Text. Automatisch folgt der View-Einstellung.":
    "Light = a light surface + dark text. Automatic follows the view setting.",
  "Hell = helle Fläche + dunkler Text (Deckkraft steuert die Fläche).":
    "Light = a light surface + dark text (opacity controls the surface).",
  "Helligkeit":
    "Brightness",
  "Dunkel":
    "Dark",
  "Hell":
    "Light",
  "Hell für helle Räume — dunkler Text.":
    "Light for bright rooms — dark text.",
  "Panel-Hintergrund":
    "Panel background",
  "Transparent (Wallpaper)":
    "Transparent (wallpaper)",
  "Deckende Fläche":
    "Solid fill",
  "Foto-Kopf + Fläche":
    "Photo header + fill",
  "Immich-Album-ID":
    "Immich album ID",
  "Album-ID (siehe Bild-Widget)":
    "Album ID (see Image widget)",
  "Höhe des Foto-Kopfs":
    "Photo header height",
  "Ansicht":
    "View",
  "Agenda":
    "Agenda",
  "Monat":
    "Month",
  "Kommende Termine als Liste.":
    "Upcoming events as a list.",
  "Nach Tagen gruppiert mit Überschriften.":
    "Grouped by day with headings.",
  "Volles Monatsgitter mit Terminen in den Tagen.":
    "Full month grid with events in the days.",
  "Befehl fehlgeschlagen":
    "Command failed",
  "Netzwerkfehler — Befehl nicht gesendet.":
    "Network error — command was not sent.",
  "Live-Sync ist nicht verfügbar":
    "Live sync is not available",
  "dashboardId fehlt":
    "dashboardId is missing",
  "Eigenes Bild hochladen":
    "Upload your own image",
  "Lädt hoch…":
    "Uploading…",
  "Upload fehlgeschlagen":
    "Upload failed",
  "Keine Datei empfangen":
    "No file received",
  "Nur PNG, JPEG, WebP oder GIF":
    "PNG, JPEG, WebP or GIF only",
  "Nicht unterstütztes Bildformat":
    "Unsupported image format",
  "Datei ist zu groß":
    "File is too large",
  "Wegwischen-Knopf":
    "Dismiss button",
  "Automatisch (Touch: sichtbar, Maus: bei Hover)":
    "Automatic (touch: visible, mouse: on hover)",
  "Nur bei Hover":
    "Only on hover",
  "Immer sichtbar":
    "Always visible",
  "Aus (reiner Bilderrahmen)":
    "Off (pure picture frame)",
  "Das ✕ zum Quittieren. Ohne Touch stört es meist nur — mit Touch findet man es sonst nicht.":
    "The ✕ that dismisses a card. Without touch it mostly just gets in the way — with touch you would never find it otherwise.",
  "Alben auswählen ({n} gefunden)":
    "Select albums ({n} found)",
  "Mehrere Alben werden zu einer Diashow zusammengeführt; doppelte Fotos erscheinen nur einmal.":
    "Several albums are merged into one slideshow; duplicate photos appear only once.",
  "Alben ausgewählt":
    "albums selected",
  "Theme, Deckkraft und Blur — diese drei gelten für ALLE Karten im Stapel.":
    "Theme, opacity and blur — these three apply to EVERY card in the stack.",
  "Darstellung der Kacheln":
    "Tile appearance",
  "Gilt für Alert- und Timer-Kacheln — nicht für Media-, RSS- oder Status-Karten.":
    "Applies to alert and timer tiles — not to media, RSS or status cards.",
  "Kachel-Optik":
    "Tile look",
  "Aussehen aller Karten im Stapel — Theme, Deckkraft, Rahmen und Icons.":
    "How every card in the stack looks — theme, opacity, border and icons.",
  "Karten-Stil":
    "Card style",
  "Alerts aus eigenen Regeln oder direkt aus HA-persistent_notification.":
    "Alerts from your own rules or straight from HA persistent_notification.",
  "Regeln":
    "Rules",
  "Laufende Timer erscheinen als Karte mit Countdown, einsortiert unter den Alerts.":
    "Running timers appear as a card with a countdown, sorted below the alerts.",
  "Start via":
    "Start via",
  "Automatisch (folgt View)":
    "Automatic (follows view)",
  "Hell / Dunkel":
    "Light / dark",
  "Immer dunkel":
    "Always dark",
  "Immer hell":
    "Always light",
  "Nach Sonnenstand (HA)":
    "By sun position (HA)",
  "Nach Uhrzeit":
    "By time of day",
  "Nach HA-Entität":
    "By HA entity",
  "Zustand für hell (z. B. on)":
    "State meaning light (e.g. on)",
  "Hell ab":
    "Light from",
  "Dunkel ab":
    "Dark from",
  "Folgt sun.sun aus Home Assistant. Fehlt die Entität, greifen die Zeiten als Sicherheitsnetz.":
    "Follows sun.sun from Home Assistant. If the entity is missing, the times kick in as a safety net.",
  "Folgt einer freien HA-Entität — z. B. einer Szene. Fehlt sie, greifen die Zeiten.":
    "Follows any HA entity — a scene, for example. If it is missing, the times kick in.",
  "Gilt für alle Widgets, die auf „Automatisch“ stehen. Widgets mit fest eingestelltem Theme bleiben unberührt.":
    "Applies to every widget set to “Automatic”. Widgets with a fixed theme stay untouched.",
  "Alle Widgets auf „Automatisch“ setzen":
    "Set all widgets to “Automatic”",
  "Beispieldaten": "Sample data",
  "Beispiel-Benachrichtigung — so sieht ein Alert aus": "Sample notification — this is what an alert looks like",
  "Beispiel-Titel": "Sample track",
  "Beispiel-Album": "Sample album",
  "Beispiel-Player": "Sample player",
  "Fußballtraining": "Football practice",
  "Geburtstag Oma": "Grandma's birthday",
  "Zahnarzt-Termin": "Dentist appointment",
  "Team-Meeting": "Team meeting",
  "Yoga-Kurs": "Yoga class",
  "Elternabend": "Parents' evening",
  "Kino mit Freunden": "Cinema with friends",
  "Müllabfuhr": "Bin collection",
  "Zeigt das Widget mit echten Daten, während du unten Einstellungen änderst.":
    "Shows the widget with real data while you change settings below.",
  "Für Community-Module gibt es hier noch keine Live-Vorschau.": "No live preview for community modules here yet.",
  "Raster": "Grid",
  "Verbundenes Display — Canvas übernimmt das echte Seitenverhältnis": "Connected display — the canvas adopts its real aspect ratio",
  "1:1 vom Display gerechnet": "Computed 1:1 from the display",
  "Maßstab": "scale",
  "Schrift": "Font",
  "responsive": "responsive",
  "klicken zum Übernehmen": "click to use it",
  "noch keine Entität gewählt": "no entity picked yet",
  "Hoch drehen, bis die Farbe die ganze Karte füllt.": "Turn it up until the colour fills the whole card.",
};

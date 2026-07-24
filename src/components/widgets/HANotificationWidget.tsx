"use client";

import React, { useState, useEffect, useRef } from "react";
import { Icon } from "./WidgetIcon";
import { useGlassStyle } from "@/lib/ui/glass";
import MediaPlayerWidget from "./MediaPlayerWidget";
import RssWidget from "./RssWidget";
import StatusWidget from "./StatusWidget";
import {
    formatNotifAge,
    type NotifTimeFormat,
} from "./_shared/notifTimeFormat";
import {
    useDockedTimers,
    timerClock,
    type DockedTimer,
} from "./_shared/useDockedTimers";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export interface NotificationRule {
    entityId?: string;
    triggerState?: string;
    message?: string;
    durationMinutes?: number;
    icon?: string;
    color?: string;
    clearEntityId?: string;
    clearStateVal?: string;
    clearMatchMode?: "fixed" | "change";
    quitMode?: "time" | "entity" | "both";
    dropOnTriggerLoss?: boolean;
    tapAction?: string;
    tapActionEntity?: string;
}

interface PersistedAlert {
    rule: NotificationRule;
    key: string;
    triggerTime: number;
    configIndex: number;
    initialClearLastChanged?: string;
    ack?: boolean;
}

type HaPersistent = {
    id: string;
    entityId: string;
    title: string;
    message: string;
    createdAt?: string;
    status: string;
};

export default function HANotificationWidget({
    config,
    onVisibilityChange,
    dashboardId,
}: {
    config?: any;
    onVisibilityChange?: (isVisible: boolean) => void;
    dashboardId?: string;
}) {
    const { locale, t: tr } = useLocale();
    const source: "rules" | "persistent" = config?.source === "persistent" ? "persistent" : "rules";
    const [statesDict, setStatesDict] = useState<Record<string, any>>({});
    const [error, setError] = useState("");
    const [haPersistent, setHaPersistent] = useState<HaPersistent[]>([]);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    // 1Hz Tick — damit Alters-Anzeigen ohne neuen Fetch atmen
    const [nowMs, setNowMs] = useState(() => Date.now());

    // Memory mapping of active alerts by their unique config index
    const [persistedAlerts, setPersistedAlerts] = useState<Map<number, PersistedAlert>>(new Map());
    // Now-Playing-Karten: JEDER konfigurierte Player bekommt seine eigene
    // Karte — spielen zwei gleichzeitig, stapeln sich zwei Karten. Sichtbar-
    // keit meldet jedes eingebettete MediaPlayerWidget einzeln (hideWhenIdle).
    const [mediaVisibleMap, setMediaVisibleMap] = useState<Record<string, boolean>>({});
    const anyMediaVisible = Object.values(mediaVisibleMap).some(Boolean);
    // Status-Karten (Auto lädt, Drucker druckt, …): gleiche Mechanik.
    const [statusVisibleMap, setStatusVisibleMap] = useState<Record<number, boolean>>({});
    const anyStatusVisible = Object.values(statusVisibleMap).some(Boolean);

    const rules: NotificationRule[] = config?.rules || [];
    const maxNotifications = config?.maxNotifications || 5;
    const timeFormat: NotifTimeFormat = (config?.timeFormat as NotifTimeFormat) ?? "auto";
    const showTimers: boolean = config?.showTimers !== false;

    // Wegwischen-Knopf: auf einem reinen Bilderrahmen ist das X nur Störung,
    // auf einem Touch-Panel ist "nur bei Hover" dagegen unauffindbar (Touch
    // kennt kein Hover). "auto" entscheidet das anhand des Geräts.
    const dismissMode: string = config?.dismissButton ?? "auto";
    const [canHover, setCanHover] = useState(true);
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mq = window.matchMedia("(hover: hover)");
        const upd = () => setCanHover(mq.matches);
        upd();
        mq.addEventListener?.("change", upd);
        return () => mq.removeEventListener?.("change", upd);
    }, []);
    const dismissBtnClass =
        dismissMode === "off" ? "hidden"
        : dismissMode === "always" ? "opacity-45 group-hover:opacity-100 transition-opacity"
        : dismissMode === "hover" ? "opacity-0 group-hover:opacity-100 transition-opacity"
        : (canHover ? "opacity-0 group-hover:opacity-100 transition-opacity" : "opacity-45 transition-opacity");

    // Aktive Timer über shared Hook ziehen
    const { timers: activeTimers, dismissTimer } = useDockedTimers(dashboardId, showTimers);

    // Adaptiver Tick: 1Hz wenn Timer aktiv (Countdown!), sonst 30/60s für Alters-Strings
    useEffect(() => {
        const fast = activeTimers.length > 0;
        const interval = fast ? 1000 : (timeFormat === "auto" ? 30_000 : 60_000);
        const t = setInterval(() => setNowMs(Date.now()), interval);
        return () => clearInterval(t);
    }, [timeFormat, activeTimers.length]);

    // Build fetch parameters (trigger entities + clear entities)
    const ruleIds = rules.map((r) => r.entityId).filter((id) => id && id.trim() !== "");
    const clearIds = rules.map((r) => r.clearEntityId).filter((id) => id && id.trim() !== "");
    const idsParam = Array.from(new Set([...ruleIds, ...clearIds])).join(",");

    const fetchState = async () => {
        if (!idsParam) return;
        try {
            const res = await fetch(`/api/ha/state?ids=${idsParam}`);
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setStatesDict(data);
            setError("");
        } catch (err: any) {
            setError(err.message);
        }
    };

    useEffect(() => {
        if (source !== "rules") return;
        fetchState();
        const interval = setInterval(fetchState, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsParam, source]);

    // HA Persistent-Notifications Poll
    useEffect(() => {
        if (source !== "persistent") return;
        const pollMs = Math.max(5000, (config?.persistentPollSec ?? 15) * 1000);
        const controller = new AbortController();
        let cancelled = false;

        const fetchNotifications = async () => {
            try {
                const res = await fetch("/api/ha/notifications", { signal: controller.signal });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                if (!cancelled) {
                    setHaPersistent(Array.isArray(data.notifications) ? data.notifications : []);
                    setError("");
                }
            } catch (err: any) {
                if (err?.name === "AbortError") return;
                if (!cancelled) setError(err.message);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, pollMs);
        return () => {
            cancelled = true;
            controller.abort();
            clearInterval(interval);
        };
    }, [source, config?.persistentPollSec]);

    async function dismissHaPersistent(entityId: string) {
        setDismissedIds((prev) => new Set(prev).add(entityId));
        try {
            const id = entityId.replace(/^persistent_notification\./, "");
            await fetch("/api/ha/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entityId,
                    domain: "persistent_notification",
                    service: "dismiss",
                    data: { notification_id: id },
                }),
            });
        } catch (e) {
            console.error("Failed to dismiss notification", e);
        }
    }

    // Update persistence map whenever statesDict changes
    useEffect(() => {
        if (Object.keys(statesDict).length === 0) return;

        setPersistedAlerts((prevMap) => {
            const newMap = new Map(prevMap);

            rules.forEach((rule, index) => {
                if (!rule.entityId || rule.entityId.trim() === "") return;
                const stateObj = statesDict[rule.entityId];
                if (!stateObj) return;

                const currentState = stateObj.state;
                const expectedState = rule.triggerState || "";
                const isTriggered = currentState.toLowerCase() === expectedState.toLowerCase();

                let existing = newMap.get(index);

                // If it's already acked and trigger is gone, delete it fully
                if (existing && existing.ack && !isTriggered) {
                     newMap.delete(index);
                     return;
                }

                // If it's already acked and trigger is still present, just let it exist silently
                if (existing && existing.ack) {
                     newMap.set(index, existing); 
                     return;
                }

                // 1. Evaluate clear condition if we are not restricted to time-only
                let takeAck = false;
                if (existing && rule.quitMode !== 'time' && rule.clearEntityId && rule.clearEntityId.trim() !== "") {
                     const clearStateObj = statesDict[rule.clearEntityId];
                     
                     if (clearStateObj) {
                         const matchMode = rule.clearMatchMode || 'fixed';
                         if (matchMode === 'change') {
                             if (existing.initialClearLastChanged && clearStateObj.last_changed && clearStateObj.last_changed !== existing.initialClearLastChanged) {
                                 takeAck = true;
                             }
                         } else {
                             const expectedClearState = rule.clearStateVal || "on";
                             if (clearStateObj.state.toLowerCase() === expectedClearState.toLowerCase()) {
                                 takeAck = true;
                             }
                         }
                     }
                }

                if (takeAck && existing) {
                     existing.ack = true;
                     newMap.set(index, existing);
                     return; // Alert is acknowledged/cleared visually, wait for trigger drop.
                }

                if (isTriggered) {
                    if (!existing) {
                        // Fresh trigger! Record the time it entered the map.
                        const initialClearObj = rule.clearEntityId ? statesDict[rule.clearEntityId] : null;
                        
                        let tTime = Date.now();
                        if (stateObj && stateObj.last_changed) {
                            const parsed = new Date(stateObj.last_changed).getTime();
                            if (!isNaN(parsed)) tTime = parsed;
                        }

                        existing = {
                            rule,
                            key: `alert-${index}-${Date.now()}`,
                            triggerTime: tTime,
                            configIndex: index,
                            initialClearLastChanged: initialClearObj?.last_changed
                        };
                    }
                    // Check standard duration expiration if triggered, ONLY if not explicitly 'entity'-only mode
                    if (rule.durationMinutes && rule.durationMinutes > 0 && rule.quitMode !== 'entity') {
                        const ageMinutes = (Date.now() - existing.triggerTime) / 60000;
                        if (ageMinutes > rule.durationMinutes) {
                            newMap.delete(index);
                            return; // Expired naturally
                        }
                    }
                    newMap.set(index, existing);
                } else {
                    // Trigger NOT met right now.
                    if (!existing) return;

                    if (rule.dropOnTriggerLoss) {
                        newMap.delete(index);
                        return;
                    }

                    if (rule.quitMode === 'time') {
                        // Only drop if time expired
                        if (rule.durationMinutes && rule.durationMinutes > 0) {
                            const ageMinutes = (Date.now() - existing.triggerTime) / 60000;
                            if (ageMinutes > rule.durationMinutes) {
                                newMap.delete(index);
                            }
                        }
                    } else if (rule.quitMode === 'entity') {
                        // Not cleared yet (takeAck=false). Wait for clear condition.
                        // Fallback: delete immediately if no clear entity is defined to prevent zombies
                        if (!rule.clearEntityId || rule.clearEntityId.trim() === "") {
                             newMap.delete(index); 
                        }
                    } else {
                        // Default "both" behavior
                        if (!rule.clearEntityId || rule.clearEntityId.trim() === "") {
                            newMap.delete(index);
                        } else {
                            if (rule.durationMinutes && rule.durationMinutes > 0) {
                                const ageMinutes = (Date.now() - existing.triggerTime) / 60000;
                                if (ageMinutes > rule.durationMinutes) {
                                    newMap.delete(index);
                                }
                            }
                        }
                    }
                }
            });

            return newMap;
        });
    }, [statesDict, rules]); // Re-evaluate whenever state or rules change

    // Convert map to sorted array, filtering out explicitly acked items
    let activeAlertArray = Array.from(persistedAlerts.values()).filter(a => !a.ack);
    
    // Sort by newest alerts first
    activeAlertArray.sort((a, b) => b.triggerTime - a.triggerTime);
    activeAlertArray = activeAlertArray.slice(0, maxNotifications);

    // Vorschau-Beispieldaten (#42): Der Editor injiziert __demo — ohne aktive
    // Alerts zeigen wir Beispiel-Karten aus den EIGENEN Regeln (Icon, Farbe,
    // Text bleiben die konfigurierten). Existiert im Live-View nie.
    if (config?.__demo && source === "rules" && activeAlertArray.length === 0) {
        const demoRules: NotificationRule[] = rules.filter((r) => r.entityId).length
            ? rules.filter((r) => r.entityId).slice(0, 2)
            : [{ entityId: "sensor.beispiel", triggerState: "on", message: tr("Beispiel-Benachrichtigung — so sieht ein Alert aus"), icon: "mdi:bell-ring", color: "#60A5FA" }];
        activeAlertArray = demoRules.map((rule, i) => ({
            rule,
            key: `demo-${i}`,
            triggerTime: Date.now() - (i + 1) * 5 * 60000,
            configIndex: 100000 + i,
        }));
    }

    // Visibility: das Widget bleibt sichtbar, sobald entweder Alerts oder
    // (showTimers + Timer aktiv) etwas anzuzeigen haben. Da der DockedTimer-
    // Strip selbst die Timer-Liste hält, signalisieren wir hier nur Alerts —
    // der Strip rendert sich notfalls in ein sonst leeres Widget rein.
    // Auto-Hide schalten wir aber ab wenn der Nutzer Timer-Dock aktiv hat,
    // sonst klappt das ganze Widget weg sobald keine Alerts mehr da sind.
    useEffect(() => {
        if (!onVisibilityChange) return;
        if (Object.keys(statesDict).length === 0 && source === "rules") return;
        const hasAlerts = source === "rules"
          ? activeAlertArray.length > 0
          : haPersistent.filter((n) => !dismissedIds.has(n.entityId)).length > 0;
        // showTimers → Widget bleibt immer sichtbar (Timer-Karten erscheinen
        // dynamisch unter den Notifications, ohne dass das Host-Widget weggefadet wird).
        // anyMediaVisible: laufende Now-Playing-Karten halten das Widget
        // sichtbar — auch ganz ohne aktive Alerts.
        // Feature-Schalter: Media/RSS/Status lassen sich abschalten, ohne die Configs zu löschen.
        const mediaOn = config?.mediaEnabled !== false;
        const hasRssCfg = config?.rssEnabled !== false && Array.isArray(config?.rssFeeds) && (config.rssFeeds as string[]).filter(Boolean).length > 0;
        const statusOn = config?.statusEnabled !== false;
        onVisibilityChange(hasAlerts || showTimers || (mediaOn && anyMediaVisible) || hasRssCfg || (statusOn && anyStatusVisible));
    }, [activeAlertArray.length, onVisibilityChange, statesDict, haPersistent, dismissedIds, source, showTimers, anyMediaVisible, anyStatusVisible, config?.rssFeeds, config?.rssEnabled, config?.mediaEnabled, config?.statusEnabled]);

    const handleTap = async (rule: NotificationRule) => {
        const action = rule.tapAction || 'none';
        if (action === 'none') return;

        const targetEntity = action === 'toggle_custom' ? rule.tapActionEntity : rule.entityId;
        if (!targetEntity) return;

        try {
           await fetch('/api/ha/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ entityId: targetEntity, service: 'toggle' })
           });
           setTimeout(fetchState, 500);
        } catch (e) {
           console.error("Tap action failed", e);
        }
    };

    const dismissAlert = (alertKey: number) => {
        setPersistedAlerts(prev => {
            const next = new Map(prev);
            const existing = next.get(alertKey);
            if (existing) {
                existing.ack = true;
                next.set(alertKey, existing);
            }
            return next;
        });
    };

    const { cardOpacity, cardBlur, isLight, hasBg } = useGlassStyle(config);
    const isMinimal = config?.design === 'minimal';
    // "tint" = Media-Stil: farbige Tönung statt Farbkante, rundes Icon-Badge —
    // passt optisch zur Now-Playing-Karte mit Artwork-Hintergrund.
    const isTint = config?.design === 'tint';
    // Tint-Stärke (0–100): wie kräftig + wie weit der Farbverlauf reicht. Auf
    // großen Screens war der feste Wert kaum sichtbar → regelbar.
    const tintStrength = Math.min(100, Math.max(0, config?.tintStrength ?? 45)) / 100;
    const hex2 = (a: number) => Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, "0");
    // Richtung des Farbverlaufs: von links (90deg) oder von rechts (270deg).
    const tintDeg = config?.tintDirection === "right" ? 270 : 90;
    const tintGradient = (c: string) =>
      `linear-gradient(${tintDeg}deg, ${c}${hex2(0.10 + tintStrength * 0.6)}, ${c}${hex2(0.04 + tintStrength * 0.2)} ${Math.round(25 + tintStrength * 35)}%, transparent ${Math.round(45 + tintStrength * 45)}%)`;
    // Rahmen der Karten: aus / in Regel-(Akzent-)Farbe / eigene Farbe.
    const notifyBorderMode: string = config?.notifyBorder || "off";
    const notifyBorderColor: string = config?.notifyBorderColor || "#ffffff";
    const notifyBorderWidth = Math.max(0.25, Math.min(6, Number(config?.notifyBorderWidth) || 1.5));
    const cardBorderFor = (accentColor: string): string | undefined =>
      notifyBorderMode === "accent" ? `${notifyBorderWidth}px solid ${accentColor}`
      : notifyBorderMode === "custom" ? `${notifyBorderWidth}px solid ${notifyBorderColor}`
      : undefined;
    // Icon-Darstellung (#20) — Defaults = bisheriges Verhalten (Box an, 3.2em/1.4em).
    const iconFrame = config?.iconFrame !== false;
    const iconScale = typeof config?.iconScale === "number" ? config.iconScale : 1;
    const frameScale = typeof config?.frameScale === "number" ? config.frameScale : 1;

    /**
     * Icon einer Alert-/Timer-Kachel. Eine Stelle für alle drei Kartenarten,
     * damit die Einstellung "Icon im Kasten" nirgends vergessen wird — im
     * Media-Stil war der runde Kasten vorher fest verdrahtet und die
     * Einstellung damit wirkungslos.
     */
    const renderTileIcon = (iconName: string, tint: string) => {
        if (!iconFrame) {
            return <Icon icon={iconName} className="shrink-0 relative z-10"
                style={{ color: tint, fontSize: `${(isTint ? 1.5 : 1.4) * iconScale}em` }} />;
        }
        if (isTint) {
            return (
                <div className="shrink-0 rounded-full flex items-center justify-center relative"
                    style={{ width: `${3.2 * frameScale}em`, height: `${3.2 * frameScale}em`, backgroundColor: `${tint}26` }}>
                    <Icon icon={iconName} className="relative z-10" style={{ color: tint, fontSize: `${1.5 * iconScale}em` }} />
                </div>
            );
        }
        return (
            <div className={`shrink-0 rounded-[0.8em] flex items-center justify-center relative overflow-hidden transition-colors duration-500 ${hasBg ? (isLight ? 'border border-black/5' : 'border border-white/5') : ''}`}
                style={{ width: `${3.2 * frameScale}em`, height: `${3.2 * frameScale}em`, backgroundColor: `${tint}20` }}>
                <div className="absolute inset-0 opacity-20 blur-md" style={{ backgroundColor: tint }}></div>
                <Icon icon={iconName} className="relative z-10" style={{ color: tint, fontSize: `${1.4 * iconScale}em` }} />
            </div>
        );
    };

    if (error) return <div className="text-red-400 text-xs text-center">{error}</div>;

    // Wenn Quelle = rules und Regeln noch nicht konfiguriert: Hinweis (auch dann
    // soll der Timer-Dock noch sichtbar sein, sonst hilft der Toggle nicht).
    const visiblePersistent = haPersistent.filter((n) => !dismissedIds.has(n.entityId));
    const hasAlerts =
        source === "rules"
            ? activeAlertArray.length > 0
            : visiblePersistent.length > 0;

    const hasTimers = showTimers && activeTimers.length > 0;

    // Now-Playing-Karte — dockt wie die Timer-Karten in den Stack. Das
    // Media-Widget MUSS dauerhaft gemountet bleiben (es pollt und meldet über
    // onVisibilityChange, ob etwas läuft) — deshalb dürfen die Leer-Returns
    // unten nicht greifen, sobald Player konfiguriert sind: der Wrapper mit
    // Höhe 0 ist dann das unsichtbare "Ohr", das die Karte aufklappen kann.
    const mediaPlayers: string[] = config?.mediaEnabled !== false && Array.isArray(config?.mediaPlayers)
        ? (config.mediaPlayers as string[]).filter(Boolean)
        : [];
    // Höhe: Default kompakt wie die übrigen Karten; per Regler änderbar. Die
    // Mess-Engine des Media-Widgets blendet aus, was bei kleiner Höhe nicht
    // passt (Prioritäts-Reihenfolge) — nichts wird gequetscht.
    const mediaCardEm = Math.min(12, Math.max(3.5, Number(config?.mediaCardHeightEm) || 5));
    const mediaCards = mediaPlayers.length > 0 ? mediaPlayers.map((pid) => {
        const visible = mediaVisibleMap[pid] === true;
        return (
            <div
                key={pid}
                className="w-full shrink-0 overflow-hidden transition-all duration-500"
                // marginTop kompensiert das gap-3 des Stacks für zugeklappte
                // Karten — sonst hinterließe jede stille Karte eine Lücke.
                style={{ height: visible ? `${mediaCardEm}em` : 0, opacity: visible ? 1 : 0, marginTop: visible ? undefined : "-0.75rem" }}
            >
                <MediaPlayerWidget
                    config={{
                        entityIds: [pid],
                        layout: "bar", // deterministisches Karten-Layout — blendet nie Elemente aus
                        cardTheme: isLight ? "light" : "dark",
                        cardOpacity: cardOpacity,
                        cardBlur: cardBlur,
                        frameRadius: 24, // rounded-3xl der Geschwister-Karten — Kanten passen
                        textScale: Number(config?.mediaTextScale) || 100, // erbt Host-Schrift × Regler
                        showBorder: config?.mediaShowBorder !== false, // Rand schaltbar
                        borderColor: config?.mediaBorderColor || undefined, // leer = weißes Glas, sonst passende Farbe
                        coverCorners: config?.mediaCoverCorners || "rounded",
                        artworkAsTileBg: config?.mediaArtworkBg !== false,
                        showCover: true,
                        showArtist: true,
                        // Bei mehreren Playern automatisch den Namen zeigen —
                        // sonst wüsste man nicht, welche Karte wo spielt.
                        showPlayerName: config?.mediaShowName === true || mediaPlayers.length > 1,
                        showControls: config?.mediaShowControls !== false,
                        showProgress: config?.mediaShowProgress !== false,
                        showVolume: config?.mediaShowVolume === true,
                        textOverflow: (config?.mediaTextOverflow as string) || "scroll",
                        hideWhenIdle: !config?.__demo,
                        idleHideMinutes: Number(config?.mediaIdleHideMinutes) || 0,
                        fontSize: 20,
                        __demo: config?.__demo === true,
                    }}
                    onVisibilityChange={(v) => setMediaVisibleMap((prev) => (prev[pid] === v ? prev : { ...prev, [pid]: v }))}
                />
            </div>
        );
    }) : null;

    // ── Laufende RSS-Karte — dockt wie die Now-Playing-Karte in den Stack.
    // Immer sichtbar, solange Feeds konfiguriert sind (RSS hat stets Inhalt). ──
    const rssFeeds: string[] = config?.rssEnabled !== false && Array.isArray(config?.rssFeeds)
        ? (config.rssFeeds as string[]).filter(Boolean)
        : [];
    const hasRss = rssFeeds.length > 0;
    const rssCardEm = Math.min(16, Math.max(4, Number(config?.rssCardHeightEm) || 6));
    const rssTop = config?.rssPosition === "top";
    const rssShowBorder = config?.rssShowBorder !== false;
    const rssBorderColor: string = (config?.rssBorderColor as string) || "";
    const rssCard = hasRss ? (
        <div
            key="rss-card"
            className="w-full shrink-0 overflow-hidden rounded-3xl"
            style={{
                height: `${rssCardEm}em`,
                backgroundColor: isLight ? `rgba(255,255,255,${cardOpacity / 100})` : `rgba(0,0,0,${cardOpacity / 100})`,
                backdropFilter: cardBlur > 0 ? `blur(${cardBlur}px)` : "none",
                border: rssShowBorder
                    ? `1px solid ${rssBorderColor ? `${rssBorderColor}${hex2(0.5)}` : isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)"}`
                    : "none",
                boxShadow: hasBg ? "0 8px 32px rgba(0,0,0,0.15)" : "none",
            }}
        >
            <div className="w-full h-full px-[0.9em] py-[0.5em]">
                <RssWidget
                    config={{
                        feeds: rssFeeds,
                        rssMode: "rotate",
                        cardTheme: isLight ? "light" : "dark", // Text passt sich dem Karten-Theme an
                        rotateSec: Number(config?.rssRotateSec) || 8,
                        limit: Number(config?.rssLimit) || 12,
                        showSource: config?.rssShowSource !== false,
                        showDate: config?.rssShowDate !== false,
                        showImage: config?.rssShowImage === true,
                        showSummary: config?.rssShowSummary !== false,
                        titleLines: Number(config?.rssTitleLines) || 0,
                        descLines: Number(config?.rssDescLines) || 0,
                        linkable: config?.rssLinkable === true,
                        showQr: config?.rssShowQr === true,
                        showDots: config?.rssShowDots !== false,
                        textOverflow: config?.rssTextOverflow || "truncate",
                        // rssColor war schon immer als AKZENT gemeint (Quelle +
                        // Punkte). Seit Akzent und Textfarbe getrennt sind,
                        // muss er auf rssAccent — sonst hätte er plötzlich den
                        // Fließtext eingefärbt. Die Textfarbe kommt weiter vom
                        // Karten-Theme.
                        rssAccent: config?.rssColor || "#f59e0b",
                    }}
                />
            </div>
        </div>
    ) : null;

    // ── Status-Karten — jede konfigurierte Karte dockt in den Stack, sobald
    // ihr Ereignis aktiv ist (Auto lädt, Drucker druckt, …). Müssen wie die
    // Media-Karten dauerhaft gemountet bleiben (melden Sichtbarkeit selbst). ──
    const statusCardsCfg: any[] = config?.statusEnabled !== false && Array.isArray(config?.statusCards)
        ? (config.statusCards as any[]).filter((c) => c && c.statusEntity)
        : [];
    const statusCardEm = Math.min(12, Math.max(3, Number(config?.statusCardHeightEm) || 4.5));
    const statusTop = config?.statusPosition === "top";
    const statusShowBorder = config?.statusShowBorder !== false;
    const statusBorderColor: string = (config?.statusBorderColor as string) || "";
    const statusBorderWidth = Math.max(0.25, Math.min(6, Number(config?.statusBorderWidth) || 1));
    const statusCards = statusCardsCfg.length > 0 ? statusCardsCfg.map((card, i) => {
        const cardVisible = statusVisibleMap[i] === true;
        return (
            <div
                key={`status-${i}`}
                className="w-full shrink-0 overflow-hidden transition-all duration-500 rounded-3xl"
                style={{
                    height: cardVisible ? `${statusCardEm}em` : 0,
                    opacity: cardVisible ? 1 : 0,
                    marginTop: cardVisible ? undefined : "-0.75rem",
                    backgroundColor: isLight ? `rgba(255,255,255,${cardOpacity / 100})` : `rgba(0,0,0,${cardOpacity / 100})`,
                    backdropFilter: cardBlur > 0 ? `blur(${cardBlur}px)` : "none",
                    border: cardVisible && statusShowBorder
                        ? `${statusBorderWidth}px solid ${statusBorderColor ? `${statusBorderColor}${hex2(0.5)}` : isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)"}`
                        : "none",
                    boxShadow: cardVisible && hasBg ? "0 8px 32px rgba(0,0,0,0.15)" : "none",
                }}
            >
                <StatusWidget
                    config={{ ...card, cardTheme: isLight ? "light" : "dark", frameRadius: 24, ...(config?.__demo ? { alwaysShow: true } : {}) }}
                    onVisibilityChange={(v) => setStatusVisibleMap((prev) => (prev[i] === v ? prev : { ...prev, [i]: v }))}
                />
            </div>
        );
    }) : null;

    if (source === "rules" && rules.length === 0 && !hasTimers && mediaPlayers.length === 0 && !hasRss && statusCardsCfg.length === 0) {
        return (
            <div className="text-white/50 text-[10px] uppercase text-center">
                {tr("Bitte Notification-Regeln im Editor konfigurieren")}
            </div>
        );
    }

    // Wirklich nichts da? → komplett verstecken (wie bisher). Mit
    // konfigurierten Playern/Feeds/Karten bleibt das Widget gemountet (siehe oben).
    if (!hasAlerts && !hasTimers && mediaPlayers.length === 0 && !hasRss && statusCardsCfg.length === 0) return null;

    // ── Timer-Karte: visuell wie eine Notification, einfach unter den Alerts ──
    const renderTimerCard = (timer: DockedTimer) => {
        const { progress, isDone, clock } = timerClock(timer, nowMs);
        const accent = isDone ? "#f97316" : "#10b981";

        if (isMinimal) {
            return (
                <div key={`timer-${timer.id}`} className="flex gap-[0.8em] items-center mb-[0.6em] group">
                    <span
                        className="shrink-0 w-[4px] rounded-full self-stretch my-1"
                        style={{ backgroundColor: accent }}
                    />
                    <div className="flex items-center justify-center h-full opacity-90" style={{ color: accent }}>
                        <Icon icon="mdi:timer-outline" className="text-[1.8em]" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 justify-center gap-[0.2em]">
                        <span
                            className={`font-bold leading-tight truncate ${isLight ? "text-black" : "text-white"}`}
                            style={{ fontSize: "1em" }}
                        >
                            {timer.label}
                        </span>
                        <div className="flex items-center gap-[0.5em]">
                            <div
                                className={`flex-1 h-[2px] rounded-full overflow-hidden ${
                                    isLight ? "bg-black/10" : "bg-white/15"
                                }`}
                            >
                                <div
                                    style={{
                                        width: `${progress * 100}%`,
                                        backgroundColor: accent,
                                        height: "100%",
                                        transition: "width 1s linear",
                                    }}
                                />
                            </div>
                            <span
                                className="font-mono tabular-nums tracking-tight"
                                style={{
                                    fontSize: "0.85em",
                                    color: isDone ? accent : isLight ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)",
                                }}
                            >
                                {isDone ? tr("FERTIG") : clock}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            dismissTimer(timer.id);
                        }}
                        className={`shrink-0 ${dismissBtnClass} w-6 h-6 flex items-center justify-center rounded-full ${
                            isLight ? "hover:bg-black/10 text-black/50" : "hover:bg-white/10 text-white/50"
                        }`}
                        title={tr("Timer beenden")}
                    >
                        <Icon icon="lucide:x" width={14} height={14} />
                    </button>
                </div>
            );
        }

        return (
            <div
                key={`timer-${timer.id}`}
                className={`group relative flex items-center justify-start gap-[0.8em] w-full rounded-3xl p-[0.6em] shrink-0 ${hasBg ? (isLight ? "border border-black/5" : "border border-white/10") : ""} ${hasBg ? "shadow-xl" : ""}`}
                style={{
                    backgroundColor: isLight ? `rgba(255,255,255,${cardOpacity / 100})` : `rgba(0,0,0,${cardOpacity / 100})`,
                    backdropFilter: cardBlur > 0 ? `blur(${cardBlur}px)` : "none",
                    boxShadow: hasBg ? `0 8px 32px ${accent}15` : "none",
                    borderLeft: hasBg ? `0.3em solid ${accent}` : "none",
                    animation: isDone ? "ha-timer-card-pulse 1.2s ease-in-out infinite" : undefined,
                }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        dismissTimer(timer.id);
                    }}
                    className={`absolute top-1 right-1 ${dismissBtnClass} w-7 h-7 flex items-center justify-center rounded-full ${
                        isLight ? "hover:bg-black/10 text-black/50" : "hover:bg-white/20 text-white/70"
                    } z-10`}
                    title={tr("Timer beenden")}
                >
                    <Icon icon="lucide:x" width={14} height={14} />
                </button>
                {renderTileIcon("mdi:timer-outline", accent)}
                <div className="flex flex-col min-w-0 flex-1 gap-[0.25em]">
                    <span
                        style={{ fontSize: "0.9em", color: isLight ? "rgba(0,0,0,0.9)" : "#fff" }}
                        className="font-bold tracking-tight leading-tight text-ellipsis whitespace-nowrap overflow-hidden"
                    >
                        {timer.label}
                    </span>
                    <div className="flex items-center gap-[0.5em]">
                        <div
                            className={`flex-1 h-[3px] rounded-full overflow-hidden ${
                                isLight ? "bg-black/10" : "bg-white/15"
                            }`}
                        >
                            <div
                                style={{
                                    width: `${progress * 100}%`,
                                    backgroundColor: accent,
                                    height: "100%",
                                    transition: "width 1s linear",
                                }}
                            />
                        </div>
                        <span
                            className="font-mono font-bold tracking-tight tabular-nums"
                            style={{
                                fontSize: "0.85em",
                                color: isDone ? accent : isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)",
                            }}
                        >
                            {isDone ? tr("FERTIG") : clock}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    // Andock-Position: über oder unter den Benachrichtigungen (Default unten).
    const mediaTop = config?.mediaPosition === "top";

    if (source === "persistent") {
        const visible = haPersistent.filter((n) => !dismissedIds.has(n.entityId)).slice(0, maxNotifications);
        return (
            <div className="flex flex-col gap-3 w-full h-full justify-start overflow-y-auto no-scrollbar pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {mediaTop && mediaCards}
                {rssTop && rssCard}
                {statusTop && statusCards}
                {visible.map((n) => {
                    const color = "#60A5FA";
                    const icon = "mdi:bell-ring";
                    const ageStr = n.createdAt ? formatNotifAge(new Date(n.createdAt), timeFormat, nowMs, locale) : "";

                    // Minimal-Design gab es bisher nur für eigene Regeln.
                    if (isMinimal) {
                        return (
                          <div key={n.id} className="group flex gap-[0.8em] items-center mb-[0.6em]">
                            <span className="shrink-0 w-[4px] rounded-full self-stretch my-1" style={{ backgroundColor: color }}></span>
                            <div className="flex items-center justify-center h-full opacity-80" style={{ color }}>
                               <Icon icon={icon} className="text-[1.8em]" />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0 justify-center">
                              <span className={`font-bold leading-tight truncate ${isLight ? 'text-black' : 'text-white'}`} style={{ fontSize: '1em' }}>
                                {n.title}
                              </span>
                              {n.message && (
                                <span className={`leading-snug line-clamp-2 ${isLight ? 'text-black/70' : 'text-white/70'}`} style={{ fontSize: '0.8em' }}>
                                  {n.message}
                                </span>
                              )}
                              {ageStr && (
                                <span className={`${isLight ? 'text-black/50' : 'text-white/50'}`} style={{ fontSize: '0.7em' }}>{ageStr}</span>
                              )}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); dismissHaPersistent(n.entityId); }}
                              className={`shrink-0 ${dismissBtnClass} w-6 h-6 flex items-center justify-center rounded-full ${isLight ? 'hover:bg-black/10 text-black/50' : 'hover:bg-white/10 text-white/50'}`}
                              title={tr("Wegwischen (auch in HA)")}
                            >
                              <Icon icon="lucide:x" width={14} height={14} />
                            </button>
                          </div>
                        );
                    }

                    return (
                        <div
                            key={n.id}
                            // items-center statt items-start: sonst klebt das Icon
                            // oben statt mittig zum Text.
                            className={`group relative flex items-center gap-[0.8em] w-full rounded-3xl p-[0.6em] shrink-0 overflow-hidden ${hasBg ? (isLight ? 'border border-black/5' : 'border border-white/10') : ''} ${hasBg ? 'shadow-xl' : ''}`}
                            style={{
                                backgroundColor: isLight ? `rgba(255,255,255,${cardOpacity / 100})` : `rgba(0,0,0,${cardOpacity / 100})`,
                                // Design-Einstellungen galten bisher nur für eigene
                                // Regeln — im Persistent-Modus sahen die Karten immer
                                // gleich aus, egal was eingestellt war.
                                ...(isTint ? {
                                  backgroundImage: tintGradient(color),
                                  ...(config?.tintAnimate === true
                                    ? { backgroundSize: "150% 100%", animation: "mf-tint-drift 11s ease-in-out infinite alternate" }
                                    : {}),
                                } : {}),
                                backdropFilter: cardBlur > 0 ? `blur(${cardBlur}px)` : 'none',
                                boxShadow: hasBg ? `0 8px 32px ${color}15` : 'none',
                                ...(cardBorderFor(color)
                                  ? { border: cardBorderFor(color), borderLeft: cardBorderFor(color) }
                                  : { borderLeft: hasBg && !isTint ? `0.3em solid ${color}` : 'none' }),
                            }}
                        >
                            <button
                              onClick={(e) => { e.stopPropagation(); dismissHaPersistent(n.entityId); }}
                              className={`absolute top-1 right-1 ${dismissBtnClass} w-7 h-7 flex items-center justify-center rounded-full ${isLight ? 'hover:bg-black/10 text-black/50' : 'hover:bg-white/20 text-white/70'} z-10`}
                              title={tr("Wegwischen (auch in HA)")}
                            >
                              <Icon icon="lucide:x" width={14} height={14} />
                            </button>
                            {renderTileIcon(icon, color)}
                            <div className="flex flex-col min-w-0 flex-1">
                              <span style={{ fontSize: '0.9em', color: isLight ? "rgba(0,0,0,0.9)" : "#fff" }} className="font-bold tracking-tight leading-tight text-ellipsis whitespace-nowrap overflow-hidden">
                                {n.title}
                              </span>
                              {n.message && (
                                <span style={{ fontSize: '0.75em', color: isLight ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.7)" }} className="leading-snug line-clamp-2 mt-0.5">
                                  {n.message}
                                </span>
                              )}
                              {ageStr && (
                                <span className="mt-1 font-mono uppercase tracking-wider text-ellipsis whitespace-nowrap overflow-hidden" style={{ fontSize: '0.65em', color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}>
                                  {ageStr}
                                </span>
                              )}
                            </div>
                        </div>
                    );
                })}
                {!mediaTop && mediaCards}
                {!rssTop && rssCard}
                {!statusTop && statusCards}
                {hasTimers && activeTimers.map(renderTimerCard)}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 w-full h-full justify-start overflow-y-auto no-scrollbar pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {mediaTop && mediaCards}
            {rssTop && rssCard}
            {statusTop && statusCards}
            {activeAlertArray.map((alert) => {
                const rule = alert.rule;
                const color = rule.color || "#F43F5E";
                const icon = rule.icon || "mdi:bell-ring";
                const timeString = formatNotifAge(new Date(alert.triggerTime), timeFormat, nowMs, locale);
                const isTappable = rule.tapAction && rule.tapAction !== 'none';

                if (isMinimal) {
                     return (
                       <div key={alert.key} className={`flex gap-[0.8em] items-center mb-[0.6em] transition-transform group ${isTappable ? 'cursor-pointer active:scale-95' : ''}`} onClick={() => handleTap(rule)}>
                         <span className={`shrink-0 w-[4px] rounded-full self-stretch my-1 ${isLight ? 'bg-black' : 'bg-white'}`} style={{ backgroundColor: color }}></span>
                         <div className="flex items-center justify-center h-full opacity-80" style={{ color: color }}>
                            <Icon icon={icon} className="text-[1.8em]" />
                         </div>
                         <div className="flex flex-col flex-1 min-w-0 justify-center">
                           <span className={`font-bold leading-tight truncate ${isLight ? 'text-black' : 'text-white'}`} style={{ fontSize: '1em' }}>
                               {rule.message || `${rule.entityId} Alert!`}
                           </span>
                           <span className={`text-[0.8em] ${isLight ? 'text-black/50' : 'text-white/50'}`}>{timeString}</span>
                         </div>
                         <button
                           onClick={(e) => { e.stopPropagation(); dismissAlert(alert.configIndex); }}
                           className={`shrink-0 ${dismissBtnClass} w-6 h-6 flex items-center justify-center rounded-full ${isLight ? 'hover:bg-black/10 text-black/50' : 'hover:bg-white/10 text-white/50'}`}
                           title={tr("Wegwischen")}
                         >
                           <Icon icon="lucide:x" width={14} height={14} />
                         </button>
                       </div>
                     );
                }

                return (
                    <div
                        key={alert.key}
                        onClick={() => handleTap(rule)}
                        className={`group relative flex items-center justify-start gap-[0.8em] w-full rounded-3xl p-[0.6em] transform transition-transform shrink-0 overflow-hidden ${hasBg ? (isLight ? 'border border-black/5' : 'border border-white/10') : ''} ${hasBg ? 'shadow-xl' : ''} ${isTappable ? 'cursor-pointer active:scale-95' : ''}`}
                        style={{
                            backgroundColor: isLight ? `rgba(255,255,255,${cardOpacity / 100})` : `rgba(0,0,0,${cardOpacity / 100})`,
                            // Media-Stil: sanfte Farbtönung von links statt Farbkante,
                            // Stärke/Reichweite regelbar (tintStrength).
                            ...(isTint ? {
                              backgroundImage: tintGradient(color),
                              // sanftes Driften (opt-in): kleiner Spielraum, damit die
                              // Farbe nie ganz verschwindet, nur gemächlich atmet.
                              ...(config?.tintAnimate === true
                                ? { backgroundSize: "150% 100%", animation: "mf-tint-drift 11s ease-in-out infinite alternate" }
                                : {}),
                            } : {}),
                            backdropFilter: cardBlur > 0 ? `blur(${cardBlur}px)` : 'none',
                            boxShadow: hasBg ? `0 8px 32px ${color}15` : 'none',
                            // Rahmen: gewählter Rahmen gewinnt, sonst die bisherige
                            // Farbkante links (nur im Nicht-Tint-Design).
                            ...(cardBorderFor(color)
                              ? { border: cardBorderFor(color), borderLeft: cardBorderFor(color) }
                              : { borderLeft: hasBg && !isTint ? `0.3em solid ${color}` : 'none' }),
                        }}
                    >
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissAlert(alert.configIndex); }}
                          className={`absolute top-1 right-1 ${dismissBtnClass} w-7 h-7 flex items-center justify-center rounded-full ${isLight ? 'hover:bg-black/10 text-black/50' : 'hover:bg-white/20 text-white/70'} z-10`}
                          title={tr("Wegwischen")}
                        >
                          <Icon icon="lucide:x" width={14} height={14} />
                        </button>
                        {renderTileIcon(icon, color)}
                        <div className="flex flex-col min-w-0 flex-1">
                            <span style={{ fontSize: '0.9em', color: isLight ? "rgba(0,0,0,0.9)" : "#fff" }} className="font-bold tracking-tight leading-tight text-ellipsis whitespace-nowrap overflow-hidden">
                                {rule.message || `${rule.entityId} Alert!`}
                            </span>
                            <span className="flex items-baseline gap-[0.3em] font-mono uppercase tracking-wider mt-[0.2em] text-ellipsis whitespace-nowrap overflow-hidden" style={{ fontSize: '0.7em', color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}>
                                {timeString}
                            </span>
                        </div>
                    </div>
                );
            })}
            {!mediaTop && mediaCards}
            {!rssTop && rssCard}
            {!statusTop && statusCards}
            {hasTimers && activeTimers.map(renderTimerCard)}
        </div>
    );
}

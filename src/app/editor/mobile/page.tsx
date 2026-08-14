"use client";

import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import {
  Plus,
  Save,
  LogOut,
  Settings as SettingsIcon,
  Image as ImageIcon,
  Menu,
  ExternalLink,
  ChevronRight,
  Monitor,
  X,
} from "lucide-react";
import MagicFrameLogo from "../../../components/MagicFrameLogo";

import {
  WidgetLayoutItem,
  WallpaperConfig,
  defaultLayout,
  widgetTitle,
  WIDGET_DEFAULT_SIZE,
} from "../_types";
import AddWidgetModal from "../_components/AddWidgetModal";
import WallpaperSettingsModal, { type ImmichAlbum, type ImmichPerson } from "../_components/WallpaperSettingsModal";
import IntegrationsModal from "../_components/IntegrationsModal";
import DashboardSettingsModal from "../_components/DashboardSettingsModal";
import InspectorPanel from "../_components/InspectorPanel";
import { LocaleProvider, useT } from "@/lib/i18n/LocaleProvider";

export default function MobileEditor() {
  return (
    <LocaleProvider>
      <MobileEditorInner />
    </LocaleProvider>
  );
}

function MobileEditorInner() {
  const t = useT();
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(defaultLayout);
  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showBgSettings, setShowBgSettings] = useState(false);
  const [showHASettings, setShowHASettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>({
    source: "unsplash",
    query: "nature,landscape",
    intervalSec: 60,
    showMetadata: true,
  });
  const [settings, setSettings] = useState<any>({ haUrl: "", haToken: "" });

  const [webdavFolders, setWebdavFolders] = useState<any[]>([]);
  // Bildzahl des gerade geöffneten Ordners (#80) — {usable, unsupported}.
  const [webdavImages, setWebdavImages] = useState<{ usable: number; unsupported: number } | null>(null);
  const [isFetchingFolders, setIsFetchingFolders] = useState(false);
  const [webdavError, setWebdavError] = useState("");
  const [immichAlbums, setImmichAlbums] = useState<ImmichAlbum[]>([]);
  const [isFetchingAlbums, setIsFetchingAlbums] = useState(false);
  const [immichPeople, setImmichPeople] = useState<ImmichPerson[]>([]);
  const [isFetchingPeople, setIsFetchingPeople] = useState(false);
  const [immichError, setImmichError] = useState("");

  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [citySearchResults, setCitySearchResults] = useState<any[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [buttonTab, setButtonTab] = useState("1");

  const [dashboards, setDashboards] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [currentDashboardId, setCurrentDashboardId] = useState("1");
  const [showDashboardSettings, setShowDashboardSettings] = useState(false);
  const [editDashboardName, setEditDashboardName] = useState("");
  const [editDashboardSlug, setEditDashboardSlug] = useState("");
  const [socket, setSocket] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<null | "saving" | "saved" | "error">(null);

  useEffect(() => {
    const s = io();
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  const loadLayoutForDashboard = (dashboardId: string) => {
    fetch(`/api/layout/get?dashboardId=${dashboardId}&t=${Date.now()}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.layout)) {
          const populatedLayout = data.layout.map((item: any) => ({
            ...item,
            config: item.config?.fontSize
              ? item.config
              : { fontSize: 20, fontFamily: "Inter" },
          }));
          setLayout(populatedLayout);
        } else {
          setLayout(defaultLayout);
        }
        if (data.wallpaper) setWallpaper(data.wallpaper);
        if (data.settings) setSettings(data.settings);
      })
      .catch((err) => console.error("Error loading layout:", err));
  };

  const refreshDashboardsList = async (selectId?: string) => {
    try {
      const res = await fetch(`/api/dashboards?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data && data.length > 0) {
        setDashboards(data);
        const target = selectId ?? currentDashboardId;
        const exists = data.find((d: any) => d.id === target);
        const effectiveId = exists ? target : data[0].id;
        setCurrentDashboardId(effectiveId);
        loadLayoutForDashboard(effectiveId);
      } else {
        setDashboards([{ id: "1", name: t("View 1") }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshDashboardsList("1");
  }, []);

  const handleDashboardChange = (id: string) => {
    setCurrentDashboardId(id);
    loadLayoutForDashboard(id);
  };

  const handleSaveDashboardMeta = async () => {
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldId: currentDashboardId,
          id: editDashboardSlug,
          name: editDashboardName,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(t(data.error));
        return;
      }
      setShowDashboardSettings(false);
      refreshDashboardsList(data.id);
    } catch {
      alert(t("Fehler beim Speichern des Dashboards."));
    }
  };

  const handleDeleteDashboard = async () => {
    if (
      !confirm(
        t("Dashboard wirklich löschen? Diese Aktion löscht alle Widgets auf diesem View und kann nicht rückgängig gemacht werden."),
      )
    )
      return;
    try {
      await fetch(`/api/dashboards?id=${currentDashboardId}`, {
        method: "DELETE",
      });
      setShowDashboardSettings(false);
      refreshDashboardsList();
    } catch {
      alert(t("Fehler beim Löschen."));
    }
  };

  const updateLayoutGrid = (i: string, key: string, value: number) => {
    setLayout((prev) =>
      prev.map((item) => (item.i === i ? { ...item, [key]: value } : item)),
    );
  };
  const updateOpacity = (i: string, opacity: number) => {
    setLayout((prev) =>
      prev.map((item) =>
        item.i === i ? { ...item, bgOpacity: opacity } : item,
      ),
    );
  };
  const updateConfig = (i: string, key: string, value: any) => {
    setLayout((prev) =>
      prev.map((item) =>
        item.i === i
          ? { ...item, config: { ...item.config, [key]: value } }
          : item,
      ),
    );
  };
  const updateLabel = (i: string, label: string) => {
    setLayout((prev) => prev.map((item) => (item.i === i ? { ...item, label } : item)));
  };

  const addWidget = (type: string) => {
    const newId = Math.random().toString(36).substring(7);
    // Empty label — title is derived from the type and localised at render.
    // See the desktop editor for the rationale (issue #7).
    const label = "";

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
      config: { fontSize: 20, fontFamily: "var(--font-geist-sans)" },
    };
    setLayout((prev) => [...prev, newWidget]);
    setShowAddWidget(false);
    setActiveSettingsId(newId);
  };

  const removeWidget = (id: string) => {
    setLayout((prev) => prev.filter((w) => w.i !== id));
    setActiveSettingsId(null);
  };

  const moveWidget = (i: string, direction: -1 | 1) => {
    setLayout((prev) => {
      const idx = prev.findIndex((w) => w.i === i);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/layout/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout,
          wallpaper,
          settings,
          dashboardId: currentDashboardId,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      // LAYOUT_UPDATED sendet /api/layout/sync serverseitig.
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 2500);
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
        body: JSON.stringify({ url: wallpaper.immichUrl, apiKey: wallpaper.immichApiKey }),
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

  const copyWidgetToClipboard = (widget: any) => {
    localStorage.setItem("magic_widget_clipboard", JSON.stringify(widget));
    alert(t("Modul kopiert."));
  };

  const activeWidget = activeSettingsId
    ? layout.find((w) => w.i === activeSettingsId)
    : null;

  return (
    <div className="mf-admin min-h-screen bg-[var(--mf-surface)] text-[var(--mf-fg)] flex flex-col">
      <header className="sticky top-0 z-20 bg-[var(--mf-surface)]/90 backdrop-blur border-b border-[var(--mf-bdr)]/10 px-4 py-3 flex items-center gap-3">
        <MagicFrameLogo className="w-8 h-8 shrink-0" />
        <select
          value={currentDashboardId}
          onChange={(e) => handleDashboardChange(e.target.value)}
          className="flex-1 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 min-w-0"
        >
          {dashboards.map((db) => (
            <option key={db.id} value={db.id}>
              {db.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className={`shrink-0 p-2.5 rounded-full transition-colors ${
            saveStatus === "saved"
              ? "bg-green-600 text-white"
              : saveStatus === "error"
                ? "bg-red-600 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
          title={t("Speichern")}
        >
          <Save size={18} />
        </button>
        <button
          onClick={() => setShowMenu(true)}
          className="shrink-0 p-2.5 rounded-full bg-[var(--mf-surface-2)] hover:bg-[var(--mf-surface-2)] text-[var(--mf-fg)]/80 hover:text-[var(--mf-fg)] border border-[var(--mf-bdr)]/10"
          title={t("Menü")}
        >
          <Menu size={18} />
        </button>
      </header>

      {saveStatus === "saved" && (
        <div className="bg-green-600/20 border-b border-green-500/30 text-green-300 text-center text-xs py-2">
          {t("Gespeichert & mit Displays synchronisiert.")}
        </div>
      )}
      {saveStatus === "error" && (
        <div className="bg-red-600/20 border-b border-red-500/30 text-red-300 text-center text-xs py-2">
          {t("Speichern fehlgeschlagen. Sitzung evtl. abgelaufen.")}
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 pb-28">
        {layout.length === 0 ? (
          <div className="text-center text-[var(--mf-fg)]/50 py-16">
            <p className="mb-4">{t("Keine Widgets auf diesem Dashboard.")}</p>
            <button
              onClick={() => setShowAddWidget(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full text-sm font-medium"
            >
              {t("Erstes Modul hinzufügen")}
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {layout.map((w, idx) => (
              <li
                key={w.i}
                onClick={() => setActiveSettingsId(w.i)}
                className="flex items-center gap-3 bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 rounded-xl p-3 active:bg-[var(--mf-surface-2)] cursor-pointer"
              >
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveWidget(w.i, -1);
                    }}
                    disabled={idx === 0}
                    className="p-1 text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)] disabled:opacity-20"
                    title={t("Nach oben")}
                  >
                    ▲
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveWidget(w.i, 1);
                    }}
                    disabled={idx === layout.length - 1}
                    className="p-1 text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)] disabled:opacity-20"
                    title={t("Nach unten")}
                  >
                    ▼
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--mf-fg)] truncate">
                    {widgetTitle(w.type, w.label, t)}
                  </div>
                  <div className="text-xs text-[var(--mf-fg)]/50 truncate">
                    {w.type.replace("Widget.tsx", "")} · {w.w}×{w.h} · Pos {w.x},
                    {w.y}
                  </div>
                </div>
                <ChevronRight size={18} className="text-[var(--mf-fg)]/30 shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </main>

      <button
        onClick={() => setShowAddWidget(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-2xl shadow-blue-500/40 z-10"
        title={t("Modul hinzufügen")}
      >
        <Plus size={22} />
      </button>

      {showMenu && (
        <div
          className="fixed inset-0 bg-[var(--mf-backdrop)]/60 backdrop-blur-sm z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="bg-[var(--mf-surface-2)] border-t sm:border border-[var(--mf-bdr)]/10 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-[var(--mf-bdr)]/10">
              <h3 className="font-semibold text-[var(--mf-fg)]">{t("Menü")}</h3>
              <button
                onClick={() => setShowMenu(false)}
                className="p-1 text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2">
              <MenuItem
                icon={<ImageIcon size={18} />}
                label={t("Wallpaper Engine")}
                onClick={() => {
                  setShowMenu(false);
                  setShowBgSettings(true);
                }}
              />
              <MenuItem
                icon={<span className="text-lg">🏡</span>}
                label={t("Integrationen")}
                onClick={() => {
                  setShowMenu(false);
                  setShowHASettings(true);
                }}
              />
              <MenuItem
                icon={<SettingsIcon size={18} />}
                label={t("Dashboard-Einstellungen")}
                onClick={() => {
                  const current = dashboards.find(
                    (d) => d.id === currentDashboardId,
                  );
                  setEditDashboardName(current?.name || "");
                  setEditDashboardSlug(currentDashboardId);
                  setShowMenu(false);
                  setShowDashboardSettings(true);
                }}
              />
              <MenuItem
                icon={<Plus size={18} />}
                label={t("Neues Dashboard")}
                onClick={() => {
                  setEditDashboardName(t("Neues Dashboard"));
                  setEditDashboardSlug("neu");
                  setCurrentDashboardId("");
                  setShowMenu(false);
                  setShowDashboardSettings(true);
                }}
              />
              <div className="h-px bg-[var(--mf-elev)]/10 my-2" />
              <MenuItem
                icon={<ExternalLink size={18} />}
                label={t("View öffnen")}
                onClick={() => {
                  window.open(`/view/${currentDashboardId}`, "_blank");
                  setShowMenu(false);
                }}
              />
              <MenuItem
                icon={<Monitor size={18} />}
                label={t("Desktop-Editor")}
                onClick={() => {
                  window.location.href = "/editor?forceDesktop=1";
                }}
              />
              <div className="h-px bg-[var(--mf-elev)]/10 my-2" />
              <MenuItem
                icon={<LogOut size={18} />}
                label={t("Abmelden")}
                danger
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeWidget && (
        <InspectorPanel
          activeWidget={activeWidget}
          layout={layout}
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
        />
      )}

      {showAddWidget && (
        <AddWidgetModal
          onClose={() => setShowAddWidget(false)}
          addWidget={addWidget}
        />
      )}
      {showHASettings && (
        <IntegrationsModal
          onClose={() => setShowHASettings(false)}
          settings={settings}
          setSettings={setSettings}
        />
      )}
      {showBgSettings && (
        <WallpaperSettingsModal
          onClose={() => setShowBgSettings(false)}
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
      {showDashboardSettings && (
        <DashboardSettingsModal
          onClose={() => setShowDashboardSettings(false)}
          editDashboardName={editDashboardName}
          setEditDashboardName={setEditDashboardName}
          editDashboardSlug={editDashboardSlug}
          setEditDashboardSlug={setEditDashboardSlug}
          currentDashboardId={currentDashboardId}
          dashboards={dashboards}
          handleSaveDashboardMeta={handleSaveDashboardMeta}
          handleDeleteDashboard={handleDeleteDashboard}
        />
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-[var(--mf-fg)]/90 hover:bg-[var(--mf-elev)]/5"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
    </button>
  );
}

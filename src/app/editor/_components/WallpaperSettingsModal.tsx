"use client";

import React, { useState } from 'react';
import { X, FolderSync, RefreshCw, Music } from 'lucide-react';
import type { WallpaperConfig } from '../_types';
import { useT } from "@/lib/i18n/LocaleProvider";
import HAEntityInput from './HAEntityInput';

export type ImmichAlbum = { id: string; albumName: string; assetCount: number };
export type ImmichPerson = { id: string; name: string; thumbnailUrl: string };

type WallpaperSettingsModalProps = {
  onClose?: () => void;
  wallpaper: WallpaperConfig;
  setWallpaper: React.Dispatch<React.SetStateAction<WallpaperConfig>>;
  webdavFolders: any[];
  fetchWebdavFolders: (path?: string) => void;
  isFetchingFolders: boolean;
  webdavError: string;
  // Bilder im gerade geöffneten WebDAV-Ordner (#80) — sichtbar machen, dass
  // ein Ordner nichts Brauchbares enthält, bevor der Bildschirm schwarz bleibt.
  webdavImages?: { usable: number; unsupported: number } | null;
  variant?: "modal" | "inline";
  // Immich-Alben (optional — wenn nicht übergeben, bleibt der manuelle ID-Fallback)
  immichAlbums?: ImmichAlbum[];
  fetchImmichAlbums?: () => void;
  isFetchingAlbums?: boolean;
  immichError?: string;
  // Immich-Personen (#75) — optional, damit ältere Aufrufstellen unverändert bleiben
  immichPeople?: ImmichPerson[];
  fetchImmichPeople?: () => void;
  isFetchingPeople?: boolean;
};

type WpTab = "source" | "display" | "overlays";

export default function WallpaperSettingsModal({
  onClose,
  wallpaper,
  setWallpaper,
  webdavFolders,
  fetchWebdavFolders,
  isFetchingFolders,
  webdavError,
  webdavImages = null,
  variant = "modal",
  immichAlbums,
  fetchImmichAlbums,
  isFetchingAlbums = false,
  immichError = "",
  immichPeople,
  fetchImmichPeople,
  isFetchingPeople = false,
}: WallpaperSettingsModalProps) {
  const t = useT();
  const [tab, setTab] = useState<WpTab>("source");

  // Übergangs-Effekt + abgeleitete Default-Dauer (für die Anzeige-Tab-Slider).
  // Defaults spiegeln die Engine: slide 1200 ms, sonst 1500 ms.
  const effectiveTransition =
    wallpaper.transitionEffect ?? (wallpaper.zoomEffect ? "kenburns" : "crossfade");
  const defaultTransMs = effectiveTransition === "slide" ? 1200 : 1500;
  const transMs = wallpaper.transitionMs ?? defaultTransMs;
  const immichMode = wallpaper.immichMode || "album";

  const TABS: { key: WpTab; label: string }[] = [
    { key: "source", label: "Quelle" },
    { key: "display", label: "Anzeige" },
    { key: "overlays", label: "Overlays & Text" },
  ];

  const inner = (
    <>
       {variant === "modal" && (
         <div className="flex justify-between items-center mb-6">
            <div>
               <h3 className="font-bold text-2xl text-[var(--mf-fg)]">{t("Wallpaper Engine")}</h3>
               <p className="text-[var(--mf-fg)]/50 text-sm mt-1">{t("Display-Hintergründe konfigurieren")}</p>
            </div>
            <button onClick={onClose} className="bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/20 text-[var(--mf-fg)] rounded-full p-2" title={t("Schließen")}><X size={18} /></button>
         </div>
       )}

       {/* Untertabs — der Modal war als eine lange Spalte zu groß. */}
       <div className="flex gap-1 mb-6 border-b border-[var(--mf-bdr)]/10">
          {TABS.map(({ key, label }) => (
             <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                   tab === key
                      ? "border-blue-500 text-[var(--mf-fg)]"
                      : "border-transparent text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]/80"
                }`}
             >
                {t(label)}
             </button>
          ))}
       </div>

       <div className="space-y-6">
          {/* ─────────────── TAB: QUELLE ─────────────── */}
          {tab === "source" && (
            <>
             <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Provider")}</label>
                <select
                   value={wallpaper.source}
                   onChange={(e) => setWallpaper({ ...wallpaper, source: e.target.value })}
                   className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                >
                   <option value="bundled">{t("Mitgelieferte Bilder (Standard)")}</option>
                   <option value="color">{t("Vollfarbe (einfarbiger Hintergrund)")}</option>
                   <option value="unsplash">{t("Unsplash (Dynamisch via Suchbegriff)")}</option>
                   <option value="url">{t("Feste Bild-URL")}</option>
                   <option value="webdav">{t("Lokaler NAS Ordner (WebDAV)")}</option>
                   <option value="immich">{t("Immich API (Album)")}</option>
                </select>
             </div>

             {wallpaper.source === 'bundled' ? (
                <div className="bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-xl p-4 text-sm text-[var(--mf-fg)]/60 leading-relaxed">
                   {t("20 mitgelieferte Bilder — kein Setup nötig. Ideal als Start für einen neuen View. Du kannst jederzeit auf eine eigene Quelle (Immich, NAS, URL) wechseln.")}
                </div>
             ) : wallpaper.source === 'color' ? (
                <div className="space-y-3">
                   <label className="text-sm font-medium text-[var(--mf-fg)]/80 block">{t("Hintergrundfarbe")}</label>
                   <div className="flex items-center gap-3">
                      <input
                         type="color"
                         value={wallpaper.bgColor || '#0f172a'}
                         onChange={(e) => setWallpaper({ ...wallpaper, bgColor: e.target.value })}
                         className="w-14 h-14 rounded-lg border border-[var(--mf-bdr)]/20 bg-transparent cursor-pointer shrink-0"
                      />
                      <input
                         type="text"
                         value={wallpaper.bgColor || '#0f172a'}
                         onChange={(e) => setWallpaper({ ...wallpaper, bgColor: e.target.value })}
                         placeholder="#0f172a"
                         className="flex-1 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-mono rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                      />
                   </div>
                   <p className="text-[11px] text-[var(--mf-fg)]/40">{t("Einfarbiger Hintergrund statt Bild — keine Slideshow, kein Cache.")}</p>
                </div>
             ) : wallpaper.source === 'immich' ? (
                <div className="space-y-4">
                   <div>
                      <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Immich Instanz URL (Domain)")}</label>
                      <input
                         type="text" value={wallpaper.immichUrl || ''}
                         onChange={(e) => setWallpaper({ ...wallpaper, immichUrl: e.target.value })}
                         placeholder="http://192.168.178.50:2283"
                         className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                      />
                   </div>
                   <div>
                      <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("API-Key (Read Only)")}</label>
                      <input
                         type="password" value={wallpaper.immichApiKey || ''}
                         onChange={(e) => setWallpaper({ ...wallpaper, immichApiKey: e.target.value })}
                         placeholder="•••••••••••••••••••••"
                         className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                      />
                      <p className="text-[11px] text-[var(--mf-fg)]/40 mt-2">
                         {t("Beides leer lassen, um die globale Immich-Verbindung aus Einstellungen → Integrationen zu benutzen.")}
                      </p>
                   </div>

                   <div>
                      <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Immich-Quelle")}</label>
                      <select
                         value={immichMode}
                         onChange={(e) => setWallpaper({ ...wallpaper, immichMode: e.target.value as "album" | "favorites" | "memories" | "people" })}
                         className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-xl p-4 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                      >
                         <option value="album">{t("Album")}</option>
                         <option value="favorites">{t("Favoriten")}</option>
                         <option value="memories">{t("Rückblicke (Memories)")}</option>
                         <option value="people">{t("Personen")}</option>
                      </select>
                   </div>

                   {immichMode === "favorites" && (
                      <div className="bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-xl p-4 text-sm text-[var(--mf-fg)]/60 leading-relaxed">
                         {t("Zeigt alle in Immich favorisierten Fotos (Stern). Kein Album nötig.")}
                      </div>
                   )}
                   {immichMode === "memories" && (
                      <div className="bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-xl p-4 text-sm text-[var(--mf-fg)]/60 leading-relaxed">
                         {t("Zeigt deine Immich-Rückblicke („vor X Jahren an diesem Tag“). Aktualisiert sich automatisch.")}
                      </div>
                   )}

                   {immichMode === "people" && (fetchImmichPeople ? (
                     <div className="space-y-3">
                        <button
                           type="button"
                           onClick={() => fetchImmichPeople()}
                           disabled={isFetchingPeople}
                           className="w-full flex items-center justify-center gap-2 bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/20 text-[var(--mf-fg)] py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {isFetchingPeople
                             ? <><RefreshCw size={16} className="animate-spin" /> {t("Lade Personen…")}</>
                             : <><FolderSync size={16} /> {t("Mit Immich verbinden / Personen laden")}</>}
                        </button>

                        {immichError && (
                           <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                              {t(immichError)}
                           </div>
                        )}

                        {immichPeople && immichPeople.length > 0 && (() => {
                           // Alte Views mit einem einzelnen immichPersonId werden
                           // hier weiter angehakt und beim ersten Klick sauber in
                           // die Liste überführt (#75).
                           const selected: string[] =
                              Array.isArray(wallpaper.immichPersonIds) && wallpaper.immichPersonIds.length > 0
                                 ? wallpaper.immichPersonIds
                                 : (wallpaper.immichPersonId ? [wallpaper.immichPersonId] : []);
                           const toggle = (id: string) => {
                              const next = selected.includes(id)
                                 ? selected.filter((x) => x !== id)
                                 : [...selected, id];
                              setWallpaper({
                                 ...wallpaper,
                                 immichPersonIds: next,
                                 // Einzelfeld mitführen: ältere Clients/Backups lesen es noch.
                                 immichPersonId: next[0] || "",
                              });
                           };
                           return (
                              <div>
                                 <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
                                    {t("Personen auswählen ({n} gefunden)").replace("{n}", String(immichPeople.length))}
                                 </label>
                                 <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--mf-bdr)]/10 bg-[var(--mf-surface)] p-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {immichPeople.map((p) => {
                                       const checked = selected.includes(p.id);
                                       return (
                                          <button
                                             key={p.id}
                                             type="button"
                                             onClick={() => toggle(p.id)}
                                             aria-pressed={checked}
                                             className="flex flex-col items-center gap-1.5 group"
                                          >
                                             <img
                                                src={p.thumbnailUrl}
                                                alt=""
                                                className={`w-14 h-14 rounded-full object-cover transition-all ${
                                                   checked
                                                      ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-[var(--mf-surface)]"
                                                      : "opacity-60 group-hover:opacity-100"
                                                }`}
                                                loading="lazy"
                                                decoding="async"
                                             />
                                             <span
                                                className={`text-[11px] text-center leading-tight truncate w-full ${
                                                   checked ? "text-[var(--mf-fg)]" : "text-[var(--mf-fg)]/50"
                                                }`}
                                             >
                                                {p.name}
                                             </span>
                                          </button>
                                       );
                                    })}
                                 </div>
                                 <p className="text-[11px] text-[var(--mf-fg)]/40 mt-2 px-1">
                                    {selected.length === 0
                                       ? t("Noch niemand gewählt — ohne Auswahl bleibt der Rahmen leer.")
                                       : t("Zeigt jedes Foto, auf dem mindestens eine der gewählten Personen zu sehen ist.")}
                                 </p>
                              </div>
                           );
                        })()}

                        {immichPeople && immichPeople.length === 0 && !isFetchingPeople && !immichError && (
                           <p className="text-xs text-[var(--mf-fg)]/40 px-1">
                              {t("Noch keine Personen geladen. Es erscheinen nur Personen, denen in Immich ein Name gegeben wurde.")}
                           </p>
                        )}
                     </div>
                   ) : (
                     <div>
                        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Personen-ID (manuell)")}</label>
                        <input
                           type="text" value={wallpaper.immichPersonId || ''}
                           onChange={(e) => setWallpaper({ ...wallpaper, immichPersonId: e.target.value })}
                           placeholder={t("z.B. a2f...")}
                           className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                        />
                     </div>
                   ))}

                   {immichMode === "album" && (fetchImmichAlbums ? (
                     <div className="space-y-3">
                        <button
                           type="button"
                           onClick={() => fetchImmichAlbums()}
                           disabled={isFetchingAlbums}
                           className="w-full flex items-center justify-center gap-2 bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/20 text-[var(--mf-fg)] py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {isFetchingAlbums
                             ? <><RefreshCw size={16} className="animate-spin" /> {t("Lade Alben…")}</>
                             : <><FolderSync size={16} /> {t("Mit Immich verbinden / Alben laden")}</>}
                        </button>

                        {immichError && (
                           <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                              {t(immichError)}
                           </div>
                        )}

                        {immichAlbums && immichAlbums.length > 0 && (
                           <div>
                              <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
                                 {t("Alben auswählen ({n} gefunden)").replace("{n}", String(immichAlbums.length))}
                              </label>
                              {/* #40: Mehrfachauswahl. Alte Views mit einem
                                  einzelnen immichAlbumId werden hier weiter
                                  korrekt angehakt und beim ersten Klick
                                  sauber in die Liste überführt. */}
                              <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--mf-bdr)]/10 bg-[var(--mf-surface)] divide-y divide-[var(--mf-bdr)]/5">
                                 {immichAlbums.map((al) => {
                                    const selected: string[] = Array.isArray(wallpaper.immichAlbumIds) && wallpaper.immichAlbumIds.length > 0
                                       ? wallpaper.immichAlbumIds
                                       : (wallpaper.immichAlbumId ? [wallpaper.immichAlbumId] : []);
                                    const checked = selected.includes(al.id);
                                    return (
                                       <label key={al.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--mf-elev)]/5 transition-colors">
                                          <input
                                             type="checkbox"
                                             checked={checked}
                                             onChange={() => {
                                                const next = checked
                                                   ? selected.filter((x) => x !== al.id)
                                                   : [...selected, al.id];
                                                setWallpaper({
                                                   ...wallpaper,
                                                   immichAlbumIds: next,
                                                   // Einzelfeld mitführen: ältere Clients/Backups lesen es noch.
                                                   immichAlbumId: next[0] || "",
                                                });
                                             }}
                                             className="w-4 h-4 rounded accent-blue-500 shrink-0"
                                          />
                                          <span className="text-sm text-[var(--mf-fg)]/85 truncate flex-1">{al.albumName}</span>
                                          <span className="text-[11px] text-[var(--mf-fg)]/35 shrink-0 tabular-nums">{al.assetCount} {t("Fotos")}</span>
                                       </label>
                                    );
                                 })}
                              </div>
                              <p className="text-[11px] text-[var(--mf-fg)]/40 mt-2 px-1">
                                 {t("Mehrere Alben werden zu einer Diashow zusammengeführt; doppelte Fotos erscheinen nur einmal.")}
                              </p>
                           </div>
                        )}

                        {immichAlbums && immichAlbums.length === 0 && !isFetchingAlbums && !immichError && (
                           <p className="text-xs text-[var(--mf-fg)]/40 px-1">
                              {t("Noch keine Alben geladen. „Alben laden“ drücken — ohne eigene Zugangsdaten wird die globale Verbindung benutzt.")}
                           </p>
                        )}

                        {(() => {
                           const sel: string[] = Array.isArray(wallpaper.immichAlbumIds) && wallpaper.immichAlbumIds.length > 0
                              ? wallpaper.immichAlbumIds
                              : (wallpaper.immichAlbumId ? [wallpaper.immichAlbumId] : []);
                           if (sel.length === 0) return null;
                           return (
                              <p className="text-[11px] text-[var(--mf-fg)]/30 px-1 font-mono break-all">
                                 {sel.length === 1
                                    ? `${t("Ausgewählte ID:")} ${sel[0]}`
                                    : `${sel.length} ${t("Alben ausgewählt")}`}
                              </p>
                           );
                        })()}
                     </div>
                   ) : (
                     <div>
                        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Album ID (manuell)")}</label>
                        <input
                           type="text" value={wallpaper.immichAlbumId || ''}
                           onChange={(e) => setWallpaper({ ...wallpaper, immichAlbumId: e.target.value })}
                           placeholder={t("z.B. a2f...")}
                           className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                        />
                     </div>
                   ))}
                </div>
             ) : wallpaper.source === 'webdav' ? (
                <div className="space-y-4">
                   <div>
                      <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("WebDAV Server-URL (z.B. NAS)")}</label>
                      <input
                         type="text" value={wallpaper.webdavUrl || ''}
                         onChange={(e) => setWallpaper({ ...wallpaper, webdavUrl: e.target.value })}
                         placeholder="http://192.168.178.50:5005"
                         className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                      />
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                         <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Benutzername")}</label>
                         <input
                            type="text" value={wallpaper.webdavUser || ''}
                            onChange={(e) => setWallpaper({ ...wallpaper, webdavUser: e.target.value })}
                            placeholder="admin"
                            className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                         />
                      </div>
                      <div>
                         <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Passwort")}</label>
                         <input
                            type="password" value={wallpaper.webdavPass || ''}
                            onChange={(e) => setWallpaper({ ...wallpaper, webdavPass: e.target.value })}
                            placeholder="••••••••"
                            className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                         />
                      </div>
                   </div>

                   <div className="pt-2">
                      <button
                         onClick={() => fetchWebdavFolders(wallpaper.webdavPath || "/")}
                         disabled={isFetchingFolders}
                         className="w-full bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/20 text-[var(--mf-fg)] py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                         {isFetchingFolders ? t("Verbinde...") : t("NAS Verbinden / Ordner wählen")}
                      </button>
                   </div>

                   {webdavError && (
                      <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                         {t(webdavError)}
                      </div>
                   )}

                   {(webdavFolders.length > 0 || wallpaper.webdavPath) && (
                      <div className="bg-[var(--mf-ovl)]/50 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-xl overflow-hidden mt-4">
                         <div className="px-4 py-3 bg-[var(--mf-elev)]/5 border-b border-[var(--mf-bdr)]/10 flex items-center justify-between">
                            <span className="text-sm font-mono text-cyan-300 overflow-hidden text-ellipsis whitespace-nowrap mr-2">
                               {wallpaper.webdavPath || "/"}
                            </span>
                            {wallpaper.webdavPath && wallpaper.webdavPath !== "/" && (
                               <button
                                  onClick={() => {
                                     const parts = wallpaper.webdavPath!.replace(/\/$/, '').split('/');
                                     parts.pop();
                                     const parent = parts.length > 0 ? parts.join('/') : '/';
                                     fetchWebdavFolders(parent === "" ? "/" : parent);
                                  }}
                                  className="text-xs bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/20 px-2 py-1 rounded text-[var(--mf-fg)] font-medium flex-shrink-0"
                               >
                                  {t("Zurück")}
                               </button>
                            )}
                         </div>
                         {webdavImages && (
                            <div
                               className={`px-4 py-2 text-xs border-b border-[var(--mf-bdr)]/10 ${
                                  webdavImages.usable > 0
                                     ? "text-[var(--mf-fg)]/60"
                                     : "text-amber-400 bg-amber-400/10"
                               }`}
                            >
                               {webdavImages.usable > 0
                                  ? `${webdavImages.usable} ${t("Bilder in diesem Ordner")}`
                                  : webdavImages.unsupported > 0
                                     ? `${webdavImages.unsupported} ${t("Bilder hier kann kein Browser anzeigen (HEIC/RAW) — bitte JPG, PNG oder WebP")}`
                                     : t("Keine Bilder in diesem Ordner — bitte einen Unterordner wählen")}
                            </div>
                         )}
                         <div className="max-h-[200px] overflow-y-auto">
                            {webdavFolders.length === 0 && !isFetchingFolders ? (
                               <div className="p-4 text-center text-[var(--mf-fg)]/50 text-sm">{t("Keine Unterordner")}</div>
                            ) : (
                               webdavFolders.map(folder => (
                                  <button
                                     key={folder.filename}
                                     onClick={() => fetchWebdavFolders(folder.filename)}
                                     className="w-full text-left px-4 py-3 border-b border-[var(--mf-bdr)]/5 hover:bg-[var(--mf-elev)]/5 text-sm text-[var(--mf-fg)]/80 flex items-center gap-2 transition-colors last:border-0"
                                  >
                                     <span className="text-yellow-500 opacity-80">📁</span>
                                     <span>{folder.basename}</span>
                                  </button>
                               ))
                            )}
                         </div>
                      </div>
                   )}
                </div>
             ) : (
                <div>
                   <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
                      {wallpaper.source === 'unsplash' ? t("Suchbegriffe (komma-getrennt)") : t("Bild-URL (https://...)")}
                   </label>
                   <input
                      type="text" value={wallpaper.query}
                      onChange={(e) => setWallpaper({ ...wallpaper, query: e.target.value })}
                      placeholder={wallpaper.source === 'unsplash' ? 'nature, mountains, dark' : 'https://...'}
                      className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-xl p-4 outline-none focus:border-blue-500 transition-colors"
                   />
                </div>
             )}

             {(wallpaper.source === 'bundled' || wallpaper.source === 'unsplash' || wallpaper.source === 'webdav' || wallpaper.source === 'immich') && (
                <div>
                   <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                      <span>{t("Bildwechsel Intervall (Sekunden)")}</span>
                      <span className="text-blue-400">{wallpaper.intervalSec}s</span>
                   </label>
                   <input
                      type="range" min="10" max="3600" step="10" value={wallpaper.intervalSec}
                      onChange={(e) => setWallpaper({ ...wallpaper, intervalSec: parseInt(e.target.value) })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                   />
                </div>
             )}
            </>
          )}

          {/* ─────────────── TAB: ANZEIGE ─────────────── */}
          {tab === "display" && (
            <>
                <div>
                   <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Aufteilung (Split-View)")}</label>
                   <select
                      value={wallpaper.splitMode ?? "off"}
                      onChange={(e) => setWallpaper({ ...wallpaper, splitMode: e.target.value as "off" | "auto" | "grid2" | "grid4" })}
                      className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500"
                   >
                      <option value="off">{t("Aus (ein Bild)")}</option>
                      <option value="auto">{t("Auto (Hochformat paaren)")}</option>
                      <option value="grid2">{t("2 nebeneinander")}</option>
                      <option value="grid4">{t("2×2 (vier Bilder)")}</option>
                   </select>
                   <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                      {t("Auto zeigt Querformat einzeln und legt zwei Hochformat-Bilder nebeneinander — gut für gemischte Alben. Im Split-Modus wird sanft übergeblendet (Crossfade).")}
                   </p>
                </div>
                <div>
                   <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Übergangseffekt")}</label>
                   <select
                      value={wallpaper.transitionEffect ?? (wallpaper.zoomEffect ? "kenburns" : "crossfade")}
                      onChange={(e) => {
                         const next = e.target.value as "crossfade" | "kenburns" | "slide" | "none";
                         setWallpaper({
                            ...wallpaper,
                            transitionEffect: next,
                            // zoomEffect synchron halten für Legacy-Pfade
                            zoomEffect: next === "kenburns",
                         });
                      }}
                      className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500"
                   >
                      <option value="crossfade">{t("Crossfade (sanfte Blende)")}</option>
                      <option value="kenburns">{t("Ken Burns (langsamer Zoom)")}</option>
                      <option value="slide">{t("Slide (Push von rechts)")}</option>
                      <option value="none">{t("Hart (kein Effekt)")}</option>
                   </select>
                   <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                      {t("Ken Burns ist effektvoll, aber auf alten TV-Browsern (Tizen) spürbar schwerer. Bei Stottern auf Crossfade oder Hart wechseln.")}
                   </p>
                </div>
                {effectiveTransition !== "none" && (
                   <div>
                      <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                         <span>{t("Übergangs-Dauer")}</span>
                         <span className="text-blue-400">{(transMs / 1000).toFixed(1)}s</span>
                      </label>
                      <input
                         type="range" min="300" max="4000" step="100" value={transMs}
                         onChange={(e) => setWallpaper({ ...wallpaper, transitionMs: parseInt(e.target.value) })}
                         className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                      />
                   </div>
                )}
                {effectiveTransition === "kenburns" && (
                   <div>
                      <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                         <span>{t("Ken-Burns-Intensität")}</span>
                         <span className="text-blue-400">{wallpaper.kenBurnsIntensity ?? 15}%</span>
                      </label>
                      <input
                         type="range" min="5" max="40" step="1" value={wallpaper.kenBurnsIntensity ?? 15}
                         onChange={(e) => setWallpaper({ ...wallpaper, kenBurnsIntensity: parseInt(e.target.value) })}
                         className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                      />
                      <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">{t("Wie weit das Bild langsam einzoomt. Höher = stärkerer Effekt.")}</p>
                   </div>
                )}
                <div>
                   <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Bildanzeige")}</label>
                   <select
                      value={wallpaper.fit ?? "cover"}
                      onChange={(e) => setWallpaper({ ...wallpaper, fit: e.target.value as "cover" | "contain" | "fill" | "none" | "blur" })}
                      className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500"
                   >
                      <option value="cover">{t("Füllen (Ausschnitt, Standard)")}</option>
                      <option value="contain">{t("Einpassen (ganzes Bild)")}</option>
                      <option value="blur">{t("Einpassen + Blur-Rand")}</option>
                      <option value="fill">{t("Strecken (verzerrt)")}</option>
                      <option value="none">{t("Zentriert (Originalgröße)")}</option>
                   </select>
                   <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                      {t("Füllen schneidet Ränder ab. Einpassen zeigt das ganze Bild ohne Beschneiden — gut für Hochformat-Fotos.")}
                   </p>
                </div>
                <div>
                   <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Bild-Position")}</label>
                   <select
                      value={wallpaper.imagePosition ?? "center"}
                      onChange={(e) => setWallpaper({ ...wallpaper, imagePosition: e.target.value as "top" | "center" | "bottom" })}
                      className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500"
                   >
                      <option value="top">{t("Oben")}</option>
                      <option value="center">{t("Mitte (Standard)")}</option>
                      <option value="bottom">{t("Unten")}</option>
                   </select>
                   <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">
                      {t("Bei „Füllen“: welcher Bildausschnitt sichtbar bleibt — z.B. „Oben“ gegen abgeschnittene Köpfe.")}
                   </p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                      <input
                         type="checkbox"
                         checked={wallpaper.showTimer !== false}
                         onChange={(e) => setWallpaper({ ...wallpaper, showTimer: e.target.checked })}
                         className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                   </div>
                   <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Ladekreis (Timer) anzeigen")}</span>
                </label>

                {/* ── Artwork bei Musik (#50, Phase 2) ── */}
                <div className="mt-2 pt-4 border-t border-[var(--mf-bdr)]/10">
                   <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                         <input
                            type="checkbox"
                            checked={wallpaper.artworkEnabled === true}
                            onChange={(e) => setWallpaper({ ...wallpaper, artworkEnabled: e.target.checked })}
                            className="sr-only peer"
                         />
                         <div className="w-11 h-6 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                      </div>
                      <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors flex items-center gap-2"><Music size={15} className="text-blue-400" /> {t("Artwork bei Musik")}</span>
                   </label>
                   <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1.5">
                      {t("Wenn Musik läuft, wird das Album-Cover zum Hintergrund.")}
                   </p>

                   {wallpaper.artworkEnabled === true && (
                    <div className="mt-3 space-y-3">
                      <HAEntityInput
                         value={wallpaper.artworkPlayer || ""}
                         onChange={(v) => setWallpaper({ ...wallpaper, artworkPlayer: v })}
                         domains={["media_player"]}
                         placeholder="media_player.wohnzimmer"
                      />
                      {(wallpaper.artworkPlayer || "").trim() !== "" && (
                      <div className="space-y-3">
                         <div>
                            <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Darstellung")}</label>
                            <select
                               value={wallpaper.artworkFit ?? "blur"}
                               onChange={(e) => setWallpaper({ ...wallpaper, artworkFit: e.target.value as "blur" | "cover" })}
                               className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500"
                            >
                               <option value="blur">{t("Blur-Rahmen + scharfes Cover")}</option>
                               <option value="cover">{t("Bildschirmfüllend")}</option>
                            </select>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                                  <span>{t("Blur-Stärke")}</span><span className="text-blue-400">{wallpaper.artworkBlur ?? 40}px</span>
                               </label>
                               <input type="range" min="0" max="80" step="2" value={wallpaper.artworkBlur ?? 40}
                                  onChange={(e) => setWallpaper({ ...wallpaper, artworkBlur: parseInt(e.target.value) })}
                                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-fg)]/15" />
                            </div>
                            <div>
                               <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                                  <span>{t("Abdunkeln")}</span><span className="text-blue-400">{wallpaper.artworkDarken ?? 30}%</span>
                               </label>
                               <input type="range" min="0" max="85" step="5" value={wallpaper.artworkDarken ?? 30}
                                  onChange={(e) => setWallpaper({ ...wallpaper, artworkDarken: parseInt(e.target.value) })}
                                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-fg)]/15" />
                            </div>
                         </div>
                      </div>
                      )}
                    </div>
                   )}
                </div>
            </>
          )}

          {/* ─────────────── TAB: OVERLAYS & TEXT ─────────────── */}
          {tab === "overlays" && (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--mf-elev)]/5 p-4 rounded-xl border border-[var(--mf-bdr)]/10">
                   <div>
                      <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                         <span>{t("Schatten Oben")}</span>
                         <span className="text-blue-400">{wallpaper.gradientTop ?? 30}%</span>
                      </label>
                      <input
                         type="range" min="0" max="100" step="5" value={wallpaper.gradientTop ?? 30}
                         onChange={(e) => setWallpaper({ ...wallpaper, gradientTop: parseInt(e.target.value) })}
                         className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-surface)]"
                      />
                   </div>
                   <div>
                      <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                         <span>{t("Schatten Unten")}</span>
                         <span className="text-blue-400">{wallpaper.gradientBottom ?? 80}%</span>
                      </label>
                      <input
                         type="range" min="0" max="100" step="5" value={wallpaper.gradientBottom ?? 80}
                         onChange={(e) => setWallpaper({ ...wallpaper, gradientBottom: parseInt(e.target.value) })}
                         className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-surface)]"
                      />
                   </div>
                   <div className="col-span-2 border-t border-[var(--mf-bdr)]/5 pt-3 mt-1" />
                   <div>
                      <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                         <span>{t("Vignette Effekt")}</span>
                         <span className="text-blue-400">{wallpaper.overlayVignette ?? 85}%</span>
                      </label>
                      <input
                         type="range" min="0" max="100" step="5" value={wallpaper.overlayVignette ?? 85}
                         onChange={(e) => setWallpaper({ ...wallpaper, overlayVignette: parseInt(e.target.value) })}
                         className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-surface)]"
                      />
                   </div>
                   <div>
                      <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                         <span>{t("Unschärfe (Blur)")}</span>
                         <span className="text-blue-400">{wallpaper.overlayBlur ?? 0}px</span>
                      </label>
                      <input
                         type="range" min="0" max="30" step="1" value={wallpaper.overlayBlur ?? 0}
                         onChange={(e) => setWallpaper({ ...wallpaper, overlayBlur: parseInt(e.target.value) })}
                         className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-surface)]"
                      />
                   </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative">
                      <input
                         type="checkbox"
                         checked={wallpaper.showMetadata}
                         onChange={(e) => setWallpaper({ ...wallpaper, showMetadata: e.target.checked })}
                         className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[var(--mf-elev)]/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                   </div>
                   <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Metadata/EXIF einblenden")}</span>
                </label>

                {wallpaper.showMetadata && (
                   <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="checkbox" checked={wallpaper.metaShowDate !== false} onChange={(e) => setWallpaper({ ...wallpaper, metaShowDate: e.target.checked })} className="accent-blue-500 w-4 h-4 cursor-pointer" />
                         <span className="text-xs font-medium text-[var(--mf-fg)]/60 group-hover:text-[var(--mf-fg)]/80 transition-colors">{t("Datum & Uhrzeit")}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="checkbox" checked={wallpaper.metaShowCamera !== false} onChange={(e) => setWallpaper({ ...wallpaper, metaShowCamera: e.target.checked })} className="accent-blue-500 w-4 h-4 cursor-pointer" />
                         <span className="text-xs font-medium text-[var(--mf-fg)]/60 group-hover:text-[var(--mf-fg)]/80 transition-colors">{t("Kamera-Modell")}</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="checkbox" checked={wallpaper.metaShowLocation !== false} onChange={(e) => setWallpaper({ ...wallpaper, metaShowLocation: e.target.checked })} className="accent-blue-500 w-4 h-4 cursor-pointer" />
                         <span className="text-xs font-medium text-[var(--mf-fg)]/60 group-hover:text-[var(--mf-fg)]/80 transition-colors">{t("Aufnahmeort (GPS)")}</span>
                      </label>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--mf-ovl)]/30 light:bg-[var(--mf-surface)] p-3 rounded-lg border border-[var(--mf-bdr)]/5">
                         <div className="col-span-2">
                            <label className="text-[10px] font-medium text-[var(--mf-fg)]/40 block mb-1 uppercase tracking-wider">{t("Hintergrund-Balken Deckkraft")}</label>
                            <div className="flex items-center gap-2">
                               <input
                                  type="range" min="0" max="100" step="10" value={wallpaper.metaBgOpacity ?? 40}
                                  onChange={(e) => setWallpaper({ ...wallpaper, metaBgOpacity: parseInt(e.target.value) })}
                                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                               />
                               <span className="text-xs text-[var(--mf-fg)]/60 w-8">{wallpaper.metaBgOpacity ?? 40}%</span>
                            </div>
                         </div>

                         <div className="col-span-2 border-t border-[var(--mf-bdr)]/10 my-1 pt-3" />

                         {/* #44: Seite der Bildinfo. Im geteilten Modus hängt die
                             Info an jeder Kachel und richtet sich nach derselben
                             Einstellung aus. */}
                         <div className="col-span-1 sm:col-span-2">
                            <label className="text-[10px] font-medium text-[var(--mf-fg)]/40 block mb-2 uppercase tracking-wider">{t("Position")}</label>
                            <div className="grid grid-cols-2 gap-2">
                               {(["left", "right"] as const).map((side) => {
                                  const activeSide = wallpaper.metaPosition === "left" ? "left" : "right";
                                  return (
                                     <button
                                        key={side}
                                        type="button"
                                        onClick={() => setWallpaper({ ...wallpaper, metaPosition: side })}
                                        className={`py-2.5 rounded-lg text-xs font-medium transition-colors border ${
                                           activeSide === side
                                              ? "bg-blue-500/15 border-blue-500/40 text-[var(--mf-fg)]"
                                              : "bg-[var(--mf-surface)] border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]/80"
                                        }`}
                                     >
                                        {side === "left" ? t("Links") : t("Rechts")}
                                     </button>
                                  );
                               })}
                            </div>
                            <p className="text-[11px] text-[var(--mf-fg)]/40 mt-2">
                               {t("Im geteilten Modus steht die Info an jedem Bild einzeln, damit klar bleibt, wozu sie gehört.")}
                            </p>
                         </div>

                         <div className="col-span-2 border-t border-[var(--mf-bdr)]/10 my-1 pt-3" />

                         <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                               <label className="text-[10px] font-medium text-[var(--mf-fg)]/40 block mb-1 uppercase tracking-wider">{t("Schriftfarbe")}</label>
                               <input
                                  type="color" value={wallpaper.metaColor || '#ffffff'}
                                  onChange={(e) => setWallpaper({ ...wallpaper, metaColor: e.target.value })}
                                  className="w-full h-10 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg cursor-pointer"
                               />
                            </div>
                            <div>
                               <label className="text-[10px] font-medium text-[var(--mf-fg)]/40 mb-1 uppercase tracking-wider flex justify-between">
                                  <span>{t("Schatten (Blur)")}</span>
                                  <span className="text-purple-400">{wallpaper.metaTextShadowBlur ?? 0}px</span>
                               </label>
                               <input
                                  type="range" min="0" max="20" value={wallpaper.metaTextShadowBlur ?? 0}
                                  onChange={(e) => setWallpaper({ ...wallpaper, metaTextShadowBlur: parseInt(e.target.value) })}
                                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-500 bg-[var(--mf-elev)]/10 mt-3"
                               />
                            </div>

                            <div>
                               <label className="text-[10px] font-medium text-[var(--mf-fg)]/40 block mb-1 uppercase tracking-wider">{t("Basis-Schriftart")}</label>
                               <select
                                  value={wallpaper.metaFontFamily || 'Inter'}
                                  onChange={(e) => setWallpaper({ ...wallpaper, metaFontFamily: e.target.value })}
                                  className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-xs rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                               >
                                  <option value="Inter">{t("Inter (Clean)")}</option>
                                  <option value="Courier New">{t("Courier (Retro)")}</option>
                                  <option value="Orbitron">{t("Orbitron (Digital)")}</option>
                                  <option value="Cutive Mono">{t("Cutive Mono (Typewriter)")}</option>
                                  <option value="Roboto">{t("Roboto (Android)")}</option>
                                  <option value="Montserrat">{t("Montserrat (Modern)")}</option>
                                  <option value="SF Pro Display">{t("SF Pro (Apple)")}</option>
                                  <option value="Playfair Display">{t("Playfair (Serif)")}</option>
                                  <option value="Lato">{t("Lato (Rund)")}</option>
                                  <option value="Oswald">{t("Oswald (Kompakt)")}</option>
                                  <option value="Outfit">{t("Outfit (Rund)")}</option>
                               </select>
                            </div>
                            <div>
                               <label className="text-[10px] font-medium text-[var(--mf-fg)]/40 block mb-1 uppercase tracking-wider">{t("Dicke (Weight)")}</label>
                               <select
                                  value={wallpaper.metaFontWeight || '300'}
                                  onChange={(e) => setWallpaper({ ...wallpaper, metaFontWeight: e.target.value })}
                                  className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-xs rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                               >
                                  <option value="100">{t("100 - Sehr dünn")}</option>
                                  <option value="300">{t("300 - Dünn (Standard)")}</option>
                                  <option value="400">{t("400 - Normal")}</option>
                                  <option value="500">{t("500 - Medium")}</option>
                                  <option value="700">{t("700 - Fett")}</option>
                                  <option value="900">{t("900 - Ultra Fett")}</option>
                               </select>
                            </div>
                         </div>

                         <div className="col-span-2 mt-2">
                            <label className="text-[10px] font-medium text-[var(--mf-fg)]/40 mb-1 uppercase tracking-wider flex justify-between">
                              <span>{t("Schriftgröße (Standard: 12px)")}</span>
                              <span className="text-green-400">{wallpaper.metaFontSize ?? 12}px</span>
                            </label>
                            <input
                               type="range" min="8" max="40" step="1" value={wallpaper.metaFontSize ?? 12}
                               onChange={(e) => setWallpaper({ ...wallpaper, metaFontSize: parseInt(e.target.value) })}
                               className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-green-500 bg-[var(--mf-elev)]/10 mt-2"
                            />
                         </div>
                      </div>
                   </div>
                )}
            </>
          )}
       </div>

       <p className="text-xs text-[var(--mf-fg)]/40 mt-6 bg-[var(--mf-elev)]/5 p-4 rounded-xl border border-[var(--mf-bdr)]/5">
          {t("Hinweis: Speichern Sie das Layout über den blauen Button oben rechts, damit die Wallpaper Engine auf dem Display aktualisiert wird.")}
       </p>
    </>
  );

  if (variant === "inline") {
    return <div className="bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl p-6">{inner}</div>;
  }

  return (
    <div className="fixed inset-0 bg-[var(--mf-backdrop)]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 p-8 rounded-[32px] shadow-2xl w-full max-w-3xl nodrag max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {inner}
      </div>
    </div>
  );
}

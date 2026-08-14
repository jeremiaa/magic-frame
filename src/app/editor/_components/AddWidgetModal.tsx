"use client";

import React from 'react';
import { useT } from "@/lib/i18n/LocaleProvider";

type AddWidgetModalProps = {
  onClose: () => void;
  addWidget: (type: string) => void;
};

export default function AddWidgetModal({ onClose, addWidget }: AddWidgetModalProps) {
  const t = useT();
  return (
    <div className="fixed inset-0 bg-[var(--mf-backdrop)]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
       <div className="bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 p-6 rounded-2xl shadow-2xl w-full max-w-md nodrag" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-xl text-[var(--mf-fg)]">{t("Neues Modul wählen")}</h3>
             <button onClick={onClose} className="text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]">{t("Schließen")}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <button onClick={() => addWidget("ClockWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-[var(--mf-elev)]/10 border border-[var(--mf-bdr)]/10 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2">🕐</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Uhr & Datum")}</div>
             </button>
             <button onClick={() => addWidget("WeatherWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-[var(--mf-elev)]/10 border border-[var(--mf-bdr)]/10 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2">⛅</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Live Wetter")}</div>
             </button>
             <button onClick={() => addWidget("CalendarWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-[var(--mf-elev)]/10 border border-[var(--mf-bdr)]/10 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2">📅</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Kalender")}</div>
             </button>
             <button onClick={() => addWidget("HomeAssistantWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-cyan-500/10 border border-[var(--mf-bdr)]/10 hover:border-cyan-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-cyan-400">🏡</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("HA Entity")}</div>
             </button>
             <button onClick={() => addWidget("HANotificationWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-fuchsia-500/10 border border-[var(--mf-bdr)]/10 hover:border-fuchsia-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-fuchsia-400">🔔</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("HA Alerts")}</div>
             </button>
             <button onClick={() => addWidget("ButtonWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-indigo-500/10 border border-[var(--mf-bdr)]/10 hover:border-indigo-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-indigo-400">🔘</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Aktions-Button")}</div>
             </button>
             <button onClick={() => addWidget("ImageWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-purple-500/10 border border-[var(--mf-bdr)]/10 hover:border-purple-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-purple-400">🖼️</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Bild (Immich)")}</div>
             </button>
             <button onClick={() => addWidget("SensorWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-teal-500/10 border border-[var(--mf-bdr)]/10 hover:border-teal-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-teal-400">🌡️</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Sensor")}</div>
             </button>
             <button onClick={() => addWidget("EnvironmentWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-lime-500/10 border border-[var(--mf-bdr)]/10 hover:border-lime-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-lime-400">🌿</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Umwelt")}</div>
             </button>
             <button onClick={() => addWidget("CameraWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-rose-500/10 border border-[var(--mf-bdr)]/10 hover:border-rose-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-rose-400">📷</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Kamera")}</div>
             </button>
             <button onClick={() => addWidget("MediaPlayerWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-pink-500/10 border border-[var(--mf-bdr)]/10 hover:border-pink-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-pink-400">🎵</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Media Player")}</div>
             </button>
             <button onClick={() => addWidget("RssWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-amber-500/10 border border-[var(--mf-bdr)]/10 hover:border-amber-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-amber-400">📰</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("RSS Feed")}</div>
             </button>
             <button onClick={() => addWidget("QrWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-cyan-500/10 border border-[var(--mf-bdr)]/10 hover:border-cyan-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-cyan-400">🔳</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("QR-Code")}</div>
             </button>
             <button onClick={() => addWidget("StatusWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-sky-500/10 border border-[var(--mf-bdr)]/10 hover:border-sky-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-sky-400">🚦</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Status")}</div>
             </button>
             <button onClick={() => addWidget("TextWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-sky-500/10 border border-[var(--mf-bdr)]/10 hover:border-sky-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-sky-400">🔤</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Text")}</div>
             </button>
             {/* Die vier Familien-Karten fehlten hier komplett. Der Editor am
                 Rechner hat sie in seiner Palette, dieses Fenster ist der
                 Wähler des Handy-Editors — auf dem Handy waren Timer,
                 Nachrichten, Einkaufsliste und Todos also nicht hinzufügbar,
                 also ausgerechnet die Karten, die man unterwegs anlegt. */}
             <button onClick={() => addWidget("TimerWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-emerald-500/10 border border-[var(--mf-bdr)]/10 hover:border-emerald-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-emerald-400">⏱️</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Timer")}</div>
             </button>
             <button onClick={() => addWidget("MessagesWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-blue-500/10 border border-[var(--mf-bdr)]/10 hover:border-blue-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-blue-400">💬</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Nachrichten")}</div>
             </button>
             <button onClick={() => addWidget("ShoppingListWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-orange-500/10 border border-[var(--mf-bdr)]/10 hover:border-orange-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-orange-400">🛒</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Einkaufsliste")}</div>
             </button>
             <button onClick={() => addWidget("TodosWidget.tsx")} className="bg-[var(--mf-elev)]/5 hover:bg-violet-500/10 border border-[var(--mf-bdr)]/10 hover:border-violet-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-violet-400">📋</div>
                <div className="font-bold text-[var(--mf-fg)]">{t("Todos")}</div>
             </button>
          </div>
       </div>
    </div>
  );
}

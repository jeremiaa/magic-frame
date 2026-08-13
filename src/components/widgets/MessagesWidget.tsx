"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { MessageSquare, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { writeAndReport } from "@/lib/ha/action-client";

type Message = {
  id: string;
  text: string;
  imageUrl: string | null;
  targetDashboardId: string | null;
  createdAt: string;
  expiresAt: string | null;
};

export default function MessagesWidget({
  config,
  dashboardId,
}: {
  config?: any;
  dashboardId?: string;
}) {
  const { locale, t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (dashboardId) qs.set("dashboardId", dashboardId);
    fetch(`/api/messages?${qs.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => {});

    const socket = io();
    socketRef.current = socket;
    socket.on("MESSAGE_POSTED", (m: Message) => {
      if (m.targetDashboardId && dashboardId && m.targetDashboardId !== dashboardId) return;
      setMessages((prev) => [m, ...prev.filter((p) => p.id !== m.id)]);
    });
    socket.on("MESSAGE_DISMISSED", ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });
    return () => {
      socket.disconnect();
    };
  }, [dashboardId]);

  // Abgelaufene rausfiltern alle 30s ohne Server-Roundtrip
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  const now = Date.now();
  const visible = messages.filter((m) => !m.expiresAt || new Date(m.expiresAt).getTime() > now);

  async function dismiss(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try { await writeAndReport(`/api/messages/${id}`, { method: "DELETE" }); } catch {}
  }

  const maxShow = Math.max(1, Math.min(10, config?.maxMessages ?? 5));

  if (visible.length === 0) {
    if (config?.hideWhenEmpty) return null;
    return (
      <div className="flex flex-col items-center justify-center w-full h-full opacity-40 text-center gap-2 p-2">
        <MessageSquare size={26} className="opacity-60" />
        <span className="text-[0.75em]">{t("Keine Nachrichten")}</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-2 overflow-y-auto p-1 [&::-webkit-scrollbar]:hidden"
         style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
      {visible.slice(0, maxShow).map((m) => (
        <div
          key={m.id}
          className="bg-black/30 border border-white/10 rounded-xl p-[0.7em] flex gap-[0.6em] items-start"
        >
          {m.imageUrl && (
            <img
              src={m.imageUrl}
              alt=""
              className="w-[2.4em] h-[2.4em] rounded-md object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[0.9em] leading-snug break-words">{m.text}</div>
            <div className="text-[0.65em] opacity-50 mt-[0.2em]">
              {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: locale === "en" ? enUS : de })}
            </div>
          </div>
          <button
            onClick={() => dismiss(m.id)}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 nodrag"
            title={t("Schließen")}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Timer as TimerIcon, X } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { writeAndReport } from "@/lib/ha/action-client";

type Timer = {
  id: string;
  label: string;
  targetDashboardId: string | null;
  startedAt: string;
  durationMs: number;
  completedAt: string | null;
  dismissedAt: string | null;
};

export default function TimerWidget({
  config,
  dashboardId,
}: {
  config?: any;
  dashboardId?: string;
}) {
  const t = useT();
  const [timers, setTimers] = useState<Timer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  // Tick jede Sekunde für Countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Initial laden + Socket
  useEffect(() => {
    const qs = new URLSearchParams();
    if (dashboardId) qs.set("dashboardId", dashboardId);
    fetch(`/api/timers?${qs.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTimers(d.timers ?? []))
      .catch(() => {});

    const socket = io();
    socketRef.current = socket;
    socket.on("TIMER_STARTED", (t: Timer) => {
      if (t.targetDashboardId && dashboardId && t.targetDashboardId !== dashboardId) return;
      setTimers((prev) => {
        if (prev.some((p) => p.id === t.id)) return prev;
        return [...prev, t];
      });
    });
    socket.on("TIMER_DISMISSED", ({ id }: { id: string }) => {
      setTimers((prev) => prev.filter((t) => t.id !== id));
    });
    return () => {
      socket.disconnect();
    };
  }, [dashboardId]);

  async function dismiss(id: string) {
    // Optimistisch entfernen, dann POST
    setTimers((prev) => prev.filter((t) => t.id !== id));
    try {
      await writeAndReport(`/api/timers/${id}`, { method: "DELETE" });
    } catch {
      // Falls es schief geht, re-fetch ist ok — Socket syncs sowieso.
    }
  }

  // Obergrenze 6, nicht 4 — der Regler im Inspektor geht bis 6, und die
  // Einstellung wurde oberhalb von 4 stillschweigend ignoriert.
  const maxShow = Math.max(1, Math.min(6, config?.maxTimers ?? 4));
  const visible = timers.slice(0, maxShow);

  if (visible.length === 0) {
    if (config?.hideWhenEmpty) return null;
    return (
      <div className="flex flex-col items-center justify-center w-full h-full opacity-40 text-center gap-2 p-2">
        <TimerIcon size={28} className="opacity-60" />
        <span className="text-[0.75em]">
          {t("Kein aktiver Timer")}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-center gap-2 overflow-hidden p-1">
      {visible.map((t) => (
        <TimerRow key={t.id} timer={t} now={now} onDismiss={() => dismiss(t.id)} />
      ))}
      {timers.length > maxShow && (
        <div className="text-[0.65em] opacity-50 text-right pr-2">
          +{timers.length - maxShow} {t("weitere")}
        </div>
      )}
    </div>
  );
}

function TimerRow({
  timer,
  now,
  onDismiss,
}: {
  timer: Timer;
  now: number;
  onDismiss: () => void;
}) {
  const t = useT();
  const started = new Date(timer.startedAt).getTime();
  const endsAt = started + timer.durationMs;
  const remaining = Math.max(0, endsAt - now);
  const progress = Math.min(1, (now - started) / timer.durationMs);
  const isDone = remaining <= 0;

  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const hours = Math.floor(minutes / 60);
  const showHours = hours > 0;
  const clock = showHours
    ? `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const accent = isDone ? "#f97316" : "#10b981"; // orange wenn fertig, grün sonst
  const radius = 34;
  const circ = 2 * Math.PI * radius;

  return (
    <div
      className="flex items-center gap-[0.8em] bg-black/30 rounded-xl p-[0.6em] border"
      style={{
        borderColor: isDone ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.08)",
        animation: isDone ? "timer-pulse 1.2s ease-in-out infinite" : undefined,
      }}
    >
      <div className="relative shrink-0" style={{ width: "2.6em", height: "2.6em" }}>
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke={accent}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: circ,
              strokeDashoffset: circ * (1 - progress),
              transition: "stroke-dashoffset 1s linear",
            }}
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[0.7em] opacity-70 uppercase tracking-wider truncate">
          {timer.label}
        </div>
        <div
          className="font-mono font-bold tracking-tight leading-none"
          style={{ fontSize: "1.4em", color: isDone ? accent : undefined }}
        >
          {isDone ? t("FERTIG") : clock}
        </div>
      </div>
      <button
        onClick={onDismiss}
        title={t("Timer beenden")}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors nodrag"
      >
        <X size={14} />
      </button>

      <style jsx>{`
        @keyframes timer-pulse {
          0%, 100% { background-color: rgba(0, 0, 0, 0.3); }
          50% { background-color: rgba(249, 115, 22, 0.25); }
        }
      `}</style>
    </div>
  );
}

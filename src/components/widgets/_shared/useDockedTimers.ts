"use client";

import { useEffect, useRef, useState } from "react";
import { connectLiveSync } from "@/lib/live-socket";

export type DockedTimer = {
  id: string;
  label: string;
  targetDashboardId: string | null;
  startedAt: string;
  durationMs: number;
  completedAt: string | null;
  dismissedAt: string | null;
};

/**
 * Lädt aktive Timer für ein Dashboard und hält die Liste live (über Socket-IO).
 * Stellt nur Daten bereit — die Darstellung übernimmt das einbettende Widget,
 * damit die Karten optisch perfekt zu seinen anderen Items passen.
 */
export function useDockedTimers(dashboardId?: string, enabled: boolean = true) {
  const [timers, setTimers] = useState<DockedTimer[]>([]);
  const socketRef = useRef<ReturnType<typeof connectLiveSync> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTimers([]);
      return;
    }
    const qs = new URLSearchParams();
    if (dashboardId) qs.set("dashboardId", dashboardId);
    fetch(`/api/timers?${qs.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTimers(d.timers ?? []))
      .catch(() => {});

    const socket = connectLiveSync();
    socketRef.current = socket;
    socket.on("TIMER_STARTED", (t: DockedTimer) => {
      if (t.targetDashboardId && dashboardId && t.targetDashboardId !== dashboardId) return;
      setTimers((prev) => (prev.some((p) => p.id === t.id) ? prev : [...prev, t]));
    });
    socket.on("TIMER_DISMISSED", ({ id }: { id: string }) => {
      setTimers((prev) => prev.filter((t) => t.id !== id));
    });
    return () => {
      socket.disconnect();
    };
  }, [dashboardId, enabled]);

  async function dismissTimer(id: string) {
    setTimers((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/timers/${id}`, { method: "DELETE" });
    } catch {}
  }

  return { timers, dismissTimer };
}

/** Berechnet Countdown + Fortschritt aus Start/Dauer relativ zu nowMs. */
export function timerClock(timer: DockedTimer, nowMs: number) {
  const started = new Date(timer.startedAt).getTime();
  const endsAt = started + timer.durationMs;
  const remaining = Math.max(0, endsAt - nowMs);
  const progress = Math.min(1, Math.max(0, (nowMs - started) / timer.durationMs));
  const isDone = remaining <= 0;

  const totalSeconds = Math.floor(remaining / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const showHours = hours > 0;
  const clock = showHours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return { remaining, progress, isDone, clock };
}

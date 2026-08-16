"use client";

import { useEffect, useRef, useState } from "react";
import { connectLiveSync } from "@/lib/live-socket";
import { ClipboardList, Plus } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { renderInlineMarkdown } from "@/lib/inline-markdown";
import { writeAndReport } from "@/lib/ha/action-client";

type Todo = {
  id: string;
  title: string;
  assignee: string | null;
  dueDate: string | null;
  priority: "low" | "normal" | "high";
  createdAt: string;
  completedAt: string | null;
};

export default function TodosWidget({ config }: { config?: any }) {
  const { t: tr } = useLocale();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const assigneeFilter: string | undefined = config?.assignee || undefined;
  const socketRef = useRef<ReturnType<typeof connectLiveSync> | null>(null);

  const useHa = config?.listSource === "ha" && !!config?.haListEntity;
  const haEntity: string = config?.haListEntity ?? "";
  const useTodoist = config?.listSource === "todoist" && !!config?.todoistProjectId;
  const todoistProject: string = config?.todoistProjectId ?? "";
  const isRemote = useHa || useTodoist;

  async function reload() {
    if (useHa) {
      try {
        const r = await fetch(`/api/ha-lists/${encodeURIComponent(haEntity)}/items`, {
          cache: "no-store",
        });
        const d = await r.json();
        const mapped: Todo[] = (d.items ?? []).map((it: any) => ({
          id: it.uid,
          title: it.summary,
          assignee: null,
          dueDate: null,
          priority: "normal",
          createdAt: "",
          completedAt: it.status === "completed" ? "now" : null,
        }));
        setTodos(mapped);
      } catch {}
      return;
    }
    if (useTodoist) {
      try {
        const r = await fetch(`/api/todoist/tasks/${encodeURIComponent(todoistProject)}`, {
          cache: "no-store",
        });
        const d = await r.json();
        // Todoist Priority: 1=P4(lowest) … 4=P1(highest). Mappen auf low/normal/high.
        const mapPrio = (p: number): Todo["priority"] =>
          p >= 4 ? "high" : p <= 1 ? "low" : "normal";
        const mapped: Todo[] = (d.tasks ?? []).map((task: any) => ({
          id: String(task.id),
          title: task.content,
          assignee: null,
          dueDate: task.due?.datetime ?? task.due?.date ?? null,
          priority: mapPrio(task.priority ?? 1),
          createdAt: "",
          completedAt: task.isCompleted ? "now" : null,
        }));
        setTodos(mapped);
      } catch {}
      return;
    }
    const qs = new URLSearchParams();
    if (assigneeFilter) qs.set("assignee", assigneeFilter);
    qs.set("includeDoneHours", "12");
    try {
      const r = await fetch(`/api/todos?${qs.toString()}`, { cache: "no-store" });
      const d = await r.json();
      setTodos(d.todos ?? []);
    } catch {}
  }

  useEffect(() => {
    reload();
    if (isRemote) {
      // Externe Quellen: poll alle 10 s (kein Live-Socket).
      const id = setInterval(reload, 10_000);
      return () => clearInterval(id);
    }
    const socket = connectLiveSync();
    socketRef.current = socket;
    socket.on("TODOS_UPDATED", () => reload());
    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigneeFilter, useHa, haEntity, useTodoist, todoistProject]);

  async function toggle(id: string) {
    const cur = todos.find((todo) => todo.id === id);
    const nextDone = !cur?.completedAt;
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completedAt: nextDone ? new Date().toISOString() : null } : t,
      ),
    );
    if (useHa && cur) {
      await writeAndReport(`/api/ha-lists/${encodeURIComponent(haEntity)}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: cur.title,
          status: nextDone ? "completed" : "needs_action",
        }),
      });
    } else if (useTodoist) {
      await writeAndReport(`/api/todoist/tasks/${encodeURIComponent(todoistProject)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: id,
          action: nextDone ? "close" : "reopen",
        }),
      });
    } else {
      // reload als Rückfall: schlägt der Schreibzugriff fehl (auf einem
      // Display ohne Anmeldung 401), stünde der Haken sonst dauerhaft falsch.
      await writeAndReport(
        `/api/todos/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toggle: true }),
        },
        reload,
      );
    }
  }

  async function add() {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    if (useHa) {
      await writeAndReport(`/api/ha-lists/${encodeURIComponent(haEntity)}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: title }),
      });
      reload();
    } else if (useTodoist) {
      await writeAndReport(`/api/todoist/tasks/${encodeURIComponent(todoistProject)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: title }),
      });
      reload();
    } else {
      await writeAndReport("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, assignee: assigneeFilter ?? null }),
      });
    }
  }

  const hideAdd = config?.hideAddForm === true;
  const customTitle = (config?.title ?? "").trim();
  const hideHeader = config?.hideHeader === true;
  const hideCount = config?.hideCount === true;
  const headerLabel = customTitle || tr("Todos");
  const open = todos.filter((t) => !t.completedAt);
  const done = todos.filter((t) => t.completedAt);

  return (
    <div className="w-full h-full flex flex-col gap-[0.5em] overflow-hidden p-1">
      {!hideHeader && (
        <div className="flex items-center gap-[0.5em] mb-[0.2em]">
          <ClipboardList size={14} className="opacity-60 shrink-0" />
          <span className="text-[0.7em] opacity-60 uppercase tracking-wider truncate">
            {assigneeFilter ? `${headerLabel} · ${assigneeFilter}` : headerLabel}{!hideCount && ` · ${open.length}`}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden flex flex-col gap-[0.3em] p-[0.15em]"
           style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
        {open.map((t) => (
          <TodoRow key={t.id} todo={t} onToggle={() => toggle(t.id)} showAssignee={!assigneeFilter} />
        ))}
        {done.length > 0 && (
          <div className="mt-[0.4em] pt-[0.3em] border-t border-white/10 text-[0.6em] opacity-40 uppercase tracking-wider">
            {tr("Erledigt (12h)")}
          </div>
        )}
        {done.map((t) => (
          <TodoRow key={t.id} todo={t} onToggle={() => toggle(t.id)} showAssignee={!assigneeFilter} />
        ))}
        {todos.length === 0 && (
          <div className="opacity-40 text-[0.8em] text-center mt-2">
            {assigneeFilter ? tr("{name} ist durch 🎉").replace("{name}", assigneeFilter) : tr("Nichts zu tun")}
          </div>
        )}
      </div>

      {!hideAdd && (
        <form
          onSubmit={(e) => { e.preventDefault(); add(); }}
          className="flex items-center gap-[0.4em] mt-[0.3em] nodrag"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={assigneeFilter ? tr("+ Todo für {name}").replace("{name}", assigneeFilter) : tr("+ Neues Todo")}
            className="flex-1 bg-black/40 border border-white/10 rounded-md px-[0.6em] h-[1.8em] text-[0.75em] focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            className="shrink-0 w-[1.8em] h-[1.8em] flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
          >
            <Plus size={12} />
          </button>
        </form>
      )}
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  showAssignee,
}: {
  todo: Todo;
  onToggle: () => void;
  showAssignee: boolean;
}) {
  const { locale, t } = useLocale();
  const due = todo.dueDate ? new Date(todo.dueDate) : null;
  const overdue = due && isPast(due) && !isToday(due) && !todo.completedAt;
  const dueLabel = due
    ? isToday(due)
      ? t("heute")
      : isTomorrow(due)
        ? t("morgen")
        : format(due, locale === "en" ? "dd MMM" : "dd. MMM", { locale: locale === "en" ? enUS : de })
    : "";
  const prioColor =
    todo.priority === "high"
      ? "bg-red-500/70 border-red-400"
      : todo.priority === "low"
        ? "bg-sky-500/60 border-sky-400"
        : "bg-emerald-500/70 border-emerald-400";

  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-[0.6em] text-left bg-black/20 hover:bg-black/40 rounded-md px-[0.6em] py-[0.3em] transition-colors nodrag ${
        overdue ? "ring-1 ring-inset ring-red-500/50" : ""
      }`}
    >
      <span
        className={`shrink-0 w-[1em] h-[1em] rounded-sm border flex items-center justify-center text-[0.7em] ${
          todo.completedAt ? prioColor : "border-white/40 bg-transparent"
        }`}
      >
        {todo.completedAt && "✓"}
      </span>
      <span className={`text-[0.82em] flex-1 truncate ${todo.completedAt ? "opacity-40 line-through" : ""}`}>
        {renderInlineMarkdown(todo.title)}
      </span>
      <div className="flex items-center gap-[0.3em] shrink-0 text-[0.65em] opacity-70">
        {showAssignee && todo.assignee && (
          <span className="bg-white/10 rounded px-[0.3em] py-[0.1em] truncate max-w-[6em]">
            {todo.assignee}
          </span>
        )}
        {dueLabel && (
          <span className={overdue ? "text-red-400" : "opacity-70"}>{dueLabel}</span>
        )}
      </div>
    </button>
  );
}

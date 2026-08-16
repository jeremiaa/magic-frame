"use client";

import { useEffect, useRef, useState } from "react";
import { connectLiveSync } from "@/lib/live-socket";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";
import { renderInlineMarkdown } from "@/lib/inline-markdown";
import { writeAndReport } from "@/lib/ha/action-client";

type Item = {
  id: string;
  text: string;
  checked: boolean;
  createdAt: string;
  checkedAt: string | null;
};

export default function ShoppingListWidget({ config }: { config?: any }) {
  const t = useT();
  const [items, setItems] = useState<Item[]>([]);
  const [newText, setNewText] = useState("");
  const socketRef = useRef<ReturnType<typeof connectLiveSync> | null>(null);

  const useHa = config?.listSource === "ha" && !!config?.haListEntity;
  const haEntity: string = config?.haListEntity ?? "";
  const useTodoist = config?.listSource === "todoist" && !!config?.todoistProjectId;
  const todoistProject: string = config?.todoistProjectId ?? "";
  const isRemote = useHa || useTodoist;

  async function reload() {
    try {
      if (useHa) {
        const r = await fetch(`/api/ha-lists/${encodeURIComponent(haEntity)}/items`, {
          cache: "no-store",
        });
        const d = await r.json();
        const mapped: Item[] = (d.items ?? []).map((it: any) => ({
          id: it.uid,
          text: it.summary,
          checked: it.status === "completed",
          createdAt: "",
          checkedAt: it.status === "completed" ? "now" : null,
        }));
        setItems(mapped);
      } else if (useTodoist) {
        const r = await fetch(`/api/todoist/tasks/${encodeURIComponent(todoistProject)}`, {
          cache: "no-store",
        });
        const d = await r.json();
        // Todoist /tasks liefert per default nur offene — daher checked-Liste leer.
        const mapped: Item[] = (d.tasks ?? []).map((task: any) => ({
          id: String(task.id),
          text: task.content,
          checked: !!task.isCompleted,
          createdAt: "",
          checkedAt: task.isCompleted ? "now" : null,
        }));
        setItems(mapped);
      } else {
        const r = await fetch("/api/shopping", { cache: "no-store" });
        const d = await r.json();
        setItems(d.items ?? []);
      }
    } catch {}
  }

  useEffect(() => {
    reload();
    if (isRemote) {
      const id = setInterval(reload, 10_000);
      return () => clearInterval(id);
    }
    const socket = connectLiveSync();
    socketRef.current = socket;
    socket.on("SHOPPING_UPDATED", () => reload());
    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useHa, haEntity, useTodoist, todoistProject]);

  async function toggle(id: string) {
    const cur = items.find((i) => i.id === id);
    const nextChecked = !cur?.checked;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: nextChecked } : i)));
    if (useHa && cur) {
      await writeAndReport(`/api/ha-lists/${encodeURIComponent(haEntity)}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: cur.text,
          status: nextChecked ? "completed" : "needs_action",
        }),
      });
    } else if (useTodoist) {
      await writeAndReport(`/api/todoist/tasks/${encodeURIComponent(todoistProject)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: id,
          action: nextChecked ? "close" : "reopen",
        }),
      });
    } else {
      // reload als Rückfall: schlägt der Schreibzugriff fehl (auf einem
      // Display ohne Anmeldung 401), stünde der Haken sonst dauerhaft
      // falsch — es gibt dann kein SHOPPING_UPDATED, das ihn korrigiert.
      await writeAndReport(`/api/shopping/${id}`, { method: "PATCH" }, reload);
    }
  }

  async function addItem() {
    const text = newText.trim();
    if (!text) return;
    setNewText("");
    if (useHa) {
      await writeAndReport(`/api/ha-lists/${encodeURIComponent(haEntity)}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: text }),
      });
      reload();
    } else if (useTodoist) {
      await writeAndReport(`/api/todoist/tasks/${encodeURIComponent(todoistProject)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      reload();
    } else {
      await writeAndReport("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    }
  }

  async function clearDone() {
    if (!confirm(t("Alle abgehakten löschen?"))) return;
    if (useHa) {
      await writeAndReport(
        `/api/ha-lists/${encodeURIComponent(haEntity)}/items?completed=1`,
        { method: "DELETE" },
      );
      reload();
    } else if (useTodoist) {
      // Todoist hat keine native "alle completed wegwerfen"-Aktion auf REST v2 —
      // wir machen es client-seitig: alle gerade als done markierten Items löschen.
      const doneIds = items.filter((i) => i.checked).map((i) => i.id);
      await Promise.all(
        doneIds.map((id) =>
          writeAndReport(
            `/api/todoist/tasks/${encodeURIComponent(todoistProject)}?taskId=${encodeURIComponent(id)}`,
            { method: "DELETE" },
          ),
        ),
      );
      reload();
    } else {
      await writeAndReport("/api/shopping", { method: "DELETE" });
    }
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const hideAdd = config?.hideAddForm === true;
  const customTitle = (config?.title ?? "").trim();
  const hideHeader = config?.hideHeader === true;
  const hideCount = config?.hideCount === true;
  const headerLabel = customTitle || t("Einkaufsliste");

  return (
    <div className="w-full h-full flex flex-col gap-[0.5em] overflow-hidden p-1">
      {!hideHeader && (
        <div className="flex items-center gap-[0.5em] mb-[0.2em]">
          <ShoppingCart size={14} className="opacity-60 shrink-0" />
          <span className="text-[0.7em] opacity-60 uppercase tracking-wider">
            {headerLabel}{!hideCount && ` · ${unchecked.length}`}
          </span>
          {checked.length > 0 && (
            <button
              onClick={clearDone}
              className="ml-auto text-[0.6em] opacity-40 hover:opacity-80 nodrag flex items-center gap-[0.2em]"
              title={t("Abgehakte löschen")}
            >
              <Trash2 size={10} /> {checked.length}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden flex flex-col gap-[0.3em] p-[0.15em]"
           style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
        {unchecked.map((it) => (
          <ListRow key={it.id} item={it} onToggle={() => toggle(it.id)} />
        ))}
        {checked.length > 0 && (
          <div className="mt-[0.4em] pt-[0.3em] border-t border-white/10 text-[0.6em] opacity-40 uppercase tracking-wider">
            {t("Erledigt")}
          </div>
        )}
        {checked.map((it) => (
          <ListRow key={it.id} item={it} onToggle={() => toggle(it.id)} />
        ))}
        {items.length === 0 && (
          <div className="opacity-40 text-[0.8em] text-center mt-2">{t("Nichts auf der Liste")}</div>
        )}
      </div>

      {!hideAdd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItem();
          }}
          className="flex items-center gap-[0.4em] mt-[0.3em] nodrag"
        >
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={t("+ Artikel hinzufügen")}
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

function ListRow({ item, onToggle }: { item: Item; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-[0.6em] text-left bg-black/20 hover:bg-black/40 rounded-md px-[0.6em] py-[0.3em] transition-colors nodrag"
    >
      <span
        className={`shrink-0 w-[1em] h-[1em] rounded-sm border flex items-center justify-center text-[0.7em] ${
          item.checked
            ? "bg-emerald-500/80 border-emerald-400"
            : "border-white/40 bg-transparent"
        }`}
      >
        {item.checked && "✓"}
      </span>
      <span
        className={`text-[0.82em] flex-1 truncate ${item.checked ? "opacity-40 line-through" : ""}`}
      >
        {renderInlineMarkdown(item.text)}
      </span>
    </button>
  );
}

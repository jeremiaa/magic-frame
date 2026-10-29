"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowRight, MessageSquareText, Copy } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

type DigestSummary = {
  id: string;
  slug: string;
  name: string;
  entries: { widgetId: string; dashboardId: string }[];
};

function DigestAddress({ slug }: { slug: string }) {
  const t = useT();
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setUrl(`${window.location.origin}/api/digest/${slug}`);
  }, [slug]);

  return (
    <button
      type="button"
      title={t("Adresse kopieren")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!url) return;
        navigator.clipboard?.writeText(url).then(
          () => { setCopied(true); setTimeout(() => setCopied(false), 1500); },
          () => {},
        );
      }}
      className="text-xs text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)]/70 mt-1 font-mono text-left break-all transition-colors flex items-start gap-1.5 group/addr"
    >
      <span>/api/digest/{slug}</span>
      {url && (
        <Copy
          size={11}
          className={`shrink-0 mt-0.5 transition-opacity ${copied ? "opacity-100 text-green-400" : "opacity-0 group-hover/addr:opacity-60"}`}
        />
      )}
    </button>
  );
}

export default function DigestsListPage() {
  const t = useT();
  const router = useRouter();
  const [digests, setDigests] = useState<DigestSummary[] | null>(null);
  const [viewNamesById, setViewNamesById] = useState<Record<string, string>>({});
  const [modal, setModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/admin/digests?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDigests(Array.isArray(d) ? d : []))
      .catch(() => setDigests([]));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    fetch("/api/dashboards", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setViewNamesById(Object.fromEntries(data.map((d: any) => [d.id, d.name || d.id])));
      })
      .catch(() => {});
  }, []);

  function openNewModal() {
    setError(null);
    setFormName("");
    setFormSlug("");
    setModal(true);
  }

  async function submitDigest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/digests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: formSlug, name: formName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("Konnte nicht angelegt werden."));
        return;
      }
      setModal(false);
      load();
      router.push(`/editor/digests/${encodeURIComponent(data.id)}`);
    } catch {
      setError(t("Netzwerkfehler."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteDigest(id: string, name: string) {
    const msg = t("Digest „{name}“ wirklich löschen?").replace("{name}", name);
    if (!confirm(msg)) return;
    await fetch(`/api/admin/digests/${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  function viewNames(entries: DigestSummary["entries"]): string {
    const ids = [...new Set(entries.map((e) => e.dashboardId))];
    return ids.length > 0 ? ids.map((id) => viewNamesById[id] ?? id).join(", ") : "—";
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-8 py-10">
        <header className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--mf-fg)]/40 mb-2">
              {t("Digests")}
            </div>
            <h1 className="text-3xl font-semibold">
              {t("Text-Zusammenfassungen")}
            </h1>
            <p className="text-[var(--mf-fg)]/50 mt-2 max-w-xl text-sm">
              {t("Ein Digest fasst die Widgets eines Views als Text zusammen — für SMS, Push-Nachrichten oder Home-Assistant-Automationen.")}
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm shadow-blue-500/30"
          >
            <Plus size={14} /> {t("Neuer Digest")}
          </button>
        </header>

        {digests === null ? (
          <div className="text-[var(--mf-fg)]/40 text-sm">{t("Wird geladen…")}</div>
        ) : digests.length === 0 ? (
          <div className="bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-2xl p-12 text-center">
            <MessageSquareText size={32} className="mx-auto text-[var(--mf-fg)]/20 mb-4" />
            <p className="text-[var(--mf-fg)]/60 mb-4">{t("Noch keine Digests angelegt.")}</p>
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium"
            >
              <Plus size={14} /> {t("Ersten Digest anlegen")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {digests.map((d) => (
              <div
                key={d.id}
                className="group bg-[var(--mf-surface-2)]/60 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 hover:border-blue-500/40 rounded-2xl p-4 transition-colors flex flex-col"
              >
                <Link href={`/editor/digests/${encodeURIComponent(d.id)}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquareText size={18} className="text-blue-400/70 shrink-0" />
                    <span className="font-semibold truncate">{d.name}</span>
                    <ArrowRight
                      size={14}
                      className="text-[var(--mf-fg)]/30 group-hover:text-[var(--mf-fg)]/80 transition-colors shrink-0 ml-auto"
                    />
                  </div>
                </Link>
                <div className="text-xs text-[var(--mf-fg)]/50 mb-1">
                  {t("Views")}: {viewNames(d.entries)}
                </div>
                <div className="text-xs text-[var(--mf-fg)]/40 mb-2">
                  {d.entries.length} {d.entries.length === 1 ? "Widget" : "Widgets"}
                </div>
                <DigestAddress slug={d.slug} />
                <div className="flex items-center gap-3 mt-auto pt-3 border-t border-[var(--mf-bdr)]/5">
                  <Link
                    href={`/editor/digests/${encodeURIComponent(d.id)}`}
                    className="text-[11px] text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] flex items-center gap-1"
                  >
                    {t("Bearbeiten")}
                  </Link>
                  <button
                    onClick={() => deleteDigest(d.id, d.name)}
                    className="ml-auto text-[11px] text-red-400/70 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 size={11} /> {t("Löschen")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div
          className="fixed inset-0 bg-[var(--mf-backdrop)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setModal(false)}
        >
          <form
            onSubmit={submitDigest}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-lg font-semibold mb-1">{t("Neuer Digest")}</h2>
            <p className="text-sm text-[var(--mf-fg)]/50 mb-6">
              {t("Widgets werden danach im Editor aus beliebigen Views hinzugefügt.")}
            </p>

            <label className="block mb-4">
              <span className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-2">
                {t("Name")}
              </span>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!formSlug || formSlug === formName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")) {
                    setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""));
                  }
                }}
                placeholder={t("z.B. Morgen-SMS")}
                className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </label>

            <label className="block mb-6">
              <span className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-2">
                {t("Adresse")}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--mf-fg)]/40 font-mono text-sm">/api/digest/</span>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={(e) =>
                    setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                  }
                  placeholder="morning-sms"
                  className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-mono rounded-lg p-3 outline-none focus:border-blue-500"
                />
              </div>
            </label>

            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                {t(error)}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="px-4 py-2 rounded-full text-sm text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5"
              >
                {t("Abbrechen")}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-full text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50"
              >
                {busy ? t("Wird angelegt…") : t("Anlegen & öffnen")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

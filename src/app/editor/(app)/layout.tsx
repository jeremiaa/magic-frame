"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Layers,
  Plug,
  Package,
  Settings as SettingsIcon,
  Archive,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import MagicFrameLogo from "@/components/MagicFrameLogo";
import { LocaleProvider, useT } from "@/lib/i18n/LocaleProvider";
import UpdateBanner from "@/app/editor/_components/UpdateBanner";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: (path: string) => boolean;
  badge?: string;
};

const NAV: NavItem[] = [
  { href: "/editor", label: "Dashboard", icon: <LayoutDashboard size={17} />, match: (p) => p === "/editor" },
  { href: "/editor/views", label: "Views", icon: <Layers size={17} />, match: (p) => p === "/editor/views" || p.startsWith("/editor/views/") },
  { href: "/editor/integrations", label: "Integrationen", icon: <Plug size={17} />, match: (p) => p.startsWith("/editor/integrations") },
  { href: "/editor/modules", label: "Module", icon: <Package size={17} />, match: (p) => p.startsWith("/editor/modules") },
  { href: "/editor/settings", label: "Einstellungen", icon: <SettingsIcon size={17} />, match: (p) => p.startsWith("/editor/settings") },
  { href: "/editor/backups", label: "Backups", icon: <Archive size={17} />, match: (p) => p.startsWith("/editor/backups") },
];

export default function EditorAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LocaleProvider>
      <EditorAppLayoutInner>{children}</EditorAppLayoutInner>
    </LocaleProvider>
  );
}

function EditorAppLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname() || "/editor";
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // Editor light/dark theme (#21). Persisted per browser; flips the data-theme
  // attribute on the editor root, which swaps the --mf-* CSS variables.
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setEmail(d?.user?.email ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mf-editor-theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("mf-editor-theme", next);
      } catch {}
      return next;
    });
  };

  const sidebarContent = (
    <>
      <div className="h-14 flex items-center gap-2 px-4 border-b border-[var(--mf-bdr)]/10 shrink-0">
        <MagicFrameLogo className="w-8 h-8" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-none">Magic Frame</div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--mf-fg)]/40 mt-1">
            {t("Control Center")}
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-md text-[var(--mf-fg)]/60 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5"
          aria-label={t("Menü schließen")}
        >
          <X size={17} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map((item) => {
          const active = item.match ? item.match(pathname) : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-500/15 text-blue-200 border border-blue-500/30"
                  : "text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5 border border-transparent"
              }`}
            >
              <span className={active ? "text-blue-300" : "text-[var(--mf-fg)]/50"}>
                {item.icon}
              </span>
              <span className="flex-1 truncate">{t(item.label)}</span>
              {item.badge && (
                <span className="text-[9px] uppercase tracking-wider bg-[var(--mf-elev)]/10 text-[var(--mf-fg)]/60 px-1.5 py-0.5 rounded">
                  {t(item.badge)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--mf-bdr)]/10 p-3 space-y-2 shrink-0">
        <div className="px-3 py-2 rounded-lg bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10">
          <div className="text-[10px] uppercase tracking-widest text-[var(--mf-fg)]/40">
            {t("Angemeldet als")}
          </div>
          <div className="text-xs text-[var(--mf-fg)]/80 truncate mt-0.5">
            {email ?? "…"}
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5 transition-colors"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {theme === "dark" ? t("Heller Modus") : t("Dunkler Modus")}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5 transition-colors"
        >
          <LogOut size={15} />
          {t("Abmelden")}
        </button>
      </div>
    </>
  );

  return (
    <div data-theme={theme} className="mf-admin h-screen flex bg-[var(--mf-surface)] light:bg-[#eef2f7] text-[var(--mf-fg)] overflow-hidden">
      <aside className="hidden md:flex w-60 shrink-0 border-r border-[var(--mf-bdr)]/10 bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] flex-col">
        {sidebarContent}
      </aside>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-[70] flex"
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="w-72 max-w-[85vw] h-full bg-[var(--mf-surface)] border-r border-[var(--mf-bdr)]/10 flex flex-col shadow-2xl animate-in slide-in-from-left"
          >
            {sidebarContent}
          </aside>
          <div className="flex-1 bg-[var(--mf-backdrop)]/60 backdrop-blur-sm" />
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <UpdateBanner />
        <div className="md:hidden h-12 shrink-0 border-b border-[var(--mf-bdr)]/10 bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] flex items-center gap-2 px-3">
          <button
            onClick={() => setOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5 transition-colors"
            aria-label={t("Menü öffnen")}
          >
            <Menu size={17} />
          </button>
          <MagicFrameLogo className="w-6 h-6" />
          <span className="text-sm font-semibold truncate">
            {t(NAV.find((n) => (n.match ? n.match(pathname) : pathname === n.href))?.label ?? "Magic Frame")}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}

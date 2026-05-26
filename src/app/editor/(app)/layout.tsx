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

  const sidebarContent = (
    <>
      <div className="h-14 flex items-center gap-2 px-4 border-b border-white/10 shrink-0">
        <MagicFrameLogo className="w-8 h-8" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-none">Magic Frame</div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-white/40 mt-1">
            {t("Control Center")}
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/5"
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
                  : "text-white/70 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <span className={active ? "text-blue-300" : "text-white/50"}>
                {item.icon}
              </span>
              <span className="flex-1 truncate">{t(item.label)}</span>
              {item.badge && (
                <span className="text-[9px] uppercase tracking-wider bg-white/10 text-white/60 px-1.5 py-0.5 rounded">
                  {t(item.badge)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-2 shrink-0">
        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <div className="text-[10px] uppercase tracking-widest text-white/40">
            {t("Angemeldet als")}
          </div>
          <div className="text-xs text-white/80 truncate mt-0.5">
            {email ?? "…"}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut size={15} />
          {t("Abmelden")}
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen flex bg-zinc-950 text-white overflow-hidden">
      <aside className="hidden md:flex w-60 shrink-0 border-r border-white/10 bg-black/40 flex-col">
        {sidebarContent}
      </aside>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-[70] flex"
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="w-72 max-w-[85vw] h-full bg-zinc-950 border-r border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-left"
          >
            {sidebarContent}
          </aside>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" />
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <UpdateBanner />
        <div className="md:hidden h-12 shrink-0 border-b border-white/10 bg-black/40 flex items-center gap-2 px-3">
          <button
            onClick={() => setOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
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

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { NAV, HOME, navGroupSlug, EXPANDED_GROUPS_KEY } from "./_nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Accordion: at most one nav group expanded at a time. Every group starts
  // collapsed; opening one collapses the others. Persisted to localStorage.
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXPANDED_GROUPS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") setExpandedGroup(parsed);
      else if (Array.isArray(parsed) && parsed.length > 0) setExpandedGroup(parsed[0]);
    } catch { /* ignore parse errors */ }
  }, []);
  const toggleGroup = (name: string) => {
    setExpandedGroup((prev) => {
      const next = prev === name ? null : name;
      try {
        if (next) localStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify(next));
        else localStorage.removeItem(EXPANDED_GROUPS_KEY);
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (!loading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ls-secondary">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ls-secondary">
        Redirecting to login...
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-ls-secondary gap-2">
        <p>Access denied. Your role: <strong>{user.role}</strong></p>
        <p className="text-xs">User ID: {user.id}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 bg-ls-primary text-white flex flex-col fixed top-0 left-0 h-full" style={{ zIndex: 10000 }}>
        <div className="px-lg py-xl border-b border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50 mb-[2px]">Admin</p>
          <p className="text-[15px] font-bold">Little Saigon</p>
        </div>
        {/* Open public website in a new tab — pinned at the very top of the
            menu so it's always one click away from inside the admin. */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-sm px-lg py-[10px] text-[13px] font-medium border-b border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-sm">
            <ExternalLink size={16} />
            Open Website
          </span>
          <span className="text-[10px] uppercase tracking-wider text-white/40">new tab</span>
        </a>
        {/* Home — pinned outside the scrollable nav so it's always reachable */}
        {(() => {
          const active = pathname === HOME.href;
          const Icon = HOME.icon;
          return (
            <Link
              href={HOME.href}
              className={`flex items-center gap-sm px-lg py-[10px] text-[13px] font-medium border-b border-white/10 transition-colors ${
                active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {HOME.label}
            </Link>
          );
        })()}
        <nav className="flex-1 py-md overflow-y-auto">
          {NAV.map((item, idx) => {
            if ("group" in item) {
              const slug = navGroupSlug(item.group);
              const onGroupPage = pathname === `/admin/group/${slug}`;
              const expanded = expandedGroup === item.group;
              return (
                <div key={item.group} className={idx > 0 ? "mt-[6px]" : ""}>
                  <div className="flex items-stretch">
                    <Link
                      href={`/admin/group/${slug}`}
                      className={`flex-1 px-lg pt-[10px] pb-[4px] text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                        onGroupPage ? "text-white" : "text-white/45 hover:text-white/80"
                      }`}
                    >
                      {item.group}
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.group)}
                      aria-label={expanded ? "Collapse" : "Expand"}
                      className="px-md text-white/40 hover:text-white/80 transition-colors"
                    >
                      {expanded
                        ? <ChevronDown size={11} />
                        : <ChevronRight size={11} />}
                    </button>
                  </div>
                  {expanded && item.items.map(({ href, label, icon: Icon, exact }) => {
                    const active = exact ? pathname === href : pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`flex items-center gap-sm px-lg py-[8px] text-[13px] font-medium transition-colors ${
                          active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon size={15} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              );
            }
            const { href, label, icon: Icon, exact } = item;
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-sm px-lg py-[10px] text-[13px] font-medium transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-lg py-lg border-t border-white/10">
          <p className="text-[12px] text-white/60 truncate mb-sm">{user.displayName}</p>
          <button
            onClick={() => logout().then(() => router.push("/"))}
            className="flex items-center gap-sm text-[12px] text-white/60 hover:text-white transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-[220px] min-h-screen bg-gray-50">
        {children}
      </main>
    </div>
  );
}

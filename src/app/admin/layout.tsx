"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Store, Users, Star, BookOpen, LogOut, Building2, FolderTree, Settings, Image, Ticket, Calendar, ScanLine, Bell, Tags, Coins, Flag, Camera, FileText, Activity, Trophy, ThumbsUp, Gamepad2, TrendingUp, Heart, UtensilsCrossed, Inbox, History, KeyRound, Search, MessageSquare,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
type NavGroup = { group: string; items: NavItem[] };

const HOME: NavItem = { href: "/admin", label: "Home", icon: LayoutDashboard, exact: true };

const NAV: (NavItem | NavGroup)[] = [
  { group: "Analytics & Tracking", items: [
    { href: "/admin/analytics", label: "Analytics", icon: Activity },
    { href: "/admin/login-attempts", label: "Login Attempts", icon: KeyRound },
    { href: "/admin/search-queries", label: "Search Queries", icon: Search },
    { href: "/admin/popular", label: "Popular", icon: TrendingUp },
    { href: "/admin/game-stats", label: "Game Stats", icon: Gamepad2 },
    { href: "/admin/votes", label: "Votes", icon: ThumbsUp },
    { href: "/admin/search-terms", label: "Search Terms", icon: Tags },
    { href: "/admin/reports", label: "Reports", icon: Flag },
  ]},
  { group: "Content", items: [
    { href: "/admin/businesses", label: "Businesses", icon: Store },
    { href: "/admin/categories", label: "Categories", icon: FolderTree },
    { href: "/admin/guide", label: "Food Guide", icon: BookOpen },
    { href: "/admin/blog", label: "Blog", icon: FileText },
    { href: "/admin/recipes", label: "Recipes", icon: UtensilsCrossed },
    { href: "/admin/photo-audit", label: "Photo Manager", icon: Camera },
    { href: "/admin/photo-replacement-queue", label: "Replacement Queue", icon: Camera },
    { href: "/admin/photo-feed", label: "Photo Feed", icon: Heart },
  ]},
  { group: "Promotions & Events", items: [
    { href: "/admin/promotions", label: "Promotions", icon: Ticket },
    { href: "/admin/rewards", label: "Rewards", icon: Coins },
    { href: "/admin/challenges", label: "Challenges", icon: Trophy },
    { href: "/admin/events", label: "Events", icon: Calendar },
    { href: "/admin/tickets", label: "Tickets", icon: ScanLine },
    { href: "/admin/banners", label: "Promo Banners", icon: Image },
  ]},
  { group: "Users & Comms", items: [
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/reviews", label: "Reviews", icon: Star },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
    { href: "/admin/claims", label: "Claims", icon: Building2 },
    { href: "/admin/inbox", label: "Inbox", icon: Inbox },
    { href: "/admin/community/reports", label: "Forum Reports", icon: MessageSquare },
  ]},
  { group: "Settings", items: [
    { href: "/admin/settings", label: "Page Settings", icon: Settings },
  ]},
  { group: "About", items: [
    { href: "/admin/build-history", label: "Build History", icon: History },
  ]},
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
              return (
                <div key={item.group} className={idx > 0 ? "mt-[6px]" : ""}>
                  <p className="px-lg pt-[10px] pb-[4px] text-[10px] font-semibold uppercase tracking-widest text-white/35">
                    {item.group}
                  </p>
                  {item.items.map(({ href, label, icon: Icon, exact }) => {
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

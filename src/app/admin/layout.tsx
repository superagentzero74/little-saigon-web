"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Store, Users, Star, BookOpen, LogOut, Building2,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/businesses", label: "Businesses", icon: Store },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/guide", label: "Món Việt Guide", icon: BookOpen },
  { href: "/admin/claims", label: "Claims", icon: Building2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center text-ls-secondary">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 bg-ls-primary text-white flex flex-col fixed top-0 left-0 h-full z-40">
        <div className="px-lg py-xl border-b border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50 mb-[2px]">Admin</p>
          <p className="text-[15px] font-bold">Little Saigon</p>
        </div>
        <nav className="flex-1 py-md overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
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

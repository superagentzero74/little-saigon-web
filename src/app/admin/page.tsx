"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, Users, Star, TrendingUp, ChevronRight, ArrowRight } from "lucide-react";
import { getAdminStats, getAllReviews, getNewlyAddedBusinesses } from "@/lib/services";
import type { Review, Business } from "@/lib/types";

export default function AdminDashboard() {
  const [stats, setStats] = useState<{ businesses: number; users: number; reviews: number } | null>(null);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [newBiz, setNewBiz] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAdminStats(),
      getAllReviews(5),
      getNewlyAddedBusinesses(5),
    ]).then(([s, r, b]) => {
      setStats(s);
      setRecentReviews(r);
      setNewBiz(b);
    }).finally(() => setLoading(false));
  }, []);

  const fmtDate = (ts: any) => {
    if (!ts) return "";
    const ms = ts.toMillis?.() ?? ts.seconds * 1000;
    return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const STAT_CARDS = [
    { label: "Businesses", value: stats?.businesses, icon: Store, href: "/admin/businesses", color: "bg-blue-500" },
    { label: "Users", value: stats?.users, icon: Users, href: "/admin/users", color: "bg-violet-500" },
    { label: "Reviews", value: stats?.reviews, icon: Star, href: "/admin/reviews", color: "bg-amber-500" },
    { label: "Rating Avg", value: newBiz.length ? (newBiz.reduce((s, b) => s + b.rating, 0) / newBiz.length).toFixed(1) : "—", icon: TrendingUp, href: "/admin/businesses", color: "bg-green-500" },
  ];

  return (
    <div className="p-2xl">
      <div className="mb-2xl">
        <h1 className="text-[24px] font-bold text-ls-primary">Dashboard</h1>
        <p className="text-[14px] text-ls-secondary mt-xs">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-2xl">
        {STAT_CARDS.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href} className="bg-white rounded-card border border-ls-border p-lg flex items-center gap-md hover:shadow-sm transition-shadow">
            <div className={`w-[44px] h-[44px] rounded-card ${color} flex items-center justify-center shrink-0`}>
              <Icon size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[22px] font-bold text-ls-primary leading-tight">
                {loading ? <span className="inline-block w-12 h-6 bg-ls-surface rounded animate-pulse" /> : value}
              </p>
              <p className="text-[12px] text-ls-secondary">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl">
        {/* Recent Reviews */}
        <div className="bg-white rounded-card border border-ls-border">
          <div className="flex items-center justify-between px-lg py-md border-b border-ls-border">
            <h2 className="text-[14px] font-semibold text-ls-primary">Recent Reviews</h2>
            <Link href="/admin/reviews" className="flex items-center gap-xs text-[12px] text-ls-secondary hover:text-ls-primary">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-ls-border">
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} className="px-lg py-md animate-pulse">
                <div className="h-4 bg-ls-surface rounded w-2/3 mb-xs" />
                <div className="h-3 bg-ls-surface rounded w-1/3" />
              </div>
            )) : recentReviews.length === 0 ? (
              <p className="px-lg py-lg text-[13px] text-ls-secondary">No reviews yet.</p>
            ) : recentReviews.map((r) => (
              <div key={r.id} className="px-lg py-md">
                <div className="flex items-start justify-between gap-md">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ls-primary truncate">{r.userName}</p>
                    <p className="text-[12px] text-ls-secondary truncate">{r.businessId.slice(0, 20)}&hellip;</p>
                    {r.text && <p className="text-[12px] text-ls-body mt-[2px] line-clamp-2">{r.text}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12px] font-semibold text-amber-500">{"★".repeat(r.rating)}</p>
                    <p className="text-[11px] text-ls-secondary">{fmtDate(r.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Newly Added Businesses */}
        <div className="bg-white rounded-card border border-ls-border">
          <div className="flex items-center justify-between px-lg py-md border-b border-ls-border">
            <h2 className="text-[14px] font-semibold text-ls-primary">Recently Updated Businesses</h2>
            <Link href="/admin/businesses" className="flex items-center gap-xs text-[12px] text-ls-secondary hover:text-ls-primary">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-ls-border">
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} className="px-lg py-md animate-pulse">
                <div className="h-4 bg-ls-surface rounded w-2/3 mb-xs" />
                <div className="h-3 bg-ls-surface rounded w-1/3" />
              </div>
            )) : newBiz.map((b) => (
              <div key={b.id} className="px-lg py-md flex items-center gap-md">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ls-primary truncate">{b.name}</p>
                  <p className="text-[11px] text-ls-secondary capitalize">{b.category}</p>
                </div>
                <span className="shrink-0 text-[11px] text-ls-secondary">{fmtDate(b.updatedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-2xl grid grid-cols-1 sm:grid-cols-3 gap-md">
        {[
          { href: "/admin/businesses", label: "Manage Businesses", desc: "Edit listings, toggle active status" },
          { href: "/admin/users", label: "Manage Users", desc: "View users, assign admin roles" },
          { href: "/admin/guide", label: "Món Việt Guide", desc: "Curate best restaurants per dish" },
        ].map(({ href, label, desc }) => (
          <Link key={href} href={href} className="bg-white rounded-card border border-ls-border p-lg hover:shadow-sm transition-shadow group">
            <p className="text-[14px] font-semibold text-ls-primary group-hover:text-ls-primary">{label}</p>
            <p className="text-[12px] text-ls-secondary mt-xs">{desc}</p>
            <ArrowRight size={14} className="text-ls-secondary mt-md group-hover:text-ls-primary transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}

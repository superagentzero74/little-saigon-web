"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, Users, Star, TrendingUp, ChevronRight, ArrowRight, Pencil, AlertCircle, Building2, Flag, ImageOff } from "lucide-react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAdminStats, getAllReviews, getNewlyAddedBusinesses, getBusinessById, getBusinesses } from "@/lib/services";
import type { Review, Business } from "@/lib/types";

interface TodoItem {
  label: string;
  count: number;
  href: string;
  icon: typeof AlertCircle;
  color: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<{ businesses: number; users: number; reviews: number } | null>(null);
  const [recentReviews, setRecentReviews] = useState<(Review & { businessName?: string })[]>([]);
  const [newBiz, setNewBiz] = useState<Business[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [todosLoading, setTodosLoading] = useState(true);

  useEffect(() => {
    // Load main dashboard data
    Promise.all([
      getAdminStats(),
      getAllReviews(5),
      getNewlyAddedBusinesses(5),
    ]).then(async ([s, r, b]) => {
      setStats(s);
      setNewBiz(b);
      const enriched = await Promise.all(
        r.map(async (review) => {
          const biz = await getBusinessById(review.businessId).catch(() => null);
          return { ...review, businessName: biz?.name };
        })
      );
      setRecentReviews(enriched);
    }).finally(() => setLoading(false));

    // Load todo counts
    loadTodos();
  }, []);

  async function loadTodos() {
    setTodosLoading(true);
    try {
      const [claimsSnap, reportsSnap, allBiz] = await Promise.all([
        getDocs(query(collection(db, "claimRequests"), where("status", "in", ["new", "pending"]))),
        getDocs(query(collection(db, "reports"), where("status", "==", "new"))),
        getBusinesses().then((r) => r.businesses),
      ]);

      const noPhotos = allBiz.filter((b: Business) => !b.photos || b.photos.length === 0).length;

      const items: TodoItem[] = [];
      if (claimsSnap.size > 0) items.push({ label: "Pending business claims", count: claimsSnap.size, href: "/admin/claims", icon: Building2, color: "text-amber-600 bg-amber-50 border-amber-200" });
      if (reportsSnap.size > 0) items.push({ label: "New reports to review", count: reportsSnap.size, href: "/admin/reports", icon: Flag, color: "text-red-600 bg-red-50 border-red-200" });
      if (noPhotos > 0) items.push({ label: "Businesses without photos", count: noPhotos, href: "/admin/photo-audit", icon: ImageOff, color: "text-blue-600 bg-blue-50 border-blue-200" });
      setTodos(items);
    } catch (e) {
      console.error("Failed to load todos:", e);
    } finally {
      setTodosLoading(false);
    }
  }

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

      {/* Action items */}
      {todosLoading ? (
        <div className="mb-2xl animate-pulse">
          <div className="h-[60px] bg-ls-surface rounded-card" />
        </div>
      ) : todos.length > 0 && (
        <div className="mb-2xl space-y-sm">
          <h2 className="text-[13px] font-semibold text-ls-secondary uppercase tracking-wide flex items-center gap-xs">
            <AlertCircle size={14} /> Needs Attention
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sm">
            {todos.map((todo) => (
              <Link
                key={todo.href}
                href={todo.href}
                className={`flex items-center gap-md p-md rounded-card border ${todo.color} hover:shadow-sm transition-shadow`}
              >
                <todo.icon size={20} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">{todo.label}</p>
                </div>
                <span className="text-[18px] font-bold shrink-0">{todo.count}</span>
                <ChevronRight size={16} className="shrink-0 opacity-50" />
              </Link>
            ))}
          </div>
        </div>
      )}

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
                    <Link href={`/admin/businesses/${r.businessId}/edit`} className="text-[12px] text-ls-secondary hover:text-ls-primary hover:underline truncate block">
                      {r.businessName || r.businessId}
                    </Link>
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
            <h2 className="text-[14px] font-semibold text-ls-primary">Recently Updated</h2>
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
                <Link
                  href={`/admin/businesses/${b.id}/edit`}
                  className="shrink-0 p-xs text-ls-secondary hover:text-ls-primary"
                  title="Edit"
                >
                  <Pencil size={14} />
                </Link>
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
          { href: "/admin/guide", label: "Food Guide", desc: "Manage foods list and featured restaurants" },
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

"use client";

import { useEffect, useState } from "react";
import {
  Activity, Users, Eye, UserPlus, Coins, QrCode, Gift, TrendingUp,
  Smartphone, Globe, Clock, Power, Loader2
} from "lucide-react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminStats, useLiveUsers, useWeeklyStats } from "@/hooks/useAdminDashboard";
import type { DailyStats } from "@/hooks/useAdminDashboard";

export default function AnalyticsDashboard() {
  const { stats, loading } = useAdminStats();
  const { users: liveUsers, liveCount } = useLiveUsers();
  const { weekData, loading: weekLoading } = useWeeklyStats();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const displayStats = selectedDate
    ? weekData.find((d) => d.date === selectedDate) ?? null
    : stats;

  const STAT_CARDS: { label: string; key: keyof DailyStats; icon: typeof Activity; color: string }[] = [
    { label: "Unique Visitors", key: "uniqueVisitors", icon: Users, color: "bg-blue-500" },
    { label: "Total Sessions", key: "totalSessions", icon: Activity, color: "bg-violet-500" },
    { label: "Page Views", key: "pageViews", icon: Eye, color: "bg-cyan-500" },
    { label: "New Members", key: "newMembers", icon: UserPlus, color: "bg-green-500" },
    { label: "Dong Earned", key: "dongEarned", icon: Coins, color: "bg-amber-500" },
    { label: "Dong Redeemed", key: "dongRedeemed", icon: Coins, color: "bg-orange-500" },
    { label: "QR Scans", key: "qrScans", icon: QrCode, color: "bg-pink-500" },
    { label: "Offers Redeemed", key: "offersRedeemed", icon: Gift, color: "bg-red-500" },
  ];

  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const maxVisitors = Math.max(...weekData.map((d) => d.uniqueVisitors), 1);

  return (
    <div className="p-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Analytics</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">
            {selectedDate
              ? `Stats for ${new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`
              : "Real-time app analytics"}
          </p>
        </div>
        {/* Live badge */}
        <div className="flex items-center gap-sm bg-green-50 border border-green-200 rounded-full px-lg py-sm">
          <span className="relative flex h-[8px] w-[8px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-[8px] w-[8px] bg-green-500" />
          </span>
          <span className="text-[13px] font-semibold text-green-700">{liveCount} live</span>
        </div>
      </div>

      {/* Date selector */}
      {selectedDate && (
        <button
          onClick={() => setSelectedDate(null)}
          className="mb-lg text-[13px] text-ls-secondary hover:text-ls-primary underline"
        >
          Back to today
        </button>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-2xl">
        {STAT_CARDS.map(({ label, key, icon: Icon, color }) => (
          <div key={key} className="bg-white rounded-card border border-ls-border p-lg flex items-center gap-md">
            <div className={`w-[44px] h-[44px] rounded-card ${color} flex items-center justify-center shrink-0`}>
              <Icon size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[22px] font-bold text-ls-primary leading-tight">
                {loading ? <span className="inline-block w-12 h-6 bg-ls-surface rounded animate-pulse" /> : fmtNum((displayStats?.[key] as number) ?? 0)}
              </p>
              <p className="text-[12px] text-ls-secondary">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* App Opens */}
      <AppOpensPanel />

      {/* Weekly trend */}
      <div className="bg-white rounded-card border border-ls-border p-lg mb-2xl">
        <div className="flex items-center gap-sm mb-lg">
          <TrendingUp size={16} className="text-ls-secondary" />
          <h2 className="text-[14px] font-semibold text-ls-primary">7-Day Trend</h2>
        </div>
        {weekLoading ? (
          <div className="h-[120px] flex items-center justify-center text-ls-secondary text-[13px]">Loading...</div>
        ) : (
          <div className="flex items-end gap-[6px] h-[120px]">
            {weekData.map((day) => {
              const h = Math.max((day.uniqueVisitors / maxVisitors) * 100, 4);
              const isSelected = selectedDate === day.date;
              const dayLabel = new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(isSelected ? null : day.date)}
                  className="flex-1 flex flex-col items-center gap-xs group"
                >
                  <span className="text-[11px] text-ls-secondary font-medium">{day.uniqueVisitors || ""}</span>
                  <div
                    className={`w-full rounded-t transition-colors ${
                      isSelected ? "bg-ls-primary" : "bg-blue-200 group-hover:bg-blue-400"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                  <span className={`text-[11px] ${isSelected ? "text-ls-primary font-semibold" : "text-ls-secondary"}`}>
                    {dayLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2xl">
        {/* Live Users */}
        <div className="bg-white rounded-card border border-ls-border">
          <div className="px-lg py-md border-b border-ls-border">
            <h2 className="text-[14px] font-semibold text-ls-primary flex items-center gap-sm">
              <Activity size={14} className="text-green-500" /> Live Users
            </h2>
          </div>
          <div className="divide-y divide-ls-border max-h-[320px] overflow-y-auto">
            {liveUsers.length === 0 ? (
              <p className="px-lg py-lg text-[13px] text-ls-secondary">No active sessions</p>
            ) : liveUsers.map((u) => (
              <div key={u.sessionId} className="px-lg py-sm flex items-center gap-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ls-primary truncate">{u.displayName}</p>
                  <p className="text-[11px] text-ls-secondary truncate">{u.currentPage}</p>
                </div>
                <span className="shrink-0">
                  {u.platform === "ios" ? (
                    <Smartphone size={14} className="text-ls-secondary" />
                  ) : (
                    <Globe size={14} className="text-ls-secondary" />
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-white rounded-card border border-ls-border">
          <div className="px-lg py-md border-b border-ls-border">
            <h2 className="text-[14px] font-semibold text-ls-primary flex items-center gap-sm">
              <Eye size={14} /> Top Pages
            </h2>
          </div>
          <div className="divide-y divide-ls-border">
            {!displayStats?.topPages?.length ? (
              <p className="px-lg py-lg text-[13px] text-ls-secondary">No data yet</p>
            ) : displayStats.topPages.map((p, i) => (
              <div key={p.page} className="px-lg py-sm flex items-center gap-sm">
                <span className="text-[11px] text-ls-secondary w-[20px] shrink-0">{i + 1}.</span>
                <span className="text-[13px] text-ls-primary flex-1 truncate">{p.page}</span>
                <span className="text-[12px] text-ls-secondary font-medium shrink-0">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Businesses */}
        <div className="bg-white rounded-card border border-ls-border">
          <div className="px-lg py-md border-b border-ls-border">
            <h2 className="text-[14px] font-semibold text-ls-primary flex items-center gap-sm">
              <TrendingUp size={14} /> Top Businesses
            </h2>
          </div>
          <div className="divide-y divide-ls-border">
            {!displayStats?.topBusinesses?.length ? (
              <p className="px-lg py-lg text-[13px] text-ls-secondary">No data yet</p>
            ) : displayStats.topBusinesses.map((b, i) => (
              <div key={b.businessId} className="px-lg py-sm flex items-center gap-sm">
                <span className="text-[11px] text-ls-secondary w-[20px] shrink-0">{i + 1}.</span>
                <span className="text-[13px] text-ls-primary flex-1 truncate">{b.businessId}</span>
                <span className="text-[12px] text-ls-secondary font-medium shrink-0">{b.views} views</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {displayStats?.categoryBreakdown && Object.keys(displayStats.categoryBreakdown).length > 0 && (
        <div className="mt-2xl bg-white rounded-card border border-ls-border p-lg">
          <h2 className="text-[14px] font-semibold text-ls-primary mb-lg">Category Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-md">
            {Object.entries(displayStats.categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => (
                <div key={cat} className="text-center p-md bg-ls-surface rounded-card">
                  <p className="text-[18px] font-bold text-ls-primary">{count}</p>
                  <p className="text-[12px] text-ls-secondary capitalize mt-xs">{cat.replace(/_/g, " ")}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App Opens Panel ──────────────────────────────────────────────────────

function AppOpensPanel() {
  const [counts, setCounts] = useState<{ date: string; count: number }[] | null>(null);
  const [hourly, setHourly] = useState<number[] | null>(null);
  const [excludedCount, setExcludedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const since = new Date();
    since.setDate(since.getDate() - 29); // last 30 days inclusive
    since.setHours(0, 0, 0, 0);

    setLoading(true);
    setErr(null);
    (async () => {
      try {
        // Fetch admin UIDs to exclude their activity from the analytics.
        const adminSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "admin"))
        );
        const adminUids = new Set<string>(adminSnap.docs.map((d) => d.id));

        const q = query(
          collection(db, "eventLog"),
          where("event", "==", "app_open"),
          where("timestamp", ">=", since),
          orderBy("timestamp", "asc")
        );
        const snap = await getDocs(q);

        // Build a 30-day buckets array, all zero, indexed by YYYY-MM-DD
        const buckets: Record<string, number> = {};
        for (let i = 0; i < 30; i++) {
          const d = new Date(since);
          d.setDate(d.getDate() + i);
          buckets[dayKey(d)] = 0;
        }

        // 24-hour buckets (local time)
        const hourBuckets: number[] = Array(24).fill(0);
        let excluded = 0;

        snap.forEach((doc) => {
          const data = doc.data();
          const uid = data.userId as string | undefined;
          if (uid && adminUids.has(uid)) {
            excluded += 1;
            return;
          }
          const ts = (data.timestamp as { toDate?: () => Date })?.toDate?.();
          if (!ts) return;
          const k = dayKey(ts);
          if (k in buckets) buckets[k] += 1;
          hourBuckets[ts.getHours()] += 1;
        });

        const series = Object.entries(buckets)
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([date, count]) => ({ date, count }));
        setCounts(series);
        setHourly(hourBuckets);
        setExcludedCount(excluded);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = counts?.[counts.length - 1]?.count ?? 0;
  const yesterday = counts?.[counts.length - 2]?.count ?? 0;
  const last7 = counts ? sumLast(counts, 7) : 0;
  const last30 = counts ? counts.reduce((s, x) => s + x.count, 0) : 0;
  const max = counts ? Math.max(...counts.slice(-14).map((x) => x.count), 1) : 1;

  return (
    <div className="bg-white rounded-card border border-ls-border p-lg mb-2xl">
      <div className="flex items-center gap-sm mb-lg">
        <Power size={16} className="text-ls-secondary" />
        <h2 className="text-[14px] font-semibold text-ls-primary">App Opens</h2>
        <span className="text-[12px] text-ls-secondary">(every cold-launch / foreground)</span>
        {excludedCount > 0 && (
          <span className="ml-auto text-[11px] text-ls-secondary">
            excluding {excludedCount.toLocaleString()} admin opens
          </span>
        )}
      </div>

      {err && <div className="text-[13px] text-red-600 mb-md">{err}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-md mb-lg">
        <Stat label="Today" value={today} loading={loading} />
        <Stat label="Yesterday" value={yesterday} loading={loading} />
        <Stat label="Last 7 days" value={last7} loading={loading} />
        <Stat label="Last 30 days" value={last30} loading={loading} />
      </div>

      <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide mb-sm">Last 14 days</p>
      {loading ? (
        <div className="h-[100px] flex items-center justify-center text-ls-secondary">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : (
        <div className="flex items-end gap-[4px] h-[100px]">
          {counts?.slice(-14).map((d) => {
            const h = Math.max((d.count / max) * 100, 4);
            const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-xs">
                <span className="text-[10px] text-ls-secondary">{d.count || ""}</span>
                <div className="w-full bg-violet-200 rounded-t" style={{ height: `${h}%` }} />
                <span className="text-[9px] text-ls-secondary">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide mt-lg mb-sm">
        By hour of day <span className="text-[10px] font-normal normal-case">(last 30 days, your local time)</span>
      </p>
      {loading ? (
        <div className="h-[120px] flex items-center justify-center text-ls-secondary">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : (
        <div className="flex items-end gap-[2px]">
          {hourly?.map((c, hr) => {
            const hMax = Math.max(...(hourly || [1]), 1);
            const barPx = Math.max((c / hMax) * 100, 2);
            const showLabel = hr % 3 === 0;
            const isPeak = hr === peakHour(hourly);
            return (
              <div
                key={hr}
                className="flex-1 flex flex-col items-center"
                title={`${formatHour(hr)} — ${c}`}
              >
                <span className="text-[9px] text-ls-secondary leading-none h-[12px] mb-[2px]">
                  {c > 0 && isPeak ? c : ""}
                </span>
                <div
                  className={`w-full rounded-t ${isPeak ? "bg-ls-primary" : "bg-violet-300"}`}
                  style={{ height: `${barPx}px` }}
                />
                <span className="text-[9px] text-ls-secondary leading-none h-[12px] mt-[4px]">
                  {showLabel ? formatHour(hr).replace(":00 ", "") : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatHour(hr: number): string {
  const am = hr < 12;
  const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${h12}:00 ${am ? "AM" : "PM"}`;
}

function peakHour(arr: number[] | null): number {
  if (!arr) return -1;
  let best = -1, bestVal = -1;
  arr.forEach((v, i) => {
    if (v > bestVal) { bestVal = v; best = i; }
  });
  return best;
}

function Stat({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="bg-ls-surface rounded-card p-md">
      <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide">{label}</p>
      <p className="text-[22px] font-bold text-ls-primary mt-[2px]">
        {loading ? "—" : value.toLocaleString()}
      </p>
    </div>
  );
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sumLast(series: { count: number }[], n: number): number {
  return series.slice(-n).reduce((s, x) => s + x.count, 0);
}

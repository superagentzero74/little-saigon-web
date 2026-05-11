"use client";

import { useState, useEffect } from "react";
import { Coins, Users, ArrowUpRight, ArrowDownRight, TrendingUp, Award, MapPin, Star, Camera, Calendar, Gift, Ticket, Loader2 } from "lucide-react";
import { getDongStats } from "@/lib/services";
import { POINTS } from "@/lib/types";

const DONG_SPEC = {
  review: { label: "Write a review", dong: 150, icon: "✍", current: POINTS.REVIEW },
  check_in: { label: "Check in", dong: 50, icon: "📍", current: POINTS.CHECK_IN },
  photo_upload: { label: "Upload a photo", dong: 75, icon: "📷", current: POINTS.PHOTO_UPLOAD },
  dish_check: { label: "Check a dish", dong: 5, icon: "🍜", current: POINTS.DISH_CHECK },
  event_attend: { label: "Attend an event", dong: 500, icon: "★", current: 0 },
  referral: { label: "Refer a user", dong: 200, icon: "🤝", current: 0 },
  profile_complete: { label: "Complete profile", dong: 250, icon: "👤", current: 0 },
  daily_streak: { label: "Daily open", dong: 10, icon: "🔥", current: 0 },
};

const ACTION_LABELS: Record<string, string> = {
  review: "Reviews",
  check_in: "Check-ins",
  photo_upload: "Photos",
  dish_check: "Dish checks",
  referral: "Referrals",
  challenge_bonus: "Challenges",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  review: <Star size={14} />,
  check_in: <MapPin size={14} />,
  photo_upload: <Camera size={14} />,
  dish_check: <Gift size={14} />,
  referral: <Users size={14} />,
  challenge_bonus: <Award size={14} />,
};

export default function RewardsAdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDongStats().then((s) => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-2xl flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-ls-secondary" />
      </div>
    );
  }

  if (!stats) return <div className="p-2xl text-ls-secondary">Failed to load stats.</div>;

  const exchangeRate = 100; // 100 pts = $1
  const circulationUSD = (stats.totalInCirculation / exchangeRate).toFixed(2);
  const issuedUSD = (stats.totalIssued / exchangeRate).toFixed(2);

  return (
    <div className="p-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Points Economy</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">Rewards system overview · 100 pts = $1.00</p>
        </div>
        <a href="/admin/dong-economy" className="text-[12px] font-semibold text-ls-secondary hover:text-ls-primary transition-colors">
          View Spec →
        </a>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-2xl">
        <StatCard icon={<Coins size={18} />} label="Total Issued" value={`${stats.totalIssued.toLocaleString()} pts`} sub={`≈ $${issuedUSD}`} color="text-amber-700" bg="bg-amber-50" />
        <StatCard icon={<TrendingUp size={18} />} label="In Circulation" value={`${stats.totalInCirculation.toLocaleString()} pts`} sub={`≈ $${circulationUSD}`} color="text-green-700" bg="bg-green-50" />
        <StatCard
          icon={<Users size={18} />}
          label="Active Earners"
          value={`${stats.activeUsers}`}
          sub={`${stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% of ${stats.totalUsers} registered users`}
          color="text-blue-700"
          bg="bg-blue-50"
        />
        <StatCard icon={<MapPin size={18} />} label="Total Check-ins" value={`${stats.totalCheckIns.toLocaleString()}`} sub={`${stats.totalRedeemed} redemptions`} color="text-purple-700" bg="bg-purple-50" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-2xl">
        <StatCard icon={<Ticket size={18} />} label="Active Promotions" value={`${stats.activePromotions}`} sub={`${stats.totalPromotions} total`} color="text-ls-primary" bg="bg-ls-surface" />
        <StatCard icon={<Gift size={18} />} label="Offers Issued" value={`${stats.offersIssued}`} sub={`${stats.offersRedeemed} redeemed`} color="text-ls-primary" bg="bg-ls-surface" />
        <StatCard icon={<ArrowUpRight size={18} />} label="Avg pts / User" value={`${stats.activeUsers > 0 ? Math.round(stats.totalInCirculation / stats.activeUsers).toLocaleString() : 0} pts`} sub="active users" color="text-ls-primary" bg="bg-ls-surface" />
        <StatCard icon={<ArrowDownRight size={18} />} label="Redemption Rate" value={`${stats.offersIssued > 0 ? Math.round((stats.offersRedeemed / stats.offersIssued) * 100) : 0}%`} sub="offers redeemed" color="text-ls-primary" bg="bg-ls-surface" />
      </div>

      {/* Today & This Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl mb-2xl">
        {/* Today */}
        <div className="bg-white rounded-card border border-ls-border p-lg">
          <h2 className="text-[15px] font-semibold text-ls-primary mb-lg flex items-center gap-sm">
            <Calendar size={16} /> Today
          </h2>
          <div className="grid grid-cols-2 gap-md mb-lg">
            <div className="bg-amber-50 rounded-btn p-md">
              <p className="text-[11px] font-semibold text-ls-secondary uppercase">Points Minted</p>
              <p className="text-[20px] font-bold text-amber-700">{stats.todayDong.toLocaleString()} pts</p>
            </div>
            <div className="bg-blue-50 rounded-btn p-md">
              <p className="text-[11px] font-semibold text-ls-secondary uppercase">Active Users</p>
              <p className="text-[20px] font-bold text-blue-700">{stats.todayActiveUsers}</p>
            </div>
            <div className="bg-green-50 rounded-btn p-md">
              <p className="text-[11px] font-semibold text-ls-secondary uppercase">Actions</p>
              <p className="text-[20px] font-bold text-green-700">{stats.todayActions}</p>
            </div>
            <div className="bg-purple-50 rounded-btn p-md">
              <p className="text-[11px] font-semibold text-ls-secondary uppercase">Check-ins</p>
              <p className="text-[20px] font-bold text-purple-700">{stats.todayCheckIns}</p>
            </div>
          </div>
          {Object.keys(stats.todayByAction).length > 0 ? (
            <div className="space-y-[4px]">
              {Object.entries(stats.todayByAction).sort(([,a]: any, [,b]: any) => b.total - a.total).map(([action, data]: [string, any]) => (
                <div key={action} className="flex items-center justify-between text-[12px] px-sm py-[4px] rounded hover:bg-ls-surface">
                  <span className="text-ls-primary font-medium flex items-center gap-sm">{ACTION_ICONS[action] || <Coins size={12} />} {ACTION_LABELS[action] || action}</span>
                  <span className="font-mono text-amber-700 font-semibold">{data.count}× · {data.total} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-ls-secondary text-center py-md">No activity yet today</p>
          )}
        </div>

        {/* This Week */}
        <div className="bg-white rounded-card border border-ls-border p-lg">
          <h2 className="text-[15px] font-semibold text-ls-primary mb-lg flex items-center gap-sm">
            <TrendingUp size={16} /> This Week
          </h2>
          <div className="grid grid-cols-2 gap-md mb-lg">
            <div className="bg-amber-50 rounded-btn p-md">
              <p className="text-[11px] font-semibold text-ls-secondary uppercase">Points Minted</p>
              <p className="text-[20px] font-bold text-amber-700">{stats.weekDong.toLocaleString()} pts</p>
            </div>
            <div className="bg-blue-50 rounded-btn p-md">
              <p className="text-[11px] font-semibold text-ls-secondary uppercase">Active Users</p>
              <p className="text-[20px] font-bold text-blue-700">{stats.weekActiveUsers}</p>
            </div>
            <div className="bg-green-50 rounded-btn p-md">
              <p className="text-[11px] font-semibold text-ls-secondary uppercase">Actions</p>
              <p className="text-[20px] font-bold text-green-700">{stats.weekActions}</p>
            </div>
            <div className="bg-purple-50 rounded-btn p-md">
              <p className="text-[11px] font-semibold text-ls-secondary uppercase">Check-ins</p>
              <p className="text-[20px] font-bold text-purple-700">{stats.weekCheckIns}</p>
            </div>
          </div>
          {Object.keys(stats.weekByAction).length > 0 ? (
            <div className="space-y-[4px]">
              {Object.entries(stats.weekByAction).sort(([,a]: any, [,b]: any) => b.total - a.total).map(([action, data]: [string, any]) => (
                <div key={action} className="flex items-center justify-between text-[12px] px-sm py-[4px] rounded hover:bg-ls-surface">
                  <span className="text-ls-primary font-medium flex items-center gap-sm">{ACTION_ICONS[action] || <Coins size={12} />} {ACTION_LABELS[action] || action}</span>
                  <span className="font-mono text-amber-700 font-semibold">{data.count}× · {data.total.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-ls-secondary text-center py-md">No activity this week</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        {/* Earning Breakdown */}
        <div className="bg-white rounded-card border border-ls-border p-lg">
          <h2 className="text-[15px] font-semibold text-ls-primary mb-lg flex items-center gap-sm">
            <Coins size={16} /> Earning Breakdown
          </h2>
          <div className="space-y-sm">
            {Object.entries(stats.byAction).sort(([,a]: any, [,b]: any) => b.total - a.total).map(([action, data]: [string, any]) => {
              const maxTotal = Math.max(...Object.values(stats.byAction).map((d: any) => d.total));
              const pct = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
              return (
                <div key={action} className="flex items-center gap-md">
                  <div className="w-[20px] text-ls-secondary">{ACTION_ICONS[action] || <Coins size={14} />}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-[3px]">
                      <span className="text-[13px] font-medium text-ls-primary">{ACTION_LABELS[action] || action}</span>
                      <span className="text-[12px] font-semibold text-amber-700">{data.total.toLocaleString()} pts</span>
                    </div>
                    <div className="h-[4px] bg-ls-surface rounded-full overflow-hidden">
                      <div className="h-full bg-amber-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] text-ls-secondary">{data.count.toLocaleString()} actions</span>
                  </div>
                </div>
              );
            })}
            {Object.keys(stats.byAction).length === 0 && (
              <p className="text-[13px] text-ls-secondary">No earning activity yet.</p>
            )}
          </div>
        </div>

        {/* Top Earners */}
        <div className="bg-white rounded-card border border-ls-border p-lg">
          <h2 className="text-[15px] font-semibold text-ls-primary mb-lg flex items-center gap-sm">
            <Award size={16} /> Top Earners
          </h2>
          <div className="space-y-[2px]">
            {stats.topEarners.map((user: any, i: number) => (
              <div key={user.id} className="flex items-center gap-md py-[8px] px-sm rounded hover:bg-ls-surface transition-colors">
                <span className="text-[12px] font-bold text-ls-secondary w-[18px]">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ls-primary truncate">{user.name || "Unnamed"}</p>
                  <p className="text-[11px] text-ls-secondary truncate">{user.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold text-amber-700">{user.points.toLocaleString()} pts</p>
                  <p className="text-[10px] text-ls-secondary">{user.checkIns} check-ins · {user.reviews} reviews</p>
                </div>
              </div>
            ))}
            {stats.topEarners.length === 0 && (
              <p className="text-[13px] text-ls-secondary">No users with points yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Earn Rate Config — Points Spec vs Current */}
      <div className="bg-white rounded-card border border-ls-border p-lg mt-xl">
        <h2 className="text-[15px] font-semibold text-ls-primary mb-lg flex items-center gap-sm">
          <TrendingUp size={16} /> Earn Rate Configuration
        </h2>
        <p className="text-[12px] text-ls-secondary mb-lg">
          Current code values vs Points Economy spec. Update code to match spec values.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ls-border bg-gray-50">
                <th className="text-left px-md py-sm font-semibold text-ls-secondary uppercase tracking-wide text-[10px]">Action</th>
                <th className="text-left px-md py-sm font-semibold text-ls-secondary uppercase tracking-wide text-[10px]">Icon</th>
                <th className="text-right px-md py-sm font-semibold text-ls-secondary uppercase tracking-wide text-[10px]">Current</th>
                <th className="text-right px-md py-sm font-semibold text-ls-secondary uppercase tracking-wide text-[10px]">Points Spec</th>
                <th className="text-right px-md py-sm font-semibold text-ls-secondary uppercase tracking-wide text-[10px]">$ Value</th>
                <th className="text-center px-md py-sm font-semibold text-ls-secondary uppercase tracking-wide text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ls-border">
              {Object.entries(DONG_SPEC).map(([key, spec]) => {
                const match = spec.current === spec.dong;
                const notImpl = spec.current === 0;
                return (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-md py-sm font-medium text-ls-primary">{spec.label}</td>
                    <td className="px-md py-sm text-[16px]">{spec.icon}</td>
                    <td className="px-md py-sm text-right font-mono">
                      {notImpl ? <span className="text-ls-secondary">—</span> : <span className={match ? "text-green-700" : "text-red-600"}>{spec.current} pts</span>}
                    </td>
                    <td className="px-md py-sm text-right font-mono font-semibold text-amber-700">{spec.dong} pts</td>
                    <td className="px-md py-sm text-right text-ls-secondary">${(spec.dong / 100).toFixed(2)}</td>
                    <td className="px-md py-sm text-center">
                      {notImpl ? (
                        <span className="inline-block px-[6px] py-[2px] rounded-badge text-[10px] font-semibold bg-gray-100 text-gray-500">Not Impl</span>
                      ) : match ? (
                        <span className="inline-block px-[6px] py-[2px] rounded-badge text-[10px] font-semibold bg-green-100 text-green-600">Match</span>
                      ) : (
                        <span className="inline-block px-[6px] py-[2px] rounded-badge text-[10px] font-semibold bg-red-50 text-red-600">Mismatch</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-lg p-md bg-amber-50 rounded-btn border-l-[3px] border-amber-600">
          <p className="text-[12px] text-amber-900 leading-relaxed">
            <strong>Daily earn cap:</strong> 500 pts/day per user · <strong>Exchange rate:</strong> 100 pts = $1 · <strong>Point expiry:</strong> 12 months after last activity · <strong>Supply:</strong> Demand-minted (Phase 1)
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-card border border-ls-border p-lg mt-xl">
        <h2 className="text-[15px] font-semibold text-ls-primary mb-lg flex items-center gap-sm">
          <Calendar size={16} /> Recent Earning Activity
        </h2>
        {stats.recentActivity.length > 0 ? (
          <div className="space-y-[2px]">
            {stats.recentActivity.map((log: any, i: number) => {
              const ts = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : null;
              return (
                <div key={i} className="flex items-center gap-md py-[6px] px-sm rounded hover:bg-ls-surface text-[13px]">
                  <div className="w-[20px] text-ls-secondary">{ACTION_ICONS[log.action] || <Coins size={14} />}</div>
                  <span className="text-ls-primary font-medium flex-1">{ACTION_LABELS[log.action] || log.action}</span>
                  <span className="font-mono font-semibold text-amber-700">+{log.points} pts</span>
                  <span className="text-[11px] text-ls-secondary w-[120px] text-right">
                    {ts ? ts.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-ls-secondary">No recent activity.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, bg }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-card p-lg`}>
      <div className={`${color} mb-sm`}>{icon}</div>
      <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide">{label}</p>
      <p className={`text-[22px] font-bold ${color} mt-[2px]`}>{value}</p>
      <p className="text-[11px] text-ls-secondary mt-[2px]">{sub}</p>
    </div>
  );
}

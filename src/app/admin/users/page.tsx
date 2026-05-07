"use client";

import { useEffect, useState } from "react";
import { Search, Shield, ShieldOff, X, MapPin, Star, Calendar, ExternalLink } from "lucide-react";
import { getAllUsers, setUserRole } from "@/lib/services";
import type { AppUser } from "@/lib/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState<AppUser | null>(null);

  useEffect(() => {
    getAllUsers(100).then(setUsers).finally(() => setLoading(false));
  }, []);

  const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(""), 2000); };

  const handleToggleRole = async (u: AppUser) => {
    const next = u.role === "admin" ? "user" : "admin";
    await setUserRole(u.id, next);
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role: next } : x));
    flash(`${u.displayName} is now ${next}`);
  };

  const fmtDate = (ts: any) => {
    if (!ts) return "—";
    const ms = ts.toMillis?.() ?? ts.seconds * 1000;
    return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const filtered = users.filter((u) =>
    !filter ||
    u.displayName?.toLowerCase().includes(filter.toLowerCase()) ||
    u.email?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-2xl">
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Users</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">{users.length} registered users</p>
        </div>
        {msg && <span className="text-[13px] font-semibold text-green-600">{msg}</span>}
      </div>

      <div className="relative mb-xl max-w-sm">
        <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-[38px] pr-md py-[9px] bg-white border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary"
        />
      </div>

      <div className="bg-white rounded-card border border-ls-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ls-border bg-gray-50">
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">User</th>
                <th className="text-center px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Points</th>
                <th className="text-center px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Reviews</th>
                <th className="text-center px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Check-ins</th>
                <th className="text-left px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px] hidden md:table-cell">Joined</th>
                <th className="text-center px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Role</th>
                <th className="px-md py-md" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ls-border">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-lg py-md">
                        <div className="h-4 bg-ls-surface rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(u)}>
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-sm">
                      <div className="w-[32px] h-[32px] rounded-full bg-ls-primary flex items-center justify-center shrink-0 overflow-hidden">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[12px] font-bold text-white">
                            {u.displayName?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-ls-primary">{u.displayName || "—"}</p>
                        <p className="text-[11px] text-ls-secondary">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-md py-md text-center font-semibold text-ls-primary">{u.points}</td>
                  <td className="px-md py-md text-center text-ls-body">{u.reviewCount}</td>
                  <td className="px-md py-md text-center text-ls-body">{u.checkInCount}</td>
                  <td className="px-md py-md hidden md:table-cell text-ls-secondary">{fmtDate(u.createdAt)}</td>
                  <td className="px-md py-md text-center">
                    <span className={`inline-block text-[11px] font-semibold px-sm py-[2px] rounded-full ${
                      u.role === "admin" ? "bg-ls-primary text-white" : "bg-ls-surface text-ls-secondary"
                    }`}>
                      {u.role || "user"}
                    </span>
                  </td>
                  <td className="px-md py-md">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleRole(u); }}
                      className={`flex items-center gap-xs text-[12px] px-sm py-xs rounded border transition-colors ${
                        u.role === "admin"
                          ? "border-red-200 text-red-500 hover:bg-red-50"
                          : "border-ls-border text-ls-secondary hover:border-ls-primary hover:text-ls-primary"
                      }`}
                      title={u.role === "admin" ? "Remove admin" : "Make admin"}
                    >
                      {u.role === "admin" ? <ShieldOff size={13} /> : <Shield size={13} />}
                      {u.role === "admin" ? "Revoke" : "Admin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <p className="text-center py-2xl text-ls-secondary text-[14px]">No users found.</p>
          )}
        </div>
      </div>

      {/* User Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto animate-in slide-in-from-right">
            <div className="sticky top-0 bg-white border-b border-ls-border px-lg py-md flex items-center justify-between z-10">
              <h2 className="text-[16px] font-bold text-ls-primary">User Details</h2>
              <button onClick={() => setSelected(null)} className="p-xs hover:bg-ls-surface rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="p-lg space-y-lg">
              {/* Avatar + Name */}
              <div className="flex items-center gap-md">
                <div className="w-[64px] h-[64px] rounded-full bg-ls-primary flex items-center justify-center shrink-0 overflow-hidden">
                  {selected.photoURL ? (
                    <img src={selected.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[22px] font-bold text-white">
                      {selected.displayName?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[18px] font-bold text-ls-primary">{selected.displayName || "—"}</p>
                  {selected.headline && <p className="text-[13px] text-ls-secondary">{selected.headline}</p>}
                  <p className="text-[12px] text-ls-secondary">{selected.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-sm">
                <div className="bg-ls-surface rounded-card p-md text-center">
                  <p className="text-[20px] font-bold text-ls-primary">{selected.points}</p>
                  <p className="text-[11px] text-ls-secondary">Points</p>
                </div>
                <div className="bg-ls-surface rounded-card p-md text-center">
                  <p className="text-[20px] font-bold text-ls-primary">{selected.reviewCount}</p>
                  <p className="text-[11px] text-ls-secondary">Reviews</p>
                </div>
                <div className="bg-ls-surface rounded-card p-md text-center">
                  <p className="text-[20px] font-bold text-ls-primary">{selected.checkInCount}</p>
                  <p className="text-[11px] text-ls-secondary">Check-ins</p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ls-secondary">Role</span>
                <span className={`text-[12px] font-semibold px-sm py-[2px] rounded-full ${
                  selected.role === "admin" ? "bg-ls-primary text-white" : selected.role === "business_owner" ? "bg-amber-100 text-amber-700" : "bg-ls-surface text-ls-secondary"
                }`}>
                  {selected.role || "user"}
                </span>
              </div>

              {/* Profile Details */}
              <div className="space-y-sm border-t border-ls-border pt-lg">
                <h3 className="text-[13px] font-semibold text-ls-primary uppercase tracking-wide">Profile</h3>

                {(selected.firstName || selected.lastName) && (
                  <DetailRow label="Full Name" value={[selected.firstName, selected.lastName].filter(Boolean).join(" ")} />
                )}
                {selected.nickname && <DetailRow label="Nickname" value={selected.nickname} />}
                {selected.bio && <DetailRow label="Bio" value={selected.bio} />}
                {selected.aboutMe && <DetailRow label="About" value={selected.aboutMe} />}
                {selected.gender && selected.gender !== "prefer_not" && (
                  <DetailRow label="Gender" value={selected.gender} />
                )}
                {(selected.city || selected.state) && (
                  <DetailRow label="Location" value={[selected.city, selected.state].filter(Boolean).join(", ")} icon={<MapPin size={13} />} />
                )}
                {selected.hometown && (
                  <DetailRow label="Hometown" value={selected.hometown} icon={<MapPin size={13} />} />
                )}
              </div>

              {/* Social */}
              {(selected.instagram || selected.tiktok || selected.youtube || selected.website) && (
                <div className="space-y-sm border-t border-ls-border pt-lg">
                  <h3 className="text-[13px] font-semibold text-ls-primary uppercase tracking-wide">Social</h3>
                  {selected.instagram && <DetailRow label="Instagram" value={`@${selected.instagram}`} />}
                  {selected.tiktok && <DetailRow label="TikTok" value={`@${selected.tiktok}`} />}
                  {selected.youtube && <DetailRow label="YouTube" value={selected.youtube} />}
                  {selected.website && (
                    <DetailRow label="Website" value={selected.website} icon={<ExternalLink size={13} />} />
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="space-y-sm border-t border-ls-border pt-lg">
                <h3 className="text-[13px] font-semibold text-ls-primary uppercase tracking-wide">Activity</h3>
                <DetailRow label="Joined" value={fmtDate(selected.createdAt)} icon={<Calendar size={13} />} />
                <DetailRow label="Last Active" value={fmtDate(selected.lastActive)} icon={<Calendar size={13} />} />
                {selected.favorites && selected.favorites.length > 0 && (
                  <DetailRow label="Favorites" value={`${selected.favorites.length} businesses`} icon={<Star size={13} />} />
                )}
              </div>

              {/* Owned Businesses */}
              {selected.ownedBusinessIds && selected.ownedBusinessIds.length > 0 && (
                <div className="space-y-sm border-t border-ls-border pt-lg">
                  <h3 className="text-[13px] font-semibold text-ls-primary uppercase tracking-wide">Owned Businesses</h3>
                  <p className="text-[13px] text-ls-body">{selected.ownedBusinessIds.length} business(es)</p>
                </div>
              )}

              {/* User ID */}
              <div className="border-t border-ls-border pt-lg">
                <p className="text-[11px] text-ls-secondary font-mono break-all">ID: {selected.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-md">
      <span className="text-[12px] text-ls-secondary flex items-center gap-xs shrink-0">
        {icon}{label}
      </span>
      <span className="text-[13px] text-ls-body text-right">{value}</span>
    </div>
  );
}

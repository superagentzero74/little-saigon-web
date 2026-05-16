"use client";

import { useEffect, useState } from "react";
import { Search, Shield, ShieldOff, X, MapPin, Star, Calendar, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { getAllUsers, setUserRole } from "@/lib/services";
import type { AppUser } from "@/lib/types";

type SortKey = "user" | "points" | "reviews" | "checkins" | "joined" | "role";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "joined", dir: "desc" });

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

  const toMs = (ts: any) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0);
  const sortValue = (u: AppUser, key: SortKey): string | number => {
    switch (key) {
      case "user": return ([u.firstName, u.lastName].filter(Boolean).join(" ") || u.displayName || u.email || "").toLowerCase();
      case "points": return u.points || 0;
      case "reviews": return u.reviewCount || 0;
      case "checkins": return u.checkInCount || 0;
      case "joined": return toMs((u as any).createdAt);
      case "role": return u.role || "user";
    }
  };
  const fullName = (u: AppUser) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.displayName || "—";

  const filtered = users
    .filter((u) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        u.displayName?.toLowerCase().includes(q) ||
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const cmp = typeof av === "string" && typeof bv === "string"
        ? av.localeCompare(bv)
        : (av as number) - (bv as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

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
                <SortableTh label="User" align="left" sortKey="user" sort={sort} onClick={toggleSort} extraClass="px-lg" />
                <SortableTh label="Points" align="center" sortKey="points" sort={sort} onClick={toggleSort} />
                <SortableTh label="Reviews" align="center" sortKey="reviews" sort={sort} onClick={toggleSort} />
                <SortableTh label="Check-ins" align="center" sortKey="checkins" sort={sort} onClick={toggleSort} />
                <SortableTh label="Joined" align="left" sortKey="joined" sort={sort} onClick={toggleSort} extraClass="hidden md:table-cell" />
                <SortableTh label="Role" align="center" sortKey="role" sort={sort} onClick={toggleSort} />
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
                            {(u.firstName || u.displayName)?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-ls-primary">{fullName(u)}</p>
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
                      {(selected.firstName || selected.displayName)?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[18px] font-bold text-ls-primary">
                    {[selected.firstName, selected.lastName].filter(Boolean).join(" ") || selected.displayName || "—"}
                  </p>
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

                <div className="flex items-start justify-between gap-md">
                  <span className="text-[12px] text-ls-secondary shrink-0 pt-[2px]">Name</span>
                  <div className="flex items-start gap-md text-right">
                    <div>
                      <p className="text-[13px] text-ls-body">{selected.firstName || "—"}</p>
                      <p className="text-[10px] text-ls-secondary uppercase tracking-wide mt-[1px]">first</p>
                    </div>
                    <div>
                      <p className="text-[13px] text-ls-body">{selected.lastName || "—"}</p>
                      <p className="text-[10px] text-ls-secondary uppercase tracking-wide mt-[1px]">last</p>
                    </div>
                  </div>
                </div>
                {selected.displayName && (selected.displayName !== [selected.firstName, selected.lastName].filter(Boolean).join(" ")) && (
                  <DetailRow label="Display Name" value={selected.displayName} />
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

function SortableTh({ label, align, sortKey, sort, onClick, extraClass = "" }: {
  label: string;
  align: "left" | "center";
  sortKey: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onClick: (k: SortKey) => void;
  extraClass?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  const alignClass = align === "left" ? "text-left" : "text-center";
  const justify = align === "left" ? "justify-start" : "justify-center";
  return (
    <th className={`${alignClass} px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px] ${extraClass}`}>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 w-full ${justify} hover:text-ls-primary ${active ? "text-ls-primary" : ""}`}
      >
        {label}
        <Icon size={11} className={active ? "opacity-80" : "opacity-40"} />
      </button>
    </th>
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

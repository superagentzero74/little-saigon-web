"use client";

import { useEffect, useState } from "react";
import { Search, Shield, ShieldOff } from "lucide-react";
import { getAllUsers, setUserRole } from "@/lib/services";
import type { AppUser } from "@/lib/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");

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
                <th className="text-center px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Đồng</th>
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
                <tr key={u.id} className="hover:bg-gray-50">
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
                      onClick={() => handleToggleRole(u)}
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
    </div>
  );
}

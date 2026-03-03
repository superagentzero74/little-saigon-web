"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Pencil, Check, X, ExternalLink } from "lucide-react";
import { getBusinesses, updateBusiness, searchBusinesses } from "@/lib/services";
import type { Business, BusinessCategory } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

const CATEGORY_OPTIONS = Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][];

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<BusinessCategory | "">("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Business>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const results = await searchBusinesses(searchQuery.trim());
        setBusinesses(categoryFilter ? results.filter((b) => b.category === categoryFilter) : results);
      } else {
        const { businesses: results } = await getBusinesses({ category: categoryFilter || undefined, limitCount: 100 });
        setBusinesses(results);
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    const t = setTimeout(load, searchQuery ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, searchQuery]);

  const startEdit = (biz: Business) => {
    setEditingId(biz.id);
    setEditForm({ name: biz.name, category: biz.category, phone: biz.phone || "", website: biz.website || "", active: biz.active ?? true });
  };

  const handleSave = async (bizId: string) => {
    setSaving(true);
    try {
      await updateBusiness(bizId, editForm);
      setBusinesses((prev) => prev.map((b) => b.id === bizId ? { ...b, ...editForm } : b));
      setEditingId(null);
      setMsg("Saved!");
      setTimeout(() => setMsg(""), 2000);
    } catch (err: any) {
      setMsg(err.message || "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (biz: Business) => {
    const next = !biz.active;
    await updateBusiness(biz.id, { active: next });
    setBusinesses((prev) => prev.map((b) => b.id === biz.id ? { ...b, active: next } : b));
  };

  return (
    <div className="p-2xl">
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Businesses</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">{businesses.length} listings</p>
        </div>
        {msg && <span className="text-[13px] font-semibold text-green-600">{msg}</span>}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-md mb-xl">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
          <input
            type="text"
            placeholder="Search by name, address…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-[38px] pr-md py-[9px] bg-white border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as BusinessCategory | "")}
          className="bg-white border border-ls-border rounded-btn px-md py-[9px] text-[14px] focus:outline-none focus:border-ls-primary"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card border border-ls-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ls-border bg-gray-50">
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Name</th>
                <th className="text-left px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Category</th>
                <th className="text-left px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px] hidden md:table-cell">Phone</th>
                <th className="text-left px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px] hidden lg:table-cell">Website</th>
                <th className="text-center px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Rating</th>
                <th className="text-center px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Active</th>
                <th className="px-md py-md" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ls-border">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-lg py-md">
                        <div className="h-4 bg-ls-surface rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : businesses.map((biz) => {
                const isEditing = editingId === biz.id;
                return (
                  <tr key={biz.id} className={`hover:bg-gray-50 transition-colors ${isEditing ? "bg-blue-50" : ""}`}>
                    <td className="px-lg py-md">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name || ""}
                          onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          className="w-full border border-ls-border rounded px-sm py-xs text-[13px] focus:outline-none focus:border-ls-primary"
                        />
                      ) : (
                        <div>
                          <p className="font-medium text-ls-primary">{biz.name}</p>
                          <p className="text-[11px] text-ls-secondary truncate max-w-[200px]">{biz.address}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-md py-md">
                      {isEditing ? (
                        <select
                          value={editForm.category || biz.category}
                          onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value as BusinessCategory }))}
                          className="border border-ls-border rounded px-sm py-xs text-[13px] focus:outline-none"
                        >
                          {CATEGORY_OPTIONS.map(([k, { label }]) => (
                            <option key={k} value={k}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="capitalize text-ls-body">{biz.category}</span>
                      )}
                    </td>
                    <td className="px-md py-md hidden md:table-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.phone || ""}
                          onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="Phone"
                          className="w-full border border-ls-border rounded px-sm py-xs text-[13px] focus:outline-none"
                        />
                      ) : (
                        <span className="text-ls-body">{biz.phone || "—"}</span>
                      )}
                    </td>
                    <td className="px-md py-md hidden lg:table-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.website || ""}
                          onChange={(e) => setEditForm((p) => ({ ...p, website: e.target.value }))}
                          placeholder="https://..."
                          className="w-full border border-ls-border rounded px-sm py-xs text-[13px] focus:outline-none"
                        />
                      ) : biz.website ? (
                        <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-ls-primary hover:underline flex items-center gap-[3px] truncate max-w-[140px]">
                          <ExternalLink size={11} /> <span className="truncate">{biz.website.replace(/^https?:\/\//, "")}</span>
                        </a>
                      ) : (
                        <span className="text-ls-secondary">—</span>
                      )}
                    </td>
                    <td className="px-md py-md text-center">
                      <span className="text-amber-500 font-semibold">★ {biz.rating.toFixed(1)}</span>
                    </td>
                    <td className="px-md py-md text-center">
                      <button
                        onClick={() => toggleActive(biz)}
                        className={`w-[42px] h-[22px] rounded-full transition-colors relative ${biz.active !== false ? "bg-green-500" : "bg-gray-300"}`}
                      >
                        <span className={`absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full shadow transition-transform ${biz.active !== false ? "translate-x-[22px]" : "translate-x-[3px]"}`} />
                      </button>
                    </td>
                    <td className="px-md py-md">
                      <div className="flex items-center gap-xs justify-end">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSave(biz.id)}
                              disabled={saving}
                              className="p-xs text-green-600 hover:text-green-700"
                              title="Save"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-xs text-ls-secondary hover:text-red-500"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(biz)}
                            className="p-xs text-ls-secondary hover:text-ls-primary"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && businesses.length === 0 && (
            <p className="text-center py-2xl text-ls-secondary text-[14px]">No businesses found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Search, Plus, X, Loader2, ChevronLeft, Check, Store } from "lucide-react";
import {
  getBusinessesByKeyword, addKeywordToBusiness, removeKeywordFromBusiness, searchBusinessesByName,
} from "@/lib/services";
import type { Business } from "@/lib/types";

const ALL_SEARCH_TERMS = [
  "Pho", "Vegan Pho", "Vegetarian Pho", "Chicken Pho", "Beef Noodle Soup",
  "Vietnamese Sandwich", "Garlic Noodles", "Banh Cuon", "Banh Mi",
  "Vietnamese Iced Coffee", "Bun Bo Hue", "Spring Rolls",
  "Popcorn Chicken", "Pork Belly", "Spicy Noodles", "Noodle Soup",
  "Rice Noodle", "Vermicelli", "Egg Rolls",
  "Bun Rieu", "Curry",
  "Asian Soup", "Authentic Chinese Food", "Chow Mein", "Pho Delivery",
  "Pho Restaurants", "Bao Bun", "Milk Tea", "Wonton Noodle Soup",
  "Cold Noodles", "Smoothie",
  "Mi Wonton", "Cajun Crawfish", "Lobster", "Crab",
  "Broken Rice", "Roasted Duck", "Banh Khot", "Banh Xeo",
];

const inputClass =
  "bg-white border border-ls-border rounded px-[10px] py-[8px] text-[14px] outline-none focus:border-ls-primary w-full";

export default function AdminSearchTermsPage() {
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [taggedBusinesses, setTaggedBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  // Add business
  const [bizSearch, setBizSearch] = useState("");
  const [bizResults, setBizResults] = useState<Business[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // Term filter
  const [termFilter, setTermFilter] = useState("");

  const flash = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 2500);
  };

  const filteredTerms = ALL_SEARCH_TERMS.filter(
    (t) => !termFilter || t.toLowerCase().includes(termFilter.toLowerCase())
  );

  // Count cache
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    // Load counts for all terms
    setCountsLoading(true);
    Promise.all(
      ALL_SEARCH_TERMS.map(async (term) => {
        const bizs = await getBusinessesByKeyword(term.toLowerCase());
        return [term, bizs.length] as [string, number];
      })
    ).then((results) => {
      const map: Record<string, number> = {};
      results.forEach(([term, count]) => { map[term] = count; });
      setCounts(map);
      setCountsLoading(false);
    });
  }, []);

  const selectTerm = async (term: string) => {
    setSelectedTerm(term);
    setLoading(true);
    setBizSearch("");
    setBizResults([]);
    const bizs = await getBusinessesByKeyword(term.toLowerCase());
    setTaggedBusinesses(bizs);
    setLoading(false);
  };

  const handleBizSearch = async () => {
    if (!bizSearch.trim()) return;
    setSearching(true);
    const results = await searchBusinessesByName(bizSearch.trim());
    // Filter out already tagged
    const taggedIds = new Set(taggedBusinesses.map((b) => b.id));
    setBizResults(results.filter((b) => !taggedIds.has(b.id)));
    setSearching(false);
  };

  const addBiz = async (biz: Business) => {
    if (!selectedTerm) return;
    setAdding(biz.id);
    try {
      await addKeywordToBusiness(biz.id, selectedTerm.toLowerCase());
      setTaggedBusinesses((prev) => [...prev, biz]);
      setBizResults((prev) => prev.filter((b) => b.id !== biz.id));
      setCounts((prev) => ({ ...prev, [selectedTerm]: (prev[selectedTerm] || 0) + 1 }));
      flash(`Added "${biz.name}" to ${selectedTerm}`);
    } catch (err: any) {
      flash(err.message || "Failed to add", true);
    }
    setAdding(null);
  };

  const removeBiz = async (biz: Business) => {
    if (!selectedTerm) return;
    setRemoving(biz.id);
    try {
      await removeKeywordFromBusiness(biz.id, selectedTerm.toLowerCase());
      setTaggedBusinesses((prev) => prev.filter((b) => b.id !== biz.id));
      setCounts((prev) => ({ ...prev, [selectedTerm]: Math.max(0, (prev[selectedTerm] || 0) - 1) }));
      flash(`Removed "${biz.name}" from ${selectedTerm}`);
    } catch (err: any) {
      flash(err.message || "Failed to remove", true);
    }
    setRemoving(null);
  };

  // Term list view
  if (!selectedTerm) {
    return (
      <div className="p-2xl">
        <div className="flex items-center justify-between mb-2xl">
          <div>
            <h1 className="text-[24px] font-bold text-ls-primary">Search Terms</h1>
            <p className="text-[14px] text-ls-secondary mt-xs">{ALL_SEARCH_TERMS.length} terms · Tag businesses to each term</p>
          </div>
        </div>

        {/* Filter */}
        <div className="relative mb-xl max-w-sm">
          <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
          <input
            type="text"
            placeholder="Filter terms…"
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            className="w-full pl-[38px] pr-md py-[9px] bg-white border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary"
          />
        </div>

        {/* Terms grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[8px]">
          {filteredTerms.map((term) => (
            <button
              key={term}
              onClick={() => selectTerm(term)}
              className="bg-white rounded-card border border-ls-border p-md text-left hover:shadow-sm hover:border-ls-primary transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-ls-primary">{term}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ls-secondary opacity-0 group-hover:opacity-100 transition-opacity"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
              <div className="text-[12px] text-ls-secondary mt-[4px]">
                {countsLoading ? "…" : `${counts[term] || 0} businesses`}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Term detail view — tagged businesses + add
  return (
    <div className="p-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2xl">
        <div className="flex items-center gap-md">
          <button
            onClick={() => setSelectedTerm(null)}
            className="w-[36px] h-[36px] rounded-btn bg-white border border-ls-border flex items-center justify-center hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 className="text-[24px] font-bold text-ls-primary">{selectedTerm}</h1>
            <p className="text-[14px] text-ls-secondary mt-xs">{taggedBusinesses.length} businesses tagged</p>
          </div>
        </div>
        {msg && (
          <span className={`text-[13px] font-semibold ${msg.err ? "text-red-600" : "text-green-600"}`}>
            {msg.err ? "⚠ " : "✓ "}{msg.text}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl">
        {/* Tagged businesses */}
        <div>
          <div className="bg-white rounded-card border border-ls-border overflow-hidden">
            <div className="px-lg py-md border-b border-ls-border">
              <h2 className="text-[14px] font-semibold text-ls-primary flex items-center gap-sm">
                <Store size={14} /> Tagged Businesses
              </h2>
            </div>

            {loading ? (
              <div className="p-lg">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-[44px] bg-ls-surface rounded animate-pulse mb-[6px]" />
                ))}
              </div>
            ) : taggedBusinesses.length === 0 ? (
              <div className="p-2xl text-center">
                <Store size={28} className="text-ls-secondary opacity-30 mx-auto mb-sm" />
                <p className="text-[13px] text-ls-secondary">No businesses tagged yet</p>
                <p className="text-[11px] text-ls-secondary mt-xs">Search and add businesses on the right →</p>
              </div>
            ) : (
              <div className="divide-y divide-ls-border">
                {taggedBusinesses.map((biz) => (
                  <div key={biz.id} className="flex items-center justify-between px-lg py-md hover:bg-gray-50 group">
                    <div className="flex items-center gap-sm flex-1 min-w-0">
                      <div className="w-[36px] h-[36px] rounded-[8px] bg-ls-surface flex items-center justify-center flex-shrink-0">
                        {biz.photos?.[0] ? (
                          <img src={biz.photos[0]} alt="" className="w-full h-full object-cover rounded-[8px]" />
                        ) : (
                          <Store size={14} className="text-ls-secondary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ls-primary truncate">{biz.name}</div>
                        <div className="text-[11px] text-ls-secondary truncate">{biz.address}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeBiz(biz)}
                      disabled={removing === biz.id}
                      className="p-[4px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {removing === biz.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add businesses */}
        <div>
          <div className="bg-white rounded-card border border-ls-border p-lg">
            <h2 className="text-[14px] font-semibold text-ls-primary mb-md flex items-center gap-sm">
              <Plus size={14} /> Add Businesses
            </h2>

            <div className="flex gap-sm mb-md">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-ls-secondary" />
                <input
                  className={`${inputClass} pl-[32px]`}
                  placeholder="Search by business name…"
                  value={bizSearch}
                  onChange={(e) => setBizSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBizSearch()}
                />
              </div>
              <button
                onClick={handleBizSearch}
                disabled={searching}
                className="ls-btn text-[12px] py-[7px] px-md flex items-center gap-xs"
              >
                {searching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                Search
              </button>
            </div>

            {bizResults.length > 0 && (
              <div className="border border-ls-border rounded-btn overflow-hidden">
                {bizResults.map((biz, i) => (
                  <div
                    key={biz.id}
                    className={`flex items-center justify-between px-md py-sm hover:bg-gray-50 ${
                      i < bizResults.length - 1 ? "border-b border-ls-border" : ""
                    }`}
                  >
                    <div className="flex items-center gap-sm flex-1 min-w-0">
                      <div className="w-[32px] h-[32px] rounded-[6px] bg-ls-surface flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {biz.photos?.[0] ? (
                          <img src={biz.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Store size={12} className="text-ls-secondary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ls-primary truncate">{biz.name}</div>
                        <div className="text-[10px] text-ls-secondary truncate">{biz.address}</div>
                        {biz.keywords && biz.keywords.length > 0 && (
                          <div className="flex gap-[3px] mt-[2px] flex-wrap">
                            {biz.keywords.slice(0, 5).map((k) => (
                              <span key={k} className="text-[9px] bg-ls-surface text-ls-secondary px-[4px] py-[1px] rounded">{k}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => addBiz(biz)}
                      disabled={adding === biz.id}
                      className="ls-btn text-[11px] py-[4px] px-sm flex items-center gap-xs flex-shrink-0"
                    >
                      {adding === biz.id ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {bizSearch && bizResults.length === 0 && !searching && (
              <div className="text-center py-lg">
                <p className="text-[13px] text-ls-secondary">No businesses found for &quot;{bizSearch}&quot;</p>
              </div>
            )}

            {!bizSearch && (
              <div className="text-center py-lg">
                <Search size={24} className="text-ls-secondary opacity-30 mx-auto mb-sm" />
                <p className="text-[13px] text-ls-secondary">Search for a business to tag it with &quot;{selectedTerm}&quot;</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Pencil, Check, X, ExternalLink, Plus, Trash2, Settings2, Tag, Loader2, Clock } from "lucide-react";
import { getBusinesses, updateBusiness, searchBusinesses, deleteBusiness, createBusiness, getDishes } from "@/lib/services";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query as fbQuery, orderBy, limit as fbLimit, getDocs } from "firebase/firestore";
import type { Business, BusinessCategory, LegacyBusinessCategory } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

const CATEGORY_OPTIONS = Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][];

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<BusinessCategory | "">("");
  const [tagFilter, setTagFilter] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Business>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Recently added
  const [recentBiz, setRecentBiz] = useState<Business[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);

  // Food tag feature
  const [yelpTag, setYelpTag] = useState("");
  const [yelpLoading, setYelpLoading] = useState(false);
  const [yelpResult, setYelpResult] = useState<any>(null);
  const [showYelp, setShowYelp] = useState(false);
  const [addingPlace, setAddingPlace] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [allKnownTags, setAllKnownTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let results: Business[];
      if (searchQuery.trim()) {
        results = await searchBusinesses(searchQuery.trim());
        if (categoryFilter) results = results.filter((b) => b.category === categoryFilter);
      } else {
        const resp = await getBusinesses({ category: categoryFilter || undefined, limitCount: 500 });
        results = resp.businesses;
      }
      // Collect all unique tags for the filter dropdown
      const tagSet = new Set<string>();
      results.forEach((b) => (b.tags || []).forEach((t) => tagSet.add(t)));
      setAllTags(Array.from(tagSet).sort());
      setTotalCount(results.length);
      // Apply tag filter
      if (tagFilter) {
        results = results.filter((b) => (b.tags || []).includes(tagFilter));
      }
      setBusinesses(results);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, tagFilter]);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const q = fbQuery(collection(db, "businesses"), orderBy("createdAt", "desc"), fbLimit(30));
      const snap = await getDocs(q);
      setRecentBiz(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showRecent && recentBiz.length === 0) loadRecent();
  }, [showRecent, recentBiz.length, loadRecent]);

  useEffect(() => {
    const t = setTimeout(load, searchQuery ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, searchQuery]);

  useEffect(() => {
    if (showYelp && allKnownTags.length === 0) {
      (async () => {
        const [{ businesses: all }, dishes] = await Promise.all([
          getBusinesses({ limitCount: 1000 }),
          getDishes(),
        ]);
        const tagSet = new Set<string>();
        all.forEach((b) => (b.tags || []).forEach((t) => tagSet.add(t)));
        dishes.forEach((d) => { tagSet.add(d.name); tagSet.add(d.englishName); });
        // Common food searches
        ["crawfish", "boba", "poke", "sushi", "dim sum", "hot pot", "seafood", "vegan", "vegetarian"].forEach((t) => tagSet.add(t));
        setAllKnownTags(Array.from(tagSet).sort((a, b) => a.localeCompare(b, "vi")));
      })();
    }
  }, [showYelp, allKnownTags.length]);

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

  const handleDelete = async (biz: Business) => {
    if (!confirm(`Delete "${biz.name}"? This cannot be undone.`)) return;
    await deleteBusiness(biz.id);
    setBusinesses((prev) => prev.filter((b) => b.id !== biz.id));
    setMsg("Deleted.");
    setTimeout(() => setMsg(""), 2000);
  };

  const handleTagSearch = async (dryRun: boolean) => {
    if (!yelpTag.trim()) return;
    setYelpLoading(true);
    setYelpResult(null);
    try {
      const tag = yelpTag.trim();
      // Step 1: Search Google Places with pagination (up to 3 pages / 60 results)
      const placeNames: any[] = [];
      let nextPageToken: string | undefined;
      for (let page = 0; page < 3; page++) {
        const params = nextPageToken
          ? `pagetoken=${nextPageToken}`
          : `query=${encodeURIComponent(tag + " restaurant Little Saigon Westminster Garden Grove Fountain Valley Santa Ana")}`;
        const searchRes = await fetch(`/api/places/search?${params}`);
        const searchData = await searchRes.json();
        if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
          if (page === 0) throw new Error(`Google Places error: ${searchData.status}`);
          break;
        }
        for (const p of searchData.results || []) {
          placeNames.push({
            name: p.name,
            address: p.formatted_address || "",
            place_id: p.place_id || "",
            rating: p.rating || 0,
            user_ratings_total: p.user_ratings_total || 0,
            types: p.types || [],
          });
        }
        nextPageToken = searchData.next_page_token;
        if (!nextPageToken) break;
        // Google requires a delay before using next_page_token
        await new Promise((r) => setTimeout(r, 2000));
      }
      // Step 2: Load all businesses for matching
      const { businesses: allBiz } = await getBusinesses({ limitCount: 1000 });
      // Step 3: Send to API for name matching
      const res = await fetch("/api/admin/tag-from-yelp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeNames, businesses: allBiz.map((b) => ({ id: b.id, name: b.name, tags: b.tags })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const tagNorm = norm(tag);
      // Check which are already tagged (accent-insensitive)
      const matched = data.matched.map((m: any) => {
        const biz = allBiz.find((b) => b.id === m.id);
        return { ...m, alreadyTagged: (biz?.tags || []).some((t: string) => norm(t) === tagNorm) };
      });
      if (dryRun) setExcludedIds(new Set());
      // Find businesses already tagged in DB but not found by Google
      const matchedIds = new Set(matched.map((m: any) => m.id));
      const alreadyTaggedInDb = allBiz
        .filter((b) => (b.tags || []).some((t: string) => norm(t) === tagNorm) && !matchedIds.has(b.id))
        .map((b) => ({ id: b.id, name: b.name, alreadyTagged: true, sourceName: "existing" }));
      // Step 4: Tag/untag via client-side Firestore (if not dry run)
      let tagged = 0;
      let removed = 0;
      if (!dryRun) {
        for (const m of matched) {
          const isExcluded = excludedIds.has(m.id);
          const existing = allBiz.find((b) => b.id === m.id)?.tags || [];
          if (isExcluded && existing.some((t: string) => norm(t) === tagNorm)) {
            // Remove tag from excluded business
            await updateBusiness(m.id, { tags: existing.filter((t: string) => norm(t) !== tagNorm) });
            removed++;
          } else if (!isExcluded && !m.alreadyTagged) {
            // Add tag to included business
            const merged = Array.from(new Set([...existing, tag]));
            await updateBusiness(m.id, { tags: merged });
            tagged++;
          }
        }
        if (tagged > 0 || removed > 0) load();
      }
      setYelpResult({
        searchResults: placeNames.length,
        matched: [...matched, ...alreadyTaggedInDb],
        unmatched: data.unmatched,
        tagged,
        removed: removed || 0,
        dryRun,
      });
    } catch (err: any) {
      setYelpResult({ error: err.message });
    } finally {
      setYelpLoading(false);
    }
  };

  const handleQuickAdd = async (place: any) => {
    setAddingPlace(place.place_id || place.name);
    try {
      // 1. Fetch full details from Google Places
      const detailRes = await fetch(`/api/places/details?placeId=${place.place_id}`);
      const detailData = await detailRes.json();
      const d = detailData.result;
      if (!d) throw new Error("Could not fetch place details");

      // 2. Infer category from Google types
      const types: string[] = d.types || [];
      let category: BusinessCategory = "restaurant";
      if (types.some((t: string) => ["bakery"].includes(t))) category = "bakery_dessert";
      else if (types.some((t: string) => ["cafe", "coffee_shop"].includes(t))) category = "coffee_tea";
      else if (types.some((t: string) => ["grocery_or_supermarket", "supermarket"].includes(t))) category = "grocery";
      else if (types.some((t: string) => ["beauty_salon", "hair_care", "nail_salon", "spa"].includes(t))) category = "beauty";

      // 3. Fetch photos
      const photoRefs = (d.photos || []).slice(0, 5);
      const photoUrls: { url: string; tag: string }[] = [];
      for (const ref of photoRefs) {
        const photoRes = await fetch(`/api/places/photo?ref=${ref.photo_reference}&maxwidth=800`);
        const photoData = await photoRes.json();
        if (photoData.url) photoUrls.push({ url: photoData.url, tag: "food" });
      }

      // 4. Auto-classify photos if we have any
      if (photoUrls.length > 0) {
        try {
          const classifyRes = await fetch("/api/photos/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: photoUrls.map((p) => p.url) }),
          });
          const classifyData = await classifyRes.json();
          if (classifyData.tags) {
            classifyData.tags.forEach((tag: string, i: number) => {
              if (photoUrls[i]) photoUrls[i].tag = tag;
            });
          }
        } catch { /* classification is optional */ }
      }

      // 5. Create business
      const hours = d.opening_hours?.weekday_text || [];
      const tag = yelpTag.trim();
      const bizId = await createBusiness({
        name: d.name,
        address: d.formatted_address || place.address,
        phone: d.formatted_phone_number || "",
        website: d.website || "",
        rating: d.rating || 0,
        totalRatings: d.user_ratings_total || 0,
        priceLevel: d.price_level,
        category,
        types,
        photos: photoUrls.map((p) => p.url),
        hours,
        description: "",
        latitude: d.geometry?.location?.lat || 0,
        longitude: d.geometry?.location?.lng || 0,
        placeId: place.place_id,
        active: true,
        tags: tag ? [tag] : [],
      } as any);

      // 6. Save photos to subcollection
      if (photoUrls.length > 0) {
        await Promise.all(
          photoUrls.map((photo, i) =>
            addDoc(collection(db, "businesses", bizId, "photos"), {
              businessId: bizId,
              url: photo.url,
              tag: photo.tag,
              order: i,
              createdAt: serverTimestamp(),
            })
          )
        );
      }

      // 7. Update UI - move from unmatched to matched
      setYelpResult((prev: any) => ({
        ...prev,
        unmatched: prev.unmatched.filter((u: any) => (u.place_id || u.name) !== (place.place_id || place.name)),
        matched: [...prev.matched, { id: bizId, name: d.name, sourceName: place.name, alreadyTagged: true, justAdded: true }],
      }));
      load();
    } catch (err: any) {
      setMsg(err.message || "Error adding business");
      setTimeout(() => setMsg(""), 3000);
    } finally {
      setAddingPlace(null);
    }
  };

  return (
    <div className="p-2xl">
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Businesses</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">
            {businesses.length === totalCount ? `${totalCount} listings` : `${businesses.length} of ${totalCount} listings`}
          </p>
        </div>
        <div className="flex items-center gap-md">
          {msg && <span className="text-[13px] font-semibold text-green-600">{msg}</span>}
          <Link href="/admin/businesses/new" className="ls-btn flex items-center gap-sm text-[13px]">
            <Plus size={15} /> Add Business
          </Link>
        </div>
      </div>

      {/* Food Tag Tool */}
      <div className="mb-xl">
        <button
          onClick={() => setShowYelp(!showYelp)}
          className="flex items-center gap-sm text-[13px] font-semibold text-ls-primary hover:underline mb-md"
        >
          <Tag size={14} /> {showYelp ? "Hide" : "Show"} Food Tag Tool
        </button>
        {showYelp && (
          <div className="bg-white rounded-card border border-ls-border p-lg mb-lg">
            <p className="text-[13px] text-ls-secondary mb-md">
              Enter a food name to search Google Places, match results to your listings, and auto-tag them.
            </p>
            <div className="flex gap-md items-center mb-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. Banh Xeo, Pho, Com Tam..."
                  value={yelpTag}
                  onChange={(e) => { setYelpTag(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { setShowSuggestions(false); handleTagSearch(true); }
                    if (e.key === "Escape") setShowSuggestions(false);
                  }}
                  className="w-full border border-ls-border rounded-btn px-md py-[9px] text-[14px] focus:outline-none focus:border-ls-primary"
                />
                {showSuggestions && yelpTag.length >= 1 && (() => {
                  const n = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                  const needle = n(yelpTag);
                  const filtered = allKnownTags.filter((t) => n(t).includes(needle)).slice(0, 12);
                  if (filtered.length === 0) return null;
                  return (
                    <div className="absolute z-50 top-full left-0 right-0 mt-[2px] bg-white border border-ls-border rounded-btn shadow-lg max-h-[240px] overflow-y-auto">
                      {filtered.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setYelpTag(t); setShowSuggestions(false); }}
                          className="w-full text-left px-md py-[7px] text-[13px] hover:bg-ls-surface transition-colors"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={() => handleTagSearch(true)}
                disabled={yelpLoading || !yelpTag.trim()}
                className="ls-btn text-[13px] flex items-center gap-sm whitespace-nowrap"
              >
                {yelpLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Preview
              </button>
              <button
                onClick={() => handleTagSearch(false)}
                disabled={yelpLoading || !yelpTag.trim()}
                className="bg-green-600 text-white rounded-btn px-md py-[9px] text-[13px] font-semibold hover:bg-green-700 flex items-center gap-sm whitespace-nowrap disabled:opacity-50"
              >
                {yelpLoading ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
                Search & Tag
              </button>
            </div>
            {yelpResult?.error && (
              <p className="text-[13px] text-red-600 mt-sm">{yelpResult.error}</p>
            )}
            {yelpResult && !yelpResult.error && (
              <div className="mt-md text-[13px]">
                <p className="font-semibold text-ls-primary mb-sm">
                  Google Places: {yelpResult.searchResults} · Matched: {yelpResult.matched.length}
                  {yelpResult.dryRun ? " (preview — uncheck to exclude)" : ` · Tagged ${yelpResult.tagged}${yelpResult.removed ? ` · Removed ${yelpResult.removed}` : ""}`}
                </p>
                {yelpResult.matched.length > 0 && (
                  <div className="mb-md">
                    <p className="font-semibold text-green-700 mb-xs">Matched ({yelpResult.matched.length}):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-xs max-h-[400px] overflow-y-auto">
                      {yelpResult.matched.map((m: any) => (
                        <label key={m.id} className="flex items-center gap-sm text-[12px] cursor-pointer hover:bg-gray-50 rounded px-xs py-[2px]">
                          <input
                            type="checkbox"
                            checked={!excludedIds.has(m.id)}
                            onChange={() => setExcludedIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
                              return next;
                            })}
                            className="rounded border-ls-border text-green-600 shrink-0"
                          />
                          <span className={excludedIds.has(m.id) ? "text-ls-secondary line-through" : "text-ls-body"}>{m.name}</span>
                          {m.alreadyTagged && !excludedIds.has(m.id) && <span className="text-[10px] text-ls-secondary">(already tagged)</span>}
                          {m.alreadyTagged && excludedIds.has(m.id) && <span className="text-[10px] text-red-500">(will remove tag)</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {yelpResult.unmatched.length > 0 && (
                  <div>
                    <p className="font-semibold text-amber-600 mb-xs">Not in our listings ({yelpResult.unmatched.length}):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm max-h-[200px] overflow-y-auto">
                      {yelpResult.unmatched.map((u: any, i: number) => (
                        <div key={i} className="flex items-center gap-sm text-[12px]">
                          <X size={12} className="text-amber-500 shrink-0" />
                          <span className="text-ls-secondary flex-1">{u.name}</span>
                          {u.place_id && (
                            <button
                              onClick={() => handleQuickAdd(u)}
                              disabled={addingPlace === (u.place_id || u.name)}
                              className="text-[11px] font-semibold text-ls-primary hover:underline disabled:opacity-50 flex items-center gap-[3px] shrink-0"
                            >
                              {addingPlace === (u.place_id || u.name) ? (
                                <><Loader2 size={10} className="animate-spin" /> Adding...</>
                              ) : (
                                <><Plus size={10} /> Add</>
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recently Added */}
      <div className="mb-xl">
        <button
          onClick={() => setShowRecent(!showRecent)}
          className="flex items-center gap-sm text-[13px] font-semibold text-ls-primary hover:underline mb-md"
        >
          <Clock size={14} /> {showRecent ? "Hide" : "Show"} Recently Added
        </button>
        {showRecent && (
          <div className="bg-white rounded-card border border-ls-border overflow-hidden mb-lg">
            {recentLoading ? (
              <div className="p-lg text-center text-ls-secondary text-[13px]">Loading...</div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-ls-border bg-gray-50">
                    <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Name</th>
                    <th className="text-left px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Category</th>
                    <th className="text-left px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Food Tags</th>
                    <th className="text-left px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Date Added</th>
                    <th className="text-center px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Hot & New</th>
                    <th className="px-md py-md" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ls-border">
                  {recentBiz.map((biz) => {
                    const created = biz.createdAt?.toDate?.() ?? (biz.createdAt?.seconds ? new Date(biz.createdAt.seconds * 1000) : null);
                    const foodTags = (biz.tags || []).filter((t: string) => !["Dine-In","Takeout","Delivery","Drive-Through","Food to Go","Breakfast","Lunch","Dinner","Brunch","Late Night","Vegetarian","Vegan","Halal","Gluten-Free"].includes(t));
                    return (
                      <tr key={biz.id} className="hover:bg-gray-50">
                        <td className="px-lg py-md">
                          <div>
                            <span className="font-medium text-ls-primary">{biz.name}</span>
                            <p className="text-[11px] text-ls-secondary truncate max-w-[250px]">{biz.address}</p>
                          </div>
                        </td>
                        <td className="px-md py-md capitalize text-ls-body">{biz.category}</td>
                        <td className="px-md py-md">
                          <div className="flex flex-wrap gap-[3px] max-w-[250px]">
                            {foodTags.length > 0 ? foodTags.map((t: string) => (
                              <span key={t} className="inline-block bg-ls-surface text-ls-body text-[10px] px-[6px] py-[2px] rounded-full">{t}</span>
                            )) : <span className="text-ls-secondary text-[11px]">—</span>}
                          </div>
                        </td>
                        <td className="px-md py-md text-ls-secondary">
                          {created ? created.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-md py-md text-center">
                          <button
                            onClick={async () => {
                              const newVal = !(biz as any).isNew;
                              await updateBusiness(biz.id!, { isNew: newVal } as any);
                              setRecentBiz((prev) => prev.map((b) => b.id === biz.id ? { ...b, isNew: newVal } as any : b));
                            }}
                            className={`inline-flex items-center gap-[4px] text-[11px] font-semibold px-[8px] py-[3px] rounded-full transition-colors ${
                              (biz as any).isNew
                                ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                          >
                            <span className={`w-[6px] h-[6px] rounded-full ${(biz as any).isNew ? "bg-orange-500" : "bg-gray-300"}`} />
                            {(biz as any).isNew ? "ON" : "OFF"}
                          </button>
                        </td>
                        <td className="px-md py-md">
                          <Link href={`/admin/businesses/${biz.id}/edit`} className="text-[12px] font-semibold text-ls-primary hover:underline">
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
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
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="bg-white border border-ls-border rounded-btn px-md py-[9px] text-[14px] focus:outline-none focus:border-ls-primary"
        >
          <option value="">All Tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
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
                <th className="text-left px-md py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px] hidden xl:table-cell">Tags</th>
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
                          <Link href={`/admin/businesses/${biz.id}/edit`} className="font-medium text-ls-primary hover:underline">{biz.name}</Link>
                          <p className="text-[11px] text-ls-secondary truncate max-w-[200px]">{biz.address}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-md py-md">
                      {isEditing ? (
                        <select
                          value={editForm.category || biz.category}
                          onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value as LegacyBusinessCategory }))}
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
                    <td className="px-md py-md hidden xl:table-cell">
                      {(biz.tags?.length) ? (
                        <div className="flex items-center gap-[3px] max-w-[180px]">
                          {biz.tags.slice(0, 3).map((t) => (
                            <span key={t} className="inline-block bg-ls-surface text-ls-body text-[10px] px-[6px] py-[2px] rounded-full whitespace-nowrap truncate max-w-[70px]" title={t}>{t}</span>
                          ))}
                          {biz.tags.length > 3 && (
                            <Link href={`/admin/businesses/${biz.id}/edit`} className="text-[10px] text-ls-secondary hover:text-ls-primary whitespace-nowrap" title={biz.tags.slice(3).join(", ")}>
                              +{biz.tags.length - 3}
                            </Link>
                          )}
                        </div>
                      ) : (
                        <span className="text-ls-secondary text-[11px]">—</span>
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
                          <>
                            <button
                              onClick={() => startEdit(biz)}
                              className="p-xs text-ls-secondary hover:text-ls-primary"
                              title="Quick edit"
                            >
                              <Pencil size={15} />
                            </button>
                            <Link
                              href={`/admin/businesses/${biz.id}/edit`}
                              className="p-xs text-ls-secondary hover:text-ls-primary"
                              title="Full edit"
                            >
                              <Settings2 size={15} />
                            </Link>
                            <button
                              onClick={() => handleDelete(biz)}
                              className="p-xs text-ls-secondary hover:text-red-500"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
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

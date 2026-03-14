"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Trophy, X, Search, Save, ArrowUp, ArrowDown, ImageIcon, Upload, Loader2,
  Plus, GripVertical, Pencil,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDishes,
  searchBusinesses,
  getDishFeatured,
  setDishFeatured,
  updateDishHeroImage,
  addFood,
  updateFood,
  reorderFoods,
} from "@/lib/services";
import type { MonVietDish, Business } from "@/lib/types";

const MAX_FEATURED = 8;

const MEDAL_CONFIG: Record<number, { bg: string; text: string }> = {
  0: { bg: "bg-amber-400", text: "1st" },
  1: { bg: "bg-slate-400", text: "2nd" },
  2: { bg: "bg-amber-700", text: "3rd" },
};

export default function GuideAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Food list state
  const [dishes, setDishes] = useState<MonVietDish[]>([]);
  const [selectedDish, setSelectedDish] = useState<MonVietDish | null>(null);
  const [dishFilter, setDishFilter] = useState("");
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderDirty, setReorderDirty] = useState(false);
  const [savingReorder, setSavingReorder] = useState(false);

  // Add new food state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEnglish, setNewEnglish] = useState("");
  const [addingFood, setAddingFood] = useState(false);

  // Featured panel state
  const [featured, setFeatured] = useState<Business[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Hero image state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageMsg, setImageMsg] = useState("");
  const [heroPreview, setHeroPreview] = useState<string | null>(null);

  // Guard: admin only
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  // Load all foods
  const loadDishes = useCallback(() => {
    getDishes().then((loaded) => {
      setDishes(loaded);
      const rankParam = searchParams.get("dish");
      if (rankParam) {
        const match = loaded.find((d) => d.rank === parseInt(rankParam));
        if (match) setSelectedDish(match);
      }
    });
  }, [searchParams]);

  useEffect(() => { loadDishes(); }, [loadDishes]);

  // Load featured when food selected
  useEffect(() => {
    if (!selectedDish) return;
    setLoadingFeatured(true);
    setFeatured([]);
    getDishFeatured(selectedDish.rank)
      .then(setFeatured)
      .finally(() => setLoadingFeatured(false));
  }, [selectedDish]);

  // Debounced business search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      searchBusinesses(searchQuery).then((r) => setSearchResults(r.slice(0, 8)));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Featured handlers ──

  const handleAdd = (biz: Business) => {
    if (featured.length >= MAX_FEATURED) return;
    if (featured.find((b) => b.id === biz.id)) return;
    setFeatured((prev) => [...prev, biz]);
  };

  const handleRemove = (bizId: string) => {
    setFeatured((prev) => prev.filter((b) => b.id !== bizId));
  };

  const handleMove = (index: number, dir: -1 | 1) => {
    const next = [...featured];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setFeatured(next);
  };

  const handleSaveFeatured = async () => {
    if (!selectedDish) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await setDishFeatured(selectedDish.rank, featured.map((b) => b.id));
      setSaveMsg("Saved successfully!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      setSaveMsg("Error saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Reorder handlers ──

  const moveFood = (index: number, dir: -1 | 1) => {
    const next = [...dishes];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setDishes(next);
    setReorderDirty(true);
  };

  const handleSaveReorder = async () => {
    setSavingReorder(true);
    try {
      const ordered = dishes.map((d, i) => ({ docId: d.id, rank: i + 1 }));
      await reorderFoods(ordered);
      // Update local ranks
      setDishes((prev) => prev.map((d, i) => ({ ...d, rank: i + 1 })));
      setReorderDirty(false);
      setReorderMode(false);
    } catch (err) {
      console.error("Reorder failed:", err);
    } finally {
      setSavingReorder(false);
    }
  };

  // ── Add food handler ──

  const handleAddFood = async () => {
    if (!newName.trim() || !newEnglish.trim()) return;
    setAddingFood(true);
    try {
      const nextRank = dishes.length + 1;
      await addFood({ vietnameseName: newName.trim(), englishName: newEnglish.trim(), rank: nextRank });
      setNewName("");
      setNewEnglish("");
      setShowAddForm(false);
      loadDishes();
    } catch (err) {
      console.error("Add food failed:", err);
    } finally {
      setAddingFood(false);
    }
  };

  const filteredDishes = dishes.filter(
    (d) =>
      !dishFilter ||
      d.name.toLowerCase().includes(dishFilter.toLowerCase()) ||
      d.englishName.toLowerCase().includes(dishFilter.toLowerCase())
  );

  if (authLoading) return <div className="ls-container py-3xl text-ls-secondary">Loading...</div>;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="p-2xl">
      {/* Header */}
      <div className="mb-2xl">
        <div className="flex items-center gap-sm mb-xs">
          <Link href="/admin" className="text-meta text-ls-secondary hover:text-ls-primary">Admin</Link>
          <span className="text-ls-secondary">/</span>
          <span className="text-meta text-ls-body">Food Guide</span>
        </div>
        <h1 className="text-page-title text-ls-primary">Food Guide</h1>
        <p className="text-body text-ls-secondary mt-xs">
          Manage the food list, reorder rankings, and curate up to {MAX_FEATURED} featured restaurants per food.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-2xl">

        {/* ═══ Left: Food list ═══ */}
        <div>
          {/* Controls */}
          <div className="flex items-center gap-sm mb-md">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
              <input
                type="text"
                placeholder="Filter foods..."
                value={dishFilter}
                onChange={(e) => setDishFilter(e.target.value)}
                className="w-full pl-[36px] pr-md py-sm border border-ls-border rounded-btn text-[13px] focus:outline-none focus:border-ls-primary"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-sm mb-md">
            <button
              onClick={() => { setReorderMode(!reorderMode); if (reorderMode && reorderDirty) { setReorderDirty(false); loadDishes(); } }}
              className={`text-[12px] font-medium px-md py-xs rounded-btn border transition-colors ${
                reorderMode ? "bg-ls-primary text-white border-ls-primary" : "border-ls-border text-ls-secondary hover:text-ls-primary"
              }`}
            >
              <GripVertical size={12} className="inline mr-1" />
              {reorderMode ? "Cancel Reorder" : "Reorder"}
            </button>
            {reorderMode && reorderDirty && (
              <button
                onClick={handleSaveReorder}
                disabled={savingReorder}
                className="text-[12px] font-medium px-md py-xs rounded-btn bg-green-600 text-white disabled:opacity-50"
              >
                {savingReorder ? "Saving..." : "Save Order"}
              </button>
            )}
            {!reorderMode && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-[12px] font-medium px-md py-xs rounded-btn border border-ls-border text-ls-secondary hover:text-ls-primary"
              >
                <Plus size={12} className="inline mr-1" />
                Add Food
              </button>
            )}
          </div>

          {/* Add food form */}
          {showAddForm && (
            <div className="bg-white border border-ls-border rounded-card p-md mb-md space-y-sm">
              <input
                type="text"
                placeholder="Vietnamese name (e.g. Phở Bò)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-ls-border rounded-btn px-md py-xs text-[13px] focus:outline-none focus:border-ls-primary"
              />
              <input
                type="text"
                placeholder="English name (e.g. Beef Noodle Soup)"
                value={newEnglish}
                onChange={(e) => setNewEnglish(e.target.value)}
                className="w-full border border-ls-border rounded-btn px-md py-xs text-[13px] focus:outline-none focus:border-ls-primary"
              />
              <div className="flex gap-sm">
                <button
                  onClick={handleAddFood}
                  disabled={addingFood || !newName.trim() || !newEnglish.trim()}
                  className="ls-btn text-[12px] flex items-center gap-1 disabled:opacity-50"
                >
                  {addingFood ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  {addingFood ? "Adding..." : "Add"}
                </button>
                <button onClick={() => setShowAddForm(false)} className="text-[12px] text-ls-secondary hover:text-ls-primary">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Food list */}
          <div className="space-y-[2px] max-h-[65vh] overflow-y-auto rounded-card border border-ls-border">
            {filteredDishes.map((d, i) => (
              <div
                key={d.id}
                className={`w-full text-left px-md py-sm flex items-center gap-sm transition-colors ${
                  selectedDish?.rank === d.rank && !reorderMode
                    ? "bg-ls-primary text-white"
                    : "hover:bg-ls-surface text-ls-body"
                }`}
              >
                {reorderMode ? (
                  <>
                    <div className="flex flex-col gap-[1px] flex-shrink-0">
                      <button
                        onClick={() => moveFood(i, -1)}
                        disabled={i === 0}
                        className="text-ls-secondary hover:text-ls-primary disabled:opacity-20 p-[1px]"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => moveFood(i, 1)}
                        disabled={i === filteredDishes.length - 1}
                        className="text-ls-secondary hover:text-ls-primary disabled:opacity-20 p-[1px]"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                    <span className="text-[11px] font-bold w-[26px] flex-shrink-0 text-ls-secondary">
                      #{i + 1}
                    </span>
                    <span className="text-[13px] truncate">{d.name}</span>
                    <span className="text-[11px] text-ls-secondary truncate ml-auto">{d.englishName}</span>
                  </>
                ) : (
                  <button
                    onClick={() => { setSelectedDish(d); setSearchQuery(""); setSearchResults([]); setSaveMsg(""); setHeroPreview(d.photoURL || null); setImageMsg(""); }}
                    className="flex items-center gap-sm w-full"
                  >
                    <span className={`text-[11px] font-bold w-[26px] flex-shrink-0 ${
                      selectedDish?.rank === d.rank ? "text-white/70" : "text-ls-secondary"
                    }`}>
                      #{d.rank}
                    </span>
                    <span className="text-[13px] truncate">{d.name}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ls-secondary mt-sm">{dishes.length} foods total</p>
        </div>

        {/* ═══ Right: Management panel ═══ */}
        <div>
          {!selectedDish ? (
            <div className="flex items-center justify-center h-[300px] text-ls-secondary text-[14px] border-2 border-dashed border-ls-border rounded-card">
              Select a food from the list to manage its featured restaurants
            </div>
          ) : (
            <div>
              {/* Food header */}
              <div className="mb-xl pb-xl border-b border-ls-border">
                <h2 className="text-section-header text-ls-primary">
                  #{selectedDish.rank} {selectedDish.name}
                </h2>
                <p className="text-meta text-ls-secondary">{selectedDish.englishName}</p>
              </div>

              {/* Hero Image Upload */}
              <div className="mb-xl pb-xl border-b border-ls-border">
                <h3 className="text-[14px] font-semibold text-ls-primary flex items-center gap-sm mb-md">
                  <ImageIcon size={14} /> Hero Image
                </h3>
                <div className="flex items-start gap-lg">
                  <div className="w-[120px] h-[90px] rounded-btn border border-ls-border overflow-hidden bg-ls-surface flex items-center justify-center shrink-0">
                    {heroPreview ? (
                      <img src={heroPreview} alt="Hero" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={24} className="text-ls-border" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="ls-btn flex items-center gap-sm text-[13px] cursor-pointer w-fit">
                      {uploadingImage ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                      {uploadingImage ? "Uploading…" : "Upload Image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !selectedDish) return;
                          setUploadingImage(true);
                          setImageMsg("");
                          try {
                            const url = await updateDishHeroImage(selectedDish.id, selectedDish.rank, file);
                            setHeroPreview(url);
                            setDishes((prev) => prev.map((d) => d.id === selectedDish.id ? { ...d, photoURL: url } : d));
                            setImageMsg("Image saved!");
                            setTimeout(() => setImageMsg(""), 3000);
                          } catch {
                            setImageMsg("Upload failed.");
                          } finally {
                            setUploadingImage(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                    <p className="text-[11px] text-ls-secondary mt-xs">JPG, PNG or WebP. Recommended 1200×800.</p>
                    {imageMsg && (
                      <p className={`text-[12px] font-semibold mt-xs ${imageMsg === "Image saved!" ? "text-green-600" : "text-red-500"}`}>
                        {imageMsg}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Featured slots */}
              <div className="mb-xl">
                <div className="flex items-center justify-between mb-md">
                  <h3 className="text-[14px] font-semibold text-ls-primary flex items-center gap-sm">
                    <Trophy size={14} className="text-amber-500" />
                    Featured Restaurants
                  </h3>
                  <span className="text-[12px] text-ls-secondary">{featured.length} / {MAX_FEATURED} slots filled</span>
                </div>

                {loadingFeatured ? (
                  <p className="text-[13px] text-ls-secondary py-md">Loading...</p>
                ) : featured.length === 0 ? (
                  <div className="py-lg border-2 border-dashed border-ls-border rounded-card text-center">
                    <p className="text-[13px] text-ls-secondary">No featured restaurants yet.</p>
                    <p className="text-[12px] text-ls-secondary mt-xs">Search below to add up to {MAX_FEATURED}.</p>
                  </div>
                ) : (
                  <div className="space-y-sm">
                    {featured.map((biz, i) => (
                      <div key={biz.id} className="ls-card flex items-center gap-md">
                        <div className={`w-[36px] h-[36px] rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${MEDAL_CONFIG[i]?.bg || "bg-ls-primary"}`}>
                          {MEDAL_CONFIG[i]?.text || `#${i + 1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-ls-primary truncate">{biz.name}</p>
                          <p className="text-[12px] text-ls-secondary truncate">{biz.address}</p>
                          <p className="text-[11px] text-ls-secondary capitalize">{biz.category} · {biz.rating.toFixed(1)} ★</p>
                        </div>
                        <div className="flex items-center gap-xs flex-shrink-0">
                          <button onClick={() => handleMove(i, -1)} disabled={i === 0} className="p-xs text-ls-secondary hover:text-ls-primary disabled:opacity-30" title="Move up">
                            <ArrowUp size={14} />
                          </button>
                          <button onClick={() => handleMove(i, 1)} disabled={i === featured.length - 1} className="p-xs text-ls-secondary hover:text-ls-primary disabled:opacity-30" title="Move down">
                            <ArrowDown size={14} />
                          </button>
                          <button onClick={() => handleRemove(biz.id)} className="p-xs text-red-400 hover:text-red-600" title="Remove">
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save featured */}
              <div className="flex items-center gap-md mb-2xl">
                <button onClick={handleSaveFeatured} disabled={saving} className="ls-btn flex items-center gap-sm">
                  <Save size={15} />
                  {saving ? "Saving..." : "Save Featured List"}
                </button>
                {saveMsg && (
                  <span className={`text-[13px] font-semibold ${saveMsg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>
                    {saveMsg}
                  </span>
                )}
              </div>

              {/* Search to add */}
              {featured.length < MAX_FEATURED && (
                <div className="border-t border-ls-border pt-xl">
                  <h3 className="text-[14px] font-semibold text-ls-primary flex items-center gap-sm mb-md">
                    <Search size={14} />
                    Add a Restaurant
                  </h3>
                  <div className="relative mb-md">
                    <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
                    <input
                      type="text"
                      placeholder="Search by name, category, or address..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-[40px] pr-md py-sm border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary"
                    />
                  </div>
                  <div className="space-y-sm max-h-[400px] overflow-y-auto">
                    {searchResults
                      .filter((r) => !featured.find((f) => f.id === r.id))
                      .map((biz) => (
                        <div key={biz.id} className="ls-card flex items-center gap-md">
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-ls-primary truncate">{biz.name}</p>
                            <p className="text-[12px] text-ls-secondary truncate">{biz.address}</p>
                            <p className="text-[11px] text-ls-secondary capitalize">{biz.category} · {biz.rating.toFixed(1)} ★</p>
                          </div>
                          <button
                            onClick={() => handleAdd(biz)}
                            className="flex-shrink-0 text-[12px] font-semibold border border-ls-primary text-ls-primary rounded-btn px-md py-xs hover:bg-ls-primary hover:text-white transition-colors"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

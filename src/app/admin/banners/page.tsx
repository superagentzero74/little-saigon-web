"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, GripVertical, Loader2, ToggleLeft, ToggleRight, Pencil, X, Upload, Save,
  ArrowUp, ArrowDown,
} from "lucide-react";
import {
  getPromoBanners, createPromoBanner, updatePromoBanner, deletePromoBanner,
  uploadPromoBannerImage, reorderPromoBanners, getDishes, getSubcategories,
} from "@/lib/services";
import type { PromoBanner, MonVietDish, SubcategoryInfo } from "@/lib/types";

const CATEGORIES = [
  { value: "restaurant", label: "Restaurants" },
  { value: "coffee_tea", label: "Coffee & Tea" },
  { value: "bakery_dessert", label: "Bakery & Dessert" },
  { value: "grocery", label: "Grocery & Markets" },
  { value: "beauty", label: "Beauty & Wellness" },
  { value: "shopping", label: "Shopping & Retail" },
  { value: "services", label: "Services" },
  { value: "health", label: "Health & Medical" },
  { value: "entertainment", label: "Events & Entertainment" },
  { value: "community", label: "Community & Education" },
];

export default function BannersAdminPage() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [dishes, setDishes] = useState<MonVietDish[]>([]);
  const [allSubcategories, setAllSubcategories] = useState<SubcategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<PromoBanner["linkType"]>("search");
  const [linkValue, setLinkValue] = useState("");
  const [linkSubcategory, setLinkSubcategory] = useState("");
  const [uploading, setUploading] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLinkType, setEditLinkType] = useState<PromoBanner["linkType"]>("search");
  const [editLinkValue, setEditLinkValue] = useState("");
  const [editLinkSubcategory, setEditLinkSubcategory] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [data, dishData, subData] = await Promise.all([getPromoBanners(), getDishes(), getSubcategories()]);
    setBanners(data);
    setDishes(dishData);
    setAllSubcategories(subData);
    setLoading(false);
  }

  // Helper: get subcategories for a given parent category
  function subsFor(parentSlug: string) {
    return allSubcategories.filter((s) => s.parentSlug === parentSlug);
  }

  // Helper: build linkValue with optional subcategory
  function buildCategoryLinkValue(cat: string, sub: string) {
    return sub ? `${cat}:${sub}` : cat;
  }

  // Helper: parse linkValue into category + subcategory
  function parseCategoryLinkValue(val: string) {
    const [cat, sub] = val.split(":");
    return { cat: cat || "", sub: sub || "" };
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function handleAdd() {
    if (!file) return;
    setUploading(true);
    try {
      const imageURL = await uploadPromoBannerImage(file);
      const nextOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.order)) + 1 : 0;
      const finalLinkValue = linkType === "category" ? buildCategoryLinkValue(linkValue, linkSubcategory) : linkValue;
      await createPromoBanner({ imageURL, linkType, linkValue: finalLinkValue, order: nextOrder, active: true });
      setShowAdd(false);
      setFile(null);
      setPreview(null);
      setLinkType("search");
      setLinkValue("");
      setLinkSubcategory("");
      await load();
    } catch (err) {
      alert("Failed to add banner: " + (err as Error).message);
    }
    setUploading(false);
  }

  async function handleDelete(banner: PromoBanner) {
    if (!confirm("Delete this banner?")) return;
    await deletePromoBanner(banner.id);
    await load();
  }

  async function handleToggleActive(banner: PromoBanner) {
    await updatePromoBanner(banner.id, { active: !banner.active });
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, active: !b.active } : b)));
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const newBanners = [...banners];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newBanners.length) return;
    [newBanners[index], newBanners[swapIndex]] = [newBanners[swapIndex], newBanners[index]];
    setBanners(newBanners);
    setSaving(true);
    await reorderPromoBanners(newBanners);
    setSaving(false);
  }

  async function handleSaveEdit(banner: PromoBanner) {
    setSaving(true);
    const finalLinkValue = editLinkType === "category" ? buildCategoryLinkValue(editLinkValue, editLinkSubcategory) : editLinkValue;
    await updatePromoBanner(banner.id, { linkType: editLinkType, linkValue: finalLinkValue });
    setEditingId(null);
    await load();
    setSaving(false);
  }

  function startEdit(banner: PromoBanner) {
    setEditingId(banner.id);
    setEditLinkType(banner.linkType);
    if (banner.linkType === "category") {
      const { cat, sub } = parseCategoryLinkValue(banner.linkValue);
      setEditLinkValue(cat);
      setEditLinkSubcategory(sub);
    } else {
      setEditLinkValue(banner.linkValue);
      setEditLinkSubcategory("");
    }
  }

  if (loading) {
    return (
      <div className="p-xl flex items-center gap-2 text-ls-secondary">
        <Loader2 size={16} className="animate-spin" /> Loading banners...
      </div>
    );
  }

  return (
    <div className="p-xl max-w-4xl">
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-xl font-bold text-ls-text">Promo Banners</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-md py-sm bg-ls-primary text-white text-sm font-medium rounded-lg hover:opacity-90"
        >
          {showAdd ? <X size={14} /> : <Plus size={14} />}
          {showAdd ? "Cancel" : "Add Banner"}
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="mb-lg p-lg border border-ls-border rounded-xl bg-white">
          <h2 className="text-sm font-semibold mb-md">New Banner</h2>
          <div className="space-y-md">
            <div>
              <label className="block text-xs font-medium text-ls-secondary mb-1">Image</label>
              {preview ? (
                <div className="relative w-64 h-36 rounded-lg overflow-hidden mb-2">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setFile(null); setPreview(null); }}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-md py-sm border border-dashed border-ls-border rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload size={14} className="text-ls-secondary" />
                  <span className="text-sm text-ls-secondary">Choose image...</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>
            <div className="flex gap-md">
              <div className="flex-1">
                <label className="block text-xs font-medium text-ls-secondary mb-1">Link Type</label>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value as PromoBanner["linkType"])}
                  className="w-full px-md py-sm border border-ls-border rounded-lg text-sm"
                >
                  <option value="search">Search</option>
                  <option value="food">Food Guide</option>
                  <option value="category">Category</option>
                  <option value="url">External URL</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-ls-secondary mb-1">
                  {linkType === "search" ? "Search Query" : linkType === "food" ? "Dish" : linkType === "category" ? "Category" : "URL"}
                </label>
                {linkType === "food" ? (
                  <select
                    value={linkValue}
                    onChange={(e) => setLinkValue(e.target.value)}
                    className="w-full px-md py-sm border border-ls-border rounded-lg text-sm"
                  >
                    <option value="">Select dish...</option>
                    {dishes.map((d) => (
                      <option key={d.rank} value={String(d.rank)}>#{d.rank} {d.name} — {d.englishName}</option>
                    ))}
                  </select>
                ) : linkType === "category" ? (
                  <div className="space-y-2">
                    <select
                      value={linkValue}
                      onChange={(e) => { setLinkValue(e.target.value); setLinkSubcategory(""); }}
                      className="w-full px-md py-sm border border-ls-border rounded-lg text-sm"
                    >
                      <option value="">Select category...</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    {linkValue && subsFor(linkValue).length > 0 && (
                      <select
                        value={linkSubcategory}
                        onChange={(e) => setLinkSubcategory(e.target.value)}
                        className="w-full px-md py-sm border border-ls-border rounded-lg text-sm"
                      >
                        <option value="">All (no subcategory)</option>
                        {subsFor(linkValue).map((s) => (
                          <option key={s.slug} value={s.slug}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <input
                    value={linkValue}
                    onChange={(e) => setLinkValue(e.target.value)}
                    placeholder={linkType === "search" ? "e.g. boba" : "https://..."}
                    className="w-full px-md py-sm border border-ls-border rounded-lg text-sm"
                  />
                )}
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={!file || uploading}
              className="flex items-center gap-1 px-md py-sm bg-ls-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {uploading ? "Uploading..." : "Add Banner"}
            </button>
          </div>
        </div>
      )}

      {/* Banner List */}
      {banners.length === 0 ? (
        <p className="text-sm text-ls-secondary">No promo banners yet.</p>
      ) : (
        <div className="space-y-sm">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`flex items-center gap-md p-md border rounded-xl bg-white ${
                banner.active ? "border-ls-border" : "border-ls-border opacity-50"
              }`}
            >
              {/* Reorder */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleMove(index, "up")}
                  disabled={index === 0 || saving}
                  className="text-ls-secondary hover:text-ls-text disabled:opacity-30"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => handleMove(index, "down")}
                  disabled={index === banners.length - 1 || saving}
                  className="text-ls-secondary hover:text-ls-text disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
              </div>

              {/* Thumbnail */}
              <img
                src={banner.imageURL}
                alt="Banner"
                className="w-32 h-20 object-cover rounded-lg shrink-0"
              />

              {/* Info / Edit */}
              <div className="flex-1 min-w-0">
                {editingId === banner.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editLinkType}
                      onChange={(e) => setEditLinkType(e.target.value as PromoBanner["linkType"])}
                      className="px-sm py-1 border border-ls-border rounded text-xs"
                    >
                      <option value="search">Search</option>
                      <option value="food">Food Guide</option>
                      <option value="category">Category</option>
                      <option value="url">External URL</option>
                    </select>
                    {editLinkType === "food" ? (
                      <select
                        value={editLinkValue}
                        onChange={(e) => setEditLinkValue(e.target.value)}
                        className="flex-1 px-sm py-1 border border-ls-border rounded text-xs"
                      >
                        <option value="">Select dish...</option>
                        {dishes.map((d) => (
                          <option key={d.rank} value={String(d.rank)}>#{d.rank} {d.name}</option>
                        ))}
                      </select>
                    ) : editLinkType === "category" ? (
                      <>
                        <select
                          value={editLinkValue}
                          onChange={(e) => { setEditLinkValue(e.target.value); setEditLinkSubcategory(""); }}
                          className="flex-1 px-sm py-1 border border-ls-border rounded text-xs"
                        >
                          <option value="">Select category...</option>
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        {editLinkValue && subsFor(editLinkValue).length > 0 && (
                          <select
                            value={editLinkSubcategory}
                            onChange={(e) => setEditLinkSubcategory(e.target.value)}
                            className="flex-1 px-sm py-1 border border-ls-border rounded text-xs"
                          >
                            <option value="">All</option>
                            {subsFor(editLinkValue).map((s) => (
                              <option key={s.slug} value={s.slug}>{s.name}</option>
                            ))}
                          </select>
                        )}
                      </>
                    ) : (
                      <input
                        value={editLinkValue}
                        onChange={(e) => setEditLinkValue(e.target.value)}
                        className="flex-1 px-sm py-1 border border-ls-border rounded text-xs"
                      />
                    )}
                    <button
                      onClick={() => handleSaveEdit(banner)}
                      disabled={saving}
                      className="text-ls-primary hover:opacity-80"
                    >
                      <Save size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-ls-secondary hover:text-ls-text">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium text-ls-secondary">
                      <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-[10px] uppercase font-semibold mr-1">
                        {banner.linkType}
                      </span>
                      {banner.linkValue}
                    </p>
                    <p className="text-[10px] text-ls-secondary/60 mt-0.5">Order: {banner.order}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => startEdit(banner)}
                  className="p-1.5 text-ls-secondary hover:text-ls-text rounded"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleToggleActive(banner)}
                  className={`p-1.5 rounded ${banner.active ? "text-green-600" : "text-ls-secondary"}`}
                  title={banner.active ? "Active" : "Inactive"}
                >
                  {banner.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                <button
                  onClick={() => handleDelete(banner)}
                  className="p-1.5 text-red-400 hover:text-red-600 rounded"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

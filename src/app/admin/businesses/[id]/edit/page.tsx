"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, Loader2, CheckCircle, MapPin, Phone, Globe, Star,
  X, ArrowLeft, ArrowRight, Trash2, ImageIcon, Plus, Tag,
} from "lucide-react";
import {
  getBusinessById, updateBusiness, getBusinessPhotos,
  deleteBusinessPhoto, reorderBusinessPhotos, updateBusinessPhoto, getDishes,
} from "@/lib/services";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { BusinessCategory, BusinessPhoto, PhotoTag, MonVietDish } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

const CATEGORY_OPTIONS = Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][];

const PHOTO_TAGS: PhotoTag[] = ["outside", "inside", "food", "drinks", "menu", "other"];

const OTHER_TAG_GROUPS: { label: string; tags: string[] }[] = [
  { label: "Cuisine", tags: ["Vietnamese"] },
  { label: "Dietary", tags: ["Vegetarian", "Vegan", "Halal", "Gluten-Free"] },
  { label: "Meal", tags: ["Breakfast", "Lunch", "Dinner", "Brunch", "Late Night"] },
  { label: "Service", tags: ["Dine-In", "Takeout", "Delivery", "Drive-Through"] },
];

interface FormState {
  name: string;
  category: BusinessCategory;
  address: string;
  phone: string;
  website: string;
  description: string;
  rating: string;
  totalRatings: string;
  priceLevel: string;
  latitude: string;
  longitude: string;
  placeId: string;
  hours: string;
  active: boolean;
  tags: string[];
}

export default function EditBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [dishes, setDishes] = useState<MonVietDish[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [customTag, setCustomTag] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [biz, pics, allDishes] = await Promise.all([
      getBusinessById(businessId),
      getBusinessPhotos(businessId),
      getDishes(),
    ]);
    setDishes(allDishes);
    if (!biz) { router.push("/admin/businesses"); return; }
    setForm({
      name: biz.name || "",
      category: biz.category || "restaurant",
      address: biz.address || "",
      phone: biz.phone || "",
      website: biz.website || "",
      description: biz.description || "",
      rating: biz.rating != null ? String(biz.rating) : "",
      totalRatings: biz.totalRatings != null ? String(biz.totalRatings) : "",
      priceLevel: biz.priceLevel != null ? String(biz.priceLevel) : "",
      latitude: biz.latitude != null ? String(biz.latitude) : "",
      longitude: biz.longitude != null ? String(biz.longitude) : "",
      placeId: biz.placeId || "",
      hours: (biz.hours || []).join("\n"),
      active: biz.active ?? true,
      tags: biz.tags || [],
    });
    setPhotos(pics);
    setLoading(false);
  }, [businessId, router]);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof FormState, value: string | boolean | string[]) =>
    setForm((p) => p ? { ...p, [key]: value } : p);

  const toggleTag = (tag: string) => {
    if (!form) return;
    const next = form.tags.includes(tag)
      ? form.tags.filter((t) => t !== tag)
      : [...form.tags, tag];
    set("tags", next);
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (!t || !form || form.tags.includes(t)) { setCustomTag(""); return; }
    set("tags", [...form.tags, t]);
    setCustomTag("");
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim()) { setMsg({ text: "Name is required", err: true }); return; }
    setSaving(true);
    try {
      await updateBusiness(businessId, {
        name: form.name.trim(),
        category: form.category,
        address: form.address.trim(),
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        description: form.description.trim() || null,
        rating: form.rating ? parseFloat(form.rating) : 0,
        totalRatings: form.totalRatings ? parseInt(form.totalRatings) : 0,
        priceLevel: form.priceLevel ? parseInt(form.priceLevel) : null,
        latitude: form.latitude ? parseFloat(form.latitude) : 0,
        longitude: form.longitude ? parseFloat(form.longitude) : 0,
        placeId: form.placeId || null,
        hours: form.hours ? form.hours.split("\n").filter(Boolean) : [],
        active: form.active,
        tags: form.tags,
      } as any);
      setMsg({ text: "Saved!" });
      setTimeout(() => setMsg(null), 2500);
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to save", err: true });
    } finally {
      setSaving(false);
    }
  };

  // Photo reorder helpers
  const movePhoto = async (index: number, direction: -1 | 1) => {
    const newPhotos = [...photos];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newPhotos.length) return;
    [newPhotos[index], newPhotos[swapIndex]] = [newPhotos[swapIndex], newPhotos[index]];
    setPhotos(newPhotos);
    await reorderBusinessPhotos(businessId, newPhotos.map((p) => p.id));
  };

  const handleDeletePhoto = async (photo: BusinessPhoto) => {
    if (!confirm("Delete this photo?")) return;
    await deleteBusinessPhoto(businessId, photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  const handleTagChange = async (photo: BusinessPhoto, tag: PhotoTag) => {
    await updateBusinessPhoto(businessId, photo.id, { tag });
    setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, tag } : p));
  };

  const handleAddPhotoUrl = async (url: string) => {
    if (!url.trim()) return;
    const docRef = await addDoc(collection(db, "businesses", businessId, "photos"), {
      businessId,
      url: url.trim(),
      tag: "other" as PhotoTag,
      order: photos.length,
      createdAt: serverTimestamp(),
    });
    setPhotos((prev) => [...prev, { id: docRef.id, businessId, url: url.trim(), tag: "other", order: prev.length }]);
  };

  const inputClass = "w-full bg-white border border-ls-border rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:border-ls-primary placeholder:text-ls-secondary";

  if (loading) {
    return (
      <div className="p-2xl flex items-center gap-sm text-ls-secondary">
        <Loader2 size={18} className="animate-spin" /> Loading…
      </div>
    );
  }
  if (!form) return null;

  return (
    <div className="p-2xl max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-xs text-[13px] text-ls-secondary mb-md">
        <Link href="/admin" className="hover:text-ls-primary">Admin</Link>
        <ChevronRight size={14} />
        <Link href="/admin/businesses" className="hover:text-ls-primary">Businesses</Link>
        <ChevronRight size={14} />
        <span className="text-ls-primary truncate max-w-[200px]">{form.name}</span>
      </div>

      <div className="mb-2xl">
        <h1 className="text-[24px] font-bold text-ls-primary">Edit Business</h1>
        <p className="text-[14px] text-ls-secondary mt-xs">{form.name}</p>
      </div>

      {/* ── Business Details ── */}
      <div className="bg-white rounded-card border border-ls-border p-lg space-y-lg mb-2xl">
        <h2 className="text-[14px] font-semibold text-ls-primary">Business Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Business Name *</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Category *</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
              {CATEGORY_OPTIONS.map(([k, { label, icon }]) => (
                <option key={k} value={k}>{icon} {label}</option>
              ))}
            </select>
          </div>

          {/* Active */}
          <div className="flex flex-col justify-end">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Status</label>
            <div className="flex items-center gap-sm py-[10px]">
              <button
                onClick={() => set("active", !form.active)}
                className={`w-[44px] h-[24px] rounded-full transition-colors relative ${form.active ? "bg-green-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-[4px] w-[16px] h-[16px] bg-white rounded-full shadow transition-transform ${form.active ? "translate-x-[24px]" : "translate-x-[4px]"}`} />
              </button>
              <span className="text-[14px] text-ls-primary">{form.active ? "Active" : "Inactive"}</span>
            </div>
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">
              <MapPin size={11} className="inline mr-[3px]" />Address *
            </label>
            <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)} className={inputClass} />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">
              <Phone size={11} className="inline mr-[3px]" />Phone
            </label>
            <input type="text" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(714) 555-0100" className={inputClass} />
          </div>

          {/* Website */}
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">
              <Globe size={11} className="inline mr-[3px]" />Website
            </label>
            <input type="text" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com" className={inputClass} />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">
              <Star size={11} className="inline mr-[3px]" />Rating
            </label>
            <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => set("rating", e.target.value)} placeholder="4.5" className={inputClass} />
          </div>

          {/* Total Ratings */}
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Total Ratings</label>
            <input type="number" min="0" value={form.totalRatings} onChange={(e) => set("totalRatings", e.target.value)} placeholder="128" className={inputClass} />
          </div>

          {/* Price Level */}
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Price Level</label>
            <select value={form.priceLevel} onChange={(e) => set("priceLevel", e.target.value)} className={inputClass}>
              <option value="">Unknown</option>
              <option value="1">$ — Inexpensive</option>
              <option value="2">$$ — Moderate</option>
              <option value="3">$$$ — Expensive</option>
              <option value="4">$$$$ — Very Expensive</option>
            </select>
          </div>

          {/* Lat / Lng */}
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Latitude</label>
            <input type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="33.7701" className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Longitude</label>
            <input type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="-117.9680" className={inputClass} />
          </div>

          {/* Place ID */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Google Place ID</label>
            <input type="text" value={form.placeId} onChange={(e) => set("placeId", e.target.value)} placeholder="ChIJ…" className={inputClass} />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={inputClass + " resize-none"} />
          </div>

          {/* Hours */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Hours (one line per day)</label>
            <textarea value={form.hours} onChange={(e) => set("hours", e.target.value)} rows={7} placeholder={"Monday: 9:00 AM – 9:00 PM\nTuesday: 9:00 AM – 9:00 PM"} className={inputClass + " resize-none font-mono text-[13px]"} />
          </div>
        </div>

        <div className="flex items-center gap-md pt-sm border-t border-ls-border">
          <button onClick={handleSave} disabled={saving} className="ls-btn flex items-center gap-sm disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/admin/businesses" className="ls-btn-secondary text-[13px] py-sm px-lg">Cancel</Link>
          {msg && (
            <span className={`text-[13px] font-medium ${msg.err ? "text-red-500" : "text-green-600"}`}>
              {msg.err ? "⚠ " : "✓ "}{msg.text}
            </span>
          )}
        </div>
      </div>

      {/* ── Food Type Tags ── */}
      <div className="bg-white rounded-card border border-ls-border p-lg mb-2xl">
        <h2 className="text-[14px] font-semibold text-ls-primary mb-md flex items-center gap-sm">
          <Tag size={15} /> Food Type Tags
        </h2>

        {/* Selected tags */}
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-xs mb-md">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-xs bg-ls-primary text-white text-[12px] font-medium px-sm py-[3px] rounded-full"
              >
                {tag}
                <button onClick={() => toggleTag(tag)} className="hover:opacity-70">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Món Việt Guide dishes — grouped by section */}
        {dishes.length > 0 && (() => {
          const sections: { label: string; items: MonVietDish[] }[] = [
            { label: "Noodle Soups", items: dishes.filter((d) => d.rank <= 10) },
            { label: "Dry Noodles & Rice", items: dishes.filter((d) => d.rank >= 11 && d.rank <= 20) },
            { label: "Bánh & Rolls", items: dishes.filter((d) => d.rank >= 21 && d.rank <= 34) },
            { label: "Grilled & Mains", items: dishes.filter((d) => d.rank >= 35 && d.rank <= 42) },
            { label: "Sides & Sweets", items: dishes.filter((d) => d.rank >= 43) },
          ];
          return sections.map(({ label, items }) => (
            <div key={label} className="mb-md">
              <p className="text-[10px] font-bold text-ls-secondary uppercase tracking-widest mb-xs">{label}</p>
              <div className="flex flex-wrap gap-xs">
                {items.map((dish) => {
                  const selected = form.tags.includes(dish.name);
                  return (
                    <button
                      key={dish.rank}
                      onClick={() => toggleTag(dish.name)}
                      className={`text-[12px] px-sm py-[3px] rounded-full border transition-colors ${
                        selected
                          ? "bg-ls-primary text-white border-ls-primary"
                          : "border-ls-border bg-ls-surface hover:border-ls-primary hover:text-ls-primary"
                      }`}
                    >
                      {selected ? "" : "+ "}{dish.name}
                      <span className="ml-[3px] text-[10px] opacity-60">{dish.englishName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ));
        })()}

        {/* Other tag groups */}
        {OTHER_TAG_GROUPS.map(({ label, tags }) => (
          <div key={label} className="mb-md">
            <p className="text-[10px] font-bold text-ls-secondary uppercase tracking-widest mb-xs">{label}</p>
            <div className="flex flex-wrap gap-xs">
              {tags.map((tag) => {
                const selected = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-[12px] px-sm py-[3px] rounded-full border transition-colors ${
                      selected
                        ? "bg-ls-primary text-white border-ls-primary"
                        : "border-ls-border bg-ls-surface hover:border-ls-primary hover:text-ls-primary"
                    }`}
                  >
                    {selected ? "" : "+ "}{tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Custom tag input */}
        <div className="flex gap-sm">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
            placeholder="Add custom tag…"
            className="flex-1 bg-white border border-ls-border rounded-btn px-md py-[8px] text-[13px] outline-none focus:border-ls-primary"
          />
          <button onClick={addCustomTag} className="ls-btn-secondary flex items-center gap-xs text-[13px] py-sm px-md">
            <Plus size={14} /> Add
          </button>
        </div>

        <div className="pt-sm mt-sm border-t border-ls-border">
          <button onClick={handleSave} disabled={saving} className="ls-btn flex items-center gap-sm text-[13px] disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Save Tags
          </button>
        </div>
      </div>

      {/* ── Photos ── */}
      <div className="bg-white rounded-card border border-ls-border p-lg">
        <h2 className="text-[14px] font-semibold text-ls-primary mb-md flex items-center gap-sm">
          <ImageIcon size={15} /> Photos ({photos.length})
        </h2>

        {photos.length === 0 ? (
          <p className="text-[13px] text-ls-secondary mb-md">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-md mb-lg">
            {photos.map((photo, i) => (
              <div key={photo.id} className="relative group rounded-btn overflow-hidden border border-ls-border">
                <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-[130px] object-cover" />

                {/* Order badge */}
                <div className="absolute top-[6px] left-[6px] bg-black/60 text-white text-[11px] font-bold w-[22px] h-[22px] rounded-full flex items-center justify-center">
                  {i + 1}
                </div>

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-[8px]">
                  {/* Reorder arrows */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => movePhoto(i, -1)}
                      disabled={i === 0}
                      className="bg-white/80 hover:bg-white text-ls-primary rounded p-[4px] disabled:opacity-30"
                      title="Move left"
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <button
                      onClick={() => movePhoto(i, 1)}
                      disabled={i === photos.length - 1}
                      className="bg-white/80 hover:bg-white text-ls-primary rounded p-[4px] disabled:opacity-30"
                      title="Move right"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Tag + delete */}
                  <div className="flex items-center gap-xs">
                    <select
                      value={photo.tag}
                      onChange={(e) => handleTagChange(photo, e.target.value as PhotoTag)}
                      className="flex-1 text-[11px] bg-white/90 border-0 rounded px-xs py-[2px] outline-none"
                    >
                      {PHOTO_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      onClick={() => handleDeletePhoto(photo)}
                      className="bg-red-500 hover:bg-red-600 text-white rounded p-[4px]"
                      title="Delete photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add photo by URL */}
        <div>
          <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide mb-xs">Add Photo by URL</p>
          <div className="flex gap-sm">
            <input
              type="text"
              id="add-photo-url"
              placeholder="https://example.com/photo.jpg"
              className="flex-1 bg-white border border-ls-border rounded-btn px-md py-[8px] text-[13px] outline-none focus:border-ls-primary"
            />
            <button
              onClick={() => {
                const el = document.getElementById("add-photo-url") as HTMLInputElement;
                handleAddPhotoUrl(el.value);
                el.value = "";
              }}
              className="ls-btn-secondary flex items-center gap-xs text-[13px] py-sm px-md"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

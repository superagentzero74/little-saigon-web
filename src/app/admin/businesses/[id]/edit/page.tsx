"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, Loader2, CheckCircle, MapPin, Phone, Globe, Star,
  X, ArrowLeft, ArrowRight, Trash2, ImageIcon, Plus, Tag, Upload, Eye,
} from "lucide-react";
import {
  getBusinessById, updateBusiness, getBusinessPhotos,
  deleteBusinessPhoto, reorderBusinessPhotos, updateBusinessPhoto, getDishes,
  uploadBusinessPhoto, getSubcategories,
} from "@/lib/services";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { BusinessCategory, LegacyBusinessCategory, BusinessPhoto, PhotoTag, MonVietDish, SubcategoryInfo, StructuredHourSlot } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import VietInput from "@/components/ui/VietInput";
import StructuredHoursEditor from "@/components/ui/StructuredHoursEditor";
import { businessSlug } from "@/lib/utils";
import { parseStringHoursToStructured, structuredHoursToStringArray } from "@/lib/hours-utils";

const CATEGORY_OPTIONS = Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][];

const PHOTO_TAGS: PhotoTag[] = ["outside", "inside", "food", "drinks", "menu", "other"];

const OTHER_TAG_GROUPS: { label: string; tags: string[] }[] = [
  { label: "Dietary", tags: ["Vegetarian", "Vegan", "Halal", "Gluten-Free"] },
  { label: "Meal", tags: ["Breakfast", "Lunch", "Dinner", "Brunch", "Late Night"] },
  { label: "Service", tags: ["Dine-In", "Takeout", "Delivery", "Drive-Through"] },
];

interface FormState {
  name: string;
  category: LegacyBusinessCategory;
  categories: BusinessCategory[];
  subcategories: string[];
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
  structuredHours: StructuredHourSlot[];
  active: boolean;
  tags: string[];
}

export default function EditBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const initialFormRef = useRef<FormState | null>(null);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [dishes, setDishes] = useState<MonVietDish[]>([]);
  const [allSubcategories, setAllSubcategories] = useState<SubcategoryInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [customTag, setCustomTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    setUploading(true);
    for (let i = 0; i < imageFiles.length; i++) {
      setUploadProgress(`Uploading ${i + 1} of ${imageFiles.length}...`);
      try {
        const photo = await uploadBusinessPhoto(businessId, imageFiles[i], "other");
        setPhotos((prev) => [...prev, photo]);
      } catch (err: any) {
        setMsg({ text: `Failed to upload ${imageFiles[i].name}: ${err.message}`, err: true });
      }
    }
    setUploading(false);
    setUploadProgress("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [biz, pics, allDishes, subs] = await Promise.all([
      getBusinessById(businessId),
      getBusinessPhotos(businessId),
      getDishes(),
      getSubcategories(),
    ]);
    setDishes(allDishes);
    setAllSubcategories(subs);
    if (!biz) { router.push("/admin/businesses"); return; }
    const initial: FormState = {
      name: biz.name || "",
      category: biz.category || "restaurant",
      categories: biz.categories || [],
      subcategories: biz.subcategories || [],
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
      structuredHours: biz.structuredHours?.length
        ? biz.structuredHours
        : biz.hours?.length
          ? parseStringHoursToStructured(biz.hours)
          : [],
      active: biz.active ?? true,
      tags: biz.tags || [],
    };
    setForm(initial);
    initialFormRef.current = { ...initial, tags: [...initial.tags], categories: [...initial.categories], subcategories: [...initial.subcategories], structuredHours: [...initial.structuredHours] };
    setPhotos(pics);
    setLoading(false);
  }, [businessId, router]);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof FormState, value: string | boolean | string[]) =>
    setForm((p) => p ? { ...p, [key]: value } : p);

  const isDirty = form && initialFormRef.current
    ? JSON.stringify(form) !== JSON.stringify(initialFormRef.current)
    : false;

  // Warn on browser close/reload with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const toggleCategory = (cat: BusinessCategory) => {
    if (!form) return;
    if (form.categories.includes(cat)) {
      const nextCats = form.categories.filter((c) => c !== cat);
      const removedSubs = allSubcategories.filter((s) => s.parentSlug === cat).map((s) => s.slug);
      const nextSubs = form.subcategories.filter((s) => !removedSubs.includes(s));
      setForm((p) => p ? { ...p, categories: nextCats, subcategories: nextSubs } : p);
    } else if (form.categories.length < 3) {
      setForm((p) => p ? { ...p, categories: [...p.categories, cat] } : p);
    }
  };

  const toggleSubcategory = (sub: string) => {
    if (!form) return;
    const next = form.subcategories.includes(sub)
      ? form.subcategories.filter((s) => s !== sub)
      : [...form.subcategories, sub];
    set("subcategories", next);
  };

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
        categories: form.categories,
        subcategories: form.subcategories,
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
        structuredHours: form.structuredHours,
        hours: structuredHoursToStringArray(form.structuredHours),
        active: form.active,
        tags: form.tags,
      } as any);
      if (form) initialFormRef.current = { ...form, tags: [...form.tags], categories: [...form.categories], subcategories: [...form.subcategories], structuredHours: [...form.structuredHours] };
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

  const handlePhotoDrop = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(fromIdx, 1);
    newPhotos.splice(toIdx, 0, moved);
    setPhotos(newPhotos);
    await reorderBusinessPhotos(businessId, newPhotos.map((p) => p.id));
  };

  const handleDeletePhoto = async (photo: BusinessPhoto) => {
    if (!confirm("Delete this photo?")) return;
    await deleteBusinessPhoto(businessId, photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  const handleTagChange = async (photo: BusinessPhoto, tag: PhotoTag) => {
    setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, tag } : p));
    try {
      await updateBusinessPhoto(businessId, photo.id, { tag });
    } catch (err: any) {
      setMsg({ text: `Failed to save tag: ${err.message}`, err: true });
    }
  };

  const handleDescriptionChange = async (photo: BusinessPhoto, description: string) => {
    setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, description } : p));
  };

  const handleDescriptionSave = async (photo: BusinessPhoto) => {
    try {
      await updateBusinessPhoto(businessId, photo.id, { description: photo.description || "" });
    } catch (err: any) {
      setMsg({ text: `Failed to save description: ${err.message}`, err: true });
    }
  };

  const handlePhotoFoodTag = async (photo: BusinessPhoto, foodTag: string) => {
    const current = photo.foodTags || [];
    const next = current.includes(foodTag)
      ? current.filter((t) => t !== foodTag)
      : [...current, foodTag];
    setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, foodTags: next } : p));
    try {
      await updateBusinessPhoto(businessId, photo.id, { foodTags: next } as any);
    } catch (err: any) {
      setMsg({ text: `Failed to save food tag: ${err.message}`, err: true });
    }
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
        <button onClick={() => { if (isDirty && !confirm("You have unsaved changes. Discard and leave?")) return; router.push("/admin"); }} className="hover:text-ls-primary">Admin</button>
        <ChevronRight size={14} />
        <button onClick={() => { if (isDirty && !confirm("You have unsaved changes. Discard and leave?")) return; router.push("/admin/businesses"); }} className="hover:text-ls-primary">Businesses</button>
        <ChevronRight size={14} />
        <span className="text-ls-primary truncate max-w-[200px]">{form.name}</span>
      </div>

      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Edit Business</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">{form.name}</p>
        </div>
        <Link
          href={`/business/${businessSlug({ id: businessId, name: form.name } as any)}`}
          target="_blank"
          className="flex items-center gap-sm text-[13px] font-medium border border-ls-border rounded-btn px-md py-[8px] text-ls-secondary hover:text-ls-primary hover:border-ls-primary transition-colors"
        >
          <Eye size={15} /> Preview
        </Link>
      </div>

      {/* ── Photos ── */}
      <div className="bg-white rounded-card border border-ls-border p-lg mb-2xl">
        <h2 className="text-[14px] font-semibold text-ls-primary mb-md flex items-center gap-sm">
          <ImageIcon size={15} /> Photos ({photos.length})
        </h2>

        {/* Upload photos — drag & drop or file picker */}
        <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`border-2 border-dashed rounded-btn p-lg text-center transition-colors cursor-pointer mb-md ${dragging ? "border-ls-primary bg-ls-primary/5" : "border-ls-border hover:border-ls-primary/50"}`} onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFileUpload(e.target.files); e.target.value = ""; }} />
          {uploading ? (
            <div className="flex flex-col items-center gap-sm">
              <Loader2 size={24} className="animate-spin text-ls-primary" />
              <p className="text-[13px] text-ls-secondary">{uploadProgress}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-sm">
              <Upload size={24} className="text-ls-secondary" />
              <p className="text-[13px] text-ls-primary font-medium">Drag & drop images here, or click to browse</p>
              <p className="text-[11px] text-ls-secondary">Supports JPG, PNG, WebP — multiple files allowed</p>
            </div>
          )}
        </div>

        {/* Add photo by URL */}
        <div className="mb-lg">
          <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide mb-xs">Or add by URL</p>
          <div className="flex gap-sm">
            <input type="text" id="add-photo-url-top" placeholder="https://example.com/photo.jpg" className="flex-1 bg-white border border-ls-border rounded-btn px-md py-[8px] text-[13px] outline-none focus:border-ls-primary" />
            <button onClick={() => { const el = document.getElementById("add-photo-url-top") as HTMLInputElement; handleAddPhotoUrl(el.value); el.value = ""; }} className="ls-btn-secondary flex items-center gap-xs text-[13px] py-sm px-md">
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {photos.length === 0 ? (
          <p className="text-[13px] text-ls-secondary">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-md">
            {photos.map((photo, i) => (
              <div
                key={photo.id}
                draggable
                onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverIdx(i); }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={(e) => { e.preventDefault(); setDragOverIdx(null); if (dragIdx !== null) { handlePhotoDrop(dragIdx, i); setDragIdx(null); } }}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                className={`rounded-btn overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${dragOverIdx === i && dragIdx !== i ? "border-ls-primary scale-[1.02] shadow-md" : dragIdx === i ? "border-ls-border opacity-40" : "border-ls-border"}`}
              >
                <div className="relative group">
                  <img src={photo.url} alt={photo.description || `Photo ${i + 1}`} className="w-full h-[130px] object-cover pointer-events-none" />
                  <div className="absolute top-[6px] left-[6px] bg-black/60 text-white text-[11px] font-bold w-[22px] h-[22px] rounded-full flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="absolute top-[6px] right-[6px] flex gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => movePhoto(i, -1)} disabled={i === 0} className="bg-white/90 hover:bg-white text-ls-primary rounded p-[4px] disabled:opacity-30 shadow-sm" title="Move left"><ArrowLeft size={12} /></button>
                    <button onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1} className="bg-white/90 hover:bg-white text-ls-primary rounded p-[4px] disabled:opacity-30 shadow-sm" title="Move right"><ArrowRight size={12} /></button>
                  </div>
                </div>
                <div className="p-[8px] space-y-[6px] bg-white">
                  <div className="flex items-center gap-[6px]">
                    <select value={photo.tag} onChange={(e) => handleTagChange(photo, e.target.value as PhotoTag)} className="flex-1 text-[11px] bg-ls-surface border border-ls-border rounded px-[6px] py-[4px] outline-none focus:border-ls-primary">
                      {PHOTO_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => handleDeletePhoto(photo)} className="text-red-400 hover:text-red-600 p-[4px]" title="Delete photo"><Trash2 size={13} /></button>
                  </div>
                  {photo.tag === "food" && (
                    <div>
                      {(photo.foodTags || []).length > 0 && (
                        <div className="flex flex-wrap gap-[3px] mb-[4px]">
                          {(photo.foodTags || []).map((ft) => (
                            <span key={ft} className="inline-flex items-center gap-[2px] bg-ls-primary text-white text-[9px] font-medium px-[5px] py-[1px] rounded-full cursor-pointer hover:opacity-80" onClick={() => handlePhotoFoodTag(photo, ft)} title="Click to remove">
                              {ft} <X size={8} />
                            </span>
                          ))}
                        </div>
                      )}
                      <select value="" onChange={(e) => { if (e.target.value) handlePhotoFoodTag(photo, e.target.value); }} className="w-full text-[10px] bg-ls-surface border border-ls-border rounded px-[6px] py-[3px] outline-none focus:border-ls-primary text-ls-secondary">
                        <option value="">+ Add food tag...</option>
                        {dishes.map((d) => (<option key={d.rank} value={d.name} disabled={(photo.foodTags || []).includes(d.name)}>{d.name} — {d.englishName}</option>))}
                        {form && form.tags.filter((t) => !dishes.some((d) => d.name === t)).map((t) => (<option key={t} value={t} disabled={(photo.foodTags || []).includes(t)}>{t}</option>))}
                      </select>
                    </div>
                  )}
                  <input type="text" value={photo.description || ""} onChange={(e) => handleDescriptionChange(photo, e.target.value)} onBlur={() => handleDescriptionSave(photo)} placeholder="Add description..." className="w-full text-[11px] bg-ls-surface border border-ls-border rounded px-[6px] py-[4px] outline-none focus:border-ls-primary placeholder:text-ls-secondary/50" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Business Details ── */}
      <div className="bg-white rounded-card border border-ls-border p-lg space-y-lg mb-2xl">
        <h2 className="text-[14px] font-semibold text-ls-primary">Business Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Business Name *</label>
            <VietInput value={form.name} onChange={(v) => set("name", v)} className={inputClass} />
          </div>

          {/* Categories (multi-select up to 3) */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">
              Categories * <span className="font-normal text-ls-secondary/70">(select up to 3)</span>
            </label>
            <div className="flex flex-wrap gap-[6px]">
              {CATEGORY_OPTIONS.map(([k, { label, icon }]) => {
                const selected = form.categories.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleCategory(k)}
                    className={`text-[12px] px-sm py-[4px] rounded-full border transition-colors ${
                      selected
                        ? "bg-ls-primary text-white border-ls-primary"
                        : form.categories.length >= 3
                          ? "border-ls-border bg-ls-surface text-ls-secondary/50 cursor-not-allowed"
                          : "border-ls-border bg-ls-surface hover:border-ls-primary hover:text-ls-primary"
                    }`}
                    disabled={!selected && form.categories.length >= 3}
                  >
                    {icon} {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategories */}
          {form.categories.length > 0 && (
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Subcategories</label>
              {form.categories.map((cat) => {
                const subs = allSubcategories.filter((s) => s.parentSlug === cat);
                if (subs.length === 0) return null;
                const catLabel = CATEGORIES[cat]?.label || cat;
                return (
                  <div key={cat} className="mb-sm">
                    <p className="text-[10px] font-bold text-ls-secondary uppercase tracking-widest mb-[4px]">{catLabel}</p>
                    <div className="flex flex-wrap gap-[4px]">
                      {subs.map((sub) => {
                        const selected = form.subcategories.includes(sub.slug);
                        return (
                          <button
                            key={sub.slug}
                            type="button"
                            onClick={() => toggleSubcategory(sub.slug)}
                            className={`text-[11px] px-[8px] py-[3px] rounded-full border transition-colors ${
                              selected
                                ? "bg-ls-primary text-white border-ls-primary"
                                : "border-ls-border bg-ls-surface hover:border-ls-primary hover:text-ls-primary"
                            }`}
                          >
                            {selected ? "" : "+ "}{sub.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
            <VietInput value={form.description} onChange={(v) => set("description", v)} multiline rows={3} className={inputClass + " resize-none"} />
          </div>

          {/* Hours */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Hours</label>
            <StructuredHoursEditor
              value={form.structuredHours}
              onChange={(slots) => setForm((p) => p ? { ...p, structuredHours: slots } : p)}
            />
          </div>
        </div>

        <div className="flex items-center gap-md pt-sm border-t border-ls-border">
          <button onClick={handleSave} disabled={saving || !isDirty} className={`flex items-center gap-sm rounded-btn px-8 py-3.5 text-[15px] font-semibold transition-all ${isDirty ? "bg-ls-primary text-white hover:opacity-90" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={() => { if (isDirty && !confirm("You have unsaved changes. Discard and go back?")) return; router.push("/admin/businesses"); }} className="ls-btn-secondary text-[13px] py-sm px-lg">Cancel</button>
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
          <button onClick={handleSave} disabled={saving || !isDirty} className={`flex items-center gap-sm text-[13px] rounded-btn px-8 py-3.5 font-semibold transition-all ${isDirty ? "bg-ls-primary text-white hover:opacity-90" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Save Tags
          </button>
        </div>
      </div>

      {/* Floating save button */}
      {isDirty && !saving && (
        <button
          onClick={handleSave}
          className="fixed bottom-6 right-6 z-50 ls-btn flex items-center gap-sm text-[14px] shadow-lg px-lg py-md rounded-full animate-in fade-in"
        >
          <CheckCircle size={18} /> Save Changes
        </button>
      )}
      {saving && (
        <div className="fixed bottom-6 right-6 z-50 ls-btn flex items-center gap-sm text-[14px] shadow-lg px-lg py-md rounded-full opacity-70 cursor-not-allowed">
          <Loader2 size={18} className="animate-spin" /> Saving…
        </div>
      )}
    </div>
  );
}

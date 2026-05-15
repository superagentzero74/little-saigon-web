"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, Loader2, CheckCircle, MapPin, Phone, Globe, Star,
  X, ArrowLeft, ArrowRight, Trash2, ImageIcon, Plus, Tag, Upload, Eye,
  Building2, Mail,
} from "lucide-react";
import {
  getBusinessById, updateBusiness, getBusinessPhotos,
  deleteBusinessPhoto, reorderBusinessPhotos, updateBusinessPhoto, getDishes,
  uploadBusinessPhoto, getSubcategories, syncBusinessPhotos,
} from "@/lib/services";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
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
  { label: "Service", tags: ["Dine-In", "Takeout", "Delivery", "Drive-Through", "Food to Go"] },
];

interface FormState {
  name: string;
  category: LegacyBusinessCategory;
  categories: BusinessCategory[];
  subcategories: string[];
  address: string;
  phone: string;
  website: string;
  instagramUrl: string;
  facebookUrl: string;
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
  isFeatured: boolean;
  isNew: boolean;
  seedScore: number;
  tags: string[];
}

export default function EditBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [claimInfo, setClaimInfo] = useState<{
    claimed: boolean;
    ownerEmail: string | null;
    ownerName: string | null;
  } | null>(null);
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
  const [logoURL, setLogoURL] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoMsg, setLogoMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

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

  const handleLogoUpload = async (file: File) => {
    // Validate PNG or AVIF
    const allowedTypes = ["image/png", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      setLogoMsg({ text: "Only PNG or AVIF files are accepted for logos.", err: true });
      return;
    }
    // Validate file size (300KB max)
    if (file.size > 300 * 1024) {
      setLogoMsg({ text: `File is ${(file.size / 1024).toFixed(0)}KB — must be under 300KB.`, err: true });
      return;
    }
    setUploadingLogo(true);
    setLogoMsg(null);
    try {
      const ext = file.type === "image/avif" ? "avif" : "png";
      const path = `businesses/${businessId}/logo.${ext}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file, { contentType: file.type, cacheControl: "public, max-age=31536000" });
      const url = await getDownloadURL(fileRef);
      await updateBusiness(businessId, { logoURL: url } as any);
      setLogoURL(url);
      setLogoMsg({ text: "Logo saved!" });
      setTimeout(() => setLogoMsg(null), 3000);
    } catch (err: any) {
      setLogoMsg({ text: err.message || "Upload failed", err: true });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm("Remove logo?")) return;
    try {
      await updateBusiness(businessId, { logoURL: null } as any);
      setLogoURL(null);
      setLogoMsg({ text: "Logo removed." });
      setTimeout(() => setLogoMsg(null), 3000);
    } catch (err: any) {
      setLogoMsg({ text: err.message || "Failed to remove", err: true });
    }
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
      instagramUrl: (biz as any).instagramUrl || "",
      facebookUrl: (biz as any).facebookUrl || "",
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
      isFeatured: (biz as any).isFeatured ?? false,
      isNew: (biz as any).isNew ?? false,
      seedScore: (biz as any).seedScore ?? 50,
      tags: biz.tags || [],
    };
    setForm(initial);
    initialFormRef.current = { ...initial, tags: [...initial.tags], categories: [...initial.categories], subcategories: [...initial.subcategories], structuredHours: [...initial.structuredHours] };
    setPhotos(pics);
    setLogoURL(biz.logoURL || null);

    // Resolve claim status + owner contact (email + display name) for the
    // header notation. Best-effort — failures fall back to "Unclaimed".
    const claimed = (biz as any).claimed === true;
    let ownerEmail: string | null = null;
    let ownerName: string | null = null;
    const ownerId = (biz as any).ownerId as string | undefined;
    if (claimed && ownerId) {
      try {
        const ownerSnap = await getDoc(doc(db, "users", ownerId));
        if (ownerSnap.exists()) {
          const d = ownerSnap.data() as any;
          ownerEmail = d.email || null;
          ownerName = d.displayName || null;
        }
      } catch { /* fall through */ }
    }
    setClaimInfo({ claimed, ownerEmail, ownerName });

    setLoading(false);
  }, [businessId, router]);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof FormState, value: string | boolean | number | string[]) =>
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
        instagramUrl: form.instagramUrl.trim() || null,
        facebookUrl: form.facebookUrl.trim() || null,
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
        isFeatured: form.isFeatured,
        isNew: form.isNew,
        seedScore: form.seedScore,
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
    await syncBusinessPhotos(businessId);
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
    await syncBusinessPhotos(businessId);
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

      {/* Claim status notation */}
      {claimInfo && (
        <div
          className={`mb-md flex items-center gap-sm rounded-card border px-md py-sm text-[13px] ${
            claimInfo.claimed
              ? "border-green-300 bg-green-50 text-green-900"
              : "border-ls-border bg-ls-surface text-ls-secondary"
          }`}
        >
          {claimInfo.claimed ? <CheckCircle size={15} /> : <Building2 size={15} />}
          <span className="font-semibold">Claim:</span>
          {claimInfo.claimed ? (
            <span className="flex flex-wrap items-center gap-xs">
              <span className="font-semibold">Claimed</span>
              {claimInfo.ownerEmail && (
                <span className="flex items-center gap-[3px]">
                  <Mail size={12} className="opacity-70" />
                  <a
                    href={`mailto:${claimInfo.ownerEmail}`}
                    className="underline hover:no-underline"
                  >
                    {claimInfo.ownerEmail}
                  </a>
                </span>
              )}
              {claimInfo.ownerName && (
                <span className="opacity-80">({claimInfo.ownerName})</span>
              )}
              {!claimInfo.ownerEmail && !claimInfo.ownerName && (
                <span className="opacity-70">owner record not found</span>
              )}
            </span>
          ) : (
            <span>Unclaimed</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-lg">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Edit Business</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">{form.name}</p>
        </div>
        <div className="flex items-center gap-sm">
          <Link
            href={`/admin/businesses/${businessId}/menu`}
            className="flex items-center gap-sm text-[13px] font-medium border border-ls-border rounded-btn px-md py-[8px] text-ls-secondary hover:text-ls-primary hover:border-ls-primary transition-colors"
          >
            Menu
          </Link>
          <Link
            href={`/business/${businessSlug({ id: businessId, name: form.name } as any)}`}
            target="_blank"
            className="flex items-center gap-sm text-[13px] font-medium border border-ls-border rounded-btn px-md py-[8px] text-ls-secondary hover:text-ls-primary hover:border-ls-primary transition-colors"
          >
            <Eye size={15} /> Preview
          </Link>
        </div>
      </div>

      {/* ── Status Toggles ── */}
      <div className="flex items-center gap-xl mb-2xl">
        <label className="flex items-center gap-[10px] cursor-pointer" onClick={() => set("active", !form.active)}>
          <span className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide">Status</span>
          <span className={`inline-flex items-center gap-[6px] text-[13px] font-medium px-[10px] py-[4px] rounded-full ${form.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            <span className={`w-[8px] h-[8px] rounded-full ${form.active ? "bg-green-500" : "bg-gray-400"}`} />
            {form.active ? "Active" : "Inactive"}
          </span>
        </label>
        <label className="flex items-center gap-[10px] cursor-pointer" onClick={() => set("isFeatured", !form.isFeatured)}>
          <span className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide">Featured</span>
          <span className={`inline-flex items-center gap-[6px] text-[13px] font-medium px-[10px] py-[4px] rounded-full ${form.isFeatured ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
            <span className={`w-[8px] h-[8px] rounded-full ${form.isFeatured ? "bg-amber-500" : "bg-gray-400"}`} />
            {form.isFeatured ? "Featured" : "Normal"}
          </span>
        </label>
        <label className="flex items-center gap-[10px] cursor-pointer" onClick={() => set("isNew", !form.isNew)}>
          <span className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide">Hot & New</span>
          <span className={`inline-flex items-center gap-[6px] text-[13px] font-medium px-[10px] py-[4px] rounded-full ${form.isNew ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
            <span className={`w-[8px] h-[8px] rounded-full ${form.isNew ? "bg-orange-500" : "bg-gray-400"}`} />
            {form.isNew ? "Hot & New" : "Off"}
          </span>
        </label>
        <div className="flex items-center gap-[10px]">
          <span className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide">Rank</span>
          <input type="number" min={0} max={100} value={form.seedScore} onChange={(e) => set("seedScore", Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))} className="w-[60px] bg-ls-surface rounded-btn px-sm py-[4px] text-[13px] text-ls-primary text-center outline-none focus:ring-2 focus:ring-ls-primary/20" />
        </div>
      </div>

      {/* ── Section 1: Business Info ── */}
      <div className="bg-white rounded-card border border-ls-border p-lg space-y-md mb-2xl">
        <h2 className="text-[14px] font-semibold text-ls-primary">Business Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Business Name *</label>
            <VietInput value={form.name} onChange={(v) => set("name", v)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide"><MapPin size={11} className="inline mr-[3px]" />Address *</label>
            <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide"><Phone size={11} className="inline mr-[3px]" />Phone</label>
            <input type="text" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(714) 555-0100" className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide"><Globe size={11} className="inline mr-[3px]" />Website</label>
            <input type="text" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com" className={inputClass} />
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide mt-md">Instagram</label>
            <input type="text" value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} placeholder="https://instagram.com/username or @username" className={inputClass} />
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide mt-md">Facebook</label>
            <input type="text" value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} placeholder="https://facebook.com/pagename" className={inputClass} />
          </div>
          <div className="sm:col-span-2 grid grid-cols-3 gap-md">
            <div>
              <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide"><Star size={11} className="inline mr-[3px]" />Rating</label>
              <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => set("rating", e.target.value)} placeholder="4.5" className={inputClass} readOnly />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Total Ratings</label>
              <input type="number" min="0" value={form.totalRatings} onChange={(e) => set("totalRatings", e.target.value)} placeholder="128" className={inputClass} readOnly />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Price Level</label>
              <select value={form.priceLevel} onChange={(e) => set("priceLevel", e.target.value)} className={inputClass}>
                <option value="">Unknown</option>
                <option value="1">$</option>
                <option value="2">$$</option>
                <option value="3">$$$</option>
                <option value="4">$$$$</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-md pt-sm border-t border-ls-border">
          <button onClick={handleSave} disabled={saving || !isDirty} className={`flex items-center gap-sm rounded-btn px-8 py-3.5 text-[15px] font-semibold transition-all ${isDirty ? "bg-ls-primary text-white hover:opacity-90" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {msg && <span className={`text-[13px] font-medium ${msg.err ? "text-red-500" : "text-green-600"}`}>{msg.err ? "⚠ " : "✓ "}{msg.text}</span>}
        </div>
      </div>

      {/* ── Section 2: Images ── */}
      <div className="bg-white rounded-card border border-ls-border p-lg mb-2xl">
        <h2 className="text-[14px] font-semibold text-ls-primary mb-md flex items-center gap-sm">
          <ImageIcon size={15} /> Images ({photos.length})
        </h2>

        {/* Photo thumbnails — one row, expandable */}
        {photos.length > 0 && (() => {
          const visiblePhotos = showAllPhotos ? photos : photos.slice(0, 5);
          return (
            <>
              <div className="flex flex-wrap gap-[6px] mb-md">
                {visiblePhotos.map((photo, i) => (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverIdx(i); }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={(e) => { e.preventDefault(); setDragOverIdx(null); if (dragIdx !== null) { handlePhotoDrop(dragIdx, i); setDragIdx(null); } }}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                    className={`relative group w-[150px] rounded-btn overflow-hidden border-2 cursor-grab active:cursor-grabbing shrink-0 ${dragOverIdx === i && dragIdx !== i ? "border-ls-primary scale-[1.02] shadow-md" : dragIdx === i ? "border-ls-border opacity-40" : "border-ls-border"}`}
                  >
                    <img src={photo.url} alt={photo.description || `Photo ${i + 1}`} className="w-full h-[125px] object-cover" loading="lazy" />
                    <div className="absolute top-[4px] left-[4px] bg-black/60 text-white text-[10px] font-bold w-[20px] h-[20px] rounded-full flex items-center justify-center">{i + 1}</div>
                    <div className="absolute top-[4px] right-[4px] flex gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => movePhoto(i, -1)} disabled={i === 0} className="bg-white/90 rounded p-[3px] disabled:opacity-30" title="Move left"><ArrowLeft size={11} /></button>
                      <button onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1} className="bg-white/90 rounded p-[3px] disabled:opacity-30" title="Move right"><ArrowRight size={11} /></button>
                      <button onClick={() => handleDeletePhoto(photo)} className="bg-white/90 rounded p-[3px] text-red-500" title="Delete"><Trash2 size={11} /></button>
                    </div>
                    <div className="p-[6px] space-y-[4px]">
                      <select
                        value={photo.tag || "other"}
                        onChange={(e) => handleTagChange(photo, e.target.value as PhotoTag)}
                        className="w-full text-[11px] bg-ls-surface border border-ls-border/50 rounded px-[4px] py-[3px] outline-none"
                      >
                        <option value="food">food</option>
                        <option value="interior">interior</option>
                        <option value="exterior">exterior</option>
                        <option value="menu">menu</option>
                        <option value="other">other</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Add description…"
                        defaultValue={photo.description || ""}
                        onBlur={(e) => handleDescriptionChange(photo, e.target.value)}
                        className="w-full text-[11px] bg-white border border-ls-border/50 rounded px-[4px] py-[3px] outline-none placeholder:text-ls-secondary/50"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {photos.length > 5 && (
                <button onClick={() => setShowAllPhotos(!showAllPhotos)} className="text-[12px] font-semibold text-ls-primary hover:underline mb-md">
                  {showAllPhotos ? "Show less" : `Show all ${photos.length} photos`}
                </button>
              )}
            </>
          );
        })()}
        {photos.length === 0 && <p className="text-[13px] text-ls-secondary mb-md">No photos yet.</p>}

        {/* Upload */}
        <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`border-2 border-dashed rounded-btn p-md text-center transition-colors cursor-pointer mb-md ${dragging ? "border-ls-primary bg-ls-primary/5" : "border-ls-border hover:border-ls-primary/50"}`} onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFileUpload(e.target.files); e.target.value = ""; }} />
          {uploading ? (
            <div className="flex items-center justify-center gap-sm">
              <Loader2 size={16} className="animate-spin text-ls-primary" />
              <p className="text-[13px] text-ls-secondary">{uploadProgress}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-sm">
              <Upload size={16} className="text-ls-secondary" />
              <p className="text-[13px] text-ls-secondary">Drop images here or click to upload</p>
            </div>
          )}
        </div>

        {/* Add by URL */}
        <div className="flex gap-sm">
          <input type="text" id="add-photo-url-top" placeholder="Or add by URL…" className="flex-1 bg-white border border-ls-border rounded-btn px-md py-[8px] text-[13px] outline-none focus:border-ls-primary" />
          <button onClick={() => { const el = document.getElementById("add-photo-url-top") as HTMLInputElement; handleAddPhotoUrl(el.value); el.value = ""; }} className="ls-btn-secondary flex items-center gap-xs text-[13px] py-sm px-md">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* ── Logo ── */}
      <div className="bg-white rounded-card border border-ls-border p-lg mb-2xl">
        <h2 className="text-[14px] font-semibold text-ls-primary mb-md flex items-center gap-sm">
          <ImageIcon size={15} /> Business Logo
        </h2>
        <div className="flex items-start gap-lg">
          <div className="w-[100px] h-[100px] rounded-card border border-ls-border overflow-hidden bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] flex items-center justify-center shrink-0">
            {logoURL ? (
              <img src={logoURL} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <ImageIcon size={24} className="text-ls-border" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-[12px] text-ls-secondary mb-sm">Transparent PNG or AVIF, recommended 512×512px or larger. Max 300KB.</p>
            <div className="flex items-center gap-sm">
              <label className="ls-btn-secondary flex items-center gap-sm text-[13px] cursor-pointer px-md py-[8px]">
                {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploadingLogo ? "Uploading..." : logoURL ? "Replace" : "Upload Logo"}
                <input ref={logoInputRef} type="file" accept="image/png,image/avif" className="hidden" disabled={uploadingLogo} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleLogoUpload(file); e.target.value = ""; }} />
              </label>
              {logoURL && <button onClick={handleRemoveLogo} className="text-[12px] text-red-500 hover:text-red-700 font-medium">Remove</button>}
            </div>
            {logoMsg && <p className={`text-[12px] font-semibold mt-sm ${logoMsg.err ? "text-red-500" : "text-green-600"}`}>{logoMsg.text}</p>}
          </div>
        </div>
      </div>

      {/* ── Categories, Status & Location ── */}
      <div className="bg-white rounded-card border border-ls-border p-lg space-y-lg mb-2xl">
        <h2 className="text-[14px] font-semibold text-ls-primary">Categories & Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {/* Categories */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Categories * <span className="font-normal text-ls-secondary/70">(up to 3)</span></label>
            <div className="flex flex-wrap gap-[6px]">
              {CATEGORY_OPTIONS.map(([k, { label, icon }]) => {
                const selected = form.categories.includes(k);
                return (
                  <button key={k} type="button" onClick={() => toggleCategory(k)} disabled={!selected && form.categories.length >= 3}
                    className={`text-[12px] px-sm py-[4px] rounded-full border transition-colors ${selected ? "bg-ls-primary text-white border-ls-primary" : form.categories.length >= 3 ? "border-ls-border bg-ls-surface text-ls-secondary/50 cursor-not-allowed" : "border-ls-border bg-ls-surface hover:border-ls-primary hover:text-ls-primary"}`}>
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
                return (
                  <div key={cat} className="mb-sm">
                    <p className="text-[10px] font-bold text-ls-secondary uppercase tracking-widest mb-[4px]">{CATEGORIES[cat]?.label || cat}</p>
                    <div className="flex flex-wrap gap-[4px]">
                      {subs.map((sub) => {
                        const selected = form.subcategories.includes(sub.slug);
                        return (
                          <button key={sub.slug} type="button" onClick={() => toggleSubcategory(sub.slug)}
                            className={`text-[11px] px-[8px] py-[3px] rounded-full border transition-colors ${selected ? "bg-ls-primary text-white border-ls-primary" : "border-ls-border bg-ls-surface hover:border-ls-primary hover:text-ls-primary"}`}>
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
          {/* Location */}
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Latitude</label>
            <input type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="33.7701" className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Longitude</label>
            <input type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="-117.9680" className={inputClass} />
          </div>
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
            <StructuredHoursEditor value={form.structuredHours} onChange={(slots) => setForm((p) => p ? { ...p, structuredHours: slots } : p)} />
          </div>
        </div>
        <div className="flex items-center gap-md pt-sm border-t border-ls-border">
          <button onClick={handleSave} disabled={saving || !isDirty} className={`flex items-center gap-sm rounded-btn px-8 py-3.5 text-[15px] font-semibold transition-all ${isDirty ? "bg-ls-primary text-white hover:opacity-90" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={() => { if (isDirty && !confirm("You have unsaved changes. Discard and go back?")) return; router.push("/admin/businesses"); }} className="ls-btn-secondary text-[13px] py-sm px-lg">Cancel</button>
          {msg && <span className={`text-[13px] font-medium ${msg.err ? "text-red-500" : "text-green-600"}`}>{msg.err ? "⚠ " : "✓ "}{msg.text}</span>}
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

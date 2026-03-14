"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2, CheckCircle, Phone, Globe, X, ArrowLeft, ArrowRight, Trash2, Plus, Tag, Camera,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getBusinessById, updateBusiness, getBusinessPhotos,
  deleteBusinessPhoto, reorderBusinessPhotos, updateBusinessPhoto, uploadBusinessPhoto, getDishes,
} from "@/lib/services";
import type { BusinessPhoto, PhotoTag, MonVietDish, StructuredHourSlot } from "@/lib/types";
import StructuredHoursEditor from "@/components/ui/StructuredHoursEditor";
import { parseStringHoursToStructured, structuredHoursToStringArray } from "@/lib/hours-utils";

const PHOTO_TAGS: PhotoTag[] = ["outside", "inside", "food", "drinks", "menu", "other"];

const OTHER_TAG_GROUPS: { label: string; tags: string[] }[] = [
  { label: "Dietary", tags: ["Vegetarian", "Vegan", "Halal", "Gluten-Free"] },
  { label: "Meal", tags: ["Breakfast", "Lunch", "Dinner", "Brunch", "Late Night"] },
  { label: "Service", tags: ["Dine-In", "Takeout", "Delivery", "Drive-Through"] },
];

interface FormState {
  phone: string;
  website: string;
  description: string;
  hours: string;
  structuredHours: StructuredHourSlot[];
  tags: string[];
}

export default function OwnerEditBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [dishes, setDishes] = useState<MonVietDish[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [customTag, setCustomTag] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [biz, pics, allDishes] = await Promise.all([
      getBusinessById(businessId),
      getBusinessPhotos(businessId),
      getDishes(),
    ]);
    setDishes(allDishes);

    if (!biz) { router.push("/"); return; }
    setBusinessName(biz.name);
    setForm({
      phone: biz.phone || "",
      website: biz.website || "",
      description: biz.description || "",
      hours: biz.hours?.join("\n") || "",
      structuredHours: biz.structuredHours?.length
        ? biz.structuredHours
        : biz.hours?.length
          ? parseStringHoursToStructured(biz.hours)
          : [],
      tags: biz.tags || [],
    });
    setPhotos(pics);
    setLoading(false);
  }, [businessId, router]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) { router.push("/login"); return; }
      // Check ownership
      if (user.role !== "admin" && !(user.ownedBusinessIds?.includes(businessId))) {
        router.push("/");
        return;
      }
      load();
    }
  }, [authLoading, user, businessId, load, router]);

  const set = (field: keyof FormState, value: any) =>
    setForm((f) => f ? { ...f, [field]: value } : f);

  const toggleTag = (tag: string) => {
    if (!form) return;
    const has = form.tags.includes(tag);
    set("tags", has ? form.tags.filter((t) => t !== tag) : [...form.tags, tag]);
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && form && !form.tags.includes(t)) {
      set("tags", [...form.tags, t]);
    }
    setCustomTag("");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const newPhoto = await uploadBusinessPhoto(businessId, file, "other");
      setPhotos((prev) => [...prev, newPhoto]);
    } catch (err: any) {
      setMsg({ text: err.message || "Upload failed", err: true });
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Delete this photo?")) return;
    await deleteBusinessPhoto(businessId, photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleMovePhoto = async (index: number, dir: -1 | 1) => {
    const next = [...photos];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setPhotos(next);
    await reorderBusinessPhotos(businessId, next.map((p) => p.id));
  };

  const handleTagChange = async (photoId: string, tag: PhotoTag) => {
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, tag } : p));
    await updateBusinessPhoto(businessId, photoId, { tag });
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateBusiness(businessId, {
        phone: form.phone || undefined,
        website: form.website || undefined,
        description: form.description || undefined,
        structuredHours: form.structuredHours,
        hours: structuredHoursToStringArray(form.structuredHours),
        tags: form.tags,
      });
      setMsg({ text: "Saved successfully!" });
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg({ text: err.message || "Save failed.", err: true });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="ls-container py-3xl flex items-center justify-center text-ls-secondary">
        <Loader2 size={24} className="animate-spin mr-sm" /> Loading...
      </div>
    );
  }
  if (!form) return null;

  // Build dish tag groups
  const dishTagGroups = [
    { label: "Noodle Soups", tags: dishes.filter((d) => d.section === "noodle_soups").map((d) => d.name) },
    { label: "Dry Noodles & Rice", tags: dishes.filter((d) => d.section === "dry_noodles" || d.section === "rice").map((d) => d.name) },
    { label: "Bánh & Rolls", tags: dishes.filter((d) => d.section === "banh" || d.section === "rolls").map((d) => d.name) },
    { label: "Grilled & Mains", tags: dishes.filter((d) => d.section === "grilled").map((d) => d.name) },
    { label: "Sides & Sweets", tags: dishes.filter((d) => d.section === "sides" || d.section === "sweets").map((d) => d.name) },
  ].filter((g) => g.tags.length > 0);

  return (
    <div className="ls-container py-2xl max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-sm mb-xs text-[13px]">
        <Link href={`/business/${businessId}`} className="text-ls-secondary hover:text-ls-primary">
          {businessName}
        </Link>
        <span className="text-ls-secondary">/</span>
        <span className="text-ls-body">Edit Listing</span>
      </div>
      <h1 className="text-page-title text-ls-primary mb-2xl">Edit Your Listing</h1>

      {msg && (
        <div className={`mb-lg p-md rounded-btn text-[13px] font-semibold flex items-center gap-sm ${msg.err ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {!msg.err && <CheckCircle size={14} />}
          {msg.text}
        </div>
      )}

      <div className="space-y-2xl">
        {/* Contact */}
        <section>
          <h2 className="text-[14px] font-semibold text-ls-primary mb-md">Contact Information</h2>
          <div className="space-y-md">
            <div>
              <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Phone</label>
              <div className="relative">
                <Phone size={14} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(714) 555-0000"
                  className="w-full pl-[36px] pr-md py-sm border border-ls-border rounded-btn text-[13px] focus:outline-none focus:border-ls-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Website</label>
              <div className="relative">
                <Globe size={14} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full pl-[36px] pr-md py-sm border border-ls-border rounded-btn text-[13px] focus:outline-none focus:border-ls-primary"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Description */}
        <section>
          <h2 className="text-[14px] font-semibold text-ls-primary mb-md">Description</h2>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Tell customers about your business..."
            className="w-full border border-ls-border rounded-btn p-md text-[13px] focus:outline-none focus:border-ls-primary resize-none"
          />
          <p className="text-[11px] text-ls-secondary mt-xs">{form.description.length}/500</p>
        </section>

        {/* Hours */}
        <section>
          <h2 className="text-[14px] font-semibold text-ls-primary mb-md">Hours</h2>
          <StructuredHoursEditor
            value={form.structuredHours}
            onChange={(slots) => setForm((f) => f ? { ...f, structuredHours: slots } : f)}
          />
        </section>

        {/* Tags */}
        <section>
          <h2 className="text-[14px] font-semibold text-ls-primary mb-md flex items-center gap-sm">
            <Tag size={14} /> Food Type Tags
          </h2>

          {dishTagGroups.map((group) => (
            <div key={group.label} className="mb-md">
              <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wider mb-sm">{group.label}</p>
              <div className="flex flex-wrap gap-xs">
                {group.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-[12px] px-md py-xs rounded-badge border transition-colors ${
                      form.tags.includes(tag)
                        ? "bg-ls-primary text-white border-ls-primary"
                        : "border-ls-border text-ls-body hover:border-ls-primary hover:text-ls-primary"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {OTHER_TAG_GROUPS.map((group) => (
            <div key={group.label} className="mb-md">
              <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wider mb-sm">{group.label}</p>
              <div className="flex flex-wrap gap-xs">
                {group.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-[12px] px-md py-xs rounded-badge border transition-colors ${
                      form.tags.includes(tag)
                        ? "bg-ls-primary text-white border-ls-primary"
                        : "border-ls-border text-ls-body hover:border-ls-primary hover:text-ls-primary"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Custom tag */}
          <div className="flex gap-sm mt-sm">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
              placeholder="Add custom tag..."
              className="flex-1 border border-ls-border rounded-btn px-md py-xs text-[12px] focus:outline-none focus:border-ls-primary"
            />
            <button
              type="button"
              onClick={addCustomTag}
              className="ls-btn text-[12px] py-xs px-md flex items-center gap-xs"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          {/* Current tags */}
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-xs mt-md">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-xs text-[12px] bg-ls-primary/10 text-ls-primary rounded-badge px-md py-xs"
                >
                  {tag}
                  <button type="button" onClick={() => toggleTag(tag)}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Photos */}
        <section>
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-[14px] font-semibold text-ls-primary">Photos</h2>
            <label className="ls-btn text-[12px] py-xs px-md flex items-center gap-xs cursor-pointer">
              {uploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              {uploadingPhoto ? "Uploading..." : "Add Photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={handlePhotoUpload}
              />
            </label>
          </div>

          {photos.length === 0 ? (
            <div className="border-2 border-dashed border-ls-border rounded-card py-lg text-center text-[13px] text-ls-secondary">
              No photos yet. Add photos to show customers your business.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-md">
              {photos.map((photo, i) => (
                <div key={photo.id} className="border border-ls-border rounded-btn overflow-hidden bg-ls-surface">
                  <div className="relative aspect-[4/3] bg-ls-surface">
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-xs left-xs bg-black/60 text-white text-[10px] font-bold w-[20px] h-[20px] rounded-full flex items-center justify-center">
                      {i + 1}
                    </div>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-xs right-xs bg-red-500 text-white rounded-full w-[20px] h-[20px] flex items-center justify-center hover:bg-red-600"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                  <div className="p-xs flex items-center gap-xs">
                    <button
                      onClick={() => handleMovePhoto(i, -1)}
                      disabled={i === 0}
                      className="p-[2px] text-ls-secondary hover:text-ls-primary disabled:opacity-30"
                    >
                      <ArrowLeft size={12} />
                    </button>
                    <select
                      value={photo.tag}
                      onChange={(e) => handleTagChange(photo.id, e.target.value as PhotoTag)}
                      className="flex-1 text-[10px] border border-ls-border rounded px-xs py-[2px] focus:outline-none"
                    >
                      {PHOTO_TAGS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleMovePhoto(i, 1)}
                      disabled={i === photos.length - 1}
                      className="p-[2px] text-ls-secondary hover:text-ls-primary disabled:opacity-30"
                    >
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Save */}
        <div className="flex items-center gap-md pb-2xl">
          <button
            onClick={handleSave}
            disabled={saving}
            className="ls-btn flex items-center gap-sm disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href={`/business/${businessId}`}
            className="text-[13px] text-ls-secondary hover:text-ls-primary"
          >
            Back to listing
          </Link>
        </div>
      </div>
    </div>
  );
}

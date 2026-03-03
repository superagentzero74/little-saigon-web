"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Loader2, CheckCircle, MapPin, Phone, Globe, Star, ChevronDown, ChevronRight } from "lucide-react";
import { createBusiness, findDuplicateBusiness } from "@/lib/services";
import type { BusinessCategory } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

const CATEGORY_OPTIONS = Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][];

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
}

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
}

const BLANK: FormState = {
  name: "", category: "restaurant", address: "", phone: "", website: "",
  description: "", rating: "", totalRatings: "", priceLevel: "",
  latitude: "", longitude: "", placeId: "", hours: "", active: true,
};

function inferCategory(types: string[]): BusinessCategory {
  if (types.some((t) => ["restaurant", "food", "meal_takeaway", "meal_delivery"].includes(t))) return "restaurant";
  if (types.some((t) => ["bakery"].includes(t))) return "bakery";
  if (types.some((t) => ["cafe", "coffee_shop"].includes(t))) return "cafe";
  if (types.some((t) => ["grocery_or_supermarket", "supermarket"].includes(t))) return "grocery";
  if (types.some((t) => ["beauty_salon", "hair_care", "nail_salon", "spa"].includes(t))) return "beauty";
  if (types.some((t) => ["clothing_store", "shopping_mall", "store"].includes(t))) return "shopping";
  return "business";
}

export default function AddBusinessPage() {
  const router = useRouter();
  const [googleQuery, setGoogleQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean; dupId?: string } | null>(null);

  const handleGoogleSearch = async () => {
    if (!googleQuery.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`/api/places/search?query=${encodeURIComponent(googleQuery)}`);
      const data = await res.json();
      setResults((data.results || []).slice(0, 8));
    } catch {
      setMsg({ text: "Google search failed", err: true });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPlace = async (place: PlaceResult) => {
    setLoadingDetails(place.place_id);
    try {
      const res = await fetch(`/api/places/details?placeId=${place.place_id}`);
      const data = await res.json();
      const r = data.result;
      if (!r) throw new Error("No result");

      const types: string[] = r.types || [];
      const weekdayText: string[] = r.opening_hours?.weekday_text || [];

      setForm({
        name: r.name || "",
        category: inferCategory(types),
        address: r.formatted_address || "",
        phone: r.formatted_phone_number || "",
        website: r.website || "",
        description: "",
        rating: r.rating != null ? String(r.rating) : "",
        totalRatings: r.user_ratings_total != null ? String(r.user_ratings_total) : "",
        priceLevel: r.price_level != null ? String(r.price_level) : "",
        latitude: r.geometry?.location?.lat != null ? String(r.geometry.location.lat) : "",
        longitude: r.geometry?.location?.lng != null ? String(r.geometry.location.lng) : "",
        placeId: r.place_id || "",
        hours: weekdayText.join("\n"),
        active: true,
      });
      setResults([]);
      setGoogleQuery("");
      setMsg({ text: `Loaded "${r.name}" from Google Places` });
      setTimeout(() => setMsg(null), 3000);
    } catch {
      setMsg({ text: "Failed to load place details", err: true });
    } finally {
      setLoadingDetails(null);
    }
  };

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setMsg({ text: "Name is required", err: true }); return; }
    if (!form.address.trim()) { setMsg({ text: "Address is required", err: true }); return; }
    setSaving(true);
    try {
      const dup = await findDuplicateBusiness(form.placeId || null, form.name, form.address);
      if (dup) {
        setMsg({ text: `"${dup.name}" already exists in the directory.`, err: true, dupId: dup.id });
        setSaving(false);
        return;
      }
      const id = await createBusiness({
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
        photos: [],
        active: form.active,
      } as any);
      router.push("/admin/businesses");
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to save", err: true });
      setSaving(false);
    }
  };

  const inputClass = "w-full bg-white border border-ls-border rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:border-ls-primary placeholder:text-ls-secondary";

  return (
    <div className="p-2xl max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-xs text-[13px] text-ls-secondary mb-md">
        <Link href="/admin" className="hover:text-ls-primary">Admin</Link>
        <ChevronRight size={14} />
        <Link href="/admin/businesses" className="hover:text-ls-primary">Businesses</Link>
        <ChevronRight size={14} />
        <span className="text-ls-primary">Add Business</span>
      </div>

      <div className="mb-2xl">
        <h1 className="text-[24px] font-bold text-ls-primary">Add Business</h1>
        <p className="text-[14px] text-ls-secondary mt-xs">
          Search Google Places to auto-fill, or enter details manually.
        </p>
      </div>

      {/* Google Search */}
      <div className="bg-white rounded-card border border-ls-border p-lg mb-2xl">
        <h2 className="text-[14px] font-semibold text-ls-primary mb-md flex items-center gap-sm">
          <Search size={16} /> Search Google Places
        </h2>
        <div className="flex gap-sm">
          <input
            type="text"
            value={googleQuery}
            onChange={(e) => setGoogleQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGoogleSearch()}
            placeholder="e.g. Phở 79 Garden Grove CA"
            className={inputClass + " flex-1"}
          />
          <button
            onClick={handleGoogleSearch}
            disabled={searching || !googleQuery.trim()}
            className="ls-btn flex items-center gap-sm shrink-0 disabled:opacity-50"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <div className="mt-md border border-ls-border rounded-card overflow-hidden divide-y divide-ls-border">
            {results.map((place) => (
              <button
                key={place.place_id}
                onClick={() => handleSelectPlace(place)}
                disabled={loadingDetails !== null}
                className="w-full text-left px-md py-md hover:bg-ls-surface transition-colors flex items-center justify-between gap-md"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ls-primary truncate">{place.name}</p>
                  <p className="text-[12px] text-ls-secondary truncate">{place.formatted_address}</p>
                  {place.rating && (
                    <p className="text-[11px] text-amber-500 mt-[2px]">★ {place.rating} ({place.user_ratings_total?.toLocaleString()} ratings)</p>
                  )}
                </div>
                <div className="shrink-0">
                  {loadingDetails === place.place_id ? (
                    <Loader2 size={16} className="text-ls-primary animate-spin" />
                  ) : (
                    <span className="text-[12px] font-semibold text-ls-primary border border-ls-primary rounded px-sm py-[3px] hover:bg-ls-primary hover:text-white transition-colors">
                      Use this
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {msg && (
          <p className={`text-[13px] mt-md font-medium ${msg.err ? "text-red-500" : "text-green-600"}`}>
            {msg.err ? "⚠ " : "✓ "}{msg.text}
          </p>
        )}
      </div>

      {/* Manual Form */}
      <div className="bg-white rounded-card border border-ls-border p-lg space-y-lg">
        <h2 className="text-[14px] font-semibold text-ls-primary">Business Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Business Name *</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Phở 79" className={inputClass} />
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

          {/* Active toggle */}
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
            <input type="text" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Bolsa Ave, Westminster, CA 92683" className={inputClass} />
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
            <input type="text" value={form.placeId} onChange={(e) => set("placeId", e.target.value)} placeholder="ChIJ..." className={inputClass} />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Brief description of the business…" rows={3} className={inputClass + " resize-none"} />
          </div>

          {/* Hours */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">Hours (one line per day)</label>
            <textarea value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder={"Monday: 9:00 AM – 9:00 PM\nTuesday: 9:00 AM – 9:00 PM"} rows={4} className={inputClass + " resize-none font-mono text-[13px]"} />
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-md pt-sm border-t border-ls-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="ls-btn flex items-center gap-sm disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {saving ? "Saving…" : "Add Business"}
          </button>
          <Link href="/admin/businesses" className="ls-btn-secondary text-[13px] py-sm px-lg">
            Cancel
          </Link>
          {msg && !msg.err && (
            <span className="text-[13px] text-green-600 font-medium">✓ {msg.text}</span>
          )}
          {msg?.err && (
            <span className="text-[13px] text-red-500 font-medium">
              ⚠ {msg.text}
              {msg.dupId && (
                <Link href="/admin/businesses" className="ml-sm underline hover:no-underline">
                  View existing listing →
                </Link>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

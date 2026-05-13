"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, CheckCircle, MapPin, ChevronRight, Search, Loader2, Star, X } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getExistingPlaceIds } from "@/lib/services";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES: { id: string; label: string }[] = [
  { id: "restaurant", label: "Restaurant" },
  { id: "coffee_tea", label: "Coffee & Tea" },
  { id: "bakery_dessert", label: "Bakery & Dessert" },
  { id: "grocery", label: "Grocery & Market" },
  { id: "beauty", label: "Beauty & Wellness" },
  { id: "shopping", label: "Shopping & Retail" },
  { id: "services", label: "Services" },
  { id: "health", label: "Health & Medical" },
  { id: "entertainment", label: "Events & Entertainment" },
  { id: "community", label: "Community & Education" },
];

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
}

function inferCategory(types: string[] = []): string {
  if (types.some((t) => ["restaurant", "food", "meal_takeaway", "meal_delivery"].includes(t))) return "restaurant";
  if (types.includes("bakery")) return "bakery_dessert";
  if (types.some((t) => ["cafe", "coffee_shop"].includes(t))) return "coffee_tea";
  if (types.some((t) => ["grocery_or_supermarket", "supermarket"].includes(t))) return "grocery";
  if (types.some((t) => ["beauty_salon", "hair_care", "nail_salon", "spa"].includes(t))) return "beauty";
  if (types.some((t) => ["clothing_store", "shopping_mall", "store"].includes(t))) return "shopping";
  if (types.some((t) => ["doctor", "dentist", "pharmacy", "hospital"].includes(t))) return "health";
  if (types.some((t) => ["night_club", "bar", "movie_theater"].includes(t))) return "entertainment";
  if (types.some((t) => ["church", "school", "hindu_temple"].includes(t))) return "community";
  return "services";
}

export default function SuggestBusinessPage() {
  const { user } = useAuth();

  // Google search
  const [googleQuery, setGoogleQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingPlaceId, setLoadingPlaceId] = useState<string | null>(null);
  // placeId → existing business doc id, for "already in directory" badge.
  const [existingByPlaceId, setExistingByPlaceId] = useState<Record<string, string>>({});

  // Form
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("restaurant");
  const [notes, setNotes] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = businessName.trim().length > 0;
  const hasPickedFromGoogle = placeId !== null;

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!googleQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    setExistingByPlaceId({});
    try {
      const res = await fetch(`/api/places/search?query=${encodeURIComponent(googleQuery)}`);
      const data = await res.json();
      const places = ((data.results as PlaceResult[]) || []).slice(0, 10);
      setResults(places);
      const ids = places.map((p) => p.place_id).filter(Boolean);
      if (ids.length > 0) {
        try {
          const existing = await getExistingPlaceIds(ids);
          setExistingByPlaceId(existing);
        } catch {
          // Non-fatal: just skip the dedupe badge if the read fails.
        }
      }
    } catch {
      setSearchError("Search failed. You can still enter the business manually below.");
    } finally {
      setSearching(false);
    }
  }

  async function pickPlace(place: PlaceResult) {
    setLoadingPlaceId(place.place_id);
    try {
      const res = await fetch(`/api/places/details?placeId=${place.place_id}`);
      const data = await res.json();
      const r = data.result;
      if (!r) throw new Error("No result");
      setBusinessName(r.name || place.name || "");
      setAddress(r.formatted_address || place.formatted_address || "");
      setCategory(inferCategory(r.types || []));
      setPlaceId(r.place_id || place.place_id);
      setLatitude(r.geometry?.location?.lat ?? null);
      setLongitude(r.geometry?.location?.lng ?? null);
      setWebsite(r.website || "");
      setPhone(r.formatted_phone_number || "");
      setResults([]);
      setGoogleQuery("");
      // Scroll to form so the user sees the prefilled fields.
      setTimeout(() => {
        document.getElementById("suggest-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch {
      setSearchError("Couldn't load that place. Try entering details manually below.");
    } finally {
      setLoadingPlaceId(null);
    }
  }

  function clearGooglePick() {
    setPlaceId(null);
    setLatitude(null);
    setLongitude(null);
    setWebsite("");
    setPhone("");
    setBusinessName("");
    setAddress("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    const resolvedEmail =
      (user?.email && user.email.length > 0 ? user.email : guestEmail.trim());
    try {
      await addDoc(collection(db, "businessSuggestions"), {
        businessName: businessName.trim(),
        address: address.trim(),
        category,
        notes: notes.trim(),
        userId: user?.id ?? "anonymous",
        userName: user?.displayName ?? "",
        userEmail: resolvedEmail,
        status: "new",
        source: hasPickedFromGoogle ? "web-google" : "web-manual",
        placeId: placeId ?? null,
        latitude: latitude,
        longitude: longitude,
        website: website || null,
        phone: phone || null,
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ls-container py-2xl max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-xs text-meta text-ls-secondary mb-md">
        <Link href="/" className="hover:text-ls-primary">Home</Link>
        <ChevronRight size={14} />
        <span className="text-ls-primary">Suggest a Business</span>
      </div>

      {done ? (
        <div className="bg-white border border-ls-border rounded-card p-2xl text-center">
          <CheckCircle size={48} className="text-green-600 mx-auto mb-md" />
          <h1 className="text-[22px] font-bold text-ls-primary">Thanks for the tip!</h1>
          <p className="text-[14px] text-ls-secondary mt-sm max-w-md mx-auto">
            We&rsquo;ll look into adding this business to Little Saigon Go.
          </p>
          <div className="flex items-center justify-center gap-md mt-lg">
            <Link href="/" className="ls-btn-secondary">Back to Home</Link>
            <button
              onClick={() => {
                setDone(false);
                clearGooglePick();
                setNotes("");
                setCategory("restaurant");
              }}
              className="ls-btn"
            >
              Suggest Another
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-md mb-lg">
            <div className="w-[44px] h-[44px] rounded-full bg-ls-primary/10 flex items-center justify-center">
              <MapPin size={22} className="text-ls-primary" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-ls-primary">Suggest a Business</h1>
              <p className="text-[13px] text-ls-secondary mt-[2px]">
                Search for it below — if it&rsquo;s not on Google, enter the details manually.
              </p>
            </div>
          </div>

          {/* Google search */}
          <div className="bg-white border border-ls-border rounded-card p-lg mb-lg">
            <form onSubmit={runSearch} className="flex gap-sm">
              <input
                type="text"
                value={googleQuery}
                onChange={(e) => setGoogleQuery(e.target.value)}
                placeholder="Search by name, e.g. Phở 79 Garden Grove"
                className={inputClass + " flex-1"}
              />
              <button
                type="submit"
                disabled={searching || !googleQuery.trim()}
                className="ls-btn flex items-center gap-sm shrink-0 disabled:opacity-50"
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Search
              </button>
            </form>

            {searchError && (
              <p className="text-[13px] text-amber-700 mt-md">{searchError}</p>
            )}

            {results.length > 0 && (
              <div className="mt-md border border-ls-border rounded-card overflow-hidden divide-y divide-ls-border">
                {results.map((p) => {
                  const existingId = existingByPlaceId[p.place_id];
                  return (
                    <div
                      key={p.place_id}
                      className={`w-full px-md py-md flex items-center justify-between gap-md ${existingId ? "bg-amber-50" : "hover:bg-ls-surface"} transition-colors`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-sm flex-wrap">
                          <p className="text-[14px] font-semibold text-ls-primary truncate">{p.name}</p>
                          {existingId && (
                            <span className="shrink-0 text-[10px] font-semibold bg-amber-100 text-amber-800 px-[6px] py-[1px] rounded-full uppercase tracking-wide">
                              Already in directory
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-ls-secondary truncate">{p.formatted_address}</p>
                        {p.rating && (
                          <p className="text-[11px] text-amber-600 mt-[2px] flex items-center gap-[3px]">
                            <Star size={11} className="fill-amber-500 text-amber-500" /> {p.rating}
                            {p.user_ratings_total && ` (${p.user_ratings_total.toLocaleString()})`}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {existingId ? (
                          <Link
                            href={`/business/${existingId}`}
                            className="text-[12px] font-semibold text-amber-700 border border-amber-300 rounded px-sm py-[3px] hover:bg-amber-100 transition-colors whitespace-nowrap"
                          >
                            View listing →
                          </Link>
                        ) : (
                          <button
                            onClick={() => pickPlace(p)}
                            disabled={loadingPlaceId !== null}
                            className="text-[12px] font-semibold text-ls-primary border border-ls-primary rounded px-sm py-[3px] hover:bg-ls-primary hover:text-white transition-colors disabled:opacity-60 whitespace-nowrap"
                          >
                            {loadingPlaceId === p.place_id ? "Loading…" : "Suggest this"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!searching && results.length === 0 && googleQuery.trim().length > 0 && !searchError && (
              <p className="text-[12px] text-ls-secondary mt-sm">Tap Search, or scroll down to enter details manually.</p>
            )}
          </div>

          {hasPickedFromGoogle && (
            <div className="flex items-center gap-sm bg-green-50 border border-green-200 text-green-900 rounded-card p-md mb-lg">
              <CheckCircle size={16} className="shrink-0" />
              <div className="text-[13px] flex-1">
                Pre-filled from Google. Add notes below and submit.
              </div>
              <button
                onClick={clearGooglePick}
                className="text-green-900 hover:text-green-700"
                title="Clear and enter manually"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form
            id="suggest-form"
            onSubmit={submit}
            className="bg-white border border-ls-border rounded-card p-lg space-y-lg scroll-mt-2xl"
          >
            <Field label="Business Name *">
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Phở Hòa"
                className={inputClass}
              />
            </Field>

            <Field label="Address or Cross Streets">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Bolsa Ave & Magnolia"
                className={inputClass}
              />
            </Field>

            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Additional Info (optional)" hint="e.g. best bánh mì in town, been open for years">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass + " resize-none"}
              />
            </Field>

            {!user && (
              <Field label="Email (optional, so we can reply)">
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </Field>
            )}

            {error && (
              <p className="text-[13px] text-red-600">{error}</p>
            )}

            <div className="flex items-center gap-md pt-sm border-t border-ls-border">
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="ls-btn flex items-center gap-sm disabled:opacity-50"
              >
                <Send size={14} />
                {submitting ? "Submitting…" : "Submit Suggestion"}
              </button>
              <Link href="/" className="text-[13px] text-ls-secondary hover:text-ls-primary">
                Cancel
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

const inputClass =
  "w-full bg-white border border-ls-border rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:border-ls-primary placeholder:text-ls-secondary";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-ls-secondary mb-xs uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-ls-secondary mt-xs">{hint}</p>}
    </div>
  );
}

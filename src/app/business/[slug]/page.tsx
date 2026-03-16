"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  getBusinessById, getBusinessPhotos, getReviewsForBusiness,
  checkIn, submitReview, toggleFavorite,
} from "@/lib/services";
import type { Business, BusinessPhoto, Review, PhotoTag } from "@/lib/types";
import { isCurrentlyOpen } from "@/lib/utils";
import {
  MapPin, Phone, Globe, Clock, Star, ChevronLeft, Heart,
  Navigation, Camera, MessageSquare, CheckCircle, X,
  UtensilsCrossed, BookOpen, TreePine, Home, GlassWater, LayoutGrid,
} from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatHours(hours?: string[]): { day: string; time: string }[] {
  if (!hours || hours.length === 0) return [];
  return hours.map((h) => {
    const parts = h.split(": ");
    return { day: parts[0] || "", time: parts.slice(1).join(": ") || h };
  });
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-[1px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}
        />
      ))}
    </div>
  );
}

function ExpandableText({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <div>
      <p
        ref={ref}
        className={`${className || ""} ${expanded ? "" : "line-clamp-3"}`}
      >
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[12px] font-medium text-ls-primary hover:underline mt-[2px]"
        >
          {expanded ? "show less" : "read more"}
        </button>
      )}
    </div>
  );
}

function InteractiveStarRating({ rating, onChange }: { rating: number; onChange: (r: number) => void }) {
  return (
    <div className="flex items-center gap-xs">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} onClick={() => onChange(i)} type="button">
          <Star
            size={28}
            className={i <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
          />
        </button>
      ))}
    </div>
  );
}

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, refreshProfile } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoTagFilter, setPhotoTagFilter] = useState<PhotoTag | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [showHours, setShowHours] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [googleReviews, setGoogleReviews] = useState<any[]>([]);

  // Check-in
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState("");

  // Review
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");

  const loadData = useCallback(async () => {
    try {
      const businessId = slug.includes("--") ? slug.split("--").slice(1).join("--") : slug.slice(-8);
      const biz = await getBusinessById(businessId);
      if (!biz) { setLoading(false); return; }
      setBusiness(biz);

      const [p, r] = await Promise.all([
        getBusinessPhotos(biz.id).catch((e) => { console.error("Photos fetch error:", e); return []; }),
        getReviewsForBusiness(biz.id).catch((e) => { console.error("Reviews fetch error:", e); return []; }),
      ]);
      setPhotos(p);
      setReviews(r);

      // Fetch Google reviews if business has a placeId
      if (biz.placeId) {
        fetch(`/api/places/reviews?placeId=${biz.placeId}`)
          .then((res) => res.json())
          .then((data) => setGoogleReviews(data.reviews || []))
          .catch(() => {});
      }
    } catch (err) {
      console.error("Failed to load business:", err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (user && business) {
      setIsFavorite(user.favorites?.includes(business.id) || false);
    }
  }, [user, business]);

  // Reset gallery scroll when tag filter changes
  useEffect(() => {
    galleryRef.current?.scrollTo({ left: 0 });
  }, [photoTagFilter]);

  // Build tagged photo list: subcollection photos have tags, business.photos are untagged
  const taggedPhotos: { url: string; tag: PhotoTag | null }[] = [
    ...(business?.photos || []).map((url) => ({ url, tag: null as PhotoTag | null })),
    ...photos.map((p) => ({ url: p.url, tag: p.tag })),
  ].filter((p) => Boolean(p.url));

  // Available tags from subcollection photos
  const availableTags = Array.from(new Set(photos.map((p) => p.tag).filter(Boolean))) as PhotoTag[];

  // Filtered photos based on selected tag
  const filteredPhotos = photoTagFilter
    ? taggedPhotos.filter((p) => p.tag === photoTagFilter)
    : taggedPhotos;
  const allPhotoUrls = filteredPhotos.map((p) => p.url);

  const handleCheckIn = async () => {
    if (!user) { router.push("/login"); return; }
    if (!business) return;
    setCheckingIn(true);
    setCheckInMsg("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      await checkIn(business.id, pos.coords.latitude, pos.coords.longitude);
      await refreshProfile();
      setCheckInMsg("Checked in! +10 Đồng");
      setTimeout(() => setCheckInMsg(""), 3000);
    } catch (err: any) {
      setCheckInMsg(err.message || "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) { router.push("/login"); return; }
    if (!business) return;
    const saved = await toggleFavorite(user.id, business.id);
    setIsFavorite(saved);
    await refreshProfile();
  };

  const handleSubmitReview = async () => {
    if (!user) { router.push("/login"); return; }
    if (!business || !reviewText.trim()) return;
    setSubmittingReview(true);
    setReviewMsg("");
    try {
      await submitReview(business.id, reviewRating, reviewText.trim());
      await refreshProfile();
      setShowReviewForm(false);
      setReviewText("");
      setReviewRating(5);
      setReviewMsg("Review submitted! +25 Đồng");
      const r = await getReviewsForBusiness(business.id);
      setReviews(r);
      setTimeout(() => setReviewMsg(""), 3000);
    } catch (err: any) {
      setReviewMsg(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const todayHours = (() => {
    if (!business?.hours || business.hours.length === 0) return null;
    const today = DAYS[new Date().getDay()];
    const entry = business.hours.find((h) => h.startsWith(today));
    return entry ? entry.split(": ").slice(1).join(": ") : null;
  })();

  const directionsUrl = business
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(business.address)}`
    : "#";

  if (loading) {
    return (
      <div className="ls-container py-3xl max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-[300px] bg-ls-surface rounded-card" />
          <div className="h-8 bg-ls-surface rounded w-2/3 mt-xl" />
          <div className="h-4 bg-ls-surface rounded w-1/2 mt-md" />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="ls-container py-3xl text-center">
        <h1 className="text-page-title text-ls-primary">Business Not Found</h1>
        <Link href="/explore" className="ls-btn inline-block mt-lg">Browse All Businesses</Link>
      </div>
    );
  }

  return (
    <div className="pb-3xl">
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-4 right-4 text-white z-10 p-2" onClick={() => setLightboxIndex(null)}>
            <X size={28} />
          </button>
          {lightboxIndex > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 bg-black/40 rounded-full p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <ChevronLeft size={28} />
            </button>
          )}
          {lightboxIndex < allPhotoUrls.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 bg-black/40 rounded-full p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <ChevronLeft size={28} className="rotate-180" />
            </button>
          )}
          <img
            src={allPhotoUrls[lightboxIndex]}
            alt=""
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIndex + 1} / {allPhotoUrls.length}
          </div>
        </div>
      )}

      {/* Photo Gallery — Yelp-style full-width */}
      {allPhotoUrls.length > 0 ? (
        <div>
          <div className="relative w-full overflow-hidden" style={{ height: "425px" }}>
            <div
              ref={galleryRef}
              className="flex h-full overflow-x-auto"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            >
              {allPhotoUrls.map((url, i) => (
                <button
                  key={`${photoTagFilter}-${i}`}
                  onClick={() => setLightboxIndex(i)}
                  className="flex-shrink-0 h-full cursor-pointer border-none p-0"
                  style={{ marginRight: allPhotoUrls.length > 1 ? "2px" : 0 }}
                >
                  <img
                    src={url}
                    alt={`${business.name} photo ${i + 1}`}
                    className="h-full object-cover"
                    style={{ minWidth: allPhotoUrls.length === 1 ? "100vw" : "auto", maxWidth: "80vw" }}
                  />
                </button>
              ))}
            </div>

            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="absolute top-4 left-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 z-10"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Favorite button */}
            <button
              onClick={handleToggleFavorite}
              className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 z-10"
              title={isFavorite ? "Remove from favorites" : "Save to favorites"}
            >
              <Heart size={20} className={isFavorite ? "text-red-500 fill-red-500" : "text-white"} />
            </button>

            {/* Dark gradient overlay with business info */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 40%, transparent 65%)" }} />
            <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
              <div className="max-w-3xl mx-auto">
                <h1 className="text-[56px] font-bold text-white leading-tight drop-shadow-lg">{business.name}</h1>
                <div className="flex items-center gap-[6px] mt-[6px] flex-wrap">
                  <div className="flex items-center gap-[2px]">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i <= Math.round(business.rating) ? "text-yellow-400 fill-yellow-400" : "text-white/40"}
                      />
                    ))}
                  </div>
                  <span className="text-white font-semibold text-[14px]">{business.rating?.toFixed(1)}</span>
                  <span className="text-white/70 text-[13px]">({business.totalRatings} reviews)</span>
                </div>
                <div className="flex items-center gap-[6px] mt-[4px] text-[13px] flex-wrap">
                  {business.priceLevel && (
                    <>
                      <span className="text-white/80">{"$".repeat(business.priceLevel)}</span>
                      <span className="text-white/40">·</span>
                    </>
                  )}
                  <span className="text-white/80 capitalize">{business.category?.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center gap-[6px] mt-[5px] text-[13px]">
                  {isCurrentlyOpen(business.hours, business.structuredHours) ? (
                    <span className="text-green-400 font-semibold">Open</span>
                  ) : (
                    <span className="text-red-400 font-semibold">Closed</span>
                  )}
                  {todayHours && (
                    <>
                      <span className="text-white/40">·</span>
                      <span className="text-white/70">{todayHours}</span>
                    </>
                  )}
                  {business.hours && business.hours.length > 0 && (
                    <button
                      className="text-white/60 hover:text-white/90 underline pointer-events-auto text-[12px] ml-[2px]"
                      onClick={() => setShowHours(!showHours)}
                    >
                      See hours
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Photo counter */}
            <div className="absolute bottom-5 right-5 bg-black/60 text-white text-[12px] font-medium px-3 py-[5px] rounded-full cursor-pointer hover:bg-black/80"
              onClick={() => setLightboxIndex(0)}
            >
              <Camera size={13} className="inline mr-[4px] -mt-[1px]" />
              See all {allPhotoUrls.length} photos
            </div>
          </div>

          {/* Photo tag filter buttons */}
          {availableTags.length > 0 && (
            <div className="flex gap-sm px-lg py-sm overflow-x-auto max-w-3xl mx-auto" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => { setPhotoTagFilter(null); setPhotoIndex(0); }}
                className={`flex items-center gap-[4px] text-[12px] font-medium px-md py-[6px] rounded-full whitespace-nowrap transition-colors ${
                  photoTagFilter === null ? "bg-ls-primary text-white" : "bg-ls-surface text-ls-primary"
                }`}
              >
                <LayoutGrid size={13} /> All
              </button>
              {(["food", "drinks", "menu", "inside", "outside", "other"] as PhotoTag[])
                .filter((t) => availableTags.includes(t))
                .map((tag) => {
                  const tagConfig: Record<PhotoTag, { label: string; icon: React.ReactNode }> = {
                    food: { label: "Food", icon: <UtensilsCrossed size={13} /> },
                    drinks: { label: "Drinks", icon: <GlassWater size={13} /> },
                    menu: { label: "Menu", icon: <BookOpen size={13} /> },
                    inside: { label: "Inside", icon: <Home size={13} /> },
                    outside: { label: "Outside", icon: <TreePine size={13} /> },
                    other: { label: "Other", icon: <Camera size={13} /> },
                  };
                  const cfg = tagConfig[tag];
                  const count = taggedPhotos.filter((p) => p.tag === tag).length;
                  return (
                    <button
                      key={tag}
                      onClick={() => { setPhotoTagFilter(photoTagFilter === tag ? null : tag); setPhotoIndex(0); }}
                      className={`flex items-center gap-[4px] text-[12px] font-medium px-md py-[6px] rounded-full whitespace-nowrap transition-colors ${
                        photoTagFilter === tag ? "bg-ls-primary text-white" : "bg-ls-surface text-ls-primary"
                      }`}
                    >
                      {cfg.icon} {cfg.label} ({count})
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-[250px] bg-ls-surface flex items-center justify-center">
          <Camera size={40} className="text-ls-secondary" />
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/60 to-transparent">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-[26px] font-bold text-white">{business.name}</h1>
              <p className="text-[13px] text-white/70 capitalize mt-[2px]">{business.category?.replace(/_/g, " ")}</p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 z-10"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      )}

      <div className="ls-container max-w-3xl mx-auto">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-sm mt-md">
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="flex items-center gap-xs bg-ls-primary text-white text-[13px] font-medium px-lg py-sm rounded-btn hover:opacity-90 disabled:opacity-50"
          >
            <CheckCircle size={16} /> {checkingIn ? "Checking in..." : "Check In"}
          </button>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-xs bg-ls-surface text-ls-primary text-[13px] font-medium px-lg py-sm rounded-btn hover:bg-ls-border"
          >
            <Navigation size={16} /> Directions
          </a>
          <button
            onClick={() => user ? setShowReviewForm(true) : router.push("/login")}
            className="flex items-center gap-xs bg-ls-surface text-ls-primary text-[13px] font-medium px-lg py-sm rounded-btn hover:bg-ls-border"
          >
            <MessageSquare size={16} /> Review
          </button>
        </div>

        {(checkInMsg || reviewMsg) && (
          <p className={`text-[13px] mt-sm ${(checkInMsg || reviewMsg).includes("failed") || (checkInMsg || reviewMsg).includes("Failed") ? "text-red-600" : "text-green-600"}`}>
            {checkInMsg || reviewMsg}
          </p>
        )}

        {/* Description */}
        {business.description && (
          <p className="text-[14px] text-ls-body mt-md leading-relaxed">{business.description}</p>
        )}

        {/* Info Section */}
        <div className="mt-xl space-y-md">
          {/* Address */}
          <div className="flex items-start gap-md">
            <MapPin size={18} className="text-ls-secondary shrink-0 mt-[2px]" />
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] text-ls-primary hover:underline"
            >
              {business.address}
            </a>
          </div>

          {/* Phone */}
          {business.phone && (
            <div className="flex items-center gap-md">
              <Phone size={18} className="text-ls-secondary shrink-0" />
              <a href={`tel:${business.phone}`} className="text-[14px] text-ls-primary hover:underline">
                {business.phone}
              </a>
            </div>
          )}

          {/* Website */}
          {business.website && (
            <div className="flex items-center gap-md">
              <Globe size={18} className="text-ls-secondary shrink-0" />
              <a
                href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-ls-primary hover:underline truncate"
              >
                {business.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}

          {/* Hours */}
          {business.hours && business.hours.length > 0 && (
            <div className="flex items-start gap-md">
              <Clock size={18} className="text-ls-secondary shrink-0 mt-[2px]" />
              <div>
                <button
                  onClick={() => setShowHours(!showHours)}
                  className="text-[14px] text-ls-primary hover:underline flex items-center gap-xs"
                >
                  {todayHours || "See hours"}
                  <span className="text-[11px] text-ls-secondary">{showHours ? "▲" : "▼"}</span>
                </button>
                {showHours && (
                  <div className="mt-sm space-y-[2px]">
                    {formatHours(business.hours).map((h, i) => (
                      <div key={i} className="flex gap-md text-[13px]">
                        <span className="text-ls-secondary w-[90px]">{h.day}</span>
                        <span className="text-ls-primary">{h.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        {business.latitude && business.longitude && (
          <div className="mt-xl rounded-card overflow-hidden border border-ls-border">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${business.longitude - 0.008},${business.latitude - 0.005},${business.longitude + 0.008},${business.latitude + 0.005}&layer=mapnik&marker=${business.latitude},${business.longitude}`}
                width="100%"
                height="200"
                style={{ border: 0, pointerEvents: "none" }}
                loading="lazy"
              />
            </a>
          </div>
        )}

        {/* Write Review Modal */}
        {showReviewForm && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowReviewForm(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] bg-white rounded-card shadow-xl z-50">
              <div className="flex items-center justify-between px-lg py-md border-b border-ls-border">
                <h2 className="text-[16px] font-bold text-ls-primary">Write a Review</h2>
                <button onClick={() => setShowReviewForm(false)} className="p-xs text-ls-secondary hover:text-ls-primary">
                  <X size={20} />
                </button>
              </div>
              <div className="p-lg space-y-md">
                <div>
                  <p className="text-[12px] font-semibold text-ls-secondary mb-xs">Rating</p>
                  <InteractiveStarRating rating={reviewRating} onChange={setReviewRating} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-ls-secondary mb-xs">Your Review</p>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience..."
                    rows={4}
                    className="w-full bg-white border border-ls-border rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:border-ls-primary placeholder:text-ls-secondary"
                  />
                </div>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview || !reviewText.trim()}
                  className="w-full bg-ls-primary text-white text-[14px] font-medium py-[12px] rounded-btn hover:opacity-90 disabled:opacity-50"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Reviews */}
        <div className="mt-xl">
          <h2 className="text-section-header text-ls-primary mb-md">
            Reviews {(reviews.length + googleReviews.length) > 0 && <span className="text-ls-secondary font-normal">({reviews.length + googleReviews.length})</span>}
          </h2>

          {/* In-app reviews */}
          {reviews.length > 0 && (
            <div className="space-y-md">
              {reviews.map((review) => (
                <div key={review.id} className="ls-card">
                  <div className="flex items-center gap-sm">
                    {review.userPhotoURL ? (
                      <img src={review.userPhotoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-ls-surface flex items-center justify-center text-[13px] font-bold text-ls-secondary">
                        {review.userName?.[0] || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-ls-primary truncate">{review.userName}</p>
                      <div className="flex items-center gap-xs">
                        <StarRating rating={review.rating} size={12} />
                        {review.createdAt && (
                          <span className="text-[11px] text-ls-secondary">
                            {(review.createdAt.toDate ? review.createdAt.toDate() : new Date(review.createdAt)).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {review.text && <ExpandableText text={review.text} className="text-[13px] text-ls-body mt-sm leading-relaxed" />}
                </div>
              ))}
            </div>
          )}

          {/* Google reviews */}
          {googleReviews.length > 0 && (
            <div className={reviews.length > 0 ? "mt-lg" : ""}>
              <p className="text-[12px] font-semibold text-ls-secondary mb-sm flex items-center gap-xs">
                <img src="https://www.google.com/favicon.ico" alt="" className="w-3.5 h-3.5" /> Google Reviews
              </p>
              <div className="space-y-md">
                {googleReviews.map((gr: any, i: number) => (
                  <div key={i} className="ls-card">
                    <div className="flex items-center gap-sm">
                      {gr.profile_photo_url ? (
                        <img src={gr.profile_photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-ls-surface flex items-center justify-center text-[13px] font-bold text-ls-secondary">
                          {gr.author_name?.[0] || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-ls-primary truncate">{gr.author_name}</p>
                        <div className="flex items-center gap-xs">
                          <StarRating rating={gr.rating} size={12} />
                          {gr.relative_time_description && (
                            <span className="text-[11px] text-ls-secondary">{gr.relative_time_description}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {gr.text && <ExpandableText text={gr.text} className="text-[13px] text-ls-body mt-sm leading-relaxed" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviews.length === 0 && googleReviews.length === 0 && (
            <div className="ls-card text-center py-xl">
              <MessageSquare size={28} className="text-ls-secondary mx-auto" />
              <p className="text-[14px] text-ls-secondary mt-sm">No reviews yet. Be the first!</p>
            </div>
          )}
        </div>

        {/* Photo Grid */}
        {allPhotoUrls.length > 1 && (
          <div className="mt-xl">
            <h2 className="text-section-header text-ls-primary mb-md">Photos</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-sm">
              {allPhotoUrls.map((url, i) => (
                <button
                  key={i}
                  onClick={() => { setPhotoIndex(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="aspect-square rounded-card overflow-hidden"
                >
                  <img src={url} alt="" className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

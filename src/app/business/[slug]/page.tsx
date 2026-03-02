"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Phone, Globe, Clock, ChevronLeft, ChevronRight, Navigation,
  Star, Heart, Camera, CheckCircle, X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import type { Business, Review, BusinessPhoto, PhotoTag } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import {
  getBusinessById, getReviewsForBusiness, getBusinessPhotos,
  submitReview, hasUserReviewed, checkIn, toggleFavorite,
  uploadBusinessPhoto, getUserFavorites,
} from "@/lib/services";
import { isCurrentlyOpen, formatPriceLevel, getDirectionsUrl } from "@/lib/utils";
import StarRating from "@/components/ui/StarRating";
import OpenStatus from "@/components/ui/OpenStatus";

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, refreshProfile } = useAuth();
  const { requestLocation } = useLocation();

  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Interactive state
  const [isFavorited, setIsFavorited] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewHover, setReviewHover] = useState(0);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [photoFilter, setPhotoFilter] = useState<PhotoTag | "all">("all");

  const loadData = useCallback(async () => {
    try {
      const idPrefix = slug.split("-").pop() || "";
      const { db: fireDb } = await import("@/lib/firebase");
      const { collection, getDocs, query: fbQuery } = await import("firebase/firestore");

      const q = fbQuery(collection(fireDb, "businesses"));
      const snapshot = await getDocs(q);
      const match = snapshot.docs.find((d) => d.id.startsWith(idPrefix));

      if (match) {
        const biz = { id: match.id, ...match.data() } as Business;
        setBusiness(biz);

        const [revResult, picResult] = await Promise.allSettled([
          getReviewsForBusiness(match.id),
          getBusinessPhotos(match.id),
        ]);
        if (revResult.status === "fulfilled") setReviews(revResult.value);
        if (picResult.status === "fulfilled") setPhotos(picResult.value);

        if (user) {
          const [reviewed, favs] = await Promise.all([
            hasUserReviewed(match.id, user.id),
            getUserFavorites(user.id),
          ]);
          setAlreadyReviewed(reviewed);
          setIsFavorited(favs.includes(match.id));
        }
      }
    } catch (err) {
      console.error("Failed to load business:", err);
    } finally {
      setLoading(false);
    }
  }, [slug, user]);

  useEffect(() => { window.scrollTo(0, 0); loadData(); }, [loadData]);

  // Handlers
  const handleFavorite = async () => {
    if (!user) { router.push("/login"); return; }
    if (!business) return;
    const newState = await toggleFavorite(user.id, business.id);
    setIsFavorited(newState);
    await refreshProfile();
  };

  const handleCheckIn = async () => {
    if (!user) { router.push("/login"); return; }
    if (!business) return;
    setCheckingIn(true);
    setMessage("");
    try {
      const { lat, lng } = await requestLocation();
      await checkIn(business.id, lat, lng);
      setCheckInSuccess(true);
      await refreshProfile();
      setTimeout(() => setCheckInSuccess(false), 3000);
    } catch (err: any) {
      setMessage(err.message || "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }
    if (!business || reviewRating === 0) return;
    setSubmittingReview(true);
    try {
      const newReview = await submitReview(business.id, reviewRating, reviewText);
      setReviews([{ ...newReview, createdAt: new Date() } as any, ...reviews]);
      setShowReviewForm(false);
      setAlreadyReviewed(true);
      setReviewRating(0);
      setReviewText("");
      setMessage("+25 points earned!");
      await refreshProfile();
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) { router.push("/login"); return; }
    if (!business || !e.target.files?.[0]) return;
    setUploadingPhoto(true);
    try {
      const newPhoto = await uploadBusinessPhoto(business.id, e.target.files[0], "other");
      setPhotos([newPhoto, ...photos]);
      setMessage("+15 points earned!");
      await refreshProfile();
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.message || "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="ls-container py-3xl">
        <div className="animate-pulse">
          <div className="h-[300px] bg-ls-surface rounded-card mb-2xl" />
          <div className="h-8 bg-ls-surface rounded w-1/2 mb-md" />
          <div className="h-4 bg-ls-surface rounded w-1/3" />
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

  const openStatus = isCurrentlyOpen(business.hours);
  const catInfo = CATEGORIES[business.category];
  const allPhotos = [
    ...(business.photos || []).map((url, i) => ({ url, id: `main-${i}`, tag: "other" as PhotoTag })),
    ...photos.map((p) => ({ url: p.url, id: p.id, tag: p.tag })),
  ];
  const filteredPhotos = photoFilter === "all" ? allPhotos : allPhotos.filter((p) => p.tag === photoFilter);
  const displayPhotos = filteredPhotos.length > 0 ? filteredPhotos : allPhotos;

  return (
    <div>
      {/* Check-in success overlay */}
      {checkInSuccess && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-card p-3xl text-center max-w-sm mx-xl animate-[scaleIn_0.3s_ease]">
            <CheckCircle size={48} className="text-green-600 mx-auto" />
            <h2 className="text-[22px] font-bold text-ls-primary mt-md">Checked In!</h2>
            <p className="text-body text-ls-secondary mt-xs">+10 points earned at {business.name}</p>
            <button onClick={() => setCheckInSuccess(false)} className="ls-btn mt-lg">Nice!</button>
          </div>
        </div>
      )}

      {/* Photo Carousel */}
      {displayPhotos.length > 0 && (
        <div className="relative bg-ls-surface">
          <div className="ls-container">
            <div className="relative h-[280px] md:h-[400px] overflow-hidden rounded-b-card">
              <Image
                src={displayPhotos[photoIndex % displayPhotos.length]?.url || ""}
                alt={`${business.name} photo`}
                fill
                className="object-cover"
                priority
              />
              {displayPhotos.length > 1 && (
                <>
                  <button onClick={() => setPhotoIndex((i) => (i === 0 ? displayPhotos.length - 1 : i - 1))}
                    className="absolute left-md top-1/2 -translate-y-1/2 w-[36px] h-[36px] bg-white/90 rounded-full flex items-center justify-center">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setPhotoIndex((i) => (i === displayPhotos.length - 1 ? 0 : i + 1))}
                    className="absolute right-md top-1/2 -translate-y-1/2 w-[36px] h-[36px] bg-white/90 rounded-full flex items-center justify-center">
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
              <div className="absolute bottom-md right-md bg-black/60 text-white text-tag px-md py-xs rounded-badge">
                {(photoIndex % displayPhotos.length) + 1} / {displayPhotos.length}
              </div>
              {/* Favorite button */}
              <button
                onClick={handleFavorite}
                className="absolute top-md right-md w-[40px] h-[40px] bg-white/90 rounded-full flex items-center justify-center"
              >
                <Heart size={20} className={isFavorited ? "fill-ls-heart text-ls-heart" : "text-ls-primary"} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo filter tabs */}
      {photos.length > 0 && (
        <div className="ls-container mt-md">
          <div className="flex gap-sm overflow-x-auto scrollbar-hide">
            {(["all", "food", "drinks", "inside", "menu", "outside"] as const).map((tag) => (
              <button
                key={tag}
                onClick={() => { setPhotoFilter(tag); setPhotoIndex(0); }}
                className={photoFilter === tag ? "ls-pill-active" : "ls-pill"}
              >
                {tag === "all" ? "All" : tag.charAt(0).toUpperCase() + tag.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ls-container py-2xl">
        {message && (
          <div className="mb-lg p-md bg-green-50 border border-green-200 rounded-btn text-[13px] text-green-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2xl">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-sm mb-xs">
              <span className="ls-tag">{catInfo?.label || business.category}</span>
              <OpenStatus isOpen={openStatus} />
              {business.priceLevel && <span className="text-meta text-ls-secondary">{formatPriceLevel(business.priceLevel)}</span>}
            </div>
            <h1 className="text-[28px] md:text-[32px] font-bold text-ls-primary">{business.name}</h1>
            <div className="mt-sm"><StarRating rating={business.rating} totalRatings={business.totalRatings} size={16} /></div>

            {business.description && (
              <p className="text-body text-ls-body leading-relaxed mt-2xl">{business.description}</p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-md mt-2xl">
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="ls-btn flex items-center gap-sm disabled:opacity-50"
              >
                <MapPin size={16} />
                {checkingIn ? "Checking in..." : "Check In (+10 pts)"}
              </button>
              <a href={getDirectionsUrl(business)} target="_blank" rel="noopener noreferrer"
                className="ls-btn-secondary flex items-center gap-sm">
                <Navigation size={16} /> Directions
              </a>
              {business.phone && (
                <a href={`tel:${business.phone}`} className="ls-btn-secondary flex items-center gap-sm">
                  <Phone size={16} /> Call
                </a>
              )}
              {business.website && (
                <a href={business.website} target="_blank" rel="noopener noreferrer"
                  className="ls-btn-secondary flex items-center gap-sm">
                  <Globe size={16} /> Website
                </a>
              )}
              {/* Photo Upload */}
              <label className="ls-btn-secondary flex items-center gap-sm cursor-pointer">
                <Camera size={16} />
                {uploadingPhoto ? "Uploading..." : "Add Photo (+15 pts)"}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
              </label>
            </div>

            {/* Reviews */}
            <div className="mt-3xl">
              <div className="flex items-center justify-between mb-lg">
                <h2 className="text-section-header text-ls-primary">
                  Reviews
                  {reviews.length > 0 && <span className="text-meta text-ls-secondary font-normal ml-sm">({reviews.length})</span>}
                </h2>
                {!alreadyReviewed && !showReviewForm && (
                  <button
                    onClick={() => user ? setShowReviewForm(true) : router.push("/login")}
                    className="ls-btn text-[13px] py-sm px-lg"
                  >
                    Write Review (+25 pts)
                  </button>
                )}
              </div>

              {/* Write Review Form */}
              {showReviewForm && (
                <form onSubmit={handleSubmitReview} className="ls-card mb-lg">
                  <div className="flex items-center justify-between mb-md">
                    <h3 className="text-[14px] font-semibold text-ls-primary">Your Review</h3>
                    <button type="button" onClick={() => setShowReviewForm(false)}><X size={18} className="text-ls-secondary" /></button>
                  </div>

                  {/* Star picker */}
                  <div className="flex gap-xs mb-md">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseEnter={() => setReviewHover(s)}
                        onMouseLeave={() => setReviewHover(0)}
                        onClick={() => setReviewRating(s)}
                      >
                        <Star
                          size={28}
                          className={
                            s <= (reviewHover || reviewRating)
                              ? "fill-ls-primary text-ls-primary"
                              : "fill-none text-[#D1D1D1]"
                          }
                        />
                      </button>
                    ))}
                    {reviewRating > 0 && (
                      <span className="text-meta text-ls-secondary ml-sm self-center">
                        {reviewRating}/5
                      </span>
                    )}
                  </div>

                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value.slice(0, 500))}
                    placeholder="Share your experience..."
                    rows={4}
                    className="w-full bg-ls-surface rounded-btn p-md text-[14px] text-ls-primary outline-none resize-none placeholder:text-ls-secondary"
                  />
                  <div className="flex items-center justify-between mt-md">
                    <span className="text-tag text-ls-secondary">{reviewText.length}/500</span>
                    <button
                      type="submit"
                      disabled={reviewRating === 0 || submittingReview}
                      className="ls-btn text-[13px] py-sm px-lg disabled:opacity-50"
                    >
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                </form>
              )}

              {reviews.length === 0 && !showReviewForm ? (
                <div className="ls-card text-center py-2xl">
                  <p className="text-body text-ls-secondary">No reviews yet. Be the first!</p>
                </div>
              ) : (
                <div className="space-y-md">
                  {reviews.map((review) => (
                    <div key={review.id} className="ls-card">
                      <div className="flex items-start gap-md">
                        <div className="w-[40px] h-[40px] rounded-full bg-ls-surface flex items-center justify-center flex-shrink-0">
                          <span className="text-[14px] font-semibold text-ls-primary">
                            {review.userName?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-semibold text-ls-primary">{review.userName}</span>
                            <span className="text-tag text-ls-secondary">
                              {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : "Just now"}
                            </span>
                          </div>
                          <div className="mt-xs"><StarRating rating={review.rating} size={12} showValue={false} /></div>
                          {review.text && <p className="text-body text-ls-body mt-sm">{review.text}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-[72px] space-y-lg">
              <div className="ls-card overflow-hidden p-0">
                <a href={getDirectionsUrl(business)} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="h-[180px] bg-ls-surface flex items-center justify-center">
                    <div className="text-center">
                      <MapPin size={32} className="text-ls-secondary mx-auto" />
                      <p className="text-tag text-ls-secondary mt-sm">View on Google Maps</p>
                    </div>
                  </div>
                </a>
              </div>

              <div className="ls-card space-y-lg">
                <h3 className="text-[12px] font-semibold text-ls-secondary uppercase tracking-wider">Info</h3>
                <div className="flex items-start gap-md">
                  <MapPin size={18} className="text-ls-secondary flex-shrink-0 mt-[2px]" />
                  <span className="text-[14px] text-ls-body">{business.address}</span>
                </div>
                {business.phone && (
                  <div className="flex items-center gap-md">
                    <Phone size={18} className="text-ls-secondary flex-shrink-0" />
                    <a href={`tel:${business.phone}`} className="text-[14px] text-ls-primary hover:underline">{business.phone}</a>
                  </div>
                )}
                {business.website && (
                  <div className="flex items-center gap-md">
                    <Globe size={18} className="text-ls-secondary flex-shrink-0" />
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-[14px] text-ls-primary hover:underline truncate">
                      {business.website.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </div>
                )}
              </div>

              {business.hours && business.hours.length > 0 && (
                <div className="ls-card">
                  <h3 className="text-[12px] font-semibold text-ls-secondary uppercase tracking-wider mb-md">
                    <Clock size={14} className="inline mr-xs" /> Hours
                  </h3>
                  <div className="space-y-xs">
                    {business.hours.map((line, i) => {
                      const [day, ...rest] = line.split(": ");
                      const time = rest.join(": ");
                      const isToday = new Date().toLocaleDateString("en-US", { weekday: "long" }) === day;
                      return (
                        <div key={i} className={`flex justify-between text-[13px] ${isToday ? "font-semibold text-ls-primary" : "text-ls-body"}`}>
                          <span>{day}</span>
                          <span>{time || "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

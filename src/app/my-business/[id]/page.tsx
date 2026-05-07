"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getBusinessById, getBusinessPhotos, getReviewsForBusiness } from "@/lib/services";
import type { Business, BusinessPhoto, Review } from "@/lib/types";
import { isCurrentlyOpen } from "@/lib/utils";
import {
  Loader2, MapPin, Phone, Globe, Clock, Star, Edit3, Camera, Tag,
  MessageSquare, Settings, ExternalLink, BarChart3, Image as ImageIcon,
} from "lucide-react";

export default function MyBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [biz, pics, revs] = await Promise.all([
      getBusinessById(businessId),
      getBusinessPhotos(businessId),
      getReviewsForBusiness(businessId),
    ]);
    if (!biz) { router.push("/"); return; }
    setBusiness(biz);
    // Merge subcollection photos with business.photos field
    const subUrls = new Set(pics.map((p: BusinessPhoto) => p.url));
    const legacyPhotos = ((biz as any).photos || [])
      .filter((url: string) => !subUrls.has(url) && url)
      .map((url: string, i: number) => ({
        id: `legacy-${i}`,
        businessId,
        url,
        tag: "other" as const,
        order: 1000 + i,
      })) as BusinessPhoto[];
    setPhotos([...pics, ...legacyPhotos]);
    setReviews(revs);
    setLoading(false);
  }, [businessId, router]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) { router.push("/login"); return; }
      if (user.role !== "admin" && !(user.ownedBusinessIds?.includes(businessId))) {
        router.push("/");
        return;
      }
      load();
    }
  }, [authLoading, user, businessId, load, router]);

  if (authLoading || loading || !business) {
    return (
      <div className="ls-container py-3xl flex items-center justify-center text-ls-secondary">
        <Loader2 size={24} className="animate-spin mr-sm" /> Loading...
      </div>
    );
  }

  const isOpen = isCurrentlyOpen(business.hours, business.structuredHours);
  const avgRating = business.rating || 0;
  const coverPhoto = photos[0]?.url || "";

  return (
    <div className="ls-container py-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <div>
          <p className="text-[12px] text-ls-secondary mb-xs">My Business Dashboard</p>
          <h1 className="text-[22px] font-bold text-ls-primary">{business.name}</h1>
        </div>
        <Link
          href={`/business/${businessId}`}
          className="flex items-center gap-xs text-[13px] text-ls-secondary hover:text-ls-primary"
          target="_blank"
        >
          <ExternalLink size={14} /> View Public Page
        </Link>
      </div>

      <div className="flex gap-xl">
        {/* Left: Public Preview */}
        <div className="flex-1 min-w-0">
          {/* Cover Photo */}
          {coverPhoto && (
            <div className="relative aspect-[16/9] rounded-card overflow-hidden mb-lg">
              <img src={coverPhoto} alt={business.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-lg">
                <h2 className="text-white text-[20px] font-bold">{business.name}</h2>
                <div className="flex items-center gap-md mt-xs">
                  <span className={`text-[12px] font-semibold px-sm py-[2px] rounded ${isOpen ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                    {isOpen ? "Open Now" : "Closed"}
                  </span>
                  {avgRating > 0 && (
                    <div className="flex items-center gap-xs">
                      <Star size={14} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-white text-[13px] font-semibold">{avgRating.toFixed(1)}</span>
                      <span className="text-white/70 text-[12px]">({reviews.length} reviews)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg">
            {/* Contact */}
            <div className="border border-ls-border rounded-card p-md">
              <h3 className="text-[13px] font-semibold text-ls-primary mb-sm">Contact</h3>
              {business.address && (
                <div className="flex items-start gap-sm mb-sm">
                  <MapPin size={14} className="text-ls-secondary mt-[2px] shrink-0" />
                  <span className="text-[13px] text-ls-body">{business.address}</span>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-sm mb-sm">
                  <Phone size={14} className="text-ls-secondary" />
                  <span className="text-[13px] text-ls-body">{business.phone}</span>
                </div>
              )}
              {business.website && (
                <div className="flex items-center gap-sm">
                  <Globe size={14} className="text-ls-secondary" />
                  <a href={business.website} target="_blank" className="text-[13px] text-ls-primary hover:underline truncate">
                    {business.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>

            {/* Hours */}
            <div className="border border-ls-border rounded-card p-md">
              <h3 className="text-[13px] font-semibold text-ls-primary mb-sm flex items-center gap-xs">
                <Clock size={14} /> Hours
              </h3>
              {business.hours && business.hours.length > 0 ? (
                <div className="space-y-[2px]">
                  {business.hours.map((h, i) => (
                    <p key={i} className="text-[12px] text-ls-body">{h}</p>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-ls-secondary italic">No hours listed</p>
              )}
            </div>
          </div>

          {/* Description */}
          {business.description && (
            <div className="border border-ls-border rounded-card p-md mb-lg">
              <h3 className="text-[13px] font-semibold text-ls-primary mb-sm">About</h3>
              <p className="text-[13px] text-ls-body leading-relaxed">{business.description}</p>
            </div>
          )}

          {/* Photos Grid */}
          {photos.length > 0 && (
            <div className="mb-lg">
              <h3 className="text-[13px] font-semibold text-ls-primary mb-sm flex items-center gap-xs">
                <ImageIcon size={14} /> Photos ({photos.length})
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-sm">
                {photos.map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-btn overflow-hidden bg-ls-surface">
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reviews */}
          {reviews.length > 0 && (
            <div className="mb-lg">
              <h3 className="text-[13px] font-semibold text-ls-primary mb-sm flex items-center gap-xs">
                <MessageSquare size={14} /> Recent Reviews ({reviews.length})
              </h3>
              <div className="space-y-sm">
                {reviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="border border-ls-border rounded-btn p-md">
                    <div className="flex items-center gap-sm mb-xs">
                      <div className="flex items-center gap-[1px]">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} size={12} className={i <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />
                        ))}
                      </div>
                      <span className="text-[11px] text-ls-secondary">{review.userName}</span>
                    </div>
                    {review.text && <p className="text-[12px] text-ls-body">{review.text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {business.tags && business.tags.length > 0 && (
            <div className="mb-lg">
              <h3 className="text-[13px] font-semibold text-ls-primary mb-sm flex items-center gap-xs">
                <Tag size={14} /> Tags
              </h3>
              <div className="flex flex-wrap gap-xs">
                {business.tags.map((tag) => (
                  <span key={tag} className="text-[11px] bg-ls-surface text-ls-body px-sm py-[2px] rounded-badge">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Edit Sidebar */}
        <div className="hidden lg:block w-[280px] shrink-0">
          <div className="sticky top-[160px] space-y-sm">
            <h3 className="text-[13px] font-semibold text-ls-primary mb-md">Manage Your Business</h3>

            <Link
              href={`/my-business/${businessId}/edit`}
              className="flex items-center gap-sm p-md rounded-card border border-ls-border hover:border-ls-primary hover:bg-ls-surface transition-colors w-full"
            >
              <Edit3 size={16} className="text-ls-primary" />
              <div>
                <p className="text-[13px] font-semibold text-ls-primary">Edit Listing</p>
                <p className="text-[11px] text-ls-secondary">Update info, hours & description</p>
              </div>
            </Link>

            <Link
              href={`/my-business/${businessId}/edit`}
              className="flex items-center gap-sm p-md rounded-card border border-ls-border hover:border-ls-primary hover:bg-ls-surface transition-colors w-full"
            >
              <Camera size={16} className="text-ls-primary" />
              <div>
                <p className="text-[13px] font-semibold text-ls-primary">Manage Photos</p>
                <p className="text-[11px] text-ls-secondary">Add, remove & reorder photos</p>
              </div>
            </Link>

            <Link
              href={`/my-business/${businessId}/edit`}
              className="flex items-center gap-sm p-md rounded-card border border-ls-border hover:border-ls-primary hover:bg-ls-surface transition-colors w-full"
            >
              <Tag size={16} className="text-ls-primary" />
              <div>
                <p className="text-[13px] font-semibold text-ls-primary">Food Tags</p>
                <p className="text-[11px] text-ls-secondary">Update cuisine & dietary tags</p>
              </div>
            </Link>

            <Link
              href={`/my-business/${businessId}/edit`}
              className="flex items-center gap-sm p-md rounded-card border border-ls-border hover:border-ls-primary hover:bg-ls-surface transition-colors w-full"
            >
              <Clock size={16} className="text-ls-primary" />
              <div>
                <p className="text-[13px] font-semibold text-ls-primary">Business Hours</p>
                <p className="text-[11px] text-ls-secondary">Set your operating hours</p>
              </div>
            </Link>

            <div className="border-t border-ls-border pt-md mt-md">
              <h4 className="text-[12px] font-semibold text-ls-secondary mb-sm">Quick Stats</h4>
              <div className="space-y-xs">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-ls-secondary">Reviews</span>
                  <span className="font-semibold text-ls-primary">{reviews.length}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-ls-secondary">Rating</span>
                  <span className="font-semibold text-ls-primary">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-ls-secondary">Photos</span>
                  <span className="font-semibold text-ls-primary">{photos.length}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-ls-secondary">Status</span>
                  <span className={`font-semibold ${isOpen ? "text-green-600" : "text-red-500"}`}>
                    {isOpen ? "Open" : "Closed"}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-ls-border pt-md mt-md">
              <Link
                href={`/business/${businessId}`}
                target="_blank"
                className="flex items-center gap-xs text-[12px] text-ls-secondary hover:text-ls-primary"
              >
                <ExternalLink size={12} /> View as customer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

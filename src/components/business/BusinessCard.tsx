import Link from "next/link";
import OptImage from "@/components/ui/OptImage";
import type { Business } from "@/lib/types";
import { getAllCategoryInfos } from "@/lib/types";
import { businessSlug, formatPriceLevel, isCurrentlyOpen } from "@/lib/utils";
import StarRating from "@/components/ui/StarRating";
import OpenStatus from "@/components/ui/OpenStatus";
import { MapPin } from "lucide-react";

interface BusinessCardProps {
  business: Business;
  thumbSize?: number;
}

export default function BusinessCard({ business, thumbSize = 88 }: BusinessCardProps) {
  const slug = businessSlug(business);
  const catInfos = getAllCategoryInfos(business);
  const openStatus = isCurrentlyOpen(business.hours, business.structuredHours);
  const photoUrl = business.photos?.[0];

  return (
    <Link href={`/business/${slug}`} className="ls-card block group">
      <div className="flex gap-lg">
        {/* Thumbnail */}
        <div
          className="relative rounded-[8px] overflow-hidden bg-ls-surface flex-shrink-0"
          style={{ width: thumbSize, height: thumbSize }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            {catInfos[0]?.icon || "🍜"}
          </div>
          {photoUrl && (
            <OptImage
              src={photoUrl}
              alt={business.name}
              width={thumbSize * 2}
              height={thumbSize * 2}
              sizes={`${thumbSize}px`}
              className="relative w-full h-full object-cover"
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-sm">
            <h3 className="text-card-title text-ls-primary truncate">
              {business.name}
            </h3>
            {business.priceLevel && (
              <span className="text-meta text-ls-secondary flex-shrink-0">
                {formatPriceLevel(business.priceLevel)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-sm mt-xs flex-wrap">
            {catInfos.map((info, i) => (
              <span key={i} className="ls-tag text-[11px]">{info.label}</span>
            ))}
            <OpenStatus isOpen={openStatus} />
          </div>

          <div className="mt-sm">
            <StarRating
              rating={business.rating}
              totalRatings={business.totalRatings}
              size={12}
            />
          </div>

          <div className="flex items-center gap-xs mt-sm text-tag text-ls-secondary">
            <MapPin size={12} />
            <span className="truncate">{business.address}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

import Link from "next/link";
import Image from "next/image";
import type { Business } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { businessSlug, formatPriceLevel, isCurrentlyOpen } from "@/lib/utils";
import StarRating from "@/components/ui/StarRating";
import OpenStatus from "@/components/ui/OpenStatus";
import { MapPin } from "lucide-react";

interface BusinessCardProps {
  business: Business;
}

export default function BusinessCard({ business }: BusinessCardProps) {
  const slug = businessSlug(business);
  const catInfo = CATEGORIES[business.category];
  const openStatus = isCurrentlyOpen(business.hours);
  const photoUrl = business.photos?.[0];

  return (
    <Link href={`/business/${slug}`} className="ls-card block group">
      <div className="flex gap-lg">
        {/* Thumbnail */}
        <div className="w-[88px] h-[88px] rounded-[8px] overflow-hidden bg-ls-surface flex-shrink-0">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={business.name}
              width={176}
              height={176}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              {catInfo?.icon || "🍜"}
            </div>
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

          <div className="flex items-center gap-sm mt-xs">
            <span className="ls-tag text-[11px]">{catInfo?.label || business.category}</span>
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

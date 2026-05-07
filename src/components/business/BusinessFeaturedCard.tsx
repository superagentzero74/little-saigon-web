import Link from "next/link";
import OptImage from "@/components/ui/OptImage";
import type { Business } from "@/lib/types";
import { businessSlug, formatRating } from "@/lib/utils";
import { getCategoryInfo } from "@/lib/types";
import { Star, MapPin } from "lucide-react";

interface BusinessFeaturedCardProps {
  business: Business;
}

export default function BusinessFeaturedCard({ business }: BusinessFeaturedCardProps) {
  const slug = businessSlug(business);
  const catInfo = getCategoryInfo(business);
  const photoUrl = business.photos?.[0];

  return (
    <Link
      href={`/business/${slug}`}
      className="block w-[200px] flex-shrink-0 group"
    >
      {/* Image */}
      <div className="relative w-full h-[140px] rounded-card overflow-hidden bg-ls-surface border border-ls-border">
        <div className="absolute inset-0 flex items-center justify-center text-3xl">
          {catInfo?.icon || "🍜"}
        </div>
        {photoUrl && (
          <OptImage
            src={photoUrl}
            alt={business.name}
            width={400}
            height={280}
            sizes="200px"
            className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
      </div>

      {/* Info */}
      <div className="mt-sm px-xs">
        <h3 className="text-[14px] font-semibold text-ls-primary truncate">
          {business.name}
        </h3>
        <div className="flex items-center gap-xs mt-[2px]">
          <Star size={11} className="fill-ls-primary text-ls-primary" />
          <span className="text-tag text-ls-primary font-semibold">
            {formatRating(business.rating)}
          </span>
          <span className="text-tag text-ls-secondary">
            ({business.totalRatings})
          </span>
          {business.priceLevel && (
            <>
              <span className="text-ls-secondary">·</span>
              <span className="text-tag text-ls-secondary">
                {"$".repeat(business.priceLevel)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-xs mt-[2px] text-[11px] text-ls-secondary">
          <MapPin size={10} />
          <span className="truncate">{business.address?.split(",")[0]}</span>
        </div>
      </div>
    </Link>
  );
}

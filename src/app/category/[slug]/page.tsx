"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Business, BusinessCategory } from "@/lib/types";
import { CATEGORIES, getCategoryInfo } from "@/lib/types";
import { getBusinessesByCategory } from "@/lib/services";
import { businessSlug, formatPriceLevel, isCurrentlyOpen } from "@/lib/utils";
import OpenStatus from "@/components/ui/OpenStatus";
import { MapPin } from "lucide-react";

export default function CategoryPage() {
  return (
    <Suspense fallback={
      <div className="ls-container py-lg">
        <div className="h-6 bg-ls-surface rounded w-1/4 animate-pulse" />
      </div>
    }>
      <CategoryContent />
    </Suspense>
  );
}

function CategoryContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const category = params.slug as BusinessCategory;
  const sub = searchParams.get("sub") || "";

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const catInfo = CATEGORIES[category];

  useEffect(() => {
    async function load() {
      try {
        const results = await getBusinessesByCategory(category, 200);
        if (sub) {
          const filtered = results.filter((b) =>
            (b.subcategories || []).includes(sub)
          );
          setBusinesses(filtered);
        } else {
          setBusinesses(results);
        }
      } catch (err) {
        console.error("Failed to load category:", err);
      } finally {
        setLoading(false);
      }
    }
    if (category && CATEGORIES[category]) {
      load();
    } else {
      setLoading(false);
    }
  }, [category, sub]);

  const subLabel = sub ? sub.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

  if (!catInfo) {
    return (
      <div className="ls-container py-lg text-center">
        <h1 className="text-[20px] font-bold text-ls-primary">Category Not Found</h1>
        <Link href="/explore" className="ls-btn inline-block mt-md text-[13px]">
          Browse All Businesses
        </Link>
      </div>
    );
  }

  return (
    <div className="ls-container py-md">
      {/* Header */}
      <div className="flex items-baseline gap-sm mb-md">
        <h1 className="text-[20px] font-bold text-ls-primary leading-tight">
          {sub ? subLabel : catInfo.label}
        </h1>
        {sub && (
          <Link href={`/category/${category}`} className="text-[12px] text-ls-secondary hover:text-ls-primary transition-colors">
            ← {catInfo.label}
          </Link>
        )}
        <span className="text-[12px] text-ls-secondary ml-auto">
          {loading ? "…" : `${businesses.length} result${businesses.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-[1px] bg-ls-border rounded-[8px] overflow-hidden">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-white p-sm flex gap-sm">
              <div className="w-[150px] h-[200px] rounded-[6px] bg-ls-surface animate-pulse flex-shrink-0" />
              <div className="flex-1 py-[2px]">
                <div className="h-3.5 bg-ls-surface rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-ls-surface rounded w-1/2 mt-[6px] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-[48px]">
          <p className="text-[15px] font-semibold text-ls-primary">No businesses found</p>
          {sub && (
            <Link href={`/category/${category}`} className="ls-btn-secondary inline-block mt-md text-[13px]">
              View all {catInfo.label}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-[1px] bg-ls-border rounded-[8px] overflow-hidden">
          {businesses.map((business) => (
            <CompactCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompactCard({ business }: { business: Business }) {
  const slug = businessSlug(business);
  const catInfo = getCategoryInfo(business);
  const openStatus = isCurrentlyOpen(business.hours, business.structuredHours);
  const photoUrl = business.photos?.[0];

  return (
    <Link
      href={`/business/${slug}`}
      className="flex gap-sm p-sm bg-white hover:bg-gray-50 transition-colors overflow-hidden"
    >
      {/* Image */}
      <div className="w-[150px] h-[200px] rounded-[6px] overflow-hidden bg-ls-surface flex-shrink-0">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={business.name}
            width={300}
            height={400}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            {catInfo?.icon || "🍜"}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-[2px]">
        <div className="flex items-center gap-sm">
          <h3 className="text-[13px] font-semibold text-ls-primary truncate">{business.name}</h3>
          {business.priceLevel && (
            <span className="text-[11px] text-ls-secondary flex-shrink-0">{formatPriceLevel(business.priceLevel)}</span>
          )}
        </div>
        <div className="flex items-center gap-xs mt-[2px]">
          <OpenStatus isOpen={openStatus} />
        </div>
        <div className="flex items-center gap-[3px] mt-[2px] text-[11px] text-ls-secondary">
          <MapPin size={10} />
          <span className="truncate">{business.address}</span>
        </div>
      </div>
    </Link>
  );
}

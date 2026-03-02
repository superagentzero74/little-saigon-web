"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Business, BusinessCategory } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { getBusinessesByCategory } from "@/lib/services";
import BusinessCard from "@/components/business/BusinessCard";

export default function CategoryPage() {
  const params = useParams();
  const category = params.slug as BusinessCategory;

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const catInfo = CATEGORIES[category];

  useEffect(() => {
    async function load() {
      try {
        const results = await getBusinessesByCategory(category, 50);
        setBusinesses(results);
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
  }, [category]);

  if (!catInfo) {
    return (
      <div className="ls-container py-3xl text-center">
        <h1 className="text-page-title text-ls-primary">Category Not Found</h1>
        <Link href="/explore" className="ls-btn inline-block mt-lg">
          Browse All Businesses
        </Link>
      </div>
    );
  }

  return (
    <div className="ls-container py-3xl">
      {/* Header */}
      <div className="mb-2xl">
        <span className="text-[36px]">{catInfo.icon}</span>
        <h1 className="text-page-title text-ls-primary mt-sm">
          {catInfo.label}
        </h1>
        <p className="text-body text-ls-secondary mt-xs">
          {loading ? "Loading..." : `${businesses.length} businesses in Little Saigon`}
        </p>
      </div>

      {/* Other categories */}
      <div className="flex gap-sm overflow-x-auto pb-lg mb-2xl scrollbar-hide">
        {(Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][]).map(
          ([key, info]) => (
            <Link
              key={key}
              href={`/category/${key}`}
              className={key === category ? "ls-pill-active whitespace-nowrap" : "ls-pill whitespace-nowrap"}
            >
              {info.icon} {info.label}
            </Link>
          )
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="ls-card animate-pulse">
              <div className="flex gap-lg">
                <div className="w-[88px] h-[88px] rounded-[8px] bg-ls-surface" />
                <div className="flex-1">
                  <div className="h-4 bg-ls-surface rounded w-3/4" />
                  <div className="h-3 bg-ls-surface rounded w-1/2 mt-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-[64px]">
          <p className="text-section-header text-ls-primary">No businesses found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {businesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}

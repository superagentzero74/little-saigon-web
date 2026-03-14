"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import type { Business, BusinessCategory } from "@/lib/types";
import { getBusinesses, searchBusinesses, getPageSettings } from "@/lib/services";
import BusinessCard from "@/components/business/BusinessCard";
import CategoryPills from "@/components/ui/CategoryPills";

function ExploreContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeSearch, setActiveSearch] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>(null);
  const [sortBy, setSortBy] = useState<"rating" | "name">("rating");
  const [exploreCategories, setExploreCategories] = useState<BusinessCategory[] | undefined>(undefined);
  const [showIcons, setShowIcons] = useState(true);

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      if (activeSearch) {
        const results = await searchBusinesses(activeSearch);
        setBusinesses(
          selectedCategory ? results.filter((b) => b.category === selectedCategory) : results
        );
      } else {
        const { businesses: results } = await getBusinesses({
          category: selectedCategory || undefined,
          limitCount: 50,
        });
        setBusinesses(results);
      }
    } catch (err) {
      console.error("Failed to load businesses:", err);
    } finally {
      setLoading(false);
    }
  }, [activeSearch, selectedCategory]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  useEffect(() => {
    getPageSettings().then((s) => {
      const cats = s.explore?.categories || s.exploreCategories;
      if (cats) setExploreCategories(cats as BusinessCategory[]);
      if (s.explore?.showIcons === false) setShowIcons(false);
    }).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery.trim());
  };

  const sortedBusinesses = [...businesses].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return b.rating - a.rating;
  });

  return (
    <div className="ls-container py-3xl">
      {/* Header */}
      <div className="mb-2xl">
        <h1 className="text-page-title text-ls-primary">
          {activeSearch ? `Results for "${activeSearch}"` : "Explore All Businesses"}
        </h1>
        <p className="text-body text-ls-secondary mt-xs">
          {loading
            ? "Loading..."
            : `${sortedBusinesses.length} businesses found`}
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-lg">
        <div className="flex items-center bg-ls-surface rounded-btn overflow-hidden">
          <div className="pl-lg">
            <Search size={18} className="text-ls-secondary" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, address, or category..."
            className="flex-1 px-md py-[12px] text-[14px] text-ls-primary bg-transparent outline-none placeholder:text-ls-secondary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveSearch("");
              }}
              className="px-md text-meta text-ls-secondary hover:text-ls-primary"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Filters Row */}
      <div className="flex items-center justify-between gap-lg mb-2xl">
        <div className="flex-1 overflow-hidden">
          <CategoryPills
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            visibleCategories={exploreCategories}
            showIcons={showIcons}
          />
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={() => setSortBy(sortBy === "rating" ? "name" : "rating")}
            className="ls-pill flex items-center gap-xs"
          >
            <SlidersHorizontal size={14} />
            {sortBy === "rating" ? "Top Rated" : "A–Z"}
          </button>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="ls-card animate-pulse">
              <div className="flex gap-lg">
                <div className="w-[88px] h-[88px] rounded-[8px] bg-ls-surface" />
                <div className="flex-1">
                  <div className="h-4 bg-ls-surface rounded w-3/4" />
                  <div className="h-3 bg-ls-surface rounded w-1/2 mt-sm" />
                  <div className="h-3 bg-ls-surface rounded w-2/3 mt-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedBusinesses.length === 0 ? (
        <div className="text-center py-[64px]">
          <p className="text-section-header text-ls-primary">No results found</p>
          <p className="text-body text-ls-secondary mt-sm">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {sortedBusinesses.map((business) => (
            <BusinessCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="ls-container py-3xl"><p className="text-body text-ls-secondary">Loading...</p></div>}>
      <ExploreContent />
    </Suspense>
  );
}

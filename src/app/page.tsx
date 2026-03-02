"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, MapPin, ChevronRight } from "lucide-react";
import type { Business, MonVietDish, BusinessCategory } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { getTopRatedBusinesses, getDishes, searchBusinesses } from "@/lib/services";
import BusinessFeaturedCard from "@/components/business/BusinessFeaturedCard";
import DishCard from "@/components/guide/DishCard";

export default function HomePage() {
  const [topRated, setTopRated] = useState<Business[]>([]);
  const [dishes, setDishes] = useState<MonVietDish[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [businesses, allDishes] = await Promise.all([
          getTopRatedBusinesses(12),
          getDishes(),
        ]);
        setTopRated(businesses);
        setDishes(allDishes.slice(0, 8)); // First 8 for teaser
      } catch (err) {
        console.error("Failed to load homepage data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/explore?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const categories = Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][];

  return (
    <div>
      {/* ============ Hero ============ */}
      <section className="bg-ls-primary text-white">
        <div className="ls-container py-[48px] md:py-[64px]">
          <p className="text-meta text-white/60 uppercase tracking-widest mb-sm">
            Westminster · Garden Grove · Fountain Valley
          </p>
          <h1 className="text-[36px] md:text-[48px] font-bold leading-tight">
            Xin Chào!
          </h1>
          <p className="text-[18px] text-white/70 mt-sm max-w-lg">
            Discover the best Vietnamese restaurants, businesses, and services in Little Saigon, Southern California.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-2xl max-w-xl">
            <div className="flex items-center bg-white rounded-btn overflow-hidden">
              <div className="pl-lg">
                <Search size={20} className="text-ls-secondary" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search businesses, dishes, or neighborhoods..."
                className="flex-1 px-md py-[14px] text-[15px] text-ls-primary bg-transparent outline-none placeholder:text-ls-secondary"
              />
              <button
                type="submit"
                className="bg-ls-primary text-white px-xl py-[14px] text-[14px] font-semibold hover:bg-black transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ============ Categories ============ */}
      <section className="ls-section">
        <div className="ls-container">
          <div className="flex items-center justify-between mb-lg">
            <h2 className="text-section-header text-ls-primary">Browse by Category</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-md">
            {categories.map(([key, { label, icon }]) => (
              <Link
                key={key}
                href={`/category/${key}`}
                className="ls-card flex flex-col items-center gap-sm py-xl text-center group"
              >
                <span className="text-[28px]">{icon}</span>
                <span className="text-meta text-ls-primary group-hover:font-semibold transition-all">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Favorite Viet Foods Teaser ============ */}
      <section className="ls-section bg-ls-surface/50">
        <div className="ls-container">
          <div className="flex items-center justify-between mb-lg">
            <div>
              <h2 className="text-section-header text-ls-primary">
                Top 50 Món Việt
              </h2>
              <p className="text-meta text-ls-secondary mt-xs">
                50 Essential Vietnamese Dishes
              </p>
            </div>
            <Link
              href="/guide"
              className="flex items-center gap-xs text-meta text-ls-secondary hover:text-ls-primary transition-colors"
            >
              View All <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="flex gap-lg overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-[100px] flex-shrink-0 animate-pulse">
                  <div className="w-[80px] h-[80px] mx-auto rounded-card bg-ls-surface" />
                  <div className="h-3 bg-ls-surface rounded mt-sm mx-auto w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-lg overflow-x-auto pb-sm scrollbar-hide">
              {dishes.map((dish) => (
                <DishCard key={dish.id} dish={dish} variant="compact" />
              ))}
              {/* View all card */}
              <Link
                href="/guide"
                className="flex-shrink-0 w-[100px] flex flex-col items-center justify-center"
              >
                <div className="w-[80px] h-[80px] rounded-card bg-ls-primary flex items-center justify-center">
                  <ArrowRight size={24} className="text-white" />
                </div>
                <p className="text-[11px] font-medium text-ls-primary mt-xs">
                  View All 50
                </p>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ============ Top Rated ============ */}
      <section className="ls-section">
        <div className="ls-container">
          <div className="flex items-center justify-between mb-lg">
            <h2 className="text-section-header text-ls-primary">Top Rated</h2>
            <Link
              href="/explore"
              className="flex items-center gap-xs text-meta text-ls-secondary hover:text-ls-primary transition-colors"
            >
              View All <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="flex gap-lg overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-[200px] flex-shrink-0 animate-pulse">
                  <div className="w-full h-[140px] rounded-card bg-ls-surface" />
                  <div className="h-4 bg-ls-surface rounded mt-sm w-32" />
                  <div className="h-3 bg-ls-surface rounded mt-xs w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-lg overflow-x-auto pb-sm scrollbar-hide">
              {topRated.map((business) => (
                <BusinessFeaturedCard key={business.id} business={business} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ CTA Banner ============ */}
      <section className="ls-container mb-3xl">
        <div className="ls-card bg-ls-surface border-0 text-center py-3xl">
          <div className="flex items-center justify-center gap-xs text-ls-secondary mb-sm">
            <MapPin size={16} />
            <span className="text-meta uppercase tracking-wider">
              Westminster · Garden Grove · Fountain Valley
            </span>
          </div>
          <h2 className="text-[22px] font-bold text-ls-primary">
            420+ Vietnamese Businesses & Services
          </h2>
          <p className="text-body text-ls-body mt-sm max-w-md mx-auto">
            From phở to bánh mì, nail salons to grocery stores — explore everything Little Saigon has to offer.
          </p>
          <Link href="/explore" className="ls-btn inline-block mt-lg">
            Explore All Businesses
          </Link>
        </div>
      </section>
    </div>
  );
}

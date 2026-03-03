"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, ChevronRight } from "lucide-react";
import type { Business, MonVietDish, BusinessCategory } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { getTopRatedBusinesses, getDishes } from "@/lib/services";
import BusinessFeaturedCard from "@/components/business/BusinessFeaturedCard";
import DishCard from "@/components/guide/DishCard";

const HERO_IMAGES = [
  { src: "/hero-1.webp", alt: "Asian Garden Mall — Phước Lộc Thọ" },
  { src: "/hero-2.jpg", alt: "Tết celebration at Phước Lộc Thọ" },
  { src: "/hero-3.jpg", alt: "Today Plaza — Thương Xá Kim Nhật" },
];

export default function HomePage() {
  const [topRated, setTopRated] = useState<Business[]>([]);
  const [dishes, setDishes] = useState<MonVietDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [bizResult, dishResult] = await Promise.allSettled([
          getTopRatedBusinesses(12),
          getDishes(),
        ]);
        if (bizResult.status === "fulfilled") setTopRated(bizResult.value);
        else console.error("Failed to load businesses:", bizResult.reason);
        if (dishResult.status === "fulfilled") setDishes(dishResult.value.slice(0, 8));
        else console.error("Failed to load dishes:", dishResult.reason);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][];

  return (
    <div>
      {/* ============ Hero ============ */}
      <section className="relative text-white overflow-hidden">
        {/* Background slideshow */}
        <div className="absolute inset-0">
          {HERO_IMAGES.map((img, i) => (
            <Image
              key={img.src}
              src={img.src}
              alt={img.alt}
              fill
              className={`object-cover object-center transition-opacity duration-1000 ${i === heroIndex ? "opacity-100" : "opacity-0"}`}
              priority={i === 0}
            />
          ))}
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-md left-1/2 -translate-x-1/2 flex gap-[6px] z-10">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIndex(i)}
              className={`w-[8px] h-[8px] rounded-full transition-all ${i === heroIndex ? "bg-white scale-125" : "bg-white/40"}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative ls-container py-[48px] md:py-[80px]">
          <p className="text-meta text-white/70 uppercase tracking-widest mb-sm">
            Westminster · Garden Grove · Fountain Valley · Santa Ana
          </p>
          <h1 className="text-[36px] md:text-[52px] font-bold leading-tight">
            Xin Chào!
          </h1>
          <p className="text-[18px] text-white/80 mt-sm max-w-lg">
            Discover the best Vietnamese restaurants, businesses, and services in Little Saigon, Southern California.
          </p>
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
              Westminster · Garden Grove · Fountain Valley · Santa Ana
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

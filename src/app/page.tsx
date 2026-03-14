"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, ChevronRight } from "lucide-react";
import type { Business, MonVietDish, BusinessCategory, PromoBanner } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { getTopRatedBusinesses, getDishes, getPageSettings, getPromoBanners } from "@/lib/services";
import BusinessFeaturedCard from "@/components/business/BusinessFeaturedCard";
import DishCard from "@/components/guide/DishCard";


export default function HomePage() {
  const [topRated, setTopRated] = useState<Business[] | null>(null);
  const [dishes, setDishes] = useState<MonVietDish[] | null>(null);
  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<BusinessCategory[] | null>(null);
  const [showIcons, setShowIcons] = useState(true);
  const [settingsReady, setSettingsReady] = useState(false);

  useEffect(() => {
    // Fire all requests independently so each section renders as soon as its data arrives
    getTopRatedBusinesses(12).then(setTopRated).catch(() => setTopRated([]));
    getDishes().then((all) => setDishes(all.slice(0, 16))).catch(() => setDishes([]));
    getPromoBanners().then((b) => setPromoBanners(b.filter((x) => x.active))).catch(() => {});
    getPageSettings().then((s) => {
      const cats = s.home?.categories || s.homeCategories;
      if (cats) setVisibleCategories(cats as BusinessCategory[]);
      if (s.home?.showIcons === false) setShowIcons(false);
      setSettingsReady(true);
    }).catch(() => setSettingsReady(true));
  }, []);

  const allCategories = Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][];
  const categories = visibleCategories
    ? allCategories.filter(([key]) => visibleCategories.includes(key))
    : allCategories;

  return (
    <div>
      {/* ============ Hero ============ */}
      <section className="bg-white">
        <div className="ls-container py-[32px] md:py-[48px] flex flex-col items-center text-center">
          <Image
            src="/xin-chao-banner.png"
            alt="Xin Chào!"
            width={1066}
            height={434}
            className="w-full max-w-[480px] h-auto"
            priority
          />
          <p className="text-[16px] md:text-[18px] text-ls-body mt-md max-w-lg">
            Discover the best Vietnamese restaurants, businesses, and services in Little Saigon, Southern California.
          </p>
          <p className="text-meta text-ls-secondary uppercase tracking-widest mt-sm">
            Westminster · Garden Grove · Fountain Valley · Santa Ana
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
                {showIcons && <span className="text-[28px]">{icon}</span>}
                <span className="text-meta text-ls-primary group-hover:font-semibold transition-all">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Promo Banners ============ */}
      {promoBanners.length > 0 && (
        <section className="ls-section py-md overflow-hidden">
          <div className="ls-container">
            <style>{`
              @keyframes slideInFromRight {
                from { transform: translateX(60px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
              .promo-slide-in { animation: slideInFromRight 0.6s ease-out both; }
            `}</style>
            <div className="flex gap-md overflow-x-auto pb-sm scrollbar-hide">
              {promoBanners.map((banner, idx) => {
                const href =
                  banner.linkType === "search"
                    ? `/explore?q=${encodeURIComponent(banner.linkValue)}`
                    : banner.linkType === "food"
                    ? `/guide/${banner.linkValue}`
                    : banner.linkType === "category"
                    ? (() => {
                        const [cat, sub] = banner.linkValue.split(":");
                        return sub
                          ? `/category/${encodeURIComponent(cat)}?sub=${encodeURIComponent(sub)}`
                          : `/explore?category=${encodeURIComponent(cat)}`;
                      })()

                    : banner.linkValue;
                const isExternal = banner.linkType === "url";
                const img = (
                  <div
                    className="flex-shrink-0 rounded-card overflow-hidden group promo-slide-in"
                    style={{ height: "325px", animationDelay: `${idx * 0.1}s` }}
                  >
                    <Image
                      src={banner.imageURL}
                      alt=""
                      width={440}
                      height={650}
                      className="h-full w-auto object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                );
                return isExternal ? (
                  <a key={banner.id} href={href} target="_blank" rel="noopener noreferrer">
                    {img}
                  </a>
                ) : (
                  <Link key={banner.id} href={href}>
                    {img}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============ Favorite Viet Foods Teaser ============ */}
      <section className="ls-section bg-ls-surface/50">
        <div className="ls-container">
          <div className="flex items-center justify-between mb-lg">
            <div>
              <h2 className="text-section-header text-ls-primary">
                Food Guide
              </h2>
              <p className="text-meta text-ls-secondary mt-xs">
                Popular Vietnamese dishes, drinks, and desserts
              </p>
            </div>
            <Link
              href="/guide"
              className="flex items-center gap-xs text-meta text-ls-secondary hover:text-ls-primary transition-colors"
            >
              View All <ChevronRight size={16} />
            </Link>
          </div>

          {dishes === null ? (
            <div className="flex gap-lg overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-[180px] flex-shrink-0 animate-pulse">
                  <div className="w-[160px] h-[160px] mx-auto rounded-card bg-ls-surface" />
                  <div className="h-3 bg-ls-surface rounded mt-sm mx-auto w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto pb-sm scrollbar-hide">
              <div className="grid grid-rows-2 grid-flow-col gap-x-lg gap-y-md" style={{ width: "max-content" }}>
                {dishes.map((dish) => (
                  <DishCard key={dish.id} dish={dish} variant="compact" />
                ))}
                {/* View all card */}
                <Link
                  href="/guide"
                  className="flex-shrink-0 w-[180px] flex flex-col items-center justify-center"
                >
                  <div className="w-[160px] h-[160px] rounded-card bg-ls-primary flex items-center justify-center">
                    <ArrowRight size={32} className="text-white" />
                  </div>
                  <p className="text-[13px] font-medium text-ls-primary mt-xs">
                    View All 50
                  </p>
                </Link>
              </div>
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

          {topRated === null ? (
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

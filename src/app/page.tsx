"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import OptImage from "@/components/ui/OptImage";
import { ArrowRight, MapPin, ChevronRight } from "lucide-react";
import type { Business, MonVietDish, PromoBanner, BlogPost } from "@/lib/types";
import { getTopRatedBusinesses, getDishes, getPromoBanners, getBlogPosts } from "@/lib/services";
import BusinessFeaturedCard from "@/components/business/BusinessFeaturedCard";
import DishCard from "@/components/guide/DishCard";


export default function HomePage() {
  const [topRated, setTopRated] = useState<Business[] | null>(null);
  const [dishes, setDishes] = useState<MonVietDish[] | null>(null);
  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  useEffect(() => {
    const wide = ["/images/hero-1.jpg", "/images/hero-3.jpg", "/images/hero-4.jpg"].sort(() => Math.random() - 0.5);
    const other = ["/images/hero-2.jpg"];
    const first = wide.shift()!;
    const rest = [...wide, ...other].sort(() => Math.random() - 0.5);
    setHeroImages([first, ...rest]);
  }, []);

  useEffect(() => {
    getTopRatedBusinesses(12).then(setTopRated).catch(() => setTopRated([]));
    getDishes().then((all) => setDishes(all.slice(0, 16))).catch(() => setDishes([]));
    getPromoBanners().then((b) => setPromoBanners(b.filter((x) => x.active))).catch(() => {});
    getBlogPosts({ status: "published", limitCount: 3 }).then(setBlogPosts).catch(() => {});
  }, []);

  return (
    <div>
      {/* ============ Hero — Image Slider with Overlay ============ */}
      <div className="ls-container">
        <section className="relative overflow-hidden">
          {/* Scrollable images */}
          <div className="flex gap-[1px] overflow-x-auto scrollbar-hide" style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>
            {heroImages.map((src, i) => (
              <div key={i} className="shrink-0" style={{ scrollSnapAlign: "start" }}>
                <Image
                  src={src}
                  alt=""
                  width={800}
                  height={420}
                  sizes="80vw"
                  priority={i === 0}
                  className="h-[340px] md:h-[420px] w-auto object-cover"
                />
              </div>
            ))}
          </div>
          {/* Dark overlay + text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
            <div className="px-xl pb-lg md:pb-2xl">
              <Image
                src="/images/di-an-choi.svg"
                alt="Đi Ăn Chơi!"
                width={1200}
                height={300}
                className="w-[260px] md:w-[380px] h-auto"
                style={{ filter: "brightness(0) invert(1)" }}
                priority
              />
              <p className="text-[12px] md:text-[14px] text-white/90 mt-sm max-w-lg">
                Discover the best Vietnamese restaurants, businesses, and services in Little Saigon, Southern California.
              </p>
              <p className="text-[10px] md:text-[11px] text-white/60 uppercase tracking-widest mt-xs">
                Westminster · Garden Grove · Fountain Valley · Santa Ana
              </p>
            </div>
          </div>
        </section>
      </div>

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
            <div className="flex gap-[6px] sm:gap-md overflow-x-auto pb-sm scrollbar-hide">
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
                    className="flex-shrink-0 w-[calc((100vw-44px)/3)] sm:w-auto overflow-hidden group promo-slide-in"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <OptImage
                      src={banner.imageURL}
                      alt=""
                      width={440}
                      height={650}
                      sizes="(min-width: 640px) 220px, 33vw"
                      className="w-full h-auto sm:h-full sm:w-auto object-cover transition-transform duration-300 group-hover:scale-105 sm:max-h-[374px]"
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

      {/* ============ Blog Section ============ */}
      {blogPosts.length > 0 && (
        <section className="ls-section bg-ls-surface/50">
          <div className="ls-container">
            <div className="flex items-center justify-between mb-lg">
              <div>
                <h2 className="text-section-header text-ls-primary">Blog</h2>
                <p className="text-meta text-ls-secondary mt-xs">Stories & news from Little Saigon</p>
              </div>
              <Link
                href="/blog"
                className="flex items-center gap-xs text-meta text-ls-secondary hover:text-ls-primary transition-colors"
              >
                View All <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              {blogPosts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                  <div className="ls-card overflow-hidden">
                    {post.coverImageURL ? (
                      <div className="relative w-full aspect-[16/9]">
                        <OptImage
                          src={post.coverImageURL}
                          alt={post.title}
                          fill
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-[16/9] bg-ls-surface" />
                    )}
                    <div className="p-md">
                      <h3 className="text-card-title text-ls-primary line-clamp-2">{post.title}</h3>
                      <p className="text-meta text-ls-secondary mt-xs line-clamp-2">
                        {post.excerpt || post.body.slice(0, 100)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
            800+ Vietnamese Restaurants, Businesses, and Services
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

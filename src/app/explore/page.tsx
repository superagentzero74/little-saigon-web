"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, SlidersHorizontal, Calendar, FileText, ChevronRight, Heart, Star, MapPin } from "lucide-react";
import type { Business, BusinessCategory, TicketEvent, BlogPost, AppUser } from "@/lib/types";
import { getBusinesses, searchBusinesses, getPageSettings, getEvents, getBlogPosts, getActiveUsers } from "@/lib/services";
import BusinessCard from "@/components/business/BusinessCard";
import CategoryPills from "@/components/ui/CategoryPills";

function ExploreContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeSearch, setActiveSearch] = useState(initialQuery);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchQuery(q);
    setActiveSearch(q);
  }, [searchParams]);

  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | null>(null);
  const [sortBy, setSortBy] = useState<"rating" | "name">("rating");
  const [exploreCategories, setExploreCategories] = useState<BusinessCategory[] | undefined>(undefined);
  const [showIcons, setShowIcons] = useState(true);

  // Discovery feed data
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [activeUsers, setActiveUsers] = useState<AppUser[]>([]);

  const isSearching = !!activeSearch || !!selectedCategory;

  const loadBusinesses = useCallback(async () => {
    if (!isSearching) return;
    setLoading(true);
    try {
      if (activeSearch) {
        const results = await searchBusinesses(activeSearch);
        setBusinesses(
          selectedCategory ? results.filter((b) => b.category === selectedCategory || (b.categories || []).includes(selectedCategory)) : results
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
  }, [activeSearch, selectedCategory, isSearching]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  useEffect(() => {
    getPageSettings().then((s) => {
      const cats = s.explore?.categories || s.exploreCategories;
      if (cats) setExploreCategories(cats as BusinessCategory[]);
      if (s.explore?.showIcons === false) setShowIcons(false);
    }).catch(() => {});
    // Load discovery feed data
    getEvents().then((e) => setEvents(e.filter((ev) => ev.status === "active" && ev.isPublic).slice(0, 3))).catch(() => {});
    getBlogPosts({ status: "published", limitCount: 3 }).then(setBlogPosts).catch(() => {});
    getActiveUsers(6).then(setActiveUsers).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery.trim());
  };

  const sortedBusinesses = activeSearch
    ? businesses
    : [...businesses].sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if ((b.totalRatings || 0) !== (a.totalRatings || 0)) return (b.totalRatings || 0) - (a.totalRatings || 0);
        return (b.rating || 0) - (a.rating || 0);
      });

  const fmtEventDate = (ev: TicketEvent) => {
    return ev.date || "";
  };

  return (
    <div className="ls-container py-3xl">

      {isSearching ? (
        <>
          {/* Search Results Header */}
          <div className="mb-lg flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-ls-primary">
                {activeSearch ? `Results for "${activeSearch}"` : "Browse"}
              </h1>
              <p className="text-[13px] text-ls-secondary mt-xs">
                {loading ? "Loading..." : `${sortedBusinesses.length} results`}
              </p>
            </div>
            <button
              onClick={() => setSortBy(sortBy === "rating" ? "name" : "rating")}
              className="ls-pill flex items-center gap-xs text-[12px]"
            >
              <SlidersHorizontal size={13} />
              {sortBy === "rating" ? "Popular" : "A–Z"}
            </button>
          </div>

          {/* Results Grid */}
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
          ) : sortedBusinesses.length === 0 ? (
            <div className="text-center py-[64px]">
              <p className="text-[18px] font-bold text-ls-primary">No results found</p>
              <p className="text-[14px] text-ls-secondary mt-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              {sortedBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── Discovery Feed (no search active) ── */
        <div className="space-y-2xl">
          {/* Banner */}
          <div>
            <Image
              src="/images/explore.svg"
              alt="explore"
              width={600}
              height={200}
              className="w-full max-w-[500px]"
              priority
            />
          </div>

          {/* Foodies to Follow — hidden until more users */}
          {false && activeUsers.length > 0 && (
            <div>
              <h2 className="text-[18px] font-bold text-ls-primary mb-md">Foodies to Follow</h2>
              <div className="flex gap-md overflow-x-auto pb-sm scrollbar-hide">
                {activeUsers.map((u) => (
                  <Link key={u.id} href={`/share/${u.id}`} className="group">
                    <div className="min-w-[240px] border border-ls-border rounded-xl p-md shrink-0 hover:border-ls-primary transition-colors">
                      <div className="flex items-center gap-sm mb-sm">
                        <div className="w-[40px] h-[40px] rounded-full bg-ls-primary overflow-hidden flex items-center justify-center shrink-0">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[15px] font-bold text-white">{u.displayName?.[0]?.toUpperCase() || "?"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ls-primary truncate">{u.displayName}</p>
                          {u.headline && <p className="text-[11px] text-ls-secondary truncate">{u.headline}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-md text-[11px] text-ls-secondary">
                        <span className="flex items-center gap-[3px]"><Star size={10} className="text-yellow-400" /> {u.reviewCount} reviews</span>
                        <span className="flex items-center gap-[3px]"><MapPin size={10} /> {u.checkInCount} check-ins</span>
                      </div>
                      {u.aboutMe && <p className="text-[12px] text-ls-secondary mt-sm line-clamp-2">{u.aboutMe}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Events */}
          {events.length > 0 && (
            <div>
              <div className="flex items-center gap-xs mb-md">
                <Calendar size={18} className="text-ls-primary" />
                <h2 className="text-[18px] font-bold text-ls-primary">Upcoming Events</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {events.map((event) => (
                  <div key={event.id} className="rounded-xl border border-ls-border overflow-hidden hover:shadow-md transition-shadow">
                    {event.photos?.[0] ? (
                      <img src={event.photos[0]} alt={event.name} className="w-full h-[140px] object-cover" loading="lazy" />
                    ) : (
                      <div
                        className="w-full h-[140px] flex items-center justify-center relative"
                        style={{ background: `linear-gradient(135deg, ${event.color || '#1a1a2e'}, ${event.color ? event.color + '99' : '#16213e'})` }}
                      >
                        <Calendar size={32} className="text-white/30 absolute top-md right-md" />
                        <p className="text-[20px] font-bold text-white text-center px-lg leading-tight">{event.name}</p>
                      </div>
                    )}
                    <div className="p-md">
                      <p className="text-[15px] font-semibold text-ls-primary">{event.name}</p>
                      <p className="text-[13px] text-ls-secondary mt-[2px]">{fmtEventDate(event)}</p>
                      <p className="text-[12px] text-ls-secondary">{event.venue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blog */}
          {blogPosts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-md">
                <div className="flex items-center gap-xs">
                  <FileText size={18} className="text-ls-primary" />
                  <h2 className="text-[18px] font-bold text-ls-primary">Blog</h2>
                </div>
                <Link href="/blog" className="text-[13px] font-medium text-ls-primary hover:underline flex items-center gap-xs">
                  See all <ChevronRight size={14} />
                </Link>
              </div>
              <div className="space-y-sm">
                {blogPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                    <div className="flex items-center gap-md p-md rounded-xl border border-ls-border hover:border-ls-primary transition-colors">
                      {post.coverImageURL ? (
                        <img src={post.coverImageURL} alt="" className="w-[60px] h-[60px] rounded-lg object-cover shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-[60px] h-[60px] rounded-lg bg-ls-surface flex items-center justify-center shrink-0">
                          <FileText size={20} className="text-ls-secondary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-ls-primary group-hover:text-ls-primary/80 line-clamp-2">{post.title}</p>
                        {post.publishedAt && (
                          <p className="text-[12px] text-ls-secondary mt-[2px]">
                            {new Date(post.publishedAt.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-ls-secondary shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
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

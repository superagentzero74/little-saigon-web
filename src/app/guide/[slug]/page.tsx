"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, UtensilsCrossed,
  Check, ArrowRight, Trophy, MapPin, Navigation, Pencil,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { MonVietDish, Business } from "@/lib/types";
import { businessSlug } from "@/lib/utils";
import { getDishes, searchBusinesses, toggleDishChecked, getUserProfile, getDishFeatured, getBusinessPhotos } from "@/lib/services";

// ── Geo helpers ──────────────────────────────────────────────────────────────

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.05) return `${Math.round(miles * 5280)} ft`;
  return `${miles.toFixed(1)} mi`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DishDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, refreshProfile } = useAuth();

  const [dish, setDish] = useState<MonVietDish | null>(null);
  const [allDishes, setAllDishes] = useState<MonVietDish[]>([]);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<Business[]>([]);
  const [featuredBusinesses, setFeaturedBusinesses] = useState<Business[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sortBy, setSortBy] = useState<"rating" | "distance">("rating");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [bizThumbnails, setBizThumbnails] = useState<Record<string, string>>({});

  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const mapInstanceRef = useRef<any>(null);

  // Request user location once
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // Load dish + nearby + featured
  useEffect(() => {
    window.scrollTo(0, 0);
    setShowHistory(false);
    // Reset map on dish change
    mapInstanceRef.current = null;
    markersRef.current.forEach((m) => m?.setMap?.(null));
    markersRef.current = [];

    async function load() {
      try {
        const dishes = await getDishes();
        setAllDishes(dishes);
        const rank = parseInt(slug.split("-")[0], 10);
        const found = dishes.find((d) => d.rank === rank);
        if (found) {
          setDish(found);
          const [nearbyResults, featuredResults] = await Promise.all([
            found.searchQuery ? searchBusinesses(found.searchQuery) : Promise.resolve([]),
            getDishFeatured(found.rank),
          ]);
          setNearbyBusinesses(nearbyResults.slice(0, 8));
          setFeaturedBusinesses(featuredResults);
          // Fetch subcollection photos for businesses without top-level photos
          const allBiz = [...nearbyResults.slice(0, 8), ...featuredResults];
          const needPhotos = allBiz.filter((b) => !b.photos?.length && b.id);
          if (needPhotos.length > 0) {
            const thumbMap: Record<string, string> = {};
            await Promise.all(needPhotos.map(async (b) => {
              try {
                const subPhotos = await getBusinessPhotos(b.id);
                if (subPhotos.length > 0) thumbMap[b.id] = subPhotos[0].url;
              } catch {}
            }));
            setBizThumbnails(thumbMap);
          }
          if (user) {
            const profile = await getUserProfile(user.id);
            setIsChecked(profile?.checkedDishes?.includes(found.rank) || false);
          }
        }
      } catch (err) {
        console.error("Failed to load dish:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, user]);

  // Build / update Google Map whenever businesses, sort, or user location changes
  useEffect(() => {
    if (!nearbyBusinesses.length || !mapRef.current) return;

    const sorted = [...nearbyBusinesses].sort((a, b) => {
      if (sortBy === "distance" && userLocation) {
        return (
          haversineDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude) -
          haversineDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
        );
      }
      return b.rating - a.rating;
    });

    const initOrUpdateMap = () => {
      const g = (window as any).google;
      if (!g?.maps || !mapRef.current) return;

      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      const bounds = new g.maps.LatLngBounds();
      sorted.forEach((b: Business) => bounds.extend({ lat: b.latitude, lng: b.longitude }));

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new g.maps.Map(mapRef.current, {
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });
      }
      mapInstanceRef.current.fitBounds(bounds, { top: 32, right: 32, bottom: 32, left: 32 });

      sorted.forEach((biz: Business, i: number) => {
        const marker = new g.maps.Marker({
          position: { lat: biz.latitude, lng: biz.longitude },
          map: mapInstanceRef.current,
          label: { text: String(i + 1), color: "white", fontSize: "11px", fontWeight: "bold" },
          title: biz.name,
        });
        markersRef.current.push(marker);
      });
    };

    const w = window as any;
    if (w.google?.maps) {
      initOrUpdateMap();
    } else {
      const scriptId = "google-maps-js";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`;
        script.async = true;
        script.onload = initOrUpdateMap;
        document.head.appendChild(script);
      } else {
        const poll = setInterval(() => {
          if ((window as any).google?.maps) {
            clearInterval(poll);
            initOrUpdateMap();
          }
        }, 150);
        return () => clearInterval(poll);
      }
    }
  }, [nearbyBusinesses, sortBy, userLocation]);

  const handleToggleCheck = async () => {
    if (!user) { router.push("/login"); return; }
    if (!dish) return;
    const newState = await toggleDishChecked(user.id, dish.rank);
    setIsChecked(newState);
    if (newState) {
      setMessage("+5 Đồng earned!");
      await refreshProfile();
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const makeDishSlug = (d: MonVietDish) => {
    const s = d.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[đ]/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${d.rank}-${s}`;
  };

  const sortedBusinesses = [...nearbyBusinesses].sort((a, b) => {
    if (sortBy === "distance" && userLocation) {
      return (
        haversineDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude) -
        haversineDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
      );
    }
    return b.rating - a.rating;
  });

  // ── Loading / not found ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="ls-container py-3xl animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-2xl">
          <div>
            <div className="h-[280px] bg-ls-surface rounded-card mb-xl" />
            <div className="h-6 bg-ls-surface rounded w-1/2 mb-md" />
            <div className="h-4 bg-ls-surface rounded w-3/4" />
          </div>
          <div>
            <div className="h-[280px] bg-ls-surface rounded-card mb-md" />
            <div className="h-4 bg-ls-surface rounded w-1/3 mb-sm" />
            <div className="h-16 bg-ls-surface rounded mb-sm" />
            <div className="h-16 bg-ls-surface rounded mb-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="ls-container py-3xl text-center">
        <h1 className="text-page-title text-ls-primary">Food Not Found</h1>
        <Link href="/guide" className="ls-btn inline-block mt-lg">Back to Top 50</Link>
      </div>
    );
  }

  const currentIndex = allDishes.findIndex((d) => d.rank === dish.rank);
  const prevDish = currentIndex > 0 ? allDishes[currentIndex - 1] : null;
  const nextDish = currentIndex < allDishes.length - 1 ? allDishes[currentIndex + 1] : null;

  const MEDALS: Record<number, { bg: string; label: string }> = {
    0: { bg: "bg-amber-400", label: "1st" },
    1: { bg: "bg-slate-400", label: "2nd" },
    2: { bg: "bg-amber-700", label: "3rd" },
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ls-container py-2xl">
      {/* Admin floating edit button */}
      {user?.role === "admin" && (
        <Link
          href={`/admin/guide?dish=${dish.rank}`}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-ls-primary text-white flex items-center gap-xs pl-sm pr-md py-sm rounded-r-btn shadow-lg hover:bg-ls-primary/90 transition-colors"
        >
          <Pencil size={13} />
          <span className="text-[12px] font-semibold">Edit</span>
        </Link>
      )}

      {message && (
        <div className="mb-lg p-md bg-green-50 border border-green-200 rounded-btn text-[13px] text-green-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-2xl">

        {/* ── LEFT COLUMN ── */}
        <div>
          {/* Hero — contained in column */}
          <div className="relative h-[260px] md:h-[340px] rounded-card overflow-hidden bg-ls-surface mb-xl">
            {dish.photoURL ? (
              <Image src={dish.photoURL} alt={dish.name} fill className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <UtensilsCrossed size={48} className="text-ls-secondary" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

            {/* Prev / Next arrows */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-md">
              {prevDish ? (
                <Link href={`/guide/${makeDishSlug(prevDish)}`} className="w-[36px] h-[36px] bg-white/90 rounded-full flex items-center justify-center shadow">
                  <ChevronLeft size={20} />
                </Link>
              ) : <div />}
              {nextDish ? (
                <Link href={`/guide/${makeDishSlug(nextDish)}`} className="w-[36px] h-[36px] bg-white/90 rounded-full flex items-center justify-center shadow">
                  <ChevronRight size={20} />
                </Link>
              ) : <div />}
            </div>

            {/* Rank badge */}
            <div className="absolute top-lg left-lg bg-ls-primary text-white rounded-badge px-md py-xs">
              <span className="text-tag font-semibold">#{dish.rank} of 50</span>
            </div>

            {/* Dish name overlay */}
            <div className="absolute bottom-md left-lg right-lg">
              <h1 className="text-[24px] md:text-[28px] font-bold text-white leading-tight drop-shadow">{dish.name}</h1>
              <p className="text-[15px] text-white/80">{dish.englishName}</p>
            </div>
          </div>

          {/* Pronunciation + Mark as tried */}
          <div className="flex items-center justify-between gap-md mb-lg">
            <div>
              {dish.pronunciation && (
                <p className="text-meta text-ls-secondary italic">🗣 {dish.pronunciation}</p>
              )}
              <span className="ls-tag mt-xs inline-block">{dish.sectionTitleViet || dish.section}</span>
            </div>
            <button
              onClick={handleToggleCheck}
              className={`flex-shrink-0 flex items-center gap-sm px-lg py-sm rounded-btn border-2 text-[13px] font-semibold transition-colors ${
                isChecked
                  ? "bg-ls-primary border-ls-primary text-white"
                  : "bg-white border-ls-border text-ls-secondary hover:border-ls-primary"
              }`}
            >
              <Check size={16} />
              {isChecked ? "Tried it!" : "Mark as tried"}
            </button>
          </div>

          {isChecked && (
            <p className="text-meta text-green-600 font-semibold mb-lg">
              ✓ Bạn Đã Thử! You've tried this food.
            </p>
          )}

          {/* Description */}
          <p className="text-body text-ls-body leading-relaxed">
            {dish.description || dish.shortDescription}
          </p>

          {/* History */}
          {dish.history && (
            <div className="mt-xl">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-[13px] font-semibold text-ls-primary hover:underline"
              >
                {showHistory ? "Hide History ↑" : "History & Culture ↓"}
              </button>
              {showHistory && (
                <div className="mt-md p-lg bg-ls-surface rounded-card">
                  <p className="text-body text-ls-body leading-relaxed">{dish.history}</p>
                </div>
              )}
            </div>
          )}

          {/* Best of Little Saigon */}
          {featuredBusinesses.length > 0 && (
            <div className="mt-2xl">
              <div className="flex items-center gap-sm mb-md">
                <Trophy size={15} className="text-amber-500" />
                <h2 className="text-[15px] font-semibold text-ls-primary">Best of Little Saigon</h2>
              </div>
              <div className="space-y-sm">
                {featuredBusinesses.map((biz, i) => {
                  const medal = MEDALS[i] || { bg: "bg-ls-primary", label: `#${i + 1}` };
                  return (
                    <Link
                      key={biz.id}
                      href={`/business/${businessSlug(biz)}`}
                      className="ls-card flex items-center gap-md group hover:shadow-md transition-shadow"
                    >
                      <div className="relative w-[150px] h-[150px] rounded-[8px] overflow-hidden bg-ls-surface flex-shrink-0">
                        {(biz.photos?.[0] || bizThumbnails[biz.id]) ? (
                          <Image src={biz.photos?.[0] || bizThumbnails[biz.id]} alt={biz.name} width={300} height={300} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin size={28} className="text-ls-secondary" />
                          </div>
                        )}
                        <div className={`absolute top-1.5 left-1.5 w-[28px] h-[28px] rounded-full flex items-center justify-center text-[11px] font-bold text-white ${medal.bg}`}>
                          {medal.label}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-ls-primary truncate group-hover:underline">{biz.name}</p>
                        <p className="text-[12px] text-ls-secondary truncate">{biz.address}</p>
                      </div>
                      <ArrowRight size={16} className="text-ls-secondary flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Back link */}
          <div className="mt-2xl">
            <Link href="/guide" className="text-meta text-ls-secondary hover:text-ls-primary transition-colors">
              ← Back to Top 50 Món Việt
            </Link>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>
          {/* Google Map */}
          <div
            ref={mapRef}
            className="w-full h-[280px] rounded-card overflow-hidden bg-ls-surface mb-md"
          >
            {nearbyBusinesses.length === 0 && !loading && (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin size={32} className="text-ls-secondary opacity-30" />
              </div>
            )}
          </div>

          {nearbyBusinesses.length === 0 ? (
            <div className="ls-card text-center py-xl">
              <p className="text-body text-ls-secondary text-[13px]">No nearby businesses found.</p>
              <Link href="/explore" className="ls-btn inline-block mt-md text-[13px]">Browse Businesses</Link>
            </div>
          ) : (
            <>
              {/* Header + sort toggle */}
              <div className="flex items-center justify-between mb-md">
                <div className="flex items-center gap-sm">
                  <MapPin size={15} className="text-ls-primary" />
                  <h2 className="text-[15px] font-semibold text-ls-primary">Find It Nearby</h2>
                </div>
                <div className="flex rounded-btn border border-ls-border overflow-hidden text-[12px] font-semibold">
                  <button
                    onClick={() => setSortBy("rating")}
                    className={`px-md py-xs transition-colors ${
                      sortBy === "rating" ? "bg-ls-primary text-white" : "text-ls-secondary hover:bg-ls-surface"
                    }`}
                  >
                    Top Rated
                  </button>
                  <button
                    onClick={() => setSortBy("distance")}
                    className={`px-md py-xs transition-colors ${
                      sortBy === "distance" ? "bg-ls-primary text-white" : "text-ls-secondary hover:bg-ls-surface"
                    }`}
                  >
                    Nearest
                  </button>
                </div>
              </div>

              {/* Business list */}
              <div className="space-y-sm">
                {sortedBusinesses.map((biz, i) => {
                  const dist = userLocation
                    ? haversineDistance(userLocation.lat, userLocation.lng, biz.latitude, biz.longitude)
                    : null;
                  return (
                    <Link
                      key={biz.id}
                      href={`/business/${businessSlug(biz)}`}
                      className="ls-card flex items-center gap-md group hover:shadow-md transition-shadow"
                    >
                      <div className="w-[75px] h-[75px] rounded-[8px] overflow-hidden bg-ls-surface flex-shrink-0">
                        {(biz.photos?.[0] || bizThumbnails[biz.id]) ? (
                          <Image src={biz.photos?.[0] || bizThumbnails[biz.id]} alt={biz.name} width={150} height={150} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin size={20} className="text-ls-secondary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-ls-primary truncate group-hover:underline">
                          {biz.name}
                        </p>
                        <div className="flex items-center gap-xs flex-wrap mt-[2px]">
                          <span className="text-[12px] text-amber-500 font-semibold">★ {biz.rating.toFixed(1)}</span>
                          {dist !== null && (
                            <>
                              <span className="text-ls-border text-[10px]">·</span>
                              <span className="text-[12px] text-ls-secondary flex items-center gap-[2px]">
                                <Navigation size={10} />
                                {formatDistance(dist)}
                              </span>
                            </>
                          )}
                          <span className="text-ls-border text-[10px]">·</span>
                          <span className="text-[12px] text-ls-secondary capitalize">{biz.category}</span>
                        </div>
                        <p className="text-[12px] text-ls-secondary truncate mt-[2px]">{biz.address}</p>
                      </div>
                      <ArrowRight size={15} className="text-ls-secondary flex-shrink-0 group-hover:text-ls-primary transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {/* Next dish button */}
          {nextDish && (
            <Link
              href={`/guide/${makeDishSlug(nextDish)}`}
              className="mt-lg flex items-center justify-between w-full ls-card hover:shadow-md transition-shadow group"
            >
              <div>
                <p className="text-[11px] text-ls-secondary uppercase tracking-wider">Next up</p>
                <p className="text-[15px] font-semibold text-ls-primary mt-[2px]">
                  #{nextDish.rank} {nextDish.name}
                </p>
                <p className="text-[12px] text-ls-secondary">{nextDish.englishName}</p>
              </div>
              <ArrowRight size={20} className="text-ls-secondary group-hover:text-ls-primary transition-colors flex-shrink-0" />
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}

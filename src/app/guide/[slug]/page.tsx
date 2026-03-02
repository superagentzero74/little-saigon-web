"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, UtensilsCrossed, Search, Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { MonVietDish, Business } from "@/lib/types";
import { getDishes, searchBusinesses, toggleDishChecked, getUserProfile } from "@/lib/services";
import BusinessCard from "@/components/business/BusinessCard";

export default function DishDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, refreshProfile } = useAuth();

  const [dish, setDish] = useState<MonVietDish | null>(null);
  const [allDishes, setAllDishes] = useState<MonVietDish[]>([]);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<Business[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    setShowHistory(false);
    async function load() {
      try {
        const dishes = await getDishes();
        setAllDishes(dishes);
        const rank = parseInt(slug.split("-")[0], 10);
        const found = dishes.find((d) => d.rank === rank);

        if (found) {
          setDish(found);
          if (found.searchQuery) {
            const results = await searchBusinesses(found.searchQuery);
            setNearbyBusinesses(results.slice(0, 6));
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

  const handleToggleCheck = async () => {
    if (!user) { router.push("/login"); return; }
    if (!dish) return;
    const newState = await toggleDishChecked(user.id, dish.rank);
    setIsChecked(newState);
    if (newState) {
      setMessage("+5 points earned!");
      await refreshProfile();
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const makeDishSlug = (d: MonVietDish) => {
    const s = d.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[đ]/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${d.rank}-${s}`;
  };

  if (loading) {
    return (
      <div className="ls-container py-3xl animate-pulse">
        <div className="h-[300px] bg-ls-surface rounded-card mb-2xl" />
        <div className="h-8 bg-ls-surface rounded w-1/2 mb-md" />
        <div className="h-4 bg-ls-surface rounded w-3/4" />
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="ls-container py-3xl text-center">
        <h1 className="text-page-title text-ls-primary">Dish Not Found</h1>
        <Link href="/guide" className="ls-btn inline-block mt-lg">Back to Top 50</Link>
      </div>
    );
  }

  const currentIndex = allDishes.findIndex((d) => d.rank === dish.rank);
  const prevDish = currentIndex > 0 ? allDishes[currentIndex - 1] : null;
  const nextDish = currentIndex < allDishes.length - 1 ? allDishes[currentIndex + 1] : null;

  return (
    <div>
      {/* Hero */}
      <div className="relative h-[260px] md:h-[380px] bg-ls-surface">
        {dish.photoURL ? (
          <Image src={dish.photoURL} alt={dish.name} fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed size={48} className="text-ls-secondary" />
          </div>
        )}
        {/* Gradient overlay */}
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

      {/* Two-column layout */}
      <div className="ls-container py-2xl">
        {message && (
          <div className="mb-lg p-md bg-green-50 border border-green-200 rounded-btn text-[13px] text-green-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-2xl">

          {/* Left column — dish info */}
          <div>
            {/* Pronunciation + check-off */}
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
                ✓ Bạn Đã Thử! You've tried this dish.
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

            {/* Back link */}
            <div className="mt-2xl">
              <Link href="/guide" className="text-meta text-ls-secondary hover:text-ls-primary transition-colors">
                ← Back to Top 50 Món Việt
              </Link>
            </div>
          </div>

          {/* Right column — Find It Nearby */}
          <div>
            <div className="flex items-center gap-sm mb-md">
              <Search size={16} className="text-ls-primary" />
              <h2 className="text-[15px] font-semibold text-ls-primary">Find It Nearby</h2>
            </div>

            {nearbyBusinesses.length === 0 ? (
              <div className="ls-card text-center py-xl">
                <p className="text-body text-ls-secondary text-[13px]">No nearby businesses found.</p>
                <Link href="/explore" className="ls-btn inline-block mt-md text-[13px]">Browse Businesses</Link>
              </div>
            ) : (
              <div className="space-y-sm">
                {nearbyBusinesses.map((biz) => (
                  <BusinessCard key={biz.id} business={biz} />
                ))}
              </div>
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
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, UtensilsCrossed, Search, Check } from "lucide-react";
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

  const makeDishSlug = (d: MonVietDish) => {
    const s = d.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[đ]/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${d.rank}-${s}`;
  };

  return (
    <div>
      {/* Hero */}
      <div className="relative h-[250px] md:h-[350px] bg-ls-surface">
        {dish.photoURL ? (
          <Image src={dish.photoURL} alt={dish.name} fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed size={48} className="text-ls-secondary" />
          </div>
        )}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-md">
          {prevDish ? (
            <Link href={`/guide/${makeDishSlug(prevDish)}`} className="w-[36px] h-[36px] bg-white/90 rounded-full flex items-center justify-center">
              <ChevronLeft size={20} />
            </Link>
          ) : <div />}
          {nextDish ? (
            <Link href={`/guide/${makeDishSlug(nextDish)}`} className="w-[36px] h-[36px] bg-white/90 rounded-full flex items-center justify-center">
              <ChevronRight size={20} />
            </Link>
          ) : <div />}
        </div>
        <div className="absolute top-lg left-lg bg-ls-primary text-white rounded-badge px-md py-xs">
          <span className="text-tag font-semibold">#{dish.rank}</span>
        </div>
      </div>

      <div className="ls-container py-2xl max-w-3xl mx-auto">
        {message && (
          <div className="mb-lg p-md bg-green-50 border border-green-200 rounded-btn text-[13px] text-green-700">
            {message}
          </div>
        )}

        <div className="flex items-start justify-between gap-md">
          <div>
            <span className="ls-tag">{dish.sectionTitleViet || dish.section}</span>
            <h1 className="text-[28px] md:text-[32px] font-bold text-ls-primary mt-sm">{dish.name}</h1>
            <p className="text-[18px] text-ls-secondary mt-xs">{dish.englishName}</p>
            {dish.pronunciation && (
              <p className="text-meta text-ls-secondary mt-sm italic">🗣 {dish.pronunciation}</p>
            )}
          </div>

          {/* Check-off button */}
          <button
            onClick={handleToggleCheck}
            className={`flex-shrink-0 w-[48px] h-[48px] rounded-full flex items-center justify-center border-2 transition-colors ${
              isChecked
                ? "bg-ls-primary border-ls-primary text-white"
                : "bg-white border-ls-border text-ls-secondary hover:border-ls-primary"
            }`}
          >
            <Check size={24} />
          </button>
        </div>

        {isChecked && (
          <p className="text-meta text-green-600 font-semibold mt-sm">
            ✓ Bạn Đã Thử! You've tried this dish.
          </p>
        )}

        <div className="mt-2xl">
          <p className="text-body text-ls-body leading-relaxed">{dish.description || dish.shortDescription}</p>
        </div>

        {dish.history && (
          <div className="mt-2xl">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-meta font-semibold text-ls-primary hover:underline"
            >
              {showHistory ? "Hide History" : "Learn More — History & Culture"}
            </button>
            {showHistory && (
              <div className="mt-md p-lg bg-ls-surface rounded-card">
                <p className="text-body text-ls-body leading-relaxed">{dish.history}</p>
              </div>
            )}
          </div>
        )}

        {/* Find It Nearby */}
        <div className="mt-3xl">
          <div className="flex items-center gap-sm mb-lg">
            <Search size={18} className="text-ls-primary" />
            <h2 className="text-section-header text-ls-primary">Find It Nearby</h2>
          </div>
          {nearbyBusinesses.length === 0 ? (
            <div className="ls-card text-center py-2xl">
              <p className="text-body text-ls-secondary">No nearby businesses found for this dish.</p>
              <Link href="/explore" className="ls-btn inline-block mt-lg">Browse Businesses</Link>
            </div>
          ) : (
            <div className="space-y-sm">
              {nearbyBusinesses.map((biz) => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-3xl text-center">
          <Link href="/guide" className="ls-btn-secondary inline-block">← Back to Top 50 Món Việt</Link>
        </div>
      </div>
    </div>
  );
}

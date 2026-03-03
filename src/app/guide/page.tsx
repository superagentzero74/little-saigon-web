"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDishes } from "@/lib/services";
import type { MonVietDish } from "@/lib/types";
import DishCard from "@/components/guide/DishCard";

export default function GuidePage() {
  const [dishes, setDishes] = useState<MonVietDish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const allDishes = await getDishes();
        setDishes(allDishes);
      } catch (err) {
        console.error("Failed to load dishes:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="ls-container py-3xl">
      {/* Header */}
      <div className="mb-3xl">
        <p className="text-meta text-ls-secondary uppercase tracking-widest mb-xs">
          The Essential Guide
        </p>
        <h1 className="text-page-title text-ls-primary">
          Top 50 Món Việt
        </h1>
        <p className="text-body text-ls-body mt-sm max-w-2xl">
          50 essential Vietnamese dishes every food lover should try. From classic
          phở to crispy bánh xèo — explore the flavors of Vietnam right here in
          Little Saigon.
        </p>
      </div>

      {/* Dish List */}
      {loading ? (
        <div className="space-y-md">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="ls-card flex items-center gap-lg animate-pulse">
              <div className="w-[32px] h-6 bg-ls-surface rounded" />
              <div className="w-[52px] h-[52px] rounded-[8px] bg-ls-surface" />
              <div className="flex-1">
                <div className="h-4 bg-ls-surface rounded w-1/3" />
                <div className="h-3 bg-ls-surface rounded w-1/4 mt-sm" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} variant="full" />
          ))}
        </div>
      )}
    </div>
  );
}

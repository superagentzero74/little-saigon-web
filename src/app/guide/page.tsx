"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDishes } from "@/lib/services";
import type { MonVietDish } from "@/lib/types";
import { DISH_SECTIONS } from "@/lib/types";
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

  // Group dishes by section
  const grouped = DISH_SECTIONS.map((section) => ({
    ...section,
    dishes: dishes.filter((d) => d.section === section.key),
  }));

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

      {/* Section Navigation */}
      <div className="flex gap-sm overflow-x-auto pb-lg mb-2xl scrollbar-hide">
        {DISH_SECTIONS.map((section) => (
          <a
            key={section.key}
            href={`#${section.key}`}
            className="ls-pill whitespace-nowrap"
          >
            {section.titleViet}
          </a>
        ))}
      </div>

      {/* Dish Sections */}
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
        <div className="space-y-3xl">
          {grouped.map(
            (section) =>
              section.dishes.length > 0 && (
                <div key={section.key} id={section.key}>
                  <div className="mb-lg">
                    <h2 className="text-section-header text-ls-primary">
                      {section.title}
                    </h2>
                    <p className="text-meta text-ls-secondary">
                      {section.titleViet} · {section.range}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                    {section.dishes.map((dish) => (
                      <DishCard key={dish.id} dish={dish} variant="full" />
                    ))}
                  </div>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}

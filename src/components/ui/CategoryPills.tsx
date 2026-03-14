"use client";

import type { BusinessCategory } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

interface CategoryPillsProps {
  selected?: BusinessCategory | null;
  onSelect: (category: BusinessCategory | null) => void;
  visibleCategories?: BusinessCategory[];
  showIcons?: boolean;
}

export default function CategoryPills({ selected, onSelect, visibleCategories, showIcons = true }: CategoryPillsProps) {
  const allCategories = Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][];
  const categories = visibleCategories
    ? allCategories.filter(([key]) => visibleCategories.includes(key))
    : allCategories;

  return (
    <div className="flex gap-sm overflow-x-auto pb-sm scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={selected === null || selected === undefined ? "ls-pill-active" : "ls-pill"}
      >
        All
      </button>
      {categories.map(([key, { label, icon }]) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`${selected === key ? "ls-pill-active" : "ls-pill"} whitespace-nowrap`}
        >
          {showIcons && <>{icon} </>}{label}
        </button>
      ))}
    </div>
  );
}

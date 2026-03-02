"use client";

import type { BusinessCategory } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

interface CategoryPillsProps {
  selected?: BusinessCategory | null;
  onSelect: (category: BusinessCategory | null) => void;
}

export default function CategoryPills({ selected, onSelect }: CategoryPillsProps) {
  const categories = Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][];

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
          {icon} {label}
        </button>
      ))}
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import type { MonVietDish } from "@/lib/types";
import { dishSlug } from "@/lib/utils";
import { UtensilsCrossed } from "lucide-react";

interface DishCardProps {
  dish: MonVietDish;
  variant?: "compact" | "full";
}

export default function DishCard({ dish, variant = "full" }: DishCardProps) {
  const slug = dishSlug(dish.rank, dish.name);

  if (variant === "compact") {
    // Small 80x80 card for HomeView teaser row
    return (
      <Link
        href={`/guide/${slug}`}
        className="flex-shrink-0 w-[180px] group text-center"
      >
        <div className="w-[160px] h-[160px] mx-auto rounded-card overflow-hidden bg-ls-surface border border-ls-border">
          {dish.photoURL ? (
            <Image
              src={dish.photoURL}
              alt={dish.name}
              width={320}
              height={320}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UtensilsCrossed size={36} className="text-ls-secondary" />
            </div>
          )}
        </div>
        <p className="text-[13px] font-medium text-ls-primary mt-xs truncate px-xs">
          {dish.name}
        </p>
        <p className="text-[11px] text-ls-secondary truncate px-xs">
          {dish.englishName}
        </p>
      </Link>
    );
  }

  // Full list row — for MonVietGuideView
  return (
    <Link
      href={`/guide/${slug}`}
      className="ls-card flex items-center gap-lg group"
    >
      {/* Thumbnail */}
      <div className="w-[208px] h-[208px] rounded-[8px] overflow-hidden bg-ls-surface flex-shrink-0">
        {dish.photoURL ? (
          <Image
            src={dish.photoURL}
            alt={dish.name}
            width={416}
            height={416}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed size={48} className="text-ls-secondary" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-semibold text-ls-primary truncate">
          {dish.name}
        </h3>
        <p className="text-meta text-ls-secondary truncate">
          {dish.englishName}
        </p>
      </div>
    </Link>
  );
}

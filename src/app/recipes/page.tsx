"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getPublishedRecipes } from "@/lib/recipes/queries";
import type { Recipe, RecipeCategory, RecipeRegion } from "@/lib/types/recipe";

const CATEGORIES: { value: RecipeCategory; label: string }[] = [
  { value: "pho", label: "Pho" },
  { value: "bun", label: "Bun" },
  { value: "com", label: "Com" },
  { value: "banh", label: "Banh" },
  { value: "che", label: "Che" },
  { value: "do-uong", label: "Drinks" },
  { value: "mon-chay", label: "Vegetarian" },
  { value: "mon-nhau", label: "Appetizers" },
  { value: "goi", label: "Salads" },
  { value: "kho", label: "Braised" },
  { value: "canh", label: "Soups" },
  { value: "banh-ngot", label: "Sweets" },
];

const REGIONS: { value: RecipeRegion; label: string }[] = [
  { value: "mien-bac", label: "Northern" },
  { value: "mien-trung", label: "Central" },
  { value: "mien-nam", label: "Southern" },
];

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-[11px] font-medium px-[8px] py-[2px] rounded-full ${colors[difficulty] || "bg-ls-surface text-ls-secondary"}`}>
      {difficulty}
    </span>
  );
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [activeCategory, setActiveCategory] = useState<RecipeCategory | null>(null);
  const [activeRegion, setActiveRegion] = useState<RecipeRegion | null>(null);

  useEffect(() => {
    getPublishedRecipes({
      category: activeCategory || undefined,
      region: activeRegion || undefined,
    })
      .then((results) => {
        // Sort by featured + seedScore
        results.sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
          return b.seedScore - a.seedScore;
        });
        setRecipes(results);
      })
      .catch(() => setRecipes([]));
  }, [activeCategory, activeRegion]);

  return (
    <div className="ls-container ls-section">
      {/* Header */}
      <div className="mb-xl">
        <h1 className="text-page-title text-ls-primary">Recipes</h1>
        <p className="text-meta text-ls-secondary mt-xs">
          Authentic Vietnamese recipes from the heart of Little Saigon
        </p>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-xs mb-md">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-md py-xs text-[13px] rounded-full transition-colors ${
            !activeCategory
              ? "bg-ls-primary text-white"
              : "bg-ls-surface text-ls-secondary hover:text-ls-primary"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-md py-xs text-[13px] rounded-full transition-colors ${
              activeCategory === cat.value
                ? "bg-ls-primary text-white"
                : "bg-ls-surface text-ls-secondary hover:text-ls-primary"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Region filter pills */}
      <div className="flex flex-wrap gap-xs mb-xl">
        <button
          onClick={() => setActiveRegion(null)}
          className={`px-md py-xs text-[13px] rounded-full transition-colors ${
            !activeRegion
              ? "bg-ls-primary text-white"
              : "bg-ls-surface text-ls-secondary hover:text-ls-primary"
          }`}
        >
          All Regions
        </button>
        {REGIONS.map((reg) => (
          <button
            key={reg.value}
            onClick={() => setActiveRegion(reg.value)}
            className={`px-md py-xs text-[13px] rounded-full transition-colors ${
              activeRegion === reg.value
                ? "bg-ls-primary text-white"
                : "bg-ls-surface text-ls-secondary hover:text-ls-primary"
            }`}
          >
            {reg.label}
          </button>
        ))}
      </div>

      {/* Recipe grid */}
      {recipes === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full aspect-[16/9] bg-ls-surface rounded-card" />
              <div className="h-5 bg-ls-surface rounded mt-md w-3/4" />
              <div className="h-3 bg-ls-surface rounded mt-sm w-full" />
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-3xl">
          <p className="text-body text-ls-secondary">No recipes found. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.slug}`} className="group">
              <div className="ls-card overflow-hidden">
                {recipe.heroImage?.url ? (
                  <div className="relative w-full aspect-[16/9]">
                    <Image
                      src={recipe.heroImage.url}
                      alt={recipe.heroImage.alt || recipe.title.en}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[16/9] bg-ls-surface flex items-center justify-center">
                    <span className="text-ls-secondary text-[32px]">🍜</span>
                  </div>
                )}
                <div className="p-md">
                  <div className="flex items-center gap-xs mb-xs">
                    <span className="text-[10px] bg-ls-surface text-ls-secondary px-[6px] py-[1px] rounded-full">
                      {recipe.category}
                    </span>
                    <DifficultyBadge difficulty={recipe.difficulty} />
                  </div>
                  <h2 className="text-card-title text-ls-primary group-hover:text-ls-primary/80 transition-colors line-clamp-2">
                    {recipe.title.vi}
                  </h2>
                  {recipe.title.en !== recipe.title.vi && (
                    <p className="text-[13px] text-ls-secondary mt-[2px] line-clamp-1">
                      {recipe.title.en}
                    </p>
                  )}
                  <div className="flex items-center gap-sm mt-sm text-[12px] text-ls-secondary">
                    <span>{recipe.totalTimeMinutes} min</span>
                    <span>·</span>
                    <span>{recipe.baseServings} servings</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

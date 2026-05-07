"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPublishedRecipes } from "@/lib/recipes/queries";
import type { Recipe, RecipeRegion } from "@/lib/types/recipe";

const REGION_LABELS: Record<RecipeRegion, string> = {
  "mien-bac": "Northern Vietnam",
  "mien-trung": "Central Vietnam",
  "mien-nam": "Southern Vietnam",
};

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

export default function RecipeRegionPage() {
  const params = useParams();
  const region = params.region as RecipeRegion;
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);

  useEffect(() => {
    if (!region) return;
    getPublishedRecipes({ region })
      .then((results) => {
        results.sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
          return b.seedScore - a.seedScore;
        });
        setRecipes(results);
      })
      .catch(() => setRecipes([]));
  }, [region]);

  const label = REGION_LABELS[region] || region;

  return (
    <div className="ls-container ls-section">
      <div className="mb-xl">
        <Link href="/recipes" className="text-[13px] text-ls-secondary hover:text-ls-primary transition-colors">
          &larr; All Recipes
        </Link>
        <h1 className="text-page-title text-ls-primary mt-sm">{label} Recipes</h1>
      </div>

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
          <p className="text-body text-ls-secondary">No {label.toLowerCase()} recipes yet.</p>
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
                    <DifficultyBadge difficulty={recipe.difficulty} />
                  </div>
                  <h2 className="text-card-title text-ls-primary group-hover:text-ls-primary/80 transition-colors line-clamp-2">
                    {recipe.title.en}
                  </h2>
                  {recipe.title.vi !== recipe.title.en && (
                    <p className="text-[12px] text-ls-secondary mt-[2px] italic line-clamp-1">
                      {recipe.title.vi}
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

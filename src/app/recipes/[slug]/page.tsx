"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { getRecipeBySlug } from "@/lib/recipes/queries";
import { generateRecipeJsonLd } from "@/lib/recipes/schema-org";
import type { Recipe } from "@/lib/types/recipe";
import RecipeContent from "./RecipeContent";

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-[12px] font-medium px-[10px] py-[3px] rounded-full ${colors[difficulty] || "bg-ls-surface text-ls-secondary"}`}>
      {difficulty}
    </span>
  );
}

export default function RecipeSlugPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    getRecipeBySlug(slug)
      .then(setRecipe)
      .catch(() => setRecipe(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="ls-container ls-section">
        <div className="animate-pulse">
          <div className="w-full aspect-[16/9] max-h-[400px] bg-ls-surface rounded-card" />
          <div className="h-8 bg-ls-surface rounded mt-lg w-2/3" />
          <div className="h-4 bg-ls-surface rounded mt-md w-1/2" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="ls-container ls-section text-center py-3xl">
        <p className="text-body text-ls-secondary">Recipe not found.</p>
      </div>
    );
  }

  const jsonLd = generateRecipeJsonLd(recipe, "en");

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="ls-container ls-section max-w-4xl mx-auto">
        {/* Hero image */}
        {recipe.heroImage?.url && (
          <div className="relative w-full aspect-[16/9] max-h-[400px] rounded-card overflow-hidden mb-lg">
            <Image
              src={recipe.heroImage.url}
              alt={recipe.heroImage.alt || recipe.title.en}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-page-title text-ls-primary">{recipe.title.vi}</h1>
        {recipe.title.en !== recipe.title.vi && (
          <p className="text-[16px] text-ls-secondary mt-xs">{recipe.title.en}</p>
        )}

        {/* Author byline */}
        <div className="flex items-center gap-sm mt-md">
          {recipe.author.avatarUrl ? (
            <Image
              src={recipe.author.avatarUrl}
              alt={recipe.author.name}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-[32px] h-[32px] rounded-full bg-ls-primary text-white flex items-center justify-center font-semibold text-[13px]">
              {recipe.author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-[13px] text-ls-secondary">{recipe.author.name}</span>
        </div>

        {/* Metadata badges */}
        <div className="flex flex-wrap items-center gap-sm mt-md">
          <DifficultyBadge difficulty={recipe.difficulty} />
          <span className="text-[12px] text-ls-secondary bg-ls-surface px-[8px] py-[3px] rounded-full">
            Prep: {recipe.prepTimeMinutes} min
          </span>
          <span className="text-[12px] text-ls-secondary bg-ls-surface px-[8px] py-[3px] rounded-full">
            Cook: {recipe.cookTimeMinutes} min
          </span>
          <span className="text-[12px] text-ls-secondary bg-ls-surface px-[8px] py-[3px] rounded-full">
            Total: {recipe.totalTimeMinutes} min
          </span>
          <span className="text-[12px] text-ls-secondary bg-ls-surface px-[8px] py-[3px] rounded-full">
            {recipe.baseServings} servings
          </span>
        </div>

        {/* Description */}
        <p className="text-body text-ls-body mt-lg">{recipe.description.en}</p>

        {/* Interactive content */}
        <RecipeContent recipe={recipe} />
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { scaleIngredients, scaleAmount } from "@/lib/recipes/ingredient-scaling";
import type { Recipe, Ingredient } from "@/lib/types/recipe";

interface RecipeContentProps {
  recipe: Recipe;
}

function formatAmount(amount: number, unit?: string | null): string {
  const displayAmount = amount % 1 === 0 ? amount.toString() : amount.toFixed(2).replace(/\.?0+$/, "");
  return unit ? `${displayAmount} ${unit}` : displayAmount;
}

function interpolateStep(
  content: string,
  ingredients: Ingredient[],
): string {
  return content.replace(/\{(\d{4})\}/g, (_, id) => {
    const ing = ingredients.find((i) => i.id === id);
    if (!ing) return `{${id}}`;
    return `${formatAmount(ing.amount, ing.unit)} ${ing.name.en}`;
  });
}

export default function RecipeContent({ recipe }: RecipeContentProps) {
  const [servings, setServings] = useState(recipe.baseServings);

  const scaledIngredients = scaleIngredients(
    recipe.ingredients,
    recipe.baseServings,
    servings,
  );

  const decreaseServings = () => {
    if (servings > 1) setServings(servings - 1);
  };

  const increaseServings = () => {
    setServings(servings + 1);
  };

  return (
    <div className="mt-xl">
      {/* Servings Adjuster */}
      <div className="flex items-center gap-md mb-lg p-md bg-ls-surface rounded-card">
        <span className="text-[14px] font-medium text-ls-primary">Servings:</span>
        <button
          onClick={decreaseServings}
          disabled={servings <= 1}
          className="w-[32px] h-[32px] rounded-full border border-ls-border bg-white text-ls-primary font-bold text-[16px] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ls-primary hover:text-white transition-colors"
        >
          -
        </button>
        <span className="text-[16px] font-semibold text-ls-primary min-w-[24px] text-center">
          {servings}
        </span>
        <button
          onClick={increaseServings}
          className="w-[32px] h-[32px] rounded-full border border-ls-border bg-white text-ls-primary font-bold text-[16px] flex items-center justify-center hover:bg-ls-primary hover:text-white transition-colors"
        >
          +
        </button>
        {servings !== recipe.baseServings && (
          <button
            onClick={() => setServings(recipe.baseServings)}
            className="text-[12px] text-ls-secondary hover:text-ls-primary transition-colors ml-auto"
          >
            Reset
          </button>
        )}
      </div>

      {/* Ingredients */}
      <section className="mb-xl">
        <h2 className="text-[18px] font-semibold text-ls-primary mb-md">Ingredients</h2>
        <ul className="space-y-sm">
          {scaledIngredients.map((ing) => (
            <li key={ing.id} className="flex items-start gap-sm text-[14px]">
              <span className="w-[6px] h-[6px] rounded-full bg-ls-primary mt-[7px] shrink-0" />
              <div>
                <span className="font-medium text-ls-primary">
                  {formatAmount(ing.amount, ing.unit)}
                </span>{" "}
                <span className="text-ls-body">{ing.name.en}</span>
                {ing.name.vi !== ing.name.en && (
                  <span className="text-ls-secondary italic ml-[4px]">({ing.name.vi})</span>
                )}
                {ing.notes && (
                  <span className="text-ls-secondary text-[12px] ml-[4px]">— {ing.notes}</span>
                )}
                {ing.optional && (
                  <span className="text-[11px] text-ls-secondary ml-[4px]">(optional)</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Steps */}
      <section className="mb-xl">
        <h2 className="text-[18px] font-semibold text-ls-primary mb-md">Instructions</h2>
        <ol className="space-y-lg">
          {recipe.steps.map((step, index) => (
            <li key={step.id} className="flex gap-md">
              <div className="shrink-0 w-[28px] h-[28px] rounded-full bg-ls-primary text-white flex items-center justify-center text-[13px] font-semibold mt-[2px]">
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-medium text-ls-primary mb-xs">
                  {step.title.en}
                </h3>
                <p className="text-[14px] text-ls-body leading-relaxed">
                  {interpolateStep(step.content.en, scaledIngredients)}
                </p>
                {step.timerSeconds && (
                  <span className="inline-block mt-xs text-[12px] text-ls-secondary bg-ls-surface px-[8px] py-[2px] rounded-full">
                    Timer: {Math.floor(step.timerSeconds / 60)} min
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Tips */}
      {recipe.tips && recipe.tips.length > 0 && (
        <section className="mb-xl">
          <h2 className="text-[18px] font-semibold text-ls-primary mb-md">Tips</h2>
          <div className="space-y-sm">
            {recipe.tips.map((tip, index) => (
              <div key={index} className="p-md bg-ls-surface rounded-card">
                <span className="text-[11px] font-medium text-ls-secondary uppercase tracking-wider">
                  {tip.type}
                </span>
                <p className="text-[14px] text-ls-body mt-xs">{tip.content.en}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {recipe.notes && (
        <section className="mb-xl">
          <h2 className="text-[18px] font-semibold text-ls-primary mb-md">Notes</h2>
          <div className="text-[14px] text-ls-body leading-relaxed whitespace-pre-wrap p-md bg-ls-surface rounded-card">
            {recipe.notes}
          </div>
        </section>
      )}

      {/* Related businesses */}
      {recipe.relatedBusinesses && recipe.relatedBusinesses.length > 0 && (
        <section className="mb-xl">
          <h2 className="text-[18px] font-semibold text-ls-primary mb-md">Where to Try It</h2>
          <div className="flex flex-wrap gap-sm">
            {recipe.relatedBusinesses.map((bizId) => (
              <Link
                key={bizId}
                href={`/business/${bizId}`}
                className="text-[13px] text-ls-primary bg-ls-surface hover:bg-ls-primary hover:text-white px-md py-xs rounded-full transition-colors"
              >
                View Business
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

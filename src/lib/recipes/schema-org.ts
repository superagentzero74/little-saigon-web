import type { Recipe } from "../types/recipe";

/**
 * Generates a schema.org Recipe JSON-LD object for SEO rich results.
 * Reference: https://developers.google.com/search/docs/appearance/structured-data/recipe
 */
export function generateRecipeJsonLd(recipe: Recipe, locale: "vi" | "en" = "vi"): object {
  const title = recipe.title[locale] || recipe.title.vi;
  const description = recipe.description[locale] || recipe.description.vi;

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: title,
    description,
    image: buildImageArray(recipe),
    author: {
      "@type": "Person",
      name: recipe.author.name,
    },
    datePublished: recipe.publishedAt
      ? new Date(recipe.publishedAt.seconds * 1000).toISOString().split("T")[0]
      : undefined,
    prepTime: toIsoDuration(recipe.prepTimeMinutes),
    cookTime: toIsoDuration(recipe.cookTimeMinutes),
    totalTime: toIsoDuration(recipe.totalTimeMinutes),
    recipeYield: `${recipe.baseServings} servings`,
    recipeCategory: recipe.category,
    recipeCuisine: "Vietnamese",
    keywords: recipe.tags.join(", "),
    recipeIngredient: recipe.ingredients.map((ing) => {
      const name = ing.name[locale] || ing.name.vi;
      const unit = ing.unit || "";
      return `${ing.amount} ${unit} ${name}`.trim();
    }),
    recipeInstructions: recipe.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title[locale] || step.title.vi,
      text: step.content[locale] || step.content.vi,
      ...(step.imageUrl ? { image: step.imageUrl } : {}),
    })),
    ...(recipe.stats.avgRating && recipe.stats.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: recipe.stats.avgRating,
            ratingCount: recipe.stats.ratingCount,
          },
        }
      : {}),
  };
}

/**
 * Converts minutes to ISO 8601 duration string.
 * 45 → "PT45M", 90 → "PT1H30M", 0 → "PT0M"
 */
function toIsoDuration(minutes: number): string {
  if (minutes <= 0) return "PT0M";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `PT${hours}H${mins}M`;
  if (hours > 0) return `PT${hours}H`;
  return `PT${mins}M`;
}

/**
 * Builds image array for schema.org (prefers multiple aspect ratios).
 */
function buildImageArray(recipe: Recipe): string[] {
  const images: string[] = [recipe.heroImage.url];
  if (recipe.gallery) {
    for (const img of recipe.gallery) {
      images.push(img.url);
    }
  }
  return images;
}

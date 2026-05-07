import type { Ingredient } from "../types/recipe";

/**
 * Scales ingredient amounts by the ratio of new servings to base servings.
 * Returns a new array — does not mutate the input.
 */
export function scaleIngredients(
  ingredients: Ingredient[],
  baseServings: number,
  newServings: number,
): Ingredient[] {
  if (baseServings <= 0 || newServings <= 0) return ingredients;
  const ratio = newServings / baseServings;

  return ingredients.map((ing) => ({
    ...ing,
    amount: roundAmount(ing.amount * ratio),
  }));
}

/**
 * Scales a single amount value by the servings ratio.
 */
export function scaleAmount(
  amount: number,
  baseServings: number,
  newServings: number,
): number {
  if (baseServings <= 0 || newServings <= 0) return amount;
  return roundAmount(amount * (newServings / baseServings));
}

/**
 * Rounds to a reasonable precision for cooking measurements.
 * Avoids ugly floats like 1.3333333 — rounds to nearest 0.25.
 */
function roundAmount(value: number): number {
  // Round to nearest quarter for values under 10, otherwise nearest whole
  if (value < 10) {
    return Math.round(value * 4) / 4;
  }
  return Math.round(value);
}

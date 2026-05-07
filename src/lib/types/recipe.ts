// ============================================
// Little Saigon — Recipe Types
// Matches Firestore /recipes/{recipeId} schema
// ============================================

import { Timestamp } from "firebase/firestore";

// === Bilingual text ===

export type BilingualText = {
  vi: string;
  en: string;
};

// === Classification ===

export type RecipeCategory =
  | "pho"
  | "bun"
  | "com"
  | "banh"
  | "che"
  | "do-uong"
  | "mon-chay"
  | "mon-nhau"
  | "goi"
  | "kho"
  | "canh"
  | "banh-ngot";

export type RecipeCuisine = "vietnamese" | "fusion" | "vietnamese-american";

export type RecipeRegion = "mien-bac" | "mien-trung" | "mien-nam";

export type RecipeDifficulty = "easy" | "medium" | "hard";

export type RecipeStatus = "draft" | "review" | "published" | "archived";

export type IngredientUnit =
  | "g" | "kg" | "ml" | "l"
  | "tsp" | "tbsp" | "cup"
  | "oz" | "lb"
  | null;

export type IngredientCategory =
  | "protein" | "aromatic" | "spice"
  | "garnish" | "sauce" | "produce" | "other";

export type TipType = "technique" | "sourcing" | "substitution" | "storage" | "cultural";

// === Subtypes ===

export interface Ingredient {
  id: string;
  name: BilingualText;
  amount: number;
  unit?: IngredientUnit;
  notes?: string;
  category?: IngredientCategory;
  optional?: boolean;
}

export interface Step {
  id: string;
  title: BilingualText;
  content: BilingualText;
  timerSeconds?: number;
  imageUrl?: string;
  ingredientRefs?: string[];
}

export interface Tip {
  type: TipType;
  content: BilingualText;
}

export interface ImageRef {
  url: string;
  alt: string;
  credit?: string;
  width?: number;
  height?: number;
}

// === Main Recipe document ===

export interface Recipe {
  // Identity
  id: string;
  slug: string;

  // Core content (bilingual)
  title: BilingualText;
  description: BilingualText;

  // Classification
  cuisine: RecipeCuisine;
  region?: RecipeRegion;
  category: RecipeCategory;
  tags: string[];

  // Metadata
  difficulty: RecipeDifficulty;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  baseServings: number;
  servingSize?: string;

  // Structured recipe data
  ingredients: Ingredient[];
  steps: Step[];
  notes?: string;
  tips?: Tip[];

  // Media
  heroImage: ImageRef;
  gallery?: ImageRef[];
  videoUrl?: string;

  // Authorship (reuses blog persona)
  author: {
    personaId: string;
    name: string;
    avatarUrl: string;
  };

  // Publishing
  status: RecipeStatus;
  publishedAt?: Timestamp;
  updatedAt: Timestamp;
  createdAt: Timestamp;

  // SEO
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImageUrl?: string;
  };

  // Engagement stats
  stats: {
    views: number;
    saves: number;
    cooks: number;
    avgRating?: number;
    ratingCount: number;
  };

  // Đồng economy hooks (Phase 2)
  rewards?: {
    saveReward: number;
    cookReward: number;
    reviewReward: number;
  };

  // Business connections
  relatedBusinesses?: string[];
  ingredientSources?: {
    businessId: string;
    ingredients: string[];
  }[];

  // Localization
  locale: "vi" | "en" | "bilingual";

  // Featured/ranking
  isFeatured: boolean;
  seedScore: number;
}

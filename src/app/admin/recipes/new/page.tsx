"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import RecipeForm, { getDefaultFormData, RecipeFormData } from "../RecipeForm";
import { createRecipe } from "@/lib/recipes/queries";
import { Timestamp } from "firebase/firestore";

export default function NewRecipePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: RecipeFormData) => {
    setSaving(true);
    try {
      const recipeData: any = {
        title: data.title,
        description: data.description,
        slug: data.slug,
        cuisine: data.cuisine,
        region: data.region || undefined,
        category: data.category,
        tags: data.tags,
        difficulty: data.difficulty,
        prepTimeMinutes: data.prepTimeMinutes,
        cookTimeMinutes: data.cookTimeMinutes,
        totalTimeMinutes: data.totalTimeMinutes,
        baseServings: data.baseServings,
        ingredients: data.ingredients,
        steps: data.steps,
        heroImage: { url: data.heroImageUrl, alt: data.title.en },
        status: data.status,
        author: data.author,
        seo: { ...data.seo, keywords: [], ogImageUrl: data.heroImageUrl },
        stats: { views: 0, saves: 0, cooks: 0, ratingCount: 0 },
        locale: "bilingual",
        isFeatured: false,
        seedScore: 0,
      };
      if (data.status === "published") {
        recipeData.publishedAt = Timestamp.now();
      }
      await createRecipe(recipeData);
      router.push("/admin/recipes");
    } catch (e: any) {
      alert(e.message || "Failed to create recipe");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-xl">
      <div className="flex items-center gap-sm mb-lg">
        <Link href="/admin/recipes" className="text-ls-secondary hover:text-ls-primary">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-page-title text-ls-primary">New Recipe</h1>
      </div>
      <RecipeForm onSave={handleSave} saving={saving} />
    </div>
  );
}

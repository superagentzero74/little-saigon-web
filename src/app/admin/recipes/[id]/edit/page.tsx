"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import RecipeForm, { recipeToFormData, RecipeFormData } from "../../RecipeForm";
import { getRecipeById, updateRecipe } from "@/lib/recipes/queries";
import { Timestamp } from "firebase/firestore";
import type { Recipe } from "@/lib/types/recipe";

export default function EditRecipePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await getRecipeById(id);
      setRecipe(r);
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async (data: RecipeFormData) => {
    setSaving(true);
    try {
      const updateData: any = {
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
        seo: { ...data.seo, keywords: recipe?.seo?.keywords || [], ogImageUrl: data.heroImageUrl },
      };
      // Set publishedAt if publishing for the first time
      if (data.status === "published" && recipe?.status !== "published") {
        updateData.publishedAt = Timestamp.now();
      }
      await updateRecipe(id, updateData);
      router.push("/admin/recipes");
    } catch (e: any) {
      alert(e.message || "Failed to update recipe");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-xl flex justify-center py-xl">
        <Loader2 className="animate-spin text-ls-secondary" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="p-xl">
        <p className="text-[13px] text-ls-secondary">Recipe not found.</p>
        <Link href="/admin/recipes" className="text-[13px] text-ls-primary hover:underline mt-md inline-block">Back to recipes</Link>
      </div>
    );
  }

  return (
    <div className="p-xl">
      <div className="flex items-center gap-sm mb-lg">
        <Link href="/admin/recipes" className="text-ls-secondary hover:text-ls-primary">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-page-title text-ls-primary">Edit Recipe</h1>
      </div>
      <RecipeForm initialData={recipeToFormData(recipe)} onSave={handleSave} saving={saving} />
    </div>
  );
}

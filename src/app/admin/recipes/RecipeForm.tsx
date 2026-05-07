"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import type {
  Recipe, BilingualText, Ingredient, Step,
  RecipeCategory, RecipeCuisine, RecipeRegion, RecipeDifficulty, RecipeStatus,
  IngredientUnit, IngredientCategory,
} from "@/lib/types/recipe";
import { slugify } from "@/lib/recipes/slugify";

const inputClass =
  "bg-white border border-ls-border rounded px-[8px] py-[6px] text-[13px] outline-none focus:border-ls-primary w-full";

const CATEGORIES: { value: RecipeCategory; label: string }[] = [
  { value: "pho", label: "Phở (Noodle Soups)" },
  { value: "bun", label: "Bún (Vermicelli)" },
  { value: "com", label: "Cơm (Rice)" },
  { value: "banh", label: "Bánh (Banh Mi, Banh Xeo)" },
  { value: "che", label: "Chè (Desserts)" },
  { value: "do-uong", label: "Đồ Uống (Drinks)" },
  { value: "mon-chay", label: "Món Chay (Vegetarian)" },
  { value: "mon-nhau", label: "Món Nhậu (Appetizers)" },
  { value: "goi", label: "Gỏi (Salads)" },
  { value: "kho", label: "Kho (Braised)" },
  { value: "canh", label: "Canh (Soups)" },
  { value: "banh-ngot", label: "Bánh Ngọt (Sweets)" },
];

const CUISINES: { value: RecipeCuisine; label: string }[] = [
  { value: "vietnamese", label: "Vietnamese" },
  { value: "fusion", label: "Fusion" },
  { value: "vietnamese-american", label: "Vietnamese-American" },
];

const REGIONS: { value: RecipeRegion; label: string }[] = [
  { value: "mien-bac", label: "Miền Bắc (North)" },
  { value: "mien-trung", label: "Miền Trung (Central)" },
  { value: "mien-nam", label: "Miền Nam (South)" },
];

const DIFFICULTIES: { value: RecipeDifficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const UNITS: { value: IngredientUnit; label: string }[] = [
  { value: null, label: "(none)" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "l" },
  { value: "tsp", label: "tsp" },
  { value: "tbsp", label: "tbsp" },
  { value: "cup", label: "cup" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
];

const INGREDIENT_CATEGORIES: { value: IngredientCategory; label: string }[] = [
  { value: "protein", label: "Protein" },
  { value: "aromatic", label: "Aromatic" },
  { value: "spice", label: "Spice" },
  { value: "garnish", label: "Garnish" },
  { value: "sauce", label: "Sauce" },
  { value: "produce", label: "Produce" },
  { value: "other", label: "Other" },
];

// Form state type (no Timestamps, flat)
export interface RecipeFormData {
  title: BilingualText;
  description: BilingualText;
  slug: string;
  cuisine: RecipeCuisine;
  region: RecipeRegion | "";
  category: RecipeCategory;
  tags: string[];
  difficulty: RecipeDifficulty;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  baseServings: number;
  ingredients: Ingredient[];
  steps: Step[];
  heroImageUrl: string;
  status: RecipeStatus;
  author: { personaId: string; name: string; avatarUrl: string };
  seo: { metaTitle: string; metaDescription: string };
}

function emptyBilingual(): BilingualText {
  return { en: "", vi: "" };
}

function emptyIngredient(index: number): Ingredient {
  return {
    id: String(index + 1).padStart(4, "0"),
    name: emptyBilingual(),
    amount: 0,
    unit: null,
    category: "other",
    optional: false,
  };
}

function emptyStep(index: number): Step {
  return {
    id: `s${index + 1}`,
    title: emptyBilingual(),
    content: emptyBilingual(),
  };
}

export function getDefaultFormData(): RecipeFormData {
  return {
    title: emptyBilingual(),
    description: emptyBilingual(),
    slug: "",
    cuisine: "vietnamese",
    region: "",
    category: "pho",
    tags: [],
    difficulty: "medium",
    prepTimeMinutes: 0,
    cookTimeMinutes: 0,
    totalTimeMinutes: 0,
    baseServings: 4,
    ingredients: [emptyIngredient(0)],
    steps: [emptyStep(0)],
    heroImageUrl: "",
    status: "draft",
    author: { personaId: "", name: "", avatarUrl: "" },
    seo: { metaTitle: "", metaDescription: "" },
  };
}

export function recipeToFormData(recipe: Recipe): RecipeFormData {
  return {
    title: recipe.title,
    description: recipe.description,
    slug: recipe.slug,
    cuisine: recipe.cuisine,
    region: recipe.region || "",
    category: recipe.category,
    tags: recipe.tags,
    difficulty: recipe.difficulty,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    totalTimeMinutes: recipe.totalTimeMinutes,
    baseServings: recipe.baseServings,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    heroImageUrl: recipe.heroImage?.url || "",
    status: recipe.status,
    author: recipe.author,
    seo: { metaTitle: recipe.seo.metaTitle, metaDescription: recipe.seo.metaDescription },
  };
}

interface RecipeFormProps {
  initialData?: RecipeFormData;
  onSave: (data: RecipeFormData) => Promise<void>;
  saving?: boolean;
}

export default function RecipeForm({ initialData, onSave, saving }: RecipeFormProps) {
  const [form, setForm] = useState<RecipeFormData>(initialData || getDefaultFormData());
  const [tagInput, setTagInput] = useState("");

  const update = <K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateBilingual = (field: "title" | "description", lang: "en" | "vi", value: string) => {
    setForm((prev) => ({ ...prev, [field]: { ...prev[field], [lang]: value } }));
    if (field === "title" && lang === "en" && !initialData) {
      setForm((prev) => ({ ...prev, slug: slugify(value) }));
    }
  };

  // Auto-calculate total time
  const updateTime = (field: "prepTimeMinutes" | "cookTimeMinutes", value: number) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      updated.totalTimeMinutes = updated.prepTimeMinutes + updated.cookTimeMinutes;
      return updated;
    });
  };

  // Ingredients
  const addIngredient = () => {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, emptyIngredient(prev.ingredients.length)],
    }));
  };

  const removeIngredient = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx),
    }));
  };

  const updateIngredient = (idx: number, updates: Partial<Ingredient>) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => (i === idx ? { ...ing, ...updates } : ing)),
    }));
  };

  // Steps
  const addStep = () => {
    setForm((prev) => ({
      ...prev,
      steps: [...prev.steps, emptyStep(prev.steps.length)],
    }));
  };

  const removeStep = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== idx),
    }));
  };

  const updateStep = (idx: number, updates: Partial<Step>) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === idx ? { ...s, ...updates } : s)),
    }));
  };

  // Tags
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      update("tags", [...form.tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    update("tags", form.tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-lg">
      {/* Title (bilingual) */}
      <div className="ls-card p-lg">
        <h3 className="text-[14px] font-semibold text-ls-primary mb-md">Title & Description</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Title (EN)</label>
            <input className={inputClass} value={form.title.en} onChange={(e) => updateBilingual("title", "en", e.target.value)} placeholder="English title" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Title (VI)</label>
            <input className={inputClass} value={form.title.vi} onChange={(e) => updateBilingual("title", "vi", e.target.value)} placeholder="Tiếng Việt" />
          </div>
        </div>
        <div className="mb-md">
          <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Slug</label>
          <input className={inputClass + " max-w-md"} value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="url-slug" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Description (EN)</label>
            <textarea className={inputClass + " min-h-[80px]"} value={form.description.en} onChange={(e) => updateBilingual("description", "en", e.target.value)} placeholder="English description" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Description (VI)</label>
            <textarea className={inputClass + " min-h-[80px]"} value={form.description.vi} onChange={(e) => updateBilingual("description", "vi", e.target.value)} placeholder="Mô tả tiếng Việt" />
          </div>
        </div>
      </div>

      {/* Classification */}
      <div className="ls-card p-lg">
        <h3 className="text-[14px] font-semibold text-ls-primary mb-md">Classification</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Category</label>
            <select className={inputClass} value={form.category} onChange={(e) => update("category", e.target.value as RecipeCategory)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Cuisine</label>
            <select className={inputClass} value={form.cuisine} onChange={(e) => update("cuisine", e.target.value as RecipeCuisine)}>
              {CUISINES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Region</label>
            <select className={inputClass} value={form.region} onChange={(e) => update("region", e.target.value as RecipeRegion | "")}>
              <option value="">(none)</option>
              {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Difficulty</label>
            <select className={inputClass} value={form.difficulty} onChange={(e) => update("difficulty", e.target.value as RecipeDifficulty)}>
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Time & Servings */}
      <div className="ls-card p-lg">
        <h3 className="text-[14px] font-semibold text-ls-primary mb-md">Time & Servings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Prep (min)</label>
            <input className={inputClass} type="number" min={0} value={form.prepTimeMinutes} onChange={(e) => updateTime("prepTimeMinutes", Number(e.target.value))} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Cook (min)</label>
            <input className={inputClass} type="number" min={0} value={form.cookTimeMinutes} onChange={(e) => updateTime("cookTimeMinutes", Number(e.target.value))} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Total (auto)</label>
            <input className={inputClass + " bg-gray-50"} type="number" value={form.totalTimeMinutes} readOnly />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Servings</label>
            <input className={inputClass} type="number" min={1} value={form.baseServings} onChange={(e) => update("baseServings", Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="ls-card p-lg">
        <div className="flex items-center justify-between mb-md">
          <h3 className="text-[14px] font-semibold text-ls-primary">Ingredients</h3>
          <button type="button" onClick={addIngredient} className="flex items-center gap-[4px] text-[12px] text-ls-primary font-medium">
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="space-y-sm">
          {form.ingredients.map((ing, idx) => (
            <div key={idx} className="border border-ls-border rounded p-sm">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-xs items-end">
                <div className="md:col-span-2">
                  <label className="text-[10px] text-ls-secondary">Name (EN)</label>
                  <input className={inputClass} value={ing.name.en} onChange={(e) => updateIngredient(idx, { name: { ...ing.name, en: e.target.value } })} placeholder="English" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-ls-secondary">Name (VI)</label>
                  <input className={inputClass} value={ing.name.vi} onChange={(e) => updateIngredient(idx, { name: { ...ing.name, vi: e.target.value } })} placeholder="Tiếng Việt" />
                </div>
                <div>
                  <label className="text-[10px] text-ls-secondary">Amount</label>
                  <input className={inputClass} type="number" step="any" min={0} value={ing.amount} onChange={(e) => updateIngredient(idx, { amount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-[10px] text-ls-secondary">Unit</label>
                  <select className={inputClass} value={ing.unit || ""} onChange={(e) => updateIngredient(idx, { unit: (e.target.value || null) as IngredientUnit })}>
                    {UNITS.map((u) => <option key={u.label} value={u.value || ""}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-xs mt-xs items-end">
                <div>
                  <label className="text-[10px] text-ls-secondary">Category</label>
                  <select className={inputClass} value={ing.category || "other"} onChange={(e) => updateIngredient(idx, { category: e.target.value as IngredientCategory })}>
                    {INGREDIENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-xs pt-[14px]">
                  <input type="checkbox" checked={ing.optional || false} onChange={(e) => updateIngredient(idx, { optional: e.target.checked })} />
                  <span className="text-[11px] text-ls-secondary">Optional</span>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeIngredient(idx)} className="text-ls-secondary hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="ls-card p-lg">
        <div className="flex items-center justify-between mb-md">
          <h3 className="text-[14px] font-semibold text-ls-primary">Steps</h3>
          <button type="button" onClick={addStep} className="flex items-center gap-[4px] text-[12px] text-ls-primary font-medium">
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="space-y-sm">
          {form.steps.map((step, idx) => (
            <div key={idx} className="border border-ls-border rounded p-sm">
              <div className="flex items-center justify-between mb-xs">
                <span className="text-[11px] font-semibold text-ls-secondary">Step {idx + 1}</span>
                <button type="button" onClick={() => removeStep(idx)} className="text-ls-secondary hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xs mb-xs">
                <div>
                  <label className="text-[10px] text-ls-secondary">Title (EN)</label>
                  <input className={inputClass} value={step.title.en} onChange={(e) => updateStep(idx, { title: { ...step.title, en: e.target.value } })} placeholder="Step title" />
                </div>
                <div>
                  <label className="text-[10px] text-ls-secondary">Title (VI)</label>
                  <input className={inputClass} value={step.title.vi} onChange={(e) => updateStep(idx, { title: { ...step.title, vi: e.target.value } })} placeholder="Tiêu đề" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xs mb-xs">
                <div>
                  <label className="text-[10px] text-ls-secondary">Content (EN)</label>
                  <textarea className={inputClass + " min-h-[60px]"} value={step.content.en} onChange={(e) => updateStep(idx, { content: { ...step.content, en: e.target.value } })} placeholder="Instructions..." />
                </div>
                <div>
                  <label className="text-[10px] text-ls-secondary">Content (VI)</label>
                  <textarea className={inputClass + " min-h-[60px]"} value={step.content.vi} onChange={(e) => updateStep(idx, { content: { ...step.content, vi: e.target.value } })} placeholder="Hướng dẫn..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-xs">
                <div>
                  <label className="text-[10px] text-ls-secondary">Timer (seconds, optional)</label>
                  <input className={inputClass} type="number" min={0} value={step.timerSeconds || ""} onChange={(e) => updateStep(idx, { timerSeconds: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g. 300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Media & Author */}
      <div className="ls-card p-lg">
        <h3 className="text-[14px] font-semibold text-ls-primary mb-md">Media & Author</h3>
        <div className="mb-md">
          <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Hero Image URL</label>
          <input className={inputClass} value={form.heroImageUrl} onChange={(e) => update("heroImageUrl", e.target.value)} placeholder="https://..." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Author Name</label>
            <input className={inputClass} value={form.author.name} onChange={(e) => update("author", { ...form.author, name: e.target.value })} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Persona ID</label>
            <input className={inputClass} value={form.author.personaId} onChange={(e) => update("author", { ...form.author, personaId: e.target.value })} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Avatar URL</label>
            <input className={inputClass} value={form.author.avatarUrl} onChange={(e) => update("author", { ...form.author, avatarUrl: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="ls-card p-lg">
        <h3 className="text-[14px] font-semibold text-ls-primary mb-md">Tags</h3>
        <div className="flex gap-xs flex-wrap mb-xs">
          {form.tags.map((tag) => (
            <span key={tag} className="bg-ls-surface text-ls-primary text-[11px] px-[8px] py-[2px] rounded-full flex items-center gap-[4px]">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="text-ls-secondary hover:text-red-500"><X size={10} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-xs">
          <input
            className={inputClass + " max-w-[200px]"}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Add tag..."
          />
          <button type="button" onClick={addTag} className="text-[12px] text-ls-primary font-medium">Add</button>
        </div>
      </div>

      {/* SEO */}
      <div className="ls-card p-lg">
        <h3 className="text-[14px] font-semibold text-ls-primary mb-md">SEO</h3>
        <div className="grid grid-cols-1 gap-md">
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Meta Title</label>
            <input className={inputClass} value={form.seo.metaTitle} onChange={(e) => update("seo", { ...form.seo, metaTitle: e.target.value })} placeholder="SEO title" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Meta Description</label>
            <textarea className={inputClass + " min-h-[60px]"} value={form.seo.metaDescription} onChange={(e) => update("seo", { ...form.seo, metaDescription: e.target.value })} placeholder="SEO description" />
          </div>
        </div>
      </div>

      {/* Status & Save */}
      <div className="ls-card p-lg">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Status</label>
            <select className={inputClass + " w-auto"} value={form.status} onChange={(e) => update("status", e.target.value as RecipeStatus)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="ls-btn text-[13px] flex items-center gap-xs">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save Recipe
          </button>
        </div>
      </div>
    </form>
  );
}

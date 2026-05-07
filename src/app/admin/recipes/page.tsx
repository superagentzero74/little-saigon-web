"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Search, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { getAllRecipesAdmin, deleteRecipe } from "@/lib/recipes/queries";
import type { Recipe, RecipeStatus } from "@/lib/types/recipe";

const inputClass =
  "bg-white border border-ls-border rounded px-[8px] py-[6px] text-[13px] outline-none focus:border-ls-primary w-full";

const STATUS_COLORS: Record<RecipeStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  review: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-700",
  archived: "bg-red-100 text-red-600",
};

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<RecipeStatus | "all">("all");
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  const flash = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    const all = await getAllRecipesAdmin();
    setRecipes(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = recipes.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSearch = !filter || r.title.en.toLowerCase().includes(filter.toLowerCase()) || r.title.vi.toLowerCase().includes(filter.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recipe? This cannot be undone.")) return;
    try {
      await deleteRecipe(id);
      flash("Recipe deleted");
      await load();
    } catch (e: any) {
      flash(e.message || "Delete failed", true);
    }
  };

  return (
    <div className="p-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h1 className="text-page-title text-ls-primary">Recipes</h1>
          <p className="text-meta text-ls-secondary">{recipes.length} recipe{recipes.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/admin/recipes/new" className="ls-btn flex items-center gap-xs text-[13px]">
          <Plus size={14} /> New Recipe
        </Link>
      </div>

      {msg && (
        <div className={`mb-md px-md py-sm rounded text-[13px] ${msg.err ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-md items-center mb-md">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-ls-secondary" />
          <input
            className={inputClass + " pl-[30px]"}
            placeholder="Search recipes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <select
          className={inputClass + " w-auto"}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RecipeStatus | "all")}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-xl"><Loader2 className="animate-spin text-ls-secondary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-[13px] text-ls-secondary py-xl text-center">No recipes found</p>
      ) : (
        <div className="ls-card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ls-border bg-gray-50 text-left">
                <th className="px-md py-sm font-semibold text-ls-secondary text-[11px] uppercase">Title</th>
                <th className="px-md py-sm font-semibold text-ls-secondary text-[11px] uppercase">Category</th>
                <th className="px-md py-sm font-semibold text-ls-secondary text-[11px] uppercase">Status</th>
                <th className="px-md py-sm font-semibold text-ls-secondary text-[11px] uppercase">Difficulty</th>
                <th className="px-md py-sm font-semibold text-ls-secondary text-[11px] uppercase">Published</th>
                <th className="px-md py-sm font-semibold text-ls-secondary text-[11px] uppercase w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((recipe) => (
                <tr key={recipe.id} className="border-b border-ls-border last:border-0 hover:bg-gray-50">
                  <td className="px-md py-sm">
                    <Link href={`/admin/recipes/${recipe.id}/edit`} className="text-ls-primary font-medium hover:underline">
                      {recipe.title.en || recipe.title.vi || "(untitled)"}
                    </Link>
                  </td>
                  <td className="px-md py-sm text-ls-secondary">{recipe.category}</td>
                  <td className="px-md py-sm">
                    <span className={`text-[10px] px-[6px] py-[1px] rounded-full font-medium ${STATUS_COLORS[recipe.status]}`}>
                      {recipe.status}
                    </span>
                  </td>
                  <td className="px-md py-sm text-ls-secondary capitalize">{recipe.difficulty}</td>
                  <td className="px-md py-sm text-ls-secondary text-[12px]">
                    {recipe.publishedAt ? new Date((recipe.publishedAt as any).seconds * 1000).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-md py-sm">
                    <div className="flex gap-xs">
                      <Link href={`/admin/recipes/${recipe.id}/edit`} className="text-ls-secondary hover:text-ls-primary">
                        <Pencil size={14} />
                      </Link>
                      <button onClick={() => handleDelete(recipe.id)} className="text-ls-secondary hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

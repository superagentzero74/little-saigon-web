"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2, Check, X, Loader2,
  ArrowUp, ArrowDown, GripVertical,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getCategories, getSubcategories, saveCategory, deleteCategory,
  saveSubcategory, deleteSubcategory,
} from "@/lib/services";
import type { CategoryInfo, SubcategoryInfo, BusinessCategory } from "@/lib/types";
import VietInput from "@/components/ui/VietInput";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [catCounts, setCatCounts] = useState<Record<string, number>>({});
  const [subCounts, setSubCounts] = useState<Record<string, number>>({});
  const [totalBusinesses, setTotalBusinesses] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [addingCat, setAddingCat] = useState(false);
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  // Form states
  const [catForm, setCatForm] = useState({ slug: "", name: "", nameViet: "", icon: "", order: 0 });
  const [subForm, setSubForm] = useState({ slug: "", name: "", description: "", order: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const [cats, subs, bizSnap] = await Promise.all([
      getCategories(),
      getSubcategories(),
      getDocs(collection(db, "businesses")),
    ]);
    setCategories(cats.sort((a, b) => a.order - b.order));
    setSubcategories(subs);

    // Count businesses per category and subcategory
    const cc: Record<string, number> = {};
    const sc: Record<string, number> = {};
    let total = 0;
    bizSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.active === false) return;
      total++;
      const cats = data.categories as string[] | undefined;
      if (cats) cats.forEach((c) => { cc[c] = (cc[c] || 0) + 1; });
      const subcats = data.subcategories as string[] | undefined;
      if (subcats) subcats.forEach((s) => { sc[s] = (sc[s] || 0) + 1; });
    });
    setCatCounts(cc);
    setSubCounts(sc);
    setTotalBusinesses(total);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showMsg = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 2500);
  };

  const toggle = (slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const subsFor = (catSlug: string) =>
    subcategories.filter((s) => s.parentSlug === catSlug).sort((a, b) => a.order - b.order);

  // ── Category CRUD ──

  const startEditCat = (cat: CategoryInfo) => {
    setEditingCat(cat.slug);
    setCatForm({ slug: cat.slug, name: cat.name, nameViet: cat.nameViet || "", icon: cat.icon, order: cat.order });
  };

  const startAddCat = () => {
    setAddingCat(true);
    setCatForm({ slug: "", name: "", nameViet: "", icon: "", order: categories.length + 1 });
  };

  const saveCatForm = async (isNew: boolean) => {
    if (!catForm.slug.trim() || !catForm.name.trim()) { showMsg("Slug and name are required", true); return; }
    setSaving(true);
    try {
      await saveCategory(catForm.slug.trim(), {
        slug: catForm.slug.trim() as BusinessCategory,
        name: catForm.name.trim(),
        nameViet: catForm.nameViet.trim(),
        icon: catForm.icon.trim(),
        order: catForm.order,
        isActive: true,
      });
      showMsg(isNew ? "Category created" : "Category updated");
      setEditingCat(null);
      setAddingCat(false);
      await load();
    } catch (err: any) {
      showMsg(err.message || "Failed to save", true);
    } finally {
      setSaving(false);
    }
  };

  const removeCat = async (slug: string) => {
    const subs = subsFor(slug);
    if (subs.length > 0) {
      if (!confirm(`This will also delete ${subs.length} subcategories. Continue?`)) return;
      for (const sub of subs) await deleteSubcategory(sub.slug);
    } else {
      if (!confirm("Delete this category?")) return;
    }
    await deleteCategory(slug);
    showMsg("Category deleted");
    await load();
  };

  const moveCat = async (index: number, direction: -1 | 1) => {
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const a = categories[index];
    const b = categories[swapIdx];
    await Promise.all([
      saveCategory(a.slug, { order: b.order } as any),
      saveCategory(b.slug, { order: a.order } as any),
    ]);
    await load();
  };

  // ── Subcategory CRUD ──

  const startEditSub = (sub: SubcategoryInfo) => {
    setEditingSub(sub.slug);
    setSubForm({ slug: sub.slug, name: sub.name, description: sub.description || "", order: sub.order });
  };

  const startAddSub = (parentSlug: string) => {
    const existing = subsFor(parentSlug);
    setAddingSubTo(parentSlug);
    setSubForm({ slug: "", name: "", description: "", order: existing.length + 1 });
    setExpanded((prev) => new Set(prev).add(parentSlug));
  };

  const saveSubForm = async (parentSlug: string, isNew: boolean) => {
    if (!subForm.slug.trim() || !subForm.name.trim()) { showMsg("Slug and name are required", true); return; }
    setSaving(true);
    try {
      await saveSubcategory(subForm.slug.trim(), {
        slug: subForm.slug.trim(),
        name: subForm.name.trim(),
        parentSlug: parentSlug as BusinessCategory,
        description: subForm.description.trim(),
        order: subForm.order,
        isActive: true,
      });
      showMsg(isNew ? "Subcategory created" : "Subcategory updated");
      setEditingSub(null);
      setAddingSubTo(null);
      await load();
    } catch (err: any) {
      showMsg(err.message || "Failed to save", true);
    } finally {
      setSaving(false);
    }
  };

  const removeSub = async (slug: string) => {
    if (!confirm("Delete this subcategory?")) return;
    await deleteSubcategory(slug);
    showMsg("Subcategory deleted");
    await load();
  };

  const moveSub = async (parentSlug: string, index: number, direction: -1 | 1) => {
    const subs = subsFor(parentSlug);
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= subs.length) return;
    const a = subs[index];
    const b = subs[swapIdx];
    await Promise.all([
      saveSubcategory(a.slug, { order: b.order } as any),
      saveSubcategory(b.slug, { order: a.order } as any),
    ]);
    await load();
  };

  const inputClass = "bg-white border border-ls-border rounded px-[8px] py-[6px] text-[13px] outline-none focus:border-ls-primary";

  if (loading) {
    return (
      <div className="p-2xl flex items-center gap-sm text-ls-secondary">
        <Loader2 size={18} className="animate-spin" /> Loading categories...
      </div>
    );
  }

  return (
    <div className="p-2xl max-w-3xl">
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Categories</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">
            {categories.length} categories, {subcategories.length} subcategories — {totalBusinesses} active businesses
          </p>
        </div>
        <button onClick={startAddCat} className="ls-btn flex items-center gap-sm text-[13px]">
          <Plus size={15} /> Add Category
        </button>
      </div>

      {msg && (
        <div className={`mb-md px-md py-sm rounded text-[13px] font-medium ${msg.err ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {msg.err ? "⚠ " : "✓ "}{msg.text}
        </div>
      )}

      {/* Add category form */}
      {addingCat && (
        <div className="bg-white rounded-card border border-ls-primary p-lg mb-md">
          <p className="text-[12px] font-semibold text-ls-primary mb-sm">New Category</p>
          <div className="grid grid-cols-2 gap-sm mb-sm">
            <input value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} placeholder="slug (e.g. restaurant)" className={inputClass} />
            <VietInput value={catForm.name} onChange={(v) => setCatForm({ ...catForm, name: v })} placeholder="Display name" className={inputClass} />
            <VietInput value={catForm.nameViet} onChange={(v) => setCatForm({ ...catForm, nameViet: v })} placeholder="Vietnamese name" className={inputClass} />
            <input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} placeholder="Icon emoji" className={inputClass} />
          </div>
          <div className="flex gap-sm">
            <button onClick={() => saveCatForm(true)} disabled={saving} className="ls-btn text-[12px] py-[5px] px-md flex items-center gap-xs">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
            </button>
            <button onClick={() => setAddingCat(false)} className="ls-btn-secondary text-[12px] py-[5px] px-md flex items-center gap-xs">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="space-y-[2px]">
        {categories.map((cat, catIdx) => {
          const subs = subsFor(cat.slug);
          const isExpanded = expanded.has(cat.slug);
          const isEditing = editingCat === cat.slug;

          return (
            <div key={cat.slug} className="bg-white rounded-card border border-ls-border overflow-hidden">
              {/* Category row */}
              {isEditing ? (
                <div className="p-md bg-ls-surface">
                  <div className="grid grid-cols-2 gap-sm mb-sm">
                    <VietInput value={catForm.name} onChange={(v) => setCatForm({ ...catForm, name: v })} placeholder="Display name" className={inputClass} />
                    <VietInput value={catForm.nameViet} onChange={(v) => setCatForm({ ...catForm, nameViet: v })} placeholder="Vietnamese name" className={inputClass} />
                    <input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} placeholder="Icon emoji" className={inputClass} />
                    <div className="text-[12px] text-ls-secondary flex items-center">slug: {cat.slug}</div>
                  </div>
                  <div className="flex gap-sm">
                    <button onClick={() => saveCatForm(false)} disabled={saving} className="ls-btn text-[12px] py-[5px] px-md flex items-center gap-xs">
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                    </button>
                    <button onClick={() => setEditingCat(null)} className="ls-btn-secondary text-[12px] py-[5px] px-md flex items-center gap-xs">
                      <X size={12} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center px-md py-[10px] group">
                  <button onClick={() => toggle(cat.slug)} className="mr-sm text-ls-secondary hover:text-ls-primary">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <span className="text-[18px] mr-sm">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[14px] font-semibold text-ls-primary">{cat.name}</span>
                    {cat.nameViet && <span className="text-[12px] text-ls-secondary ml-sm">{cat.nameViet}</span>}
                    <span className="text-[11px] text-ls-secondary ml-sm">({subs.length} sub)</span>
                    <span className="text-[11px] font-semibold text-ls-primary bg-ls-surface px-[6px] py-[1px] rounded-full ml-sm">{catCounts[cat.slug] || 0} businesses</span>
                  </div>
                  <div className="flex items-center gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveCat(catIdx, -1)} disabled={catIdx === 0} className="p-[4px] text-ls-secondary hover:text-ls-primary disabled:opacity-30"><ArrowUp size={13} /></button>
                    <button onClick={() => moveCat(catIdx, 1)} disabled={catIdx === categories.length - 1} className="p-[4px] text-ls-secondary hover:text-ls-primary disabled:opacity-30"><ArrowDown size={13} /></button>
                    <button onClick={() => startAddSub(cat.slug)} className="p-[4px] text-ls-secondary hover:text-ls-primary" title="Add subcategory"><Plus size={13} /></button>
                    <button onClick={() => startEditCat(cat)} className="p-[4px] text-ls-secondary hover:text-ls-primary" title="Edit"><Pencil size={13} /></button>
                    <button onClick={() => removeCat(cat.slug)} className="p-[4px] text-red-400 hover:text-red-600" title="Delete"><Trash2 size={13} /></button>
                  </div>
                  <span className="text-[10px] text-ls-secondary ml-sm font-mono">{cat.slug}</span>
                </div>
              )}

              {/* Subcategories */}
              {isExpanded && (
                <div className="border-t border-ls-border bg-gray-50">
                  {subs.length === 0 && !addingSubTo ? (
                    <div className="px-lg py-sm text-[12px] text-ls-secondary italic">
                      No subcategories yet.
                      <button onClick={() => startAddSub(cat.slug)} className="ml-sm text-ls-primary hover:underline">Add one</button>
                    </div>
                  ) : (
                    <div className="divide-y divide-ls-border">
                      {subs.map((sub, subIdx) => {
                        const isEditingSub = editingSub === sub.slug;
                        return isEditingSub ? (
                          <div key={sub.slug} className="px-lg py-sm bg-ls-surface">
                            <div className="grid grid-cols-3 gap-sm mb-sm">
                              <VietInput value={subForm.name} onChange={(v) => setSubForm({ ...subForm, name: v })} placeholder="Display name" className={inputClass} />
                              <input value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} placeholder="Description" className={inputClass + " col-span-2"} />
                            </div>
                            <div className="flex gap-sm">
                              <button onClick={() => saveSubForm(cat.slug, false)} disabled={saving} className="ls-btn text-[11px] py-[4px] px-sm flex items-center gap-xs">
                                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
                              </button>
                              <button onClick={() => setEditingSub(null)} className="ls-btn-secondary text-[11px] py-[4px] px-sm flex items-center gap-xs">
                                <X size={11} /> Cancel
                              </button>
                              <span className="text-[10px] text-ls-secondary font-mono flex items-center">{sub.slug}</span>
                            </div>
                          </div>
                        ) : (
                          <div key={sub.slug} className="flex items-center px-lg py-[8px] group/sub">
                            <GripVertical size={12} className="text-ls-secondary/30 mr-sm" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] text-ls-primary">{sub.name}</span>
                              {subCounts[sub.slug] ? <span className="text-[10px] font-semibold text-ls-primary bg-ls-surface px-[5px] py-[1px] rounded-full ml-sm">{subCounts[sub.slug]}</span> : null}
                              {sub.description && <span className="text-[11px] text-ls-secondary ml-sm">{sub.description}</span>}
                            </div>
                            <div className="flex items-center gap-[3px] opacity-0 group-hover/sub:opacity-100 transition-opacity">
                              <button onClick={() => moveSub(cat.slug, subIdx, -1)} disabled={subIdx === 0} className="p-[3px] text-ls-secondary hover:text-ls-primary disabled:opacity-30"><ArrowUp size={11} /></button>
                              <button onClick={() => moveSub(cat.slug, subIdx, 1)} disabled={subIdx === subs.length - 1} className="p-[3px] text-ls-secondary hover:text-ls-primary disabled:opacity-30"><ArrowDown size={11} /></button>
                              <button onClick={() => startEditSub(sub)} className="p-[3px] text-ls-secondary hover:text-ls-primary"><Pencil size={11} /></button>
                              <button onClick={() => removeSub(sub.slug)} className="p-[3px] text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
                            </div>
                            <span className="text-[9px] text-ls-secondary font-mono ml-sm">{sub.slug}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add subcategory form */}
                  {addingSubTo === cat.slug && (
                    <div className="px-lg py-sm bg-ls-surface border-t border-ls-border">
                      <p className="text-[11px] font-semibold text-ls-primary mb-xs">New Subcategory</p>
                      <div className="grid grid-cols-3 gap-sm mb-sm">
                        <input value={subForm.slug} onChange={(e) => setSubForm({ ...subForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} placeholder="slug" className={inputClass} />
                        <VietInput value={subForm.name} onChange={(v) => setSubForm({ ...subForm, name: v })} placeholder="Display name" className={inputClass} />
                        <VietInput value={subForm.description} onChange={(v) => setSubForm({ ...subForm, description: v })} placeholder="Description" className={inputClass} />
                      </div>
                      <div className="flex gap-sm">
                        <button onClick={() => saveSubForm(cat.slug, true)} disabled={saving} className="ls-btn text-[11px] py-[4px] px-sm flex items-center gap-xs">
                          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
                        </button>
                        <button onClick={() => setAddingSubTo(null)} className="ls-btn-secondary text-[11px] py-[4px] px-sm flex items-center gap-xs">
                          <X size={11} /> Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

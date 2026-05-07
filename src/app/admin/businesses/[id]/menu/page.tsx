"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, Plus, Trash2, GripVertical, Loader2, Save,
  ChevronUp, ChevronDown, ImageIcon, X,
} from "lucide-react";
import {
  getBusinessById, getMenuSections, createMenuSection,
  updateMenuSection, deleteMenuSection, updateMenuImage,
} from "@/lib/services";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { MenuSection, MenuItem } from "@/lib/types";

const TAG_OPTIONS = ["spicy", "popular", "vegetarian", "new", "vegan", "gluten-free"];

export default function AdminMenuPage() {
  const router = useRouter();
  const params = useParams();
  const businessId = params.id as string;

  const [businessName, setBusinessName] = useState("");
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [menuImageUrl, setMenuImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [biz, secs] = await Promise.all([
      getBusinessById(businessId),
      getMenuSections(businessId),
    ]);
    if (!biz) { router.push("/admin/businesses"); return; }
    setBusinessName(biz.name);
    setSections(secs);
    setMenuImageUrl((biz as any).menuImageUrl || "");
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const addSection = () => {
    const newSection: MenuSection = {
      id: `new_${Date.now()}`,
      name: "",
      nameVi: "",
      order: sections.length,
      items: [],
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (index: number) => {
    if (!confirm("Delete this section and all its items?")) return;
    setSections(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const arr = [...sections];
    [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
    arr.forEach((s, i) => (s.order = i));
    setSections(arr);
  };

  const updateSectionField = (index: number, field: keyof MenuSection, value: any) => {
    const arr = [...sections];
    (arr[index] as any)[field] = value;
    setSections(arr);
  };

  const addItem = (sectionIndex: number) => {
    const arr = [...sections];
    arr[sectionIndex].items.push({
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: "",
      nameVi: "",
      description: "",
      price: undefined,
      priceNote: "",
      photoUrl: "",
      tags: [],
      available: true,
    });
    setSections(arr);
  };

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const arr = [...sections];
    arr[sectionIndex].items.splice(itemIndex, 1);
    setSections(arr);
  };

  const updateItemField = (sectionIndex: number, itemIndex: number, field: keyof MenuItem, value: any) => {
    const arr = [...sections];
    (arr[sectionIndex].items[itemIndex] as any)[field] = value;
    setSections(arr);
  };

  const toggleItemTag = (sectionIndex: number, itemIndex: number, tag: string) => {
    const arr = [...sections];
    const item = arr[sectionIndex].items[itemIndex];
    if (item.tags.includes(tag)) {
      item.tags = item.tags.filter((t) => t !== tag);
    } else {
      item.tags = [...item.tags, tag];
    }
    setSections(arr);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      // Get existing sections to determine creates vs updates vs deletes
      const existing = await getMenuSections(businessId);
      const existingIds = new Set(existing.map((s) => s.id));
      const currentIds = new Set(sections.map((s) => s.id));

      // Delete removed sections
      for (const ex of existing) {
        if (!currentIds.has(ex.id)) {
          await deleteMenuSection(businessId, ex.id);
        }
      }

      // Create or update sections
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const data = {
          name: section.name,
          nameVi: section.nameVi || null,
          order: i,
          items: section.items.map((item) => ({
            id: item.id,
            name: item.name,
            nameVi: item.nameVi || null,
            description: item.description || null,
            price: item.price ?? null,
            priceNote: item.priceNote || null,
            photoUrl: item.photoUrl || null,
            tags: item.tags,
            available: item.available,
          })),
        };

        if (section.id.startsWith("new_") || !existingIds.has(section.id)) {
          const newId = await createMenuSection(businessId, data as any);
          sections[i].id = newId;
        } else {
          await updateMenuSection(businessId, section.id, data as any);
        }
      }

      // Update menu image
      await updateMenuImage(businessId, menuImageUrl || null);

      setSections([...sections]);
      setMsg({ text: "Menu saved successfully!" });
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to save", err: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-2xl max-w-4xl flex items-center gap-sm">
        <Loader2 size={20} className="animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <div className="p-2xl max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-xs text-[13px] text-ls-secondary mb-md">
        <Link href="/admin" className="hover:text-ls-primary">Admin</Link>
        <ChevronRight size={14} />
        <Link href="/admin/businesses" className="hover:text-ls-primary">Businesses</Link>
        <ChevronRight size={14} />
        <Link href={`/admin/businesses/${businessId}/edit`} className="hover:text-ls-primary">{businessName}</Link>
        <ChevronRight size={14} />
        <span className="text-ls-primary">Menu</span>
      </div>

      <div className="flex items-center justify-between mb-2xl">
        <h1 className="text-[24px] font-bold text-ls-primary">Menu Editor</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-sm bg-ls-primary text-white text-[13px] font-medium px-lg py-[10px] rounded-btn hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving..." : "Save All"}
        </button>
      </div>

      {msg && (
        <div className={`text-[13px] mb-lg px-md py-sm rounded-btn ${msg.err ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Menu Image Fallback */}
      <div className="bg-white rounded-card border border-ls-border p-lg mb-xl">
        <h2 className="text-[14px] font-semibold text-ls-primary mb-md flex items-center gap-sm">
          <ImageIcon size={15} /> Menu Image (Fallback)
        </h2>
        <p className="text-[12px] text-ls-secondary mb-sm">
          If no structured menu data exists, this image will be shown as a fallback.
        </p>
        <input
          type="text"
          value={menuImageUrl}
          onChange={(e) => setMenuImageUrl(e.target.value)}
          placeholder="Paste image URL..."
          className="w-full border border-ls-border rounded-btn px-md py-[8px] text-[13px] outline-none focus:border-ls-primary"
        />
        {menuImageUrl && (
          <img src={menuImageUrl} alt="Menu preview" className="mt-sm max-h-[200px] rounded-btn object-contain" />
        )}
      </div>

      {/* Sections */}
      <div className="space-y-xl">
        {sections.map((section, sIdx) => (
          <div key={section.id} className="bg-white rounded-card border border-ls-border p-lg">
            <div className="flex items-center gap-sm mb-md">
              <GripVertical size={16} className="text-ls-secondary" />
              <div className="flex-1 grid grid-cols-2 gap-sm">
                <input
                  type="text"
                  value={section.name}
                  onChange={(e) => updateSectionField(sIdx, "name", e.target.value)}
                  placeholder="Section name (e.g. Appetizers)"
                  className="border border-ls-border rounded-btn px-md py-[6px] text-[13px] outline-none focus:border-ls-primary"
                />
                <input
                  type="text"
                  value={section.nameVi || ""}
                  onChange={(e) => updateSectionField(sIdx, "nameVi", e.target.value)}
                  placeholder="Vietnamese name (optional)"
                  className="border border-ls-border rounded-btn px-md py-[6px] text-[13px] outline-none focus:border-ls-primary"
                />
              </div>
              <button onClick={() => moveSection(sIdx, -1)} disabled={sIdx === 0} className="p-xs text-ls-secondary hover:text-ls-primary disabled:opacity-30">
                <ChevronUp size={16} />
              </button>
              <button onClick={() => moveSection(sIdx, 1)} disabled={sIdx === sections.length - 1} className="p-xs text-ls-secondary hover:text-ls-primary disabled:opacity-30">
                <ChevronDown size={16} />
              </button>
              <button onClick={() => removeSection(sIdx)} className="p-xs text-red-500 hover:text-red-700">
                <Trash2 size={16} />
              </button>
            </div>

            {/* Items */}
            <div className="space-y-md ml-lg">
              {section.items.map((item, iIdx) => (
                <div key={item.id} className="border border-ls-border/60 rounded-btn p-md">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-sm mb-sm">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItemField(sIdx, iIdx, "name", e.target.value)}
                      placeholder="Item name"
                      className="border border-ls-border rounded-btn px-sm py-[5px] text-[13px] outline-none focus:border-ls-primary"
                    />
                    <input
                      type="text"
                      value={item.nameVi || ""}
                      onChange={(e) => updateItemField(sIdx, iIdx, "nameVi", e.target.value)}
                      placeholder="Vietnamese name"
                      className="border border-ls-border rounded-btn px-sm py-[5px] text-[13px] outline-none focus:border-ls-primary"
                    />
                    <button onClick={() => removeItem(sIdx, iIdx)} className="p-xs text-red-500 hover:text-red-700">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-sm mb-sm">
                    <input
                      type="number"
                      value={item.price ?? ""}
                      onChange={(e) => updateItemField(sIdx, iIdx, "price", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="Price"
                      step="0.01"
                      className="border border-ls-border rounded-btn px-sm py-[5px] text-[13px] outline-none focus:border-ls-primary"
                    />
                    <input
                      type="text"
                      value={item.priceNote || ""}
                      onChange={(e) => updateItemField(sIdx, iIdx, "priceNote", e.target.value)}
                      placeholder="Price note (e.g. Small/Large)"
                      className="border border-ls-border rounded-btn px-sm py-[5px] text-[13px] outline-none focus:border-ls-primary"
                    />
                    <label className="flex items-center gap-xs text-[12px] text-ls-secondary">
                      <input
                        type="checkbox"
                        checked={item.available}
                        onChange={(e) => updateItemField(sIdx, iIdx, "available", e.target.checked)}
                        className="rounded"
                      />
                      Available
                    </label>
                  </div>
                  <textarea
                    value={item.description || ""}
                    onChange={(e) => updateItemField(sIdx, iIdx, "description", e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full border border-ls-border rounded-btn px-sm py-[5px] text-[13px] outline-none focus:border-ls-primary mb-sm"
                  />
                  {/* Photo */}
                  <div className="flex items-center gap-sm mb-sm">
                    {item.photoUrl ? (
                      <div className="relative">
                        <img src={item.photoUrl} alt="" className="w-[60px] h-[60px] object-cover rounded" />
                        <button
                          onClick={() => updateItemField(sIdx, iIdx, "photoUrl", "")}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    ) : null}
                    <label className="flex items-center gap-xs text-[12px] text-ls-primary font-medium cursor-pointer hover:underline">
                      <ImageIcon size={14} />
                      {item.photoUrl ? "Change Photo" : "Add Photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const path = `businesses/${businessId}/menu/${item.id}_${Date.now()}.jpg`;
                          const storageRef = ref(storage, path);
                          await uploadBytes(storageRef, file, { contentType: file.type });
                          const url = await getDownloadURL(storageRef);
                          updateItemField(sIdx, iIdx, "photoUrl", url);
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-xs">
                    {TAG_OPTIONS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleItemTag(sIdx, iIdx, tag)}
                        className={`text-[11px] font-medium px-[8px] py-[3px] rounded-full transition-colors ${
                          item.tags.includes(tag)
                            ? "bg-ls-primary text-white"
                            : "bg-ls-surface text-ls-secondary hover:text-ls-primary"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => addItem(sIdx)}
                className="flex items-center gap-xs text-[12px] text-ls-primary font-medium hover:underline"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addSection}
        className="flex items-center gap-sm mt-xl text-[13px] font-medium text-ls-primary border border-ls-primary/40 rounded-btn px-lg py-[10px] hover:bg-ls-primary/5"
      >
        <Plus size={16} /> Add Section
      </button>
    </div>
  );
}

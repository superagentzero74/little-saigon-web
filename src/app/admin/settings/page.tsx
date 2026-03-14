"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle, Search, X, Plus, Eye, EyeOff } from "lucide-react";
import type { BusinessCategory } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { getPageSettings, savePageSettings, type PageSettings, type PageConfig } from "@/lib/services";

const ALL_CATEGORIES = Object.entries(CATEGORIES) as [BusinessCategory, { label: string; icon: string }][];
const ALL_SLUGS = ALL_CATEGORIES.map(([k]) => k);

type PageKey = "home" | "explore" | "category";

const PAGE_META: { key: PageKey; label: string; description: string }[] = [
  { key: "home", label: "Home Page", description: "Category grid on the main landing page." },
  { key: "explore", label: "Explore Page", description: "Filter pills on the explore/search page." },
  { key: "category", label: "Category Pages", description: "Category pill navigation on individual category pages." },
];

function defaultConfig(): PageConfig {
  return { categories: [...ALL_SLUGS], showIcons: true, tags: [] };
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [configs, setConfigs] = useState<Record<PageKey, PageConfig>>({
    home: defaultConfig(),
    explore: defaultConfig(),
    category: defaultConfig(),
  });
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await getPageSettings();
      setConfigs({
        home: {
          categories: settings.home?.categories || settings.homeCategories as BusinessCategory[] || [...ALL_SLUGS],
          showIcons: settings.home?.showIcons ?? true,
          tags: settings.home?.tags || [],
        },
        explore: {
          categories: settings.explore?.categories || settings.exploreCategories as BusinessCategory[] || [...ALL_SLUGS],
          showIcons: settings.explore?.showIcons ?? true,
          tags: settings.explore?.tags || [],
        },
        category: {
          categories: settings.category?.categories || [...ALL_SLUGS],
          showIcons: settings.category?.showIcons ?? true,
          tags: settings.category?.tags || [],
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateConfig = (page: PageKey, patch: Partial<PageConfig>) => {
    setConfigs((prev) => ({ ...prev, [page]: { ...prev[page], ...patch } }));
  };

  const toggleCategory = (page: PageKey, cat: BusinessCategory) => {
    const current = configs[page].categories || [];
    const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
    updateConfig(page, { categories: next });
  };

  const selectAll = (page: PageKey) => updateConfig(page, { categories: [...ALL_SLUGS] });
  const selectNone = (page: PageKey) => updateConfig(page, { categories: [] });

  const addTag = (page: PageKey, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const current = configs[page].tags || [];
    if (current.includes(trimmed)) return;
    updateConfig(page, { tags: [...current, trimmed] });
  };

  const removeTag = (page: PageKey, tag: string) => {
    updateConfig(page, { tags: (configs[page].tags || []).filter((t) => t !== tag) });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePageSettings({
        home: configs.home,
        explore: configs.explore,
        category: configs.category,
        // Keep legacy fields in sync for backward compat
        homeCategories: configs.home.categories,
        exploreCategories: configs.explore.categories,
      });
      setMsg("Saved!");
      setTimeout(() => setMsg(""), 2500);
    } catch (err: any) {
      setMsg(err.message || "Error");
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = search.trim()
    ? ALL_CATEGORIES.filter(([key, { label }]) =>
        label.toLowerCase().includes(search.toLowerCase()) || key.includes(search.toLowerCase())
      )
    : ALL_CATEGORIES;

  if (loading) {
    return (
      <div className="p-2xl flex items-center gap-sm text-ls-secondary">
        <Loader2 size={18} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-2xl max-w-3xl">
      <h1 className="text-[24px] font-bold text-ls-primary mb-xs">Page Settings</h1>
      <p className="text-[14px] text-ls-secondary mb-lg">Control categories, icons, and tags for each public page.</p>

      {/* Search filter */}
      <div className="relative mb-xl">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ls-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter categories..."
          className="w-full bg-ls-surface rounded-btn pl-9 pr-9 py-[10px] text-[13px] text-ls-primary outline-none placeholder:text-ls-secondary"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ls-secondary hover:text-ls-primary">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Page sections */}
      {PAGE_META.map(({ key, label, description }) => (
        <PageSection
          key={key}
          pageKey={key}
          label={label}
          description={description}
          config={configs[key]}
          filteredCategories={filteredCategories}
          onToggle={(cat) => toggleCategory(key, cat)}
          onSelectAll={() => selectAll(key)}
          onSelectNone={() => selectNone(key)}
          onToggleIcons={() => updateConfig(key, { showIcons: !configs[key].showIcons })}
          onAddTag={(tag) => addTag(key, tag)}
          onRemoveTag={(tag) => removeTag(key, tag)}
        />
      ))}

      {/* Save */}
      <div className="flex items-center gap-md">
        <button onClick={handleSave} disabled={saving} className="ls-btn flex items-center gap-sm disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {msg && <span className="text-[13px] font-semibold text-green-600">{msg}</span>}
      </div>
    </div>
  );
}

// ─── Page Section Component ───

function PageSection({
  pageKey,
  label,
  description,
  config,
  filteredCategories,
  onToggle,
  onSelectAll,
  onSelectNone,
  onToggleIcons,
  onAddTag,
  onRemoveTag,
}: {
  pageKey: PageKey;
  label: string;
  description: string;
  config: PageConfig;
  filteredCategories: [BusinessCategory, { label: string; icon: string }][];
  onToggle: (cat: BusinessCategory) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onToggleIcons: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}) {
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    onAddTag(tagInput);
    setTagInput("");
  };

  const selectedCount = (config.categories || []).length;

  return (
    <div className="bg-white rounded-card border border-ls-border p-lg mb-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-sm">
        <div>
          <h2 className="text-[15px] font-semibold text-ls-primary">{label}</h2>
          <p className="text-[12px] text-ls-secondary">{description}</p>
        </div>
        <span className="text-[11px] text-ls-secondary bg-ls-surface px-2 py-1 rounded-full">
          {selectedCount}/{ALL_SLUGS.length} categories
        </span>
      </div>

      {/* Show/Hide Icons Toggle */}
      <div className="flex items-center justify-between py-[10px] border-b border-ls-border mb-md">
        <div className="flex items-center gap-sm">
          {config.showIcons ? <Eye size={15} className="text-ls-primary" /> : <EyeOff size={15} className="text-ls-secondary" />}
          <span className="text-[13px] text-ls-primary">Show emoji icons</span>
        </div>
        <button
          onClick={onToggleIcons}
          className={`relative w-9 h-5 rounded-full transition-colors ${config.showIcons ? "bg-ls-primary" : "bg-gray-300"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              config.showIcons ? "translate-x-4" : ""
            }`}
          />
        </button>
      </div>

      {/* Category checkboxes */}
      <div className="flex items-center justify-between mb-[8px]">
        <span className="text-[12px] font-medium text-ls-secondary uppercase tracking-wide">Categories</span>
        <div className="flex gap-sm text-[11px]">
          <button onClick={onSelectAll} className="text-ls-primary hover:underline">All</button>
          <button onClick={onSelectNone} className="text-ls-secondary hover:underline">None</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-lg gap-y-[4px] mb-md">
        {filteredCategories.map(([key, { label: catLabel, icon }]) => (
          <label key={key} className="flex items-center gap-sm cursor-pointer py-[3px]">
            <input
              type="checkbox"
              checked={(config.categories || []).includes(key)}
              onChange={() => onToggle(key)}
              className="w-4 h-4 rounded border-ls-border text-ls-primary focus:ring-ls-primary"
            />
            {config.showIcons && <span className="text-[15px]">{icon}</span>}
            <span className="text-[13px] text-ls-primary">{catLabel}</span>
          </label>
        ))}
      </div>

      {/* Tags */}
      <div className="border-t border-ls-border pt-md">
        <span className="text-[12px] font-medium text-ls-secondary uppercase tracking-wide">Tags</span>
        <div className="flex flex-wrap gap-[6px] mt-[8px] mb-[8px]">
          {(config.tags || []).length === 0 && (
            <span className="text-[12px] text-ls-secondary italic">No tags added</span>
          )}
          {(config.tags || []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-ls-surface text-ls-primary text-[12px] font-medium px-2.5 py-1 rounded-full"
            >
              {tag}
              <button onClick={() => onRemoveTag(tag)} className="text-ls-secondary hover:text-red-500 ml-0.5">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-[6px]">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
            placeholder="Add a tag..."
            className="flex-1 bg-ls-surface rounded-btn px-3 py-[6px] text-[12px] text-ls-primary outline-none placeholder:text-ls-secondary"
          />
          <button
            onClick={handleAddTag}
            disabled={!tagInput.trim()}
            className="flex items-center gap-1 bg-ls-primary text-white text-[12px] font-medium px-3 py-[6px] rounded-btn disabled:opacity-40"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

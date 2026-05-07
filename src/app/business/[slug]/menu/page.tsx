"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronDown, ChevronUp } from "lucide-react";
import { getBusinessById, getMenuSections } from "@/lib/services";
import type { Business, MenuSection, MenuItem } from "@/lib/types";
import { businessSlug } from "@/lib/utils";

export default function FullMenuPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [business, setBusiness] = useState<Business | null>(null);
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const businessId = slug.includes("--") ? slug.split("--").slice(1).join("--") : slug;
      let biz = await getBusinessById(businessId);
      if (!biz && !slug.includes("--") && slug.length > 8) {
        biz = await getBusinessById(slug.slice(-8));
      }
      if (!biz) { setLoading(false); return; }
      setBusiness(biz);
      const ms = await getMenuSections(biz.id).catch(() => [] as MenuSection[]);
      setSections(ms);
      // Auto-expand all
      setExpanded(new Set(ms.map((s) => s.id)));
      setLoading(false);
    })();
  }, [slug]);

  const toggleSection = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="ls-container py-3xl max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-ls-surface rounded w-1/3 mb-md" />
          <div className="h-4 bg-ls-surface rounded w-1/4 mb-xl" />
          <div className="space-y-md">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-ls-surface rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="ls-container py-3xl text-center">
        <p className="text-ls-secondary">Business not found.</p>
        <Link href="/explore" className="ls-btn inline-block mt-lg">Browse All</Link>
      </div>
    );
  }

  return (
    <div className="ls-container py-xl max-w-3xl mx-auto pb-3xl">
      {/* Back link */}
      <Link
        href={`/business/${businessSlug(business)}`}
        className="flex items-center gap-xs text-[13px] text-ls-secondary hover:text-ls-primary transition-colors mb-lg"
      >
        <ChevronLeft size={14} /> Back to {business.name}
      </Link>

      <h1 className="text-[24px] font-bold text-ls-primary">{business.name}</h1>
      <p className="text-[14px] text-ls-secondary mt-xs mb-xl">Full Menu</p>

      {sections.length === 0 ? (
        <p className="text-ls-secondary">No menu available.</p>
      ) : (
        <div className="space-y-md">
          {sections.map((section) => (
            <div key={section.id} className="bg-white rounded-card border border-ls-border overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-lg py-md bg-ls-surface/50 hover:bg-ls-surface transition-colors"
              >
                <div className="text-left">
                  <span className="text-[15px] font-bold text-ls-primary">{section.name}</span>
                  {section.nameVi && (
                    <span className="text-[13px] text-ls-secondary ml-sm">{section.nameVi}</span>
                  )}
                </div>
                <div className="flex items-center gap-sm text-ls-secondary">
                  <span className="text-[12px]">{section.items.length}</span>
                  {expanded.has(section.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Items */}
              {expanded.has(section.id) && (
                <div className="divide-y divide-ls-border/50">
                  {section.items.filter((item) => item.available !== false).map((item) => (
                    <MenuItemRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItemRow({ item }: { item: MenuItem }) {
  const [selectedOption, setSelectedOption] = useState(0);

  const displayPrice = item.priceOptions?.length
    ? item.priceOptions[selectedOption]?.price
    : item.price;

  return (
    <div className="flex items-center gap-md px-lg py-md">
      {/* Thumbnail */}
      {item.photoUrl && (
        <div className="w-[56px] h-[56px] rounded-[6px] overflow-hidden bg-ls-surface shrink-0">
          <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ls-primary">{item.name}</p>
        {item.nameVi && (
          <p className="text-[12px] text-ls-secondary">{item.nameVi}</p>
        )}
        {item.description && (
          <p className="text-[12px] text-ls-secondary mt-[2px] leading-relaxed line-clamp-2">{item.description}</p>
        )}
        {/* Price options */}
        {item.priceOptions && item.priceOptions.length > 1 && (
          <div className="flex gap-[6px] mt-[4px]">
            {item.priceOptions.map((opt, idx) => (
              <button
                key={opt.label}
                onClick={() => setSelectedOption(idx)}
                className={`text-[11px] font-medium px-[8px] py-[2px] rounded-full transition-colors ${
                  selectedOption === idx
                    ? "bg-ls-primary text-white"
                    : "bg-ls-surface text-ls-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="text-right shrink-0">
        {displayPrice != null ? (
          <span className="text-[14px] font-semibold text-ls-primary">${displayPrice.toFixed(2)}</span>
        ) : item.priceNote ? (
          <span className="text-[12px] text-ls-secondary">{item.priceNote}</span>
        ) : (
          <span className="text-[12px] text-ls-secondary italic">Market Price</span>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { searchBusinessesByName } from "@/lib/services";
import type { Business } from "@/lib/types";

export interface SelectedBusiness {
  id: string;
  name: string;
  address?: string;
}

interface Props {
  value: SelectedBusiness[];
  onChange: (next: SelectedBusiness[]) => void;
  placeholder?: string;
  max?: number;
}

export default function BusinessSearch({ value, onChange, placeholder, max }: Props) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => new Set(value.map((b) => b.id)), [value]);

  useEffect(() => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchBusinessesByName(term.trim(), 20);
        if (!cancelled) setResults(r);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const add = (b: Business) => {
    if (selectedIds.has(b.id)) return;
    if (max && value.length >= max) return;
    onChange([...value, { id: b.id, name: b.name, address: b.address }]);
    setTerm("");
    setResults([]);
  };

  const remove = (id: string) => {
    onChange(value.filter((b) => b.id !== id));
  };

  const atMax = max != null && value.length >= max;

  return (
    <div ref={wrapRef} className="relative">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-xs mb-sm">
          {value.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center gap-xs bg-ls-surface text-ls-body text-[12px] rounded-full px-sm py-[3px]"
            >
              {b.name}
              <button
                type="button"
                onClick={() => remove(b.id)}
                className="text-ls-secondary hover:text-red-500"
                aria-label={`Remove ${b.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
        <input
          type="text"
          value={term}
          disabled={atMax}
          placeholder={atMax ? `Max ${max} reached` : (placeholder || "Search businesses…")}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-[38px] pr-md py-[9px] bg-white border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary disabled:bg-ls-surface disabled:cursor-not-allowed"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-md top-1/2 -translate-y-1/2 animate-spin text-ls-secondary" />
        )}
      </div>
      {open && term.trim() && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-[2px] bg-white border border-ls-border rounded-btn shadow-lg max-h-[280px] overflow-y-auto">
          {results.map((b) => {
            const already = selectedIds.has(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(b)}
                disabled={already}
                className="w-full text-left px-md py-[8px] text-[13px] hover:bg-ls-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col"
              >
                <span className="font-medium text-ls-primary">{b.name}</span>
                {b.address && (
                  <span className="text-[11px] text-ls-secondary truncate">{b.address}</span>
                )}
                {already && <span className="text-[10px] text-ls-secondary">already selected</span>}
              </button>
            );
          })}
        </div>
      )}
      {open && term.trim() && !loading && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-[2px] bg-white border border-ls-border rounded-btn shadow-lg px-md py-[8px] text-[12px] text-ls-secondary">
          No matches.
        </div>
      )}
    </div>
  );
}

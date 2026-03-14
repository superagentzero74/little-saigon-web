"use client";

import { useState, useRef, useEffect } from "react";
import { getVietSuggestions, applySuggestion } from "@/lib/viet-spelling";

interface VietInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}

export default function VietInput({ value, onChange, onBlur, placeholder, className = "", multiline, rows }: VietInputProps) {
  const [suggestions, setSuggestions] = useState<{ match: string; suggestion: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const results = getVietSuggestions(value);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const apply = (match: string, suggestion: string) => {
    const newValue = applySuggestion(value, match, suggestion);
    onChange(newValue);
    setShowSuggestions(false);
  };

  const inputProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onFocus: () => suggestions.length > 0 && setShowSuggestions(true),
    onBlur: () => { setTimeout(() => setShowSuggestions(false), 150); onBlur?.(); },
    placeholder,
    className,
  };

  return (
    <div ref={wrapRef} className="relative">
      {multiline ? (
        <textarea {...inputProps} rows={rows} />
      ) : (
        <input type="text" {...inputProps} />
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-[2px] z-50 bg-white border border-ls-border rounded-btn shadow-lg overflow-hidden">
          <div className="px-[8px] py-[4px] bg-ls-surface border-b border-ls-border">
            <span className="text-[9px] font-semibold text-ls-secondary uppercase tracking-wider">Vietnamese spelling suggestions</span>
          </div>
          {suggestions.map(({ match, suggestion }, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); apply(match, suggestion); }}
              className="w-full text-left px-[8px] py-[5px] text-[12px] hover:bg-ls-surface transition-colors flex items-center gap-sm border-b border-ls-border last:border-0"
            >
              <span className="text-ls-secondary line-through">{match}</span>
              <span className="text-ls-secondary">→</span>
              <span className="text-ls-primary font-medium">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

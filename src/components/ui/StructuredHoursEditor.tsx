"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { StructuredHourSlot, DayOfWeek } from "@/lib/types";
import { DAYS_OF_WEEK, DAY_ABBREV } from "@/lib/types";
import { to12Hour, generateTimeOptions, sortSlots } from "@/lib/hours-utils";

const TIME_OPTIONS = generateTimeOptions();

interface Props {
  value: StructuredHourSlot[];
  onChange: (slots: StructuredHourSlot[]) => void;
}

export default function StructuredHoursEditor({ value, onChange }: Props) {
  const [newDay, setNewDay] = useState<DayOfWeek>("Monday");
  const [newOpen, setNewOpen] = useState("09:00");
  const [newClose, setNewClose] = useState("17:00");

  const sorted = sortSlots(value);

  const addSlot = () => {
    onChange(sortSlots([...value, { day: newDay, open: newOpen, close: newClose }]));
  };

  const removeSlot = (index: number) => {
    const sorted_ = sortSlots(value);
    const toRemove = sorted_[index];
    // Find and remove the matching slot from the original array
    const idx = value.findIndex(
      (s) => s.day === toRemove.day && s.open === toRemove.open && s.close === toRemove.close
    );
    if (idx !== -1) {
      const next = [...value];
      next.splice(idx, 1);
      onChange(next);
    }
  };

  const closedDays = DAYS_OF_WEEK.filter((d) => !value.some((s) => s.day === d));

  const selectClass =
    "bg-white border border-ls-border rounded-btn px-md py-[8px] text-[13px] outline-none focus:border-ls-primary";

  return (
    <div>
      {/* Existing slots */}
      {sorted.length > 0 && (
        <div className="space-y-[6px] mb-md">
          {sorted.map((slot, i) => (
            <div key={`${slot.day}-${slot.open}-${i}`} className="flex items-center gap-md text-[13px]">
              <span className="font-semibold text-ls-primary w-[36px]">{DAY_ABBREV[slot.day]}</span>
              <span className="text-ls-body">{to12Hour(slot.open)}</span>
              <span className="text-ls-secondary">-</span>
              <span className="text-ls-body">{to12Hour(slot.close)}</span>
              <button
                type="button"
                onClick={() => removeSlot(i)}
                className="text-red-400 hover:text-red-600 text-[12px] font-medium ml-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Closed days indicator */}
      {closedDays.length > 0 && closedDays.length < 7 && (
        <p className="text-[11px] text-ls-secondary mb-md">
          Closed: {closedDays.map((d) => DAY_ABBREV[d]).join(", ")}
        </p>
      )}

      {/* Add row */}
      <div className="flex flex-wrap items-center gap-sm">
        <select value={newDay} onChange={(e) => setNewDay(e.target.value as DayOfWeek)} className={selectClass}>
          {DAYS_OF_WEEK.map((d) => (
            <option key={d} value={d}>{DAY_ABBREV[d]}</option>
          ))}
        </select>
        <select value={newOpen} onChange={(e) => setNewOpen(e.target.value)} className={selectClass}>
          {TIME_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select value={newClose} onChange={(e) => setNewClose(e.target.value)} className={selectClass}>
          {TIME_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={addSlot}
          className="flex items-center gap-xs text-[13px] font-semibold border border-ls-border rounded-btn px-md py-[8px] hover:border-ls-primary hover:text-ls-primary transition-colors"
        >
          <Plus size={14} /> Add Hours
        </button>
      </div>
    </div>
  );
}

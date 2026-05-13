"use client";

import { useState } from "react";
import { Calendar, CheckCircle2, Loader2 } from "lucide-react";
import FormField, { inputClass } from "./FormField";
import { logCustomerFollowUp, scheduleCustomerFollowUp } from "@/lib/services";
import type { FollowUpType } from "@/lib/types";

type Mode = "schedule" | "log";

interface Props {
  customerId: string;
  hasScheduledNext: boolean;
  onUpdate: () => void;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FollowUpScheduler({ customerId, hasScheduledNext, onUpdate }: Props) {
  const [mode, setMode] = useState<Mode>("schedule");

  // schedule form
  const [nextDate, setNextDate] = useState<string>("");
  const [nextType, setNextType] = useState<FollowUpType>("call");
  const [nextNotes, setNextNotes] = useState("");

  // log form
  const [logDate, setLogDate] = useState<string>(toLocalInput(new Date()));
  const [logType, setLogType] = useState<FollowUpType>("call");
  const [logNotes, setLogNotes] = useState("");
  const [clearScheduled, setClearScheduled] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSchedule = async () => {
    setError("");
    setBusy(true);
    try {
      await scheduleCustomerFollowUp(customerId, {
        nextFollowUp: nextDate ? new Date(nextDate) : null,
        followUpType: nextType,
        notes: nextNotes,
      });
      setNextDate("");
      setNextNotes("");
      onUpdate();
    } catch (err: any) {
      setError(err?.message || "Failed to schedule");
    } finally {
      setBusy(false);
    }
  };

  const handleLog = async () => {
    if (!logDate) {
      setError("Pick a date");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await logCustomerFollowUp(customerId, {
        type: logType,
        date: new Date(logDate),
        notes: logNotes,
        clearScheduled: clearScheduled && hasScheduledNext,
      });
      setLogNotes("");
      setLogDate(toLocalInput(new Date()));
      onUpdate();
    } catch (err: any) {
      setError(err?.message || "Failed to log");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex gap-xs mb-md border-b border-ls-border">
        <TabButton active={mode === "schedule"} onClick={() => setMode("schedule")} icon={Calendar} label="Schedule next" />
        <TabButton active={mode === "log"} onClick={() => setMode("log")} icon={CheckCircle2} label="Log past" />
      </div>

      {mode === "schedule" ? (
        <div className="space-y-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <FormField label="When">
              <input
                type="datetime-local"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Type">
              <select value={nextType} onChange={(e) => setNextType(e.target.value as FollowUpType)} className={inputClass}>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
              </select>
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea
              value={nextNotes}
              onChange={(e) => setNextNotes(e.target.value)}
              rows={2}
              placeholder="Anything to remember for next time…"
              className={inputClass}
            />
          </FormField>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSchedule}
              disabled={busy}
              className="ls-btn flex items-center gap-xs text-[12px] disabled:opacity-50"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />}
              {hasScheduledNext ? "Update scheduled" : "Schedule"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <FormField label="When it happened">
              <input
                type="datetime-local"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Type">
              <select value={logType} onChange={(e) => setLogType(e.target.value as FollowUpType)} className={inputClass}>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
              </select>
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              rows={3}
              placeholder="What did you cover? Any outcomes…"
              className={inputClass}
            />
          </FormField>
          {hasScheduledNext && (
            <label className="flex items-center gap-xs text-[12px] text-ls-body cursor-pointer">
              <input
                type="checkbox"
                checked={clearScheduled}
                onChange={(e) => setClearScheduled(e.target.checked)}
                className="rounded border-ls-border"
              />
              This completes the currently scheduled follow-up
            </label>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleLog}
              disabled={busy || !logDate}
              className="ls-btn flex items-center gap-xs text-[12px] disabled:opacity-50"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Log follow-up
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-[12px] text-red-600 mt-sm">{error}</p>}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-xs px-md py-sm text-[12px] font-semibold border-b-2 -mb-px transition-colors ${
        active ? "border-ls-primary text-ls-primary" : "border-transparent text-ls-secondary hover:text-ls-primary"
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

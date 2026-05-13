"use client";

import { Calendar, Phone, Mail, Users, AlertCircle } from "lucide-react";
import type { FollowUpSchedule, FollowUpType } from "@/lib/types";

interface Props {
  schedule: FollowUpSchedule | undefined;
}

function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return null;
}

const TYPE_ICONS: Record<FollowUpType, any> = {
  call: Phone,
  email: Mail,
  meeting: Users,
};

function fmt(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FollowUpTimeline({ schedule }: Props) {
  const next = tsToDate(schedule?.nextFollowUp);
  const now = new Date();
  const isOverdue = next && next < now;

  const history = (schedule?.history || [])
    .map((h) => ({
      ...h,
      _date: tsToDate(h.date) || new Date(0),
    }))
    .sort((a, b) => b._date.getTime() - a._date.getTime());

  if (!next && history.length === 0) {
    return <p className="text-ls-secondary text-[13px]">No follow-ups yet. Schedule one below or log a past touchpoint.</p>;
  }

  return (
    <div className="space-y-md">
      {next && (
        <div className={`relative pl-xl ${isOverdue ? "text-red-700" : "text-ls-body"}`}>
          <div className={`absolute left-0 top-[3px] w-[22px] h-[22px] rounded-full flex items-center justify-center ${
            isOverdue ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
          }`}>
            {isOverdue ? <AlertCircle size={13} /> : <Calendar size={13} />}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-[2px]">
            {isOverdue ? "Overdue follow-up" : "Scheduled next"}
          </p>
          <p className="text-[14px] font-semibold">
            {fmt(next)}
            <span className="text-ls-secondary font-normal capitalize"> · {schedule?.followUpType}</span>
          </p>
          {schedule?.notes && <p className="text-[13px] text-ls-body mt-xs whitespace-pre-wrap">{schedule.notes}</p>}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-md pt-md">
          {next && <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide">History</p>}
          {history.map((h, i) => {
            const Icon = TYPE_ICONS[h.type] || Calendar;
            return (
              <div key={i} className="relative pl-xl">
                <div className="absolute left-0 top-[3px] w-[22px] h-[22px] rounded-full bg-ls-surface text-ls-secondary flex items-center justify-center">
                  <Icon size={12} />
                </div>
                <p className="text-[13px] text-ls-body">
                  <span className="font-semibold capitalize">{h.type}</span>
                  <span className="text-ls-secondary"> · {fmt(h._date)}</span>
                </p>
                {h.notes && <p className="text-[12px] text-ls-body mt-xs whitespace-pre-wrap">{h.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

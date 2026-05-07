"use client";

import { useState, useEffect } from "react";
import { Search, ChevronRight, ScanLine, Calendar, Users, DollarSign, CheckCircle } from "lucide-react";
import { getEvents, getTickets, getTicketStats } from "@/lib/services";
import type { TicketEvent, Ticket } from "@/lib/types";
import Link from "next/link";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function toDate(ts: any): string {
  if (!ts) return "";
  if (ts.toDate) return ts.toDate().toLocaleDateString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
  return String(ts);
}

export default function AdminTicketsPage() {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [stats, setStats] = useState<{ events: number; tickets: number; totalRevenue: number; checkedIn: number } | null>(null);

  useEffect(() => {
    Promise.all([getEvents(), getTickets(), getTicketStats()])
      .then(([evts, tkts, st]) => {
        setEvents(evts);
        setTickets(tkts);
        setStats(st);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = tickets.filter((t) => {
    if (eventFilter !== "all" && t.eventId !== eventFilter) return false;
    if (filter) {
      const q = filter.toLowerCase();
      return (
        t.attendeeName.toLowerCase().includes(q) ||
        t.attendeeEmail.toLowerCase().includes(q) ||
        t.ticketCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const STAT_CARDS = [
    { label: "Events", value: stats?.events, icon: Calendar, color: "bg-violet-500" },
    { label: "Tickets Sold", value: stats?.tickets, icon: ScanLine, color: "bg-blue-500" },
    { label: "Revenue", value: stats ? formatCents(stats.totalRevenue) : "...", icon: DollarSign, color: "bg-green-500" },
    { label: "Checked In", value: stats?.checkedIn, icon: CheckCircle, color: "bg-amber-500" },
  ];

  return (
    <div className="p-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Tickets</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">{tickets.length} tickets across {events.length} events</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-2xl">
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-card border border-ls-border p-lg">
            <div className={`w-[44px] h-[44px] rounded-card ${color} flex items-center justify-center mb-sm`}>
              <Icon size={20} className="text-white" />
            </div>
            <p className="text-[22px] font-bold text-ls-primary">{loading ? "..." : value}</p>
            <p className="text-[12px] text-ls-secondary">{label}</p>
          </div>
        ))}
      </div>

      {/* Per-event breakdown */}
      <div className="bg-white rounded-card border border-ls-border overflow-hidden mb-2xl">
        <div className="flex items-center justify-between px-lg py-md border-b border-ls-border">
          <h2 className="text-[14px] font-semibold text-ls-primary">Events Overview</h2>
          <Link href="/admin/events" className="flex items-center gap-xs text-[12px] text-ls-secondary hover:text-ls-primary">
            Manage events <ChevronRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-ls-border">
          {loading
            ? [...Array(3)].map((_, i) => (
                <div key={i} className="px-lg py-md"><div className="h-4 bg-ls-surface rounded animate-pulse" /></div>
              ))
            : events.map((ev) => {
                const evTickets = tickets.filter((t) => t.eventId === ev.id);
                const checkedIn = evTickets.filter((t) => t.checkedIn).length;
                const revenue = evTickets.reduce((s, t) => s + t.price, 0);
                const pct = ev.capacity > 0 ? Math.round((ev.sold / ev.capacity) * 100) : 0;
                return (
                  <div key={ev.id} className="flex items-center px-lg py-md hover:bg-gray-50">
                    <span className="text-[20px] mr-sm">{ev.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm">
                        <span className="text-[14px] font-semibold text-ls-primary truncate">{ev.name}</span>
                        <span className={`text-[10px] font-semibold px-[6px] py-[1px] rounded ${
                          ev.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                        }`}>{ev.status}</span>
                      </div>
                      <span className="text-[11px] text-ls-secondary">{ev.date} · {ev.venue}</span>
                    </div>
                    <div className="flex items-center gap-2xl text-[13px] shrink-0">
                      <div className="text-center">
                        <div className="font-mono font-medium">{ev.sold}/{ev.capacity}</div>
                        <div className="text-[10px] text-ls-secondary">sold</div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono font-medium">{checkedIn}</div>
                        <div className="text-[10px] text-ls-secondary">checked in</div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono font-medium">{formatCents(revenue)}</div>
                        <div className="text-[10px] text-ls-secondary">revenue</div>
                      </div>
                      <div className="w-[60px]">
                        <div className="w-full h-[3px] bg-ls-surface rounded">
                          <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: ev.color }} />
                        </div>
                        <div className="text-[10px] text-ls-secondary text-center mt-[2px]">{pct}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-md mb-xl">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
          <input
            type="text"
            placeholder="Search by name, email, or code…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-[38px] pr-md py-[9px] bg-white border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary"
          />
        </div>
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="bg-white border border-ls-border rounded-btn px-md py-[9px] text-[13px] focus:outline-none focus:border-ls-primary"
        >
          <option value="all">All Events</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.emoji} {ev.name}</option>
          ))}
        </select>
      </div>

      {/* Tickets table */}
      <div className="bg-white rounded-card border border-ls-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ls-border bg-gray-50">
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Code</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Attendee</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Event</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Tier</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Price</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Status</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Purchased</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ls-border">
              {loading
                ? [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-lg py-md"><div className="h-4 bg-ls-surface rounded animate-pulse" /></td>
                    </tr>
                  ))
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-lg py-2xl text-center text-ls-secondary">
                        {tickets.length === 0 ? "No tickets yet" : "No tickets match your search"}
                      </td>
                    </tr>
                  )
                  : filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-lg py-md">
                        <span className="font-mono text-[12px] font-medium text-ls-primary">{t.ticketCode}</span>
                      </td>
                      <td className="px-lg py-md">
                        <div className="font-semibold text-ls-primary">{t.attendeeName}</div>
                        <div className="text-[11px] text-ls-secondary">{t.attendeeEmail}</div>
                      </td>
                      <td className="px-lg py-md">
                        <span className="mr-[4px]">{t.eventEmoji}</span>
                        <span className="text-ls-secondary">{t.eventName}</span>
                      </td>
                      <td className="px-lg py-md text-ls-secondary">{t.tier}</td>
                      <td className="px-lg py-md font-mono font-medium">{formatCents(t.price)}</td>
                      <td className="px-lg py-md">
                        <span className={`inline-block px-[8px] py-[2px] rounded-badge text-[11px] font-semibold ${
                          t.status === "active" ? "bg-green-100 text-green-600" :
                          t.status === "used" ? "bg-gray-100 text-gray-500" :
                          t.status === "refunded" ? "bg-red-50 text-red-600" :
                          "bg-blue-100 text-blue-600"
                        }`}>
                          {t.checkedIn ? "✓ Checked in" : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-lg py-md text-ls-secondary text-[12px]">{toDate(t.createdAt)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

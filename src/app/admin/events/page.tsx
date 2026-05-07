"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, ChevronRight, Loader2, Check, X, Upload, Image as ImageIcon } from "lucide-react";
import { getEvents, createTicketEvent, updateTicketEvent, deleteTicketEvent, uploadEventPhoto } from "@/lib/services";
import type { TicketEvent, EventTier } from "@/lib/types";
import { serverTimestamp } from "firebase/firestore";

const STATUS_OPTIONS = ["draft", "active", "paused", "ended"] as const;
const CATEGORY_OPTIONS = ["Festival", "Food", "Music", "Market", "Community", "Sports"];
const EMOJIS = ["🎆", "🍜", "🏮", "🥖", "🎵", "🎤", "🎭", "🏀", "🎨", "🎪", "🌮", "☕"];
const COLORS = ["#c0392b", "#d35400", "#7d3c98", "#1a5276", "#16a34a", "#2563eb", "#b45309", "#0f766e"];

const inputClass =
  "bg-white border border-ls-border rounded px-[8px] py-[6px] text-[13px] outline-none focus:border-ls-primary w-full";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [tierForm, setTierForm] = useState({ name: "", price: "", qty: "", desc: "" });
  const [uploading, setUploading] = useState(false);

  function emptyForm() {
    return {
      name: "", description: "", emoji: "🎆", color: "#c0392b",
      date: "", time: "", venue: "", location: "",
      category: "", tags: [] as string[], refundPolicy: "full",
      status: "draft" as TicketEvent["status"],
      isPublic: true,
      offerTickets: false,
      tiers: [] as EventTier[],
      photos: [] as string[],
    };
  }

  const flash = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    const evts = await getEvents();
    setEvents(evts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = events.filter(
    (e) => !filter || e.name.toLowerCase().includes(filter.toLowerCase()) || e.venue.toLowerCase().includes(filter.toLowerCase())
  );

  const startCreate = () => {
    setForm(emptyForm());
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (ev: TicketEvent) => {
    setForm({
      name: ev.name, description: ev.description, emoji: ev.emoji, color: ev.color,
      date: ev.date, time: ev.time, venue: ev.venue, location: ev.location,
      category: ev.category, tags: ev.tags, refundPolicy: ev.refundPolicy,
      status: ev.status, isPublic: ev.isPublic ?? true,
      offerTickets: ev.tiers.length > 0, tiers: ev.tiers,
      photos: (ev as any).photos ?? [],
    });
    setEditing(ev.id);
    setCreating(false);
  };

  const addTier = () => {
    if (!tierForm.name || !tierForm.price || !tierForm.qty) return;
    setForm((f) => ({
      ...f,
      tiers: [...f.tiers, {
        id: "t" + Date.now(),
        name: tierForm.name,
        price: Math.round(Number(tierForm.price) * 100),
        available: Number(tierForm.qty),
        description: tierForm.desc,
      }],
    }));
    setTierForm({ name: "", price: "", qty: "", desc: "" });
  };

  const removeTier = (id: string) => {
    setForm((f) => ({ ...f, tiers: f.tiers.filter((t) => t.id !== id) }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.venue.trim()) {
      flash("Name and venue are required", true);
      return;
    }
    setSaving(true);
    const capacity = form.tiers.length > 0 ? form.tiers.reduce((s, t) => s + t.available, 0) : 0;
    const price = form.tiers.length > 0 ? Math.min(...form.tiers.map((t) => t.price)) : 0;
    const data: any = {
      ...form,
      capacity,
      price,
      sold: 0,
    };
    try {
      if (editing) {
        const { sold, ...updateData } = data;
        await updateTicketEvent(editing, { ...updateData, capacity });
        flash("Event updated");
      } else {
        await createTicketEvent({ ...data, createdBy: "admin" } as any);
        flash("Event created");
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (err: any) {
      flash(err.message || "Failed to save", true);
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteTicketEvent(id);
      flash("Event deleted");
      await load();
    } catch (err: any) {
      flash(err.message || "Failed to delete", true);
    }
  };

  return (
    <div className="p-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Events</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">{events.length} events</p>
        </div>
        <div className="flex items-center gap-sm">
          {msg && (
            <span className={`text-[13px] font-semibold ${msg.err ? "text-red-600" : "text-green-600"}`}>
              {msg.err ? "⚠ " : "✓ "}{msg.text}
            </span>
          )}
          <button onClick={startCreate} className="ls-btn flex items-center gap-sm">
            <Plus size={15} /> New Event
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-xl max-w-sm">
        <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
        <input
          type="text"
          placeholder="Search events…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-[38px] pr-md py-[9px] bg-white border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary"
        />
      </div>

      {/* Create / Edit form */}
      {(creating || editing) && (
        <div className="bg-white rounded-card border border-ls-border p-lg mb-xl">
          <h2 className="text-[16px] font-semibold text-ls-primary mb-lg">
            {editing ? "Edit Event" : "Create Event"}
          </h2>

          <div className="grid grid-cols-2 gap-md mb-md">
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Name</label>
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Event name" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Venue</label>
              <input className={inputClass} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Venue name" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-md mb-md">
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Date</label>
              <input className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="Jan 28, 2026" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Time</label>
              <input className={inputClass} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="6:00 PM" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Location</label>
              <input className={inputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Westminster, CA" />
            </div>
          </div>

          <div className="mb-md">
            <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Description</label>
            <textarea className={`${inputClass} h-[60px] resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Event description…" />
          </div>

          {/* Emoji + Color + Category + Status */}
          <div className="grid grid-cols-4 gap-md mb-md">
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Icon</label>
              <div className="flex flex-wrap gap-[4px]">
                {EMOJIS.map((em) => (
                  <button key={em} onClick={() => setForm({ ...form, emoji: em })}
                    className={`w-[30px] h-[30px] rounded text-[16px] flex items-center justify-center border ${form.emoji === em ? "border-ls-primary bg-ls-surface" : "border-ls-border bg-white"}`}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Color</label>
              <div className="flex flex-wrap gap-[4px]">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className={`w-[24px] h-[24px] rounded-full border-2 ${form.color === c ? "border-ls-primary" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Category</label>
              <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, tags: e.target.value ? [e.target.value] : [] })}>
                <option value="">Select…</option>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Status</label>
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Photos */}
          <div className="mb-md">
            <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Event Photos</label>
            {form.photos.length > 0 && (
              <div className="flex flex-wrap gap-sm mb-sm">
                {form.photos.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-[120px] h-[90px] object-cover rounded" />
                    <button
                      onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                      className="absolute top-[2px] right-[2px] bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className={`inline-flex items-center gap-xs text-[12px] font-semibold px-md py-[6px] rounded-btn cursor-pointer transition-colors ${uploading ? "bg-ls-surface text-ls-secondary" : "bg-ls-surface text-ls-primary hover:bg-ls-border"}`}>
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Uploading..." : "Upload Photos"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  setUploading(true);
                  try {
                    // For new events, upload to a temp path; for editing, use the event ID
                    const eventId = editing || `temp_${Date.now()}`;
                    const urls: string[] = [];
                    for (const file of files) {
                      const url = await uploadEventPhoto(eventId, file);
                      urls.push(url);
                    }
                    setForm((f) => ({ ...f, photos: [...f.photos, ...urls] }));
                    flash(`${urls.length} photo(s) uploaded`);
                  } catch (err: any) {
                    flash(err.message || "Upload failed", true);
                  }
                  setUploading(false);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {/* Visibility */}
          <div className="mb-md flex items-center gap-md">
            <label className="flex items-center gap-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                className="w-4 h-4 accent-ls-primary"
              />
              <span className="text-[13px] font-semibold text-ls-primary">Visible to public</span>
            </label>
            <span className="text-[11px] text-ls-secondary">
              {form.isPublic ? "Event is shown in app & website" : "Event is hidden from public view"}
            </span>
          </div>

          {/* Ticket Sales */}
          <div className="mb-md">
            <label className="flex items-center gap-sm cursor-pointer mb-md">
              <input
                type="checkbox"
                checked={form.offerTickets}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm({ ...form, offerTickets: checked, tiers: checked ? form.tiers : [] });
                }}
                className="w-4 h-4 accent-ls-primary"
              />
              <span className="text-[13px] font-semibold text-ls-primary">Offer Ticket Sales</span>
              <span className="text-[11px] text-ls-secondary">
                {form.offerTickets ? "Tickets are available for purchase" : "Calendar event only — no ticket sales"}
              </span>
            </label>

            <div className={`rounded-card border border-ls-border p-md ${form.offerTickets ? "bg-white" : "bg-gray-50 opacity-50 pointer-events-none"}`}>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide block mb-[4px]">Ticket Tiers</label>
              {form.tiers.map((t) => (
                <div key={t.id} className="flex items-center gap-sm bg-ls-surface rounded px-md py-sm mb-[4px] text-[13px]">
                  <span className="font-semibold flex-1">{t.name}</span>
                  <span className="text-ls-secondary">Qty: {t.available}</span>
                  <span className="font-mono font-medium">{formatCents(t.price)}</span>
                  <button onClick={() => removeTier(t.id)} className="text-red-400 hover:text-red-600"><X size={13} /></button>
                </div>
              ))}
              <div className="flex gap-sm mt-sm">
                <input className={inputClass} placeholder="Tier name" value={tierForm.name} onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} style={{ flex: 2 }} />
                <input className={inputClass} type="number" placeholder="Price ($)" value={tierForm.price} onChange={(e) => setTierForm({ ...tierForm, price: e.target.value })} style={{ flex: 1 }} />
                <input className={inputClass} type="number" placeholder="Qty" value={tierForm.qty} onChange={(e) => setTierForm({ ...tierForm, qty: e.target.value })} style={{ flex: 1 }} />
                <button onClick={addTier} className="ls-btn text-[12px] py-[5px] px-md flex items-center gap-xs">
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-sm pt-md border-t border-ls-border">
            <button onClick={save} disabled={saving} className="ls-btn text-[13px] py-[7px] px-lg flex items-center gap-xs">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {editing ? "Update" : "Create"}
            </button>
            <button onClick={() => { setCreating(false); setEditing(null); }} className="ls-btn-secondary text-[13px] py-[7px] px-lg flex items-center gap-xs">
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Events table */}
      <div className="bg-white rounded-card border border-ls-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ls-border bg-gray-50">
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Event</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Date</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Venue</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Sold</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Tiers</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Status</th>
                <th className="px-lg py-md w-[60px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ls-border">
              {loading
                ? [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-lg py-md"><div className="h-4 bg-ls-surface rounded animate-pulse" /></td>
                    </tr>
                  ))
                : filtered.map((ev) => (
                    <tr key={ev.id} className="hover:bg-gray-50 group">
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-sm">
                          <span className="text-[18px]">{ev.emoji}</span>
                          <div>
                            <span className="font-semibold text-ls-primary">{ev.name}</span>
                            <span className="block text-[11px] text-ls-secondary">{ev.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-lg py-md text-ls-secondary">{ev.date}<br /><span className="text-[11px]">{ev.time}</span></td>
                      <td className="px-lg py-md text-ls-secondary">{ev.venue}</td>
                      <td className="px-lg py-md">
                        <span className="font-mono font-medium">{ev.sold}/{ev.capacity}</span>
                        <div className="w-[60px] h-[3px] bg-ls-surface rounded mt-[3px]">
                          <div className="h-full rounded" style={{ width: `${ev.capacity > 0 ? (ev.sold / ev.capacity) * 100 : 0}%`, backgroundColor: ev.color }} />
                        </div>
                      </td>
                      <td className="px-lg py-md text-[11px]">
                        {ev.tiers.map((t) => (
                          <span key={t.id} className="block">{t.name}: {formatCents(t.price)} ({t.available})</span>
                        ))}
                      </td>
                      <td className="px-lg py-md">
                        <span className={`inline-block px-[8px] py-[2px] rounded-badge text-[11px] font-semibold ${
                          ev.status === "active" ? "bg-green-100 text-green-600" :
                          ev.status === "draft" ? "bg-gray-100 text-gray-500" :
                          ev.status === "paused" ? "bg-yellow-100 text-yellow-600" :
                          "bg-red-50 text-red-600"
                        }`}>
                          {ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}
                        </span>
                        {ev.isPublic === false && (
                          <span className="inline-block ml-[4px] px-[6px] py-[2px] rounded-badge text-[10px] font-semibold bg-gray-100 text-gray-500">
                            Hidden
                          </span>
                        )}
                      </td>
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(ev)} className="p-[4px] text-ls-secondary hover:text-ls-primary">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => remove(ev.id)} className="p-[4px] text-red-400 hover:text-red-600">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Ticket, Plus, Pencil, Trash2, Send, Search, X, ChevronDown, ChevronUp,
  Percent, DollarSign, Gift, ArrowUpRight, PlusCircle, Copy, Users, CheckCircle, Clock,
} from "lucide-react";
import {
  getPromotions, createPromotion, updatePromotion, deletePromotion,
  issueOfferToUser, searchUsers, getAllBusinesses, getOffersByPromotion,
  getUserById,
} from "@/lib/services";
import type {
  Promotion, OfferType, PromotionStatus, IssuanceTrigger, AppUser, Business, UserOffer,
} from "@/lib/types";
import { OFFER_TYPES, ISSUANCE_TRIGGERS } from "@/lib/types";

const STATUS_COLORS: Record<PromotionStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  ended: "bg-red-100 text-red-600",
};

const OFFER_ICONS: Record<OfferType, React.ReactNode> = {
  percent_off: <Percent size={14} />,
  fixed_off: <DollarSign size={14} />,
  free_item: <Gift size={14} />,
  double_dong: <ArrowUpRight size={14} />,
  bonus_dong: <PlusCircle size={14} />,
  bogo: <Copy size={14} />,
};

const EMPTY_FORM = {
  businessId: "",
  businessName: "",
  title: "",
  description: "",
  termsAndConditions: "",
  type: "percent_off" as OfferType,
  discountValue: "",
  itemDescription: "",
  dongBonus: "0",
  issuanceTrigger: "adminManual" as IssuanceTrigger,
  validFrom: "",
  validUntil: "",
  usageLimitPerUser: "1",
  usageLimitTotal: "",
  status: "draft" as PromotionStatus,
  badgeColor: "",
};

export default function PromotionsAdminPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  // Stats & detail panel
  const [promoOffers, setPromoOffers] = useState<Record<string, UserOffer[]>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [expandedPromo, setExpandedPromo] = useState<string | null>(null);
  const [loadingOffers, setLoadingOffers] = useState<string | null>(null);

  // Issue modal
  const [issuePromoId, setIssuePromoId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<AppUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [promos, bizList] = await Promise.all([
      getPromotions().catch(() => [] as Promotion[]),
      getAllBusinesses().catch(() => [] as Business[]),
    ]);
    setPromotions(promos);
    setBusinesses(bizList);
    if (bizList.length === 0) console.warn("No businesses loaded — check Firestore permissions");
    setLoading(false);

    // Load offer stats for all promotions
    const offersMap: Record<string, UserOffer[]> = {};
    await Promise.all(
      promos.map(async (p) => {
        try {
          offersMap[p.id] = await getOffersByPromotion(p.id);
        } catch {
          offersMap[p.id] = [];
        }
      })
    );
    setPromoOffers(offersMap);
  }

  async function toggleExpand(promoId: string) {
    if (expandedPromo === promoId) {
      setExpandedPromo(null);
      return;
    }
    setExpandedPromo(promoId);
    // Refresh offers for this promo and resolve user names
    setLoadingOffers(promoId);
    try {
      const offers = await getOffersByPromotion(promoId);
      setPromoOffers((prev) => ({ ...prev, [promoId]: offers }));
      // Resolve user names we don't already have
      const unknownIds = Array.from(new Set(offers.map((o) => o.userId))).filter((id) => !userNames[id]);
      if (unknownIds.length > 0) {
        const results = await Promise.all(unknownIds.map((id) => getUserById(id)));
        setUserNames((prev) => {
          const next = { ...prev };
          results.forEach((u, i) => { next[unknownIds[i]] = u?.displayName || u?.email || unknownIds[i]; });
          return next;
        });
      }
    } catch { /* ignore */ }
    setLoadingOffers(null);
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setMsg(null);
  }

  function openEdit(p: Promotion) {
    setForm({
      businessId: p.businessId,
      businessName: p.businessName,
      title: p.title,
      description: p.description,
      termsAndConditions: p.termsAndConditions,
      type: p.type,
      discountValue: p.discountValue?.toString() || "",
      itemDescription: p.itemDescription || "",
      dongBonus: p.dongBonus?.toString() || "0",
      issuanceTrigger: p.issuanceTrigger,
      validFrom: p.validFrom?.toDate ? p.validFrom.toDate().toISOString().slice(0, 10) : "",
      validUntil: p.validUntil?.toDate ? p.validUntil.toDate().toISOString().slice(0, 10) : "",
      usageLimitPerUser: p.usageLimitPerUser?.toString() || "1",
      usageLimitTotal: p.usageLimitTotal?.toString() || "",
      status: p.status,
      badgeColor: p.badgeColor || "",
    });
    setEditingId(p.id);
    setShowForm(true);
    setMsg(null);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.businessId) {
      setMsg({ text: "Title and business are required", err: true });
      return;
    }
    setSaving(true);
    try {
      const data: any = {
        businessId: form.businessId,
        businessName: form.businessName,
        title: form.title.trim(),
        description: form.description.trim(),
        termsAndConditions: form.termsAndConditions.trim(),
        type: form.type,
        discountValue: form.discountValue ? parseFloat(form.discountValue) : null,
        itemDescription: form.itemDescription.trim() || null,
        dongBonus: parseInt(form.dongBonus) || 0,
        issuanceTrigger: form.issuanceTrigger,
        triggerParams: null,
        validFrom: form.validFrom ? new Date(form.validFrom) : null,
        validUntil: form.validUntil ? new Date(form.validUntil) : null,
        usageLimitPerUser: parseInt(form.usageLimitPerUser) || 1,
        usageLimitTotal: form.usageLimitTotal ? parseInt(form.usageLimitTotal) : null,
        status: form.status,
        imageUrl: null,
        badgeColor: form.badgeColor || null,
      };

      if (editingId) {
        await updatePromotion(editingId, data);
      } else {
        await createPromotion(data);
      }
      setShowForm(false);
      await load();
      setMsg({ text: editingId ? "Promotion updated" : "Promotion created" });
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to save", err: true });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this promotion?")) return;
    await deletePromotion(id);
    await load();
  }

  async function handleToggleStatus(p: Promotion) {
    const next: PromotionStatus = p.status === "active" ? "paused" : "active";
    await updatePromotion(p.id, { status: next });
    await load();
  }

  // Issue modal
  async function handleUserSearch() {
    if (!userSearch.trim()) return;
    setSearching(true);
    const results = await searchUsers(userSearch.trim());
    setSearchResults(results);
    setSearching(false);
  }

  async function handleIssue(user: AppUser) {
    if (!issuePromoId) return;
    const promo = promotions.find((p) => p.id === issuePromoId);
    if (!promo) return;
    setIssuing(true);
    try {
      await issueOfferToUser(user.id, promo);
      setMsg({ text: `Offer issued to ${user.displayName}` });
      setIssuePromoId(null);
      setUserSearch("");
      setSearchResults([]);
    } catch (err: any) {
      setMsg({ text: err.message || "Failed to issue", err: true });
    }
    setIssuing(false);
  }

  function selectBusiness(bizId: string) {
    const biz = businesses.find((b) => b.id === bizId);
    setForm({ ...form, businessId: bizId, businessName: biz?.name || "" });
  }

  const fmtDate = (ts: any) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const inputClass =
    "w-full bg-white border border-ls-border rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:border-ls-primary placeholder:text-ls-secondary";

  return (
    <div className="p-2xl">
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Promotions</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">
            Create offers, manage campaigns, issue to users
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-xs bg-ls-primary text-white text-[13px] font-medium px-lg py-sm rounded-btn hover:bg-ls-primary/90 transition-colors"
        >
          <Plus size={16} /> New Promotion
        </button>
      </div>

      {msg && (
        <div
          className={`mb-md px-lg py-sm rounded-btn text-[13px] ${
            msg.err ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Promotions table */}
      <div className="bg-white rounded-card border border-ls-border overflow-hidden">
        <div className="grid grid-cols-[1fr_130px_100px_90px_90px_140px_120px] gap-md px-lg py-md border-b border-ls-border text-[11px] font-semibold text-ls-secondary uppercase tracking-wider">
          <span>Offer</span>
          <span>Business</span>
          <span>Type</span>
          <span>Trigger</span>
          <span>Status</span>
          <span>Stats</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="px-lg py-md animate-pulse border-b border-ls-border last:border-0">
              <div className="h-4 bg-ls-surface rounded w-2/3 mb-xs" />
              <div className="h-3 bg-ls-surface rounded w-1/3" />
            </div>
          ))
        ) : promotions.length === 0 ? (
          <div className="px-lg py-2xl text-center text-[14px] text-ls-secondary">
            No promotions yet. Click &quot;New Promotion&quot; to create one.
          </div>
        ) : (
          promotions.map((p) => {
            const offers = promoOffers[p.id] || [];
            const issuedCount = offers.filter((o) => o.status === "issued" || o.status === "saved").length;
            const redeemedCount = offers.filter((o) => o.status === "redeemed").length;
            const expiredCount = offers.filter((o) => o.status === "expired").length;
            const isExpanded = expandedPromo === p.id;

            return (
              <div key={p.id} className="border-b border-ls-border last:border-0">
                <div className="grid grid-cols-[1fr_130px_100px_90px_90px_140px_120px] gap-md px-lg py-md items-center">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ls-primary truncate">{p.title}</p>
                    <p className="text-[11px] text-ls-secondary truncate">{p.description}</p>
                  </div>
                  <p className="text-[12px] text-ls-secondary truncate">{p.businessName}</p>
                  <div className="flex items-center gap-xs text-[12px] text-ls-secondary">
                    {OFFER_ICONS[p.type]}
                    {OFFER_TYPES[p.type]?.label}
                  </div>
                  <p className="text-[11px] text-ls-secondary">
                    {ISSUANCE_TRIGGERS[p.issuanceTrigger] || p.issuanceTrigger}
                  </p>
                  <button
                    onClick={() => handleToggleStatus(p)}
                    className={`inline-flex items-center px-sm py-[2px] rounded-full text-[11px] font-medium w-fit ${STATUS_COLORS[p.status]}`}
                  >
                    {p.status}
                  </button>
                  <button
                    onClick={() => toggleExpand(p.id)}
                    className="flex items-center gap-[4px] text-[11px] text-ls-secondary hover:text-ls-primary"
                  >
                    <span className="text-green-600 font-semibold">{issuedCount}</span>
                    <span className="text-ls-secondary">/</span>
                    <span className="text-blue-600 font-semibold">{redeemedCount}</span>
                    <span className="text-[10px] text-ls-secondary ml-[2px]">issued/used</span>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <div className="flex items-center gap-xs justify-end">
                    <button
                      onClick={() => setIssuePromoId(p.id)}
                      className="p-xs text-ls-secondary hover:text-ls-primary"
                      title="Issue to user"
                    >
                      <Send size={14} />
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="p-xs text-ls-secondary hover:text-ls-primary"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-xs text-ls-secondary hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="px-lg pb-lg">
                    {/* Stats summary */}
                    <div className="flex gap-md mb-md">
                      <div className="flex items-center gap-xs bg-green-50 px-md py-sm rounded-btn">
                        <Clock size={14} className="text-green-600" />
                        <span className="text-[12px] font-semibold text-green-700">{issuedCount} Active</span>
                      </div>
                      <div className="flex items-center gap-xs bg-blue-50 px-md py-sm rounded-btn">
                        <CheckCircle size={14} className="text-blue-600" />
                        <span className="text-[12px] font-semibold text-blue-700">{redeemedCount} Redeemed</span>
                      </div>
                      {expiredCount > 0 && (
                        <div className="flex items-center gap-xs bg-gray-50 px-md py-sm rounded-btn">
                          <X size={14} className="text-gray-500" />
                          <span className="text-[12px] font-semibold text-gray-600">{expiredCount} Expired</span>
                        </div>
                      )}
                      <div className="flex items-center gap-xs bg-ls-surface px-md py-sm rounded-btn">
                        <Users size={14} className="text-ls-secondary" />
                        <span className="text-[12px] font-semibold text-ls-primary">{offers.length} Total</span>
                      </div>
                    </div>

                    {/* User activity log */}
                    {loadingOffers === p.id ? (
                      <div className="text-[12px] text-ls-secondary py-md">Loading offer data...</div>
                    ) : offers.length === 0 ? (
                      <div className="text-[12px] text-ls-secondary py-md">No offers issued yet.</div>
                    ) : (
                      <div className="border border-ls-border rounded-card overflow-hidden">
                        <div className="grid grid-cols-[1fr_120px_100px_140px] gap-sm px-md py-[6px] bg-ls-surface text-[10px] font-semibold text-ls-secondary uppercase tracking-wider">
                          <span>User</span>
                          <span>Status</span>
                          <span>Issued</span>
                          <span>Redeemed</span>
                        </div>
                        <div className="max-h-[240px] overflow-y-auto divide-y divide-ls-border">
                          {offers.map((o) => (
                            <div key={o.id} className="grid grid-cols-[1fr_120px_100px_140px] gap-sm px-md py-sm items-center">
                              <p className="text-[12px] text-ls-primary truncate">{userNames[o.userId] || o.userId}</p>
                              <span className={`inline-flex items-center px-sm py-[1px] rounded-full text-[10px] font-medium w-fit ${
                                o.status === "issued" || o.status === "saved" ? "bg-green-100 text-green-700" :
                                o.status === "redeemed" ? "bg-blue-100 text-blue-700" :
                                "bg-gray-100 text-gray-500"
                              }`}>
                                {o.status === "issued" ? "Active" : o.status === "saved" ? "Saved" : o.status}
                              </span>
                              <p className="text-[11px] text-ls-secondary">{fmtDate(o.issuedAt)}</p>
                              <p className="text-[11px] text-ls-secondary">{o.redeemedAt ? fmtDate(o.redeemedAt) : "—"}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Form Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-[560px] bg-white z-50 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-lg py-md border-b border-ls-border sticky top-0 bg-white z-10">
              <h2 className="text-[16px] font-bold text-ls-primary">
                {editingId ? "Edit Promotion" : "New Promotion"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-xs text-ls-secondary hover:text-ls-primary">
                <X size={20} />
              </button>
            </div>

            <div className="p-lg space-y-md">
              {/* Business */}
              <div>
                <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Business *</label>
                <select
                  value={form.businessId}
                  onChange={(e) => selectBusiness(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a business…</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Free Coffee"
                  className={inputClass}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="One free drip coffee, any size"
                  rows={2}
                  className={inputClass}
                />
              </div>

              {/* Terms */}
              <div>
                <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Terms & Conditions</label>
                <textarea
                  value={form.termsAndConditions}
                  onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
                  placeholder="Valid Mon–Fri only. One per customer."
                  rows={2}
                  className={inputClass}
                />
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Offer Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as OfferType })}
                    className={inputClass}
                  >
                    {(Object.keys(OFFER_TYPES) as OfferType[]).map((t) => (
                      <option key={t} value={t}>{OFFER_TYPES[t].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">
                    {form.type === "percent_off" ? "Discount (%)" :
                     form.type === "fixed_off" ? "Discount ($)" :
                     form.type === "free_item" || form.type === "bogo" ? "Item Description" :
                     "Đồng Bonus"}
                  </label>
                  {(form.type === "free_item" || form.type === "bogo") ? (
                    <input
                      value={form.itemDescription}
                      onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
                      placeholder="e.g. Spring Roll"
                      className={inputClass}
                    />
                  ) : (form.type === "bonus_dong" || form.type === "double_dong") ? (
                    <input
                      type="number"
                      value={form.dongBonus}
                      onChange={(e) => setForm({ ...form, dongBonus: e.target.value })}
                      placeholder="200"
                      className={inputClass}
                    />
                  ) : (
                    <input
                      type="number"
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                      placeholder={form.type === "percent_off" ? "20" : "500"}
                      className={inputClass}
                    />
                  )}
                </div>
              </div>

              {/* Đồng Bonus (always visible for non-dong types) */}
              {form.type !== "bonus_dong" && form.type !== "double_dong" && (
                <div>
                  <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">
                    Đồng Bonus on Redemption
                  </label>
                  <input
                    type="number"
                    value={form.dongBonus}
                    onChange={(e) => setForm({ ...form, dongBonus: e.target.value })}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              )}

              {/* Trigger */}
              <div>
                <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Issuance Trigger</label>
                <select
                  value={form.issuanceTrigger}
                  onChange={(e) => setForm({ ...form, issuanceTrigger: e.target.value as IssuanceTrigger })}
                  className={inputClass}
                >
                  {(Object.keys(ISSUANCE_TRIGGERS) as IssuanceTrigger[]).map((t) => (
                    <option key={t} value={t}>{ISSUANCE_TRIGGERS[t]}</option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Valid From</label>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Valid Until</label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Limit Per User</label>
                  <input
                    type="number"
                    value={form.usageLimitPerUser}
                    onChange={(e) => setForm({ ...form, usageLimitPerUser: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Total Limit (blank = unlimited)</label>
                  <input
                    type="number"
                    value={form.usageLimitTotal}
                    onChange={(e) => setForm({ ...form, usageLimitTotal: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as PromotionStatus })}
                  className={inputClass}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="ended">Ended</option>
                </select>
              </div>

              {/* Badge Color */}
              <div>
                <label className="block text-[12px] font-semibold text-ls-secondary mb-xs">Badge Color (hex, optional)</label>
                <input
                  value={form.badgeColor}
                  onChange={(e) => setForm({ ...form, badgeColor: e.target.value })}
                  placeholder="#fbbf24"
                  className={inputClass}
                />
              </div>

              {/* Save */}
              <div className="flex gap-md pt-md">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-ls-primary text-white text-[14px] font-medium py-[12px] rounded-btn hover:bg-ls-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : editingId ? "Update Promotion" : "Create Promotion"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-lg py-[12px] text-[14px] text-ls-secondary border border-ls-border rounded-btn hover:bg-ls-surface"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Issue to User Modal */}
      {issuePromoId && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => { setIssuePromoId(null); setSearchResults([]); setUserSearch(""); }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] bg-white rounded-card shadow-xl z-50">
            <div className="px-lg py-md border-b border-ls-border">
              <h2 className="text-[16px] font-bold text-ls-primary">Issue Offer to User</h2>
              <p className="text-[12px] text-ls-secondary mt-[2px]">
                {promotions.find((p) => p.id === issuePromoId)?.title}
              </p>
            </div>
            <div className="p-lg">
              <div className="flex gap-sm mb-md">
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUserSearch()}
                  placeholder="Search by name or email…"
                  className={`${inputClass} flex-1`}
                />
                <button
                  onClick={handleUserSearch}
                  disabled={searching}
                  className="px-md py-sm bg-ls-primary text-white rounded-btn text-[13px]"
                >
                  <Search size={16} />
                </button>
              </div>
              {searching && <p className="text-[13px] text-ls-secondary">Searching…</p>}
              {searchResults.length > 0 && (
                <div className="max-h-[240px] overflow-y-auto divide-y divide-ls-border border border-ls-border rounded-card">
                  {searchResults.map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-md py-sm">
                      <div>
                        <p className="text-[13px] font-semibold text-ls-primary">{u.displayName}</p>
                        <p className="text-[11px] text-ls-secondary">{u.email}</p>
                      </div>
                      <button
                        onClick={() => handleIssue(u)}
                        disabled={issuing}
                        className="text-[12px] font-medium text-ls-primary hover:underline disabled:opacity-50"
                      >
                        {issuing ? "…" : "Issue"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-lg py-md border-t border-ls-border">
              <button
                onClick={() => { setIssuePromoId(null); setSearchResults([]); setUserSearch(""); }}
                className="text-[13px] text-ls-secondary hover:text-ls-primary"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

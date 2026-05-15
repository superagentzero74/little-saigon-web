"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Building2, ExternalLink, Pencil, Mail, Phone, User, Clock,
  CheckCircle, XCircle, UserPlus, Loader2, Megaphone,
} from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getClaimRequests, createCustomer, type NewCustomerInput } from "@/lib/services";
import { businessSlug } from "@/lib/utils";
import type { ClaimRequest } from "@/lib/types";

interface ClaimRow {
  claim: ClaimRequest;
  businessPhone: string;
  existingCustomerId: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-100 text-blue-700" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  denied: { label: "Denied", className: "bg-red-100 text-red-600" },
};

export default function CustomersFromClaimsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "denied">("all");
  const [modalRow, setModalRow] = useState<ClaimRow | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const load = async () => {
    setLoading(true);
    try {
      const claims = await getClaimRequests();
      // Resolve business phones + existing customer link in parallel batches.
      const businessIds = Array.from(new Set(claims.map((c) => c.businessId)));
      const businessPhones: Record<string, string> = {};
      const customerLinks: Record<string, string> = {};

      await Promise.all(
        businessIds.map(async (bid) => {
          try {
            const snap = await getDoc(doc(db, "businesses", bid));
            businessPhones[bid] = (snap.data() as any)?.phone || "";
          } catch { /* skip */ }
          try {
            const q = query(collection(db, "customers"), where("businessIds", "array-contains", bid));
            const snap = await getDocs(q);
            if (!snap.empty) customerLinks[bid] = snap.docs[0].id;
          } catch { /* skip */ }
        })
      );

      setRows(
        claims.map((claim) => ({
          claim,
          businessPhone: businessPhones[claim.businessId] || "",
          existingCustomerId: customerLinks[claim.businessId] || null,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.claim.status !== statusFilter) {
        // Allow "pending" filter to also include "new" claims since they're functionally equivalent.
        if (!(statusFilter === "pending" && r.claim.status === "new")) return false;
      }
      if (!q) return true;
      return (
        r.claim.businessName.toLowerCase().includes(q) ||
        r.claim.userName.toLowerCase().includes(q) ||
        r.claim.userEmail.toLowerCase().includes(q) ||
        r.businessPhone.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  if (authLoading) return <div className="p-2xl text-ls-secondary">Loading…</div>;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="p-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-sm mb-xs">
        <Link href="/admin" className="text-meta text-ls-secondary hover:text-ls-primary">Admin</Link>
        <ChevronRight size={12} className="text-ls-secondary" />
        <Link href="/admin/group/cms" className="text-meta text-ls-secondary hover:text-ls-primary">CMS</Link>
        <ChevronRight size={12} className="text-ls-secondary" />
        <span className="text-meta text-ls-body">Customers from Claims</span>
      </div>
      <h1 className="text-page-title text-ls-primary">Customers from Claims</h1>
      <p className="text-body text-ls-secondary mt-xs">
        Every business owner who has submitted an ownership claim. Reach out, and convert to a CRM customer when ready.
      </p>

      {/* Quick links */}
      <div className="flex gap-sm mt-md mb-xl flex-wrap">
        <Link
          href="/admin/customers"
          className="text-[12px] font-semibold px-md py-xs rounded-badge bg-ls-surface text-ls-secondary hover:text-ls-primary"
        >
          All Customers
        </Link>
        <Link
          href="/admin/claims"
          className="text-[12px] font-semibold px-md py-xs rounded-badge bg-ls-surface text-ls-secondary hover:text-ls-primary"
        >
          Claim Requests
        </Link>
        <Link
          href="/admin/claims/businesses"
          className="text-[12px] font-semibold px-md py-xs rounded-badge bg-ls-surface text-ls-secondary hover:text-ls-primary"
        >
          Claimed Businesses
        </Link>
      </div>

      {/* Filter row */}
      <div className="flex gap-sm mb-md flex-wrap items-center">
        {(["all", "pending", "approved", "denied"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-[12px] font-semibold px-md py-xs rounded-badge transition-colors capitalize ${
              statusFilter === s ? "bg-ls-primary text-white" : "bg-ls-surface text-ls-secondary hover:text-ls-primary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-lg">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by business, claimer, email, or phone…"
          className="w-full bg-white border border-ls-border rounded-btn px-md py-[10px] text-[14px] text-ls-primary outline-none focus:border-ls-primary placeholder:text-ls-secondary"
        />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-[13px] text-ls-secondary py-2xl">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-ls-border rounded-card py-3xl text-center">
          <Building2 size={32} className="text-ls-secondary mx-auto mb-sm" />
          <p className="text-[14px] text-ls-secondary">
            {rows.length === 0 ? "No claim requests yet." : "No matches for that filter."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-ls-border rounded-card overflow-hidden">
          <div className="grid grid-cols-[1.2fr_1.4fr_120px_130px_180px] gap-md px-md py-sm bg-ls-surface text-[11px] font-semibold uppercase tracking-wide text-ls-secondary">
            <div>Business</div>
            <div>Claimer</div>
            <div>Status</div>
            <div>Submitted</div>
            <div>Actions</div>
          </div>
          <div className="divide-y divide-ls-border">
            {filtered.map((row) => {
              const { claim, businessPhone, existingCustomerId } = row;
              const statusConf = STATUS_CONFIG[claim.status] || { label: claim.status, className: "bg-gray-100 text-gray-600" };
              const slug = businessSlug({ id: claim.businessId, name: claim.businessName } as any);
              const submitted = claim.createdAt?.toDate?.() ?? null;
              return (
                <div
                  key={claim.id}
                  className="grid grid-cols-[1.2fr_1.4fr_120px_130px_180px] gap-md px-md py-md text-[13px] items-start"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-ls-primary truncate flex items-center gap-xs">
                      <Building2 size={13} className="text-ls-secondary shrink-0" />
                      {claim.businessName}
                    </div>
                    {businessPhone && (
                      <div className="flex items-center gap-xs mt-[2px]">
                        <Phone size={11} className="text-ls-secondary shrink-0" />
                        <a href={`tel:${businessPhone}`} className="text-[12px] text-ls-primary underline hover:no-underline">
                          {businessPhone}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-xs text-ls-primary truncate">
                      <User size={12} className="text-ls-secondary shrink-0" />
                      {claim.userName || <span className="italic text-ls-secondary">No name</span>}
                    </div>
                    {claim.userEmail && (
                      <div className="flex items-center gap-xs mt-[2px]">
                        <Mail size={11} className="text-ls-secondary shrink-0" />
                        <a
                          href={`mailto:${claim.userEmail}`}
                          className="text-[12px] text-ls-primary underline hover:no-underline truncate"
                        >
                          {claim.userEmail}
                        </a>
                      </div>
                    )}
                    {claim.phone && (
                      <div className="flex items-center gap-xs mt-[2px]">
                        <Phone size={11} className="text-ls-secondary shrink-0" />
                        <a href={`tel:${claim.phone}`} className="text-[12px] text-ls-primary underline hover:no-underline">
                          {claim.phone}
                        </a>
                      </div>
                    )}
                    {claim.sponsorshipInterest && (
                      <div className="inline-flex items-center gap-xs mt-[3px] text-[11px] font-semibold px-sm py-[2px] rounded-badge bg-amber-100 text-amber-800">
                        <Megaphone size={11} /> Sponsorship interest
                      </div>
                    )}
                    {claim.note && (
                      <p className="text-[11px] text-ls-secondary italic mt-[2px] line-clamp-2">
                        “{claim.note}”
                      </p>
                    )}
                  </div>
                  <div>
                    <span className={`inline-block text-[11px] font-semibold px-sm py-[2px] rounded-badge ${statusConf.className}`}>
                      {statusConf.label}
                    </span>
                  </div>
                  <div className="text-ls-secondary text-[12px] flex items-center gap-xs">
                    <Clock size={11} />
                    {formatDate(submitted)}
                  </div>
                  <div className="flex items-center gap-xs flex-wrap">
                    {existingCustomerId ? (
                      <Link
                        href={`/admin/customers/${existingCustomerId}`}
                        className="flex items-center gap-[3px] text-[11px] font-semibold border border-green-300 bg-green-50 text-green-700 rounded px-[6px] py-[3px] hover:border-green-400"
                      >
                        <CheckCircle size={11} /> Customer
                      </Link>
                    ) : (
                      <button
                        onClick={() => setModalRow(row)}
                        className="flex items-center gap-[3px] text-[11px] font-semibold bg-ls-primary text-white rounded px-[6px] py-[3px] hover:opacity-90"
                      >
                        <UserPlus size={11} /> Convert
                      </button>
                    )}
                    <Link
                      href={`/admin/businesses/${claim.businessId}/edit`}
                      className="flex items-center gap-[3px] text-[11px] font-semibold border border-ls-border rounded px-[6px] py-[3px] text-ls-secondary hover:text-ls-primary hover:border-ls-primary"
                    >
                      <Pencil size={11} /> Edit
                    </Link>
                    <Link
                      href={`/business/${slug}`}
                      target="_blank"
                      className="flex items-center gap-[3px] text-[11px] font-semibold border border-ls-border rounded px-[6px] py-[3px] text-ls-secondary hover:text-ls-primary hover:border-ls-primary"
                    >
                      <ExternalLink size={11} /> View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-meta text-ls-secondary mt-md">
        Showing {filtered.length} of {rows.length} claim{rows.length === 1 ? "" : "s"}.
      </p>

      {modalRow && (
        <ConvertModal
          row={modalRow}
          onClose={() => setModalRow(null)}
          onCreated={(customerId) => {
            setRows((prev) =>
              prev.map((r) =>
                r.claim.id === modalRow.claim.id ? { ...r, existingCustomerId: customerId } : r
              )
            );
            setModalRow(null);
          }}
        />
      )}
    </div>
  );
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  const ageMs = Date.now() - d.getTime();
  const day = 86_400_000;
  if (ageMs < day) return `${Math.max(1, Math.floor(ageMs / 3600_000))}h ago`;
  if (ageMs < 7 * day) return `${Math.floor(ageMs / day)}d ago`;
  return d.toLocaleDateString();
}

function ConvertModal({
  row,
  onClose,
  onCreated,
}: {
  row: ClaimRow;
  onClose: () => void;
  onCreated: (customerId: string) => void;
}) {
  const { claim, businessPhone } = row;
  const [name, setName] = useState(claim.userName || "");
  const [email, setEmail] = useState(claim.userEmail || "");
  // Prefer the phone the claimer typed; fall back to the business listing phone.
  const [phone, setPhone] = useState(claim.phone || businessPhone || "");
  const [title, setTitle] = useState("Owner");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedEmail && !trimmedPhone) {
      setErr("Email or phone is required.");
      return;
    }
    setSaving(true);
    try {
      const sponsorshipTag = claim.sponsorshipInterest ? " [REQUESTED SPONSORSHIP INFO]" : "";
      const baseNote = `Converted from ${claim.status} claim request${sponsorshipTag}${claim.note ? `: “${claim.note}”` : ""}.`;
      const payload: NewCustomerInput = {
        contactPerson: {
          name: name.trim(),
          email: trimmedEmail,
          phone: trimmedPhone,
          title: title.trim() || "Owner",
        },
        interests: [],
        servicesInterested: [],
        businessIds: [claim.businessId],
        followUpSchedule: {
          nextFollowUp: null,
          followUpType: "call",
          notes: "",
          history: [],
        },
        customizationNotes: baseNote,
        status: "active",
      };
      const newId = await createCustomer(payload);
      onCreated(newId);
    } catch (e: any) {
      setErr(e?.message || "Failed to create customer.");
      setSaving(false);
    }
  };

  const missingContact = !email.trim() && !phone.trim();

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-md"
      style={{ zIndex: 10001 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-card w-full max-w-[480px] p-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-md mb-md">
          <div>
            <h2 className="text-[18px] font-bold text-ls-primary">Convert to Customer</h2>
            <p className="text-[12px] text-ls-secondary mt-[2px] truncate">
              {claim.businessName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ls-secondary hover:text-ls-primary"
            aria-label="Close"
          >
            <XCircle size={20} />
          </button>
        </div>

        {missingContact && (
          <div className="mb-md rounded-btn bg-amber-50 border border-amber-200 px-md py-sm text-[12px] text-amber-800">
            Email or phone is required before saving.
          </div>
        )}

        <div className="space-y-sm">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
          </Field>
          <Field label="Phone">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
          </Field>
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
          </Field>
        </div>

        {err && (
          <p className="mt-md text-[12px] text-red-600 font-semibold">{err}</p>
        )}

        <div className="flex justify-end gap-sm mt-lg">
          <button
            onClick={onClose}
            className="text-[13px] font-semibold px-md py-[8px] rounded-btn border border-ls-border text-ls-secondary hover:text-ls-primary"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || missingContact}
            className="flex items-center gap-xs text-[13px] font-semibold px-md py-[8px] rounded-btn bg-ls-primary text-white disabled:opacity-50 hover:opacity-90"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Create Customer
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldClass = "w-full bg-white border border-ls-border rounded-btn px-md py-[8px] text-[13px] text-ls-primary outline-none focus:border-ls-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ls-secondary block mb-[3px]">{label}</span>
      {children}
    </label>
  );
}

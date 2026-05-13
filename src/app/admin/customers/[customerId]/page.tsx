"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2, ExternalLink, Save, Loader2, Mail, Phone, User, Pencil } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getCustomer, updateCustomer, deleteCustomer } from "@/lib/services";
import type { Customer, CustomerStatus, Business } from "@/lib/types";
import FollowUpTimeline from "@/components/admin/FollowUpTimeline";
import FollowUpScheduler from "@/components/admin/FollowUpScheduler";

const STATUS_COLORS: Record<CustomerStatus, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  churned: "bg-red-100 text-red-700",
};

function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return null;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = String(params?.customerId || "");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  const refreshCustomer = async () => {
    const c = await getCustomer(customerId);
    setCustomer(c);
  };

  useEffect(() => {
    (async () => {
      const c = await getCustomer(customerId);
      setCustomer(c);
      setNotes(c?.customizationNotes || "");
      if (c?.businessIds?.length) {
        const docs = await Promise.all(
          c.businessIds.map((id) => getDoc(doc(db, "businesses", id)))
        );
        setBusinesses(
          docs.filter((d) => d.exists()).map((d) => ({ id: d.id, ...d.data() }) as Business)
        );
      }
      setLoading(false);
    })();
  }, [customerId]);

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2000);
  };

  const handleSaveNotes = async () => {
    if (!customer) return;
    setSavingNotes(true);
    try {
      await updateCustomer(customer.id, { customizationNotes: notes });
      setCustomer({ ...customer, customizationNotes: notes });
      flash("Notes saved");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleStatusChange = async (next: CustomerStatus) => {
    if (!customer) return;
    setSavingStatus(true);
    try {
      await updateCustomer(customer.id, { status: next });
      setCustomer({ ...customer, status: next });
      flash("Status updated");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    if (!confirm(`Delete customer "${customer.contactPerson?.name}"? This cannot be undone.`)) return;
    await deleteCustomer(customer.id);
    router.push("/admin/customers");
  };

  if (loading) {
    return (
      <div className="p-2xl">
        <p className="text-ls-secondary text-[13px]">Loading…</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-2xl">
        <Link href="/admin/customers" className="inline-flex items-center gap-xs text-[12px] text-ls-secondary hover:text-ls-primary mb-sm">
          <ArrowLeft size={14} /> Back to Customers
        </Link>
        <p className="text-ls-secondary text-[14px] mt-md">Customer not found.</p>
      </div>
    );
  }

  const next = tsToDate(customer.followUpSchedule?.nextFollowUp);
  const created = tsToDate(customer.createdAt);

  return (
    <div className="p-2xl max-w-[1100px]">
      <div className="mb-xl">
        <Link href="/admin/customers" className="inline-flex items-center gap-xs text-[12px] text-ls-secondary hover:text-ls-primary mb-sm">
          <ArrowLeft size={14} /> Back to Customers
        </Link>
        <div className="flex items-start justify-between gap-md">
          <div>
            <h1 className="text-[24px] font-bold text-ls-primary">{customer.contactPerson?.name}</h1>
            <p className="text-[14px] text-ls-secondary mt-xs">
              {customer.contactPerson?.title}
              {created && <> · Customer since {created.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</>}
            </p>
          </div>
          <div className="flex items-center gap-md">
            {msg && <span className="text-[13px] font-semibold text-green-600">{msg}</span>}
            <select
              value={customer.status}
              onChange={(e) => handleStatusChange(e.target.value as CustomerStatus)}
              disabled={savingStatus}
              className={`text-[12px] font-semibold px-md py-[6px] rounded-full border-0 capitalize ${STATUS_COLORS[customer.status]}`}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="churned">churned</option>
            </select>
            <Link
              href={`/admin/customers/${customer.id}/edit`}
              className="ls-btn flex items-center gap-xs text-[13px]"
            >
              <Pencil size={13} /> Edit
            </Link>
            <button
              onClick={handleDelete}
              className="p-sm text-ls-secondary hover:text-red-500"
              title="Delete customer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        {/* Left: Contact + interests */}
        <div className="lg:col-span-2 space-y-xl">
          <Panel title="Contact">
            <Row icon={User} label="Name">{customer.contactPerson?.name}</Row>
            <Row icon={Mail} label="Email">
              <a href={`mailto:${customer.contactPerson?.email}`} className="text-ls-primary hover:underline">
                {customer.contactPerson?.email}
              </a>
            </Row>
            <Row icon={Phone} label="Phone">
              <a href={`tel:${customer.contactPerson?.phone}`} className="text-ls-primary hover:underline">
                {customer.contactPerson?.phone}
              </a>
            </Row>
            <Row icon={User} label="Title">{customer.contactPerson?.title}</Row>
          </Panel>

          <Panel title="Interests & services">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
              <div>
                <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide mb-sm">Interests</p>
                <div className="flex flex-wrap gap-xs">
                  {customer.interests?.length ? customer.interests.map((t) => (
                    <span key={t} className="bg-ls-surface text-ls-body text-[12px] rounded-full px-sm py-[3px]">{t}</span>
                  )) : <span className="text-ls-secondary text-[13px]">—</span>}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide mb-sm">Services interested</p>
                <div className="flex flex-wrap gap-xs">
                  {customer.servicesInterested?.length ? customer.servicesInterested.map((t) => (
                    <span key={t} className="bg-orange-100 text-orange-700 text-[12px] rounded-full px-sm py-[3px]">{t}</span>
                  )) : <span className="text-ls-secondary text-[13px]">—</span>}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Customization notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Internal notes about listing tweaks…"
              className="w-full border border-ls-border rounded-btn px-md py-[9px] text-[14px] focus:outline-none focus:border-ls-primary bg-white"
            />
            <div className="flex justify-end mt-sm">
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes || notes === (customer.customizationNotes || "")}
                className="ls-btn flex items-center gap-xs text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save notes
              </button>
            </div>
          </Panel>
        </div>

        {/* Right: Businesses + follow-up */}
        <div className="space-y-xl">
          <Panel title="Follow-ups">
            <FollowUpTimeline schedule={customer.followUpSchedule} />
            <div className="mt-lg pt-lg border-t border-ls-border">
              <FollowUpScheduler
                customerId={customer.id}
                hasScheduledNext={!!next}
                onUpdate={refreshCustomer}
              />
            </div>
          </Panel>

          <Panel title={`Linked businesses (${businesses.length})`}>
            {businesses.length === 0 ? (
              <p className="text-ls-secondary text-[13px]">No linked businesses.</p>
            ) : (
              <div className="space-y-sm">
                {businesses.map((b) => (
                  <Link
                    key={b.id}
                    href={`/admin/businesses/${b.id}/edit`}
                    className="flex items-start justify-between gap-md p-md rounded-btn border border-ls-border hover:border-ls-primary hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ls-primary text-[13px] truncate">{b.name}</p>
                      {b.address && <p className="text-[11px] text-ls-secondary truncate">{b.address}</p>}
                    </div>
                    <ExternalLink size={13} className="text-ls-secondary shrink-0 mt-[2px]" />
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-ls-border rounded-card p-lg">
      <h2 className="text-[13px] font-semibold text-ls-primary uppercase tracking-wide mb-md">{title}</h2>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-md py-xs">
      <Icon size={14} className="text-ls-secondary mt-[3px] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-ls-secondary uppercase tracking-wide">{label}</p>
        <p className="text-[14px] text-ls-body break-words">{children}</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import BusinessSearch, { SelectedBusiness } from "@/components/admin/BusinessSearch";
import FormField, { inputClass } from "@/components/admin/FormField";
import { getCustomer, updateCustomer } from "@/lib/services";
import {
  CUSTOMER_SERVICE_OPTIONS,
  type Business,
  type Customer,
  type CustomerStatus,
} from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_RE = /^\+?[\d\s\-().]{7,}$/;

export default function CustomerEditPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = String(params?.customerId || "");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const [businesses, setBusinesses] = useState<SelectedBusiness[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [interestsInput, setInterestsInput] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [status, setStatus] = useState<CustomerStatus>("active");
  const [customizationNotes, setCustomizationNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const c = await getCustomer(customerId);
      if (!c) { setLoading(false); return; }
      setCustomer(c);
      setName(c.contactPerson?.name || "");
      setEmail(c.contactPerson?.email || "");
      setPhone(c.contactPerson?.phone || "");
      setTitle(c.contactPerson?.title || "");
      setInterestsInput((c.interests || []).join(", "));
      setServices(c.servicesInterested || []);
      setStatus(c.status);
      setCustomizationNotes(c.customizationNotes || "");

      if (c.businessIds?.length) {
        const docs = await Promise.all(
          c.businessIds.map((id) => getDoc(doc(db, "businesses", id)))
        );
        const found: SelectedBusiness[] = docs
          .filter((d) => d.exists())
          .map((d) => {
            const data = d.data() as Business;
            return { id: d.id, name: data.name, address: data.address };
          });
        setBusinesses(found);
      }
      setLoading(false);
    })();
  }, [customerId]);

  const interests = useMemo(
    () => interestsInput.split(",").map((s) => s.trim()).filter(Boolean),
    [interestsInput]
  );

  const emailValid = EMAIL_RE.test(email);
  const phoneValid = PHONE_DIGITS_RE.test(phone);
  const canSave = businesses.length > 0
    && name.trim().length > 0
    && emailValid
    && phoneValid
    && title.trim().length > 0;

  const toggleService = (s: string) => {
    setServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const handleSave = async () => {
    if (!customer || !canSave) return;
    setError("");
    setSaving(true);
    try {
      await updateCustomer(customer.id, {
        contactPerson: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          title: title.trim(),
        },
        interests,
        servicesInterested: services,
        businessIds: businesses.map((b) => b.id),
        status,
        customizationNotes,
      });
      router.push(`/admin/customers/${customer.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to save");
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-2xl text-ls-secondary text-[13px]">Loading…</div>;
  }
  if (!customer) {
    return (
      <div className="p-2xl">
        <Link href="/admin/customers" className="inline-flex items-center gap-xs text-[12px] text-ls-secondary hover:text-ls-primary">
          <ArrowLeft size={14} /> Back to Customers
        </Link>
        <p className="text-ls-secondary text-[14px] mt-md">Customer not found.</p>
      </div>
    );
  }

  return (
    <div className="p-2xl max-w-[860px]">
      <div className="mb-xl">
        <Link href={`/admin/customers/${customer.id}`} className="inline-flex items-center gap-xs text-[12px] text-ls-secondary hover:text-ls-primary mb-sm">
          <ArrowLeft size={14} /> Back to customer
        </Link>
        <h1 className="text-[24px] font-bold text-ls-primary">Edit customer</h1>
      </div>

      <div className="space-y-xl">
        <Section title="Linked businesses">
          <BusinessSearch value={businesses} onChange={setBusinesses} />
        </Section>

        <Section title="Contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
            <FormField label="Name" required>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Title" required>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Email" required error={email && !emailValid ? "Invalid email" : ""}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Phone" required error={phone && !phoneValid ? "Invalid phone" : ""}>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </FormField>
          </div>
        </Section>

        <Section title="Interests & services">
          <FormField label="Interests" hint="Comma-separated tags">
            <input
              type="text"
              value={interestsInput}
              onChange={(e) => setInterestsInput(e.target.value)}
              className={inputClass}
              placeholder="e.g. seafood, family-friendly"
            />
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-xs mt-sm">
                {interests.map((t) => (
                  <span key={t} className="bg-ls-surface text-ls-body text-[12px] rounded-full px-sm py-[3px]">{t}</span>
                ))}
              </div>
            )}
          </FormField>
          <div className="mt-lg">
            <FormField label="Services interested">
              <div className="flex flex-wrap gap-sm">
                {CUSTOMER_SERVICE_OPTIONS.map((s) => {
                  const on = services.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleService(s)}
                      className={`text-[12px] px-sm py-[5px] rounded-full border transition-colors ${
                        on
                          ? "bg-ls-primary text-white border-ls-primary"
                          : "bg-white text-ls-body border-ls-border hover:border-ls-primary"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </FormField>
          </div>
        </Section>

        <Section title="Status & notes">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
            <FormField label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="churned">Churned</option>
              </select>
            </FormField>
            <FormField label="Customization notes" hint="Internal notes about listing tweaks">
              <textarea
                value={customizationNotes}
                onChange={(e) => setCustomizationNotes(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </FormField>
          </div>
        </Section>

        {error && <p className="text-[13px] text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-lg border-t border-ls-border">
          <Link
            href={`/admin/customers/${customer.id}`}
            className="text-[13px] font-semibold text-ls-secondary hover:text-ls-primary"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            className="ls-btn flex items-center gap-xs text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-ls-border rounded-card p-lg">
      <h2 className="text-[13px] font-semibold text-ls-primary uppercase tracking-wide mb-md">{title}</h2>
      {children}
    </div>
  );
}

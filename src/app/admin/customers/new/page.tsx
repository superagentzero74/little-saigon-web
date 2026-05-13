"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import BusinessSearch, { SelectedBusiness } from "@/components/admin/BusinessSearch";
import FormField, { inputClass } from "@/components/admin/FormField";
import { createCustomer, type NewCustomerInput } from "@/lib/services";
import { CUSTOMER_SERVICE_OPTIONS, type FollowUpType, type CustomerStatus } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, string> = {
  1: "Business",
  2: "Contact",
  3: "Interests",
  4: "Follow-up",
  5: "Review",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_RE = /^\+?[\d\s\-().]{7,}$/;

export default function NewCustomerPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [businesses, setBusinesses] = useState<SelectedBusiness[]>([]);
  // Step 2
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("Owner");
  // Step 3
  const [interestsInput, setInterestsInput] = useState("");
  const [services, setServices] = useState<string[]>([]);
  // Step 4
  const [nextFollowUp, setNextFollowUp] = useState<string>("");
  const [followUpType, setFollowUpType] = useState<FollowUpType>("call");
  const [followUpNotes, setFollowUpNotes] = useState("");
  // Misc
  const [status, setStatus] = useState<CustomerStatus>("active");
  const [customizationNotes, setCustomizationNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const interests = useMemo(
    () => interestsInput.split(",").map((s) => s.trim()).filter(Boolean),
    [interestsInput]
  );

  const emailValid = EMAIL_RE.test(email);
  const phoneValid = PHONE_DIGITS_RE.test(phone);

  const stepValid: Record<Step, boolean> = {
    1: businesses.length > 0,
    2: name.trim().length > 0 && emailValid && phoneValid && title.trim().length > 0,
    3: true,
    4: true,
    5: true,
  };

  const toggleService = (s: string) => {
    setServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const input: NewCustomerInput = {
        contactPerson: { name: name.trim(), email: email.trim(), phone: phone.trim(), title: title.trim() },
        interests,
        servicesInterested: services,
        businessIds: businesses.map((b) => b.id),
        followUpSchedule: {
          nextFollowUp: nextFollowUp ? Timestamp.fromDate(new Date(nextFollowUp)) : null,
          followUpType,
          notes: followUpNotes,
          history: [],
        },
        customizationNotes,
        status,
      };
      const id = await createCustomer(input);
      router.push(`/admin/customers/${id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create customer");
      setSaving(false);
    }
  };

  const next = () => setStep((s) => (Math.min(5, s + 1) as Step));
  const back = () => setStep((s) => (Math.max(1, s - 1) as Step));

  return (
    <div className="p-2xl max-w-[860px]">
      <div className="mb-xl">
        <Link href="/admin/customers" className="inline-flex items-center gap-xs text-[12px] text-ls-secondary hover:text-ls-primary mb-sm">
          <ArrowLeft size={14} /> Back to Customers
        </Link>
        <h1 className="text-[24px] font-bold text-ls-primary">New Customer</h1>
        <p className="text-[14px] text-ls-secondary mt-xs">
          Create a CRM profile for a restaurant owner or business client.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-sm mb-2xl">
        {([1, 2, 3, 4, 5] as Step[]).map((s, i) => {
          const active = s === step;
          const done = s < step;
          return (
            <div key={s} className="flex items-center gap-sm flex-1">
              <button
                type="button"
                onClick={() => (done || stepValid[step] ? setStep(s) : null)}
                disabled={!done && s !== step && !stepValid[step]}
                className={`flex items-center gap-xs text-[12px] font-semibold ${
                  active ? "text-ls-primary" : done ? "text-green-600" : "text-ls-secondary"
                }`}
              >
                <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] ${
                  active ? "bg-ls-primary text-white" : done ? "bg-green-600 text-white" : "bg-ls-surface text-ls-secondary"
                }`}>
                  {done ? <Check size={12} /> : s}
                </span>
                {STEP_LABELS[s]}
              </button>
              {i < 4 && <div className={`h-[2px] flex-1 ${done ? "bg-green-600" : "bg-ls-border"}`} />}
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-ls-border rounded-card p-xl">
        {step === 1 && (
          <div>
            <h2 className="text-[16px] font-semibold text-ls-primary mb-xs">Link businesses</h2>
            <p className="text-[13px] text-ls-secondary mb-lg">
              Search LSgo listings and select one or more businesses this customer owns or manages.
            </p>
            <BusinessSearch value={businesses} onChange={setBusinesses} />
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-[16px] font-semibold text-ls-primary mb-xs">Contact person</h2>
            <p className="text-[13px] text-ls-secondary mb-lg">Primary contact for this customer.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
              <FormField label="Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Full name"
                />
              </FormField>
              <FormField label="Title" required>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                  placeholder="Owner, Manager…"
                />
              </FormField>
              <FormField label="Email" required error={email && !emailValid ? "Invalid email" : ""}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="name@example.com"
                />
              </FormField>
              <FormField label="Phone" required error={phone && !phoneValid ? "Invalid phone" : ""}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="(714) 555-0100"
                />
              </FormField>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-[16px] font-semibold text-ls-primary mb-xs">Interests & services</h2>
            <p className="text-[13px] text-ls-secondary mb-lg">Tag what they care about and which LSgo services they want.</p>
            <FormField label="Interests" hint="Comma-separated, free-form tags">
              <input
                type="text"
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
                className={inputClass}
                placeholder="e.g. seafood, family-friendly, late-night"
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
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-[16px] font-semibold text-ls-primary mb-xs">Follow-up</h2>
            <p className="text-[13px] text-ls-secondary mb-lg">Schedule the next touchpoint (optional).</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
              <FormField label="Next follow-up">
                <input
                  type="datetime-local"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Type">
                <select
                  value={followUpType}
                  onChange={(e) => setFollowUpType(e.target.value as FollowUpType)}
                  className={inputClass}
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                </select>
              </FormField>
            </div>
            <div className="mt-lg">
              <FormField label="Notes">
                <textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="Anything to remember for next time…"
                />
              </FormField>
            </div>
            <div className="mt-lg grid grid-cols-1 sm:grid-cols-2 gap-lg">
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
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-[16px] font-semibold text-ls-primary mb-xs">Review</h2>
            <p className="text-[13px] text-ls-secondary mb-lg">Check everything before saving.</p>
            <ReviewRow label="Businesses">
              {businesses.length === 0 ? "—" : businesses.map((b) => b.name).join(", ")}
            </ReviewRow>
            <ReviewRow label="Contact">
              {name} · {title}<br />
              <span className="text-ls-secondary">{email} · {phone}</span>
            </ReviewRow>
            <ReviewRow label="Interests">{interests.join(", ") || "—"}</ReviewRow>
            <ReviewRow label="Services">{services.join(", ") || "—"}</ReviewRow>
            <ReviewRow label="Next follow-up">
              {nextFollowUp
                ? `${new Date(nextFollowUp).toLocaleString()} · ${followUpType}`
                : "—"}
              {followUpNotes && (<><br /><span className="text-ls-secondary">{followUpNotes}</span></>)}
            </ReviewRow>
            <ReviewRow label="Status">{status}</ReviewRow>
            <ReviewRow label="Customization notes">{customizationNotes || "—"}</ReviewRow>
            {error && <p className="text-[13px] text-red-600 mt-md">{error}</p>}
          </div>
        )}

        <div className="flex items-center justify-between mt-2xl pt-lg border-t border-ls-border">
          <button
            type="button"
            onClick={back}
            disabled={step === 1}
            className="flex items-center gap-xs text-[13px] font-semibold text-ls-secondary hover:text-ls-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={14} /> Back
          </button>
          {step < 5 ? (
            <button
              type="button"
              onClick={next}
              disabled={!stepValid[step]}
              className="ls-btn flex items-center gap-xs text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !stepValid[1] || !stepValid[2]}
              className="ls-btn flex items-center gap-xs text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? "Saving…" : "Create Customer"}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-md py-sm border-b border-ls-border last:border-b-0 text-[13px]">
      <span className="text-[12px] font-semibold text-ls-secondary uppercase tracking-wide">{label}</span>
      <span className="text-ls-body">{children}</span>
    </div>
  );
}

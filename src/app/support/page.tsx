"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, CheckCircle, HelpCircle, ChevronDown, Building2, Search, LogIn } from "lucide-react";
import { searchBusinesses } from "@/lib/services";
import { useAuth } from "@/contexts/AuthContext";
import type { Business } from "@/lib/types";

const faqs = [
  {
    q: "How do I earn reward points?",
    a: "Check in at participating Vietnamese businesses using the Little Saigon app. Each check-in earns you points that can be redeemed for deals and discounts at local businesses.",
  },
  {
    q: "How do I add or claim my business?",
    a: "If you own a Vietnamese business in Little Saigon and want to be listed or claim an existing listing, use the contact form above with your business name, address, and proof of ownership.",
  },
  {
    q: "Is the app free to use?",
    a: "Yes! The Little Saigon app is completely free to download and use. Browse businesses, read reviews, check in, and earn rewards at no cost.",
  },
  {
    q: "How do I leave a review?",
    a: "Navigate to any business page, scroll down to the reviews section, and tap 'Write a Review.' You must be signed in with your Google or Apple account to leave a review.",
  },
  {
    q: "The app shows incorrect business hours or information. How can I report it?",
    a: "We appreciate your help keeping our listings accurate! Use the contact form above with the business name and the correction, and we'll update it promptly.",
  },
  {
    q: "What areas does Little Saigon cover?",
    a: "Our guide covers Vietnamese businesses in Westminster, Garden Grove, and Fountain Valley in Orange County, Southern California — the heart of Little Saigon.",
  },
  {
    q: "How do I delete my account?",
    a: "To delete your account and all associated data, go to Profile > Settings > Delete Account in the app, or submit a request through the contact form above.",
  },
];

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="ls-container py-3xl"><p className="text-ls-secondary">Loading...</p></div>}>
      <SupportContent />
    </Suspense>
  );
}

function SupportContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const claimBusinessId = searchParams.get("claim") || "";
  const claimBusinessName = searchParams.get("name") || "";
  const isClaim = !!claimBusinessId;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(isClaim ? "business" : "general");
  const [message, setMessage] = useState(isClaim ? `I would like to claim "${claimBusinessName}".` : "");
  const [phone, setPhone] = useState("");
  const [okToEmail, setOkToEmail] = useState(false);
  const [sponsorshipInterest, setSponsorshipInterest] = useState(false);
  const [urgentUpdate, setUrgentUpdate] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);
  const formStartTime = useRef(Date.now());

  // Auto-fill from logged-in user
  useEffect(() => {
    if (user && !name) {
      setName(user.displayName || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Business search for claim
  const [bizSearch, setBizSearch] = useState("");
  const [bizResults, setBizResults] = useState<Business[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [bizSearching, setBizSearching] = useState(false);
  const [notListed, setNotListed] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [newBizAddress, setNewBizAddress] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Bot checks
    if (honeypotRef.current?.value) return; // honeypot filled = bot
    if (Date.now() - formStartTime.current < 3000) return; // submitted too fast = bot

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, topic, message,
          ...(isClaim ? {
            phone, okToEmail, urgentUpdate, sponsorshipInterest,
            claimBusinessId: claimBusinessId || selectedBiz?.id || "",
            claimBusinessName: claimBusinessName || selectedBiz?.name || newBizName || "",
            newBusiness: notListed,
            newBizAddress: notListed ? newBizAddress : "",
            userId: user?.id || "",
          } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setName("");
      setEmail("");
      setTopic("general");
      setMessage("");
      formStartTime.current = Date.now();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="ls-container py-3xl">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-3xl">
        <h1 className="text-page-title font-bold text-ls-primary">
          {isClaim ? "Claim Your Business" : "Support"}
        </h1>
        <p className="text-body text-ls-secondary mt-md">
          {isClaim
            ? "Provide your contact details and we'll verify your ownership."
            : "Need help? Browse common questions below or send us a message."}
        </p>
      </div>

      {/* Login required for claims */}
      {isClaim && !authLoading && !user && (
        <div className="max-w-xl mx-auto mb-3xl">
          <div className="ls-card text-center py-2xl">
            <LogIn size={36} className="text-ls-secondary mx-auto mb-md" />
            <h2 className="text-section-header font-bold text-ls-primary mb-sm">Sign in to claim your business</h2>
            <p className="text-[14px] text-ls-secondary mb-xl">Create an account or log in to submit a claim request.</p>
            <a href="/login" className="ls-btn inline-flex items-center gap-sm text-[14px]">
              <LogIn size={16} /> Sign up or Log in
            </a>
          </div>
        </div>
      )}

      {/* Contact Form */}
      {(!isClaim || user) && (
      <div className="max-w-xl mx-auto mb-3xl">
        <div className="ls-card">
          <h2 className="text-section-header font-bold text-ls-primary mb-xl">Contact Us</h2>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-md py-xl text-center">
              <CheckCircle size={40} className="text-green-600" />
              <p className="text-body font-semibold text-ls-primary">Message sent!</p>
              <p className="text-meta text-ls-secondary">
                We&apos;ll get back to you as soon as possible.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="ls-btn-secondary mt-md"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-lg">
              {/* Honeypot - hidden from humans */}
              <input
                ref={honeypotRef}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="absolute opacity-0 pointer-events-none h-0 w-0"
                aria-hidden="true"
              />

              <div>
                <label className="text-meta font-semibold text-ls-primary block mb-xs">
                  {isClaim ? "Full Name" : "Name"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border border-ls-border rounded-btn px-lg py-md text-body focus:outline-none focus:border-ls-primary transition-colors"
                  placeholder={isClaim ? "First and last name" : "Your name"}
                />
              </div>

              <div>
                <label className="text-meta font-semibold text-ls-primary block mb-xs">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-ls-border rounded-btn px-lg py-md text-body focus:outline-none focus:border-ls-primary transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="text-meta font-semibold text-ls-primary block mb-xs">
                  Topic
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full border border-ls-border rounded-btn px-lg py-md text-body focus:outline-none focus:border-ls-primary transition-colors bg-white"
                >
                  <option value="general">General Question</option>
                  <option value="business">Business Listing / Claim</option>
                  <option value="bug">Bug Report</option>
                  <option value="feedback">Feedback</option>
                  <option value="account">Account / Data Deletion</option>
                </select>
              </div>

              {/* Claim-specific fields */}
              {isClaim && (
                <>
                  {claimBusinessName ? (
                    <div className="flex items-center gap-md p-md bg-ls-surface rounded-btn">
                      <Building2 size={18} className="text-ls-secondary" />
                      <div>
                        <p className="text-[13px] font-semibold text-ls-primary">{claimBusinessName}</p>
                        <p className="text-[11px] text-ls-secondary">Business Claim Request</p>
                      </div>
                    </div>
                  ) : notListed ? (
                    <div className="space-y-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-meta font-semibold text-ls-primary">Add a New Business</p>
                        <button type="button" onClick={() => setNotListed(false)} className="text-[12px] text-ls-secondary hover:text-ls-primary">
                          Back to search
                        </button>
                      </div>
                      <div>
                        <label className="text-meta font-semibold text-ls-primary block mb-xs">Business Name</label>
                        <input
                          type="text"
                          value={newBizName}
                          onChange={(e) => setNewBizName(e.target.value)}
                          required
                          className="w-full border border-ls-border rounded-btn px-lg py-md text-body focus:outline-none focus:border-ls-primary"
                          placeholder="Your business name"
                        />
                      </div>
                      <div>
                        <label className="text-meta font-semibold text-ls-primary block mb-xs">Business Address</label>
                        <input
                          type="text"
                          value={newBizAddress}
                          onChange={(e) => setNewBizAddress(e.target.value)}
                          required
                          className="w-full border border-ls-border rounded-btn px-lg py-md text-body focus:outline-none focus:border-ls-primary"
                          placeholder="Full street address, city, state"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-meta font-semibold text-ls-primary block mb-xs">
                        Find Your Business
                      </label>
                      {selectedBiz ? (
                        <div className="flex items-center justify-between gap-md p-md bg-ls-surface rounded-btn">
                          <div className="flex items-center gap-md">
                            <Building2 size={18} className="text-ls-secondary" />
                            <div>
                              <p className="text-[13px] font-semibold text-ls-primary">{selectedBiz.name}</p>
                              <p className="text-[11px] text-ls-secondary">{selectedBiz.address}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setSelectedBiz(null); setBizSearch(""); setBizResults([]); }}
                            className="text-[12px] text-ls-secondary hover:text-red-500"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="relative">
                            <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
                            <input
                              type="text"
                              value={bizSearch}
                              onChange={async (e) => {
                                const q = e.target.value;
                                setBizSearch(q);
                                if (q.length >= 2) {
                                  setBizSearching(true);
                                  const results = await searchBusinesses(q);
                                  setBizResults(results.slice(0, 8));
                                  setBizSearching(false);
                                } else {
                                  setBizResults([]);
                                }
                              }}
                              className="w-full pl-[36px] pr-lg py-md border border-ls-border rounded-btn text-body focus:outline-none focus:border-ls-primary"
                              placeholder="Search for your business..."
                            />
                          </div>
                          {bizResults.length > 0 && (
                            <div className="absolute z-10 top-full left-0 right-0 mt-[2px] bg-white border border-ls-border rounded-btn shadow-lg max-h-[240px] overflow-y-auto">
                              {bizResults.map((biz) => (
                                <button
                                  key={biz.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBiz(biz);
                                    setMessage(`I would like to claim "${biz.name}".`);
                                    setBizResults([]);
                                  }}
                                  className="w-full text-left px-md py-[8px] hover:bg-ls-surface transition-colors"
                                >
                                  <p className="text-[13px] font-medium text-ls-primary">{biz.name}</p>
                                  <p className="text-[11px] text-ls-secondary">{biz.address}</p>
                                </button>
                              ))}
                            </div>
                          )}
                          {bizSearching && (
                            <p className="text-[11px] text-ls-secondary mt-xs">Searching...</p>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => { setNotListed(true); setMessage("I would like to add my business to Little Saigon."); }}
                        className="mt-md text-[13px] font-medium text-ls-primary hover:underline"
                      >
                        My business isn&apos;t listed &rarr;
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-meta font-semibold text-ls-primary block mb-xs">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full border border-ls-border rounded-btn px-lg py-md text-body focus:outline-none focus:border-ls-primary transition-colors"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <label className="flex items-center gap-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={okToEmail}
                      onChange={(e) => setOkToEmail(e.target.checked)}
                      className="w-4 h-4 accent-ls-primary"
                    />
                    <span className="text-[14px] text-ls-primary">OK to contact by email</span>
                  </label>

                  <label className="flex items-start gap-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sponsorshipInterest}
                      onChange={(e) => setSponsorshipInterest(e.target.checked)}
                      className="w-4 h-4 mt-[3px] accent-ls-primary shrink-0"
                    />
                    <span className="text-[14px] text-ls-primary leading-snug">
                      I would like more information on promoting my business and sponsorship opportunities.
                    </span>
                  </label>

                  <div>
                    <label className="text-meta font-semibold text-ls-primary block mb-xs">
                      Info that needs urgent update
                    </label>
                    <textarea
                      value={urgentUpdate}
                      onChange={(e) => setUrgentUpdate(e.target.value)}
                      rows={2}
                      className="w-full border border-ls-border rounded-btn px-lg py-md text-body focus:outline-none focus:border-ls-primary transition-colors resize-none"
                      placeholder="e.g. wrong hours, incorrect address, closed permanently"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-meta font-semibold text-ls-primary block mb-xs">
                  {isClaim ? "Additional Notes" : "Message"}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required={!isClaim}
                  rows={isClaim ? 3 : 5}
                  className="w-full border border-ls-border rounded-btn px-lg py-md text-body focus:outline-none focus:border-ls-primary transition-colors resize-none"
                  placeholder={isClaim ? "Any additional details..." : "How can we help?"}
                />
              </div>

              {status === "error" && (
                <p className="text-meta text-red-600">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="ls-btn flex items-center justify-center gap-sm w-full disabled:opacity-50"
              >
                {status === "submitting" ? (
                  "Sending..."
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
      )}

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-sm mb-xl">
          <HelpCircle size={20} className="text-ls-primary" />
          <h2 className="text-section-header font-bold text-ls-primary">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-sm">
          {faqs.map((faq, i) => (
            <details key={i} className="ls-card group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="text-body font-semibold text-ls-primary pr-lg">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className="text-ls-secondary flex-shrink-0 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="text-body text-ls-body mt-md">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Clock, Building2, User, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getClaimRequests, approveClaimRequest, denyClaimRequest } from "@/lib/services";
import type { ClaimRequest } from "@/lib/types";

const STATUS_CONFIG = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approved", className: "bg-green-100 text-green-700", icon: CheckCircle },
  denied: { label: "Denied", className: "bg-red-100 text-red-600", icon: XCircle },
};

export default function ClaimsAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "denied" | "all">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    setLoadingClaims(true);
    const status = filter === "all" ? undefined : filter;
    getClaimRequests(status)
      .then(setClaims)
      .finally(() => setLoadingClaims(false));
  }, [filter]);

  const handleApprove = async (claim: ClaimRequest) => {
    if (!confirm(`Approve claim for "${claim.businessName}" by ${claim.userName}?`)) return;
    setActionLoading(claim.id);
    setMsg("");
    try {
      await approveClaimRequest(claim.id);
      setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status: "approved" } : c));
      setMsg(`Approved claim for ${claim.businessName}.`);
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (claim: ClaimRequest) => {
    if (!confirm(`Deny claim for "${claim.businessName}" by ${claim.userName}?`)) return;
    setActionLoading(claim.id);
    setMsg("");
    try {
      await denyClaimRequest(claim.id);
      setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status: "denied" } : c));
      setMsg(`Denied claim for ${claim.businessName}.`);
      setTimeout(() => setMsg(""), 4000);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) return <div className="ls-container py-3xl text-ls-secondary">Loading...</div>;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="ls-container py-2xl">
      {/* Header */}
      <div className="mb-2xl">
        <div className="flex items-center gap-sm mb-xs">
          <Link href="/admin" className="text-meta text-ls-secondary hover:text-ls-primary">Admin</Link>
          <span className="text-ls-secondary">/</span>
          <span className="text-meta text-ls-body">Claims</span>
        </div>
        <h1 className="text-page-title text-ls-primary">Business Claims</h1>
        <p className="text-body text-ls-secondary mt-xs">
          Review and approve business ownership claim requests.
        </p>
      </div>

      {msg && (
        <div className={`mb-lg p-md rounded-btn text-[13px] font-semibold ${msg.startsWith("Error") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {msg}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-sm mb-xl">
        {(["pending", "all", "approved", "denied"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-[12px] font-semibold px-md py-xs rounded-badge transition-colors capitalize ${
              filter === s ? "bg-ls-primary text-white" : "bg-ls-surface text-ls-secondary hover:text-ls-primary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Claims list */}
      {loadingClaims ? (
        <p className="text-[13px] text-ls-secondary py-2xl">Loading...</p>
      ) : claims.length === 0 ? (
        <div className="border-2 border-dashed border-ls-border rounded-card py-3xl text-center">
          <p className="text-[14px] text-ls-secondary">No {filter === "all" ? "" : filter} claims found.</p>
        </div>
      ) : (
        <div className="space-y-md">
          {claims.map((claim) => {
            const statusConf = STATUS_CONFIG[claim.status];
            const StatusIcon = statusConf.icon;
            const isActing = actionLoading === claim.id;

            return (
              <div key={claim.id} className="ls-card">
                <div className="flex items-start gap-lg">
                  {/* Business info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm flex-wrap mb-xs">
                      <Building2 size={14} className="text-ls-secondary shrink-0" />
                      <span className="text-[15px] font-semibold text-ls-primary truncate">{claim.businessName}</span>
                      <Link
                        href={`/admin/businesses/${claim.businessId}/edit`}
                        className="text-[11px] text-ls-secondary hover:text-ls-primary flex items-center gap-[2px]"
                        target="_blank"
                      >
                        <ExternalLink size={11} /> edit
                      </Link>
                    </div>

                    <div className="flex items-center gap-sm text-[12px] text-ls-secondary mb-sm">
                      <User size={12} className="shrink-0" />
                      <span>{claim.userName}</span>
                      <span>·</span>
                      <span>{claim.userEmail}</span>
                    </div>

                    {claim.note && (
                      <p className="text-[13px] text-ls-body bg-ls-surface rounded-btn px-md py-sm mb-sm italic">
                        "{claim.note}"
                      </p>
                    )}

                    <div className="flex items-center gap-sm text-[11px] text-ls-secondary">
                      <span className={`flex items-center gap-[4px] px-sm py-[2px] rounded-badge text-[11px] font-semibold ${statusConf.className}`}>
                        <StatusIcon size={11} /> {statusConf.label}
                      </span>
                      {claim.createdAt?.toDate && (
                        <span>{claim.createdAt.toDate().toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {claim.status === "pending" && (
                    <div className="flex gap-sm shrink-0">
                      <button
                        onClick={() => handleApprove(claim)}
                        disabled={isActing}
                        className="flex items-center gap-xs text-[12px] font-semibold text-green-600 border border-green-300 rounded-btn px-md py-xs hover:bg-green-50 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button
                        onClick={() => handleDeny(claim)}
                        disabled={isActing}
                        className="flex items-center gap-xs text-[12px] font-semibold text-red-500 border border-red-200 rounded-btn px-md py-xs hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <XCircle size={13} /> Deny
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

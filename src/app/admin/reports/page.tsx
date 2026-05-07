"use client";

import { useState, useEffect } from "react";
import { Flag, Check, Trash2, Loader2, Search, Eye } from "lucide-react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Report {
  id: string;
  contentType: string;
  contentId: string;
  reportedUserId: string;
  businessId?: string;
  reason: string;
  reportedBy: string;
  status: string;
  createdAt?: any;
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: "Inappropriate content",
  spam: "Spam or fake",
  harassment: "Harassment or bullying",
  misleading: "Misleading or false",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-red-100 text-red-700",
  reviewed: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  const flash = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc")));
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report)));
    } catch {
      // collection may not exist yet
      setReports([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "reports", id), { status });
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      flash(`Report marked as ${status}`);
    } catch {
      flash("Failed to update", true);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this report permanently?")) return;
    try {
      await deleteDoc(doc(db, "reports", id));
      setReports((prev) => prev.filter((r) => r.id !== id));
      flash("Report deleted");
    } catch {
      flash("Failed to delete", true);
    }
  };

  const fmtDate = (ts: any) => {
    if (!ts) return "—";
    const ms = ts.toMillis?.() ?? (ts.seconds ?? 0) * 1000;
    return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const filtered = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (filter) {
      const q = filter.toLowerCase();
      return (
        r.contentType.includes(q) ||
        r.reason.includes(q) ||
        r.reportedBy.toLowerCase().includes(q) ||
        r.reportedUserId.toLowerCase().includes(q) ||
        r.contentId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: reports.length,
    new: reports.filter((r) => r.status === "new").length,
    reviewed: reports.filter((r) => r.status === "reviewed").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };

  return (
    <div className="p-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Reports</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">
            {counts.new > 0 ? `${counts.new} new report${counts.new === 1 ? "" : "s"} to review` : "No new reports"}
          </p>
        </div>
        {msg && (
          <span className={`text-[13px] font-semibold ${msg.err ? "text-red-600" : "text-green-600"}`}>
            {msg.err ? "⚠ " : "✓ "}{msg.text}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-md mb-xl">
        {(["all", "new", "reviewed", "resolved", "dismissed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-card p-md text-center transition-colors ${statusFilter === s ? "bg-ls-primary text-white" : "bg-white border border-ls-border hover:bg-ls-surface"}`}
          >
            <p className={`text-[20px] font-bold ${statusFilter === s ? "text-white" : "text-ls-primary"}`}>
              {counts[s]}
            </p>
            <p className={`text-[11px] font-semibold uppercase tracking-wide ${statusFilter === s ? "text-white/70" : "text-ls-secondary"}`}>
              {s === "all" ? "Total" : s.charAt(0).toUpperCase() + s.slice(1)}
            </p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-xl max-w-sm">
        <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
        <input
          type="text"
          placeholder="Search by ID, reason, user..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-[38px] pr-md py-[9px] bg-white border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-card border border-ls-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ls-border bg-gray-50">
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Type</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Reason</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Content ID</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Reported By</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Date</th>
                <th className="text-left px-lg py-md font-semibold text-ls-secondary uppercase tracking-wide text-[11px]">Status</th>
                <th className="px-lg py-md w-[120px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ls-border">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-lg py-md"><div className="h-4 bg-ls-surface rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-lg py-3xl text-center text-ls-secondary">
                    <Flag size={28} className="mx-auto mb-sm text-ls-border" />
                    No reports found
                  </td>
                </tr>
              ) : (
                filtered.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 group">
                    <td className="px-lg py-md">
                      <span className={`inline-block px-[8px] py-[2px] rounded-badge text-[11px] font-semibold ${
                        report.contentType === "review" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {report.contentType === "review" ? "Review" : "Photo"}
                      </span>
                    </td>
                    <td className="px-lg py-md text-ls-primary font-medium">
                      {REASON_LABELS[report.reason] || report.reason}
                    </td>
                    <td className="px-lg py-md">
                      <span className="font-mono text-[11px] text-ls-secondary">{report.contentId.slice(0, 12)}...</span>
                    </td>
                    <td className="px-lg py-md">
                      <span className="font-mono text-[11px] text-ls-secondary">{report.reportedBy.slice(0, 12)}...</span>
                    </td>
                    <td className="px-lg py-md text-ls-secondary text-[12px]">
                      {fmtDate(report.createdAt)}
                    </td>
                    <td className="px-lg py-md">
                      <span className={`inline-block px-[8px] py-[2px] rounded-badge text-[11px] font-semibold ${STATUS_COLORS[report.status] || "bg-gray-100 text-gray-500"}`}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity">
                        {report.status === "new" && (
                          <button
                            onClick={() => updateStatus(report.id, "reviewed")}
                            className="p-[4px] text-yellow-600 hover:text-yellow-700"
                            title="Mark as reviewed"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        {(report.status === "new" || report.status === "reviewed") && (
                          <>
                            <button
                              onClick={() => updateStatus(report.id, "resolved")}
                              className="p-[4px] text-green-600 hover:text-green-700"
                              title="Resolve"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => updateStatus(report.id, "dismissed")}
                              className="p-[4px] text-ls-secondary hover:text-ls-primary"
                              title="Dismiss"
                            >
                              <Flag size={14} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => remove(report.id)}
                          className="p-[4px] text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

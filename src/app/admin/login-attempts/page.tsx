"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle2, XCircle, Globe, Smartphone, Apple, Mail, RefreshCw } from "lucide-react";

type Attempt = {
  id: string;
  method?: "email" | "google" | "apple";
  outcome?: "success" | "failure";
  platform?: "ios" | "web";
  email?: string;
  userId?: string;
  errorCode?: string;
  errorMessage?: string;
  appVersion?: string;
  buildNumber?: string;
  device?: string;
  systemVersion?: string;
  userAgent?: string;
  timestamp?: { toDate?: () => Date } | Date | null;
};

const PAGE = 200;

export default function LoginAttemptsPage() {
  const [rows, setRows] = useState<Attempt[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "failure" | "success">("all");

  async function load() {
    setLoading(true);
    try {
      const q = query(collection(db, "loginAttempts"), orderBy("timestamp", "desc"), limit(PAGE));
      const snap = await getDocs(q);
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch (err) {
      console.error("loginAttempts load failed", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const r = rows ?? [];
    const total = r.length;
    const success = r.filter((x) => x.outcome === "success").length;
    const failure = r.filter((x) => x.outcome === "failure").length;
    const successRate = total ? Math.round((success / total) * 100) : 0;
    const byMethod: Record<string, { ok: number; fail: number }> = {};
    r.forEach((x) => {
      const m = x.method || "?";
      byMethod[m] = byMethod[m] || { ok: 0, fail: 0 };
      if (x.outcome === "success") byMethod[m].ok++;
      else if (x.outcome === "failure") byMethod[m].fail++;
    });
    const errorCodes: Record<string, number> = {};
    r.filter((x) => x.outcome === "failure").forEach((x) => {
      const k = x.errorCode || "(unknown)";
      errorCodes[k] = (errorCodes[k] || 0) + 1;
    });
    const topErrors = Object.entries(errorCodes).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { total, success, failure, successRate, byMethod, topErrors };
  }, [rows]);

  const filtered = useMemo(() => {
    const r = rows ?? [];
    if (filter === "all") return r;
    return r.filter((x) => x.outcome === filter);
  }, [rows, filter]);

  function tsString(ts: Attempt["timestamp"]) {
    if (!ts) return "";
    const d = ts instanceof Date ? ts : ts?.toDate?.();
    return d ? d.toLocaleString() : "";
  }

  return (
    <div className="px-2xl py-2xl max-w-[1100px]">
      <div className="flex items-start justify-between mb-xl gap-md">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary mb-xs">Login Attempts</h1>
          <p className="text-[13px] text-ls-secondary">
            Most recent {PAGE} attempts across iOS + web. Used to spot login failures.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-xs text-[12px] font-semibold text-ls-primary border border-ls-border rounded-btn px-md py-xs hover:bg-ls-surface disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-xl">
        <Stat label="Total" value={stats.total.toString()} />
        <Stat label="Success" value={stats.success.toString()} sub={`${stats.successRate}%`} positive />
        <Stat label="Failure" value={stats.failure.toString()} negative />
        <Stat label="Methods seen" value={Object.keys(stats.byMethod).length.toString()} />
      </div>

      {/* By method */}
      {Object.keys(stats.byMethod).length > 0 && (
        <div className="bg-white border border-ls-border rounded-card p-lg mb-xl">
          <h2 className="text-[14px] font-semibold text-ls-primary mb-md">By method</h2>
          <div className="space-y-xs text-[13px]">
            {Object.entries(stats.byMethod).map(([m, c]) => {
              const t = c.ok + c.fail;
              const rate = t ? Math.round((c.ok / t) * 100) : 0;
              return (
                <div key={m} className="flex items-center justify-between">
                  <span className="capitalize text-ls-primary">{m}</span>
                  <span className="text-ls-secondary">
                    <span className="text-green-700">{c.ok}</span> ok ·{" "}
                    <span className="text-red-700">{c.fail}</span> fail · {rate}% success
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top errors */}
      {stats.topErrors.length > 0 && (
        <div className="bg-white border border-ls-border rounded-card p-lg mb-xl">
          <h2 className="text-[14px] font-semibold text-ls-primary mb-md">Top error codes</h2>
          <div className="space-y-xs text-[13px]">
            {stats.topErrors.map(([code, n]) => (
              <div key={code} className="flex items-center justify-between">
                <code className="text-[12px] bg-ls-surface px-xs rounded">{code}</code>
                <span className="text-ls-secondary">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-sm mb-md">
        {(["all", "failure", "success"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[12px] font-semibold px-md py-xs rounded-btn capitalize ${
              filter === f
                ? "bg-ls-primary text-white"
                : "bg-white border border-ls-border text-ls-secondary hover:bg-ls-surface"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-ls-border rounded-card overflow-hidden">
        {loading && rows === null ? (
          <div className="p-xl text-center text-ls-secondary text-[13px]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-xl text-center text-ls-secondary text-[13px]">No attempts yet.</div>
        ) : (
          <div className="divide-y divide-ls-border">
            {filtered.map((r) => (
              <div key={r.id} className="px-md py-sm flex items-start gap-md text-[12px]">
                <span className="shrink-0 mt-[2px]">
                  {r.outcome === "success" ? (
                    <CheckCircle2 size={14} className="text-green-600" />
                  ) : (
                    <XCircle size={14} className="text-red-500" />
                  )}
                </span>
                <span className="shrink-0 mt-[2px] text-ls-secondary">
                  {r.method === "google" ? <Globe size={12} /> : r.method === "apple" ? <Apple size={12} /> : <Mail size={12} />}
                </span>
                <span className="shrink-0 mt-[2px] text-ls-secondary">
                  {r.platform === "ios" ? <Smartphone size={12} /> : <Globe size={12} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-sm items-baseline">
                    <span className="font-semibold capitalize text-ls-primary">{r.method}</span>
                    {r.email && <span className="text-ls-secondary">{r.email}</span>}
                    {r.errorCode && (
                      <code className="text-[11px] bg-ls-surface px-xs rounded text-red-700">{r.errorCode}</code>
                    )}
                  </div>
                  {r.errorMessage && <p className="text-ls-secondary mt-[2px]">{r.errorMessage}</p>}
                  <div className="text-[11px] text-ls-secondary/70 mt-[2px]">
                    {tsString(r.timestamp)}
                    {r.platform === "ios" && r.appVersion && <> · v{r.appVersion} ({r.buildNumber})</>}
                    {r.platform === "ios" && r.systemVersion && <> · iOS {r.systemVersion}</>}
                    {r.userAgent && <> · {r.userAgent.slice(0, 80)}</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, positive, negative }: { label: string; value: string; sub?: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="bg-white border border-ls-border rounded-card p-md">
      <div className="text-[11px] uppercase tracking-wider text-ls-secondary">{label}</div>
      <div
        className={`text-[24px] font-bold mt-xs ${
          positive ? "text-green-700" : negative ? "text-red-700" : "text-ls-primary"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-ls-secondary mt-[2px]">{sub}</div>}
    </div>
  );
}

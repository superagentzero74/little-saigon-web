"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Globe, Smartphone, RefreshCw, AlertCircle } from "lucide-react";

type Row = {
  id: string;
  query?: string;
  normalized?: string;
  resultCount?: number;
  source?: string;
  platform?: "ios" | "web";
  userId?: string;
  appVersion?: string;
  buildNumber?: string;
  device?: string;
  systemVersion?: string;
  userAgent?: string;
  timestamp?: { toDate?: () => Date } | Date | null;
};

const PAGE = 500;

export default function SearchQueriesPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const q = query(collection(db, "searchQueries"), orderBy("timestamp", "desc"), limit(PAGE));
      const snap = await getDocs(q);
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch (err) {
      console.error("searchQueries load failed", err);
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
    const now = Date.now();
    const dayAgo = now - 86400 * 1000;
    const weekAgo = now - 7 * 86400 * 1000;
    const tsMs = (x: Row) => {
      const t = x.timestamp;
      if (!t) return 0;
      const d = t instanceof Date ? t : t?.toDate?.();
      return d ? d.getTime() : 0;
    };
    const today = r.filter((x) => tsMs(x) > dayAgo).length;
    const week = r.filter((x) => tsMs(x) > weekAgo).length;

    // Top queries by normalized form
    const counts: Record<string, { display: string; count: number; zeroResultHits: number }> = {};
    r.forEach((x) => {
      const key = (x.normalized || x.query || "").toLowerCase();
      if (!key) return;
      if (!counts[key]) counts[key] = { display: x.query || key, count: 0, zeroResultHits: 0 };
      counts[key].count++;
      if (x.resultCount === 0) counts[key].zeroResultHits++;
    });
    const top = Object.entries(counts)
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
    const zeroResult = Object.entries(counts)
      .map(([k, v]) => ({ key: k, ...v }))
      .filter((v) => v.zeroResultHits > 0)
      .sort((a, b) => b.zeroResultHits - a.zeroResultHits)
      .slice(0, 30);

    const byPlatform = { ios: 0, web: 0 };
    r.forEach((x) => {
      if (x.platform === "ios") byPlatform.ios++;
      else if (x.platform === "web") byPlatform.web++;
    });

    return { total, today, week, top, zeroResult, byPlatform };
  }, [rows]);

  function tsString(ts: Row["timestamp"]) {
    if (!ts) return "";
    const d = ts instanceof Date ? ts : ts?.toDate?.();
    return d ? d.toLocaleString() : "";
  }

  return (
    <div className="px-2xl py-2xl max-w-[1100px]">
      <div className="flex items-start justify-between mb-xl gap-md">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary mb-xs">Search Queries</h1>
          <p className="text-[13px] text-ls-secondary">
            Most recent {PAGE} searches across iOS + web. Useful for spotting demand gaps (zero-result queries).
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-xl">
        <Stat label="Total (last 500)" value={stats.total.toString()} />
        <Stat label="Last 24h" value={stats.today.toString()} />
        <Stat label="Last 7 days" value={stats.week.toString()} />
        <Stat label="iOS / Web" value={`${stats.byPlatform.ios} / ${stats.byPlatform.web}`} />
      </div>

      {/* Top queries */}
      <div className="bg-white border border-ls-border rounded-card p-lg mb-xl">
        <h2 className="text-[14px] font-semibold text-ls-primary mb-md flex items-center gap-sm">
          <Search size={14} /> Top queries
        </h2>
        {stats.top.length === 0 ? (
          <p className="text-[13px] text-ls-secondary">No data yet.</p>
        ) : (
          <div className="space-y-xs text-[13px]">
            {stats.top.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-md">
                <span className="text-ls-primary truncate">{t.display}</span>
                <span className="shrink-0 text-ls-secondary">
                  {t.count}× {t.zeroResultHits > 0 && <span className="text-red-600">· {t.zeroResultHits} no-result</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zero-result queries — high signal */}
      <div className="bg-white border border-ls-border rounded-card p-lg mb-xl">
        <h2 className="text-[14px] font-semibold text-ls-primary mb-md flex items-center gap-sm">
          <AlertCircle size={14} className="text-red-600" /> Zero-result queries
        </h2>
        <p className="text-[12px] text-ls-secondary mb-md">
          These are searches that returned nothing. Strong signal for what to add to the directory or tag better.
        </p>
        {stats.zeroResult.length === 0 ? (
          <p className="text-[13px] text-ls-secondary">No zero-result searches in the recent window 🎉</p>
        ) : (
          <div className="space-y-xs text-[13px]">
            {stats.zeroResult.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-md">
                <span className="text-ls-primary truncate">{t.display}</span>
                <span className="shrink-0 text-red-700 font-semibold">{t.zeroResultHits} no-result</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent feed */}
      <div className="bg-white border border-ls-border rounded-card overflow-hidden">
        <div className="px-md py-sm text-[12px] font-semibold uppercase tracking-wider text-ls-secondary border-b border-ls-border bg-ls-surface/50">
          Recent
        </div>
        {loading && rows === null ? (
          <div className="p-xl text-center text-ls-secondary text-[13px]">Loading…</div>
        ) : (rows ?? []).length === 0 ? (
          <div className="p-xl text-center text-ls-secondary text-[13px]">No searches yet.</div>
        ) : (
          <div className="divide-y divide-ls-border">
            {(rows ?? []).slice(0, 100).map((r) => (
              <div key={r.id} className="px-md py-sm flex items-start gap-md text-[12px]">
                <span className="shrink-0 mt-[2px] text-ls-secondary">
                  {r.platform === "ios" ? <Smartphone size={12} /> : <Globe size={12} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-sm items-baseline">
                    <span className="font-semibold text-ls-primary truncate">{r.query}</span>
                    <span className={`text-[11px] ${r.resultCount === 0 ? "text-red-600" : "text-ls-secondary"}`}>
                      {r.resultCount ?? 0} result{r.resultCount === 1 ? "" : "s"}
                    </span>
                    {r.source && <span className="text-[11px] text-ls-secondary/70">· {r.source}</span>}
                  </div>
                  <div className="text-[11px] text-ls-secondary/70 mt-[2px]">
                    {tsString(r.timestamp)}
                    {r.platform === "ios" && r.appVersion && <> · v{r.appVersion} ({r.buildNumber})</>}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-ls-border rounded-card p-md">
      <div className="text-[11px] uppercase tracking-wider text-ls-secondary">{label}</div>
      <div className="text-[24px] font-bold text-ls-primary mt-xs">{value}</div>
    </div>
  );
}

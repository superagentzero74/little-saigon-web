"use client";

import { useEffect, useState } from "react";
import { Trash2, Star, Search } from "lucide-react";
import { getAllReviews, deleteReview, getBusinessById } from "@/lib/services";
import type { Review, Business } from "@/lib/types";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [businesses, setBusinesses] = useState<Record<string, Business>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "">("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getAllReviews(100).then(async (revs) => {
      setReviews(revs);
      const ids = Array.from(new Set(revs.map((r) => r.businessId)));
      const bizzes = await Promise.all(ids.map((id) => getBusinessById(id)));
      const map: Record<string, Business> = {};
      bizzes.forEach((b) => { if (b) map[b.id] = b; });
      setBusinesses(map);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await deleteReview(id);
    setReviews((p) => p.filter((r) => r.id !== id));
    setMsg("Review deleted");
    setTimeout(() => setMsg(""), 2000);
  };

  const fmtDate = (ts: any) => {
    if (!ts) return "";
    const ms = ts.toMillis?.() ?? ts.seconds * 1000;
    return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const filtered = reviews.filter((r) => {
    if (ratingFilter && r.rating !== ratingFilter) return false;
    if (filter) {
      const q = filter.toLowerCase();
      const biz = businesses[r.businessId];
      return (
        r.userName?.toLowerCase().includes(q) ||
        biz?.name?.toLowerCase().includes(q) ||
        r.text?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-2xl">
      <div className="flex items-center justify-between mb-2xl">
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Reviews</h1>
          <p className="text-[14px] text-ls-secondary mt-xs">{reviews.length} total reviews</p>
        </div>
        {msg && <span className="text-[13px] font-semibold text-green-600">{msg}</span>}
      </div>

      <div className="flex flex-col sm:flex-row gap-md mb-xl">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-ls-secondary" />
          <input
            type="text"
            placeholder="Search by user, business, or content…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-[38px] pr-md py-[9px] bg-white border border-ls-border rounded-btn text-[14px] focus:outline-none focus:border-ls-primary"
          />
        </div>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value ? Number(e.target.value) : "")}
          className="bg-white border border-ls-border rounded-btn px-md py-[9px] text-[14px] focus:outline-none focus:border-ls-primary"
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>{"★".repeat(r)} ({r} stars)</option>
          ))}
        </select>
      </div>

      <div className="space-y-md">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-card border border-ls-border p-lg animate-pulse">
              <div className="h-4 bg-ls-surface rounded w-1/3 mb-sm" />
              <div className="h-3 bg-ls-surface rounded w-2/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <p className="text-center py-2xl text-ls-secondary text-[14px]">No reviews found.</p>
        ) : filtered.map((r) => {
          const biz = businesses[r.businessId];
          return (
            <div key={r.id} className="bg-white rounded-card border border-ls-border p-lg">
              <div className="flex items-start justify-between gap-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-md flex-wrap mb-xs">
                    <span className="text-[13px] font-semibold text-ls-primary">{r.userName}</span>
                    <div className="flex gap-[2px]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} className={s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-ls-border"} />
                      ))}
                    </div>
                    <span className="text-[11px] text-ls-secondary">{fmtDate(r.createdAt)}</span>
                  </div>
                  {biz && (
                    <p className="text-[12px] text-ls-secondary mb-xs">
                      @ <span className="font-medium text-ls-primary">{biz.name}</span> · {biz.category}
                    </p>
                  )}
                  {r.text && <p className="text-[13px] text-ls-body leading-relaxed">{r.text}</p>}
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="shrink-0 p-xs text-ls-secondary hover:text-red-500 transition-colors"
                  title="Delete review"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

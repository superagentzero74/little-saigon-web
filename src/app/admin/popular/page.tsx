"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Store, UtensilsCrossed, Eye, ChevronLeft } from "lucide-react";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ViewEntry {
  id: string;
  name: string;
  views: number; // unique users
}

type Period = "7d" | "30d" | "all";

function daysAgo(days: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - days * 86400000));
}

export default function PopularPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [topBusinesses, setTopBusinesses] = useState<ViewEntry[]>([]);
  const [topFoods, setTopFoods] = useState<ViewEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const constraints = [
          where("event", "==", "listing_view"),
        ];
        if (period !== "all") {
          constraints.push(where("timestamp", ">=", daysAgo(period === "7d" ? 7 : 30)));
        }

        let docs;
        try {
          const q = query(collection(db, "eventLog"), ...constraints);
          const snap = await getDocs(q);
          docs = snap.docs;
        } catch {
          // Index may not be ready — fall back to fetching all listing_view events and filtering client-side
          const fallbackQ = query(collection(db, "eventLog"), where("event", "==", "listing_view"));
          const fallbackSnap = await getDocs(fallbackQ);
          docs = fallbackSnap.docs;
          if (period !== "all") {
            const cutoff = daysAgo(period === "7d" ? 7 : 30).toMillis();
            docs = docs.filter((d) => (d.data().timestamp?.toMillis?.() || 0) >= cutoff);
          }
        }

        const bizUsers: Record<string, { name: string; users: Set<string> }> = {};
        const foodUsers: Record<string, { name: string; users: Set<string> }> = {};
        const platforms: Record<string, number> = {};
        const allUniqueUsers = new Set<string>();
        let total = 0;

        docs.forEach((d) => {
          const data = d.data();
          total++;
          // Web uses listingId/listingName/listingType, iOS uses business_id/business_name
          const id = data.listingId || data.business_id || "";
          const name = data.listingName || data.business_name || id;
          const type = data.listingType || "business";
          const platform = data.platform || "unknown";
          const userId = data.userId || "anonymous";

          if (!id) return;
          platforms[platform] = (platforms[platform] || 0) + 1;
          allUniqueUsers.add(userId);

          if (type === "food") {
            if (!foodUsers[id]) foodUsers[id] = { name, users: new Set() };
            foodUsers[id].users.add(userId);
          } else {
            if (!bizUsers[id]) bizUsers[id] = { name, users: new Set() };
            bizUsers[id].users.add(userId);
          }
        });

        setTopBusinesses(
          Object.entries(bizUsers)
            .map(([id, { name, users }]) => ({ id, name, views: users.size }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 25)
        );
        setTopFoods(
          Object.entries(foodUsers)
            .map(([id, { name, users }]) => ({ id, name, views: users.size }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 25)
        );
        setTotalViews(allUniqueUsers.size);
        setPlatformCounts(platforms);
      } catch (e) {
        console.error("Failed to load popular data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  const maxBiz = topBusinesses[0]?.views || 1;
  const maxFood = topFoods[0]?.views || 1;

  return (
    <div className="p-2xl">
      <div className="mb-2xl">
        <div className="flex items-center gap-sm mb-xs">
          <Link href="/admin" className="text-meta text-ls-secondary hover:text-ls-primary">Admin</Link>
          <span className="text-ls-secondary">/</span>
          <span className="text-meta text-ls-body">Popular</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-ls-primary flex items-center gap-sm">
              <TrendingUp size={24} /> Popular
            </h1>
            <p className="text-[14px] text-ls-secondary mt-xs">
              Most viewed businesses and foods by unique users{!loading && ` — ${totalViews.toLocaleString()} unique visitors`}
            </p>
          </div>
          <div className="flex gap-sm">
            {(["7d", "30d", "all"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-[12px] font-semibold px-md py-xs rounded-badge transition-colors ${
                  period === p ? "bg-ls-primary text-white" : "bg-ls-surface text-ls-secondary hover:text-ls-primary"
                }`}
              >
                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "All Time"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-card border border-ls-border p-lg">
              {[...Array(8)].map((_, j) => (
                <div key={j} className="h-8 bg-ls-surface rounded animate-pulse mb-sm" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl">
          {/* Top Businesses */}
          <div className="bg-white rounded-card border border-ls-border">
            <div className="flex items-center gap-sm px-lg py-md border-b border-ls-border">
              <Store size={16} className="text-blue-500" />
              <h2 className="text-[14px] font-semibold text-ls-primary">Top Businesses</h2>
              <span className="text-[12px] text-ls-secondary ml-auto">{topBusinesses.length} listings</span>
            </div>
            {topBusinesses.length === 0 ? (
              <div className="px-lg py-xl text-center">
                <Eye size={24} className="text-ls-secondary mx-auto mb-sm" />
                <p className="text-[13px] text-ls-secondary">No business views yet for this period.</p>
                <p className="text-[12px] text-ls-secondary mt-xs">Views will appear as users visit business pages.</p>
              </div>
            ) : (
              <div className="divide-y divide-ls-border">
                {topBusinesses.map((biz, i) => (
                  <div key={biz.id} className="flex items-center gap-md px-lg py-[10px] hover:bg-gray-50">
                    <span className="text-[12px] font-bold text-ls-secondary w-[24px] text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/businesses/${biz.id}/edit`} className="text-[13px] font-medium text-ls-primary hover:underline truncate block">
                        {biz.name}
                      </Link>
                      <div className="mt-[3px] h-[4px] bg-ls-surface rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(biz.views / maxBiz) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-[13px] font-semibold text-ls-primary shrink-0 tabular-nums">
                      {biz.views.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Foods */}
          <div className="bg-white rounded-card border border-ls-border">
            <div className="flex items-center gap-sm px-lg py-md border-b border-ls-border">
              <UtensilsCrossed size={16} className="text-amber-500" />
              <h2 className="text-[14px] font-semibold text-ls-primary">Top Foods</h2>
              <span className="text-[12px] text-ls-secondary ml-auto">{topFoods.length} items</span>
            </div>
            {topFoods.length === 0 ? (
              <div className="px-lg py-xl text-center">
                <Eye size={24} className="text-ls-secondary mx-auto mb-sm" />
                <p className="text-[13px] text-ls-secondary">No food views yet for this period.</p>
                <p className="text-[12px] text-ls-secondary mt-xs">Views will appear as users visit food guide pages.</p>
              </div>
            ) : (
              <div className="divide-y divide-ls-border">
                {topFoods.map((food, i) => (
                  <div key={food.id} className="flex items-center gap-md px-lg py-[10px] hover:bg-gray-50">
                    <span className="text-[12px] font-bold text-ls-secondary w-[24px] text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ls-primary truncate">{food.name}</p>
                      <div className="mt-[3px] h-[4px] bg-ls-surface rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(food.views / maxFood) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-[13px] font-semibold text-ls-primary shrink-0 tabular-nums">
                      {food.views.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

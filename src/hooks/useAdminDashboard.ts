import { useEffect, useState } from "react";
import {
  onSnapshot, collection, query,
  where, orderBy, limit, Timestamp, getDocs
} from "firebase/firestore";

/** Returns local date as YYYY-MM-DD */
function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
import { db } from "@/lib/firebase";

// ── Types ────────────────────────────────────────────────────────

export interface DailyStats {
  date:           string;
  uniqueVisitors: number;
  totalSessions:  number;
  pageViews:      number;
  newMembers:     number;
  dongEarned:     number;
  dongRedeemed:   number;
  qrScans:        number;
  offersRedeemed: number;
  topPages:       { page: string; count: number }[];
  topBusinesses:  { businessId: string; views: number }[];
  categoryBreakdown: Record<string, number>;
}

export interface LiveUser {
  sessionId:   string;
  displayName: string;
  currentPage: string;
  platform:    "ios" | "android" | "web";
  lastSeen:    Timestamp;
}

// ── useAdminStats ────────────────────────────────────────────────

// Shared cache: fetch all eventLog docs once, reuse across hooks
let _allEventsCache: { data: any[]; fetchedAt: number } | null = null;

// Exclude admin accounts from analytics
const EXCLUDED_UIDS = new Set(["elhHNPSIIkOZotNASqjztveNEry1", "gJkPAs3yvbUjkL3EvI3A7HVFtOw1"]);

async function getAllEvents(): Promise<any[]> {
  // Cache for 30 seconds
  if (_allEventsCache && Date.now() - _allEventsCache.fetchedAt < 30000) {
    return _allEventsCache.data;
  }
  const snap = await getDocs(query(collection(db, "eventLog"), limit(5000)));
  const data = snap.docs.map((d) => {
    const raw = d.data();
    return { ...raw, _ts: raw.timestamp?.toDate?.() || null };
  }).filter((e: any) => !EXCLUDED_UIDS.has(e.userId));
  _allEventsCache = { data, fetchedAt: Date.now() };
  return data;
}

function filterByDate(events: any[], dateStr: string): any[] {
  const dayStart = new Date(dateStr + "T00:00:00");
  const dayEnd = new Date(dateStr + "T23:59:59.999");
  return events.filter((e) => e._ts && e._ts >= dayStart && e._ts <= dayEnd);
}

function aggregateEvents(events: any[], dateStr: string): DailyStats {
  const uniqueUsers = new Set(events.map((e) => e.userId).filter((u: string) => u && u !== "anonymous"));
  const webEvents = events.filter((e: any) => e.platform === "web");
  const pageViews = events.filter((e: any) => ["screen_view", "listing_view", "page_view"].includes(e.event)).length;
  const dongEarned = events.filter((e: any) => e.event === "dong_earned").reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const dongRedeemed = events.filter((e: any) => e.event === "offer_redeemed").reduce((s: number, e: any) => s + (e.dong_amount || 0), 0);
  const qrScans = events.filter((e: any) => e.event === "qr_scan").length;
  const offersRedeemed = events.filter((e: any) => e.event === "offer_redeemed").length;
  const appOpens = events.filter((e: any) => e.event === "app_open").length;
  const webSessions = events.filter((e: any) => e.event === "web_session").length;

  const pageCounts: Record<string, number> = {};
  events.filter((e: any) => e.event === "listing_view" && e.business_name).forEach((e: any) => {
    pageCounts[e.business_name] = (pageCounts[e.business_name] || 0) + 1;
  });
  webEvents.filter((e: any) => e.event === "page_view" && e.page).forEach((e: any) => {
    pageCounts[e.page] = (pageCounts[e.page] || 0) + 1;
  });
  const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([page, count]) => ({ page, count }));

  const bizCounts: Record<string, number> = {};
  events.filter((e: any) => e.event === "listing_view" && e.business_id).forEach((e: any) => {
    bizCounts[e.business_id] = (bizCounts[e.business_id] || 0) + 1;
  });
  const topBusinesses = Object.entries(bizCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([businessId, views]) => ({ businessId, views }));

  return {
    date: dateStr,
    uniqueVisitors: uniqueUsers.size,
    totalSessions: appOpens + webSessions || uniqueUsers.size,
    pageViews,
    newMembers: 0,
    dongEarned,
    dongRedeemed,
    qrScans,
    offersRedeemed,
    topPages,
    topBusinesses,
    categoryBreakdown: {},
  };
}

export function useAdminStats(dateKey?: string) {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const today = dateKey ?? localDateStr();

  useEffect(() => {
    getAllEvents()
      .then((all) => {
        const dayEvents = filterByDate(all, today);
        setStats(aggregateEvents(dayEvents, today));
      })
      .catch((err) => {
        console.error("Failed to load stats:", err);
        setStats({ date: today, uniqueVisitors: 0, totalSessions: 0, pageViews: 0, newMembers: 0, dongEarned: 0, dongRedeemed: 0, qrScans: 0, offersRedeemed: 0, topPages: [], topBusinesses: [], categoryBreakdown: {} });
      })
      .finally(() => setLoading(false));
  }, [today]);

  return { stats, loading };
}

// ── useLiveUsers ─────────────────────────────────────────────────

export function useLiveUsers(maxUsers = 20) {
  const [users, setUsers]     = useState<LiveUser[]>([]);
  const [liveCount, setCount] = useState(0);

  useEffect(() => {
    const now = Timestamp.now();

    const q = query(
      collection(db, "sessions"),
      where("ttl", ">", now),
      orderBy("ttl", "desc"),
      limit(maxUsers)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        sessionId:   d.id,
        ...d.data()
      })) as LiveUser[];

      setUsers(list);
      setCount(list.length);
    });

    return () => unsub();
  }, [maxUsers]);

  return { users, liveCount };
}

// ── useWeeklyStats ───────────────────────────────────────────────

export function useWeeklyStats() {
  const [weekData, setWeekData] = useState<DailyStats[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(localDateStr(d));
    }

    getAllEvents()
      .then((all) => {
        setWeekData(dates.map((date) => aggregateEvents(filterByDate(all, date), date)));
      })
      .catch(() => {
        setWeekData(dates.map((date) => ({
          date, uniqueVisitors: 0, pageViews: 0, newMembers: 0,
          dongEarned: 0, dongRedeemed: 0, qrScans: 0,
          offersRedeemed: 0, totalSessions: 0,
          topPages: [], topBusinesses: [], categoryBreakdown: {}
        })));
      })
      .finally(() => setLoading(false));
  }, []);

  return { weekData, loading };
}

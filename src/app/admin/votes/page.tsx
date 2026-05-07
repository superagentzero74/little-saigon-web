"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { collection, query, limit, onSnapshot, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface DishVote {
  id: string;
  dishId: number;
  businessId: string;
  userId: string;
  vote: number; // 1 = upvote, -1 = downvote
  createdAt: Date | null;
}

interface Business {
  id: string;
  name: string;
}

interface Dish {
  id: number;
  vietnameseName: string;
  englishName: string;
}

export default function AdminVotesPage() {
  const [votes, setVotes] = useState<DishVote[]>([]);
  const [businesses, setBusinesses] = useState<Record<string, string>>({});
  const [dishes, setDishes] = useState<Record<number, Dish>>({});
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);

  // Load dish names from Firestore
  useEffect(() => {
    getDocs(collection(db, "foods")).then((snap) => {
      const map: Record<number, Dish> = {};
      snap.docs.forEach((doc) => {
        const d = doc.data();
        if (d.id) map[d.id] = { id: d.id, vietnameseName: d.vietnameseName || "", englishName: d.englishName || "" };
      });
      setDishes(map);
    });
  }, []);

  // Real-time listener for votes
  useEffect(() => {
    const q = query(collection(db, "dishVotes"), limit(200));

    const unsub = onSnapshot(q, async (snap) => {
      const newVotes: DishVote[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          dishId: d.dishId,
          businessId: d.businessId,
          userId: d.userId,
          vote: d.vote,
          createdAt: d.createdAt?.toDate?.() || null,
        };
      });
      newVotes.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      setVotes(newVotes);

      // Fetch business names we don't have yet
      const missingBizIds = Array.from(new Set(newVotes.map((v) => v.businessId))).filter((id) => !businesses[id]);
      if (missingBizIds.length > 0) {
        const bizMap = { ...businesses };
        for (const id of missingBizIds.slice(0, 10)) {
          try {
            const bizSnap = await getDocs(query(collection(db, "businesses"), where("__name__", "==", id)));
            if (!bizSnap.empty) bizMap[id] = bizSnap.docs[0].data().name || id;
            else bizMap[id] = id.slice(0, 8);
          } catch { bizMap[id] = id.slice(0, 8); }
        }
        setBusinesses(bizMap);
      }

      // Fetch user names we don't have yet
      const missingUserIds = Array.from(new Set(newVotes.map((v) => v.userId))).filter((id) => !users[id]);
      if (missingUserIds.length > 0) {
        const userMap = { ...users };
        for (const id of missingUserIds.slice(0, 10)) {
          try {
            const userSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", id)));
            if (!userSnap.empty) userMap[id] = userSnap.docs[0].data().displayName || id.slice(0, 8);
            else userMap[id] = id.slice(0, 8);
          } catch { userMap[id] = id.slice(0, 8); }
        }
        setUsers(userMap);
      }

      setLoading(false);
    }, (err) => {
      console.error("Votes listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stats
  const totalUp = votes.filter((v) => v.vote === 1).length;
  const totalDown = votes.filter((v) => v.vote === -1).length;
  const uniqueUsers = new Set(votes.map((v) => v.userId)).size;
  const uniqueDishes = new Set(votes.map((v) => v.dishId)).size;

  // Today's votes
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayVotes = votes.filter((v) => v.createdAt && v.createdAt >= today);
  const todayUp = todayVotes.filter((v) => v.vote === 1).length;
  const todayDown = todayVotes.filter((v) => v.vote === -1).length;

  const formatTime = (date: Date | null) => {
    if (!date) return "—";
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const dishName = (dishId: number) => {
    const d = dishes[dishId];
    return d ? `${d.vietnameseName} (${d.englishName})` : `Dish #${dishId}`;
  };

  return (
    <div className="p-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dish Votes</h1>
          <p className="text-sm text-gray-500">Real-time upvotes & downvotes from the Mon Viet Guide</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isLive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {isLive ? "Live" : "Paused"}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Votes</p>
          <p className="text-2xl font-bold mt-1">{votes.length}</p>
          <div className="flex gap-3 mt-1 text-sm">
            <span className="text-green-600 flex items-center gap-1"><ThumbsUp size={12} />{totalUp}</span>
            <span className="text-red-500 flex items-center gap-1"><ThumbsDown size={12} />{totalDown}</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Today</p>
          <p className="text-2xl font-bold mt-1">{todayVotes.length}</p>
          <div className="flex gap-3 mt-1 text-sm">
            <span className="text-green-600 flex items-center gap-1"><ThumbsUp size={12} />{todayUp}</span>
            <span className="text-red-500 flex items-center gap-1"><ThumbsDown size={12} />{todayDown}</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Unique Voters</p>
          <p className="text-2xl font-bold mt-1">{uniqueUsers}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Dishes Voted</p>
          <p className="text-2xl font-bold mt-1">{uniqueDishes}</p>
        </div>
      </div>

      {/* Vote Feed */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Vote Feed</h2>
          <span className="text-xs text-gray-400">Latest 200</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="animate-spin text-gray-400" size={24} />
          </div>
        ) : votes.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No votes yet</p>
        ) : (
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {votes.map((v) => (
              <div key={v.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${v.vote === 1 ? "bg-green-100" : "bg-red-100"}`}>
                  {v.vote === 1 ? <ThumbsUp size={14} className="text-green-600" /> : <ThumbsDown size={14} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {dishName(v.dishId)}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    at <span className="font-medium">{businesses[v.businessId] || v.businessId.slice(0, 12)}</span>
                    {" · by "}
                    <span className="font-medium">{users[v.userId] || v.userId.slice(0, 8)}</span>
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(v.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

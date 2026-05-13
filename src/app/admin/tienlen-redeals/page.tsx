"use client";

import { useEffect, useState } from "react";
import { collection, query, where, limit, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RotateCcw, AlertTriangle } from "lucide-react";

interface RedealEvent {
  id: string;
  userId: string;
  userName: string;
  roomId: string;
  roomCode: string;
  currentRoundId: string;
  secondsSinceUpdate: number;
  roomStatus: string;
  triggeredByHost: boolean;
  platform: string;
  timestamp: Date | null;
}

export default function TienLenRedealsPage() {
  const [events, setEvents] = useState<RedealEvent[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener — manual redeals are rare so we sort client-side
    // and skip the composite index requirement.
    const q = query(
      collection(db, "eventLog"),
      where("event", "==", "tienlen_manual_redeal"),
      limit(500)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const evts: RedealEvent[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          userId: d.userId || "",
          userName: "",
          roomId: d.room_id || "",
          roomCode: d.room_code || "",
          currentRoundId: d.current_round_id || "",
          secondsSinceUpdate: typeof d.seconds_since_update === "number" ? d.seconds_since_update : 0,
          roomStatus: d.room_status || "",
          triggeredByHost: d.triggered_by_host === true,
          platform: d.platform || "ios",
          timestamp: d.timestamp?.toDate?.() || null,
        };
      });
      evts.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
      setEvents(evts);

      // Resolve user display names lazily.
      const missingIds = Array.from(new Set(evts.map((e) => e.userId)))
        .filter((id) => id && id !== "anonymous" && !users[id]);
      if (missingIds.length > 0) {
        const userMap = { ...users };
        for (const id of missingIds.slice(0, 50)) {
          try {
            const snap2 = await getDocs(query(collection(db, "users"), where("__name__", "==", id)));
            if (!snap2.empty) userMap[id] = snap2.docs[0].data().displayName || id.slice(0, 8);
            else userMap[id] = id.slice(0, 8);
          } catch { userMap[id] = id.slice(0, 8); }
        }
        setUsers(userMap);
      }

      setLoading(false);
    }, (err) => {
      console.error("Tien Len redeals listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aggregates
  const last24h = events.filter((e) => e.timestamp && Date.now() - e.timestamp.getTime() < 86_400_000);
  const last7d = events.filter((e) => e.timestamp && Date.now() - e.timestamp.getTime() < 7 * 86_400_000);
  const uniqueRoomsLast7d = new Set(last7d.map((e) => e.roomId)).size;
  const uniqueUsersLast7d = new Set(last7d.map((e) => e.userId)).size;
  const avgWaitLast7d = last7d.length > 0
    ? Math.round(last7d.reduce((sum, e) => sum + (e.secondsSinceUpdate || 0), 0) / last7d.length)
    : 0;

  return (
    <div className="p-2xl max-w-6xl">
      <div className="flex items-center gap-md mb-lg">
        <RotateCcw size={24} className="text-ls-primary" />
        <div>
          <h1 className="text-[24px] font-bold text-ls-primary">Tiến Lên Manual Redeals</h1>
          <p className="text-[13px] text-ls-secondary mt-[2px]">
            Each row is a player who tapped &ldquo;Redeal&rdquo; in multiplayer because the auto-deal
            didn&rsquo;t fire. High volume here means the auto-rematch path is broken.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-md mb-lg">
        <StatCard label="Last 24h" value={last24h.length} />
        <StatCard label="Last 7 days" value={last7d.length} />
        <StatCard label="Unique rooms (7d)" value={uniqueRoomsLast7d} />
        <StatCard label="Avg wait before tap" value={`${avgWaitLast7d}s`} />
      </div>

      {last24h.length >= 5 && (
        <div className="flex items-start gap-sm bg-amber-50 border border-amber-300 text-amber-900 rounded-card p-md mb-lg">
          <AlertTriangle size={18} className="shrink-0 mt-[2px]" />
          <div className="text-[13px]">
            <strong>{last24h.length} manual redeals in the last 24 hours.</strong>{" "}
            That&rsquo;s elevated — investigate the auto-rematch path in <code>RoomManager.scheduleAutoRematch</code> and
            <code className="ml-xs">playAgain</code>&apos;s transaction.
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-card border border-ls-border overflow-hidden">
        <div className="grid grid-cols-[140px_120px_100px_120px_90px_90px_1fr] gap-md px-md py-sm bg-ls-surface text-[11px] font-semibold uppercase tracking-wide text-ls-secondary">
          <div>When</div>
          <div>Player</div>
          <div>Room</div>
          <div>Round</div>
          <div>Waited</div>
          <div>Status</div>
          <div>Notes</div>
        </div>
        {loading ? (
          <div className="px-md py-lg text-[13px] text-ls-secondary">Loading…</div>
        ) : events.length === 0 ? (
          <div className="px-md py-lg text-[13px] text-ls-secondary">
            No manual redeals recorded. The auto-rematch path is healthy.
          </div>
        ) : (
          <div className="divide-y divide-ls-border">
            {events.map((e) => (
              <div key={e.id} className="grid grid-cols-[140px_120px_100px_120px_90px_90px_1fr] gap-md px-md py-sm text-[13px] items-center">
                <div className="text-ls-secondary text-[12px]">{formatDate(e.timestamp)}</div>
                <div className="text-ls-primary truncate" title={e.userId}>
                  {users[e.userId] || e.userId.slice(0, 8)}
                  {e.triggeredByHost && (
                    <span className="ml-xs text-[10px] font-semibold bg-blue-100 text-blue-700 px-[5px] py-[1px] rounded">
                      HOST
                    </span>
                  )}
                </div>
                <div className="font-mono text-[12px] text-ls-primary">{e.roomCode || "—"}</div>
                <div className="font-mono text-[11px] text-ls-secondary truncate" title={e.currentRoundId}>
                  {e.currentRoundId ? e.currentRoundId.slice(0, 8) : "—"}
                </div>
                <div className={`text-[12px] font-semibold ${e.secondsSinceUpdate > 30 ? "text-red-600" : "text-ls-primary"}`}>
                  {e.secondsSinceUpdate}s
                </div>
                <div className="text-[12px] text-ls-secondary capitalize">{e.roomStatus || "—"}</div>
                <div className="text-[12px] text-ls-secondary truncate" title={e.roomId}>
                  room {e.roomId.slice(0, 10)}…
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-card border border-ls-border p-md">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ls-secondary">{label}</div>
      <div className="text-[22px] font-bold text-ls-primary mt-xs">{value}</div>
    </div>
  );
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  const now = Date.now();
  const ageSec = (now - d.getTime()) / 1000;
  if (ageSec < 60) return `${Math.floor(ageSec)}s ago`;
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`;
  if (ageSec < 86400) return `${Math.floor(ageSec / 3600)}h ago`;
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

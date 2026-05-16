"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Gamepad2, Users, Clock, Trophy, TrendingUp, Activity, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface GameEvent {
  id: string;
  event: string;
  game: string;
  userId: string;
  platform: string;
  result?: string;
  place?: number;
  xu_earned?: number;
  duration_seconds?: number;
  action?: string;
  amount?: number;
  timestamp: Date | null;
}

interface UserGameStats {
  uid: string;
  name: string;
  xu: number;
  tienLen: { games: number; wins: number; totalTime: number };
  blackjack: { games: number; wins: number; totalTime: number };
}

interface UserInfo { name: string; xu: number }

type DailyKey = "date" | "games" | "players" | "minutes";
type PlayerKey = "name" | "xu" | "tlGames" | "tlWins" | "tlTime" | "bjGames" | "bjWins" | "bjTime" | "total";

export default function GameStatsPage() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "players" | "feed">("overview");
  const [dailySort, setDailySort] = useState<{ key: DailyKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const [playerSort, setPlayerSort] = useState<{ key: PlayerKey; dir: "asc" | "desc" }>({ key: "xu", dir: "desc" });

  useEffect(() => {
    // Real-time listener for game events
    const q = query(
      collection(db, "eventLog"),
      where("event", "in", ["game_start", "game_end", "game_action", "game_tip"]),
      limit(2000)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const evts: GameEvent[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          event: d.event,
          game: d.game || "",
          userId: d.userId || "",
          platform: d.platform || "ios",
          result: d.result,
          place: d.place,
          xu_earned: d.xu_earned,
          duration_seconds: d.duration_seconds,
          action: d.action,
          amount: d.amount,
          timestamp: d.timestamp?.toDate?.() || null,
        };
      });

      evts.sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
      setEvents(evts);

      // Fetch user names + points
      const missingIds = Array.from(new Set(evts.map((e) => e.userId)))
        .filter((id) => id && id !== "anonymous" && !users[id]);
      if (missingIds.length > 0) {
        const userMap = { ...users };
        for (const id of missingIds.slice(0, 30)) {
          try {
            const snap2 = await getDocs(query(collection(db, "users"), where("__name__", "==", id)));
            if (!snap2.empty) {
              const d = snap2.docs[0].data();
              userMap[id] = { name: d.displayName || id.slice(0, 8), xu: d.xu || 0 };
            } else {
              userMap[id] = { name: id.slice(0, 8), xu: 0 };
            }
          } catch { userMap[id] = { name: id.slice(0, 8), xu: 0 }; }
        }
        setUsers(userMap);
      }

      setLoading(false);
    }, (err) => {
      console.error("Game stats listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Computed Stats ──

  const gameStarts = events.filter((e) => e.event === "game_start");
  const gameEnds = events.filter((e) => e.event === "game_end");
  const tips = events.filter((e) => e.event === "game_tip");

  const tienLenStarts = gameStarts.filter((e) => e.game === "tien_len");
  const blackjackStarts = gameStarts.filter((e) => e.game === "blackjack");
  const tienLenEnds = gameEnds.filter((e) => e.game === "tien_len");
  const blackjackEnds = gameEnds.filter((e) => e.game === "blackjack");

  const totalGames = gameStarts.length;
  const uniquePlayers = new Set(gameStarts.map((e) => e.userId)).size;
  const totalPlayTime = gameEnds.reduce((s, e) => s + (e.duration_seconds || 0), 0);
  const totalXuEarned = gameEnds.reduce((s, e) => s + (e.xu_earned || 0), 0);
  const totalTips = tips.reduce((s, e) => s + (e.amount || 0), 0);

  // Today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStarts = gameStarts.filter((e) => e.timestamp && e.timestamp >= today);
  const todayPlayers = new Set(todayStarts.map((e) => e.userId)).size;
  const todayEnds = gameEnds.filter((e) => e.timestamp && e.timestamp >= today);
  const todayPlayTime = todayEnds.reduce((s, e) => s + (e.duration_seconds || 0), 0);

  // Daily breakdown (last 7 days)
  const dailyData: { date: string; games: number; players: number; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayStarts = gameStarts.filter((e) => e.timestamp && e.timestamp >= d && e.timestamp < next);
    const dayEnds = gameEnds.filter((e) => e.timestamp && e.timestamp >= d && e.timestamp < next);
    dailyData.push({
      date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      games: dayStarts.length,
      players: new Set(dayStarts.map((e) => e.userId)).size,
      minutes: Math.round(dayEnds.reduce((s, e) => s + (e.duration_seconds || 0), 0) / 60),
    });
  }

  // Per-player stats
  const playerMap: Record<string, UserGameStats> = {};
  for (const e of gameStarts) {
    if (!e.userId || e.userId === "anonymous") continue;
    if (!playerMap[e.userId]) {
      playerMap[e.userId] = {
        uid: e.userId,
        name: users[e.userId]?.name || e.userId.slice(0, 8),
        xu: users[e.userId]?.xu || 0,
        tienLen: { games: 0, wins: 0, totalTime: 0 },
        blackjack: { games: 0, wins: 0, totalTime: 0 },
      };
    }
    const g = e.game === "tien_len" ? "tienLen" : "blackjack";
    playerMap[e.userId][g].games++;
  }
  for (const e of gameEnds) {
    if (!e.userId || !playerMap[e.userId]) continue;
    const g = e.game === "tien_len" ? "tienLen" : "blackjack";
    if (e.result === "win" || e.place === 1) playerMap[e.userId][g].wins++;
    playerMap[e.userId][g].totalTime += e.duration_seconds || 0;
  }
  // Refresh name + points from latest users map
  for (const uid of Object.keys(playerMap)) {
    if (users[uid]) {
      playerMap[uid].name = users[uid].name;
      playerMap[uid].xu = users[uid].xu;
    }
  }

  const playerSortValue = (p: UserGameStats, key: PlayerKey): string | number => {
    switch (key) {
      case "name": return p.name.toLowerCase();
      case "xu": return p.xu;
      case "tlGames": return p.tienLen.games;
      case "tlWins": return p.tienLen.wins;
      case "tlTime": return p.tienLen.totalTime;
      case "bjGames": return p.blackjack.games;
      case "bjWins": return p.blackjack.wins;
      case "bjTime": return p.blackjack.totalTime;
      case "total": return p.tienLen.games + p.blackjack.games;
    }
  };
  const playerList = Object.values(playerMap).sort((a, b) => {
    const av = playerSortValue(a, playerSort.key);
    const bv = playerSortValue(b, playerSort.key);
    const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : (av as number) - (bv as number);
    return playerSort.dir === "asc" ? cmp : -cmp;
  });

  const toggleDailySort = (key: DailyKey) =>
    setDailySort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  const togglePlayerSort = (key: PlayerKey) =>
    setPlayerSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  const fmtTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const fmtTimeAgo = (date: Date | null) => {
    if (!date) return "—";
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const eventLabel = (e: GameEvent) => {
    const gameName = e.game === "tien_len" ? "Tiến Lên" : "Blackjack";
    switch (e.event) {
      case "game_start": return `Started ${gameName}`;
      case "game_end": {
        const place = e.place ? ` (${e.place === 1 ? "1st" : e.place === 2 ? "2nd" : e.place === 3 ? "3rd" : "4th"})` : "";
        const xu = e.xu_earned ? ` +${e.xu_earned} Xu` : "";
        const dur = e.duration_seconds ? ` · ${fmtTime(e.duration_seconds)}` : "";
        return `Finished ${gameName}${place}${xu}${dur}`;
      }
      case "game_action": return `${gameName}: ${e.action || "action"}`;
      case "game_tip": return `Tipped dealer ${e.amount || 0} Xu`;
      default: return e.event;
    }
  };

  const maxGames = Math.max(...dailyData.map((d) => d.games), 1);

  if (loading) {
    return (
      <div className="p-2xl flex items-center justify-center py-20">
        <Activity className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  return (
    <div className="p-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Game Stats</h1>
        <p className="text-sm text-gray-500">Player activity across Tiến Lên and Blackjack</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Gamepad2} label="Total Games" value={totalGames} sub={`TL: ${tienLenStarts.length} · BJ: ${blackjackStarts.length}`} color="bg-indigo-500" />
        <StatCard icon={Users} label="Unique Players" value={uniquePlayers} sub={`${todayPlayers} today`} color="bg-blue-500" />
        <StatCard icon={Clock} label="Total Play Time" value={fmtTime(totalPlayTime)} sub={`${fmtTime(todayPlayTime)} today`} color="bg-cyan-500" />
        <StatCard icon={Trophy} label="Xu Earned" value={totalXuEarned} sub={`${totalTips} Xu tipped`} color="bg-amber-500" />
        <StatCard icon={TrendingUp} label="Today" value={todayStarts.length} sub={`${todayPlayers} players`} color="bg-green-500" />
      </div>

      {/* Game Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-sm mb-3">Tiến Lên</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-2xl font-bold">{tienLenStarts.length}</p><p className="text-xs text-gray-500">Games</p></div>
            <div><p className="text-2xl font-bold">{tienLenEnds.filter((e) => e.result === "win" || e.place === 1).length}</p><p className="text-xs text-gray-500">Wins</p></div>
            <div><p className="text-2xl font-bold">{fmtTime(tienLenEnds.reduce((s, e) => s + (e.duration_seconds || 0), 0))}</p><p className="text-xs text-gray-500">Play Time</p></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-sm mb-3">Blackjack</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-2xl font-bold">{blackjackStarts.length}</p><p className="text-xs text-gray-500">Games</p></div>
            <div><p className="text-2xl font-bold">{blackjackEnds.filter((e) => e.result === "win").length}</p><p className="text-xs text-gray-500">Wins</p></div>
            <div><p className="text-2xl font-bold">{fmtTime(blackjackEnds.reduce((s, e) => s + (e.duration_seconds || 0), 0))}</p><p className="text-xs text-gray-500">Play Time</p></div>
          </div>
        </div>
      </div>

      {/* 7-Day Chart */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-sm mb-4">7-Day Activity</h3>
        <div className="flex items-end gap-2 h-32">
          {dailyData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-700">{d.games}</span>
              <div
                className="w-full bg-indigo-400 rounded-t"
                style={{ height: `${Math.max((d.games / maxGames) * 100, 4)}%`, minHeight: 4 }}
              />
              <span className="text-[10px] text-gray-500 leading-tight text-center">{d.date.split(", ")[0]}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2 text-center text-[10px] text-gray-400">
          {dailyData.map((d, i) => (
            <div key={i}>{d.players}p · {d.minutes}m</div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["overview", "players", "feed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {t === "overview" ? "Daily Breakdown" : t === "players" ? `Players (${playerList.length})` : `Event Feed (${events.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="bg-white rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 text-xs uppercase">
                <SortableTh label="Date" active={dailySort.key === "date"} dir={dailySort.dir} onClick={() => toggleDailySort("date")} />
                <SortableTh label="Games" active={dailySort.key === "games"} dir={dailySort.dir} onClick={() => toggleDailySort("games")} />
                <SortableTh label="Players" active={dailySort.key === "players"} dir={dailySort.dir} onClick={() => toggleDailySort("players")} />
                <SortableTh label="Play Time" active={dailySort.key === "minutes"} dir={dailySort.dir} onClick={() => toggleDailySort("minutes")} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...dailyData]
                .map((d, idx) => ({ ...d, idx }))
                .sort((a, b) => {
                  let cmp = 0;
                  switch (dailySort.key) {
                    case "date": cmp = a.idx - b.idx; break;
                    case "games": cmp = a.games - b.games; break;
                    case "players": cmp = a.players - b.players; break;
                    case "minutes": cmp = a.minutes - b.minutes; break;
                  }
                  return dailySort.dir === "asc" ? cmp : -cmp;
                })
                .map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{d.date}</td>
                    <td className="px-4 py-3">{d.games}</td>
                    <td className="px-4 py-3">{d.players}</td>
                    <td className="px-4 py-3">{d.minutes}m</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "players" && (
        <div className="bg-white rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 text-xs uppercase">
                <SortableTh label="Player" active={playerSort.key === "name"} dir={playerSort.dir} onClick={() => togglePlayerSort("name")} />
                <SortableTh label="Xu" active={playerSort.key === "xu"} dir={playerSort.dir} onClick={() => togglePlayerSort("xu")} />
                <SortableTh label="TL Games" active={playerSort.key === "tlGames"} dir={playerSort.dir} onClick={() => togglePlayerSort("tlGames")} />
                <SortableTh label="TL Wins" active={playerSort.key === "tlWins"} dir={playerSort.dir} onClick={() => togglePlayerSort("tlWins")} />
                <SortableTh label="TL Time" active={playerSort.key === "tlTime"} dir={playerSort.dir} onClick={() => togglePlayerSort("tlTime")} />
                <SortableTh label="BJ Games" active={playerSort.key === "bjGames"} dir={playerSort.dir} onClick={() => togglePlayerSort("bjGames")} />
                <SortableTh label="BJ Wins" active={playerSort.key === "bjWins"} dir={playerSort.dir} onClick={() => togglePlayerSort("bjWins")} />
                <SortableTh label="BJ Time" active={playerSort.key === "bjTime"} dir={playerSort.dir} onClick={() => togglePlayerSort("bjTime")} />
                <SortableTh label="Total" active={playerSort.key === "total"} dir={playerSort.dir} onClick={() => togglePlayerSort("total")} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {playerList.map((p) => (
                <tr key={p.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">🪙 {p.xu.toLocaleString()}</td>
                  <td className="px-4 py-3">{p.tienLen.games}</td>
                  <td className="px-4 py-3">{p.tienLen.wins}</td>
                  <td className="px-4 py-3">{fmtTime(p.tienLen.totalTime)}</td>
                  <td className="px-4 py-3">{p.blackjack.games}</td>
                  <td className="px-4 py-3">{p.blackjack.wins}</td>
                  <td className="px-4 py-3">{fmtTime(p.blackjack.totalTime)}</td>
                  <td className="px-4 py-3 font-semibold">{p.tienLen.games + p.blackjack.games}</td>
                </tr>
              ))}
              {playerList.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No players yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "feed" && (
        <div className="bg-white rounded-lg border divide-y max-h-[600px] overflow-y-auto">
          {events.map((e) => (
            <div key={e.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                e.event === "game_start" ? "bg-green-100" :
                e.event === "game_end" ? "bg-blue-100" :
                e.event === "game_tip" ? "bg-amber-100" : "bg-gray-100"
              }`}>
                {e.event === "game_start" ? <Gamepad2 size={14} className="text-green-600" /> :
                 e.event === "game_end" ? <Trophy size={14} className="text-blue-600" /> :
                 e.event === "game_tip" ? <span className="text-xs">🪙</span> :
                 <Activity size={14} className="text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{eventLabel(e)}</p>
                <p className="text-xs text-gray-500">{users[e.userId]?.name || e.userId.slice(0, 8)} · {e.platform}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{fmtTimeAgo(e.timestamp)}</span>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-center text-gray-400 py-12">No game events yet</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sortable Table Header ──

function SortableTh({ label, active, dir, onClick }: {
  label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="px-4 py-3 select-none">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-gray-700 ${active ? "text-gray-700" : ""}`}
      >
        {label}
        <Icon size={11} className={active ? "opacity-80" : "opacity-40"} />
      </button>
    </th>
  );
}

// ── Stat Card Component ──

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Gamepad2; label: string; value: string | number; sub: string; color: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

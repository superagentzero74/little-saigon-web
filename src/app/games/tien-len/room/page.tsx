"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card, Rank, Suit, RANK_NAMES, SUIT_SYMBOLS, sortCards, cardId, cardValue, isRed,
  identifyPlay, canBeat, findPlay, Play,
} from "@/lib/games/tienlen-engine";
import {
  GameRoom, GamePlayer, createRoom, joinRoom, startGame,
  playCards, passTurn, playAITurn, listenToRoom,
  getMyHand, getTableCards, getCurrentPlay, isMyTurn, isAITurn,
} from "@/lib/games/tienlen-room";

function describePlay(play: Play): string {
  switch (play.type.kind) {
    case "single": return cardId(play.cards[0]);
    case "pair": return `pair of ${RANK_NAMES[play.topRank]}s`;
    case "triple": return `triple ${RANK_NAMES[play.topRank]}s`;
    case "four": return `four ${RANK_NAMES[play.topRank]}s!`;
    case "straight": return `${play.type.length}-card straight`;
    case "doubleStraight": return `${play.type.pairCount} consecutive pairs`;
  }
}

export default function MultiplayerRoomPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-[#0d5a26] to-[#0a3d1a] flex items-center justify-center"><p className="text-white">Loading...</p></div>}>
      <MultiplayerRoomPage />
    </Suspense>
  );
}

function MultiplayerRoomPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(searchParams.get("id"));
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uid = user?.id || "";
  const displayName = user?.displayName || "Player";

  // ── Listen to room ──
  useEffect(() => {
    if (!roomId) return;
    const unsub = listenToRoom(roomId, (r) => setRoom(r));
    return () => unsub();
  }, [roomId]);

  // ── AI auto-play ──
  useEffect(() => {
    if (!room || !roomId || room.status !== "playing") return;
    if (!isAITurn(room)) return;

    const hand = room.hands[room.currentPlayer] || [];
    const currentPlay = getCurrentPlay(room);
    const hasValid = findPlay(hand.map((sc) => ({ rank: sc.r as Rank, suit: sc.s as Suit })), currentPlay, room.isFirstPlay) !== null;
    const delay = hasValid ? 600 + Math.random() * 600 : 500;

    aiTimerRef.current = setTimeout(() => {
      playAITurn(roomId).catch(console.error);
    }, delay);

    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [room?.currentPlayer, room?.status, roomId]);

  // ── Auto-pass for human ──
  useEffect(() => {
    if (!room || !roomId || room.status !== "playing" || !uid) return;
    if (!isMyTurn(room, uid)) return;
    const currentPlay = getCurrentPlay(room);
    if (!currentPlay) return; // Can't auto-pass on free lead
    const hand = getMyHand(room, uid);
    const hasValid = findPlay(hand, currentPlay, false) !== null;
    if (hasValid) return;

    const t = setTimeout(() => {
      passTurn(roomId, uid).catch(console.error);
    }, 500);
    return () => clearTimeout(t);
  }, [room?.currentPlayer, room?.status, roomId, uid]);

  // ── Actions ──
  const handleCreate = async () => {
    if (!uid) { setError("Please log in to play"); return; }
    setLoading(true);
    setError("");
    try {
      const id = await createRoom(uid, displayName, user?.photoURL || "");
      setRoomId(id);
      window.history.replaceState(null, "", `?id=${id}`);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!uid) { setError("Please log in to play"); return; }
    if (!joinCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const id = await joinRoom(joinCode.trim(), uid, displayName, user?.photoURL || "");
      setRoomId(id);
      window.history.replaceState(null, "", `?id=${id}`);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleStart = async () => {
    if (!roomId || !uid) return;
    try { await startGame(roomId, uid); } catch (e: any) { setError(e.message); }
  };

  const handlePlay = async () => {
    if (!roomId || !uid || !room) return;
    const hand = getMyHand(room, uid);
    const cards = sortCards(hand.filter((c) => selected.has(cardId(c))));
    const play = identifyPlay(cards);
    if (!play) { setError("Invalid combo"); return; }
    const currentPlay = getCurrentPlay(room);
    if (!canBeat(play, currentPlay)) { setError("Must beat the current play"); return; }
    if (room.isFirstPlay && !cards.some((c) => c.rank === Rank.Three && c.suit === Suit.Spades)) {
      setError("First play must include 3♠"); return;
    }
    setSelected(new Set());
    setError("");
    await playCards(roomId, uid, cards).catch((e) => setError(e.message));
  };

  const handlePass = async () => {
    if (!roomId || !uid) return;
    setSelected(new Set());
    await passTurn(roomId, uid).catch((e) => setError(e.message));
  };

  const toggleCard = (card: Card) => {
    if (!room || !isMyTurn(room, uid)) return;
    const id = cardId(card);
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  // ── Lobby (no room yet) ──
  if (!roomId || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d5a26] to-[#0a3d1a] flex flex-col items-center justify-center px-lg">
        <Link href="/games/tien-len" className="text-white/50 text-[13px] mb-xl">← Back to Tiến Lên</Link>
        <h1 className="text-white text-[28px] font-bold mb-sm">Multiplayer</h1>
        <p className="text-white/60 text-[14px] mb-xl">Create a room or join with a code</p>

        {!user && (
          <div className="bg-white/10 rounded-xl p-lg mb-xl text-center">
            <p className="text-white/80 text-[14px]">Please <Link href="/login" className="text-yellow-300 underline">log in</Link> to play multiplayer</p>
          </div>
        )}

        <div className="flex flex-col gap-lg w-full max-w-[360px]">
          <button
            onClick={handleCreate}
            disabled={loading || !uid}
            className="bg-yellow-400 text-black font-bold text-[16px] py-md rounded-xl hover:bg-yellow-300 disabled:opacity-40 transition-colors"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>

          <div className="flex items-center gap-sm">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/40 text-[12px]">OR</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <div className="flex gap-sm">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              maxLength={4}
              className="flex-1 bg-white/10 text-white text-center text-[20px] font-bold tracking-[8px] rounded-xl py-md border border-white/20 outline-none focus:border-yellow-400 placeholder:text-white/30 placeholder:text-[14px] placeholder:tracking-normal"
            />
            <button
              onClick={handleJoin}
              disabled={loading || !uid || joinCode.length < 4}
              className="bg-white/20 text-white font-bold px-xl rounded-xl hover:bg-white/30 disabled:opacity-40 transition-colors"
            >
              Join
            </button>
          </div>
        </div>

        {error && <p className="text-red-300 text-[13px] mt-lg">{error}</p>}
      </div>
    );
  }

  // ── Waiting Room ──
  if (room.status === "waiting") {
    const isHost = room.hostId === uid;
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0d5a26] to-[#0a3d1a] flex flex-col items-center justify-center px-lg">
        <h1 className="text-white text-[24px] font-bold mb-xs">Room Code</h1>
        <p className="text-yellow-400 text-[48px] font-bold tracking-[12px] mb-xl">{room.code}</p>
        <p className="text-white/60 text-[13px] mb-lg">Share this code with friends to join</p>

        <div className="w-full max-w-[320px] space-y-sm mb-xl">
          {room.players.map((p) => (
            <div key={p.uid} className="flex items-center gap-md bg-white/10 rounded-xl px-lg py-sm">
              <div className="w-[36px] h-[36px] rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-[15px]">
                {p.name[0]}
              </div>
              <span className="text-white text-[15px] font-medium">{p.name}</span>
              {p.uid === room.hostId && <span className="text-yellow-300 text-[11px] ml-auto">Host</span>}
            </div>
          ))}
          {Array.from({ length: 4 - room.players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-md bg-white/5 rounded-xl px-lg py-sm border border-dashed border-white/15">
              <div className="w-[36px] h-[36px] rounded-full bg-white/10" />
              <span className="text-white/30 text-[14px]">Waiting for player...</span>
            </div>
          ))}
        </div>

        {isHost && (
          <button
            onClick={handleStart}
            className="bg-yellow-400 text-black font-bold text-[16px] px-xl py-md rounded-full hover:bg-yellow-300 transition-colors"
          >
            Start Game (AI fills empty seats)
          </button>
        )}
        {!isHost && <p className="text-white/50 text-[13px]">Waiting for host to start...</p>}
        {error && <p className="text-red-300 text-[13px] mt-md">{error}</p>}
      </div>
    );
  }

  // ── Game View ──
  const myHand = getMyHand(room, uid);
  const tableCards = getTableCards(room);
  const myTurn = isMyTurn(room, uid);
  const mySeat = room.players.find((p) => p.uid === uid)?.seat ?? -1;
  const currentPlay = getCurrentPlay(room);

  // Arrange opponents relative to my seat
  const opponents = [1, 2, 3].map((offset) => {
    const seat = (mySeat + offset) % 4;
    const player = room.players.find((p) => p.seat === seat);
    return { seat, player, cardCount: room.hands[seat]?.length ?? 0 };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d5a26] to-[#0a3d1a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-lg py-md">
        <Link href="/games/tien-len" className="text-white/70 hover:text-white text-[13px]">← Exit</Link>
        <p className="text-white/50 text-[12px]">Room: {room.code}</p>
        <div className="w-[40px]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-between px-md pb-md max-w-[700px] mx-auto w-full">
        {/* Opponents */}
        <div className="flex justify-between w-full mb-sm">
          {opponents.map(({ seat, player, cardCount }) => (
            <div key={seat} className={`flex flex-col items-center ${room.currentPlayer === seat ? "opacity-100" : "opacity-60"}`}>
              <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center text-[14px] font-bold ${
                room.currentPlayer === seat ? "bg-yellow-400 text-black" : "bg-white/20 text-white"
              }`}>
                {player?.name?.[0] || "?"}
              </div>
              <p className="text-white text-[11px] mt-[2px]">{player?.name || "?"}{player?.isAI ? " 🤖" : ""}</p>
              <p className="text-white/50 text-[10px]">{cardCount} cards</p>
              {room.passed.includes(seat) && <p className="text-red-300 text-[10px]">passed</p>}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <p className="text-white text-[14px] font-medium mb-md text-center min-h-[20px]">{room.message}</p>
          <div className="flex gap-[2px] justify-center min-h-[100px] items-center">
            {tableCards.length > 0 ? (
              tableCards.map((c) => <CardView key={cardId(c)} card={c} size="md" />)
            ) : (
              <div className="w-[80px] h-[100px] rounded-lg border-2 border-dashed border-white/20" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-md mb-md">
          {room.status === "finished" ? (
            <Link href="/games/tien-len/room" className="bg-yellow-400 text-black font-bold text-[15px] px-xl py-sm rounded-full">
              New Game
            </Link>
          ) : (
            <>
              <button
                onClick={handlePlay}
                disabled={!myTurn || selected.size === 0}
                className="bg-yellow-400 text-black font-bold text-[14px] px-lg py-sm rounded-full disabled:opacity-30"
              >
                Play
              </button>
              <button
                onClick={handlePass}
                disabled={!myTurn || !currentPlay || room.isFirstPlay}
                className="bg-white/20 text-white font-medium text-[14px] px-lg py-sm rounded-full disabled:opacity-30"
              >
                Pass
              </button>
            </>
          )}
        </div>

        {/* My hand */}
        <div className="w-full overflow-x-auto pb-sm">
          <div className="flex justify-center" style={{ minWidth: "fit-content" }}>
            {myHand.map((card, i) => {
              const id = cardId(card);
              const isSel = selected.has(id);
              return (
                <div
                  key={id}
                  onClick={() => toggleCard(card)}
                  className={`cursor-pointer transition-transform duration-150 ${isSel ? "-translate-y-[12px]" : "hover:-translate-y-[4px]"}`}
                  style={{ marginLeft: i > 0 ? "-8px" : 0, zIndex: i }}
                >
                  <CardView card={card} size="lg" selected={isSel} dimmed={!myTurn} />
                </div>
              );
            })}
          </div>
        </div>

        {myTurn && room.status === "playing" && (
          <p className="text-yellow-300 text-[12px] font-semibold animate-pulse mt-xs">Your Turn</p>
        )}

        {error && <p className="text-red-300 text-[12px] mt-xs">{error}</p>}
      </div>
    </div>
  );
}

function CardView({ card, size = "md", selected = false, dimmed = false }: {
  card: Card; size?: "sm" | "md" | "lg"; selected?: boolean; dimmed?: boolean;
}) {
  const red = isRed(card);
  const w = size === "lg" ? "w-[52px]" : size === "md" ? "w-[44px]" : "w-[32px]";
  const h = size === "lg" ? "h-[72px]" : size === "md" ? "h-[60px]" : "h-[44px]";
  const textSize = size === "lg" ? "text-[16px]" : size === "md" ? "text-[14px]" : "text-[11px]";
  const suitSize = size === "lg" ? "text-[14px]" : size === "md" ? "text-[12px]" : "text-[9px]";
  return (
    <div className={`${w} ${h} rounded-md shadow-md flex flex-col items-center justify-center select-none
      ${selected ? "ring-2 ring-yellow-400 bg-yellow-50" : "bg-white"}
      ${dimmed ? "opacity-60" : ""} ${red ? "text-red-600" : "text-gray-900"}
    `}>
      <span className={`${textSize} font-bold leading-none`}>{RANK_NAMES[card.rank]}</span>
      <span className={`${suitSize} leading-none`}>{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Card, Rank, Suit, RANK_NAMES, SUIT_SYMBOLS,
  deal, sortCards, cardId, cardValue, isRed,
  identifyPlay, canBeat, findPlay, Play,
} from "@/lib/games/tienlen-engine";

const PLAYER_NAMES = ["You", "Mai", "Hùng", "Linh"];
const PLAYER_AVATARS = ["👤", "👩", "👨", "👧"];

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

interface GameState {
  hands: Card[][];
  currentPlayer: number;
  tablePile: Card[];
  currentPlay: Play | null;
  lastPlayedBy: number | null;
  passed: Set<number>;
  finishOrder: number[];
  isFirstPlay: boolean;
  message: string;
  gameOver: boolean;
  winner: number | null;
  gameStarted: boolean;
}

function initState(): GameState {
  return {
    hands: [[], [], [], []], currentPlayer: 0, tablePile: [], currentPlay: null,
    lastPlayedBy: null, passed: new Set(), finishOrder: [], isFirstPlay: true,
    message: "", gameOver: false, winner: null, gameStarted: false,
  };
}

export default function TienLenPage() {
  const [state, setState] = useState<GameState>(initState());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const updateState = useCallback((fn: (s: GameState) => GameState) => {
    setState((prev) => fn({ ...prev, passed: new Set(prev.passed), finishOrder: [...prev.finishOrder] }));
  }, []);

  const startGame = useCallback(() => {
    const hands = deal(4);
    const startPlayer = hands.findIndex((h) => h.some((c) => c.rank === Rank.Three && c.suit === Suit.Spades));
    setState({
      hands, currentPlayer: startPlayer, tablePile: [], currentPlay: null,
      lastPlayedBy: null, passed: new Set(), finishOrder: [], isFirstPlay: true,
      message: startPlayer === 0 ? "You start! Play the 3♠" : `${PLAYER_NAMES[startPlayer]} starts`,
      gameOver: false, winner: null, gameStarted: true,
    });
    setSelected(new Set());
  }, []);

  const advanceTurn = useCallback((s: GameState): GameState => {
    let next = (s.currentPlayer + 1) % 4;
    let attempts = 0;
    while (attempts < 4) {
      if (!s.finishOrder.includes(next) && !s.passed.has(next)) break;
      next = (next + 1) % 4; attempts++;
    }
    if (next === s.lastPlayedBy || attempts >= 4) {
      s.currentPlay = null; s.passed = new Set();
      if (s.lastPlayedBy !== null && !s.finishOrder.includes(s.lastPlayedBy)) { next = s.lastPlayedBy; }
      else {
        const start = s.lastPlayedBy ?? s.currentPlayer; next = (start + 1) % 4;
        for (let i = 0; i < 4; i++) { if (!s.finishOrder.includes(next)) break; next = (next + 1) % 4; }
      }
    }
    s.currentPlayer = next;
    if (next === 0 && s.currentPlay === null) s.message = "Your lead — play any combo";
    return s;
  }, []);

  const commitPlay = useCallback((s: GameState, player: number, cards: Card[], play: Play): GameState => {
    s.hands[player] = s.hands[player].filter((c) => !cards.some((sc) => cardId(c) === cardId(sc)));
    s.tablePile = cards; s.currentPlay = play; s.lastPlayedBy = player; s.isFirstPlay = false;
    s.message = `${PLAYER_NAMES[player]} played ${describePlay(play)}`;
    if (s.hands[player].length === 0) {
      s.finishOrder.push(player);
      if (s.winner === null) s.winner = player;
      if (player === 0) {
        s.gameOver = true;
        const place = s.finishOrder.indexOf(0) + 1;
        s.message = place === 1 ? "🎉 You win!" : `${place === 2 ? "2nd" : place === 3 ? "3rd" : "4th"} place`;
        return s;
      }
      if (s.finishOrder.length >= 3 && !s.finishOrder.includes(0)) {
        s.finishOrder.push(0); s.gameOver = true; s.message = "4th place"; return s;
      }
    }
    return advanceTurn(s);
  }, [advanceTurn]);

  // AI + auto-pass
  useEffect(() => {
    if (!state.gameStarted || state.gameOver) return;
    const player = state.currentPlayer;
    if (player === 0) {
      if (state.currentPlay) {
        const hasValid = findPlay(state.hands[0], state.currentPlay, false) !== null;
        if (!hasValid) {
          const t = setTimeout(() => {
            updateState((s) => { s.passed.add(0); s.message = "No valid cards — auto pass"; return advanceTurn(s); });
          }, 500);
          return () => clearTimeout(t);
        }
      }
      return;
    }
    const hasValid = findPlay(state.hands[player], state.currentPlay, state.isFirstPlay) !== null;
    const delay = hasValid ? 600 + Math.random() * 600 : 500;
    const t = setTimeout(() => {
      updateState((s) => {
        const hand = s.hands[s.currentPlayer];
        const cards = findPlay(hand, s.currentPlay, s.isFirstPlay);
        if (cards) { const play = identifyPlay(cards); if (play) return commitPlay(s, s.currentPlayer, cards, play); }
        if (s.currentPlay) { s.passed.add(s.currentPlayer); s.message = `${PLAYER_NAMES[s.currentPlayer]} passed`; return advanceTurn(s); }
        const sorted = sortCards(hand);
        if (sorted.length > 0) { const play = identifyPlay([sorted[0]]); if (play) return commitPlay(s, s.currentPlayer, [sorted[0]], play); }
        return s;
      });
    }, delay);
    return () => clearTimeout(t);
  }, [state.currentPlayer, state.gameStarted, state.gameOver, state.currentPlay, state.hands, state.isFirstPlay, advanceTurn, commitPlay, updateState]);

  const toggleCard = (card: Card) => {
    if (state.currentPlayer !== 0 || state.gameOver) return;
    const id = cardId(card);
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const playSelected = () => {
    if (state.currentPlayer !== 0) return;
    const cards = sortCards(state.hands[0].filter((c) => selected.has(cardId(c))));
    const play = identifyPlay(cards);
    if (!play) { updateState((s) => ({ ...s, message: `Invalid combo` })); return; }
    if (!canBeat(play, state.currentPlay)) { updateState((s) => ({ ...s, message: "Must beat the current play" })); return; }
    if (state.isFirstPlay && !cards.some((c) => c.rank === Rank.Three && c.suit === Suit.Spades)) {
      updateState((s) => ({ ...s, message: "First play must include 3♠" })); return;
    }
    setSelected(new Set()); updateState((s) => commitPlay(s, 0, cards, play));
  };

  const pass = () => {
    if (state.currentPlayer !== 0 || state.isFirstPlay || !state.currentPlay) return;
    setSelected(new Set()); updateState((s) => { s.passed.add(0); s.message = "You passed"; return advanceTurn(s); });
  };

  const isMyTurn = state.currentPlayer === 0 && !state.gameOver;
  const myHand = state.hands[0] || [];
  const row1 = myHand.slice(0, 7);
  const row2 = myHand.slice(7);

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ background: "radial-gradient(ellipse at center, #8b1a1a 0%, #4a0e0e 50%, #2d0808 100%)" }}>
      {/* Subtle pattern overlay */}
      <div className="fixed inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ctext x='15' y='35' font-size='20' fill='white'%3E♥%3C/text%3E%3Ctext x='40' y='15' font-size='14' fill='white'%3E♠%3C/text%3E%3C/svg%3E\")", backgroundSize: "60px 60px" }} />

      {/* Header */}
      <div className="relative flex items-center justify-between px-lg py-sm z-10">
        <Link href="/games" className="w-[36px] h-[36px] rounded-full bg-black/30 flex items-center justify-center text-white/70 hover:text-white text-[18px]">×</Link>
        <div />
        <Link href="/games/tien-len/room" className="text-[12px] font-semibold text-yellow-300/80 hover:text-yellow-300 bg-black/20 px-md py-xs rounded-full">Multiplayer →</Link>
      </div>

      <div className="flex-1 flex flex-col items-center z-10 max-w-[800px] mx-auto w-full px-md">
        {/* ── Top opponent (Hùng) ── */}
        <div className="flex flex-col items-center mb-sm">
          <PlayerAvatar name={PLAYER_NAMES[2]} emoji={PLAYER_AVATARS[2]} active={state.currentPlayer === 2} passed={state.passed.has(2)} />
          <div className="flex mt-xs">
            {Array.from({ length: Math.min(state.hands[2]?.length || 0, 13) }).map((_, i) => (
              <div key={i} className="w-[18px] h-[26px] rounded-[3px] bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-600/50 shadow-sm" style={{ marginLeft: i > 0 ? "-10px" : 0 }} />
            ))}
          </div>
          <p className="text-white/40 text-[10px] mt-[2px]">{state.hands[2]?.length || 0} cards</p>
        </div>

        {/* ── Middle row: Mai — Table — Linh ── */}
        <div className="flex items-center justify-between w-full flex-1">
          {/* Left opponent (Mai) */}
          <div className="flex flex-col items-center w-[80px]">
            <PlayerAvatar name={PLAYER_NAMES[1]} emoji={PLAYER_AVATARS[1]} active={state.currentPlayer === 1} passed={state.passed.has(1)} />
            <div className="flex flex-col mt-xs items-center">
              {Array.from({ length: Math.min(state.hands[1]?.length || 0, 13) }).map((_, i) => (
                <div key={i} className="w-[26px] h-[16px] rounded-[2px] bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-600/50" style={{ marginTop: i > 0 ? "-10px" : 0 }} />
              ))}
            </div>
          </div>

          {/* Center — Table */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
            {/* Logo */}
            <h2 className="text-[28px] font-bold mb-sm" style={{ fontFamily: "serif", color: "#d4a846", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
              Tiến Lên
            </h2>

            {/* Table pile */}
            <div className="flex gap-[3px] justify-center min-h-[90px] items-center mb-sm">
              {state.tablePile.length > 0 ? (
                state.tablePile.map((c) => <GameCard key={cardId(c)} card={c} />)
              ) : (
                !state.gameStarted && <div className="w-[60px] h-[84px] rounded-lg border-2 border-dashed border-white/10" />
              )}
            </div>

            {/* Message */}
            <p className="text-white/80 text-[13px] font-medium text-center">{state.message}</p>

            {/* Pot */}
            {state.gameStarted && <p className="text-yellow-400 text-[12px] font-bold mt-xs">Pot: 200🪙</p>}
          </div>

          {/* Right opponent (Linh) */}
          <div className="flex flex-col items-center w-[80px]">
            <PlayerAvatar name={PLAYER_NAMES[3]} emoji={PLAYER_AVATARS[3]} active={state.currentPlayer === 3} passed={state.passed.has(3)} />
            <div className="flex flex-col mt-xs items-center">
              {Array.from({ length: Math.min(state.hands[3]?.length || 0, 13) }).map((_, i) => (
                <div key={i} className="w-[26px] h-[16px] rounded-[2px] bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-600/50" style={{ marginTop: i > 0 ? "-10px" : 0 }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Your Turn + Buttons ── */}
        <div className="flex flex-col items-center mt-sm mb-sm">
          {isMyTurn && state.gameStarted && (
            <p className="text-yellow-400 text-[14px] font-bold mb-xs">Your Turn</p>
          )}
          <div className="flex items-center gap-md">
            <PlayerAvatar name="You" emoji={PLAYER_AVATARS[0]} active={state.currentPlayer === 0} passed={state.passed.has(0)} />
            <div className="flex gap-sm">
              {!state.gameStarted || state.gameOver ? (
                <button onClick={startGame} className="bg-gradient-to-b from-yellow-400 to-yellow-500 text-black font-bold text-[15px] px-xl py-sm rounded-lg shadow-lg hover:from-yellow-300 hover:to-yellow-400 transition-all">
                  {state.gameOver ? "Play Again" : "Deal"}
                </button>
              ) : (
                <>
                  <button onClick={pass} disabled={!isMyTurn || !state.currentPlay || state.isFirstPlay}
                    className="bg-white/15 text-white font-semibold text-[14px] px-lg py-sm rounded-lg disabled:opacity-30 hover:bg-white/25 transition-colors min-w-[80px]">
                    Pass
                  </button>
                  <button onClick={playSelected} disabled={!isMyTurn || selected.size === 0}
                    className="bg-gradient-to-b from-yellow-400 to-yellow-500 text-black font-bold text-[14px] px-lg py-sm rounded-lg shadow-lg disabled:opacity-30 hover:from-yellow-300 hover:to-yellow-400 transition-all min-w-[80px]">
                    Play
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Player's Hand — 2 rows ── */}
        <div className="w-full pb-md">
          {/* Row 1 */}
          <div className="flex justify-center gap-[3px] mb-[3px]">
            {row1.map((card) => {
              const id = cardId(card);
              return (
                <div key={id} onClick={() => toggleCard(card)}
                  className={`cursor-pointer transition-all duration-150 ${selected.has(id) ? "-translate-y-[8px] scale-105" : "hover:-translate-y-[4px]"}`}>
                  <GameCard card={card} large selected={selected.has(id)} dimmed={!isMyTurn && state.gameStarted} />
                </div>
              );
            })}
          </div>
          {/* Row 2 */}
          {row2.length > 0 && (
            <div className="flex justify-center gap-[3px]">
              {row2.map((card) => {
                const id = cardId(card);
                return (
                  <div key={id} onClick={() => toggleCard(card)}
                    className={`cursor-pointer transition-all duration-150 ${selected.has(id) ? "-translate-y-[8px] scale-105" : "hover:-translate-y-[4px]"}`}>
                    <GameCard card={card} large selected={selected.has(id)} dimmed={!isMyTurn && state.gameStarted} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Player Avatar ──
function PlayerAvatar({ name, emoji, active, passed }: { name: string; emoji: string; active: boolean; passed: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-[48px] h-[48px] rounded-full flex items-center justify-center text-[22px] border-2 transition-colors ${
        active ? "border-yellow-400 bg-gradient-to-b from-amber-100 to-amber-200 shadow-lg shadow-yellow-400/30" : "border-white/20 bg-black/30"
      }`}>
        {emoji}
      </div>
      <p className={`text-[11px] mt-[2px] font-medium ${active ? "text-yellow-400" : "text-white/70"}`}>{name}</p>
      {passed && <p className="text-red-400 text-[9px] font-semibold">passed</p>}
    </div>
  );
}

// ── Playing Card ──
function GameCard({ card, large = false, selected = false, dimmed = false }: {
  card: Card; large?: boolean; selected?: boolean; dimmed?: boolean;
}) {
  const red = isRed(card);
  const w = large ? "w-[58px] sm:w-[68px]" : "w-[52px]";
  const h = large ? "h-[80px] sm:h-[94px]" : "h-[72px]";
  const rankSize = large ? "text-[20px] sm:text-[24px]" : "text-[18px]";
  const suitSize = large ? "text-[22px] sm:text-[26px]" : "text-[18px]";

  return (
    <div className={`${w} ${h} rounded-lg shadow-lg flex flex-col items-center justify-center relative
      ${selected ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent bg-yellow-50" : "bg-white"}
      ${dimmed ? "opacity-50" : ""}
    `} style={{ boxShadow: selected ? "0 4px 12px rgba(212,168,70,0.4)" : "0 2px 8px rgba(0,0,0,0.3)" }}>
      <span className={`${rankSize} font-bold leading-none ${red ? "text-red-600" : "text-gray-900"}`}>
        {RANK_NAMES[card.rank]}
      </span>
      <span className={`${suitSize} leading-none mt-[-2px] ${red ? "text-red-600" : "text-gray-900"}`}>
        {SUIT_SYMBOLS[card.suit]}
      </span>
    </div>
  );
}

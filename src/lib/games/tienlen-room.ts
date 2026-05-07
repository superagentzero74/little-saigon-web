import {
  collection, doc, addDoc, getDoc, getDocs, setDoc, onSnapshot, query, where, limit,
  serverTimestamp, Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card, Rank, Suit, Play, PlayType, deal, sortCards, cardValue,
  identifyPlay, canBeat, findPlay,
} from "./tienlen-engine";

// ── Firestore Types ──

export interface GamePlayer {
  uid: string;
  name: string;
  photoURL: string;
  seat: number;
  isAI: boolean;
}

interface SerializedCard { r: number; s: number; }
interface SerializedPlay { cards: SerializedCard[]; type: string; }

export interface GameRoom {
  code: string;
  hostId: string;
  players: GamePlayer[];
  status: "waiting" | "playing" | "finished";
  currentPlayer: number;
  hands: SerializedCard[][]; // 4 hands
  tablePile: SerializedCard[];
  currentPlay: SerializedPlay | null;
  lastPlayedBy: number | null;
  passed: number[];
  finishOrder: number[];
  isFirstPlay: boolean;
  message: string;
}

// ── Serialization ──

function toSC(c: Card): SerializedCard { return { r: c.rank, s: c.suit }; }
function fromSC(sc: SerializedCard): Card { return { rank: sc.r as Rank, suit: sc.s as Suit }; }

function serializePlayType(t: PlayType): string {
  switch (t.kind) {
    case "single": return "single";
    case "pair": return "pair";
    case "triple": return "triple";
    case "four": return "four";
    case "straight": return `straight_${t.length}`;
    case "doubleStraight": return `doubleStraight_${t.pairCount}`;
  }
}

function deserializePlayType(s: string): PlayType | null {
  if (s === "single") return { kind: "single" };
  if (s === "pair") return { kind: "pair" };
  if (s === "triple") return { kind: "triple" };
  if (s === "four") return { kind: "four" };
  if (s.startsWith("straight_")) return { kind: "straight", length: parseInt(s.split("_")[1]) };
  if (s.startsWith("doubleStraight_")) return { kind: "doubleStraight", pairCount: parseInt(s.split("_")[1]) };
  return null;
}

function toPlay(sp: SerializedPlay): Play | null {
  const cards = sortCards(sp.cards.map(fromSC));
  const type = deserializePlayType(sp.type);
  if (!type || cards.length === 0) return null;
  const top = cards[cards.length - 1];
  return { cards, type, topRank: top.rank, topValue: cardValue(top) };
}

export function roomToDict(room: GameRoom): Record<string, any> {
  const dict: Record<string, any> = {
    code: room.code,
    hostId: room.hostId,
    players: room.players.map((p) => ({ uid: p.uid, name: p.name, photoURL: p.photoURL, seat: p.seat, isAI: p.isAI })),
    status: room.status,
    currentPlayer: room.currentPlayer,
    hand_0: room.hands[0] || [],
    hand_1: room.hands[1] || [],
    hand_2: room.hands[2] || [],
    hand_3: room.hands[3] || [],
    tablePile: room.tablePile,
    passed: room.passed,
    finishOrder: room.finishOrder,
    isFirstPlay: room.isFirstPlay,
    message: room.message,
    createdAt: serverTimestamp(),
  };
  if (room.currentPlay) dict.currentPlay = room.currentPlay;
  if (room.lastPlayedBy !== null) dict.lastPlayedBy = room.lastPlayedBy;
  return dict;
}

function roomFromData(data: Record<string, any>): GameRoom | null {
  if (!data.code || !data.hostId || !data.status) return null;
  const hands: SerializedCard[][] = [];
  for (let i = 0; i < 4; i++) {
    hands.push((data[`hand_${i}`] || []).map((d: any) => ({ r: d.r, s: d.s })));
  }
  return {
    code: data.code,
    hostId: data.hostId,
    players: (data.players || []).map((p: any) => ({ uid: p.uid, name: p.name, photoURL: p.photoURL || "", seat: p.seat, isAI: p.isAI || false })),
    status: data.status,
    currentPlayer: data.currentPlayer ?? 0,
    hands,
    tablePile: (data.tablePile || []).map((d: any) => ({ r: d.r, s: d.s })),
    currentPlay: data.currentPlay ? { cards: data.currentPlay.cards?.map((d: any) => ({ r: d.r, s: d.s })) || [], type: data.currentPlay.type || "" } : null,
    lastPlayedBy: data.lastPlayedBy ?? null,
    passed: data.passed || [],
    finishOrder: data.finishOrder || [],
    isFirstPlay: data.isFirstPlay ?? true,
    message: data.message || "",
  };
}

function generateCode(): string {
  const d = "2345678923456789";
  const a = d[Math.floor(Math.random() * d.length)];
  const b = d[Math.floor(Math.random() * d.length)];
  return `${a}${b}${a}${b}`;
}

// ── Room Manager Functions ──

export async function createRoom(uid: string, name: string, photoURL: string): Promise<string> {
  const code = generateCode();
  const host: GamePlayer = { uid, name, photoURL, seat: 0, isAI: false };
  const room: GameRoom = {
    code, hostId: uid, players: [host], status: "waiting", currentPlayer: 0,
    hands: [[], [], [], []], tablePile: [], currentPlay: null, lastPlayedBy: null,
    passed: [], finishOrder: [], isFirstPlay: true, message: "Waiting for players...",
  };
  const ref = await addDoc(collection(db, "gameRooms"), roomToDict(room));
  return ref.id;
}

export async function joinRoom(code: string, uid: string, name: string, photoURL: string): Promise<string> {
  const q = query(collection(db, "gameRooms"), where("code", "==", code.toUpperCase()), where("status", "==", "waiting"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Room not found or already started");
  const docSnap = snap.docs[0];
  const room = roomFromData(docSnap.data());
  if (!room) throw new Error("Failed to read room");
  if (room.players.some((p) => p.uid === uid)) return docSnap.id; // Already in room
  const humanCount = room.players.filter((p) => !p.isAI).length;
  if (humanCount >= 4) throw new Error("Room is full");
  const takenSeats = new Set(room.players.map((p) => p.seat));
  const seat = [0, 1, 2, 3].find((s) => !takenSeats.has(s));
  if (seat === undefined) throw new Error("No seats available");
  room.players.push({ uid, name, photoURL, seat, isAI: false });
  await setDoc(docSnap.ref, roomToDict(room));
  return docSnap.id;
}

export async function startGame(roomId: string, uid: string): Promise<void> {
  const docRef = doc(db, "gameRooms", roomId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Room not found");
  const room = roomFromData(snap.data());
  if (!room || room.hostId !== uid) throw new Error("Only host can start");

  // Fill AI
  const aiNames = ["Mai", "Hùng", "Linh"];
  let aiIdx = 0;
  const takenSeats = new Set(room.players.map((p) => p.seat));
  for (let seat = 0; seat < 4; seat++) {
    if (!takenSeats.has(seat)) {
      room.players.push({ uid: `ai_${seat}`, name: aiNames[aiIdx++ % 3], photoURL: "", seat, isAI: true });
    }
  }

  // Deal
  const dealt = deal(4);
  room.hands = dealt.map((hand) => hand.map(toSC));
  room.status = "playing";
  room.isFirstPlay = true;

  const startPlayer = dealt.findIndex((hand) => hand.some((c) => c.rank === Rank.Three && c.suit === Suit.Spades));
  room.currentPlayer = startPlayer;
  const starterName = room.players.find((p) => p.seat === startPlayer)?.name ?? "Player";
  room.message = `${starterName} starts`;

  await setDoc(docRef, roomToDict(room));
}

export async function playCards(roomId: string, uid: string, cards: Card[]): Promise<void> {
  const docRef = doc(db, "gameRooms", roomId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const room = roomFromData(snap.data());
  if (!room) return;

  const player = room.players.find((p) => p.uid === uid);
  if (!player || room.currentPlayer !== player.seat) return;

  const sorted = sortCards(cards);
  const play = identifyPlay(sorted);
  if (!play) return;

  const currentPlay = room.currentPlay ? toPlay(room.currentPlay) : null;
  if (!canBeat(play, currentPlay)) return;
  if (room.isFirstPlay && !sorted.some((c) => c.rank === Rank.Three && c.suit === Suit.Spades)) return;

  // Remove cards
  const cardSet = new Set(sorted.map((c) => `${c.rank}_${c.suit}`));
  room.hands[player.seat] = room.hands[player.seat].filter((sc) => !cardSet.has(`${sc.r}_${sc.s}`));
  room.tablePile = sorted.map(toSC);
  room.currentPlay = { cards: sorted.map(toSC), type: serializePlayType(play.type) };
  room.lastPlayedBy = player.seat;
  room.isFirstPlay = false;
  room.message = `${player.name} played`;

  if (room.hands[player.seat].length === 0) {
    room.finishOrder.push(player.seat);
    if (room.finishOrder.length >= 3) {
      const remaining = [0, 1, 2, 3].filter((s) => !room.finishOrder.includes(s));
      room.finishOrder.push(...remaining);
      room.status = "finished";
      room.message = `${room.players.find((p) => p.seat === room.finishOrder[0])?.name} wins!`;
    }
  }

  if (room.status !== "finished") advanceTurnRoom(room);
  await setDoc(docRef, roomToDict(room));
}

export async function passTurn(roomId: string, uid: string): Promise<void> {
  const docRef = doc(db, "gameRooms", roomId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const room = roomFromData(snap.data());
  if (!room) return;

  const player = room.players.find((p) => p.uid === uid);
  if (!player || room.currentPlayer !== player.seat || !room.currentPlay) return;

  room.passed.push(player.seat);
  room.message = `${player.name} passed`;
  advanceTurnRoom(room);
  await setDoc(docRef, roomToDict(room));
}

export async function playAITurn(roomId: string): Promise<void> {
  const docRef = doc(db, "gameRooms", roomId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const room = roomFromData(snap.data());
  if (!room || room.status !== "playing") return;

  const seat = room.currentPlayer;
  const player = room.players.find((p) => p.seat === seat);
  if (!player?.isAI) return;

  const hand = room.hands[seat].map(fromSC);
  const currentPlay = room.currentPlay ? toPlay(room.currentPlay) : null;
  const cards = findPlay(hand, currentPlay, room.isFirstPlay);

  if (cards) {
    const play = identifyPlay(cards);
    if (play) {
      const cardSet = new Set(cards.map((c) => `${c.rank}_${c.suit}`));
      room.hands[seat] = room.hands[seat].filter((sc) => !cardSet.has(`${sc.r}_${sc.s}`));
      room.tablePile = cards.map(toSC);
      room.currentPlay = { cards: cards.map(toSC), type: serializePlayType(play.type) };
      room.lastPlayedBy = seat;
      room.isFirstPlay = false;
      room.message = `${player.name} played`;

      if (room.hands[seat].length === 0) {
        room.finishOrder.push(seat);
        if (room.finishOrder.length >= 3) {
          const remaining = [0, 1, 2, 3].filter((s) => !room.finishOrder.includes(s));
          room.finishOrder.push(...remaining);
          room.status = "finished";
          room.message = `${room.players.find((p) => p.seat === room.finishOrder[0])?.name} wins!`;
        }
      }
    }
  } else if (currentPlay) {
    room.passed.push(seat);
    room.message = `${player.name} passed`;
  } else {
    // Free lead — play smallest
    const sorted = sortCards(hand);
    if (sorted.length > 0) {
      const play = identifyPlay([sorted[0]]);
      if (play) {
        room.hands[seat] = room.hands[seat].filter((sc) => !(sc.r === sorted[0].rank && sc.s === sorted[0].suit));
        room.tablePile = [toSC(sorted[0])];
        room.currentPlay = { cards: [toSC(sorted[0])], type: "single" };
        room.lastPlayedBy = seat;
        room.isFirstPlay = false;
        room.message = `${player.name} played`;
      }
    }
  }

  if (room.status !== "finished") advanceTurnRoom(room);
  await setDoc(docRef, roomToDict(room));
}

function advanceTurnRoom(room: GameRoom) {
  let next = (room.currentPlayer + 1) % 4;
  let attempts = 0;
  while (attempts < 4) {
    if (!room.finishOrder.includes(next) && !room.passed.includes(next)) break;
    next = (next + 1) % 4;
    attempts++;
  }
  if (next === room.lastPlayedBy || attempts >= 4) {
    room.currentPlay = null;
    room.passed = [];
    if (room.lastPlayedBy !== null && !room.finishOrder.includes(room.lastPlayedBy)) {
      next = room.lastPlayedBy;
    } else {
      const start = room.lastPlayedBy ?? room.currentPlayer;
      next = (start + 1) % 4;
      for (let i = 0; i < 4; i++) { if (!room.finishOrder.includes(next)) break; next = (next + 1) % 4; }
    }
  }
  room.currentPlayer = next;
}

export function listenToRoom(roomId: string, callback: (room: GameRoom | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "gameRooms", roomId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback(roomFromData(snap.data()));
  });
}

// ── Helpers ──

export function getMyHand(room: GameRoom, uid: string): Card[] {
  const player = room.players.find((p) => p.uid === uid);
  if (!player) return [];
  return sortCards(room.hands[player.seat]?.map(fromSC) || []);
}

export function getTableCards(room: GameRoom): Card[] {
  return room.tablePile.map(fromSC);
}

export function getCurrentPlay(room: GameRoom): Play | null {
  return room.currentPlay ? toPlay(room.currentPlay) : null;
}

export function isMyTurn(room: GameRoom, uid: string): boolean {
  const player = room.players.find((p) => p.uid === uid);
  return !!player && room.currentPlayer === player.seat && room.status === "playing";
}

export function isAITurn(room: GameRoom): boolean {
  const player = room.players.find((p) => p.seat === room.currentPlayer);
  return !!player?.isAI && room.status === "playing";
}

export function getRoomCode(roomId: string): Promise<string> {
  return getDoc(doc(db, "gameRooms", roomId)).then((s) => s.data()?.code || "");
}

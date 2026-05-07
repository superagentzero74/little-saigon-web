// ── Card Models ──

export enum Rank {
  Three, Four, Five, Six, Seven, Eight, Nine, Ten,
  Jack, Queen, King, Ace, Two,
}

export enum Suit {
  Spades, Clubs, Diamonds, Hearts, // ♠ < ♣ < ♦ < ♥
}

export const RANK_NAMES: Record<Rank, string> = {
  [Rank.Three]: "3", [Rank.Four]: "4", [Rank.Five]: "5", [Rank.Six]: "6",
  [Rank.Seven]: "7", [Rank.Eight]: "8", [Rank.Nine]: "9", [Rank.Ten]: "10",
  [Rank.Jack]: "J", [Rank.Queen]: "Q", [Rank.King]: "K", [Rank.Ace]: "A", [Rank.Two]: "2",
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  [Suit.Spades]: "♠", [Suit.Clubs]: "♣", [Suit.Diamonds]: "♦", [Suit.Hearts]: "♥",
};

export interface Card {
  rank: Rank;
  suit: Suit;
}

export function cardId(c: Card): string { return `${RANK_NAMES[c.rank]}${SUIT_SYMBOLS[c.suit]}`; }
export function cardValue(c: Card): number { return c.rank * 4 + c.suit; }
export function cardCompare(a: Card, b: Card): number { return cardValue(a) - cardValue(b); }
export function isRed(c: Card): boolean { return c.suit === Suit.Diamonds || c.suit === Suit.Hearts; }
export function sortCards(cards: Card[]): Card[] { return [...cards].sort(cardCompare); }

export function fullDeck(): Card[] {
  const cards: Card[] = [];
  for (let r = Rank.Three; r <= Rank.Two; r++) {
    for (let s = Suit.Spades; s <= Suit.Hearts; s++) {
      cards.push({ rank: r, suit: s });
    }
  }
  return cards;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function deal(playerCount = 4): Card[][] {
  const cards = shuffle(fullDeck());
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  cards.forEach((c, i) => hands[i % playerCount].push(c));
  return hands.map(sortCards);
}

// ── Play Types ──

export type PlayType =
  | { kind: "single" }
  | { kind: "pair" }
  | { kind: "triple" }
  | { kind: "four" }
  | { kind: "straight"; length: number }
  | { kind: "doubleStraight"; pairCount: number };

export interface Play {
  cards: Card[];
  type: PlayType;
  topRank: Rank;
  topValue: number;
}

function samePlayType(a: PlayType, b: PlayType): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "straight" && b.kind === "straight") return a.length === b.length;
  if (a.kind === "doubleStraight" && b.kind === "doubleStraight") return a.pairCount === b.pairCount;
  return true;
}

// ── Rules ──

function isStraight(ranks: Rank[]): boolean {
  if (ranks.length < 3) return false;
  if (ranks.includes(Rank.Two)) return false;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

function identifyDoubleStraight(sorted: Card[]): Play | null {
  const pairCount = sorted.length / 2;
  for (let i = 0; i < sorted.length; i += 2) {
    if (sorted[i].rank !== sorted[i + 1].rank) return null;
  }
  const pairRanks: Rank[] = [];
  for (let i = 0; i < sorted.length; i += 2) pairRanks.push(sorted[i].rank);
  if (pairRanks.includes(Rank.Two)) return null;
  for (let i = 1; i < pairRanks.length; i++) {
    if (pairRanks[i] !== pairRanks[i - 1] + 1) return null;
  }
  return { cards: sorted, type: { kind: "doubleStraight", pairCount }, topRank: sorted[sorted.length - 1].rank, topValue: cardValue(sorted[sorted.length - 1]) };
}

export function identifyPlay(cards: Card[]): Play | null {
  if (cards.length === 0) return null;
  const sorted = sortCards(cards);
  const ranks = sorted.map((c) => c.rank);
  const top = sorted[sorted.length - 1];

  if (sorted.length === 1) return { cards: sorted, type: { kind: "single" }, topRank: top.rank, topValue: cardValue(top) };
  if (sorted.length === 2 && ranks[0] === ranks[1]) return { cards: sorted, type: { kind: "pair" }, topRank: top.rank, topValue: cardValue(top) };
  if (sorted.length === 3) {
    if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) return { cards: sorted, type: { kind: "triple" }, topRank: top.rank, topValue: cardValue(top) };
    if (isStraight(ranks)) return { cards: sorted, type: { kind: "straight", length: 3 }, topRank: top.rank, topValue: cardValue(top) };
  }
  if (sorted.length === 4) {
    if (ranks.every((r) => r === ranks[0])) return { cards: sorted, type: { kind: "four" }, topRank: top.rank, topValue: cardValue(top) };
    if (isStraight(ranks)) return { cards: sorted, type: { kind: "straight", length: 4 }, topRank: top.rank, topValue: cardValue(top) };
  }
  if (isStraight(ranks) && sorted.length >= 3) return { cards: sorted, type: { kind: "straight", length: sorted.length }, topRank: top.rank, topValue: cardValue(top) };
  if (sorted.length >= 6 && sorted.length % 2 === 0) return identifyDoubleStraight(sorted);
  return null;
}

export function canBeat(play: Play, against: Play | null): boolean {
  if (!against) return true;
  // Bombs
  if (play.type.kind === "four" && against.type.kind === "single" && against.topRank === Rank.Two) return true;
  if (play.type.kind === "four" && against.type.kind === "pair" && against.topRank === Rank.Two) return true;
  if (play.type.kind === "doubleStraight" && play.type.pairCount >= 3 && against.type.kind === "single" && against.topRank === Rank.Two) return true;
  if (play.type.kind === "doubleStraight" && play.type.pairCount >= 4 && against.type.kind === "pair" && against.topRank === Rank.Two) return true;
  if (!samePlayType(play.type, against.type)) return false;
  return play.topValue > against.topValue;
}

// ── AI ──

function groupByRank(hand: Card[]): Map<Rank, Card[]> {
  const m = new Map<Rank, Card[]>();
  for (const c of hand) {
    if (!m.has(c.rank)) m.set(c.rank, []);
    m.get(c.rank)!.push(c);
  }
  return m;
}

function findPairBeating(hand: Card[], against: Play): Card[] | null {
  const groups = groupByRank(hand);
  for (let r = Rank.Three; r <= Rank.Two; r++) {
    const cards = groups.get(r);
    if (!cards || cards.length < 2) continue;
    const pair = sortCards(cards).slice(0, 2);
    const play = identifyPlay(pair);
    if (play && canBeat(play, against)) return pair;
  }
  return null;
}

function findTripleBeating(hand: Card[], against: Play): Card[] | null {
  const groups = groupByRank(hand);
  for (let r = Rank.Three; r <= Rank.Two; r++) {
    const cards = groups.get(r);
    if (!cards || cards.length < 3) continue;
    const triple = sortCards(cards).slice(0, 3);
    const play = identifyPlay(triple);
    if (play && canBeat(play, against)) return triple;
  }
  return null;
}

function findFourBeating(hand: Card[], against: Play): Card[] | null {
  const groups = groupByRank(hand);
  for (let r = Rank.Three; r <= Rank.Two; r++) {
    const cards = groups.get(r);
    if (!cards || cards.length < 4) continue;
    const play = identifyPlay(cards);
    if (play && canBeat(play, against)) return cards;
  }
  return null;
}

function findStraightBeating(hand: Card[], length: number, against: Play): Card[] | null {
  const groups = groupByRank(hand);
  const sortedRanks = Array.from(groups.keys()).sort((a, b) => a - b);
  for (let si = 0; si < sortedRanks.length; si++) {
    const run: Card[] = [];
    let prev: Rank | null = null;
    for (let i = si; i < sortedRanks.length; i++) {
      const r = sortedRanks[i];
      if (r === Rank.Two) break;
      if (prev !== null && r !== prev + 1) break;
      run.push(sortCards(groups.get(r)!).pop()!);
      prev = r;
      if (run.length === length) {
        const play = identifyPlay(run);
        if (play && canBeat(play, against)) return run;
        break;
      }
    }
  }
  return null;
}

function findDoubleStraightBeating(hand: Card[], pairCount: number, against: Play): Card[] | null {
  const groups = groupByRank(hand);
  const pairRanks = Array.from(groups.entries()).filter(([r, c]) => c.length >= 2 && r !== Rank.Two).map(([r]) => r).sort((a, b) => a - b);
  for (let si = 0; si < pairRanks.length; si++) {
    const run: Card[] = [];
    let prev: Rank | null = null;
    for (let i = si; i < pairRanks.length; i++) {
      const r = pairRanks[i];
      if (prev !== null && r !== prev + 1) break;
      run.push(...sortCards(groups.get(r)!).slice(0, 2));
      prev = r;
      if (run.length / 2 === pairCount) {
        const play = identifyPlay(run);
        if (play && canBeat(play, against)) return run;
        break;
      }
    }
  }
  return null;
}

function findLongestStraight(hand: Card[]): Card[] | null {
  const groups = groupByRank(hand);
  const sortedRanks = Array.from(groups.keys()).filter((r) => r !== Rank.Two).sort((a, b) => a - b);
  let best: Card[] | null = null;
  for (let si = 0; si < sortedRanks.length; si++) {
    const run: Card[] = [];
    let prev: Rank | null = null;
    for (let i = si; i < sortedRanks.length; i++) {
      const r = sortedRanks[i];
      if (prev !== null && r !== prev + 1) break;
      run.push(sortCards(groups.get(r)!)[0]);
      prev = r;
    }
    if (run.length >= 3 && identifyPlay(run) && (!best || run.length > best.length)) best = run;
  }
  return best;
}

function findBestFreeLead(hand: Card[]): Card[] | null {
  const groups = groupByRank(hand);
  if (hand.length <= 4) {
    const play = identifyPlay(sortCards(hand));
    if (play) return play.cards;
  }
  const straight = findLongestStraight(hand);
  if (straight) return straight;
  for (let r = Rank.Three; r <= Rank.Ace; r++) {
    const c = groups.get(r);
    if (c && c.length >= 3) return sortCards(c).slice(0, 3);
  }
  for (let r = Rank.Three; r <= Rank.Ace; r++) {
    const c = groups.get(r);
    if (c && c.length >= 2) return sortCards(c).slice(0, 2);
  }
  const nonTwo = sortCards(hand).find((c) => c.rank !== Rank.Two);
  return nonTwo ? [nonTwo] : hand.length > 0 ? [sortCards(hand)[0]] : null;
}

function strategicSingle(hand: Card[], against: Play): Card[] | null {
  let bestNon2: Card | null = null;
  let best2: Card | null = null;
  for (const card of sortCards(hand)) {
    const play = { cards: [card], type: { kind: "single" as const }, topRank: card.rank, topValue: cardValue(card) };
    if (canBeat(play, against)) {
      if (card.rank === Rank.Two) { if (!best2) best2 = card; }
      else { if (!bestNon2) bestNon2 = card; }
    }
  }
  if (bestNon2) {
    const gap = bestNon2.rank - against.topRank;
    if (hand.length > 6 && gap > 4 && bestNon2.rank >= Rank.Queen) {
      if (Math.random() < 0.6) return null;
    }
    return [bestNon2];
  }
  if (best2 && (hand.length <= 3 || against.topRank === Rank.Ace)) return [best2];
  if (against.topRank === Rank.Two) {
    const bomb = findFourBeating(hand, against);
    if (bomb) return bomb;
  }
  return null;
}

export function findPlay(hand: Card[], against: Play | null, mustInclude3Spades: boolean): Card[] | null {
  const sorted = sortCards(hand);
  if (mustInclude3Spades) {
    const ts = sorted.find((c) => c.rank === Rank.Three && c.suit === Suit.Spades);
    if (!ts) return null;
    if (!against) return [ts];
  }
  if (!against) {
    if (mustInclude3Spades) {
      const ts = sorted.find((c) => c.rank === Rank.Three && c.suit === Suit.Spades);
      return ts ? [ts] : null;
    }
    return findBestFreeLead(sorted);
  }
  switch (against.type.kind) {
    case "single": return strategicSingle(sorted, against);
    case "pair": return findPairBeating(sorted, against);
    case "triple": return findTripleBeating(sorted, against);
    case "four": return findFourBeating(sorted, against);
    case "straight": return findStraightBeating(sorted, against.type.length, against);
    case "doubleStraight": return findDoubleStraightBeating(sorted, against.type.pairCount, against);
  }
}

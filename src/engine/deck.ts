import { RANKS, SUITS, type Card, type Color, type Rank, type Suit } from './types';

const SUIT_LETTER: Record<Suit, string> = { spades: 'S', hearts: 'H', diamonds: 'D', clubs: 'C' };
const LETTER_SUIT: Record<string, Suit> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };

/** Short rank label: A, 2–10, J, Q, K. */
export function rankLabel(rank: Rank): string {
  switch (rank) {
    case 1:
      return 'A';
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    default:
      return String(rank);
  }
}

function parseRank(text: string): Rank | null {
  const map: Record<string, Rank> = { A: 1, J: 11, Q: 12, K: 13 };
  const named = map[text];
  if (named !== undefined) return named;
  const n = Number(text);
  return Number.isInteger(n) && n >= 2 && n <= 10 ? (n as Rank) : null;
}

/** Card id such as "H7", "SA", "D10", "CK". */
export function cardId(suit: Suit, rank: Rank): string {
  return `${SUIT_LETTER[suit]}${rankLabel(rank)}`;
}

/** Parses a card id ("H7") into suit and rank, or returns null if malformed. */
export function parseCardId(id: string): { suit: Suit; rank: Rank } | null {
  const suit = LETTER_SUIT[id.charAt(0)];
  const rank = parseRank(id.slice(1));
  if (suit === undefined || rank === null) return null;
  return { suit, rank };
}

export function makeCard(suit: Suit, rank: Rank, faceUp = false): Card {
  return { id: cardId(suit, rank), suit, rank, faceUp };
}

/** The 52-card deck in a fixed order (suit by suit, Ace to King), all face-down. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push(makeCard(suit, rank));
  }
  return deck;
}

export function suitColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function color(card: Card): Color {
  return suitColor(card.suit);
}

export function suitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
  return symbols[suit];
}

/** Accessible label for a face-up card, e.g. "A of spades", "10 of hearts", "K of clubs". */
export function cardLabel(card: Pick<Card, 'suit' | 'rank'>): string {
  return `${rankLabel(card.rank)} of ${card.suit}`;
}

export function withFace(card: Card, faceUp: boolean): Card {
  return card.faceUp === faceUp ? card : { ...card, faceUp };
}

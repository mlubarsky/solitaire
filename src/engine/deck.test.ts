import { describe, expect, it } from 'vitest';
import {
  cardId,
  cardLabel,
  color,
  createDeck,
  makeCard,
  parseCardId,
  rankLabel,
  suitColor,
  suitSymbol,
  withFace,
} from './deck';

describe('deck', () => {
  it('creates 52 unique face-down cards covering every suit and rank', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    expect(deck.every((c) => !c.faceUp)).toBe(true);
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
      expect(deck.filter((c) => c.suit === suit).map((c) => c.rank)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
      ]);
    }
  });

  it('colors suits: hearts and diamonds red, spades and clubs black', () => {
    expect(suitColor('hearts')).toBe('red');
    expect(suitColor('diamonds')).toBe('red');
    expect(suitColor('spades')).toBe('black');
    expect(suitColor('clubs')).toBe('black');
    expect(color(makeCard('hearts', 5))).toBe('red');
    expect(color(makeCard('clubs', 5))).toBe('black');
  });

  it('labels cards for accessibility', () => {
    expect(cardLabel(makeCard('spades', 1))).toBe('A of spades');
    expect(cardLabel(makeCard('hearts', 10))).toBe('10 of hearts');
    expect(cardLabel(makeCard('clubs', 13))).toBe('K of clubs');
    expect(cardLabel(makeCard('diamonds', 11))).toBe('J of diamonds');
    expect(cardLabel(makeCard('diamonds', 12))).toBe('Q of diamonds');
    expect(cardLabel(makeCard('hearts', 7))).toBe('7 of hearts');
  });

  it('builds and parses card ids', () => {
    expect(cardId('hearts', 7)).toBe('H7');
    expect(cardId('spades', 1)).toBe('SA');
    expect(cardId('diamonds', 10)).toBe('D10');
    expect(cardId('clubs', 13)).toBe('CK');
    expect(parseCardId('H7')).toEqual({ suit: 'hearts', rank: 7 });
    expect(parseCardId('SA')).toEqual({ suit: 'spades', rank: 1 });
    expect(parseCardId('D10')).toEqual({ suit: 'diamonds', rank: 10 });
    expect(parseCardId('CQ')).toEqual({ suit: 'clubs', rank: 12 });
    expect(parseCardId('X7')).toBeNull();
    expect(parseCardId('H1')).toBeNull();
    expect(parseCardId('H11')).toBeNull();
    expect(parseCardId('Hx')).toBeNull();
    expect(rankLabel(1)).toBe('A');
  });

  it('has suit symbols', () => {
    expect(['spades', 'hearts', 'diamonds', 'clubs'].map((s) => suitSymbol(s as never))).toEqual([
      '♠',
      '♥',
      '♦',
      '♣',
    ]);
  });

  it('withFace returns the same object when unchanged, a copy otherwise', () => {
    const c = makeCard('hearts', 3, true);
    expect(withFace(c, true)).toBe(c);
    const down = withFace(c, false);
    expect(down).not.toBe(c);
    expect(down.faceUp).toBe(false);
    expect(c.faceUp).toBe(true);
  });
});

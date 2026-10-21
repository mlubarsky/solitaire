import { describe, expect, it } from 'vitest';
import { newGame } from './deal';
import { assertValidState } from './invariants';

describe('newGame', () => {
  it('deals identically for the same seed', () => {
    for (const seed of [0, 1, 42, 123456, 4294967295]) {
      expect(newGame(seed)).toEqual(newGame(seed));
    }
  });

  it('deals differently for different seeds', () => {
    const deals = [1, 2, 3, 4, 5, 99, 1000].map((s) => JSON.stringify(newGame(s).tableau));
    expect(new Set(deals).size).toBe(deals.length);
    expect(newGame(1).stock).not.toEqual(newGame(2).stock);
  });

  it('is a permutation of the 52-card deck', () => {
    const g = newGame(9);
    const all = [...g.stock, ...g.waste, ...g.foundations.flat(), ...g.tableau.flat()];
    expect(all).toHaveLength(52);
    expect(new Set(all.map((c) => c.id)).size).toBe(52);
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs']) {
      expect(all.filter((c) => c.suit === suit)).toHaveLength(13);
    }
    for (let rank = 1; rank <= 13; rank++) {
      expect(all.filter((c) => c.rank === rank)).toHaveLength(4);
    }
  });

  it('has the Klondike deal shape', () => {
    const g = newGame(2024);
    g.tableau.forEach((column, i) => {
      expect(column).toHaveLength(i + 1);
      column.forEach((card, j) => expect(card.faceUp).toBe(j === i));
    });
    expect(g.stock).toHaveLength(24);
    expect(g.stock.every((c) => !c.faceUp)).toBe(true);
    expect(g.waste).toEqual([]);
    expect(g.foundations).toEqual([[], [], [], []]);
    expect(g.score).toBe(0);
    expect(g.moves).toBe(0);
    expect(g.seed).toBe(2024);
    expect(() => assertValidState(g)).not.toThrow();
  });
});

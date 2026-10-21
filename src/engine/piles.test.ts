import { describe, expect, it } from 'vitest';
import { newGame } from './deal';
import {
  STOCK,
  WASTE,
  foundation,
  getPile,
  parsePileKey,
  pileEquals,
  pileKey,
  setPile,
  tableau,
  topCard,
} from './piles';

describe('pile ids', () => {
  it('round-trips keys', () => {
    const ids = [STOCK, WASTE, foundation(0), foundation(3), tableau(0), tableau(6)];
    for (const id of ids) expect(parsePileKey(pileKey(id))).toEqual(id);
    expect(pileKey(tableau(3))).toBe('t3');
    expect(pileKey(foundation(2))).toBe('f2');
  });

  it('rejects unknown keys', () => {
    expect(parsePileKey('t7')).toBeNull();
    expect(parsePileKey('f4')).toBeNull();
    expect(parsePileKey('x1')).toBeNull();
    expect(parsePileKey('')).toBeNull();
  });

  it('compares ids', () => {
    expect(pileEquals(tableau(1), tableau(1))).toBe(true);
    expect(pileEquals(tableau(1), tableau(2))).toBe(false);
    expect(pileEquals(tableau(1), foundation(1))).toBe(false);
  });

  it('gets and sets piles immutably', () => {
    const g = newGame(1);
    expect(getPile(g, STOCK)).toBe(g.stock);
    expect(getPile(g, WASTE)).toBe(g.waste);
    expect(getPile(g, foundation(1))).toBe(g.foundations[1]);
    expect(getPile(g, tableau(4))).toBe(g.tableau[4]);
    const card = g.stock[0]!;
    for (const id of [STOCK, WASTE, foundation(2), tableau(5)]) {
      const next = setPile(g, id, [card]);
      expect(getPile(next, id)).toEqual([card]);
      expect(next).not.toBe(g);
    }
    expect(g.waste).toEqual([]);
    expect(topCard(g.tableau[2])).toBe(g.tableau[2][2]);
    expect(topCard([])).toBeUndefined();
  });
});

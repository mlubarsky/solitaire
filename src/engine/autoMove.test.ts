import { describe, expect, it } from 'vitest';
import { makeState, upTo } from '../test/makeState';
import { findAutoMove } from './autoMove';
import { newGame } from './deal';
import { getLegalMoves } from './moves';
import { STOCK, WASTE, foundation, tableau } from './piles';
import type { Move, PileId } from './types';

const t = (from: PileId, to: PileId, count = 1): Move => ({ type: 'transfer', from, to, count });

describe('findAutoMove', () => {
  it('prefers a foundation over a tableau column for a single top card', () => {
    const g = makeState({ tableau: [['S3'], ['H2']], foundations: [[], ['HA']] });
    expect(findAutoMove(g, tableau(1), 0)).toEqual(t(tableau(1), foundation(1)));
  });

  it('sends a waste card to the foundation first, then the tableau', () => {
    const g = makeState({ waste: ['HA'], tableau: [['S2']] });
    expect(findAutoMove(g, WASTE, 0)).toEqual(t(WASTE, foundation(1)));
    const g2 = makeState({ waste: ['H6'], tableau: [[], ['S7']] });
    expect(findAutoMove(g2, WASTE, 0)).toEqual(t(WASTE, tableau(1)));
  });

  it("places an Ace on its own suit's foundation (♠ ♥ ♦ ♣), not the first empty one", () => {
    const g = makeState({ tableau: [['DA'], ['CA'], ['SA']], foundations: [['HA']] });
    expect(findAutoMove(g, tableau(0), 0)).toEqual(t(tableau(0), foundation(2)));
    expect(findAutoMove(g, tableau(1), 0)).toEqual(t(tableau(1), foundation(3)));
    expect(findAutoMove(g, tableau(2), 0)).toEqual(t(tableau(2), foundation(0)));
  });

  it('never sends a card from the middle of a column to a foundation', () => {
    const g = makeState({ tableau: [['S3', 'H2'], ['D4']], foundations: [upTo('S', 2)] });
    // S3 would fit on the spades foundation, but H2 is on top of it, so the stack goes to D4.
    expect(findAutoMove(g, tableau(0), 0)).toEqual(t(tableau(0), tableau(1), 2));
  });

  it('scans left-to-right starting after the source column, wrapping around', () => {
    const g = makeState({ tableau: [['C7'], ['H6'], [], ['S7'], [], [], ['#C2', 'D10']] });
    // H6 in column 1 fits on C7 (col 0) and S7 (col 3); scanning from col 2 finds col 3 first.
    expect(findAutoMove(g, tableau(1), 0)).toEqual(t(tableau(1), tableau(3)));
    const g2 = makeState({ tableau: [['C7'], [], [], ['#D2', 'S9'], ['H6'], [], ['S7']] });
    // From col 4: scan 5, 6 (S7 fits) before wrapping to col 0.
    expect(findAutoMove(g2, tableau(4), 0)).toEqual(t(tableau(4), tableau(6)));
    const g3 = makeState({ tableau: [['C7'], [], [], [], [], [], ['H6']] });
    // From the last column: wraps to col 0.
    expect(findAutoMove(g3, tableau(6), 0)).toEqual(t(tableau(6), tableau(0)));
  });

  it('scans from the first column for waste and foundation cards', () => {
    const g = makeState({ waste: ['H6'], tableau: [[], ['S7'], ['C7']] });
    expect(findAutoMove(g, WASTE, 0)).toEqual(t(WASTE, tableau(1)));
  });

  it('moves a King to an empty column', () => {
    const g = makeState({ tableau: [['#D3', 'SK', 'HQ'], ['C9'], []] });
    expect(findAutoMove(g, tableau(0), 1)).toEqual(t(tableau(0), tableau(2), 2));
    const fromWaste = makeState({ waste: ['DK'], tableau: [['C9'], [], []] });
    expect(findAutoMove(fromWaste, WASTE, 0)).toEqual(t(WASTE, tableau(1)));
  });

  it('does not hop a King that is already alone at the bottom of its column', () => {
    const g = makeState({ tableau: [['SK', 'HQ'], [], ['C2']] });
    expect(findAutoMove(g, tableau(0), 0)).toBeNull();
  });

  it('never targets an empty column with a non-King', () => {
    const g = makeState({ tableau: [['#D3', 'SQ'], [], []] });
    expect(findAutoMove(g, tableau(0), 1)).toBeNull();
  });

  it('returns a foundation card to the tableau when legal, null otherwise', () => {
    const g = makeState({ foundations: [upTo('H', 6)], tableau: [['C9'], ['S7']] });
    expect(findAutoMove(g, foundation(1), 5)).toEqual(t(foundation(1), tableau(1)));
    const stuck = makeState({ foundations: [upTo('H', 6)], tableau: [['C9']] });
    expect(findAutoMove(stuck, foundation(1), 5)).toBeNull();
    const king = makeState({ foundations: [upTo('H', 13)], tableau: [[]] });
    expect(findAutoMove(king, foundation(1), 12)).toEqual(t(foundation(1), tableau(0)));
  });

  it('only allows the top card of the waste or a foundation', () => {
    const g = makeState({
      waste: ['H6', 'HA'],
      foundations: [[], upTo('S', 2)],
      tableau: [['S7'], ['D3']],
    });
    expect(findAutoMove(g, WASTE, 0)).toBeNull();
    expect(findAutoMove(g, foundation(1), 0)).toBeNull();
  });

  it('returns null when there is no legal move', () => {
    const g = makeState({ tableau: [['C9'], ['D2']] });
    expect(findAutoMove(g, tableau(1), 0)).toBeNull();
  });

  it('returns null for face-down cards, missing cards, and the stock', () => {
    const g = newGame(3);
    expect(findAutoMove(g, tableau(6), 0)).toBeNull();
    expect(findAutoMove(g, tableau(0), 5)).toBeNull();
    expect(findAutoMove(g, WASTE, 0)).toBeNull();
    expect(findAutoMove(g, STOCK, 23)).toBeNull();
    expect(findAutoMove(g, { kind: 'tableau', index: 9 } as unknown as PileId, 0)).toBeNull();
  });

  it('always returns a move from getLegalMoves', () => {
    const g = makeState({ tableau: [['S3', 'H2'], ['D4'], ['HK']], waste: ['C5'] });
    const legal = getLegalMoves(g);
    for (const [pile, idx] of [
      [tableau(0), 0],
      [tableau(0), 1],
      [tableau(1), 0],
      [WASTE, 0],
    ] as const) {
      const m = findAutoMove(g, pile, idx);
      if (m) expect(legal).toContainEqual(m);
    }
  });
});

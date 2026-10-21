import { describe, expect, it } from 'vitest';
import { autoCompletableState, makeState, upTo } from '../test/makeState';
import { canAutoComplete, nextAutoCompleteMove } from './autoComplete';
import { newGame } from './deal';
import { assertValidState } from './invariants';
import { applyMove } from './moves';
import { isWon } from './status';
import type { Card, GameState } from './types';

describe('canAutoComplete', () => {
  it('is false at the start of a game', () => {
    expect(canAutoComplete(newGame(1))).toBe(false);
  });

  it('is false when the stock is non-empty', () => {
    const g = makeState({
      foundations: [upTo('S', 13), upTo('H', 13), upTo('D', 13), upTo('C', 12)],
    });
    expect(g.stock).toHaveLength(1);
    expect(canAutoComplete(g)).toBe(false);
  });

  it('is false when the waste is non-empty', () => {
    const g = makeState({
      foundations: [upTo('S', 13), upTo('H', 13), upTo('D', 13), upTo('C', 12)],
      waste: ['CK'],
      stock: [],
    });
    expect(canAutoComplete(g)).toBe(false);
  });

  it('is false when any tableau card is face-down', () => {
    const g = makeState({
      foundations: [upTo('S', 11), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
      tableau: [['#SK', 'SQ']],
      stock: [],
      validate: false,
    });
    expect(canAutoComplete(g)).toBe(false);
  });

  it('is true when stock and waste are empty and everything is face-up', () => {
    expect(canAutoComplete(autoCompletableState())).toBe(true);
  });
});

describe('nextAutoCompleteMove', () => {
  it('returns null when auto-complete is not possible', () => {
    expect(nextAutoCompleteMove(newGame(1))).toBeNull();
  });

  it('returns null when the game is already won', () => {
    const won = makeState({
      foundations: [upTo('S', 13), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
      stock: [],
    });
    expect(nextAutoCompleteMove(won)).toBeNull();
  });

  it('reaches a win within 52 steps, always playing the lowest available rank', () => {
    let state: GameState = autoCompletableState();
    let steps = 0;
    while (!isWon(state)) {
      const move = nextAutoCompleteMove(state);
      expect(move).not.toBeNull();
      if (!move || move.type !== 'transfer') throw new Error('expected a transfer');
      const tops = state.tableau.map((c) => c[c.length - 1]).filter((c): c is Card => !!c);
      const lowest = Math.min(...tops.map((c) => c.rank));
      const column = state.tableau[(move.from as { index: 0 }).index];
      expect(column[column.length - 1]!.rank).toBe(lowest);
      const r = applyMove(state, move);
      if (!r.ok) throw new Error(r.reason);
      assertValidState(r.state);
      state = r.state;
      steps++;
      expect(steps).toBeLessThanOrEqual(52);
    }
    expect(steps).toBe(12);
  });

  it('works from a deeper all-face-up position with Aces to place', () => {
    const g = makeState({
      tableau: [
        ['SK', 'HQ', 'SJ', 'H10', 'S9', 'H8', 'S7', 'H6', 'S5', 'H4', 'S3', 'H2', 'SA'],
        ['HK', 'SQ', 'HJ', 'S10', 'H9', 'S8', 'H7', 'S6', 'H5', 'S4', 'H3', 'S2', 'HA'],
        ['DK', 'CQ', 'DJ', 'C10', 'D9', 'C8', 'D7', 'C6', 'D5', 'C4', 'D3', 'C2', 'DA'],
        ['CK', 'DQ', 'CJ', 'D10', 'C9', 'D8', 'C7', 'D6', 'C5', 'D4', 'C3', 'D2', 'CA'],
      ],
      stock: [],
    });
    let state = g;
    let steps = 0;
    for (let move = nextAutoCompleteMove(state); move; move = nextAutoCompleteMove(state)) {
      const r = applyMove(state, move);
      if (!r.ok) throw new Error(r.reason);
      state = r.state;
      steps++;
    }
    expect(steps).toBe(52);
    expect(isWon(state)).toBe(true);
  });
});

describe('isWon', () => {
  it('is true only with all 52 cards on the foundations', () => {
    expect(isWon(newGame(1))).toBe(false);
    expect(
      isWon(
        makeState({ foundations: [upTo('S', 13), upTo('H', 13), upTo('D', 13), upTo('C', 12)] }),
      ),
    ).toBe(false);
    expect(
      isWon(
        makeState({
          foundations: [upTo('S', 13), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
          stock: [],
        }),
      ),
    ).toBe(true);
  });
});

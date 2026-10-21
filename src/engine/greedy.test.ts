import { describe, expect, it } from 'vitest';
import { makeState, upTo } from '../test/makeState';
import { newGame } from './deal';
import { greedyMove, playGreedy } from './greedy';
import { assertValidState } from './invariants';
import { canAutoComplete } from './autoComplete';
import { tableau, WASTE, foundation } from './piles';

/** Not won, but no legal move exists: every tableau top is a heart and no Ace is reachable. */
const stuckState = () =>
  makeState({
    foundations: [upTo('S', 13), [], upTo('D', 13), upTo('C', 13)],
    tableau: [
      ['#HA', 'H3'],
      ['#H2', 'H5'],
      ['#H6', 'H4'],
      ['#H7', 'H8'],
      ['#H9', 'H10'],
      ['#HJ', 'HQ'],
      ['HK'],
    ],
    stock: [],
  });

/** Finds the first seed in [from, to) that the greedy strategy wins. */
function findWinningSeed(from: number, to: number): number {
  for (let seed = from; seed < to; seed++) {
    if (playGreedy(newGame(seed)).won) return seed;
  }
  throw new Error('no winning seed');
}

describe('greedyMove', () => {
  it('prefers foundation plays, lowest rank first', () => {
    const g = makeState({ tableau: [['S2'], ['HA']], foundations: [['SA']], waste: ['D9'] });
    expect(greedyMove(g)).toEqual({
      type: 'transfer',
      from: tableau(1),
      to: foundation(1),
      count: 1,
    });
  });

  it('then moves that reveal a face-down card', () => {
    const g = makeState({ tableau: [['#D2', 'H6'], ['S7']], waste: ['C5'] });
    expect(greedyMove(g)).toEqual({ type: 'transfer', from: tableau(0), to: tableau(1), count: 1 });
  });

  it('then waste → tableau, then the stock', () => {
    const g = makeState({ tableau: [['S7'], ['H9']], waste: ['D6'] });
    expect(greedyMove(g)).toEqual({ type: 'transfer', from: WASTE, to: tableau(0), count: 1 });
    expect(greedyMove(makeState({ tableau: [['S7']] }))).toEqual({ type: 'draw' });
  });

  it('returns null when nothing can be done', () => {
    expect(greedyMove(stuckState())).toBeNull();
  });
});

describe('playGreedy', () => {
  it('wins some deals and every intermediate state is valid', () => {
    const seed = findWinningSeed(1, 500);
    const result = playGreedy(newGame(seed));
    expect(result.won).toBe(true);
    expect(result.states).toHaveLength(result.moves.length + 1);
    result.states.forEach((s) => assertValidState(s));
  });

  it('can stop as soon as auto-complete becomes possible', () => {
    let seed = 1;
    let result = playGreedy(newGame(seed), { stopAtAutoComplete: true });
    while (!(canAutoComplete(result.final) && !result.won)) {
      seed++;
      result = playGreedy(newGame(seed), { stopAtAutoComplete: true });
    }
    expect(playGreedy(newGame(seed)).moves.length).toBeGreaterThan(result.moves.length);
    expect(result.states.slice(0, -1).some((s) => canAutoComplete(s))).toBe(false);
  });

  it('gives up after a stock pass without progress, or at maxMoves', () => {
    let lost = 1;
    while (playGreedy(newGame(lost)).won) lost++;
    const result = playGreedy(newGame(lost));
    expect(result.won).toBe(false);
    expect(result.moves.length).toBeLessThan(2000);
    expect(playGreedy(newGame(lost), { maxMoves: 10 }).moves).toHaveLength(10);
  });

  it('stops when no move is available', () => {
    const won = makeState({
      foundations: [upTo('S', 13), upTo('H', 13), upTo('D', 12), upTo('C', 13)],
      tableau: [['DK']],
      stock: [],
    });
    expect(playGreedy(won).won).toBe(true);
    const stuck = playGreedy(stuckState());
    expect(stuck.moves).toHaveLength(0);
    expect(stuck.won).toBe(false);
  });
});

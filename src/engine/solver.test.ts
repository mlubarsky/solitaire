import { describe, expect, it } from 'vitest';
import { makeState, upTo } from '../test/makeState';
import { canAutoComplete } from './autoComplete';
import { newGame } from './deal';
import { applyMove } from './moves';
import { foundation, tableau, WASTE } from './piles';
import { candidateMoves, positionKey, solve } from './solver';
import { isWon } from './status';
import type { GameState, Move } from './types';

/** Replays `moves` from `state`, failing on any illegal move. */
function replay(state: GameState, moves: readonly Move[]): GameState {
  return moves.reduce((s, move) => {
    const result = applyMove(s, move);
    if (!result.ok) throw new Error(`illegal move ${JSON.stringify(move)}: ${result.reason}`);
    return result.state;
  }, state);
}

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

/** One face-down card left: the shortest win is CK to its foundation (then auto-complete). */
const almostWon = () =>
  makeState({
    foundations: [upTo('S', 13), upTo('H', 11), upTo('D', 13), upTo('C', 12)],
    tableau: [['#HQ', 'CK'], ['HK']],
    stock: [],
  });

describe('positionKey', () => {
  it('ignores the order of tableau columns and foundations', () => {
    const a = makeState({ tableau: [['#S9', 'H8'], ['C7']], foundations: [['SA'], ['HA']] });
    const b = makeState({
      tableau: [[], ['C7'], [], ['#S9', 'H8']],
      foundations: [[], ['HA'], [], ['SA']],
    });
    expect(positionKey(a)).toBe(positionKey(b));
  });

  it('tells apart different hidden cards, stock order and waste', () => {
    const base = makeState({ tableau: [['#S9', 'H8']], waste: ['D2'] });
    const otherHidden = makeState({ tableau: [['#S10', 'H8']], waste: ['D2'] });
    const otherWaste = makeState({ tableau: [['#S9', 'H8']], waste: ['D3'] });
    const reversedStock = { ...base, stock: base.stock.slice().reverse() };
    const keys = new Set([base, otherHidden, otherWaste, reversedStock].map(positionKey));
    expect(keys.size).toBe(4);
  });

  it('handles a column that is entirely face down', () => {
    const s = makeState({ tableau: [['#S9', '#H8']], validate: false });
    expect(positionKey(s)).toContain(':');
  });
});

describe('candidateMoves', () => {
  it('forces a safe foundation move (Aces and 2s) as the only candidate', () => {
    const s = makeState({ tableau: [['HA'], ['S8'], ['D7']], waste: ['C9'] });
    expect(candidateMoves(s)).toEqual([
      { type: 'transfer', from: tableau(0), to: foundation(0), count: 1 },
    ]);
  });

  it('forces a higher card once both opposite-color foundations have caught up', () => {
    const s = makeState({
      foundations: [upTo('H', 2), upTo('S', 2), upTo('C', 2), upTo('D', 2)],
      waste: ['H3'],
    });
    expect(candidateMoves(s)).toEqual([
      { type: 'transfer', from: WASTE, to: foundation(0), count: 1 },
    ]);
  });

  it('offers an unsafe foundation move first, alongside the other options', () => {
    const s = makeState({
      foundations: [upTo('H', 4), upTo('S', 2)],
      tableau: [['H5'], ['S6']],
    });
    const moves = candidateMoves(s);
    expect(moves[0]).toEqual({ type: 'transfer', from: tableau(0), to: foundation(0), count: 1 });
    expect(moves).toContainEqual({ type: 'transfer', from: tableau(0), to: tableau(1), count: 1 });
    expect(moves.length).toBeGreaterThan(1);
  });

  it('orders reveals before waste plays, column-emptying moves, partial moves and draws', () => {
    const s = makeState({
      foundations: [upTo('C', 3)],
      tableau: [['#S2', 'H9'], ['C10'], ['D8'], ['#S7', 'C4', 'H3'], ['S10'], ['S4'], ['C9']],
      waste: ['D9'],
    });
    expect(candidateMoves(s)).toEqual([
      { type: 'transfer', from: tableau(0), to: tableau(1), count: 1 },
      { type: 'transfer', from: tableau(0), to: tableau(4), count: 1 },
      { type: 'transfer', from: WASTE, to: tableau(1), count: 1 },
      { type: 'transfer', from: WASTE, to: tableau(4), count: 1 },
      // Emptying a column (8♦ onto 9♣).
      { type: 'transfer', from: tableau(2), to: tableau(6), count: 1 },
      // The 3♥ may move alone because that frees the 4♣ for its foundation.
      { type: 'transfer', from: tableau(3), to: tableau(5), count: 1 },
      { type: 'draw' },
    ]);
  });

  it('skips partial moves that free nothing, and Kings already at the bottom', () => {
    const s = makeState({
      tableau: [['HK', 'SQ', 'HJ'], ['#D2', 'CQ'], ['DK'], []],
      stock: [],
      validate: false,
    });
    const moves = candidateMoves(s);
    expect(moves).not.toContainEqual(expect.objectContaining({ from: tableau(0), count: 3 }));
    expect(moves).not.toContainEqual(expect.objectContaining({ from: tableau(0), count: 2 }));
    expect(moves).not.toContainEqual(expect.objectContaining({ from: tableau(0), count: 1 }));
  });

  it('tries only one empty column for a King (from the tableau or the waste)', () => {
    const s = makeState({
      tableau: [['#S2', 'CK'], [], ['H5']],
      waste: ['DK'],
      stock: [],
      validate: false,
    });
    const toEmpty = candidateMoves(s).filter(
      (m) => m.type === 'transfer' && m.to.kind === 'tableau' && m.to.index !== 2,
    );
    expect(toEmpty).toEqual([
      { type: 'transfer', from: tableau(0), to: tableau(1), count: 1 },
      { type: 'transfer', from: WASTE, to: tableau(1), count: 1 },
    ]);
  });

  it('recycles when the stock is empty, and has no stock move when both are empty', () => {
    const recycle = makeState({ tableau: [['H9']], waste: ['C4'], stock: [], validate: false });
    expect(candidateMoves(recycle)).toContainEqual({ type: 'recycle' });
    expect(candidateMoves(stuckState())).toEqual([]);
  });

  it('every candidate is legal', () => {
    for (const seed of [1, 2, 3]) {
      let s = newGame(seed);
      for (let step = 0; step < 40; step++) {
        const moves = candidateMoves(s);
        for (const m of moves) expect(applyMove(s, m).ok).toBe(true);
        if (moves.length === 0) break;
        s = replay(s, [moves[step % moves.length] as Move]);
      }
    }
  });
});

describe('solve', () => {
  it('returns an empty winning line when auto-complete can already finish', () => {
    const s = makeState({
      foundations: [upTo('S', 13), upTo('H', 12), upTo('D', 13), upTo('C', 13)],
      tableau: [['HK']],
      stock: [],
    });
    expect(solve(s)).toMatchObject({ status: 'solved', moves: [], exhaustive: true });
  });

  it('finds the shortest win and proves it by exhausting the search', () => {
    const result = solve(almostWon());
    expect(result.status).toBe('solved');
    expect(result.exhaustive).toBe(true);
    expect(result.moves).toEqual([
      { type: 'transfer', from: tableau(0), to: foundation(3), count: 1 },
    ]);
    expect(canAutoComplete(replay(almostWon(), result.moves))).toBe(true);
  });

  it('plays through the stock when the needed cards are there', () => {
    const s = makeState({
      foundations: [upTo('S', 13), upTo('H', 10), upTo('D', 13), upTo('C', 13)],
      tableau: [['#HQ', 'HJ']],
      stock: ['HK'],
    });
    const result = solve(s);
    expect(result.status).toBe('solved');
    const end = replay(s, result.moves);
    expect(isWon(end) || canAutoComplete(end)).toBe(true);
    expect(result.moves).toContainEqual({ type: 'draw' });
  });

  it('reports a dead position as unsolvable after exhausting the search', () => {
    expect(solve(stuckState())).toEqual({
      status: 'unsolvable',
      moves: [],
      exhaustive: true,
      nodes: 1,
    });
  });

  it('proves a real deal unwinnable and returns its best partial line', () => {
    const result = solve(newGame(27));
    expect(result.status).toBe('unsolvable');
    expect(result.exhaustive).toBe(true);
    const end = replay(newGame(27), result.moves);
    expect(end.foundations.flat().length).toBeGreaterThan(0);
  });

  it('gives up when the budget runs out, returning the line with the most foundation cards', () => {
    const result = solve(newGame(17), { maxNodes: 3000 });
    expect(result.status).toBe('gave-up');
    expect(result.exhaustive).toBe(false);
    expect(result.nodes).toBe(3000);
    const end = replay(newGame(17), result.moves);
    expect(end.foundations.flat().length).toBeGreaterThan(0);
  });

  it('wins real deals with legal lines, and shortening never makes a line longer', () => {
    for (const seed of [2, 6]) {
      const quick = solve(newGame(seed), { improveNodes: 0 });
      const best = solve(newGame(seed), { improveNodes: 100_000 });
      for (const result of [quick, best]) {
        expect(result.status).toBe('solved');
        const end = replay(newGame(seed), result.moves);
        expect(isWon(end) || canAutoComplete(end)).toBe(true);
      }
      expect(quick.exhaustive).toBe(false);
      expect(best.moves.length).toBeLessThanOrEqual(quick.moves.length);
    }
  });
});

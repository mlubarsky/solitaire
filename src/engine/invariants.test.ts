import { describe, expect, it } from 'vitest';
import { card, makeState, upTo } from '../test/makeState';
import { newGame } from './deal';
import { assertValidState, findStateProblems } from './invariants';
import type { GameState } from './types';

function problemsOf(state: GameState): string {
  return findStateProblems(state).join('\n');
}

describe('assertValidState', () => {
  it('accepts a fresh deal', () => {
    expect(() => assertValidState(newGame(5))).not.toThrow();
    expect(findStateProblems(newGame(5))).toEqual([]);
  });

  it('rejects wrong pile counts', () => {
    const g = newGame(1);
    const bad = { ...g, foundations: g.foundations.slice(0, 3), tableau: g.tableau.slice(0, 6) };
    const text = problemsOf(bad as unknown as GameState);
    expect(text).toMatch(/4 foundations/);
    expect(text).toMatch(/7 tableau/);
  });

  it('rejects missing and duplicate cards', () => {
    const g = newGame(1);
    expect(problemsOf({ ...g, stock: g.stock.slice(1) })).toMatch(/Expected 52 cards, found 51/);
    const dup = { ...g, stock: [...g.stock.slice(1), g.stock[2]!] };
    expect(problemsOf(dup)).toMatch(/Duplicate card/);
    expect(() => assertValidState(dup)).toThrow(/Invalid game state/);
  });

  it('rejects malformed card ids', () => {
    const g = newGame(1);
    const stock = [...g.stock.slice(1), { ...g.stock[0]!, id: 'ZZ' }];
    expect(problemsOf({ ...g, stock })).toMatch(/malformed/);
  });

  it('rejects face-up stock cards and face-down waste cards', () => {
    const g = newGame(1);
    const stock = [{ ...g.stock[0]!, faceUp: true }, ...g.stock.slice(1)];
    expect(problemsOf({ ...g, stock })).toMatch(/Stock cards must be face-down/);
    const waste = [{ ...g.stock[0]!, faceUp: false }];
    expect(problemsOf({ ...g, stock: g.stock.slice(1), waste })).toMatch(
      /Waste cards must be face-up/,
    );
  });

  it('rejects bad foundations', () => {
    const wrongStart = makeState({ foundations: [['H2']], validate: false });
    expect(problemsOf(wrongStart)).toMatch(/Foundation 0/);
    const mixed = makeState({ foundations: [['HA', 'D2']], validate: false });
    expect(problemsOf(mixed)).toMatch(/Foundation 0/);
    const ok = makeState({ foundations: [upTo('C', 4)] });
    const faceDown = {
      ...ok,
      foundations: [[...ok.foundations[0].slice(0, 3), card('#C4')], [], [], []],
    } as unknown as GameState;
    expect(problemsOf(faceDown)).toMatch(/Foundation 0/);
  });

  it('rejects face-down tops, face-down cards above face-up ones, and broken runs', () => {
    expect(problemsOf(makeState({ tableau: [['S5', '#H4']], validate: false }))).toMatch(
      /face-down top card/,
    );
    expect(problemsOf(makeState({ tableau: [['S5', '#H4', 'C3']], validate: false }))).toMatch(
      /face-down card above a face-up card/,
    );
    expect(problemsOf(makeState({ tableau: [['S5', 'C4']], validate: false }))).toMatch(
      /invalid face-up run/,
    );
    expect(findStateProblems(makeState({ tableau: [['#S5', '#C4', 'H9', 'S8']] }))).toEqual([]);
  });

  it('rejects negative or fractional score and moves', () => {
    const g = newGame(1);
    expect(problemsOf({ ...g, score: -5 })).toMatch(/Score/);
    expect(problemsOf({ ...g, score: 1.5 })).toMatch(/Score/);
    expect(problemsOf({ ...g, moves: -1 })).toMatch(/Moves/);
    expect(problemsOf({ ...g, moves: 0.5 })).toMatch(/Moves/);
  });
});

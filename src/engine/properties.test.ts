import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { findAutoMove } from './autoMove';
import { newGame } from './deal';
import { findStateProblems } from './invariants';
import { applyMove, getLegalMoves } from './moves';
import { ALL_FOUNDATIONS, ALL_TABLEAU, STOCK, WASTE, getPile } from './piles';
import type { GameState, Move, PileId } from './types';

const ALL_PILES: PileId[] = [STOCK, WASTE, ...ALL_FOUNDATIONS, ...ALL_TABLEAU];
const seedArb = fc.integer({ min: 0, max: 0xffffffff });
const choicesArb = fc.array(fc.nat(), { minLength: 1, maxLength: 150 });

/** Checks the invariants listed in TEST_PLAN.md explicitly (in addition to findStateProblems). */
function checkInvariants(state: GameState, step: number): void {
  const all = [
    ...state.stock,
    ...state.waste,
    ...state.foundations.flat(),
    ...state.tableau.flat(),
  ];
  expect(all).toHaveLength(52);
  expect(new Set(all.map((c) => c.id)).size).toBe(52);
  for (const pile of state.foundations) {
    pile.forEach((c, i) => {
      expect(c.rank).toBe(i + 1);
      expect(c.suit).toBe(pile[0]!.suit);
    });
  }
  for (const column of state.tableau) {
    const firstUp = column.findIndex((c) => c.faceUp);
    column.forEach((c, i) => {
      // Face-down cards only below face-up ones.
      if (firstUp !== -1) expect(c.faceUp).toBe(i >= firstUp);
      if (i > firstUp && firstUp !== -1) {
        const below = column[i - 1]!;
        const red = (s: string) => s === 'hearts' || s === 'diamonds';
        expect(red(c.suit)).not.toBe(red(below.suit));
        expect(c.rank).toBe(below.rank - 1);
      }
    });
    if (column.length > 0) expect(firstUp).not.toBe(-1);
  }
  expect(state.stock.every((c) => !c.faceUp)).toBe(true);
  expect(state.waste.every((c) => c.faceUp)).toBe(true);
  expect(state.score).toBeGreaterThanOrEqual(0);
  expect(state.moves).toBe(step);
  expect(findStateProblems(state)).toEqual([]);
}

describe('engine properties (fast-check)', () => {
  it('random legal move sequences preserve every invariant', () => {
    fc.assert(
      fc.property(seedArb, choicesArb, (seed, choices) => {
        let state = newGame(seed);
        checkInvariants(state, 0);
        choices.forEach((choice, i) => {
          const legal = getLegalMoves(state);
          if (legal.length === 0) return;
          const r = applyMove(state, legal[choice % legal.length]!);
          if (!r.ok) throw new Error(r.reason);
          state = r.state;
          checkInvariants(state, i + 1);
        });
      }),
      { numRuns: 150 },
    );
  });

  it('every move from getLegalMoves succeeds in applyMove', () => {
    fc.assert(
      fc.property(seedArb, choicesArb, (seed, choices) => {
        let state = newGame(seed);
        for (const choice of choices) {
          const legal = getLegalMoves(state);
          if (legal.length === 0) break;
          for (const move of legal) expect(applyMove(state, move).ok).toBe(true);
          const r = applyMove(state, legal[choice % legal.length]!);
          if (!r.ok) throw new Error(r.reason);
          state = r.state;
        }
      }),
      { numRuns: 40 },
    );
  });

  const randomMoveArb: fc.Arbitrary<Move> = fc.oneof(
    fc.constant<Move>({ type: 'draw' }),
    fc.constant<Move>({ type: 'recycle' }),
    fc.record({
      type: fc.constant('transfer' as const),
      from: fc.constantFrom(...ALL_PILES),
      to: fc.constantFrom(...ALL_PILES),
      count: fc.integer({ min: -1, max: 14 }),
    }),
  );

  it('random (possibly invalid) moves never corrupt state', () => {
    fc.assert(
      fc.property(
        seedArb,
        choicesArb,
        fc.array(randomMoveArb, { minLength: 1, maxLength: 60 }),
        (seed, choices, randomMoves) => {
          let state = newGame(seed);
          // Reach a random mid-game position first.
          for (const choice of choices.slice(0, 40)) {
            const legal = getLegalMoves(state);
            if (legal.length === 0) break;
            const r = applyMove(state, legal[choice % legal.length]!);
            if (r.ok) state = r.state;
          }
          for (const move of randomMoves) {
            const before = structuredClone(state);
            const legal = getLegalMoves(state);
            const r = applyMove(state, move);
            if (r.ok) {
              expect(legal).toContainEqual(move);
              expect(findStateProblems(r.state)).toEqual([]);
              state = r.state;
            } else {
              expect(legal).not.toContainEqual(move);
              expect(state).toEqual(before);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('findAutoMove results are always legal moves', () => {
    fc.assert(
      fc.property(seedArb, choicesArb, (seed, choices) => {
        let state = newGame(seed);
        for (const choice of choices) {
          const legal = getLegalMoves(state);
          for (const pile of ALL_PILES) {
            const cards = getPile(state, pile)!;
            for (let i = 0; i < cards.length; i++) {
              const auto = findAutoMove(state, pile, i);
              if (auto !== null) expect(legal).toContainEqual(auto);
            }
          }
          if (legal.length === 0) break;
          const r = applyMove(state, legal[choice % legal.length]!);
          if (!r.ok) throw new Error(r.reason);
          state = r.state;
        }
      }),
      { numRuns: 30 },
    );
  });
});

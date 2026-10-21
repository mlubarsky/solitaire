import { describe, expect, it } from 'vitest';
import { makeState } from '../test/makeState';
import { newGame } from './deal';
import { canUndo, pushHistory, undo, undoAll, type History } from './history';
import { mulberry32 } from './rng';
import { applyMove, getLegalMoves } from './moves';
import { foundation, tableau } from './piles';
import type { GameState } from './types';

describe('history / undoAll', () => {
  it('goes straight back to the oldest state and empties the history', () => {
    const states = [1, 2, 3].map((moves) => ({ ...newGame(7), moves }));
    const history = states.reduce<History>((h, s) => pushHistory(h, s), []);
    const current = { ...newGame(7), moves: 4 };
    expect(undoAll(history, current)).toEqual({ state: states[0], history: [] });
  });

  it('is a no-op on an empty history', () => {
    const current = newGame(7);
    const result = undoAll([], current);
    expect(result.state).toBe(current);
    expect(result.history).toEqual([]);
  });
});

describe('history / undo', () => {
  it('restores the exact prior state, including score and moves', () => {
    const start = makeState({ waste: ['H6'], tableau: [['S7']], score: 20, moves: 4 });
    const r = applyMove(start, {
      type: 'transfer',
      from: { kind: 'waste' },
      to: tableau(0),
      count: 1,
    });
    if (!r.ok) throw new Error(r.reason);
    const history = pushHistory([], start);
    expect(canUndo(history)).toBe(true);
    const back = undo(history, r.state);
    expect(back.state).toEqual(start);
    expect(back.state.score).toBe(20);
    expect(back.state.moves).toBe(4);
    expect(back.history).toEqual([]);
    expect(canUndo(back.history)).toBe(false);
  });

  it('re-hides a card that was auto-flipped', () => {
    const start = makeState({ tableau: [['#D9', 'SA']] });
    const r = applyMove(start, { type: 'transfer', from: tableau(0), to: foundation(0), count: 1 });
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.tableau[0][0]!.faceUp).toBe(true);
    const back = undo(pushHistory([], start), r.state);
    expect(back.state.tableau[0][0]!.faceUp).toBe(false);
    expect(back.state.tableau[0].map((c) => c.id)).toEqual(['D9', 'SA']);
  });

  it('is a no-op on an empty history', () => {
    const g = newGame(1);
    const empty: History = [];
    const result = undo(empty, g);
    expect(result.state).toBe(g);
    expect(result.history).toBe(empty);
  });

  it('pushHistory does not mutate the input history', () => {
    const h: History = Object.freeze([]) as History;
    const next = pushHistory(h, newGame(1));
    expect(h).toHaveLength(0);
    expect(next).toHaveLength(1);
  });

  it('100 random moves then 100 undos returns to the initial deal', () => {
    const initial = newGame(77);
    const rng = mulberry32(99);
    let state: GameState = initial;
    let history: History = [];
    for (let i = 0; i < 100; i++) {
      const legal = getLegalMoves(state);
      const move = legal[Math.floor(rng() * legal.length)]!;
      const r = applyMove(state, move);
      if (!r.ok) throw new Error(r.reason);
      history = pushHistory(history, state);
      state = r.state;
    }
    expect(state.moves).toBe(100);
    for (let i = 0; i < 100; i++) ({ state, history } = undo(history, state));
    expect(state).toEqual(initial);
    expect(history).toHaveLength(0);
  });
});

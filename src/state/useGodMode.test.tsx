import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { solve, type GameState, type SolveResult } from '../engine';
import { makeState, upTo } from '../test/makeState';
import type { SolveJob, SolverFn } from './solverClient';
import { useGame } from './useGame';
import { GOD_MODE_STEP_MS, useGodMode } from './useGodMode';

/** Needs four moves (two foundation plays, a draw, and the drawn King); no auto-complete. */
const fourMoves = () =>
  makeState({
    foundations: [upTo('S', 13), upTo('H', 10), upTo('D', 13), upTo('C', 13)],
    tableau: [['#HQ', 'HJ']],
    stock: ['HK'],
  });

/** One move (C♠K to its foundation), then auto-complete finishes. */
const almostWon = () =>
  makeState({
    foundations: [upTo('S', 13), upTo('H', 11), upTo('D', 13), upTo('C', 12)],
    tableau: [['#HQ', 'CK'], ['HK']],
    stock: [],
  });

/** No legal move: every tableau top is a heart and no Ace is reachable. */
const stuck = () =>
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

function solverReturning(result: SolveResult | Error) {
  const cancel = vi.fn();
  const fn = vi.fn<SolverFn>(() => ({
    promise: result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
    cancel,
  }));
  return { fn, cancel };
}

function deferredSolver() {
  let resolve: (r: SolveResult) => void = () => undefined;
  const cancel = vi.fn();
  const fn = vi.fn<SolverFn>((): SolveJob => ({
    promise: new Promise<SolveResult>((r) => {
      resolve = r;
    }),
    cancel,
  }));
  return { fn, cancel, resolve: (r: SolveResult) => resolve(r) };
}

function setup(game: GameState, solver: SolverFn) {
  return renderHook(() => {
    const api = useGame({ game });
    const god = useGodMode({
      game: api.state.game,
      phase: api.state.phase,
      dealId: api.state.dealId,
      tryMove: api.tryMove,
      solver,
    });
    return { api, god };
  });
}

/** Lets resolved solver promises run their callbacks. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useGodMode', () => {
  it('plays the solved line one move every half second, then stops on the win', async () => {
    const plan = solve(fourMoves());
    expect(plan.moves).toHaveLength(4);
    const { fn } = solverReturning(plan);
    const { result } = setup(fourMoves(), fn);
    expect(result.current.god.status).toBe('idle');

    act(() => result.current.god.start());
    expect(result.current.god.status).toBe('thinking');
    expect(result.current.god.active).toBe(true);
    expect(fn).toHaveBeenCalledWith(fourMoves());
    await flush();
    expect(result.current.god).toMatchObject({ status: 'playing', step: 0, total: 4 });

    advance(GOD_MODE_STEP_MS - 1);
    expect(result.current.api.state.game.moves).toBe(0);
    advance(1);
    expect(result.current.api.state.game.moves).toBe(1);
    expect(result.current.god.step).toBe(1);
    for (let i = 2; i <= 4; i++) {
      advance(GOD_MODE_STEP_MS);
      expect(result.current.api.state.game.moves).toBe(i);
    }
    expect(result.current.api.state.phase).toBe('won');
    expect(result.current.god).toMatchObject({ status: 'idle', active: false, message: null });
  });

  it('hands over to auto-complete and stays active until the game is won', async () => {
    const { fn } = solverReturning(solve(almostWon()));
    const { result } = setup(almostWon(), fn);
    act(() => result.current.god.start());
    await flush();
    advance(GOD_MODE_STEP_MS);
    expect(result.current.api.state.phase).toBe('autocompleting');
    expect(result.current.god.status).toBe('playing');
    for (let i = 0; i < 10; i++) advance(100);
    expect(result.current.api.state.phase).toBe('won');
    expect(result.current.god.status).toBe('idle');
  });

  it('explains an unwinnable deal after playing its best line', async () => {
    const { fn } = solverReturning(solve(stuck()));
    const { result } = setup(stuck(), fn);
    act(() => result.current.god.start());
    await flush();
    expect(result.current.god.status).toBe('idle');
    expect(result.current.god.message).toBe(
      "This deal can't be won. God mode got 39 cards to the foundations.",
    );
    act(() => result.current.god.dismissMessage());
    expect(result.current.god.message).toBeNull();
  });

  it('explains when the search ran out of budget without a win', async () => {
    const { fn } = solverReturning({ status: 'gave-up', moves: [], exhaustive: false, nodes: 9 });
    const { result } = setup(fourMoves(), fn);
    act(() => result.current.god.start());
    await flush();
    expect(result.current.god.message).toMatch(/couldn't find a win within its search limit/);
  });

  it('stops if a planned move is no longer legal', async () => {
    const { fn } = solverReturning({
      status: 'solved',
      moves: [{ type: 'recycle' }],
      exhaustive: true,
      nodes: 1,
    });
    const { result } = setup(fourMoves(), fn);
    act(() => result.current.god.start());
    await flush();
    advance(GOD_MODE_STEP_MS);
    expect(result.current.god.status).toBe('idle');
    expect(result.current.god.message).toBe('God mode stopped because the board changed.');
  });

  it('stop cancels a pending solve and ignores its late result', async () => {
    const solver = deferredSolver();
    const { result } = setup(fourMoves(), solver.fn);
    act(() => result.current.god.start());
    act(() => result.current.god.stop());
    expect(solver.cancel).toHaveBeenCalled();
    expect(result.current.god.status).toBe('idle');
    solver.resolve(solve(fourMoves()));
    await flush();
    expect(result.current.god.status).toBe('idle');
    advance(GOD_MODE_STEP_MS * 3);
    expect(result.current.api.state.game.moves).toBe(0);
  });

  it('stops mid-game when asked, leaving the moves played so far', async () => {
    const { fn } = solverReturning(solve(fourMoves()));
    const { result } = setup(fourMoves(), fn);
    act(() => result.current.god.start());
    await flush();
    advance(GOD_MODE_STEP_MS);
    act(() => result.current.god.stop());
    advance(GOD_MODE_STEP_MS * 3);
    expect(result.current.api.state.game.moves).toBe(1);
    expect(result.current.god).toMatchObject({ status: 'idle', step: 0, total: 0 });
  });

  it('reports a solver failure, and ignores a failure after being stopped', async () => {
    const { fn } = solverReturning(new Error('worker crashed'));
    const { result } = setup(fourMoves(), fn);
    act(() => result.current.god.start());
    await flush();
    expect(result.current.god.status).toBe('idle');
    expect(result.current.god.message).toBe('God mode could not start. Please try again.');

    act(() => result.current.god.start());
    act(() => result.current.god.stop());
    await flush();
    expect(result.current.god.message).toBeNull();
  });

  it('only starts from a game in progress, and not twice', async () => {
    const won = makeState({
      foundations: [upTo('S', 13), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
      stock: [],
    });
    const idle = solverReturning(solve(fourMoves()));
    const wonHook = setup(won, idle.fn);
    act(() => wonHook.result.current.god.start());
    expect(idle.fn).not.toHaveBeenCalled();
    expect(wonHook.result.current.god.status).toBe('idle');

    const solver = deferredSolver();
    const { result } = setup(fourMoves(), solver.fn);
    act(() => result.current.god.start());
    act(() => result.current.god.start());
    expect(solver.fn).toHaveBeenCalledTimes(1);
  });

  it('a new deal or loaded position cancels god mode', async () => {
    const { fn } = solverReturning(solve(fourMoves()));
    const { result } = setup(fourMoves(), fn);
    act(() => result.current.god.start());
    await flush();
    act(() => result.current.api.loadState(fourMoves()));
    expect(result.current.god.status).toBe('idle');
    advance(GOD_MODE_STEP_MS * 3);
    expect(result.current.api.state.game.moves).toBe(0);
  });

  it('cancels a pending solve on unmount', () => {
    const solver = deferredSolver();
    const { result, unmount } = setup(fourMoves(), solver.fn);
    act(() => result.current.god.start());
    unmount();
    expect(solver.cancel).toHaveBeenCalled();
  });
});

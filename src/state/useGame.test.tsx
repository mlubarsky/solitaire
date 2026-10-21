import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame, WASTE } from '../engine';
import { autoCompletableState, makeState } from '../test/makeState';
import { useGame } from './useGame';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useGame', () => {
  it('tryMove only applies legal moves', () => {
    const { result } = renderHook(() => useGame({ seed: 1 }));
    let ok = true;
    act(() => {
      ok = result.current.tryMove({ type: 'recycle' });
    });
    expect(ok).toBe(false);
    act(() => {
      ok = result.current.tryMove({ type: 'draw' });
    });
    expect(ok).toBe(true);
    expect(result.current.state.game.moves).toBe(1);
  });

  it('autoMoveCard returns false when there is no move or input is locked', () => {
    const { result } = renderHook(() => useGame({ game: autoCompletableState() }));
    expect(result.current.state.phase).toBe('autocompleting');
    expect(result.current.autoMoveCard({ kind: 'tableau', index: 0 }, 2)).toBe(false);
    expect(result.current.tryMove({ type: 'draw' })).toBe(false);

    const other = renderHook(() => useGame({ game: makeState({ waste: ['C9'] }) }));
    expect(other.result.current.autoMoveCard(WASTE, 0)).toBe(false);
  });

  it('loadState validates the position and newGame deals a seed', () => {
    const { result } = renderHook(() => useGame({ seed: 1 }));
    const bad = { ...newGame(2), stock: [] };
    expect(() => result.current.loadState(bad)).toThrow(/Invalid game state/);
    act(() => result.current.loadState(newGame(3)));
    expect(result.current.state.game).toEqual(newGame(3));
    act(() => result.current.newGame(4));
    expect(result.current.state.game).toEqual(newGame(4));
  });
});

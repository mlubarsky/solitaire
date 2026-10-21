import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from './engine';
import { autoCompletableState, nearWonState } from './test/makeState';
import { readout, renderApp, stockButton } from './test/renderApp';
import { installTestHooks } from './testHooks';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('window.__solitaire test hooks', () => {
  it('are installed in dev/test builds and removed on unmount', () => {
    const { unmount } = renderApp({ seed: 8 });
    const hooks = window.__solitaire;
    expect(hooks).toBeDefined();
    expect(hooks!.getState()).toEqual(newGame(8));
    act(() => stockButton().click());
    expect(hooks!.getState().moves).toBe(1);

    act(() => hooks!.loadState(nearWonState()));
    expect(window.__solitaire!.getState()).toEqual(nearWonState());
    expect(readout('moves')).toBe('120');

    act(() => window.__solitaire!.newGame(21));
    expect(window.__solitaire!.getState()).toEqual(newGame(21));

    vi.spyOn(Math, 'random').mockReturnValue(0);
    act(() => window.__solitaire!.newGame());
    expect(window.__solitaire!.getState()).toEqual(newGame(0));

    expect(() => window.__solitaire!.loadState({ ...newGame(1), waste: [], stock: [] })).toThrow();
    act(() => window.__solitaire!.loadState(autoCompletableState()));
    expect(window.__solitaire!.getState().stock).toEqual([]);

    unmount();
    expect(window.__solitaire).toBeUndefined();
  });

  it('cleanup leaves newer hooks alone', () => {
    const a = {
      getState: () => newGame(1),
      loadState: () => undefined,
      newGame: () => undefined,
      setGodModeDelay: () => undefined,
    };
    const b = { ...a };
    const removeA = installTestHooks(a);
    const removeB = installTestHooks(b);
    removeA();
    expect(window.__solitaire).toBe(b);
    removeB();
    expect(window.__solitaire).toBeUndefined();
  });
});

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  applyMove,
  assertValidState,
  findAutoMove,
  type GameState,
  type Move,
  type PileId,
} from '../engine';
import { canUndoNow, fromGame, gameReducer, initialState, type AppState } from './gameReducer';

/** Delay between auto-complete moves (SPEC §4: ~80–120 ms per card). */
export const AUTO_COMPLETE_STEP_MS = 100;

export interface GameApi {
  state: AppState;
  canUndo: boolean;
  /** Click on the stock: draw, or recycle when the stock is empty. */
  drawOrRecycle: () => void;
  /** Applies `move` if the engine says it is legal. Returns whether it was applied. */
  tryMove: (move: Move) => boolean;
  /** Click on a face-up card: auto-moves it via findAutoMove. Returns false if it cannot move. */
  autoMoveCard: (from: PileId, index: number) => boolean;
  undo: () => void;
  /** Undoes every move, back to the start of this game. */
  undoAll: () => void;
  newGame: (seed: number) => void;
  loadState: (game: GameState) => void;
}

const DEFAULT_PACE = { current: AUTO_COMPLETE_STEP_MS } as const;

export function useGame(
  initial: { seed: number } | { game: GameState },
  /** Delay between auto-complete moves, read when each step is scheduled (god mode slows it). */
  autoCompleteMs: { readonly current: number } = DEFAULT_PACE,
): GameApi {
  const [state, dispatch] = useReducer(gameReducer, initial, (init) =>
    'game' in init ? fromGame(init.game) : initialState(init.seed),
  );

  // Auto-complete: step one card at a time while in the autocompleting phase.
  useEffect(() => {
    if (state.phase !== 'autocompleting') return;
    const id = setTimeout(() => dispatch({ type: 'AUTO_STEP' }), autoCompleteMs.current);
    return () => clearTimeout(id);
  }, [state.phase, state.game, autoCompleteMs]);

  const { game, phase } = state;

  const tryMove = useCallback(
    (move: Move): boolean => {
      if (phase !== 'playing' || !applyMove(game, move).ok) return false;
      dispatch({ type: 'MOVE', move });
      return true;
    },
    [game, phase],
  );

  const autoMoveCard = useCallback(
    (from: PileId, index: number): boolean => {
      if (phase !== 'playing') return false;
      const move = findAutoMove(game, from, index);
      return move !== null && tryMove(move);
    },
    [game, phase, tryMove],
  );

  const drawOrRecycle = useCallback(() => dispatch({ type: 'DRAW' }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const undoAll = useCallback(() => dispatch({ type: 'UNDO_ALL' }), []);
  const newGame = useCallback((seed: number) => dispatch({ type: 'NEW_GAME', seed }), []);
  const loadState = useCallback((next: GameState) => {
    assertValidState(next);
    dispatch({ type: 'LOAD_STATE', game: next });
  }, []);

  return useMemo(
    () => ({
      state,
      canUndo: canUndoNow(state),
      drawOrRecycle,
      tryMove,
      autoMoveCard,
      undo,
      undoAll,
      newGame,
      loadState,
    }),
    [state, drawOrRecycle, tryMove, autoMoveCard, undo, undoAll, newGame, loadState],
  );
}

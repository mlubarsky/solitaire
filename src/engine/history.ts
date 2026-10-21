import type { GameState } from './types';

/** Immutable stack of prior game states; the last element is the most recent. */
export type History = readonly GameState[];

export function pushHistory(history: History, state: GameState): History {
  return [...history, state];
}

export function canUndo(history: History): boolean {
  return history.length > 0;
}

/** Goes all the way back to the oldest state (the start of the game). No-op when empty. */
export function undoAll(
  history: History,
  current: GameState,
): { state: GameState; history: History } {
  return { state: history[0] ?? current, history: [] };
}

/** Pops the most recent prior state. Undo on an empty history is a no-op. */
export function undo(history: History, current: GameState): { state: GameState; history: History } {
  const previous = history[history.length - 1];
  if (previous === undefined) return { state: current, history };
  return { state: previous, history: history.slice(0, -1) };
}

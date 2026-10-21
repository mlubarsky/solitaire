import type { GameState } from './engine';

/** Test-only API exposed as `window.__solitaire` in dev and test builds (never production). */
export interface SolitaireTestHooks {
  getState: () => GameState;
  loadState: (state: GameState) => void;
  newGame: (seed?: number) => void;
  /** Speeds up god mode in end-to-end tests (milliseconds between moves). */
  setGodModeDelay: (ms: number) => void;
}

declare global {
  interface Window {
    __solitaire?: SolitaireTestHooks;
  }
}

export function installTestHooks(hooks: SolitaireTestHooks): () => void {
  window.__solitaire = hooks;
  return () => {
    if (window.__solitaire === hooks) delete window.__solitaire;
  };
}

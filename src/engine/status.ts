import type { GameState } from './types';

/** The game is won when all 52 cards are on the foundations. */
export function isWon(state: GameState): boolean {
  return state.foundations.reduce((sum, pile) => sum + pile.length, 0) === 52;
}

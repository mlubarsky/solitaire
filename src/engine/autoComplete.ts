import { ALL_FOUNDATIONS, getPile } from './piles';
import { canPlaceOnFoundation } from './rules';
import type { Card, GameState, Move } from './types';

/** True when stock and waste are empty and every tableau card is face-up. */
export function canAutoComplete(state: GameState): boolean {
  return (
    state.stock.length === 0 &&
    state.waste.length === 0 &&
    state.tableau.every((column) => column.every((card) => card.faceUp))
  );
}

/** The next auto-complete move: the lowest-ranked tableau top card that fits a foundation. */
export function nextAutoCompleteMove(state: GameState): Move | null {
  if (!canAutoComplete(state)) return null;
  let best: Move | null = null;
  let bestRank = Infinity;
  state.tableau.forEach((column, col) => {
    const card = column[column.length - 1];
    if (card === undefined || card.rank >= bestRank) return;
    const to = ALL_FOUNDATIONS.find(
      (f) =>
        f.kind === 'foundation' &&
        canPlaceOnFoundation(card as Card, getPile(state, f) as readonly Card[], f.index),
    );
    if (to === undefined) return;
    bestRank = card.rank;
    best = { type: 'transfer', from: { kind: 'tableau', index: col as 0 }, to, count: 1 };
  });
  return best;
}

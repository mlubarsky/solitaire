import { cardId } from './deck';
import { canStackOnTableau } from './rules';
import type { Card, GameState } from './types';

/** Returns a list of invariant violations (empty when the state is valid). */
export function findStateProblems(state: GameState): string[] {
  const problems: string[] = [];
  if (state.foundations.length !== 4) problems.push('There must be 4 foundations');
  if (state.tableau.length !== 7) problems.push('There must be 7 tableau columns');

  const all: Card[] = [
    ...state.stock,
    ...state.waste,
    ...state.foundations.flat(),
    ...state.tableau.flat(),
  ];
  if (all.length !== 52) problems.push(`Expected 52 cards, found ${all.length}`);
  const ids = new Set<string>();
  for (const card of all) {
    if (card.id !== cardId(card.suit, card.rank)) problems.push(`Card id ${card.id} is malformed`);
    if (ids.has(card.id)) problems.push(`Duplicate card ${card.id}`);
    ids.add(card.id);
  }

  if (state.stock.some((c) => c.faceUp)) problems.push('Stock cards must be face-down');
  if (state.waste.some((c) => !c.faceUp)) problems.push('Waste cards must be face-up');

  state.foundations.forEach((pile, f) => {
    pile.forEach((card, i) => {
      const base = pile[0] as Card;
      if (!card.faceUp || card.rank !== i + 1 || card.suit !== base.suit) {
        problems.push(`Foundation ${f} is not a same-suit ascending run from Ace`);
      }
    });
  });

  state.tableau.forEach((column, t) => {
    const top = column[column.length - 1];
    if (top !== undefined && !top.faceUp) problems.push(`Tableau ${t} has a face-down top card`);
    column.forEach((card, i) => {
      if (i === 0) return;
      const below = column[i - 1] as Card;
      if (!below.faceUp) return;
      if (!card.faceUp) {
        problems.push(`Tableau ${t} has a face-down card above a face-up card`);
      } else if (!canStackOnTableau(card, below)) {
        problems.push(`Tableau ${t} has an invalid face-up run`);
      }
    });
  });

  if (!Number.isInteger(state.score) || state.score < 0) problems.push('Score must be >= 0');
  if (!Number.isInteger(state.moves) || state.moves < 0) problems.push('Moves must be >= 0');
  return problems;
}

/** Throws if the state violates any game invariant. */
export function assertValidState(state: GameState): void {
  const problems = findStateProblems(state);
  if (problems.length > 0) throw new Error(`Invalid game state: ${problems.join('; ')}`);
}

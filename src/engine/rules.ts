import { color } from './deck';
import { FOUNDATION_SUITS, type Card, type FoundationIndex, type Pile, type Suit } from './types';

/**
 * Can `card` (the bottom card of a moving stack) be placed on a tableau column whose
 * top card is `target` (undefined = empty column)?
 */
export function canStackOnTableau(card: Card, target: Card | undefined): boolean {
  if (target === undefined) return card.rank === 13;
  if (!target.faceUp) return false;
  return color(card) !== color(target) && target.rank === card.rank + 1;
}

/** The foundation that holds `suit` (each suit has its own). */
export function foundationIndexOf(suit: Suit): FoundationIndex {
  return FOUNDATION_SUITS.indexOf(suit) as FoundationIndex;
}

/** Can `card` be placed on foundation `index`, whose cards are `foundationPile`? */
export function canPlaceOnFoundation(card: Card, foundationPile: Pile, index: number): boolean {
  if (FOUNDATION_SUITS[index] !== card.suit) return false;
  const top = foundationPile[foundationPile.length - 1];
  if (top === undefined) return card.rank === 1;
  return card.rank === top.rank + 1;
}

/** Is `pile[index..]` a face-up, alternating-color, descending run that may be picked up? */
export function isMovableStack(pile: Pile, index: number): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= pile.length) return false;
  for (let i = index; i < pile.length; i++) {
    const card = pile[i] as Card;
    if (!card.faceUp) return false;
    if (i > index && !canStackOnTableau(card, pile[i - 1] as Card)) return false;
  }
  return true;
}

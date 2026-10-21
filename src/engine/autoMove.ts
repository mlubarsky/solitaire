import { ALL_FOUNDATIONS, getPile, tableau } from './piles';
import { validateMove } from './moves';
import type { GameState, Move, Pile, PileId } from './types';

function tableauScanOrder(from: PileId): number[] {
  const start = from.kind === 'tableau' ? from.index + 1 : 0;
  const order: number[] = [];
  for (let i = 0; i < 7; i++) {
    const col = (start + i) % 7;
    if (!(from.kind === 'tableau' && col === from.index)) order.push(col);
  }
  return order;
}

/**
 * Click behavior: the best destination for the card at `cardIndex` in pile `from`
 * (together with every card on top of it), or null if it has nowhere to go.
 */
export function findAutoMove(state: GameState, from: PileId, cardIndex: number): Move | null {
  if (from.kind === 'stock') return null;
  const pile = getPile(state, from);
  const card = pile?.[cardIndex];
  if (pile === undefined || card === undefined || !card.faceUp) return null;
  const count = pile.length - cardIndex;
  if (from.kind !== 'tableau' && count !== 1) return null;

  const legal = (to: PileId): Move | null => {
    const move: Move = { type: 'transfer', from, to, count };
    return validateMove(state, move) === null ? move : null;
  };

  // 1. A single top card goes to a foundation if it can (foundation cards never do).
  if (count === 1 && from.kind !== 'foundation') {
    for (const f of ALL_FOUNDATIONS) {
      const move = legal(f);
      if (move) return move;
    }
  }

  const order = tableauScanOrder(from);
  // 2. A non-empty tableau column, scanning from the column after the source.
  for (const col of order) {
    if ((state.tableau[col] as Pile).length === 0) continue;
    const move = legal(tableau(col));
    if (move) return move;
  }

  // 3. An empty column, only for a King that isn't already at the bottom of its column.
  const pointless = from.kind === 'tableau' && cardIndex === 0;
  if (card.rank === 13 && !pointless) {
    const empty = order.find((col) => (state.tableau[col] as Pile).length === 0);
    if (empty !== undefined) return legal(tableau(empty));
  }
  return null;
}

import { withFace } from './deck';
import { ALL_FOUNDATIONS, ALL_TABLEAU, getPile, pileEquals, setPile } from './piles';
import { canPlaceOnFoundation, canStackOnTableau, isMovableStack } from './rules';
import { applyScore, scoreForMove } from './scoring';
import type { Card, GameState, Move, MoveResult, PileId } from './types';

function isKnownPile(id: PileId): boolean {
  switch (id.kind) {
    case 'stock':
    case 'waste':
      return true;
    case 'foundation':
      return Number.isInteger(id.index) && id.index >= 0 && id.index < 4;
    case 'tableau':
      return Number.isInteger(id.index) && id.index >= 0 && id.index < 7;
    default:
      return false;
  }
}

/** Returns null if the move is legal, otherwise a human-readable reason. */
export function validateMove(state: GameState, move: Move): string | null {
  if (move.type === 'draw') {
    return state.stock.length === 0 ? 'The stock is empty' : null;
  }
  if (move.type === 'recycle') {
    if (state.stock.length > 0) return 'The stock is not empty';
    if (state.waste.length === 0) return 'The waste is empty';
    return null;
  }
  const { from, to, count } = move;
  if (!isKnownPile(from) || !isKnownPile(to)) return 'Unknown pile';
  if (!Number.isInteger(count) || count < 1) return 'Invalid card count';
  if (pileEquals(from, to)) return 'Source and target are the same pile';
  if (from.kind === 'stock') return 'Cards cannot be moved directly from the stock';
  if (to.kind === 'stock' || to.kind === 'waste')
    return 'Cards cannot be placed on the stock or waste';
  const source = getPile(state, from) as readonly Card[];
  if (source.length === 0) return 'The source pile is empty';
  if (count > source.length) return 'Not enough cards in the source pile';
  if (from.kind !== 'tableau' && count !== 1)
    return 'Only the top card can be moved from this pile';
  const index = source.length - count;
  const moving = source[index] as Card;
  if (!moving.faceUp) return 'Face-down cards cannot be moved';
  if (!isMovableStack(source, index)) return 'Those cards do not form a movable stack';
  const target = getPile(state, to) as readonly Card[];
  if (to.kind === 'foundation') {
    if (count !== 1) return 'Only one card at a time can go to a foundation';
    if (from.kind === 'foundation') return 'Cards cannot move between foundations';
    return canPlaceOnFoundation(moving, target) ? null : 'That card does not fit on the foundation';
  }
  return canStackOnTableau(moving, target[target.length - 1])
    ? null
    : 'That card does not fit on the tableau column';
}

function finish(state: GameState, move: Move, next: GameState, flipped: boolean): MoveResult {
  return {
    ok: true,
    flipped,
    state: {
      ...next,
      score: applyScore(state.score, scoreForMove(move, flipped)),
      moves: state.moves + 1,
    },
  };
}

/** Applies a move. Never mutates `state`; illegal moves return `{ ok: false }`. */
export function applyMove(state: GameState, move: Move): MoveResult {
  const reason = validateMove(state, move);
  if (reason !== null) return { ok: false, reason };

  if (move.type === 'draw') {
    const card = state.stock[state.stock.length - 1] as Card;
    const next = {
      ...state,
      stock: state.stock.slice(0, -1),
      waste: [...state.waste, withFace(card, true)],
    };
    return finish(state, move, next, false);
  }

  if (move.type === 'recycle') {
    const next = {
      ...state,
      stock: state.waste
        .slice()
        .reverse()
        .map((c) => withFace(c, false)),
      waste: [],
    };
    return finish(state, move, next, false);
  }

  const source = getPile(state, move.from) as readonly Card[];
  const target = getPile(state, move.to) as readonly Card[];
  const split = source.length - move.count;
  let remaining = source.slice(0, split);
  let flipped = false;
  const exposed = remaining[remaining.length - 1];
  if (move.from.kind === 'tableau' && exposed !== undefined && !exposed.faceUp) {
    remaining = [...remaining.slice(0, -1), withFace(exposed, true)];
    flipped = true;
  }
  let next = setPile(state, move.from, remaining);
  next = setPile(next, move.to, [...target, ...source.slice(split)]);
  return finish(state, move, next, flipped);
}

function sourcesOf(state: GameState): { from: PileId; count: number }[] {
  const sources: { from: PileId; count: number }[] = [];
  if (state.waste.length > 0) sources.push({ from: { kind: 'waste' }, count: 1 });
  for (const f of ALL_FOUNDATIONS) {
    if ((getPile(state, f) as readonly Card[]).length > 0) sources.push({ from: f, count: 1 });
  }
  for (const t of ALL_TABLEAU) {
    const column = getPile(state, t) as readonly Card[];
    column.forEach((card, i) => {
      if (card.faceUp) sources.push({ from: t, count: column.length - i });
    });
  }
  return sources;
}

/** Every legal move in the position, in a deterministic order. */
export function getLegalMoves(state: GameState): Move[] {
  const candidates: Move[] = [{ type: 'draw' }, { type: 'recycle' }];
  for (const { from, count } of sourcesOf(state)) {
    for (const to of [...ALL_FOUNDATIONS, ...ALL_TABLEAU]) {
      candidates.push({ type: 'transfer', from, to, count });
    }
  }
  return candidates.filter((m) => validateMove(state, m) === null);
}

import { canAutoComplete } from './autoComplete';
import { applyMove, getLegalMoves } from './moves';
import { getPile } from './piles';
import { isWon } from './status';
import type { Card, GameState, Move, MoveResult } from './types';

function movingCard(state: GameState, move: Move & { type: 'transfer' }): Card {
  const pile = getPile(state, move.from) as readonly Card[];
  return pile[pile.length - move.count] as Card;
}

/** Number of face-down cards a tableau→tableau move would leave directly under the moved run. */
function revealsFaceDown(state: GameState, move: Move & { type: 'transfer' }): boolean {
  if (move.from.kind !== 'tableau' || move.to.kind !== 'tableau') return false;
  const pile = getPile(state, move.from) as readonly Card[];
  const under = pile[pile.length - move.count - 1];
  return under !== undefined && !under.faceUp;
}

/**
 * A simple solver-free strategy: foundation plays (lowest rank first), then tableau moves that
 * reveal a face-down card, then waste→tableau, then draw/recycle. Returns null if stuck.
 */
export function greedyMove(state: GameState): Move | null {
  const legal = getLegalMoves(state);
  const transfers = legal.filter((m): m is Move & { type: 'transfer' } => m.type === 'transfer');

  const toFoundation = transfers
    .filter((m) => m.to.kind === 'foundation')
    .sort((a, b) => movingCard(state, a).rank - movingCard(state, b).rank);
  const reveal = transfers.find((m) => revealsFaceDown(state, m));
  const fromWaste = transfers.find((m) => m.from.kind === 'waste' && m.to.kind === 'tableau');
  const stock = legal.find((m) => m.type === 'draw' || m.type === 'recycle');
  return toFoundation[0] ?? reveal ?? fromWaste ?? stock ?? null;
}

export interface GreedyResult {
  readonly moves: readonly Move[];
  readonly states: readonly GameState[];
  readonly final: GameState;
  readonly won: boolean;
}

/**
 * Plays `greedyMove` until the game is won, auto-completable (when `stopAtAutoComplete`), stuck,
 * or a full pass through the stock makes no progress.
 */
export function playGreedy(
  start: GameState,
  options: { stopAtAutoComplete?: boolean; maxMoves?: number } = {},
): GreedyResult {
  const { stopAtAutoComplete = false, maxMoves = 2000 } = options;
  const moves: Move[] = [];
  const states: GameState[] = [start];
  let state = start;
  let progressAtLastRecycle = -1;
  let progress = 0;
  while (moves.length < maxMoves && !isWon(state)) {
    if (stopAtAutoComplete && canAutoComplete(state)) break;
    const move = greedyMove(state);
    if (move === null) break;
    if (move.type === 'recycle') {
      if (progress === progressAtLastRecycle) break;
      progressAtLastRecycle = progress;
    } else if (move.type === 'transfer') {
      progress++;
    }
    // `move` came from getLegalMoves, so applying it always succeeds.
    state = (applyMove(state, move) as Extract<MoveResult, { ok: true }>).state;
    moves.push(move);
    states.push(state);
  }
  return { moves, states, final: state, won: isWon(state) };
}

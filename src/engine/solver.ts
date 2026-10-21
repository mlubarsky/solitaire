import { canAutoComplete } from './autoComplete';
import { suitColor } from './deck';
import { applyMove } from './moves';
import { canPlaceOnFoundation, canStackOnTableau } from './rules';
import { isWon } from './status';
import {
  FOUNDATION_INDICES,
  SUITS,
  TABLEAU_INDICES,
  type Card,
  type GameState,
  type Move,
  type MoveResult,
  type Pile,
  type PileId,
  type Suit,
} from './types';

/** Default search budget (positions examined) for god mode: a few seconds at most. */
export const DEFAULT_SOLVER_NODES = 1_500_000;
/** Of that budget, at most this much is spent shortening a win once one is found. */
export const DEFAULT_IMPROVE_NODES = 300_000;

export type SolveStatus = 'solved' | 'unsolvable' | 'gave-up';

export interface SolveResult {
  readonly status: SolveStatus;
  /**
   * For `solved`: the shortest winning line found, ending where auto-complete can take over.
   * Otherwise: the line that gets the most cards onto the foundations.
   */
  readonly moves: readonly Move[];
  /** True when the whole search space was explored (so `moves` is the best line there is). */
  readonly exhaustive: boolean;
  /** Positions examined. */
  readonly nodes: number;
}

export interface SolveOptions {
  /** Stop after examining this many positions in total. */
  readonly maxNodes?: number;
  /** Spend at most this many positions looking for a shorter win after the first one. */
  readonly improveNodes?: number;
}

const WASTE: PileId = { kind: 'waste' };
const FOUNDATION_PILES = FOUNDATION_INDICES.map(
  (index) => ({ kind: 'foundation', index }) as const,
);
const TABLEAU_PILES = TABLEAU_INDICES.map((index) => ({ kind: 'tableau', index }) as const);

function transfer(from: PileId, to: PileId, count: number): Move {
  return { type: 'transfer', from, to, count };
}

function foundationCount(state: GameState): number {
  return state.foundations.reduce((sum, pile) => sum + pile.length, 0);
}

/** One character per card, so position keys stay small. */
function cardChar(card: Card): string {
  return String.fromCharCode(48 + SUITS.indexOf(card.suit) * 13 + card.rank);
}

/**
 * A key that is identical for positions that play the same: tableau columns are compared as a
 * set (their order doesn't matter), and so are the foundations. Face-down cards never move, so a
 * column's face-down part is identified by its bottom card and how many cards are face down.
 */
export function positionKey(state: GameState): string {
  const columns = state.tableau.map((column) => {
    const down = column.findIndex((card) => card.faceUp);
    const split = down === -1 ? column.length : down;
    const hidden = split > 0 ? cardChar(column[0] as Card) + split : '';
    return hidden + ':' + column.slice(split).map(cardChar).join('');
  });
  const tops = state.foundations.map((pile) => pile.length).join('');
  const suits = state.foundations.map((pile) => (pile[0] ? cardChar(pile[0]) : '-')).join('');
  return [
    columns.sort().join('|'),
    [...tops]
      .map((n, i) => suits[i] + n)
      .sort()
      .join(''),
    state.stock.map(cardChar).join(''),
    state.waste.map(cardChar).join(''),
  ].join('#');
}

function foundationRank(state: GameState, suit: Suit): number {
  return state.foundations.find((pile) => pile[0]?.suit === suit)?.length ?? 0;
}

/** The foundation `card` can go to, if any. */
function foundationFor(state: GameState, card: Card): PileId | null {
  return (
    FOUNDATION_PILES.find((f) => canPlaceOnFoundation(card, state.foundations[f.index], f.index)) ??
    null
  );
}

/**
 * Playing `card` to its foundation can never hurt when no lower card of the opposite color could
 * still need it as a tableau target: Aces and 2s always, otherwise once both opposite-color
 * foundations have reached `rank - 1`.
 */
function isSafeToFoundation(state: GameState, card: Card): boolean {
  if (card.rank <= 2) return true;
  const opposite = SUITS.filter((suit) => suitColor(suit) !== suitColor(card.suit));
  return opposite.every((suit) => foundationRank(state, suit) >= card.rank - 1);
}

/**
 * Candidate moves, best first. Moves that can't help are left out: a King hopping between
 * empty columns, partial stack moves that don't free a card for a foundation, moving cards off
 * the foundations, and trying more than one empty column for the same stack. A safe foundation
 * move is forced (it is the only candidate).
 */
export function candidateMoves(state: GameState): Move[] {
  const toFoundation: Move[] = [];
  const sources: { from: PileId; card: Card }[] = [];
  const wasteTop = state.waste[state.waste.length - 1];
  if (wasteTop) sources.push({ from: WASTE, card: wasteTop });
  for (const t of TABLEAU_PILES) {
    const column = state.tableau[t.index];
    const top = column[column.length - 1];
    if (top?.faceUp) sources.push({ from: t, card: top });
  }
  for (const { from, card } of sources) {
    const f = foundationFor(state, card);
    if (f === null) continue;
    const move = transfer(from, f, 1);
    if (isSafeToFoundation(state, card)) return [move];
    toFoundation.push(move);
  }

  const reveals: Move[] = [];
  const empties: Move[] = [];
  const partials: Move[] = [];
  for (const source of TABLEAU_PILES) {
    const column = state.tableau[source.index];
    const firstUp = column.findIndex((card) => card.faceUp);
    if (firstUp === -1) continue;
    for (let i = firstUp; i < column.length; i++) {
      const card = column[i] as Card;
      const whole = i === firstUp;
      if (!whole && foundationFor(state, column[i - 1] as Card) === null) continue;
      if (whole && i === 0 && card.rank === 13) {
        // A King already at the bottom of its column: moving it can't reveal or empty anything.
        continue;
      }
      const bucket = !whole ? partials : i > 0 ? reveals : empties;
      let triedEmpty = false;
      for (const target of TABLEAU_PILES) {
        if (target.index === source.index) continue;
        const pile: Pile = state.tableau[target.index];
        const top = pile[pile.length - 1];
        if (!canStackOnTableau(card, top)) continue;
        if (top === undefined) {
          if (triedEmpty) continue;
          triedEmpty = true;
        }
        bucket.push(transfer(source, target, column.length - i));
      }
    }
  }

  const fromWaste: Move[] = [];
  if (wasteTop) {
    let triedEmpty = false;
    for (const target of TABLEAU_PILES) {
      const pile = state.tableau[target.index];
      const top = pile[pile.length - 1];
      if (!canStackOnTableau(wasteTop, top)) continue;
      if (top === undefined) {
        if (triedEmpty) continue;
        triedEmpty = true;
      }
      fromWaste.push(transfer(WASTE, target, 1));
    }
  }

  const stock: Move[] = [];
  if (state.stock.length > 0) stock.push({ type: 'draw' });
  else if (state.waste.length > 0) stock.push({ type: 'recycle' });

  return [...toFoundation, ...reveals, ...fromWaste, ...empties, ...partials, ...stock];
}

function play(state: GameState, move: Move): GameState {
  // Every candidate is legal by construction.
  return (applyMove(state, move) as Extract<MoveResult, { ok: true }>).state;
}

/**
 * Searches for the shortest winning line from `start`, using full knowledge of the face-down
 * cards and the stock order (god mode). A line counts as won once auto-complete can take over;
 * its cost includes the auto-complete moves (one per card left).
 *
 * Phase 1 is a plain depth-first search that never revisits a position, to find any win fast.
 * Phase 2 spends the rest of the node budget on branch-and-bound for a shorter line: a position
 * is re-expanded only when reached in fewer moves, and branches are cut once moves so far plus
 * cards left (each needs at least one more move) can't beat the best line.
 */
export function solve(start: GameState, options: SolveOptions = {}): SolveResult {
  const maxNodes = options.maxNodes ?? DEFAULT_SOLVER_NODES;
  const improveNodes = options.improveNodes ?? DEFAULT_IMPROVE_NODES;
  const path: Move[] = [];
  let best: Move[] | null = null;
  let bestCost = Infinity;
  let partial: Move[] = [];
  let partialCards = foundationCount(start);
  let nodes = 0;
  let aborted = false;

  const search = (shortest: boolean, limit: number): void => {
    const seen = new Map<string, number>();
    const visit = (state: GameState, depth: number): void => {
      if (nodes >= limit) {
        aborted = true;
        return;
      }
      nodes++;
      const onFoundations = foundationCount(state);
      const left = 52 - onFoundations;
      if (depth + left >= bestCost) return;
      if (isWon(state) || canAutoComplete(state)) {
        bestCost = depth + left;
        best = path.slice();
        return;
      }
      if (onFoundations > partialCards) {
        partialCards = onFoundations;
        partial = path.slice();
      }
      const key = positionKey(state);
      const previous = seen.get(key);
      if (previous !== undefined && (!shortest || previous <= depth)) return;
      seen.set(key, depth);
      for (const move of candidateMoves(state)) {
        path.push(move);
        visit(play(state, move), depth + 1);
        path.pop();
        // Phase 1 stops at the first win; both phases stop when the budget runs out.
        if (aborted || (!shortest && best !== null)) return;
      }
    };
    visit(start, 0);
  };

  search(false, maxNodes);
  // Without a win, phase 1 already explored every reachable position (or ran out of budget).
  if (best !== null && !aborted) search(true, Math.min(maxNodes, nodes + improveNodes));

  const solved = best !== null;
  return {
    status: solved ? 'solved' : aborted ? 'gave-up' : 'unsolvable',
    moves: best ?? partial,
    exhaustive: !aborted,
    nodes,
  };
}

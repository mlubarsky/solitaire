import type { Move, PileId } from './types';

/**
 * Scoring table (SPEC §5). Every point value lives here, so changing the scoring rules means
 * editing only this table.
 */
export const POINTS = {
  wasteToTableau: 5,
  wasteToFoundation: 10,
  tableauToFoundation: 10,
  /** A tableau card turned face-up by the auto-flip. */
  flip: 5,
  foundationToTableau: -15,
  tableauToTableau: 0,
  draw: 0,
  recycle: -100,
} as const;

export type ScoringEvent = keyof typeof POINTS;

type Kind = PileId['kind'];

/** Which scoring event each kind of transfer counts as (unlisted transfers score 0). */
export const TRANSFER_EVENTS: Readonly<Partial<Record<`${Kind}->${Kind}`, ScoringEvent>>> = {
  'waste->tableau': 'wasteToTableau',
  'waste->foundation': 'wasteToFoundation',
  'tableau->foundation': 'tableauToFoundation',
  'foundation->tableau': 'foundationToTableau',
  'tableau->tableau': 'tableauToTableau',
};

/** The scoring event for a move, or null if that kind of move is not in the table. */
export function scoringEvent(move: Move): ScoringEvent | null {
  if (move.type !== 'transfer') return move.type;
  return TRANSFER_EVENTS[`${move.from.kind}->${move.to.kind}`] ?? null;
}

/** Score delta for a successfully applied move (before clamping). */
export function scoreForMove(move: Move, flipped: boolean): number {
  const event = scoringEvent(move);
  const base = event === null ? 0 : POINTS[event];
  return flipped ? base + POINTS.flip : base;
}

/** Applies a delta and clamps the score at 0. */
export function applyScore(score: number, delta: number): number {
  return Math.max(0, score + delta);
}

import { assertValidState, createDeck, parseCardId, type Card, type GameState } from '../engine';

/**
 * Card notation for fixtures: a card id such as "H7", "SA", "D10", "CK".
 * In tableau columns, prefix with "#" for a face-down card ("#S9").
 */
export type CardSpec = string;

export interface StateSpec {
  tableau?: CardSpec[][];
  waste?: CardSpec[];
  foundations?: CardSpec[][];
  /** If given, the stock is exactly these cards (bottom first) and every card must be placed. */
  stock?: CardSpec[];
  score?: number;
  moves?: number;
  seed?: number;
  /** Skip assertValidState (for invariant tests). */
  validate?: boolean;
}

export function card(spec: CardSpec, faceUp = true): Card {
  const down = spec.startsWith('#');
  const id = down ? spec.slice(1) : spec;
  const parsed = parseCardId(id);
  if (!parsed) throw new Error(`Bad card spec "${spec}"`);
  return { id, suit: parsed.suit, rank: parsed.rank, faceUp: down ? false : faceUp };
}

/** Foundation run helper: upTo('H', 3) → ['HA', 'H2', 'H3']. */
export function upTo(suitLetter: 'S' | 'H' | 'D' | 'C', rank: number): CardSpec[] {
  const labels = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return labels.slice(0, rank).map((r) => `${suitLetter}${r}`);
}

/**
 * Builds a valid 52-card GameState from a partial description. Unmentioned cards are put in the
 * stock (face-down) unless `stock` is given explicitly.
 */
export function makeState(spec: StateSpec = {}): GameState {
  const used = new Set<string>();
  const take = (s: CardSpec, faceUp: boolean): Card => {
    const c = card(s, faceUp);
    if (used.has(c.id)) throw new Error(`Card ${c.id} used twice in fixture`);
    used.add(c.id);
    return c;
  };
  const columns = Array.from({ length: 7 }, (_, i) =>
    (spec.tableau?.[i] ?? []).map((s) => take(s, true)),
  );
  const foundations = Array.from({ length: 4 }, (_, i) =>
    (spec.foundations?.[i] ?? []).map((s) => take(s, true)),
  );
  const waste = (spec.waste ?? []).map((s) => take(s, true));
  let stock: Card[];
  if (spec.stock) {
    stock = spec.stock.map((s) => take(s, false));
  } else {
    stock = createDeck().filter((c) => !used.has(c.id));
  }
  const state: GameState = {
    seed: spec.seed ?? 0,
    stock,
    waste,
    foundations: foundations as unknown as GameState['foundations'],
    tableau: columns as unknown as GameState['tableau'],
    score: spec.score ?? 0,
    moves: spec.moves ?? 0,
  };
  if (spec.validate !== false) assertValidState(state);
  return state;
}

/** Recursively freezes an object so any mutation throws in strict mode. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/** All tableau→foundation-ready state: everything face-up, stock and waste empty. */
export function autoCompletableState(): GameState {
  return makeState({
    foundations: [upTo('S', 10), upTo('H', 10), upTo('D', 10), upTo('C', 10)],
    tableau: [
      ['SK', 'HQ', 'SJ'],
      ['HK', 'SQ', 'HJ'],
      ['DK', 'CQ', 'DJ'],
      ['CK', 'DQ', 'CJ'],
    ],
    stock: [],
  });
}

/** One move from winning: KS in the waste, everything else on the foundations. */
export function nearWonState(): GameState {
  return makeState({
    foundations: [upTo('S', 12), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
    waste: ['SK'],
    stock: [],
    score: 500,
    moves: 120,
  });
}

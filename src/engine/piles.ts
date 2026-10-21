import {
  FOUNDATION_INDICES,
  TABLEAU_INDICES,
  type FoundationIndex,
  type GameState,
  type Pile,
  type PileId,
  type TableauIndex,
} from './types';

export const STOCK: PileId = { kind: 'stock' };
export const WASTE: PileId = { kind: 'waste' };

export function foundation(index: number): PileId {
  return { kind: 'foundation', index: index as FoundationIndex };
}

export function tableau(index: number): PileId {
  return { kind: 'tableau', index: index as TableauIndex };
}

export const ALL_FOUNDATIONS: readonly PileId[] = FOUNDATION_INDICES.map(foundation);
export const ALL_TABLEAU: readonly PileId[] = TABLEAU_INDICES.map(tableau);

/** Compact string form of a pile id: "stock", "waste", "f0".."f3", "t0".."t6". */
export function pileKey(id: PileId): string {
  switch (id.kind) {
    case 'stock':
    case 'waste':
      return id.kind;
    case 'foundation':
      return `f${id.index}`;
    case 'tableau':
      return `t${id.index}`;
  }
}

/** Inverse of `pileKey`; returns null for unknown keys. */
export function parsePileKey(key: string): PileId | null {
  if (key === 'stock') return STOCK;
  if (key === 'waste') return WASTE;
  const match = /^([ft])(\d)$/.exec(key);
  if (!match) return null;
  const index = Number(match[2]);
  if (match[1] === 'f') return index < 4 ? foundation(index) : null;
  return index < 7 ? tableau(index) : null;
}

export function pileEquals(a: PileId, b: PileId): boolean {
  return pileKey(a) === pileKey(b);
}

/** Returns the cards of a pile, or undefined if the id does not name a pile in this state. */
export function getPile(state: GameState, id: PileId): Pile | undefined {
  switch (id.kind) {
    case 'stock':
      return state.stock;
    case 'waste':
      return state.waste;
    case 'foundation':
      return state.foundations[id.index];
    case 'tableau':
      return state.tableau[id.index];
  }
}

/** Returns a new state with the given pile replaced. The id must be valid. */
export function setPile(state: GameState, id: PileId, cards: Pile): GameState {
  switch (id.kind) {
    case 'stock':
      return { ...state, stock: cards };
    case 'waste':
      return { ...state, waste: cards };
    case 'foundation': {
      const foundations = state.foundations.slice() as Pile[];
      foundations[id.index] = cards;
      return { ...state, foundations: foundations as unknown as GameState['foundations'] };
    }
    case 'tableau': {
      const columns = state.tableau.slice() as Pile[];
      columns[id.index] = cards;
      return { ...state, tableau: columns as unknown as GameState['tableau'] };
    }
  }
}

export function topCard(pile: Pile): Pile[number] | undefined {
  return pile[pile.length - 1];
}

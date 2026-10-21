export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type Color = 'red' | 'black';

export interface Card {
  /** Stable identifier, e.g. "H7", "SA", "D10", "CK". */
  readonly id: string;
  readonly suit: Suit;
  readonly rank: Rank;
  readonly faceUp: boolean;
}

export type FoundationIndex = 0 | 1 | 2 | 3;
export type TableauIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type PileId =
  | { readonly kind: 'stock' }
  | { readonly kind: 'waste' }
  | { readonly kind: 'foundation'; readonly index: FoundationIndex }
  | { readonly kind: 'tableau'; readonly index: TableauIndex };

export type Pile = readonly Card[];

export interface GameState {
  readonly seed: number;
  /** Last element is the top of the stock. */
  readonly stock: Pile;
  /** Last element is the top of the waste. */
  readonly waste: Pile;
  readonly foundations: readonly [Pile, Pile, Pile, Pile];
  readonly tableau: readonly [Pile, Pile, Pile, Pile, Pile, Pile, Pile];
  readonly score: number;
  readonly moves: number;
}

export type Move =
  | { readonly type: 'draw' }
  | { readonly type: 'recycle' }
  | {
      readonly type: 'transfer';
      readonly from: PileId;
      readonly to: PileId;
      readonly count: number;
    };

export type MoveResult =
  | { readonly ok: true; readonly state: GameState; readonly flipped: boolean }
  | { readonly ok: false; readonly reason: string };

export const SUITS: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const FOUNDATION_INDICES: readonly FoundationIndex[] = [0, 1, 2, 3];
/** Each foundation holds one suit; top to bottom: ♠ ♥ ♦ ♣. */
export const FOUNDATION_SUITS: readonly Suit[] = SUITS;
export const TABLEAU_INDICES: readonly TableauIndex[] = [0, 1, 2, 3, 4, 5, 6];

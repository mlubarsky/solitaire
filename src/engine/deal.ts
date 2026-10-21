import { createDeck, withFace } from './deck';
import { mulberry32, shuffle } from './rng';
import type { Card, GameState } from './types';

/** Deals a new Klondike game. The same seed always produces the same deal. */
export function newGame(seed: number): GameState {
  const deck = shuffle(createDeck(), mulberry32(seed));
  let next = 0;
  const take = (): Card => deck[next++] as Card;
  const columns: Card[][] = [];
  for (let col = 0; col < 7; col++) {
    const column: Card[] = [];
    for (let row = 0; row <= col; row++) {
      column.push(withFace(take(), row === col));
    }
    columns.push(column);
  }
  const stock = deck.slice(next).map((c) => withFace(c, false));
  return {
    seed,
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau: columns as unknown as GameState['tableau'],
    score: 0,
    moves: 0,
  };
}

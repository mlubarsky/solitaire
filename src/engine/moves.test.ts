import { describe, expect, it } from 'vitest';
import { deepFreeze, makeState, upTo } from '../test/makeState';
import { newGame } from './deal';
import { assertValidState } from './invariants';
import { applyMove, getLegalMoves, validateMove } from './moves';
import { STOCK, WASTE, foundation, tableau } from './piles';
import type { GameState, Move, MoveResult, PileId } from './types';

const transfer = (from: PileId, to: PileId, count = 1): Move => ({
  type: 'transfer',
  from,
  to,
  count,
});

function ok(result: MoveResult): Extract<MoveResult, { ok: true }> {
  if (!result.ok) throw new Error(`Expected move to succeed: ${result.reason}`);
  assertValidState(result.state);
  return result;
}

function rejected(state: GameState, move: Move): string {
  const frozen = deepFreeze(state);
  const result = applyMove(frozen, move);
  if (result.ok) throw new Error('Expected move to be rejected');
  expect(result.reason).toEqual(expect.any(String));
  return result.reason;
}

describe('draw', () => {
  it('moves exactly one card from stock to waste, face-up', () => {
    const g = deepFreeze(newGame(5));
    const top = g.stock[g.stock.length - 1]!;
    const r = ok(applyMove(g, { type: 'draw' }));
    expect(r.state.stock).toHaveLength(23);
    expect(r.state.waste).toEqual([{ ...top, faceUp: true }]);
    expect(r.state.moves).toBe(1);
    expect(r.state.score).toBe(0);
    expect(r.flipped).toBe(false);
    expect(r.state.tableau).toBe(g.tableau);
  });

  it('is rejected with an empty stock', () => {
    const g = makeState({
      foundations: [upTo('S', 10), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
      waste: ['SJ', 'SQ', 'SK'],
      stock: [],
    });
    expect(rejected(g, { type: 'draw' })).toMatch(/stock is empty/i);
  });
});

describe('recycle', () => {
  function drawAll(state: GameState): GameState {
    let s = state;
    while (s.stock.length > 0) s = ok(applyMove(s, { type: 'draw' })).state;
    return s;
  }

  it('turns the waste back into the stock so the draw order repeats', () => {
    const start = newGame(11);
    const drawn = drawAll(start);
    const firstPass = drawn.waste.map((c) => c.id);
    const r = ok(applyMove(deepFreeze(drawn), { type: 'recycle' }));
    expect(r.state.waste).toEqual([]);
    expect(r.state.stock).toHaveLength(24);
    expect(r.state.stock.every((c) => !c.faceUp)).toBe(true);
    expect(r.state.stock.map((c) => c.id)).toEqual(start.stock.map((c) => c.id));
    expect(r.state.moves).toBe(drawn.moves + 1);
    const again = drawAll(r.state);
    expect(again.waste.map((c) => c.id)).toEqual(firstPass);
  });

  it('costs 100 points, clamped at 0', () => {
    const drawn = drawAll(newGame(4));
    expect(ok(applyMove({ ...drawn, score: 250 }, { type: 'recycle' })).state.score).toBe(150);
    expect(ok(applyMove({ ...drawn, score: 60 }, { type: 'recycle' })).state.score).toBe(0);
    expect(ok(applyMove({ ...drawn, score: 0 }, { type: 'recycle' })).state.score).toBe(0);
  });

  it('is rejected when the waste is empty', () => {
    const g = makeState({
      foundations: [upTo('S', 13), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
      stock: [],
    });
    expect(rejected(g, { type: 'recycle' })).toMatch(/waste is empty/i);
  });

  it('is rejected when the stock is not empty', () => {
    const g = ok(applyMove(newGame(3), { type: 'draw' })).state;
    expect(rejected(g, { type: 'recycle' })).toMatch(/stock is not empty/i);
  });

  it('allows unlimited recycles (5 in a row)', () => {
    let s = drawAll(newGame(8));
    for (let i = 0; i < 5; i++) {
      s = ok(applyMove(s, { type: 'recycle' })).state;
      s = drawAll(s);
    }
    expect(s.moves).toBe(24 * 6 + 5);
    expect(s.score).toBe(0);
  });
});

describe('transfers and scoring', () => {
  it('waste → tableau scores +5', () => {
    const g = makeState({ waste: ['H6'], tableau: [['S7']] });
    const r = ok(applyMove(deepFreeze(g), transfer(WASTE, tableau(0))));
    expect(r.state.tableau[0].map((c) => c.id)).toEqual(['S7', 'H6']);
    expect(r.state.waste).toEqual([]);
    expect(r.state.score).toBe(5);
    expect(r.state.moves).toBe(1);
  });

  it('waste → foundation scores +10', () => {
    const g = makeState({ waste: ['HA'] });
    const r = ok(applyMove(deepFreeze(g), transfer(WASTE, foundation(2))));
    expect(r.state.foundations[2].map((c) => c.id)).toEqual(['HA']);
    expect(r.state.score).toBe(10);
  });

  it('tableau → foundation scores +10', () => {
    const g = makeState({ tableau: [['S2']], foundations: [['SA']], score: 3 });
    const r = ok(applyMove(deepFreeze(g), transfer(tableau(0), foundation(0))));
    expect(r.state.foundations[0].map((c) => c.id)).toEqual(['SA', 'S2']);
    expect(r.state.tableau[0]).toEqual([]);
    expect(r.state.score).toBe(13);
    expect(r.flipped).toBe(false);
  });

  it('foundation → tableau scores −15, clamped at 0', () => {
    const g = makeState({ tableau: [['S4']], foundations: [upTo('H', 3)], score: 40 });
    const r = ok(applyMove(deepFreeze(g), transfer(foundation(0), tableau(0))));
    expect(r.state.tableau[0].map((c) => c.id)).toEqual(['S4', 'H3']);
    expect(r.state.foundations[0].map((c) => c.id)).toEqual(['HA', 'H2']);
    expect(r.state.score).toBe(25);
    const poor = ok(applyMove({ ...g, score: 10 }, transfer(foundation(0), tableau(0))));
    expect(poor.state.score).toBe(0);
  });

  it('tableau → tableau scores 0', () => {
    const g = makeState({ tableau: [['S7'], ['H6']], score: 7 });
    const r = ok(applyMove(deepFreeze(g), transfer(tableau(1), tableau(0))));
    expect(r.state.score).toBe(7);
    expect(r.state.tableau[0].map((c) => c.id)).toEqual(['S7', 'H6']);
  });

  it('moves a multi-card stack intact and in order', () => {
    const g = makeState({
      tableau: [
        ['#D2', 'S9', 'H8', 'C7', 'D6'],
        ['CK', 'HQ', 'SJ', 'D10'],
      ],
    });
    const r = ok(applyMove(deepFreeze(g), transfer(tableau(0), tableau(1), 4)));
    expect(r.state.tableau[1].map((c) => c.id)).toEqual([
      'CK',
      'HQ',
      'SJ',
      'D10',
      'S9',
      'H8',
      'C7',
      'D6',
    ]);
    expect(r.state.tableau[0].map((c) => c.id)).toEqual(['D2']);
    expect(r.state.tableau[0][0]!.faceUp).toBe(true);
    expect(r.flipped).toBe(true);
    expect(r.state.score).toBe(5);
    expect(r.state.moves).toBe(1);
  });

  it('moves a partial stack from the middle of a column', () => {
    const g = makeState({ tableau: [['S9', 'H8', 'C7'], ['D8']] });
    const r = ok(applyMove(g, transfer(tableau(0), tableau(1), 1)));
    expect(r.state.tableau[0].map((c) => c.id)).toEqual(['S9', 'H8']);
    expect(r.state.tableau[1].map((c) => c.id)).toEqual(['D8', 'C7']);
  });

  it('moves a King stack to an empty column', () => {
    const g = makeState({ tableau: [['#C3', 'HK', 'SQ'], []] });
    const r = ok(applyMove(g, transfer(tableau(0), tableau(1), 2)));
    expect(r.state.tableau[1].map((c) => c.id)).toEqual(['HK', 'SQ']);
  });
});

describe('auto-flip', () => {
  it('flips an exposed face-down card for +5 within the same move', () => {
    const g = makeState({ tableau: [['#D9', 'S2'], ['H3']], foundations: [['SA']] });
    const r = ok(applyMove(deepFreeze(g), transfer(tableau(0), foundation(0))));
    expect(r.flipped).toBe(true);
    expect(r.state.tableau[0]).toEqual([{ id: 'D9', suit: 'diamonds', rank: 9, faceUp: true }]);
    expect(r.state.score).toBe(15);
    expect(r.state.moves).toBe(1);
  });

  it('gives no flip bonus when the column becomes empty', () => {
    const g = makeState({ tableau: [['S6'], ['H7']] });
    const r = ok(applyMove(g, transfer(tableau(0), tableau(1))));
    expect(r.flipped).toBe(false);
    expect(r.state.tableau[0]).toEqual([]);
    expect(r.state.score).toBe(0);
  });

  it('gives no flip bonus when the exposed card is already face-up', () => {
    const g = makeState({ tableau: [['S8', 'H7'], ['C8']] });
    const r = ok(applyMove(g, transfer(tableau(0), tableau(1))));
    expect(r.flipped).toBe(false);
    expect(r.state.score).toBe(0);
  });
});

describe('rejected moves', () => {
  const base = makeState({
    tableau: [['#S9', 'H8', 'C7'], ['D8'], [], ['#C2', 'HQ']],
    waste: ['D3'],
    foundations: [['HA']],
  });

  it('rejects moving a face-down card', () => {
    expect(rejected(base, transfer(tableau(0), tableau(1), 3))).toMatch(/face-down/i);
  });

  it('rejects more than one card to a foundation', () => {
    const g = makeState({ tableau: [['H3', 'S2']], foundations: [['SA']] });
    expect(rejected(g, transfer(tableau(0), foundation(0), 2))).toMatch(/one card/i);
  });

  it('rejects moving onto the stock or waste', () => {
    expect(rejected(base, transfer(tableau(1), STOCK))).toMatch(/stock or waste/i);
    expect(rejected(base, transfer(tableau(1), WASTE))).toMatch(/stock or waste/i);
  });

  it('rejects moving from the stock', () => {
    expect(rejected(base, transfer(STOCK, tableau(2)))).toMatch(/stock/i);
  });

  it('rejects moving from an empty pile', () => {
    expect(rejected(base, transfer(tableau(2), tableau(1)))).toMatch(/empty/i);
    expect(rejected(base, transfer(foundation(3), tableau(1)))).toMatch(/empty/i);
  });

  it('rejects the same source and target', () => {
    expect(rejected(base, transfer(tableau(0), tableau(0)))).toMatch(/same/i);
  });

  it('rejects counts larger than the pile, zero, or fractional', () => {
    expect(rejected(base, transfer(tableau(1), tableau(0), 2))).toMatch(/not enough/i);
    expect(rejected(base, transfer(tableau(1), tableau(0), 0))).toMatch(/count/i);
    expect(rejected(base, transfer(tableau(1), tableau(0), 1.5))).toMatch(/count/i);
  });

  it('rejects more than one card from the waste or a foundation', () => {
    const g = makeState({ waste: ['D3', 'C5'], foundations: [upTo('H', 2)], tableau: [['S6']] });
    expect(rejected(g, transfer(WASTE, tableau(0), 2))).toMatch(/top card/i);
    expect(rejected(g, transfer(foundation(0), tableau(0), 2))).toMatch(/top card/i);
  });

  it('rejects foundation → foundation', () => {
    const g = makeState({ foundations: [['HA']] });
    expect(rejected(g, transfer(foundation(0), foundation(1)))).toMatch(/between foundations/i);
  });

  it('rejects a card that does not fit', () => {
    expect(rejected(base, transfer(WASTE, tableau(1)))).toMatch(/does not fit/i);
    expect(rejected(base, transfer(WASTE, foundation(0)))).toMatch(/does not fit/i);
    expect(rejected(base, transfer(tableau(1), tableau(2)))).toMatch(/does not fit/i);
  });

  it('rejects a stack that is not a valid run', () => {
    const g = makeState({ tableau: [['H8', 'D7'], ['S9']], validate: false });
    expect(rejected(g, transfer(tableau(0), tableau(1), 2))).toMatch(/movable stack/i);
  });

  it('rejects unknown piles', () => {
    const bad = { kind: 'tableau', index: 9 } as unknown as PileId;
    const weird = { kind: 'nowhere' } as unknown as PileId;
    const neg = { kind: 'foundation', index: -1 } as unknown as PileId;
    expect(rejected(base, transfer(bad, tableau(1)))).toMatch(/unknown/i);
    expect(rejected(base, transfer(tableau(1), weird))).toMatch(/unknown/i);
    expect(rejected(base, transfer(neg, tableau(1)))).toMatch(/unknown/i);
    expect(validateMove(base, transfer(tableau(0), tableau(1)))).toBeNull();
  });
});

describe('getLegalMoves', () => {
  it('lists draw at the start plus every legal transfer, all of which apply', () => {
    const g = newGame(1);
    const moves = getLegalMoves(g);
    expect(moves[0]).toEqual({ type: 'draw' });
    expect(moves.some((m) => m.type === 'recycle')).toBe(false);
    for (const m of moves) ok(applyMove(g, m));
  });

  it('lists recycle (and not draw) when the stock is empty', () => {
    const g = makeState({
      foundations: [upTo('S', 10), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
      waste: ['SJ', 'SQ', 'SK'],
      stock: [],
    });
    const moves = getLegalMoves(g);
    expect(moves).toContainEqual({ type: 'recycle' });
    expect(moves).not.toContainEqual({ type: 'draw' });
  });

  it('includes stack moves from every face-up index and foundation moves', () => {
    const g = makeState({
      tableau: [['#S9', 'H8', 'C7'], ['D8'], ['C9'], ['HK'], [], ['C4']],
      foundations: [['HA'], upTo('D', 3)],
      waste: ['H2'],
    });
    const moves = getLegalMoves(g);
    expect(moves).toContainEqual(transfer(WASTE, foundation(0)));
    expect(moves).toContainEqual(transfer(tableau(0), tableau(1), 1));
    expect(moves).toContainEqual(transfer(tableau(0), tableau(2), 2));
    expect(moves).toContainEqual(transfer(tableau(3), tableau(4), 1));
    expect(moves).toContainEqual(transfer(foundation(1), tableau(5), 1));
    expect(moves).not.toContainEqual(transfer(tableau(0), tableau(1), 3));
    expect(moves).not.toContainEqual(transfer(tableau(0), tableau(1), 2));
    for (const m of moves) ok(applyMove(g, m));
  });
});

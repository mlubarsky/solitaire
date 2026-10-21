import { describe, expect, it } from 'vitest';
import { makeState, upTo } from '../test/makeState';
import { applyMove } from './moves';
import { STOCK, WASTE, foundation, tableau } from './piles';
import { POINTS, applyScore, scoreForMove, scoringEvent } from './scoring';
import type { GameState, Move, PileId } from './types';

const t = (from: PileId, to: PileId, count = 1): Move => ({ type: 'transfer', from, to, count });

describe('scoreForMove (SPEC §5 table)', () => {
  it.each<[string, Move, boolean, number]>([
    ['waste → tableau', t(WASTE, tableau(0)), false, 5],
    ['waste → foundation', t(WASTE, foundation(0)), false, 10],
    ['tableau → foundation', t(tableau(0), foundation(0)), false, 10],
    ['tableau → foundation with flip', t(tableau(0), foundation(0)), true, 15],
    [
      'tableau card turned face-up (tableau → tableau with flip)',
      t(tableau(0), tableau(1)),
      true,
      5,
    ],
    ['foundation → tableau', t(foundation(0), tableau(0)), false, -15],
    ['recycle waste to stock', { type: 'recycle' }, false, -100],
    ['tableau → tableau', t(tableau(0), tableau(1), 3), false, 0],
    ['stock → waste (draw)', { type: 'draw' }, false, 0],
    ['unusual transfer kinds score 0', t(STOCK, tableau(1)), false, 0],
  ])('%s', (_name, move, flipped, expected) => {
    expect(scoreForMove(move, flipped)).toBe(expected);
  });

  it('exposes the point values from the SPEC §5 table', () => {
    expect(POINTS).toEqual({
      wasteToTableau: 5,
      wasteToFoundation: 10,
      tableauToFoundation: 10,
      flip: 5,
      foundationToTableau: -15,
      tableauToTableau: 0,
      draw: 0,
      recycle: -100,
    });
  });

  it('maps every move kind to its scoring event', () => {
    expect(scoringEvent({ type: 'draw' })).toBe('draw');
    expect(scoringEvent({ type: 'recycle' })).toBe('recycle');
    expect(scoringEvent(t(WASTE, tableau(1)))).toBe('wasteToTableau');
    expect(scoringEvent(t(foundation(0), tableau(1)))).toBe('foundationToTableau');
    expect(scoringEvent(t(tableau(0), tableau(1)))).toBe('tableauToTableau');
    expect(scoringEvent(t(STOCK, tableau(1)))).toBeNull();
  });

  it('clamps at 0', () => {
    expect(applyScore(10, -15)).toBe(0);
    expect(applyScore(0, -100)).toBe(0);
    expect(applyScore(100, -100)).toBe(0);
    expect(applyScore(120, -100)).toBe(20);
    expect(applyScore(5, 10)).toBe(15);
  });

  describe('through applyMove, with clamping after each move', () => {
    const cases: [string, GameState, Move, number][] = [
      [
        'waste → tableau',
        makeState({ waste: ['H6'], tableau: [['S7']], score: 1 }),
        t(WASTE, tableau(0)),
        6,
      ],
      ['waste → foundation', makeState({ waste: ['SA'], score: 1 }), t(WASTE, foundation(0)), 11],
      [
        'tableau → foundation + flip',
        makeState({ tableau: [['#D5', 'SA']], score: 1 }),
        t(tableau(0), foundation(0)),
        16,
      ],
      [
        'foundation → tableau clamped',
        makeState({ foundations: [upTo('H', 6)], tableau: [['S7']], score: 4 }),
        t(foundation(1), tableau(0)),
        0,
      ],
      [
        'foundation → tableau',
        makeState({ foundations: [upTo('H', 6)], tableau: [['S7']], score: 20 }),
        t(foundation(1), tableau(0)),
        5,
      ],
      [
        'tableau → tableau',
        makeState({ tableau: [['S7'], ['H6']], score: 9 }),
        t(tableau(1), tableau(0)),
        9,
      ],
    ];
    it.each(cases)('%s', (_name, state, move, expected) => {
      const r = applyMove(state, move);
      expect(r.ok && r.state.score).toBe(expected);
    });
  });
});

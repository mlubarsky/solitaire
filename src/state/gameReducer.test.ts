import { describe, expect, it } from 'vitest';
import { newGame } from '../engine';
import { autoCompletableState, makeState, nearWonState, upTo } from '../test/makeState';
import { canUndoNow, fromGame, gameReducer, initialState, phaseFor } from './gameReducer';

describe('gameReducer', () => {
  it('derives the phase from the position', () => {
    expect(phaseFor(newGame(1))).toBe('playing');
    expect(phaseFor(autoCompletableState())).toBe('autocompleting');
    const won = makeState({
      foundations: [upTo('S', 13), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
      stock: [],
    });
    expect(phaseFor(won)).toBe('won');
  });

  it('applies a legal move and pushes history', () => {
    const s0 = initialState(4);
    const s1 = gameReducer(s0, { type: 'MOVE', move: { type: 'draw' } });
    expect(s1.game.moves).toBe(1);
    expect(s1.history).toEqual([s0.game]);
    expect(canUndoNow(s1)).toBe(true);
  });

  it('UNDO_ALL returns to the start of the game in one step', () => {
    const s0 = initialState(4);
    let s = s0;
    for (let i = 0; i < 3; i++) s = gameReducer(s, { type: 'DRAW' });
    expect(s.game.moves).toBe(3);
    const back = gameReducer(s, { type: 'UNDO_ALL' });
    expect(back.game).toEqual(s0.game);
    expect(back.history).toEqual([]);
    expect(back.dealId).toBe(s0.dealId);
    expect(canUndoNow(back)).toBe(false);
  });

  it('UNDO_ALL does nothing at the start, during auto-complete, or after a win', () => {
    const s0 = initialState(4);
    expect(gameReducer(s0, { type: 'UNDO_ALL' })).toBe(s0);
    const auto = { ...fromGame(autoCompletableState()), history: [newGame(1)] };
    expect(gameReducer(auto, { type: 'UNDO_ALL' })).toBe(auto);
  });

  it('returns the same state for illegal moves and no-op actions', () => {
    const s0 = initialState(4);
    expect(Object.keys(s0).sort()).toEqual(['dealId', 'game', 'history', 'phase']);
    expect(gameReducer(s0, { type: 'MOVE', move: { type: 'recycle' } })).toBe(s0);
    expect(gameReducer(s0, { type: 'UNDO' })).toBe(s0);
    expect(gameReducer(s0, { type: 'AUTO_STEP' })).toBe(s0); // not auto-completing
  });

  it('DRAW draws, recycles, or does nothing', () => {
    const drawn = gameReducer(initialState(2), { type: 'DRAW' });
    expect(drawn.game.waste).toHaveLength(1);
    const empty = fromGame(
      makeState({
        foundations: [upTo('S', 12), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
        tableau: [['SK']],
        stock: [],
      }),
    );
    expect(gameReducer(empty, { type: 'DRAW' })).toBe(empty);
    const recyclable = fromGame(nearWonState());
    expect(gameReducer(recyclable, { type: 'DRAW' }).game.stock).toHaveLength(1);
  });

  it('ignores player moves and undo outside the playing phase', () => {
    const auto = fromGame(autoCompletableState());
    expect(auto.phase).toBe('autocompleting');
    const move = {
      type: 'transfer',
      from: { kind: 'tableau', index: 0 },
      to: { kind: 'foundation', index: 0 },
      count: 1,
    } as const;
    expect(gameReducer(auto, { type: 'MOVE', move })).toBe(auto);
    expect(gameReducer({ ...auto, history: [auto.game] }, { type: 'UNDO' }).game).toBe(auto.game);
    expect(canUndoNow({ ...auto, history: [auto.game] })).toBe(false);
  });

  it('AUTO_STEP plays one card at a time and finishes in the won phase', () => {
    let s = fromGame(autoCompletableState());
    s = gameReducer(s, { type: 'AUTO_STEP' });
    expect(s.game.moves).toBe(1);
    expect(s.phase).toBe('autocompleting');
    for (let i = 0; i < 11; i++) s = gameReducer(s, { type: 'AUTO_STEP' });
    expect(s.phase).toBe('won');
  });

  it('AUTO_STEP recovers if the position cannot actually auto-complete', () => {
    const s = { ...initialState(1), phase: 'autocompleting' as const };
    expect(gameReducer(s, { type: 'AUTO_STEP' }).phase).toBe('playing');
  });

  it('NEW_GAME and LOAD_STATE reset everything and bump the deal id', () => {
    const played = gameReducer(initialState(1), { type: 'DRAW' });
    const fresh = gameReducer(played, { type: 'NEW_GAME', seed: 9 });
    expect(fresh.game).toEqual(newGame(9));
    expect(fresh.history).toEqual([]);
    expect(fresh.dealId).toBe(played.dealId + 1);
    const loaded = gameReducer(fresh, { type: 'LOAD_STATE', game: nearWonState() });
    expect(loaded.game).toEqual(nearWonState());
    expect(loaded.dealId).toBe(fresh.dealId + 1);
  });
});

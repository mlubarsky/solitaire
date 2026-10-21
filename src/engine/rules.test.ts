import { describe, expect, it } from 'vitest';
import { card } from '../test/makeState';
import { canPlaceOnFoundation, canStackOnTableau, isMovableStack } from './rules';

const c = (spec: string) => card(spec);

describe('canStackOnTableau', () => {
  it.each([
    ['red 6 on black 7', 'H6', 'S7', true],
    ['red 6 on black 7 (diamonds/clubs)', 'D6', 'C7', true],
    ['black 6 on red 7', 'S6', 'H7', true],
    ['black 6 on red 7 (clubs/diamonds)', 'C6', 'D7', true],
    ['red 6 on red 7', 'H6', 'D7', false],
    ['black 6 on black 7', 'S6', 'C7', false],
    ['6 on 8', 'H6', 'S8', false],
    ['8 on 7', 'H8', 'S7', false],
    ['same rank', 'H7', 'S7', false],
  ])('%s', (_name, moving, target, expected) => {
    expect(canStackOnTableau(c(moving), c(target))).toBe(expected);
  });

  it('allows a King on an empty column', () => {
    expect(canStackOnTableau(c('SK'), undefined)).toBe(true);
    expect(canStackOnTableau(c('HK'), undefined)).toBe(true);
  });

  it('rejects a Queen (or anything else) on an empty column', () => {
    expect(canStackOnTableau(c('SQ'), undefined)).toBe(false);
    expect(canStackOnTableau(c('HA'), undefined)).toBe(false);
  });

  it('rejects anything on a face-down top card', () => {
    expect(canStackOnTableau(c('H6'), c('#S7'))).toBe(false);
  });
});

describe('canPlaceOnFoundation', () => {
  it('Ace on empty', () => expect(canPlaceOnFoundation(c('HA'), [])).toBe(true));
  it('2 on empty is rejected', () => expect(canPlaceOnFoundation(c('H2'), [])).toBe(false));
  it('2♥ on A♥', () => expect(canPlaceOnFoundation(c('H2'), [c('HA')])).toBe(true));
  it('2♦ on A♥ is rejected', () => expect(canPlaceOnFoundation(c('D2'), [c('HA')])).toBe(false));
  it('3♥ on A♥ is rejected', () => expect(canPlaceOnFoundation(c('H3'), [c('HA')])).toBe(false));
  it('A on A is rejected', () => expect(canPlaceOnFoundation(c('SA'), [c('HA')])).toBe(false));

  const fullHearts = ['HA', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'HJ', 'HQ'].map(
    c,
  );
  it('K completes a foundation', () => {
    expect(canPlaceOnFoundation(c('HK'), fullHearts)).toBe(true);
  });
  it('nothing goes on a full foundation', () => {
    const full = [...fullHearts, c('HK')];
    for (const spec of ['HA', 'SA', 'HK', 'SK', 'H2']) {
      expect(canPlaceOnFoundation(c(spec), full)).toBe(false);
    }
  });
});

describe('isMovableStack', () => {
  const column = [c('#S9'), c('H8'), c('S7'), c('H6')];
  it('accepts any face-up card and the cards above it', () => {
    expect(isMovableStack(column, 1)).toBe(true);
    expect(isMovableStack(column, 2)).toBe(true);
    expect(isMovableStack(column, 3)).toBe(true);
  });
  it('rejects face-down cards and out-of-range indexes', () => {
    expect(isMovableStack(column, 0)).toBe(false);
    expect(isMovableStack(column, -1)).toBe(false);
    expect(isMovableStack(column, 4)).toBe(false);
    expect(isMovableStack(column, 1.5)).toBe(false);
  });
  it('rejects a broken run', () => {
    expect(isMovableStack([c('H8'), c('D7')], 0)).toBe(false);
    expect(isMovableStack([c('H8'), c('#S7')], 0)).toBe(false);
  });
});

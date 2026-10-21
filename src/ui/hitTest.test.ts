import { describe, expect, it } from 'vitest';
import { overlapArea, pickDropTarget } from './hitTest';

const r = (left: number, top: number, width = 10, height = 10) => ({ left, top, width, height });

describe('hitTest', () => {
  it('computes overlap area', () => {
    expect(overlapArea(r(0, 0), r(5, 5))).toBe(25);
    expect(overlapArea(r(0, 0), r(10, 0))).toBe(0);
    expect(overlapArea(r(0, 0), r(20, 20))).toBe(0);
    expect(overlapArea(r(0, 0), r(0, 0))).toBe(100);
  });

  it('picks the pile with the greatest overlap', () => {
    const targets = [
      { id: 'a', rect: r(0, 0) },
      { id: 'b', rect: r(8, 0) },
      { id: 'c', rect: r(100, 100) },
    ];
    expect(pickDropTarget(r(5, 0), targets)).toBe('b'); // a: 5*10, b: 7*10
    expect(pickDropTarget(r(1, 0), targets)).toBe('a');
    expect(pickDropTarget(r(97, 97), targets)).toBe('c');
  });

  it('returns null when nothing overlaps', () => {
    expect(pickDropTarget(r(50, 50), [{ id: 'a', rect: r(0, 0) }])).toBeNull();
    expect(pickDropTarget(r(50, 50), [])).toBeNull();
  });

  it('resolves ties deterministically to the first target', () => {
    const targets = [
      { id: 'left', rect: r(0, 0) },
      { id: 'right', rect: r(10, 0) },
    ];
    expect(pickDropTarget(r(5, 0), targets)).toBe('left');
    expect(pickDropTarget(r(5, 0), [...targets].reverse())).toBe('right');
  });
});

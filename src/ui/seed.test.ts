import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSeed, randomSeed } from './seed';

describe('parseSeed', () => {
  it('reads a numeric seed', () => {
    expect(parseSeed('?seed=42')).toBe(42);
    expect(parseSeed('?a=1&seed=7')).toBe(7);
    expect(parseSeed('?seed=4294967296')).toBe(0);
  });
  it('ignores missing or invalid seeds', () => {
    expect(parseSeed('')).toBeNull();
    expect(parseSeed('?seed=abc')).toBeNull();
    expect(parseSeed('?seed=-3')).toBeNull();
    expect(parseSeed('?seed=99999999999999999999')).toBeNull();
  });
});

describe('randomSeed', () => {
  afterEach(() => vi.restoreAllMocks());
  it('returns a 32-bit unsigned integer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(randomSeed()).toBe(0x80000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.999999999);
    expect(randomSeed()).toBeLessThanOrEqual(0xffffffff);
  });
});

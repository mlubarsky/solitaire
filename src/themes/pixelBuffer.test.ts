import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../engine';
import {
  BAYER4,
  circle,
  createBuffer,
  ditherFill,
  ditherGradient,
  ditherStops,
  fillRect,
  getPixel,
  hLine,
  hashBuffer,
  lumaVariance,
  polygon,
  ridge,
  ridgeLine,
  setPixel,
  solidBands,
  vLine,
  type PixelBuffer,
} from './pixelBuffer';

const A = 0x112233;
const B = 0xaabbcc;

function count(buf: PixelBuffer, color: number, x0 = 0, y0 = 0, x1 = buf.width, y1 = buf.height) {
  let n = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) if (getPixel(buf, x, y) === color) n++;
  return n;
}

describe('PixelBuffer', () => {
  it('creates an opaque buffer filled with one color', () => {
    const buf = createBuffer(4, 3, A);
    expect(buf.data).toHaveLength(48);
    expect(count(buf, A)).toBe(12);
    for (let i = 3; i < buf.data.length; i += 4) expect(buf.data[i]).toBe(255);
    expect(createBuffer(2, 2).data[0]).toBe(0);
  });

  it('sets and gets pixels, ignoring out-of-range coordinates', () => {
    const buf = createBuffer(4, 4, A);
    setPixel(buf, 1, 2, B);
    setPixel(buf, -1, 0, B);
    setPixel(buf, 4, 0, B);
    setPixel(buf, 0, 9, B);
    expect(getPixel(buf, 1, 2)).toBe(B);
    expect(count(buf, B)).toBe(1);
    expect(getPixel(buf, -1, 0)).toBe(-1);
    expect(getPixel(buf, 0, 4)).toBe(-1);
  });

  it('fillRect clips at the edges', () => {
    const buf = createBuffer(10, 10, A);
    fillRect(buf, -5, -5, 8, 8, B); // covers 0..2 × 0..2
    expect(count(buf, B)).toBe(9);
    fillRect(buf, 8, 8, 10, 10, B); // covers 8..9 × 8..9
    expect(count(buf, B)).toBe(13);
    fillRect(buf, 20, 20, 5, 5, B);
    expect(count(buf, B)).toBe(13);
  });

  it('draws lines', () => {
    const buf = createBuffer(10, 10, A);
    hLine(buf, 7, 2, 1, B);
    vLine(buf, 0, 9, 5, B);
    expect(count(buf, B)).toBe(6 + 5);
  });

  it('ditherGradient produces only its two colors, with the expected ratio per 4-row band', () => {
    const buf = createBuffer(16, 32, 0);
    ditherGradient(buf, 0, 0, 16, 32, A, B);
    expect(count(buf, A) + count(buf, B)).toBe(16 * 32);
    const bands = 8;
    for (let k = 0; k < bands; k++) {
      const expected = Math.round(((k + 0.5) / bands) * 16) / 16;
      expect(count(buf, B, 0, k * 4, 16, k * 4 + 4) / 64).toBe(expected);
    }
    // Monotonic: the bottom has more of the second color than the top.
    expect(count(buf, B, 0, 28, 16, 32)).toBeGreaterThan(count(buf, B, 0, 0, 16, 4));
  });

  it('ditherFill uses the Bayer matrix and clamps the ratio', () => {
    const buf = createBuffer(4, 4, 0);
    ditherFill(buf, 0, 0, 4, 4, A, B, 0.5);
    expect(count(buf, B)).toBe(8);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) expect(getPixel(buf, x, y) === B).toBe(BAYER4[y]![x]! < 8);
    ditherFill(buf, -2, -2, 10, 10, A, B, 2);
    expect(count(buf, B)).toBe(16);
    ditherFill(buf, 0, 0, 4, 4, A, B, -1);
    expect(count(buf, A)).toBe(16);
  });

  it('ditherStops blends through every stop', () => {
    const C = 0x445566;
    const buf = createBuffer(8, 24, 0);
    ditherStops(buf, 0, 0, 8, 24, [A, B, C]);
    expect(count(buf, A) + count(buf, B) + count(buf, C)).toBe(8 * 24);
    expect(count(buf, C, 0, 0, 8, 12)).toBe(0);
    expect(count(buf, A, 0, 12, 8, 24)).toBe(0);
  });

  it('solidBands stacks solid rows with no dithering', () => {
    const C = 0x445566;
    const buf = createBuffer(6, 10, 0);
    solidBands(buf, 0, 0, 6, 9, [A, B, C]);
    for (let y = 0; y < 9; y++) {
      const expected = y < 3 ? A : y < 6 ? B : C;
      expect(count(buf, expected, 0, y, 6, y + 1), `row ${y}`).toBe(6);
    }
    expect(count(buf, 0, 0, 9, 6, 10)).toBe(6);
  });

  it('ridge fills below the line (and only there)', () => {
    const buf = createBuffer(5, 10, A);
    ridge(buf, [2, 5, -3, 10, 8], B);
    for (const [x, top] of [
      [0, 2],
      [1, 5],
      [2, 0],
      [3, 10],
      [4, 8],
    ] as const) {
      for (let y = 0; y < 10; y++) expect(getPixel(buf, x, y)).toBe(y >= top ? B : A);
    }
    const bounded = createBuffer(2, 10, A);
    ridge(bounded, [2, 4], B, 6);
    expect(count(bounded, B)).toBe(4 + 2);
  });

  it('ridgeLine stays within its amplitude', () => {
    const line = ridgeLine(200, 50, 8, 2, mulberry32(3));
    expect(line).toHaveLength(200);
    for (const y of line) {
      expect(y).toBeGreaterThanOrEqual(42);
      expect(y).toBeLessThanOrEqual(58);
      expect(Number.isInteger(y)).toBe(true);
    }
  });

  it('fills circles and polygons with whole pixels', () => {
    const buf = createBuffer(20, 20, A);
    circle(buf, 10, 10, 3, B);
    expect(getPixel(buf, 10, 10)).toBe(B);
    expect(getPixel(buf, 13, 10)).toBe(B);
    expect(getPixel(buf, 14, 10)).toBe(A);
    const n = count(buf, B);
    expect(n).toBeGreaterThan(25);
    expect(n).toBeLessThan(45);

    const poly = createBuffer(10, 10, A);
    polygon(
      poly,
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
      B,
    );
    expect(count(poly, B)).toBe(100);
    polygon(
      poly,
      [
        [0, 0],
        [1, 1],
      ],
      A,
    );
    expect(count(poly, B)).toBe(100);
  });

  it('hashes and measures variance', () => {
    const a = createBuffer(4, 4, A);
    const b = createBuffer(4, 4, A);
    expect(hashBuffer(a)).toBe(hashBuffer(b));
    setPixel(b, 0, 0, B);
    expect(hashBuffer(a)).not.toBe(hashBuffer(b));
    expect(hashBuffer(a)).toMatch(/^[0-9a-f]{8}$/);
    expect(lumaVariance(a, 0, 0, 4, 4)).toBeCloseTo(0, 6);
    expect(lumaVariance(b, 0, 0, 4, 4)).toBeGreaterThan(0);
  });
});

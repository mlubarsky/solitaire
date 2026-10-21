/**
 * A tiny pure-TS RGBA pixel buffer with integer-only drawing helpers. No canvas API, so pixel
 * scenes are unit-testable in jsdom. Every pixel written is fully opaque; there is no blending.
 */
export interface PixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** A color as 0xRRGGBB. */
export type Color = number;

export function createBuffer(width: number, height: number, fill: Color = 0): PixelBuffer {
  const buf = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  fillRect(buf, 0, 0, width, height, fill);
  return buf;
}

export function setPixel(buf: PixelBuffer, x: number, y: number, color: Color): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= buf.width || yi >= buf.height) return;
  const i = (yi * buf.width + xi) * 4;
  buf.data[i] = (color >> 16) & 0xff;
  buf.data[i + 1] = (color >> 8) & 0xff;
  buf.data[i + 2] = color & 0xff;
  buf.data[i + 3] = 255;
}

/** The color at (x, y) as 0xRRGGBB, or -1 outside the buffer. */
export function getPixel(buf: PixelBuffer, x: number, y: number): Color {
  if (x < 0 || y < 0 || x >= buf.width || y >= buf.height) return -1;
  const i = (y * buf.width + x) * 4;
  return (
    ((buf.data[i] as number) << 16) |
    ((buf.data[i + 1] as number) << 8) |
    (buf.data[i + 2] as number)
  );
}

/** Fills a rectangle, clipped to the buffer. */
export function fillRect(
  buf: PixelBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Color,
): void {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(buf.width, Math.round(x + w));
  const y1 = Math.min(buf.height, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPixel(buf, xx, yy, color);
  }
}

export function hLine(buf: PixelBuffer, x0: number, x1: number, y: number, color: Color): void {
  fillRect(buf, Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, color);
}

export function vLine(buf: PixelBuffer, x: number, y0: number, y1: number, color: Color): void {
  fillRect(buf, x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, color);
}

/** 4×4 Bayer ordered-dither thresholds (0–15). */
export const BAYER4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** True if the pixel at (x, y) should take the second color for a mix ratio in [0, 1]. */
export function ditherAt(x: number, y: number, ratio: number): boolean {
  const level = Math.round(Math.min(1, Math.max(0, ratio)) * 16);
  return (BAYER4[y & 3] as number[])[x & 3]! < level;
}

/** Fills a rect with an ordered-dither mix of two colors (`ratio` = share of `b`). */
export function ditherFill(
  buf: PixelBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  a: Color,
  b: Color,
  ratio: number,
): void {
  for (let yy = Math.max(0, y); yy < Math.min(buf.height, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(buf.width, x + w); xx++) {
      setPixel(buf, xx, yy, ditherAt(xx, yy, ratio) ? b : a);
    }
  }
}

/**
 * Vertical gradient from `from` (top) to `to` (bottom) made only of those two colors, using
 * Bayer dithering. The rect is split into 4-row bands; band k of n uses ratio (k + 0.5) / n, so
 * each full 4×4 tile in a band has exactly round(16 · ratio) pixels of `to`.
 */
export function ditherGradient(
  buf: PixelBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  from: Color,
  to: Color,
): void {
  const bands = Math.max(1, Math.ceil(h / 4));
  for (let k = 0; k < bands; k++) {
    const bandH = Math.min(4, h - k * 4);
    ditherFill(buf, x, y + k * 4, w, bandH, from, to, (k + 0.5) / bands);
  }
}

/** Multi-stop vertical dithered gradient: `stops` are colors spaced evenly over the height. */
export function ditherStops(
  buf: PixelBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: readonly Color[],
): void {
  const segments = stops.length - 1;
  for (let i = 0; i < segments; i++) {
    const y0 = y + Math.round((h * i) / segments);
    const y1 = y + Math.round((h * (i + 1)) / segments);
    ditherGradient(buf, x, y0, w, y1 - y0, stops[i] as Color, stops[i + 1] as Color);
  }
}

/**
 * Vertical gradient as solid horizontal bands (no dithering): `stops` colors stacked top to
 * bottom, each taking an equal share of the height.
 */
export function solidBands(
  buf: PixelBuffer,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: readonly Color[],
): void {
  stops.forEach((color, i) => {
    const y0 = y + Math.round((h * i) / stops.length);
    const y1 = y + Math.round((h * (i + 1)) / stops.length);
    fillRect(buf, x, y0, w, y1 - y0, color);
  });
}

/** Filled circle (integer, no anti-aliasing). */
export function circle(buf: PixelBuffer, cx: number, cy: number, r: number, color: Color): void {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r + r * 0.8) setPixel(buf, cx + dx, cy + dy, color);
    }
  }
}

/** Fills a polygon with an even-odd scanline fill (pixel centers). */
export function polygon(
  buf: PixelBuffer,
  points: readonly (readonly [number, number])[],
  color: Color,
): void {
  if (points.length < 3) return;
  const ys = points.map((p) => p[1]);
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(buf.height - 1, Math.ceil(Math.max(...ys)));
  for (let y = minY; y <= maxY; y++) {
    const sy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i] as [number, number];
      const [x1, y1] = points[(i + 1) % points.length] as [number, number];
      if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) {
        xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xa = Math.ceil((xs[i] as number) - 0.5);
      const xb = Math.floor((xs[i + 1] as number) - 0.5);
      if (xb >= xa) hLine(buf, xa, xb, y, color);
    }
  }
}

/**
 * Fills everything below a ridge line: for each column x, rows from `heights[x]` down to
 * `bottom` (exclusive; defaults to the buffer height) get `color`.
 */
export function ridge(
  buf: PixelBuffer,
  heights: readonly number[],
  color: Color,
  bottom: number = buf.height,
): void {
  heights.forEach((top, x) => {
    const y0 = Math.max(0, Math.round(top));
    if (y0 < bottom) fillRect(buf, x, y0, 1, bottom - y0, color);
  });
}

/** A random-walk / midpoint-style ridge line of `width` heights around `base`. */
export function ridgeLine(
  width: number,
  base: number,
  amplitude: number,
  roughness: number,
  rng: () => number,
): number[] {
  const out: number[] = [];
  let y = base + (rng() - 0.5) * amplitude;
  let v = 0;
  for (let x = 0; x < width; x++) {
    v += (rng() - 0.5) * roughness;
    v *= 0.9;
    y += v;
    // Pull back towards the base so the ridge stays within ±amplitude.
    y += (base - y) * 0.04;
    y = Math.max(base - amplitude, Math.min(base + amplitude, y));
    out.push(Math.round(y));
  }
  return out;
}

/** FNV-1a 32-bit hash of the buffer bytes (for determinism snapshots). */
export function hashBuffer(buf: PixelBuffer): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < buf.data.length; i++) {
    h ^= buf.data[i] as number;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Luminance variance of a region (used to keep the area behind the tableau calm). */
export function lumaVariance(
  buf: PixelBuffer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  let n = 0;
  let sum = 0;
  let sumSq = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const c = getPixel(buf, x, y);
      const l = 0.299 * ((c >> 16) & 0xff) + 0.587 * ((c >> 8) & 0xff) + 0.114 * (c & 0xff);
      sum += l;
      sumSq += l * l;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

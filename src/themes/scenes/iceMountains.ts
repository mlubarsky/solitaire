import type { Rng } from '../../engine';
import {
  fillRect,
  hLine,
  polygon,
  ridgeLine,
  setPixel,
  solidBands,
  type Color,
  type PixelBuffer,
} from '../pixelBuffer';
import { edgeFactor, inCalmZone, randInt, wave, type Scene } from '../scene';

const P = {
  skyTop: 0x8fc9f0,
  skyMid: 0xa6d7f8,
  skyLow: 0xbfe6ff,
  cloud: 0xffffff,
  cloudShade: 0xdcefff,
  far: 0xa9c2d8,
  farShade: 0x93aec8,
  mid: 0x7d9cbc,
  midShade: 0x67869f,
  near: 0x4d6c8e,
  nearShade: 0x3d5a7a,
  snow: 0xffffff,
  snowShade: 0xd6ecff,
  snowShadow: 0xb3d2ee,
  pine: 0x1f4a3a,
  pineDark: 0x163a2d,
} as const;

function cloud(buf: PixelBuffer, x: number, y: number, w: number) {
  fillRect(buf, x, y + 2, w, 3, P.cloud);
  fillRect(buf, x + 2, y, w - 6, 3, P.cloud);
  fillRect(buf, x + Math.round(w / 2), y - 2, Math.round(w / 3), 2, P.cloud);
  fillRect(buf, x + 1, y + 4, w - 1, 1, P.cloudShade);
}

/**
 * One mountain range. Peaks are taller toward the edges so the area behind the tableau stays
 * calm. Each peak has a white snowcap with light-blue shading on its shadow (right) side.
 */
function range(
  buf: PixelBuffer,
  rng: Rng,
  base: number,
  height: number,
  colors: { body: Color; shade: Color },
  snowDepth: number,
) {
  const W = buf.width;
  const tops: number[] = new Array<number>(W).fill(base);
  const peaks: number[] = [];
  for (let x = randInt(rng, -10, 5); x < W + 15; x += randInt(rng, 17, 30)) peaks.push(x);
  for (let x = 0; x < W; x++) {
    let best = base;
    for (const p of peaks) {
      const e = edgeFactor(p);
      const h = height * (0.35 + 0.65 * e) * (0.75 + 0.25 * Math.sin(p * 3.4));
      const slope = 0.9 + ((p * 37) % 5) / 10;
      best = Math.min(best, base - h + Math.abs(x - p) * slope);
    }
    tops[x] = Math.round(best);
  }
  for (let x = 0; x < W; x++) {
    const top = tops[x] as number;
    // The right-hand slope of each peak (ridge descending to the right) is in shadow.
    const shadow = (tops[x + 1] ?? top) > top;
    for (let y = Math.max(0, top); y < buf.height; y++) {
      const depth = y - top;
      const peakSnow = top < base - 4 && depth < snowDepth + ((x >> 1) % 2);
      if (peakSnow) setPixel(buf, x, y, shadow ? P.snowShade : P.snow);
      else setPixel(buf, x, y, shadow ? colors.shade : colors.body);
    }
  }
}

function pine(buf: PixelBuffer, x: number, base: number, h: number) {
  polygon(
    buf,
    [
      [x, base - h],
      [x + h * 0.35, base],
      [x - h * 0.35, base],
    ],
    P.pine,
  );
  polygon(
    buf,
    [
      [x, base - h],
      [x + h * 0.35, base],
      [x, base],
    ],
    P.pineDark,
  );
  // Snow dusting.
  for (let i = 0; i < h; i += 2) setPixel(buf, x - Math.floor(i * 0.3), base - h + i, P.snow);
  setPixel(buf, x, base - h, P.snow);
}

function sky(buf: PixelBuffer) {
  solidBands(buf, 0, 0, buf.width, 66, [P.skyTop, P.skyMid, P.skyLow]);
}

/** Clouds drift slowly to the right and wrap around: [start x, y, width, frames per pixel]. */
const CLOUDS = [
  [6, 9, 20, 5],
  [130, 6, 24, 4],
  [100, 6, 14, 7],
] as const;

function clouds(buf: PixelBuffer, _rng: Rng, frame: number) {
  const span = buf.width + 40;
  for (const [x0, y, w, slowness] of CLOUDS) {
    const x = ((x0 + 20 + Math.floor(frame / slowness)) % span) - 20;
    cloud(buf, x, y, w);
  }
}

function land(buf: PixelBuffer, rng: Rng) {
  const W = buf.width;
  const H = buf.height;
  range(buf, rng, 59, 26, { body: P.far, shade: P.farShade }, 4);
  range(buf, rng, 66, 23, { body: P.mid, shade: P.midShade }, 3);
  range(buf, rng, 75, 20, { body: P.near, shade: P.nearShade }, 3);

  // Snowfield with icy blue shadow strokes and a shaded bottom band.
  const field = ridgeLine(W, 78, 1, 0.2, rng);
  field.forEach((top, x) => fillRect(buf, x, top, 1, H - top, P.snow));
  fillRect(buf, 0, 87, W, H - 87, P.snowShade);
  for (let i = 0; i < 10; i++) {
    const x = randInt(rng, 0, W - 10);
    hLine(buf, x, x + randInt(rng, 3, 9), randInt(rng, 80, 86), P.snowShadow);
  }

  for (const x of [4, 10, 17, 143, 150, 156]) {
    pine(buf, x, H - randInt(rng, 1, 3), randInt(rng, 9, 14));
  }
  for (const x of [60, 98]) pine(buf, x, 80, 4);
}

/** Snow falls at the left and right sides (never behind the tableau), drifting gently. */
function snowfall(buf: PixelBuffer, rng: Rng, frame: number) {
  for (let i = 0; i < 28; i++) {
    const left = i % 2 === 0;
    const x0 = left ? randInt(rng, 1, 36) : randInt(rng, 123, 158);
    const y0 = randInt(rng, 0, 81);
    const speed = randInt(rng, 2, 3); // frames per pixel
    const y = ((y0 + Math.floor(frame / speed)) % 82) - 1;
    const x = x0 + Math.round(wave(frame, 40, 1, i * 7));
    if (!inCalmZone(x, y)) setPixel(buf, x, y, P.snow);
  }
}

export const iceMountains: Scene = {
  seed: 0x1ce,
  palette: [...new Set(Object.values(P))],
  layers: [
    { draw: sky },
    { moving: true, draw: clouds },
    { draw: land },
    { moving: true, draw: snowfall },
  ],
};

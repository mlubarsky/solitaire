import type { Rng } from '../../engine';
import {
  circle,
  fillRect,
  getPixel,
  hLine,
  polygon,
  ridge,
  ridgeLine,
  setPixel,
  solidBands,
  type Color,
  type PixelBuffer,
} from '../pixelBuffer';
import { edgeFactor, inCalmZone, randInt, wave, type Scene } from '../scene';

const P = {
  skyTop: 0xa9d8e8,
  skyMid: 0xc8e5d8,
  skyLow: 0xe8f3c4,
  mist: 0xa6cdbd,
  mistDark: 0x8dbaa8,
  mid1: 0x6aa860,
  mid2: 0x4f8f4f,
  pineMid: 0x3a7a4a,
  near: 0x235a30,
  nearDark: 0x173f22,
  trunk: 0x5a3a22,
  trunkDark: 0x3e2716,
  grass: 0x6dbb4a,
  grassDark: 0x4f9a3a,
  dirt: 0xc9a26b,
  dirtDark: 0xa8814f,
  mushroom: 0xe53935,
  white: 0xffffff,
  flower: 0xffe066,
  mote: 0xfffbd0,
} as const;

const GROUND = 73;

function blobTree(
  buf: PixelBuffer,
  x: number,
  top: number,
  r: number,
  color: Color,
  trunk: Color,
  ground: number,
) {
  fillRect(buf, x - 1, top + r, 2, ground - top - r, trunk);
  circle(buf, x, top + r, r, color);
  circle(buf, Math.round(x - r * 0.6), Math.round(top + r * 1.4), Math.round(r * 0.75), color);
  circle(buf, Math.round(x + r * 0.6), Math.round(top + r * 1.4), Math.round(r * 0.75), color);
}

function pine(buf: PixelBuffer, x: number, base: number, h: number, color: Color) {
  for (let tier = 0; tier < 3; tier++) {
    const tTop = base - h + tier * (h / 4);
    const tH = h / 2.2;
    polygon(
      buf,
      [
        [x, tTop],
        [x + tH * 0.55, tTop + tH],
        [x - tH * 0.55, tTop + tH],
      ],
      color,
    );
  }
}

/** Sky, misty treeline, mid trees and the ground with its dirt path. */
function landscape(buf: PixelBuffer, rng: Rng) {
  const W = buf.width;
  const H = buf.height;
  solidBands(buf, 0, 0, W, 66, [P.skyTop, P.skyMid, P.skyLow]);

  const far = ridgeLine(W, 56, 3, 0.6, rng).map((y, x) => y - Math.round(5 * edgeFactor(x) ** 2));
  ridge(buf, far, P.mist, 70);
  for (let x = 0; x < W; x += randInt(rng, 3, 6)) {
    pine(buf, x, (far[x] ?? 56) + 3, randInt(rng, 5, 9), P.mistDark);
  }

  // Mid layer: rounded canopies and pines, taller toward the edges.
  for (let x = -3; x < W + 3; x += randInt(rng, 6, 10)) {
    const e = edgeFactor(x);
    const top = Math.round(59 - 13 * e * e - rng() * 3);
    if (rng() < 0.55)
      blobTree(buf, x, top, randInt(rng, 3, 5), rng() < 0.5 ? P.mid1 : P.mid2, P.trunk, 75);
    else pine(buf, x, 75, 75 - top + 3, P.pineMid);
  }

  fillRect(buf, 0, GROUND, W, H - GROUND, P.grass);
  fillRect(buf, 0, GROUND, W, 2, P.grassDark);
  polygon(
    buf,
    [
      [76, GROUND],
      [84, GROUND],
      [93, 78],
      [88, 83],
      [102, H],
      [58, H],
      [73, 83],
      [69, 78],
    ],
    P.dirt,
  );
  for (const [x, y] of [
    [78, 77],
    [83, 81],
    [74, 86],
    [90, 88],
    [66, 88],
  ] as const) {
    hLine(buf, x, x + 2, y, P.dirtDark);
  }
}

/** Grass tufts sway in the breeze: the tip leans left, upright, right. */
function grass(buf: PixelBuffer, rng: Rng, frame: number) {
  for (let i = 0; i < 30; i++) {
    const x = randInt(rng, 0, buf.width - 1);
    const y = randInt(rng, 77, buf.height - 1);
    if (x > 55 && x < 105) continue;
    setPixel(buf, x, y, P.grassDark);
    setPixel(buf, x + Math.round(wave(frame, 36, 1, x * 3)), y - 1, P.grassDark);
  }
}

/** Mushrooms, flowers, and the near trees framing the sides. */
function foreground(buf: PixelBuffer, rng: Rng) {
  const W = buf.width;
  const H = buf.height;
  for (const [x, y] of [
    [35, 85],
    [46, 81],
    [114, 84],
    [126, 87],
  ] as const) {
    fillRect(buf, x - 2, y - 2, 5, 2, P.mushroom);
    setPixel(buf, x - 1, y - 2, P.white);
    setPixel(buf, x + 1, y - 1, P.white);
    fillRect(buf, x, y, 1, 2, P.white);
  }
  for (let i = 0; i < 8; i++) {
    const x = randInt(rng, 28, 135);
    const y = randInt(rng, 77, 89);
    const color = rng() < 0.6 ? P.flower : P.white;
    if (x > 55 && x < 105) continue;
    setPixel(buf, x, y, color);
  }

  for (const [x, w] of [
    [4, 5],
    [18, 3],
    [143, 4],
    [155, 5],
  ] as const) {
    fillRect(buf, x - Math.floor(w / 2), 20, w, H - 20, P.trunk);
    fillRect(buf, x + Math.ceil(w / 2) - 1, 20, 1, H - 20, P.trunkDark);
  }
  for (const [cx, cy, r] of [
    [2, 5, 13],
    [15, 15, 10],
    [6, 27, 9],
    [26, 3, 9],
    [158, 6, 13],
    [145, 15, 10],
    [154, 28, 9],
    [134, 2, 8],
  ] as const) {
    circle(buf, cx, cy, r, P.near);
    circle(buf, cx - Math.round(r / 3), cy - Math.round(r / 3), Math.round(r / 2), P.mid2);
  }
  // Darker leaf clusters inside the canopies (2×2 blocks, never on the sky).
  let clusters = 0;
  for (let tries = 0; clusters < 24 && tries < 400; tries++) {
    const x = rng() < 0.5 ? randInt(rng, 0, 34) : randInt(rng, 126, W - 2);
    const y = randInt(rng, 0, 36);
    const leafy = (c: Color) => c === P.near || c === P.mid2;
    if (!leafy(getPixel(buf, x, y)) || !leafy(getPixel(buf, x + 1, y + 1))) continue;
    fillRect(buf, x, y, 2, 2, P.nearDark);
    clusters++;
  }
}

/** Light specks drifting up at the sides, and two butterflies fluttering near the ground. */
function air(buf: PixelBuffer, rng: Rng, frame: number) {
  for (let i = 0; i < 10; i++) {
    const left = i % 2 === 0;
    const x0 = left ? randInt(rng, 4, 34) : randInt(rng, 126, 156);
    const y0 = randInt(rng, 0, 47);
    const slowness = randInt(rng, 3, 5); // frames per pixel
    const y = 70 - ((y0 + Math.floor(frame / slowness)) % 48);
    const x = x0 + Math.round(wave(frame, 50, 1.5, i * 11));
    if (!inCalmZone(x, y)) setPixel(buf, x, y, P.mote);
  }
  for (const [cx, cy, phase, wings] of [
    [30, 69, 0, P.flower],
    [130, 67, 37, P.white],
  ] as const) {
    const x = cx + Math.round(wave(frame, 90, 6, phase));
    const y = cy + Math.round(wave(frame, 46, 3, phase));
    const up = (frame + phase) % 4 < 2; // wings flap
    setPixel(buf, x, y, P.trunkDark);
    setPixel(buf, x - 1, up ? y - 1 : y, wings);
    setPixel(buf, x + 1, up ? y - 1 : y, wings);
  }
}

export const forest: Scene = {
  seed: 0xf0e57,
  palette: [...new Set(Object.values(P))],
  layers: [
    { draw: landscape },
    { moving: true, draw: grass },
    { draw: foreground },
    { moving: true, draw: air },
  ],
};

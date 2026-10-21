import type { Rng } from '../../engine';
import {
  circle,
  fillRect,
  hLine,
  polygon,
  ridgeLine,
  setPixel,
  solidBands,
  vLine,
  type Color,
  type PixelBuffer,
} from '../pixelBuffer';
import { inCalmZone, randInt, wave, type Scene } from '../scene';

/** Deep sea: no sky or surface — dark water, light shafts, a reef, a wreck and wildlife. */
const P = {
  water0: 0x0e4278,
  water1: 0x0b315e,
  water2: 0x072144,
  water3: 0x030d24,
  shaft: 0x1d5d96,
  snow: 0x8fb3cc,
  sand: 0x776549,
  sandDark: 0x4c402c,
  rock: 0x1a222e,
  coralPink: 0xff6f91,
  coralOrange: 0xff9a3c,
  fan: 0x8e44ad,
  kelp: 0x2e7d32,
  kelpDark: 0x1b4f24,
  wood: 0x5a3d2b,
  woodDark: 0x3b2a1e,
  sail: 0x8a8070,
  shark: 0x6e7f8d,
  sharkBelly: 0xdde4e9,
  fishYellow: 0xffd23f,
  white: 0xffffff,
  school: 0x7fa9c4,
  gold: 0xf2c14e,
  chestWood: 0x8a5a2e,
} as const;

const SEABED = 71;

function lightShafts(buf: PixelBuffer) {
  // Faint diagonal shafts from the top edge that taper away by mid-height.
  for (const [x0, w] of [
    [20, 6],
    [64, 7],
    [107, 6],
    [143, 5],
  ] as const) {
    for (let y = 0; y < 40; y++) {
      const width = Math.round(w * (1 - y / 44));
      const xs = Math.round(x0 + y * 0.45);
      if (width > 0) hLine(buf, xs, xs + width - 1, y, P.shaft);
    }
  }
}

function seabed(buf: PixelBuffer, rng: Rng) {
  const W = buf.width;
  const tops = ridgeLine(W, SEABED + 2, 2, 0.35, rng);
  tops.forEach((top, x) => {
    fillRect(buf, x, top, 1, 7, P.sand);
    fillRect(buf, x, top + 7, 1, buf.height - top - 7, P.sandDark);
  });
  // Sand ripples.
  for (let i = 0; i < 10; i++) {
    const x = randInt(rng, 0, W - 6);
    hLine(buf, x, x + randInt(rng, 2, 4), randInt(rng, SEABED + 4, SEABED + 7), P.sandDark);
  }
  // Dark rocks at the sides.
  for (const [x, w, h] of [
    [1, 13, 7],
    [30, 8, 4],
    [146, 14, 8],
  ] as const) {
    polygon(
      buf,
      [
        [x, SEABED + 9],
        [x + w * 0.2, SEABED + 9 - h],
        [x + w * 0.7, SEABED + 9 - h - 1],
        [x + w, SEABED + 9],
      ],
      P.rock,
    );
  }
  // Shells and pebbles.
  for (let i = 0; i < 10; i++) {
    const x = randInt(rng, 0, W - 1);
    const y = randInt(rng, SEABED + 5, buf.height - 2);
    setPixel(buf, x, y, rng() < 0.4 ? P.white : P.coralPink);
  }
}

function kelp(buf: PixelBuffer, x: number, top: number, phase: number, frame: number) {
  for (let y = SEABED + 3; y > top; y--) {
    // The sway grows toward the tip and drifts with time.
    const sway = Math.round(1.5 * Math.sin(y * 0.24 + phase + frame * 0.15));
    setPixel(buf, x + sway, y, P.kelp);
    setPixel(buf, x + sway + 1, y, P.kelpDark);
    if (y % 5 === 0) hLine(buf, x + sway + 2, x + sway + 3, y, P.kelp);
    if (y % 5 === 2) setPixel(buf, x + sway - 1, y, P.kelpDark);
  }
}

function branchCoral(buf: PixelBuffer, rng: Rng, x: number, y: number, len: number, color: Color) {
  let cx = x;
  for (let i = 0; i < len; i++) {
    setPixel(buf, cx, y - i, color);
    if (i > 1 && i % 3 === 0) {
      const dir = rng() < 0.5 ? -1 : 1;
      for (let j = 1; j < 3; j++) setPixel(buf, cx + dir * j, y - i - j, color);
    }
    if (rng() < 0.15) cx += rng() < 0.5 ? -1 : 1;
  }
}

function seaFan(buf: PixelBuffer, x: number, y: number, r: number) {
  for (let a = -4; a <= 4; a++) {
    const ang = (a / 4) * 1.1;
    for (let i = 0; i < r; i++) {
      setPixel(buf, x + Math.round(Math.sin(ang) * i), y - Math.round(Math.cos(ang) * i), P.fan);
    }
  }
}

function brainCoral(buf: PixelBuffer, x: number, y: number) {
  circle(buf, x, y, 4, P.coralPink);
  for (const dy of [-2, 1]) hLine(buf, x - 3, x + 3, y + dy, P.coralOrange);
  fillRect(buf, x - 4, y + 3, 9, 3, P.sand);
}

function wreck(buf: PixelBuffer) {
  // A rotted, tilted hull lying on the seabed at the bottom-right.
  polygon(
    buf,
    [
      [92, 80],
      [138, 69],
      [144, 74],
      [140, 84],
      [101, 88],
    ],
    P.wood,
  );
  // Planks and the dark keel line.
  for (let i = 0; i < 3; i++) {
    const y0 = 76 + i * 4;
    for (let x = 96; x < 141; x++) {
      const y = Math.round(y0 - (x - 96) * 0.22);
      if (y > 69 && y < 88) setPixel(buf, x, y, P.woodDark);
    }
  }
  // Broken holes and missing planks.
  for (const [x, y, w, h] of [
    [107, 78, 5, 3],
    [120, 75, 3, 3],
    [130, 73, 5, 2],
  ] as const) {
    fillRect(buf, x, y, w, h, P.water3);
  }
  // Snapped mast leaning at an angle, with tattered sail scraps.
  for (let i = 0; i < 20; i++) {
    const x = 119 - Math.round(i * 0.55);
    const y = 73 - i;
    setPixel(buf, x, y, P.woodDark);
    setPixel(buf, x + 1, y, P.wood);
  }
  hLine(buf, 104, 114, 55, P.woodDark);
  polygon(
    buf,
    [
      [105, 56],
      [113, 56],
      [111, 61],
      [108, 59],
      [106, 63],
    ],
    P.sail,
  );
  // Barnacles and coral growing on the hull.
  for (const [x, y, c] of [
    [99, 84, P.coralPink],
    [116, 80, P.white],
    [127, 77, P.coralOrange],
    [136, 73, P.white],
    [138, 80, P.coralPink],
  ] as const) {
    setPixel(buf, x, y, c);
  }
}

/** Great white, facing right, in front of the wreck. The tail is drawn separately. */
function sharkBody(buf: PixelBuffer, x: number, y: number) {
  polygon(
    buf,
    [
      [x, y + 2],
      [x + 6, y],
      [x + 18, y],
      [x + 24, y + 2],
      [x + 26, y + 4],
      [x + 21, y + 5],
      [x + 8, y + 6],
      [x + 3, y + 5],
    ],
    P.shark,
  );
  polygon(
    buf,
    [
      [x + 12, y],
      [x + 15, y - 4],
      [x + 17, y],
    ],
    P.shark,
  );
  polygon(
    buf,
    [
      [x + 13, y + 5],
      [x + 11, y + 9],
      [x + 17, y + 5],
    ],
    P.shark,
  );
  hLine(buf, x + 7, x + 21, y + 5, P.sharkBelly);
  setPixel(buf, x + 22, y + 2, P.water3);
}

/** The tail fin sweeps up and down about once a second; the shark itself stays put. */
function sharkTail(buf: PixelBuffer, x: number, y: number, frame: number) {
  const sweep = Math.round(wave(frame, 14, 1.5));
  polygon(
    buf,
    [
      [x + 2, y + 3],
      [x - 4, y - 2 + sweep],
      [x - 2, y + 3],
      [x - 4, y + 8 + sweep],
    ],
    P.shark,
  );
}

/** A 4-pixel fish facing right (dir 1) or left (dir -1); the tail flicks on `flick`. */
function smallFish(buf: PixelBuffer, x: number, y: number, dir: 1 | -1, flick: boolean) {
  hLine(buf, x - 1, x + 1, y, P.school);
  setPixel(buf, x, y - 1, P.school); // dorsal fin
  const tail = x - dir * 2;
  setPixel(buf, tail, flick ? y : y - 1, P.school);
  setPixel(buf, tail, y + 1, P.school);
}

function reefFish(buf: PixelBuffer, x: number, y: number, body: Color, stripe?: Color) {
  fillRect(buf, x, y, 4, 2, body);
  fillRect(buf, x + 1, y - 1, 2, 4, body);
  polygon(
    buf,
    [
      [x, y + 1],
      [x - 2, y - 1],
      [x - 2, y + 3],
    ],
    body,
  );
  if (stripe !== undefined) vLine(buf, x + 1, y - 1, y + 2, stripe);
  setPixel(buf, x + 3, y, P.water3);
}

const JELLYFISH = [
  [30, 15],
  [130, 12],
] as const;

function jellyfishBell(buf: PixelBuffer, x: number, y: number) {
  hLine(buf, x - 1, x + 1, y - 2, P.fan);
  hLine(buf, x - 2, x + 2, y - 1, P.fan);
  hLine(buf, x - 3, x + 3, y, P.fan);
  hLine(buf, x - 3, x + 3, y + 1, P.coralPink);
}

/**
 * The bell stays still; its three tentacles sway left and right together, all in the same
 * direction, bending more toward the tips (about one sway every 2.5 s). They never hang
 * straight down: the lean is always at least 1, so they flip from one side to the other.
 */
export function tentacleSway(frame: number): number {
  const s = wave(frame, 30, 1);
  return (s < 0 ? -1 : 1) * (1 + Math.abs(s));
}

function jellyfishTentacles(buf: PixelBuffer, x: number, y: number, frame: number) {
  const sway = tentacleSway(frame);
  for (const t of [-2, 0, 2]) {
    for (let i = 2; i < 7; i++) {
      setPixel(buf, x + t + Math.round((sway * (i - 1)) / 5), y + i, P.snow);
    }
  }
}

function anglerfish(buf: PixelBuffer, x: number, y: number) {
  circle(buf, x, y, 3, P.rock);
  polygon(
    buf,
    [
      [x - 2, y],
      [x - 6, y - 3],
      [x - 6, y + 3],
    ],
    P.rock,
  );
  hLine(buf, x + 1, x + 3, y + 1, P.white);
  for (let i = 0; i < 3; i++) setPixel(buf, x + 1 + i, y - 3 - i, P.sharkBelly);
  setPixel(buf, x + 4, y - 6, P.gold);
}

const KELP = [
  [4, 35, 0],
  [8, 46, 1.3],
  [15, 40, 2.2],
  [36, 55, 0.7],
  [152, 37, 0.4],
  [157, 48, 1.9],
] as const;

/**
 * A treasure chest half-buried in the sand left of the wreck, below the two pink corals: a
 * rounded wooden lid with gold bands and a lock, its lower part covered by a slanted sand
 * mound, and a couple of gold coins spilled beside it.
 */
function treasureChest(buf: PixelBuffer) {
  // Lid (rounded top) and body.
  hLine(buf, 77, 85, 77, P.chestWood);
  fillRect(buf, 76, 78, 11, 7, P.chestWood);
  hLine(buf, 76, 86, 79, P.woodDark); // lid seam
  vLine(buf, 76, 78, 84, P.woodDark);
  vLine(buf, 86, 78, 84, P.woodDark);
  // Gold bands and the lock.
  vLine(buf, 79, 77, 84, P.gold);
  vLine(buf, 83, 77, 84, P.gold);
  fillRect(buf, 81, 79, 1, 2, P.gold);
  // Sand mound over the lower part, higher on the left so the chest looks tilted in.
  for (let x = 73; x <= 89; x++) {
    const end = x === 73 || x === 89 ? 1 : 0;
    const top = Math.round(84 - (x - 73) * 0.15) + end;
    fillRect(buf, x, top, 1, 86 - top, P.sand);
  }
  setPixel(buf, 74, 85, P.sandDark);
  setPixel(buf, 84, 84, P.sandDark);
  // Spilled coins.
  setPixel(buf, 88, 80, P.gold);
  setPixel(buf, 90, 81, P.gold);
}

/** Where the squid used to be: in front of the wreck, just left of its sail. */
const SHARK = { x: 74, y: 56 } as const;

/** Water, light shafts, marine snow and the seabed. */
function backdrop(buf: PixelBuffer, rng: Rng) {
  const W = buf.width;
  solidBands(buf, 0, 0, W, buf.height, [P.water0, P.water1, P.water2, P.water3]);
  lightShafts(buf);
  // Marine snow: sparse pale specks, mostly away from the tableau.
  for (let i = 0; i < 40; i++) {
    const x = randInt(rng, 0, W - 1);
    const y = randInt(rng, 0, SEABED);
    if (inCalmZone(x, y) && rng() < 0.7) continue;
    setPixel(buf, x, y, P.snow);
  }
  seabed(buf, rng);
}

function kelpForest(buf: PixelBuffer, _rng: Rng, frame: number) {
  for (const [x, top, phase] of KELP) kelp(buf, x, top, phase, frame);
}

/** Coral (branching pink/orange, a brain coral, purple sea fans) and the wreck. */
function reef(buf: PixelBuffer, rng: Rng) {
  branchCoral(buf, rng, 20, SEABED + 4, 10, P.coralPink);
  branchCoral(buf, rng, 26, SEABED + 4, 6, P.coralOrange);
  branchCoral(buf, rng, 46, SEABED + 4, 5, P.coralOrange);
  branchCoral(buf, rng, 64, SEABED + 4, 7, P.coralPink);
  branchCoral(buf, rng, 68, SEABED + 5, 5, P.coralOrange);
  branchCoral(buf, rng, 78, SEABED + 4, 6, P.coralPink);
  branchCoral(buf, rng, 86, SEABED + 5, 6, P.coralPink);
  brainCoral(buf, 56, SEABED + 2);
  seaFan(buf, 12, SEABED + 4, 8);
  seaFan(buf, 150, SEABED + 5, 6);
  wreck(buf);
  treasureChest(buf);
}

/** Bubbles rise from the wreck and the reef, each column of three looping every 4 s. */
function bubbles(buf: PixelBuffer, _rng: Rng, frame: number) {
  for (const [bx, by] of [
    [125, 66],
    [132, 62],
    [24, 58],
  ] as const) {
    for (let k = 0; k < 3; k++) {
      const rise = (Math.floor(frame / 2) + k * 8) % 24;
      setPixel(buf, bx + ((Math.floor(frame / 6) + k) % 2), by - rise, P.snow);
    }
  }
}

function shark(buf: PixelBuffer) {
  sharkBody(buf, SHARK.x, SHARK.y);
}

/** The shark's tail, and the fish school swimming a slow loop beside the foundations. */
function swimmers(buf: PixelBuffer, _rng: Rng, frame: number) {
  sharkTail(buf, SHARK.x, SHARK.y, frame);
  const dx = Math.round(wave(frame, 120, 4));
  const dy = Math.round(wave(frame, 80, 1.5));
  const dir = Math.cos((frame / 120) * Math.PI * 2) >= 0 ? 1 : -1;
  for (let i = 0; i < 9; i++) {
    const x = 128 + (i % 3) * 5 + (Math.floor(i / 3) % 2) * 2 + dx;
    const y = 30 + Math.floor(i / 3) * 4 + dy;
    smallFish(buf, x, y, dir, (frame + i) % 6 < 3);
  }
}

function foreground(buf: PixelBuffer) {
  reefFish(buf, 52, 64, P.fishYellow);
  reefFish(buf, 30, 66, P.coralOrange, P.white);
  for (const [x, y] of JELLYFISH) jellyfishBell(buf, x, y);
  anglerfish(buf, 8, 82);
}

function tentacles(buf: PixelBuffer, _rng: Rng, frame: number) {
  for (const [x, y] of JELLYFISH) jellyfishTentacles(buf, x, y, frame);
}

export const ocean: Scene = {
  seed: 0x0cea7,
  palette: [...new Set(Object.values(P))],
  layers: [
    { draw: backdrop },
    { moving: true, draw: kelpForest },
    { draw: reef },
    { moving: true, draw: bubbles },
    { draw: shark },
    { moving: true, draw: swimmers },
    { draw: foreground },
    { moving: true, draw: tentacles },
  ],
};

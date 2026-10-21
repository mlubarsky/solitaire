import { mulberry32, type Rng } from '../../engine';
import {
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
import { edgeFactor, inCalmZone, randInt, type Scene } from '../scene';

const P = {
  sky0: 0x050b1a,
  sky1: 0x08172a,
  sky2: 0x0a2a3a,
  star: 0xdfe9ff,
  green: 0x3dff9a,
  green2: 0x1fcf7a,
  teal: 0x169c84,
  tealDark: 0x0e5a62,
  magenta: 0xb45cff,
  purple: 0x51307e,
  snow: 0xe8f2ff,
  snowShade: 0xa9c4e0,
  snowDark: 0x6f8fb4,
  pine: 0x07141a,
  pineLight: 0x10303a,
  lake: 0x0a1f30,
  lakeGlow: 0x0f5550,
  lakeGreen: 0x168a66,
  ice: 0x3f7898,
} as const;

const SKY_BOTTOM = 62;
const LAKE_TOP = 70;
const LAKE_BOTTOM = 79;

const STARS = (() => {
  const rng = mulberry32(0xa0f0a);
  const stars: { x: number; y: number; period: number; phase: number }[] = [];
  while (stars.length < 26) {
    const x = randInt(rng, 0, 159);
    const y = randInt(rng, 0, 56);
    if (inCalmZone(x, y)) continue;
    stars.push({ x, y, period: randInt(rng, 30, 90), phase: randInt(rng, 0, 89) });
  }
  return stars;
})();

interface Ribbon {
  base: number;
  amp: number;
  freq: number;
  phase: number;
  length: number;
  /** How far the curtain hangs down at the edges. */
  drop: number;
  /** Drift speed, radians per frame: tiny, so a full ripple takes about a minute. */
  speed: number;
}

/** The three curtains: they stay above the calm zone in the middle and hang low at the sides. */
const RIBBONS: readonly Ribbon[] = [
  { base: 10, amp: 5, freq: 0.06, phase: 0.4, length: 16, drop: 24, speed: 0.008 },
  { base: 6, amp: 4, freq: 0.09, phase: 2.1, length: 10, drop: 12, speed: -0.006 },
  { base: 12, amp: 4, freq: 0.044, phase: 4.0, length: 13, drop: 18, speed: 0.005 },
];

/**
 * One aurora curtain: a wavy lower edge with solid vertical streaks rising from it. Streaks are
 * bright green at the lower edge, stepping through teal into purple/magenta tips. The wave and
 * the folds drift very slowly with `frame`, like a gently waving curtain.
 */
function drawRibbon(buf: PixelBuffer, rng: Rng, r: Ribbon, frame: number) {
  const shift = frame * r.speed;
  for (let x = 0; x < buf.width; x++) {
    const e = edgeFactor(x);
    const intensity = 0.25 + 0.75 * e;
    const phase = r.phase + shift;
    const wave = Math.sin(x * r.freq + phase) + 0.5 * Math.sin(x * r.freq * 2.3 + 1 + shift * 0.7);
    const bottom = Math.round(r.base + r.amp * wave * (0.4 + 0.6 * e) + r.drop * e * e * e);
    // Folds: streak length varies in wide, smooth waves along the curtain (narrow, fast folds
    // flicker like flames), plus a little fixed noise.
    const fold = 0.6 + 0.4 * Math.sin(x * 0.2 + r.phase * 3 + frame * 0.01);
    const length = Math.round(r.length * fold * (0.5 + 0.5 * intensity) + rng() * 3);
    for (let i = 0; i < length; i++) {
      const y = bottom - i;
      if (y < 0) break;
      const t = 1 - i / length; // 1 at the lower edge, 0 at the tip
      let color: Color;
      if (intensity < 0.45) color = t > 0.7 ? P.teal : t > 0.35 ? P.tealDark : P.purple;
      else if (t > 0.8) color = P.green;
      else if (t > 0.6) color = P.green2;
      else if (t > 0.4) color = P.teal;
      else if (t > 0.2) color = P.tealDark;
      else color = intensity > 0.7 ? P.magenta : P.purple;
      setPixel(buf, x, y, color);
    }
  }
}

function pine(buf: PixelBuffer, x: number, base: number, h: number, color: Color) {
  polygon(
    buf,
    [
      [x, base - h],
      [x + h * 0.32, base],
      [x - h * 0.32, base],
    ],
    color,
  );
}

const REFLECT: Partial<Record<number, Color>> = {
  [P.green]: P.lakeGreen,
  [P.green2]: P.lakeGreen,
  [P.teal]: P.lakeGlow,
  [P.magenta]: P.lakeGlow,
};

function sky(buf: PixelBuffer) {
  solidBands(buf, 0, 0, buf.width, SKY_BOTTOM, [P.sky0, P.sky0, P.sky1, P.sky1, P.sky2]);
}

function stars(buf: PixelBuffer, _rng: Rng, frame: number) {
  for (const s of STARS) if ((frame + s.phase) % s.period >= 2) setPixel(buf, s.x, s.y, P.star);
}

function curtains(buf: PixelBuffer, rng: Rng, frame: number) {
  for (const ribbon of RIBBONS) drawRibbon(buf, rng, ribbon, frame);
}

function farShore(buf: PixelBuffer, rng: Rng) {
  const W = buf.width;
  const hills = ridgeLine(W, 64, 2, 0.4, rng);
  ridge(buf, hills, P.snowShade, LAKE_TOP);
  for (let x = -1; x < W; x += randInt(rng, 2, 4)) {
    pine(buf, x, (hills[Math.max(0, Math.min(W - 1, x))] ?? 64) + 1, randInt(rng, 4, 8), P.pine);
  }
}

/** Frozen lake reflecting a dimmed copy of the (moving) sky, in horizontal stripes. */
function lake(buf: PixelBuffer, rng: Rng) {
  const W = buf.width;
  for (let y = LAKE_TOP; y < LAKE_BOTTOM; y++) {
    const src = Math.round(((LAKE_BOTTOM - y) / (LAKE_BOTTOM - LAKE_TOP)) * 40);
    for (let x = 0; x < W; x++) {
      const reflected = REFLECT[getPixel(buf, x, src)];
      setPixel(buf, x, y, reflected !== undefined && y % 3 !== 0 ? reflected : P.lake);
    }
  }
  fillRect(buf, 0, LAKE_TOP, W, 1, P.ice);
  for (let i = 0; i < 6; i++) {
    const x = randInt(rng, 0, W - 6);
    hLine(buf, x, x + randInt(rng, 2, 5), randInt(rng, LAKE_TOP + 2, LAKE_BOTTOM - 1), P.ice);
  }
}

function foreground(buf: PixelBuffer, rng: Rng) {
  const W = buf.width;
  const H = buf.height;
  ridge(buf, ridgeLine(W, LAKE_BOTTOM + 1, 1, 0.3, rng), P.snow);
  fillRect(buf, 0, 86, W, H - 86, P.snowShade);
  for (let i = 0; i < 8; i++) {
    const x = randInt(rng, 0, W - 5);
    hLine(buf, x, x + randInt(rng, 2, 4), randInt(rng, 82, 85), P.snowDark);
  }
  for (const x of [3, 9, 15, 22, 138, 145, 151, 157]) {
    const h = randInt(rng, 13, 21);
    pine(buf, x, H, h, P.pine);
    pine(buf, x + 1, H - 1, Math.round(h * 0.6), P.pineLight);
  }
}

export const aurora: Scene = {
  seed: 0xa0f0a,
  palette: [...new Set(Object.values(P))],
  layers: [
    { draw: sky },
    { moving: true, draw: stars },
    { moving: true, draw: curtains },
    { draw: farShore },
    { moving: true, draw: lake },
    { draw: foreground },
  ],
};

import { mulberry32, type Rng } from '../../engine';
import { circle, fillRect, setPixel, vLine, type Color, type PixelBuffer } from '../pixelBuffer';
import { inCalmZone, randInt, SCENE_HEIGHT, SCENE_WIDTH, type Scene } from '../scene';

/**
 * Night city: chunky pixels, solid sky bands, a few big stars, and clean flat building blocks
 * with regular window grids (≈ 42% lit). Animated: stars twinkle, antenna lights blink, and a
 * few windows switch on and off now and then.
 */
export const NIGHT_CITY_COLORS = {
  navy: 0x0b1026,
  navy2: 0x11163a,
  indigo: 0x1b1f4a,
  indigo2: 0x2a2454,
  dusk: 0x3a2a5e,
  star: 0xffffff,
  starWarm: 0xfff3b0,
  moon: 0xf4f1d0,
  far: 0x2a2552,
  mid: 0x17173b,
  near: 0x0a0a1c,
  windowYellow: 0xffd65c,
  windowBright: 0xfff2a8,
  windowOrange: 0xffad42,
  windowDark: 0x2c2c58,
  red: 0xff3b3b,
  lamp: 0xffe9a8,
  street: 0x05050f,
  pole: 0x3a3a5c,
} as const;

const P = NIGHT_CITY_COLORS;
const W = SCENE_WIDTH;
const H = SCENE_HEIGHT;

/** Solid sky bands, top to bottom (clean steps, no dithering at all). */
export const SKY_BANDS: readonly { color: Color; from: number; to: number }[] = [
  { color: P.navy, from: 0, to: 16 },
  { color: P.navy2, from: 16, to: 30 },
  { color: P.indigo, from: 30, to: 44 },
  { color: P.indigo2, from: 44, to: 56 },
  { color: P.dusk, from: 56, to: H },
];

/** Probability that a window is lit. */
export const LIT_RATIO = 0.42;

interface Star {
  x: number;
  y: number;
  color: Color;
  /** Twinkle: off for 2 frames out of every `period`, starting at `phase`. */
  period: number;
  phase: number;
}
interface Building {
  x: number;
  w: number;
  top: number;
  roof: 'flat' | 'step' | 'antenna';
  /** Antenna light blink offset (frames). */
  blink: number;
}
interface Window {
  x: number;
  y: number;
  color: Color;
  /** Windows that switch on/off: toggled every `period` frames, offset by `phase`. */
  period?: number;
  phase?: number;
}

/** The city's layout, generated once (deterministically) and shared by every layer. */
export const CITY = (() => {
  const rng = mulberry32(0x6e17c1);
  const stars: Star[] = [];
  while (stars.length < 20) {
    const x = randInt(rng, 0, W - 1);
    const y = randInt(rng, 0, 40);
    if (inCalmZone(x, y) || (x > 138 && y < 22)) continue;
    stars.push({
      x,
      y,
      color: stars.length % 4 === 0 ? P.starWarm : P.star,
      period: randInt(rng, 30, 90),
      phase: randInt(rng, 0, 89),
    });
  }

  const far: { x: number; w: number; top: number }[] = [];
  for (let x = -2; x < W;) {
    const w = randInt(rng, 6, 11);
    far.push({ x, w, top: randInt(rng, 56, 64) });
    x += w + randInt(rng, 0, 2);
  }

  // Mid skyline: taller toward the edges, lower behind the tableau.
  const mid: Building[] = [];
  for (let x = -3; x < W;) {
    const w = randInt(rng, 8, 13);
    const edge = Math.abs(x + w / 2 - W / 2) / (W / 2);
    const top = Math.round(64 - edge * edge * 32 - rng() * 4);
    const r = rng();
    mid.push({
      x,
      w,
      top,
      roof: r < 0.25 ? 'step' : r < 0.4 ? 'antenna' : 'flat',
      blink: randInt(rng, 0, 23),
    });
    x += w + randInt(rng, 1, 2);
  }

  const near: { x: number; w: number; top: number }[] = [];
  for (let x = -2; x < W;) {
    const w = randInt(rng, 10, 17);
    near.push({ x, w, top: randInt(rng, 74, 79) });
    x += w + randInt(rng, 1, 3);
  }

  // Regular window grids: 1×1 windows with 1-px spacing, inset from the building edges.
  const windows: Window[] = [];
  const grid = (x: number, top: number, w: number, bottom: number, front: boolean) => {
    for (let wy = top + 2; wy < bottom - 1; wy += 2) {
      for (let wx = x + 1; wx < x + w - 1; wx += 2) {
        if (wx < 0 || wx >= W) continue;
        let color: Color = P.windowDark;
        if (rng() < LIT_RATIO) {
          const r = rng();
          color = r < 1 / 6 ? P.windowBright : r < 0.7 ? P.windowYellow : P.windowOrange;
        }
        const window: Window = { x: wx, y: wy, color };
        // Some windows switch on/off; never ones the near buildings cover.
        if ((front || wy < 73) && rng() < 0.05) {
          window.period = randInt(rng, 60, 180);
          window.phase = randInt(rng, 0, 179);
        }
        windows.push(window);
      }
    }
  };
  for (const b of mid) grid(b.x, b.top, b.w, 80, false);
  const midWindows = windows.length;
  for (const b of near) grid(b.x, b.top, b.w, 86, true);
  return { stars, far, mid, near, windows, midWindows };
})();

function sky(buf: PixelBuffer) {
  for (const band of SKY_BANDS) fillRect(buf, 0, band.from, W, band.to - band.from, band.color);
}

function stars(buf: PixelBuffer, _rng: Rng, frame: number) {
  for (const s of CITY.stars) {
    if ((frame + s.phase) % s.period < 2) continue; // a brief twinkle off
    setPixel(buf, s.x, s.y, s.color);
  }
}

function city(buf: PixelBuffer) {
  // Blocky crescent moon near the top-right corner, beside (not behind) the foundations.
  circle(buf, 148, 13, 5, P.moon);
  circle(buf, 151, 11, 4, P.navy);

  for (const b of CITY.far) fillRect(buf, b.x, b.top, b.w, H - b.top, P.far);
  for (const b of CITY.mid) {
    fillRect(buf, b.x, b.top, b.w, H - b.top, P.mid);
    if (b.roof === 'step') fillRect(buf, b.x + 2, b.top - 2, b.w - 4, 2, P.mid);
    if (b.roof === 'antenna') vLine(buf, b.x + Math.floor(b.w / 2), b.top - 4, b.top - 1, P.mid);
  }
  CITY.windows.slice(0, CITY.midWindows).forEach((w) => setPixel(buf, w.x, w.y, w.color));
  for (const b of CITY.near) fillRect(buf, b.x, b.top, b.w, H - b.top, P.near);
  CITY.windows.slice(CITY.midWindows).forEach((w) => setPixel(buf, w.x, w.y, w.color));

  // Street with a row of lamps.
  fillRect(buf, 0, 87, W, H - 87, P.street);
  for (let x = 6; x < W; x += 20) {
    vLine(buf, x, 83, 86, P.pole);
    setPixel(buf, x, 82, P.lamp);
  }
}

/** Is a switching window currently in its toggled state? */
export function windowToggled(w: Window, frame: number): boolean {
  return w.period !== undefined && Math.floor((frame + (w.phase ?? 0)) / w.period) % 2 === 1;
}

function lights(buf: PixelBuffer, _rng: Rng, frame: number) {
  // Antenna lights blink about once a second.
  for (const b of CITY.mid) {
    if (b.roof === 'antenna' && (frame + b.blink) % 24 < 12) {
      setPixel(buf, b.x + Math.floor(b.w / 2), b.top - 5, P.red);
    }
  }
  // A few windows switch on (warm yellow) or off.
  for (const w of CITY.windows) {
    if (!windowToggled(w, frame)) continue;
    setPixel(buf, w.x, w.y, w.color === P.windowDark ? P.windowYellow : P.windowDark);
  }
}

export const nightCity: Scene = {
  seed: 0x6e17c1,
  palette: [...new Set(Object.values(P))],
  layers: [
    { draw: sky },
    { moving: true, draw: stars },
    { draw: city },
    { moving: true, draw: lights },
  ],
};

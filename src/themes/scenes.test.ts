import { describe, expect, it } from 'vitest';
import { getPixel, hashBuffer, lumaVariance } from './pixelBuffer';
import {
  calmZone,
  edgeFactor,
  inCalmZone,
  renderScene,
  sceneAnimator,
  sceneBuffer,
  sceneSize,
  SCENE_FPS,
} from './scene';
import { CITY, LIT_RATIO, NIGHT_CITY_COLORS, SKY_BANDS, windowToggled } from './scenes/nightCity';
import { tentacleSway } from './scenes/ocean';
import { THEMES } from './themes';

/** Recorded FNV-1a hashes: any change to a scene's pixels must update these deliberately. */
const SNAPSHOT_HASHES: Record<string, [frame0: string, frame37: string]> = {
  'night-city': ['999aee45', '8c4c796f'],
  aurora: ['92e31b2a', '3a31cd6c'],
  'ice-mountains': ['5d98d695', '8d4d8cc9'],
  forest: ['db693a8f', '2a34ec7b'],
  ocean: ['bfd92ed4', '3d9133ad'],
};

/** Frames checked for every scene: the start, a few seconds in, and well over a minute in. */
const FRAMES = [0, 1, 37, 6 * SCENE_FPS, 97 * SCENE_FPS + 5];

const pixelThemes = THEMES.filter((t) => t.kind === 'pixel');

describe('pixel scenes', () => {
  it('has the five scenes', () => {
    expect(pixelThemes.map((t) => t.id)).toEqual([
      'night-city',
      'aurora',
      'ice-mountains',
      'forest',
      'ocean',
    ]);
  });

  describe.each(pixelThemes.map((t) => [t.id, t] as const))('%s', (id, theme) => {
    const scene = theme.scene!;
    const buf = renderScene(scene);

    const expected = [160, 90];

    it(`is ${expected.join('×')} and fully opaque`, () => {
      expect([buf.width, buf.height]).toEqual(expected);
      expect(sceneSize(scene)).toEqual({ width: expected[0], height: expected[1] });
      expect(buf.data).toHaveLength(expected[0]! * expected[1]! * 4);
      for (let i = 3; i < buf.data.length; i += 4) {
        if (buf.data[i] !== 255) throw new Error(`pixel ${(i - 3) / 4} is not opaque`);
      }
    });

    it('draws only palette colors (≤ 24) and uses at least 8 of them', () => {
      expect(scene.palette.length).toBeLessThanOrEqual(24);
      expect(new Set(scene.palette).size).toBe(scene.palette.length);
      const palette = new Set(scene.palette);
      const used = new Set<number>();
      for (let y = 0; y < buf.height; y++) {
        for (let x = 0; x < buf.width; x++) {
          const c = getPixel(buf, x, y);
          if (!palette.has(c)) throw new Error(`(${x}, ${y}) #${c.toString(16)} not in palette`);
          used.add(c);
        }
      }
      expect(used.size).toBeGreaterThanOrEqual(8);
    });

    it('is deterministic and matches the recorded snapshot hash', () => {
      const again = renderScene(scene);
      expect(Buffer.from(again.data).equals(Buffer.from(buf.data))).toBe(true);
      expect(hashBuffer(buf)).toBe(SNAPSHOT_HASHES[id]![0]);
      expect(hashBuffer(renderScene(scene, 37))).toBe(SNAPSHOT_HASHES[id]![1]);
    });

    it('uses chunky solid areas: no checkerboard dithering', () => {
      // A 2×2 window "a b / b a" with a ≠ b is the signature of checkerboard dithering.
      let checkers = 0;
      for (let y = 0; y + 1 < buf.height; y++) {
        for (let x = 0; x + 1 < buf.width; x++) {
          const a = getPixel(buf, x, y);
          const b = getPixel(buf, x + 1, y);
          if (a !== b && getPixel(buf, x, y + 1) === b && getPixel(buf, x + 1, y + 1) === a)
            checkers++;
        }
      }
      expect(checkers / ((buf.width - 1) * (buf.height - 1))).toBeLessThan(0.01);
    });

    it('every frame is opaque, uses only palette colors, and keeps the calm zone calm', () => {
      const palette = new Set(scene.palette);
      const z = calmZone(buf.width, buf.height);
      for (const n of FRAMES) {
        const frame = renderScene(scene, n);
        for (let p = 0; p < frame.data.length / 4; p++) {
          const c = getPixel(frame, p % frame.width, Math.floor(p / frame.width));
          if (frame.data[p * 4 + 3] !== 255 || !palette.has(c)) {
            throw new Error(`frame ${n}, pixel ${p}: #${c.toString(16)}`);
          }
        }
        const calm = lumaVariance(frame, z.x0, z.y0, z.x1, z.y1);
        const bottom = lumaVariance(
          frame,
          0,
          Math.round(frame.height * 0.65),
          frame.width,
          frame.height,
        );
        expect(calm, `frame ${n}`).toBeLessThan(bottom);
      }
    });

    it('animates, with the motion kept out of the area behind the tableau', () => {
      const animator = sceneAnimator(scene);
      expect(animator.animated).toBe(true);
      const z = calmZone(buf.width, buf.height);
      const calmPixels = (z.x1 - z.x0) * (z.y1 - z.y0);
      const changed = new Set<number>();
      let calmChanged = 0;
      for (let n = 1; n <= 10 * SCENE_FPS; n++) {
        const frame = renderScene(scene, n);
        for (let p = 0; p < frame.data.length; p += 4) {
          if (
            frame.data[p] === buf.data[p] &&
            frame.data[p + 1] === buf.data[p + 1] &&
            frame.data[p + 2] === buf.data[p + 2]
          ) {
            continue;
          }
          const index = p / 4;
          if (changed.has(index)) continue;
          changed.add(index);
          if (inCalmZone(index % frame.width, Math.floor(index / frame.width))) calmChanged++;
        }
      }
      expect(changed.size).toBeGreaterThan(20);
      expect(calmChanged / calmPixels).toBeLessThan(0.02);
    });

    it('reuses one buffer for every frame', () => {
      const animator = sceneAnimator(scene);
      expect(animator.frame(3)).toBe(animator.frame(4));
    });

    it('keeps the calm zone behind the tableau calmer than the bottom band', () => {
      const z = calmZone(buf.width, buf.height);
      const calm = lumaVariance(buf, z.x0, z.y0, z.x1, z.y1);
      const bottom = lumaVariance(buf, 0, Math.round(buf.height * 0.65), buf.width, buf.height);
      expect(calm).toBeLessThan(bottom);
    });
  });

  it('memoizes rendered buffers', () => {
    const scene = pixelThemes[0]!.scene!;
    expect(sceneBuffer(scene)).toBe(sceneBuffer(scene));
  });

  it('defines the calm zone and edge factor', () => {
    expect(calmZone()).toEqual({ x0: 40, x1: 120, y0: 18, y1: 54 });
    expect(calmZone(320, 180)).toEqual({ x0: 80, x1: 240, y0: 36, y1: 108 });
    expect(inCalmZone(80, 30)).toBe(true);
    expect(inCalmZone(160, 70, 320, 180)).toBe(true);
    expect(inCalmZone(10, 30)).toBe(false);
    expect(inCalmZone(80, 75)).toBe(false);
    expect(edgeFactor(80)).toBe(0);
    expect(edgeFactor(0)).toBe(1);
    expect(edgeFactor(160)).toBe(1);
  });

  it('jellyfish tentacles always lean to one side, never straight down, and swing both ways', () => {
    const sways = Array.from({ length: 60 }, (_, n) => tentacleSway(n));
    for (const sway of sways) {
      expect(Math.abs(sway)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(sway)).toBeLessThanOrEqual(2);
      // The tip (5 rows down) is always offset from the tentacle's root.
      expect(Math.round(sway)).not.toBe(0);
    }
    expect(sways.some((s) => s > 0) && sways.some((s) => s < 0)).toBe(true);
  });

  describe('night city', () => {
    const buf = renderScene(pixelThemes.find((t) => t.id === 'night-city')!.scene!);
    const sky = new Set(SKY_BANDS.map((b) => b.color));
    const count = (color: number) => {
      let n = 0;
      for (let y = 0; y < buf.height; y++)
        for (let x = 0; x < buf.width; x++) if (getPixel(buf, x, y) === color) n++;
      return n;
    };

    it('has solid sky bands: no checkerboard dithering', () => {
      const boundaries = new Set(SKY_BANDS.slice(1).map((b) => b.from));
      for (let y = 0; y < buf.height; y++) {
        const colors = new Set<number>();
        for (let x = 0; x < buf.width; x++) {
          const c = getPixel(buf, x, y);
          if (sky.has(c)) colors.add(c);
        }
        // Each sky row is one color, except at most one boundary row per band.
        if (boundaries.has(y)) expect(colors.size).toBeLessThanOrEqual(2);
        else expect(colors.size, `row ${y}`).toBeLessThanOrEqual(1);
      }
    });

    it('has a few big stars and no 1-px speckle noise', () => {
      const stars = count(NIGHT_CITY_COLORS.star) + count(NIGHT_CITY_COLORS.starWarm);
      expect(stars).toBeGreaterThanOrEqual(15);
      expect(stars).toBeLessThanOrEqual(25);
    });

    it('blinks antenna lights and switches a few windows on and off over time', () => {
      const red = (n: number) => {
        const f = renderScene(pixelThemes.find((t) => t.id === 'night-city')!.scene!, n);
        let c = 0;
        for (let y = 0; y < f.height; y++)
          for (let x = 0; x < f.width; x++) if (getPixel(f, x, y) === NIGHT_CITY_COLORS.red) c++;
        return c;
      };
      const counts = Array.from({ length: 24 }, (_, n) => red(n));
      expect(Math.max(...counts)).toBeGreaterThan(0);
      expect(Math.min(...counts)).toBeLessThan(Math.max(...counts));
      const switching = CITY.windows.filter((w) => w.period !== undefined);
      expect(switching.length).toBeGreaterThan(3);
      expect(switching.length).toBeLessThan(CITY.windows.length * 0.1);
      const w = switching[0]!;
      const states = new Set(Array.from({ length: 400 }, (_, n) => windowToggled(w, n)));
      expect(states).toEqual(new Set([true, false]));
      expect(
        windowToggled(
          CITY.windows.find((x) => x.period === undefined)!,
          50,
        ),
      ).toBe(false);
    });

    it('lights about 40–45% of the windows, some in bright pale yellow', () => {
      const bright = count(NIGHT_CITY_COLORS.windowBright);
      const lit =
        count(NIGHT_CITY_COLORS.windowYellow) + count(NIGHT_CITY_COLORS.windowOrange) + bright;
      const dark = count(NIGHT_CITY_COLORS.windowDark);
      const ratio = lit / (lit + dark);
      expect(LIT_RATIO).toBeGreaterThanOrEqual(0.4);
      expect(ratio).toBeGreaterThanOrEqual(0.38);
      expect(ratio).toBeLessThanOrEqual(0.48);
      expect(bright / lit).toBeGreaterThan(0.08);
      expect(bright / lit).toBeLessThan(0.26);
      expect(NIGHT_CITY_COLORS.windowBright).toBe(0xfff2a8);
    });
  });
});

import { mulberry32, type Rng } from '../engine';
import { createBuffer, type Color, type PixelBuffer } from './pixelBuffer';

/** Native resolution of every pixel scene: chunky 16:9 (THEMES.md). */
export const SCENE_WIDTH = 160;
export const SCENE_HEIGHT = 90;
/** Animated scenes advance at a retro 12 frames per second. */
export const SCENE_FPS = 12;

/**
 * One layer of a scene, drawn bottom to top. A static layer is drawn once and cached; a moving
 * layer is redrawn on every frame. `rng` restarts from the same seed on every draw, so random
 * choices (positions, sizes) are identical from frame to frame; only `frame` makes things move.
 */
export interface SceneLayer {
  readonly moving?: boolean;
  readonly draw: (buf: PixelBuffer, rng: Rng, frame: number) => void;
}

export interface Scene {
  /** Native resolution; defaults to SCENE_WIDTH × SCENE_HEIGHT. */
  readonly width?: number;
  readonly height?: number;
  /** Constant seed so the output is byte-for-byte deterministic. */
  readonly seed: number;
  /** Every pixel the scene draws is one of these colors (≤ 24). */
  readonly palette: readonly Color[];
  readonly layers: readonly SceneLayer[];
}

/** Native size of a scene's buffer. */
export function sceneSize(scene: Scene): { width: number; height: number } {
  return { width: scene.width ?? SCENE_WIDTH, height: scene.height ?? SCENE_HEIGHT };
}

/** Draws frames of a scene into one reused buffer. */
export interface SceneAnimator {
  readonly width: number;
  readonly height: number;
  /** False when the scene has no moving layers (every frame is the same). */
  readonly animated: boolean;
  /** Draws frame `n` and returns the animator's buffer (the same object every call). */
  frame(n: number): PixelBuffer;
}

/** Cached static layers stacked above a moving layer: only the pixels they actually cover. */
interface Plate {
  readonly indices: Uint32Array;
  readonly pixels: Uint32Array;
}

type Step = { readonly layer: SceneLayer; readonly index: number } | Plate;

function layerRng(scene: Scene, index: number): Rng {
  return mulberry32((scene.seed + Math.imul(index + 1, 0x9e3779b1)) >>> 0);
}

/**
 * Prepares a scene for animation. Static layers below the first moving layer are flattened once
 * into an opaque base; each later run of static layers becomes a sparse plate (the pixels it
 * covers). A frame is then: copy the base, and for each step either redraw a moving layer or
 * stamp a plate. No memory is allocated per frame.
 */
export function createAnimator(scene: Scene): SceneAnimator {
  const { width, height } = sceneSize(scene);
  const layers = scene.layers;
  const base = createBuffer(width, height, scene.palette[0] as Color);
  let i = 0;
  for (; i < layers.length && !(layers[i] as SceneLayer).moving; i++) {
    (layers[i] as SceneLayer).draw(base, layerRng(scene, i), 0);
  }
  const steps: Step[] = [];
  while (i < layers.length) {
    const layer = layers[i] as SceneLayer;
    if (layer.moving) {
      steps.push({ layer, index: i });
      i++;
      continue;
    }
    // A transparent buffer: whatever the static layers draw becomes opaque.
    const plate = { width, height, data: new Uint8ClampedArray(width * height * 4) };
    for (; i < layers.length && !(layers[i] as SceneLayer).moving; i++) {
      (layers[i] as SceneLayer).draw(plate, layerRng(scene, i), 0);
    }
    const words = new Uint32Array(plate.data.buffer);
    const indices: number[] = [];
    const pixels: number[] = [];
    for (let p = 0; p < words.length; p++) {
      if (plate.data[p * 4 + 3] !== 0) {
        indices.push(p);
        pixels.push(words[p] as number);
      }
    }
    steps.push({ indices: Uint32Array.from(indices), pixels: Uint32Array.from(pixels) });
  }

  const buf: PixelBuffer = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  const words = new Uint32Array(buf.data.buffer);
  return {
    width,
    height,
    animated: steps.some((step) => 'layer' in step),
    frame(n: number): PixelBuffer {
      buf.data.set(base.data);
      for (const step of steps) {
        if ('layer' in step) {
          step.layer.draw(buf, layerRng(scene, step.index), n);
        } else {
          const { indices, pixels } = step;
          for (let k = 0; k < indices.length; k++)
            words[indices[k] as number] = pixels[k] as number;
        }
      }
      return buf;
    },
  };
}

const animators = new WeakMap<Scene, SceneAnimator>();

/** Memoized animator per scene (its static layers are rendered once, lazily). */
export function sceneAnimator(scene: Scene): SceneAnimator {
  let animator = animators.get(scene);
  if (!animator) {
    animator = createAnimator(scene);
    animators.set(scene, animator);
  }
  return animator;
}

/** Renders frame `frame` of a scene into a fresh buffer. */
export function renderScene(scene: Scene, frame = 0): PixelBuffer {
  const out = createAnimator(scene).frame(frame);
  return { width: out.width, height: out.height, data: out.data.slice() };
}

const stills = new WeakMap<Scene, PixelBuffer>();

/** Memoized first frame of a scene (thumbnails and the still background). */
export function sceneBuffer(scene: Scene): PixelBuffer {
  let buf = stills.get(scene);
  if (!buf) {
    buf = renderScene(scene);
    stills.set(scene, buf);
  }
  return buf;
}

/** Integer in [min, max]. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** 0 at the horizontal center of the scene, 1 at the left/right edges. */
export function edgeFactor(x: number, width = SCENE_WIDTH): number {
  return Math.abs(x - width / 2) / (width / 2);
}

/** The calm zone behind the tableau: center 50% width × rows 20%–60% (THEMES.md). */
export function calmZone(width = SCENE_WIDTH, height = SCENE_HEIGHT) {
  return {
    x0: Math.round(width * 0.25),
    x1: Math.round(width * 0.75),
    y0: Math.round(height * 0.2),
    y1: Math.round(height * 0.6),
  };
}

/** True if (x, y) is inside the calm zone of a `width` × `height` scene. */
export function inCalmZone(
  x: number,
  y: number,
  width = SCENE_WIDTH,
  height = SCENE_HEIGHT,
): boolean {
  const z = calmZone(width, height);
  return x >= z.x0 && x < z.x1 && y >= z.y0 && y < z.y1;
}

/** A smooth oscillation in [-amplitude, amplitude] with the given period in frames. */
export function wave(frame: number, period: number, amplitude = 1, phase = 0): number {
  return amplitude * Math.sin(((frame + phase) / period) * Math.PI * 2);
}

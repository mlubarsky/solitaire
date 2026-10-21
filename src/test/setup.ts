import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// ---- Fail any test that logs console.error / console.warn (React warnings included). ----
let consoleProblems: string[] = [];
const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);

beforeEach(() => {
  consoleProblems = [];
  console.error = (...args: unknown[]) => {
    consoleProblems.push(`console.error: ${args.map(String).join(' ')}`);
    originalError(...args);
  };
  console.warn = (...args: unknown[]) => {
    consoleProblems.push(`console.warn: ${args.map(String).join(' ')}`);
    originalWarn(...args);
  };
});

afterEach(() => {
  cleanup();
  console.error = originalError;
  console.warn = originalWarn;
  if (consoleProblems.length > 0) {
    const problems = consoleProblems;
    consoleProblems = [];
    throw new Error(`Unexpected console output during test:\n${problems.join('\n')}`);
  }
});

// ---- Browser APIs jsdom does not implement. ----

/** Tests can flip this to emulate `prefers-reduced-motion: reduce`. */
export const mediaState = { reducedMotion: false };
beforeEach(() => {
  mediaState.reducedMotion = false;
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: query.includes('prefers-reduced-motion') ? mediaState.reducedMotion : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// A no-op 2D canvas context so the celebration animation can run under jsdom.
const fakeContext = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (prop === 'canvas') return undefined;
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'createImageData') {
        return (w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        });
      }
      return () => undefined;
    },
    set: () => true,
  },
);
HTMLCanvasElement.prototype.getContext = vi.fn(
  () => fakeContext,
) as unknown as HTMLCanvasElement['getContext'];

if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  Object.defineProperty(window, 'PointerEvent', { value: PointerEventPolyfill, writable: true });
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.hasPointerCapture = () => false;
}

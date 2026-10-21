import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCENE_FPS, sceneAnimator } from '../../themes/scene';
import { themeById } from '../../themes/themes';
import { ANIMATE_STORAGE_KEY, readStoredAnimate } from '../../themes/useBackground';
import { mediaState } from '../../test/setup';
import { renderApp } from '../../test/renderApp';
import { PixelCanvas } from './PixelBackground';

const ocean = themeById('ocean').scene!;

/** A controllable requestAnimationFrame. */
function fakeRaf() {
  let callback: FrameRequestCallback | null = null;
  const request = vi.fn((cb: FrameRequestCallback) => {
    callback = cb;
    return 7;
  });
  const cancel = vi.fn();
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  return { request, cancel, tick: (now: number) => act(() => callback?.(now)) };
}

const originalGetContext = HTMLCanvasElement.prototype.getContext;

/** Replaces the canvas 2D context for one test (restored in afterEach). */
function setContext(context: unknown) {
  HTMLCanvasElement.prototype.getContext = (() => context) as HTMLCanvasElement['getContext'];
}

function spyOnContext() {
  const putImageData = vi.fn();
  setContext({
    putImageData,
    createImageData: (w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    }),
  });
  return putImageData;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('PixelCanvas', () => {
  it('draws one still frame and starts no loop when not animating', () => {
    const raf = fakeRaf();
    const put = spyOnContext();
    render(<PixelCanvas scene={ocean} className="x" />);
    expect(put).toHaveBeenCalledTimes(1);
    expect(raf.request).not.toHaveBeenCalled();
  });

  it('plays at 12 fps, drawing only when the frame number changes, and stops on unmount', () => {
    const raf = fakeRaf();
    const put = spyOnContext();
    const frame = vi.spyOn(sceneAnimator(ocean), 'frame');
    const { unmount } = render(<PixelCanvas scene={ocean} className="x" animate />);
    expect(put).toHaveBeenCalledTimes(1);
    expect(frame).toHaveBeenLastCalledWith(0);
    raf.tick(1000); // first tick sets the clock
    raf.tick(1000 + 80);
    expect(put).toHaveBeenCalledTimes(1);
    raf.tick(1000 + 84);
    expect(put).toHaveBeenCalledTimes(2);
    expect(frame).toHaveBeenLastCalledWith(1);
    raf.tick(1000 + 1001); // a second later: frame 12
    expect(frame).toHaveBeenLastCalledWith(SCENE_FPS);
    unmount();
    expect(raf.cancel).toHaveBeenCalledWith(7);
  });

  it('shares the frame buffer with ImageData when the browser supports it', () => {
    fakeRaf();
    const put = spyOnContext();
    class FakeImageData {
      constructor(
        readonly data: Uint8ClampedArray,
        readonly width: number,
        readonly height: number,
      ) {}
    }
    vi.stubGlobal('ImageData', FakeImageData);
    render(<PixelCanvas scene={ocean} className="x" animate />);
    const image = put.mock.calls[0]![0] as FakeImageData;
    expect(image.data).toBe(sceneAnimator(ocean).frame(0).data);
  });

  it('does nothing without a 2D context', () => {
    const raf = fakeRaf();
    setContext(null);
    render(<PixelCanvas scene={ocean} className="x" animate />);
    expect(raf.request).not.toHaveBeenCalled();
  });
});

describe('animated backgrounds setting', () => {
  const openSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  const toggle = () =>
    within(screen.getByRole('dialog', { name: 'Settings' })).getByRole('switch', {
      name: 'Animate backgrounds',
    });

  it('is on by default and animates a pixel background', () => {
    const raf = fakeRaf();
    window.localStorage.setItem('solitaire.background', 'ocean');
    renderApp({ seed: 1 });
    expect(raf.request).toHaveBeenCalled();
    openSettings();
    expect(toggle()).toBeChecked();
  });

  it('turning it off stops the animation and is remembered', () => {
    const raf = fakeRaf();
    window.localStorage.setItem('solitaire.background', 'ocean');
    renderApp({ seed: 1 });
    openSettings();
    fireEvent.click(toggle());
    expect(toggle()).not.toBeChecked();
    expect(raf.cancel).toHaveBeenCalled();
    expect(window.localStorage.getItem(ANIMATE_STORAGE_KEY)).toBe('off');
    expect(readStoredAnimate()).toBe(false);
    fireEvent.click(toggle());
    expect(window.localStorage.getItem(ANIMATE_STORAGE_KEY)).toBe('on');
  });

  it('never animates under prefers-reduced-motion', () => {
    const raf = fakeRaf();
    mediaState.reducedMotion = true;
    window.localStorage.setItem('solitaire.background', 'ocean');
    renderApp({ seed: 1 });
    expect(raf.request).not.toHaveBeenCalled();
  });

  it('falls back to on when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredAnimate()).toBe(true);
    renderApp({ seed: 1 });
    openSettings();
    fireEvent.click(toggle());
    expect(toggle()).not.toBeChecked();
  });
});

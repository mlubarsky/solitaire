import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFETTI_COLORS, CONFETTI_MAX_MS, Confetti } from './Confetti';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('Confetti', () => {
  it('draws falling paper pieces in the game colors and finishes once they leave the screen', () => {
    const fillRect = vi.fn();
    const styles: string[] = [];
    const ctx = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillRect,
      set fillStyle(value: string) {
        styles.push(value);
      },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    const height = window.innerHeight;
    window.innerHeight = 200; // a short screen: everything falls out of view quickly
    const onDone = vi.fn();
    const { container } = render(<Confetti onDone={onDone} />);
    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true');
    advance(1000);
    expect(fillRect).toHaveBeenCalled();
    expect(new Set(styles)).toEqual(new Set(CONFETTI_COLORS));
    advance(CONFETTI_MAX_MS - 1500);
    expect(onDone).toHaveBeenCalledTimes(1);
    advance(CONFETTI_MAX_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
    window.innerHeight = height;
  });

  it('stops at the time cap even if pieces are still falling, and works without a 2D context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const height = window.innerHeight;
    window.innerHeight = 1_000_000; // pieces never reach the bottom
    const onDone = vi.fn();
    const { unmount } = render(<Confetti onDone={onDone} />);
    advance(CONFETTI_MAX_MS - 1);
    expect(onDone).not.toHaveBeenCalled();
    advance(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    unmount();
    window.innerHeight = height;
  });

  it('cleans up on unmount without finishing', () => {
    const onDone = vi.fn();
    const { unmount } = render(<Confetti onDone={onDone} />);
    unmount();
    advance(CONFETTI_MAX_MS * 2);
    expect(onDone).not.toHaveBeenCalled();
  });
});

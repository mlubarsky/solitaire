import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeState, upTo } from '../test/makeState';
import { CELEBRATION_MAX_MS, Celebration } from './Celebration';

const won = makeState({
  foundations: [upTo('S', 13), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
  stock: [],
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('Celebration', () => {
  it('bounces every card off screen and then finishes by itself', () => {
    const onDone = vi.fn();
    render(<Celebration foundations={won.foundations} onDone={onDone} />);
    act(() => {
      vi.advanceTimersByTime(CELEBRATION_MAX_MS - 10);
    });
    // Without real layout the cards start at the fallback origin and leave the screen quickly.
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(CELEBRATION_MAX_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('works without a 2D context and stops at the time cap', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    // Keep the cards on screen: a foundation pile in the middle of a wide viewport.
    const pile = document.createElement('div');
    pile.dataset.pile = 'f0';
    document.body.appendChild(pile);
    vi.spyOn(pile, 'getBoundingClientRect').mockReturnValue({
      left: 500,
      top: 0,
      width: 1,
      height: 1,
    } as DOMRect);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const innerWidth = window.innerWidth;
    window.innerWidth = 1_000_000;
    const onDone = vi.fn();
    const { unmount } = render(<Celebration foundations={won.foundations} onDone={onDone} />);
    act(() => {
      vi.advanceTimersByTime(CELEBRATION_MAX_MS - 1);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(getContext).toHaveBeenCalled();
    unmount();
    pile.remove();
    window.innerWidth = innerWidth;
  });
});

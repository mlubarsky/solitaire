import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeState } from '../test/makeState';
import {
  cardButton,
  cardIdsIn,
  readout,
  renderApp,
  tableauColumn,
  wastePile,
} from '../test/renderApp';
import { mediaState } from '../test/setup';

/**
 * jsdom has no layout, so give piles and cards fake screen rects: columns are 100px wide at
 * x = 120 * column, cards sit at their pile's position, and drag transforms move them.
 */
const PILE_RECTS: Record<string, { left: number; top: number }> = {
  waste: { left: 120, top: 0 },
  f0: { left: 360, top: 0 },
  t0: { left: 0, top: 200 },
  t1: { left: 120, top: 200 },
  t2: { left: 240, top: 200 },
  t3: { left: 360, top: 200 },
};

function fakeRect(this: HTMLElement): DOMRect {
  let base = { left: -9999, top: -9999 };
  let height = 140;
  const pile = this.dataset.pile ?? this.closest<HTMLElement>('[data-pile]')?.dataset.pile;
  if (pile && PILE_RECTS[pile]) base = PILE_RECTS[pile];
  if (this.dataset.pile?.startsWith('t')) height = 400;
  const match = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(this.style.transform);
  const dx = match ? Number(match[1]) : 0;
  const dy = match ? Number(match[2]) : 0;
  const left = base.left + dx;
  const top = base.top + dy;
  return {
    left,
    top,
    width: 100,
    height,
    right: left + 100,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

const animate = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(fakeRect);
  animate.mockReset();
  HTMLElement.prototype.animate = animate as unknown as HTMLElement['animate'];
});

afterEach(() => {
  vi.useRealTimers();
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
});

const pointer = { isPrimary: true, button: 0, pointerId: 1 };

function drag(el: HTMLElement, dx: number, dy: number, options: { cancel?: boolean } = {}) {
  fireEvent.pointerDown(el, { ...pointer, clientX: 150, clientY: 210 });
  fireEvent.pointerMove(window, { ...pointer, clientX: 150 + dx / 2, clientY: 210 + dy / 2 });
  fireEvent.pointerMove(window, { ...pointer, clientX: 150 + dx, clientY: 210 + dy });
  if (options.cancel) fireEvent.pointerCancel(window, { ...pointer });
  else fireEvent.pointerUp(window, { ...pointer, clientX: 150 + dx, clientY: 210 + dy });
}

const position = () =>
  makeState({
    tableau: [['S7'], ['#D2', 'C9', 'H8'], ['C10'], ['D10']],
    waste: ['H6'],
  });

describe('drag and drop', () => {
  it('drops a card onto a legal column', () => {
    renderApp({ initialGame: position() });
    const card = cardButton(wastePile(), '6 of hearts');
    drag(card, -110, 200); // waste (120, 0) → over column 1 (0, 200)
    expect(cardIdsIn(tableauColumn(1))).toEqual(['S7', 'H6']);
    expect(readout('score')).toBe('5');
    // The card animates from where it was dropped.
    expect(animate).toHaveBeenCalled();
  });

  it('moves a multi-card stack between columns', () => {
    renderApp({ initialGame: position() });
    drag(cardButton(tableauColumn(2), '9 of clubs'), 240, 0); // column 2 → column 4 (10♦)
    expect(cardIdsIn(tableauColumn(4))).toEqual(['D10', 'C9', 'H8']);
    expect(cardIdsIn(tableauColumn(2))).toEqual(['D2']);
    expect(readout('score')).toBe('5'); // auto-flip of the 2♦
    expect(readout('moves')).toBe('1');
  });

  it('returns a stack dropped on an illegal target', () => {
    renderApp({ initialGame: position() });
    drag(cardButton(tableauColumn(2), '9 of clubs'), 115, 0); // onto 10♣: same color
    expect(cardIdsIn(tableauColumn(2))).toEqual(['D2', 'C9', 'H8']);
    expect(cardIdsIn(tableauColumn(3))).toEqual(['C10']);
    expect(readout('moves')).toBe('0');
    expect(animate).toHaveBeenCalled();
  });

  it('follows the pointer while dragging and shows the drag state', () => {
    renderApp({ initialGame: position() });
    const eight = cardButton(tableauColumn(2), '8 of hearts');
    fireEvent.pointerDown(eight, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { ...pointer, clientX: 13, clientY: 11 });
    expect(eight).not.toHaveClass('dragging');
    fireEvent.pointerMove(window, { ...pointer, clientX: 40, clientY: 50 });
    expect(eight).toHaveClass('dragging');
    expect(eight.style.transform).toBe('translate3d(30px, 40px, 0)');
    // A second pointer (multi-touch) is ignored.
    fireEvent.pointerMove(window, { ...pointer, pointerId: 2, clientX: 400, clientY: 400 });
    fireEvent.pointerUp(window, { ...pointer, pointerId: 2 });
    expect(eight.style.transform).toBe('translate3d(30px, 40px, 0)');
    fireEvent.pointerUp(window, { ...pointer, clientX: 40, clientY: 50 });
    expect(eight).not.toHaveClass('dragging');
    expect(eight.style.transform).toBe('');
  });

  it('treats movement under the threshold as a click', () => {
    renderApp({ initialGame: position() });
    const card = cardButton(wastePile(), '6 of hearts');
    fireEvent.pointerDown(card, { ...pointer, clientX: 150, clientY: 10 });
    fireEvent.pointerMove(window, { ...pointer, clientX: 153, clientY: 12 });
    fireEvent.pointerUp(window, { ...pointer, clientX: 153, clientY: 12 });
    expect(card).not.toHaveClass('dragging');
    fireEvent.click(card);
    expect(cardIdsIn(tableauColumn(1))).toEqual(['S7', 'H6']);
  });

  it('ignores the click that ends a drag', () => {
    renderApp({ initialGame: position() });
    const card = cardButton(wastePile(), '6 of hearts');
    drag(card, 1000, 1000); // dropped over nothing
    fireEvent.click(card);
    expect(cardIdsIn(wastePile())).toEqual(['H6']);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    fireEvent.click(card);
    expect(cardIdsIn(tableauColumn(1))).toEqual(['S7', 'H6']);
  });

  it('returns the card when the drag is cancelled or dropped on its own pile', () => {
    renderApp({ initialGame: position() });
    const card = cardButton(wastePile(), '6 of hearts');
    drag(card, -110, 200, { cancel: true });
    expect(cardIdsIn(wastePile())).toEqual(['H6']);
    drag(card, 2, 10);
    expect(cardIdsIn(wastePile())).toEqual(['H6']);
    expect(readout('moves')).toBe('0');
  });

  it('ignores secondary buttons and non-primary pointers', () => {
    renderApp({ initialGame: position() });
    const card = cardButton(wastePile(), '6 of hearts');
    fireEvent.pointerDown(card, { ...pointer, button: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { ...pointer, clientX: 100, clientY: 100 });
    expect(card).not.toHaveClass('dragging');
    fireEvent.pointerDown(card, { ...pointer, isPrimary: false, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { ...pointer, clientX: 100, clientY: 100 });
    expect(card).not.toHaveClass('dragging');
  });

  it('skips position animations with reduced motion', () => {
    mediaState.reducedMotion = true;
    renderApp({ initialGame: position() });
    drag(cardButton(wastePile(), '6 of hearts'), -110, 200);
    expect(cardIdsIn(tableauColumn(1))).toEqual(['S7', 'H6']);
    drag(cardButton(tableauColumn(2), '8 of hearts'), 1000, 1000);
    expect(animate).not.toHaveBeenCalled();
  });

  it('animates a face-up flip when a card is turned over', () => {
    renderApp({ initialGame: makeState({ tableau: [['#D9', 'SA']] }) });
    fireEvent.click(cardButton(tableauColumn(1), 'A of spades'));
    const flipCall = animate.mock.calls.find(([frames]) =>
      String((frames as Keyframe[])[0]?.transform).includes('scaleX(0)'),
    );
    expect(flipCall).toBeDefined();
    expect(screen.getByRole('button', { name: '9 of diamonds' })).toBeInTheDocument();
  });
});

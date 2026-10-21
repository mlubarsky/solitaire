import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GOD_MODE_FASTEST_MS,
  GOD_MODE_SLOWEST_MS,
  GOD_MODE_STEP_MS,
  godModeAnimationMs,
} from '../state/useGodMode';
import { formatPace } from './GodModeBanner';
import { AUTO_COMPLETE_STEP_MS } from '../state/useGame';
import { makeState, upTo } from '../test/makeState';
import {
  advance,
  expectNoClock,
  newGameButton,
  readout,
  renderApp,
  stockButton,
  undoButton,
} from '../test/renderApp';
import { CELEBRATION_MAX_MS } from './Celebration';

/** Four moves to win (two foundation plays, a draw, the drawn King); no auto-complete. */
const fourMoves = () =>
  makeState({
    foundations: [upTo('S', 13), upTo('H', 10), upTo('D', 13), upTo('C', 13)],
    tableau: [['#HQ', 'HJ']],
    stock: ['HK'],
  });

/** One move, then auto-complete plays the last two hearts. */
const almostWon = () =>
  makeState({
    foundations: [upTo('S', 13), upTo('H', 11), upTo('D', 13), upTo('C', 12)],
    tableau: [['#HQ', 'CK'], ['HK']],
    stock: [],
  });

const stuck = () =>
  makeState({
    foundations: [upTo('S', 13), [], upTo('D', 13), upTo('C', 13)],
    tableau: [
      ['#HA', 'H3'],
      ['#H2', 'H5'],
      ['#H6', 'H4'],
      ['#H7', 'H8'],
      ['#H9', 'H10'],
      ['#HJ', 'HQ'],
      ['HK'],
    ],
    stock: [],
  });

const openSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
const panel = () => screen.getByRole('dialog', { name: 'Settings' });
const godButton = () => within(panel()).getByRole('button', { name: /God mode/ });
const banner = () => screen.queryByTestId('god-banner');

/** Starts god mode from the settings panel and lets the (inline) solver finish. */
async function startGodMode() {
  openSettings();
  fireEvent.click(godButton());
  expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull();
  expect(banner()).toHaveTextContent('God mode: working out the best line…');
  advance(0);
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('god mode', () => {
  it('lives in the settings panel with a short explanation', () => {
    renderApp({ seed: 1 });
    openSettings();
    expect(within(panel()).getByRole('heading', { name: 'God mode' })).toBeInTheDocument();
    expect(panel()).toHaveTextContent(/half a second per move/);
    expect(godButton()).toBeEnabled();
    expect(godButton()).toHaveTextContent(/^God mode$/);
    expect(document.body.textContent).not.toContain('⚡');
  });

  it('has a speed slider from 1 s per move (left) to 0.05 s (right), starting at 0.5 s', async () => {
    renderApp({ initialGame: fourMoves() });
    await startGodMode();
    const slider = within(banner() as HTMLElement).getByRole('slider', { name: 'Speed' });
    expect(slider).toHaveAttribute('min', String(GOD_MODE_FASTEST_MS));
    expect(slider).toHaveAttribute('max', String(GOD_MODE_SLOWEST_MS));
    expect(slider).toHaveAttribute('aria-valuetext', '0.5 s per move');
    expect(banner()).toHaveTextContent('0.5 s');
    expect(document.body.textContent).not.toContain('⚡');

    // All the way right: nearly instant.
    fireEvent.change(slider, { target: { value: String(GOD_MODE_SLOWEST_MS) } });
    expect(slider).toHaveAttribute('aria-valuetext', '0.05 s per move');
    advance(GOD_MODE_FASTEST_MS - 1);
    expect(readout('moves')).toBe('0');
    advance(1);
    expect(readout('moves')).toBe('1');

    // All the way left: one move per second.
    fireEvent.change(slider, { target: { value: String(GOD_MODE_FASTEST_MS) } });
    expect(banner()).toHaveTextContent('1 s');
    advance(GOD_MODE_SLOWEST_MS - 1);
    expect(readout('moves')).toBe('1');
    advance(1);
    expect(readout('moves')).toBe('2');
  });

  it('card animations follow the chosen speed', async () => {
    const animate = vi.fn();
    HTMLElement.prototype.animate = animate as unknown as HTMLElement['animate'];
    try {
      renderApp({ initialGame: fourMoves() });
      await startGodMode();
      fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), {
        target: { value: String(GOD_MODE_SLOWEST_MS) },
      });
      animate.mockClear();
      advance(GOD_MODE_FASTEST_MS);
      expect(readout('moves')).toBe('1');
      const durations = animate.mock.calls.map(
        (call) => (call[1] as { duration: number }).duration,
      );
      expect(durations.length).toBeGreaterThan(0);
      expect(new Set(durations)).toEqual(new Set([godModeAnimationMs(GOD_MODE_FASTEST_MS)]));
    } finally {
      delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
    }
  });

  it('formats the pace and scales the animation with it', () => {
    expect(formatPace(50)).toBe('0.05 s');
    expect(formatPace(500)).toBe('0.5 s');
    expect(formatPace(1000)).toBe('1 s');
    expect(godModeAnimationMs(1000)).toBe(600);
    expect(godModeAnimationMs(500)).toBe(300);
    expect(godModeAnimationMs(50)).toBe(30);
    expect(godModeAnimationMs(15)).toBe(30);
  });

  it('plays the solved line one move every half second until the game is won', async () => {
    renderApp({ initialGame: fourMoves() });
    await startGodMode();
    expect(banner()).toHaveTextContent('God mode: move 1 of 4');
    advance(GOD_MODE_STEP_MS - 1);
    expect(readout('moves')).toBe('0');
    advance(1);
    expect(readout('moves')).toBe('1');
    expect(banner()).toHaveTextContent('God mode: move 2 of 4');
    for (let i = 2; i <= 4; i++) advance(GOD_MODE_STEP_MS);
    expect(readout('moves')).toBe('4');
    expect(banner()).toBeNull();
    for (let t = 0; t < CELEBRATION_MAX_MS; t += 500) advance(500);
    expect(screen.getByRole('dialog', { name: /You win/ })).toBeInTheDocument();
    expectNoClock();
  });

  it('locks the board, Undo and Ctrl+Z while it plays', async () => {
    renderApp({ initialGame: fourMoves() });
    await startGodMode();
    advance(GOD_MODE_STEP_MS);
    expect(readout('moves')).toBe('1');
    expect(undoButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Undo all' })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    fireEvent.click(stockButton());
    expect(readout('moves')).toBe('1');
  });

  it('Stop hands the game back, keeping the moves played so far', async () => {
    renderApp({ initialGame: fourMoves() });
    await startGodMode();
    advance(GOD_MODE_STEP_MS);
    fireEvent.click(within(banner() as HTMLElement).getByRole('button', { name: 'Stop' }));
    expect(banner()).toBeNull();
    advance(GOD_MODE_STEP_MS * 3);
    expect(readout('moves')).toBe('1');
    expect(undoButton()).toBeEnabled();
    fireEvent.click(undoButton());
    expect(readout('moves')).toBe('0');
  });

  it('can be stopped from the settings panel too', async () => {
    renderApp({ initialGame: fourMoves() });
    await startGodMode();
    openSettings();
    fireEvent.click(within(panel()).getByRole('button', { name: 'Stop god mode' }));
    expect(banner()).toBeNull();
    expect(godButton()).toHaveTextContent('God mode');
  });

  it('runs auto-complete at its own half-second pace', async () => {
    renderApp({ initialGame: almostWon() });
    await startGodMode();
    advance(GOD_MODE_STEP_MS);
    expect(readout('moves')).toBe('1');
    expect(banner()).toHaveTextContent('God mode: finishing the game');
    advance(AUTO_COMPLETE_STEP_MS);
    expect(readout('moves')).toBe('1');
    advance(GOD_MODE_STEP_MS - AUTO_COMPLETE_STEP_MS);
    expect(readout('moves')).toBe('2');
  });

  it('New game stops it', async () => {
    renderApp({ initialGame: fourMoves() });
    await startGodMode();
    fireEvent.click(newGameButton());
    expect(banner()).toBeNull();
  });

  it('explains an unwinnable deal, and the note can be dismissed', async () => {
    renderApp({ initialGame: stuck() });
    await startGodMode();
    expect(banner()).toHaveTextContent(
      "This deal can't be won. God mode got 39 cards to the foundations.",
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(banner()).toBeNull();
  });

  it('is unavailable once the game is won', () => {
    renderApp({
      initialGame: makeState({
        foundations: [upTo('S', 13), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
        stock: [],
      }),
    });
    for (let t = 0; t < CELEBRATION_MAX_MS; t += 500) advance(500);
    openSettings();
    expect(godButton()).toBeDisabled();
  });
});

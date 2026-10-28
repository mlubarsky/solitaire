import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POINTS } from '../engine';
import { advance, readout, renderApp, stockButton } from '../test/renderApp';
import { SCORING } from './RulesDialog';
import { LEAVE_MS } from './title/TitleScreen';

const rulesButton = () => screen.getByRole('button', { name: 'How to play' });
const rules = () => screen.getByRole('dialog', { name: 'How to play' });
const gotIt = () => within(rules()).getByRole('button', { name: 'Got it' });

describe('How to play', () => {
  it('the ? button opens the rules: goal, columns, deck, tips and scoring', () => {
    renderApp({ seed: 1 });
    fireEvent.click(rulesButton());
    for (const heading of ['Goal', 'Columns', 'The deck', 'Handy', 'Scoring'])
      expect(within(rules()).getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(within(rules()).getByText(/red on black or black on red/)).toBeInTheDocument();
    expect(within(rules()).getByText(/Only a King can go in an empty column/)).toBeInTheDocument();
    expect(gotIt()).toHaveFocus();
  });

  it('Got it and Escape close it, and focus returns to the ? button', () => {
    renderApp({ seed: 1 });
    rulesButton().focus();
    fireEvent.click(rulesButton());
    fireEvent.click(gotIt());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(rulesButton()).toHaveFocus();
    fireEvent.click(rulesButton());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the scoring table matches the engine', () => {
    expect(SCORING.map(([, points]) => points)).toEqual([
      `+${POINTS.tableauToFoundation}`,
      `+${POINTS.wasteToTableau}`,
      `+${POINTS.flip}`,
      String(POINTS.foundationToTableau),
      String(POINTS.recycle),
    ]);
    expect(POINTS.wasteToFoundation).toBe(POINTS.tableauToFoundation);
  });

  it('the game is paused underneath: no clicks and no Ctrl+Z', () => {
    renderApp({ seed: 1 });
    fireEvent.click(stockButton());
    expect(readout('moves')).toBe('1');
    fireEvent.click(rulesButton());
    fireEvent.click(stockButton());
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(readout('moves')).toBe('1');
  });

  it('opening the rules closes the settings panel', () => {
    renderApp({ seed: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    fireEvent.click(rulesButton());
    expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull();
    expect(rules()).toBeInTheDocument();
  });
});

describe('How to play on the title screen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('opens the rules; Enter does not start the game behind them', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'How to play' }));
    expect(rules()).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Enter' });
    advance(LEAVE_MS);
    expect(screen.getByTestId('title-screen')).toBeInTheDocument();
    fireEvent.click(gotIt());
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });
    advance(LEAVE_MS);
    expect(screen.queryByTestId('title-screen')).toBeNull();
  });
});

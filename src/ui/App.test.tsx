import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cardLabel, newGame } from '../engine';
import { autoCompletableState, makeState, nearWonState, upTo } from '../test/makeState';
import {
  advance,
  cardButton,
  cardIdsIn,
  expectNoClock,
  foundationPile,
  newGameButton,
  readout,
  renderApp,
  stockButton,
  tableauColumn,
  undoButton,
  wastePile,
} from '../test/renderApp';
import { mediaState } from '../test/setup';
import { AUTO_COMPLETE_STEP_MS } from '../state/useGame';
import { CELEBRATION_MAX_MS } from './Celebration';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('initial render', () => {
  it('deals the ?seed fixture with correct piles, labels and readouts', () => {
    window.history.replaceState(null, '', '/?seed=42');
    renderApp();
    const expected = newGame(42);
    expect(screen.getAllByRole('group', { name: /^Tableau column/ })).toHaveLength(7);
    for (let i = 0; i < 7; i++) {
      const column = tableauColumn(i + 1);
      expect(cardIdsIn(column)).toEqual(expected.tableau[i as 0].map((c) => c.id));
      expect(within(column).queryAllByRole('img', { name: 'face-down card' })).toHaveLength(i);
      const top = expected.tableau[i as 0][i]!;
      expect(cardButton(column, cardLabel(top))).toBeInTheDocument();
    }
    expect(stockButton()).toHaveAccessibleName('Stock, 24 cards');
    expect(cardIdsIn(stockButton())).toHaveLength(24);
    expect(cardIdsIn(wastePile())).toEqual([]);
    for (let f = 1; f <= 4; f++) expect(cardIdsIn(foundationPile(f))).toEqual([]);
    expect(undoButton()).toBeDisabled();
    expect(readout('score')).toBe('0');
    expect(readout('moves')).toBe('0');
    expectNoClock();
    expect(screen.getByRole('heading', { name: 'Solitaire' })).toBeInTheDocument();
  });

  it('accepts a seed prop', () => {
    renderApp({ seed: 7 });
    expect(cardIdsIn(tableauColumn(7))).toEqual(newGame(7).tableau[6].map((c) => c.id));
  });
});

describe('stock', () => {
  it('clicking the stock draws a card; clicking the empty stock recycles', () => {
    renderApp({ seed: 3 });
    const deal = newGame(3);
    fireEvent.click(stockButton());
    expect(stockButton()).toHaveAccessibleName('Stock, 23 cards');
    const top = deal.stock[23]!;
    expect(cardButton(wastePile(), cardLabel(top))).toBeInTheDocument();
    expect(readout('moves')).toBe('1');
    for (let i = 0; i < 23; i++) fireEvent.click(stockButton());
    expect(stockButton()).toHaveAccessibleName('Stock, 0 cards, click to recycle the waste');
    expect(cardIdsIn(wastePile())).toHaveLength(24);
    fireEvent.click(stockButton());
    expect(stockButton()).toHaveAccessibleName('Stock, 24 cards');
    expect(cardIdsIn(wastePile())).toEqual([]);
    expect(readout('moves')).toBe('25');
    expect(readout('score')).toBe('0');
  });

  it('fans the last 3 waste cards; only the newest is playable', () => {
    const state = makeState({ tableau: [['S8'], ['C9']], waste: ['D2', 'H5', 'CA', 'H7', 'D8'] });
    renderApp({ initialGame: state });
    const waste = wastePile();
    const visible = Array.from(waste.querySelectorAll<HTMLElement>('[data-card-id]')).filter(
      (el) => el.style.visibility !== 'hidden',
    );
    expect(visible.map((el) => el.dataset.cardId)).toEqual(['CA', 'H7', 'D8']);
    // Older cards stay mounted, hidden under the fan.
    expect(cardIdsIn(waste)).toEqual(['D2', 'H5', 'CA', 'H7', 'D8']);
    expect(
      within(waste)
        .getAllByRole('button')
        .map((el) => el.dataset.cardId),
    ).toEqual(['D8']);
    // Clicking a non-newest waste card does nothing.
    fireEvent.click(within(waste).getByRole('img', { name: '7 of hearts' }));
    expect(readout('moves')).toBe('0');
    // Playing the newest card re-forms the fan from the remaining waste.
    fireEvent.click(cardButton(waste, '8 of diamonds'));
    expect(cardIdsIn(tableauColumn(2))).toEqual(['C9', 'D8']);
    expect(
      within(waste)
        .getAllByRole('button')
        .map((el) => el.dataset.cardId),
    ).toEqual(['H7']);
    expect(
      within(waste)
        .getAllByRole('img')
        .map((el) => el.dataset.cardId),
    ).toEqual(['H5', 'CA']);
  });

  it('recycling costs 100 points', () => {
    const state = makeState({
      foundations: [upTo('S', 10), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
      waste: ['SJ', 'SQ', 'SK'],
      stock: [],
      score: 150,
    });
    renderApp({ initialGame: state });
    fireEvent.click(stockButton());
    expect(readout('score')).toBe('50');
    expect(readout('moves')).toBe('1');
    expect(stockButton()).toHaveAccessibleName('Stock, 3 cards');
  });

  it('does nothing when both stock and waste are empty', () => {
    const state = makeState({
      foundations: [upTo('S', 12), upTo('H', 13), upTo('D', 13), upTo('C', 13)],
      tableau: [['#SK'].map((c) => c.slice(1))],
      stock: [],
    });
    renderApp({ initialGame: state });
    expect(stockButton()).toHaveAccessibleName('Stock, 0 cards');
    expect(stockButton()).toHaveTextContent('✕');
  });
});

describe('click to move', () => {
  const position = () =>
    makeState({
      tableau: [['S7'], ['#D2', 'H6'], ['C9'], ['HA']],
      waste: ['D8'],
    });

  it('moves a playable card and updates the readouts', () => {
    renderApp({ initialGame: position() });
    fireEvent.click(cardButton(tableauColumn(2), '6 of hearts'));
    expect(cardIdsIn(tableauColumn(1))).toEqual(['S7', 'H6']);
    expect(cardIdsIn(tableauColumn(2))).toEqual(['D2']);
    expect(cardButton(tableauColumn(2), '2 of diamonds')).toBeInTheDocument();
    expect(readout('score')).toBe('5');
    expect(readout('moves')).toBe('1');
    // Ace goes to the foundation.
    fireEvent.click(cardButton(tableauColumn(4), 'A of hearts'));
    expect(cardIdsIn(foundationPile(1))).toEqual(['HA']);
    expect(readout('score')).toBe('15');
    // Waste card onto the tableau.
    fireEvent.click(cardButton(wastePile(), '8 of diamonds'));
    expect(cardIdsIn(tableauColumn(3))).toEqual(['C9', 'D8']);
  });

  it('shakes an unplayable card without changing state', () => {
    renderApp({ initialGame: position() });
    const card = cardButton(tableauColumn(3), '9 of clubs');
    fireEvent.click(card);
    expect(card).toHaveClass('shake');
    expect(cardIdsIn(tableauColumn(3))).toEqual(['C9']);
    expect(readout('moves')).toBe('0');
    expect(undoButton()).toBeDisabled();
    advance(400);
    expect(card).not.toHaveClass('shake');
  });

  it('activates a card from the keyboard', () => {
    renderApp({ initialGame: position() });
    fireEvent.keyDown(cardButton(tableauColumn(4), 'A of hearts'), { key: 'Enter' });
    expect(cardIdsIn(foundationPile(1))).toEqual(['HA']);
    fireEvent.keyDown(cardButton(tableauColumn(2), '6 of hearts'), { key: 'x' });
    expect(cardIdsIn(tableauColumn(2))).toEqual(['D2', 'H6']);
  });

  it('ignores clicks on face-down cards', () => {
    renderApp({ initialGame: position() });
    fireEvent.click(within(tableauColumn(2)).getByRole('img', { name: 'face-down card' }));
    expect(readout('moves')).toBe('0');
  });
});

describe('undo all', () => {
  const undoAllButton = () => screen.getByRole('button', { name: 'Undo all' });

  it('sits next to Undo and takes the game back to the deal in one click', () => {
    renderApp({ initialGame: makeState({ tableau: [['#D9', 'SA'], ['H6']], waste: ['C7'] }) });
    const buttons = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(buttons.indexOf('Undo all')).toBe(buttons.indexOf('Undo') + 1);
    expect(undoAllButton()).toBeDisabled();
    const startColumns = [1, 2].map((n) => cardIdsIn(tableauColumn(n)));

    fireEvent.click(cardButton(tableauColumn(1), 'A of spades'));
    fireEvent.click(stockButton());
    fireEvent.click(stockButton());
    expect(readout('moves')).toBe('3');
    expect(readout('score')).not.toBe('0');
    expect(undoAllButton()).toBeEnabled();

    fireEvent.click(undoAllButton());
    expect(readout('moves')).toBe('0');
    expect(readout('score')).toBe('0');
    expect([1, 2].map((n) => cardIdsIn(tableauColumn(n)))).toEqual(startColumns);
    expect(within(tableauColumn(1)).getByRole('img', { name: 'face-down card' })).toBeTruthy();
    expect(cardIdsIn(wastePile())).toEqual(['C7']);
    expect(undoAllButton()).toBeDisabled();
    expect(undoButton()).toBeDisabled();
  });
});

describe('undo', () => {
  it('undoes via the button and via Ctrl+Z / Cmd+Z, and disables at the start', () => {
    renderApp({ seed: 5 });
    expect(undoButton()).toBeDisabled();
    fireEvent.click(stockButton());
    fireEvent.click(stockButton());
    fireEvent.click(stockButton());
    expect(readout('moves')).toBe('3');
    expect(undoButton()).toBeEnabled();

    fireEvent.click(undoButton());
    expect(readout('moves')).toBe('2');
    expect(stockButton()).toHaveAccessibleName('Stock, 22 cards');

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(readout('moves')).toBe('1');
    fireEvent.keyDown(window, { key: 'Z', metaKey: true });
    expect(readout('moves')).toBe('0');
    expect(stockButton()).toHaveAccessibleName('Stock, 24 cards');
    expect(undoButton()).toBeDisabled();

    // Plain "z" and Ctrl+Shift+Z do nothing.
    fireEvent.click(stockButton());
    fireEvent.keyDown(window, { key: 'z' });
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(readout('moves')).toBe('1');
  });

  it('restores score and re-hides an auto-flipped card', () => {
    renderApp({ initialGame: makeState({ tableau: [['#D9', 'SA']], score: 3 }) });
    fireEvent.click(cardButton(tableauColumn(1), 'A of spades'));
    expect(readout('score')).toBe('18');
    expect(cardButton(tableauColumn(1), '9 of diamonds')).toBeInTheDocument();
    fireEvent.click(undoButton());
    expect(readout('score')).toBe('3');
    expect(within(tableauColumn(1)).getByRole('img', { name: 'face-down card' })).toBeTruthy();
  });
});

describe('new game', () => {
  it('starts immediately when no move has been made', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    renderApp({ seed: 11 });
    fireEvent.click(newGameButton());
    expect(screen.queryByRole('dialog')).toBeNull();
    const expected = newGame(0x40000000);
    expect(cardIdsIn(tableauColumn(7))).toEqual(expected.tableau[6].map((c) => c.id));
  });

  it('asks for confirmation once a move was made; Cancel keeps the game', () => {
    renderApp({ seed: 12 });
    fireEvent.click(stockButton());
    advance(2000);
    fireEvent.click(newGameButton());
    const dialog = screen.getByRole('dialog', { name: 'Start a new game?' });
    expect(within(dialog).getByRole('button', { name: 'New game' })).toHaveFocus();
    // Input is locked behind the dialog.
    fireEvent.click(stockButton());
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(readout('moves')).toBe('1');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(readout('moves')).toBe('1');
    expect(stockButton()).toHaveAccessibleName('Stock, 23 cards');
  });

  it('Escape dismisses the confirmation', () => {
    renderApp({ seed: 12 });
    fireEvent.click(stockButton());
    fireEvent.click(newGameButton());
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Confirm deals a new game and resets score and moves', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    renderApp({ initialGame: makeState({ tableau: [['S7'], ['H6']] }) });
    fireEvent.click(cardButton(tableauColumn(2), '6 of hearts'));
    expect(readout('score')).toBe('0');
    fireEvent.click(stockButton());
    expect(readout('moves')).toBe('2');
    fireEvent.click(newGameButton());
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'New game' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(readout('moves')).toBe('0');
    expect(readout('score')).toBe('0');
    expect(stockButton()).toHaveAccessibleName('Stock, 24 cards');
    expect(cardIdsIn(tableauColumn(7))).toEqual(newGame(0x80000000).tableau[6].map((c) => c.id));
    expect(undoButton()).toBeDisabled();
  });
});

describe('auto-complete', () => {
  it('plays every card to the foundations by itself, ignoring input', () => {
    mediaState.reducedMotion = true;
    renderApp({ initialGame: autoCompletableState() });
    expect(undoButton()).toBeDisabled();
    // Input is ignored while auto-completing.
    const jack = within(tableauColumn(1)).getByRole('img', { name: 'J of spades' });
    fireEvent.click(jack);
    expect(jack).not.toHaveClass('shake');
    advance(AUTO_COMPLETE_STEP_MS);
    expect(readout('moves')).toBe('1');
    expect(undoButton()).toBeDisabled();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(readout('moves')).toBe('1');
    for (let i = 0; i < 11; i++) advance(AUTO_COMPLETE_STEP_MS);
    for (let f = 1; f <= 4; f++) expect(cardIdsIn(foundationPile(f))).toHaveLength(13);
    for (let t = 1; t <= 7; t++) expect(cardIdsIn(tableauColumn(t))).toEqual([]);
    expect(readout('moves')).toBe('12');
    expect(readout('score')).toBe('120');
    expect(screen.getByRole('dialog', { name: 'You win!' })).toBeInTheDocument();
    expect(undoButton()).toBeDisabled();
  });

  it('starts after the move that makes it possible', () => {
    mediaState.reducedMotion = true;
    const state = makeState({
      foundations: [upTo('S', 10), upTo('H', 10), upTo('D', 10), upTo('C', 11)],
      tableau: [['SK', 'HQ', 'SJ'], ['HK', 'SQ', 'HJ'], ['DK', 'CQ', 'DJ'], ['CK']],
      waste: ['DQ'],
      stock: [],
    });
    renderApp({ initialGame: state });
    expect(undoButton()).toBeDisabled();
    fireEvent.click(cardButton(wastePile(), 'Q of diamonds'));
    expect(cardIdsIn(tableauColumn(4))).toEqual(['CK', 'DQ']);
    expect(undoButton()).toBeDisabled();
    for (let i = 0; i < 12; i++) advance(AUTO_COMPLETE_STEP_MS);
    expect(screen.getByRole('dialog', { name: 'You win!' })).toBeInTheDocument();
  });
});

describe('win', () => {
  it('shows final score and moves (no time); Play again starts a new game', () => {
    mediaState.reducedMotion = true;
    renderApp({ initialGame: nearWonState() });
    fireEvent.click(cardButton(wastePile(), 'K of spades'));
    advance(1000);
    expect(screen.queryByTestId('celebration')).toBeNull();
    const dialog = screen.getByRole('dialog', { name: 'You win!' });
    expect(within(dialog).getByTestId('win-score')).toHaveTextContent('510');
    expect(within(dialog).getByTestId('win-moves')).toHaveTextContent('121');
    expect(screen.getByText('You win! Score 510, 121 moves.')).toBeInTheDocument();
    expectNoClock(dialog);
    expectNoClock();
    expect(undoButton()).toBeDisabled();
    // New game during a win needs no confirmation.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Play again' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(stockButton()).toHaveAccessibleName('Stock, 24 cards');
    expect(readout('moves')).toBe('0');
    expect(readout('score')).toBe('0');
  });

  it('plays the canvas celebration first, then the dialog', () => {
    renderApp({ initialGame: nearWonState() });
    fireEvent.click(cardButton(wastePile(), 'K of spades'));
    expect(screen.getByTestId('celebration')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    advance(CELEBRATION_MAX_MS);
    expect(screen.queryByTestId('celebration')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'You win!' })).toBeInTheDocument();
  });

  it('a key press skips the celebration', () => {
    renderApp({ initialGame: nearWonState() });
    fireEvent.click(cardButton(wastePile(), 'K of spades'));
    advance(500);
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.queryByTestId('celebration')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'You win!' })).toBeInTheDocument();
    fireEvent.click(newGameButton());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a click skips the celebration', () => {
    renderApp({ initialGame: nearWonState() });
    fireEvent.click(cardButton(wastePile(), 'K of spades'));
    fireEvent.pointerDown(screen.getByTestId('celebration'));
    expect(screen.getByRole('dialog', { name: 'You win!' })).toBeInTheDocument();
  });
});

describe('side column shading (revision 3)', () => {
  afterEach(() => {
    act(() => {
      window.innerWidth = 1024;
      window.innerHeight = 768;
      window.dispatchEvent(new Event('resize'));
    });
  });

  it('renders no shading band or overlay behind the side columns in any layout', () => {
    const { container } = renderApp({ seed: 4 });
    const noBands = () => {
      expect(container.querySelector('[data-testid^="side-band"], .side-band')).toBeNull();
    };
    noBands();
    act(() => {
      window.innerWidth = 375;
      window.innerHeight = 667;
      window.dispatchEvent(new Event('resize'));
    });
    noBands();
  });
});

describe('layout', () => {
  it('re-lays out on resize', () => {
    renderApp({ seed: 2 });
    const board = screen.getByTestId('board');
    const before = board.style.getPropertyValue('--card-w');
    act(() => {
      window.innerWidth = 375;
      window.innerHeight = 667;
      window.dispatchEvent(new Event('resize'));
    });
    expect(board.style.getPropertyValue('--card-w')).not.toBe(before);
    act(() => {
      window.innerWidth = 1024;
      window.innerHeight = 768;
      window.dispatchEvent(new Event('resize'));
    });
    expect(board.style.getPropertyValue('--card-w')).toBe(before);
  });
});

import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from '../../themes/useBackground';
import { makeState } from '../../test/makeState';
import {
  cardButton,
  cardIdsIn,
  readout,
  renderApp,
  stockButton,
  tableauColumn,
  undoButton,
} from '../../test/renderApp';

const NAMES = ['Classic green', 'Night city', 'Aurora', 'Snowy peaks', 'Woodland', 'Deep sea'];

const settingsButton = () => screen.getByRole('button', { name: 'Settings' });
const panel = () => screen.getByRole('dialog', { name: 'Settings' });
const backgroundGroup = () => within(panel()).getByRole('radiogroup', { name: 'Table background' });
const radios = () => within(backgroundGroup()).getAllByRole('radio');
const backgroundId = () => screen.getByTestId('background').getAttribute('data-background');

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('settings menu', () => {
  it('☰ opens the panel, moves focus into it, and toggles aria-expanded', () => {
    renderApp({ seed: 1 });
    const button = settingsButton();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(panel()).toBeInTheDocument();
    expect(panel()).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).toHaveAttribute('aria-checked', 'true');
  });

  it.each([
    ['Escape', () => fireEvent.keyDown(window, { key: 'Escape' })],
    ['✕', () => fireEvent.click(screen.getByRole('button', { name: 'Close settings' }))],
    ['backdrop', () => fireEvent.click(screen.getByTestId('settings-backdrop'))],
  ])('%s closes the panel and returns focus to ☰', (_name, close) => {
    renderApp({ seed: 1 });
    fireEvent.click(settingsButton());
    close();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(settingsButton()).toHaveAttribute('aria-expanded', 'false');
    expect(settingsButton()).toHaveFocus();
  });

  it('lists the 6 backgrounds as a radio group with exactly one checked', () => {
    renderApp({ seed: 1 });
    fireEvent.click(settingsButton());
    expect(within(panel()).getByRole('radiogroup', { name: 'Table background' })).toBeTruthy();
    expect(radios().map((r) => r.textContent)).toEqual(NAMES);
    expect(radios().filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
    expect(within(panel()).getByRole('radio', { name: 'Classic green' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('arrow keys move the selection (with wrap-around, Home and End)', () => {
    renderApp({ seed: 1 });
    fireEvent.click(settingsButton());
    const group = backgroundGroup();
    const checked = () => radios().find((r) => r.getAttribute('aria-checked') === 'true');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(checked()).toHaveTextContent('Night city');
    expect(checked()).toHaveFocus();
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    expect(checked()).toHaveTextContent('Aurora');
    fireEvent.keyDown(group, { key: 'ArrowUp' });
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(checked()).toHaveTextContent('Classic green');
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(checked()).toHaveTextContent('Deep sea');
    fireEvent.keyDown(group, { key: 'Home' });
    expect(checked()).toHaveTextContent('Classic green');
    fireEvent.keyDown(group, { key: 'End' });
    expect(checked()).toHaveTextContent('Deep sea');
    fireEvent.keyDown(group, { key: 'a' });
    expect(checked()).toHaveTextContent('Deep sea');
    expect(backgroundId()).toBe('ocean');
  });

  it('selecting a background applies and stores it without touching the game', () => {
    renderApp({ initialGame: makeState({ tableau: [['S7'], ['H6']] }) });
    fireEvent.click(cardButton(tableauColumn(2), '6 of hearts'));
    fireEvent.click(stockButton());
    const before = window.__solitaire!.getState();
    expect(readout('moves')).toBe('2');
    expect(backgroundId()).toBe('classic');

    fireEvent.click(settingsButton());
    fireEvent.click(within(panel()).getByRole('radio', { name: 'Aurora' }));
    expect(backgroundId()).toBe('aurora');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('aurora');
    expect(within(panel()).getByRole('radio', { name: 'Aurora' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByTestId('background').querySelector('canvas')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(window.__solitaire!.getState()).toBe(before);
    expect(readout('moves')).toBe('2');
    expect(readout('score')).toBe(String(before.score));
    // Undo history is intact: two undos return to the start.
    fireEvent.click(undoButton());
    fireEvent.click(undoButton());
    expect(readout('moves')).toBe('0');
    expect(undoButton()).toBeDisabled();
  });

  it('restores a stored background on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, 'forest');
    renderApp({ seed: 1 });
    expect(backgroundId()).toBe('forest');
  });

  it('falls back to classic for an unknown stored id', () => {
    window.localStorage.setItem(STORAGE_KEY, 'disco');
    renderApp({ seed: 1 });
    expect(backgroundId()).toBe('classic');
  });

  it('falls back to classic when localStorage throws, without errors', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    renderApp({ seed: 1 });
    expect(backgroundId()).toBe('classic');
    fireEvent.click(settingsButton());
    fireEvent.click(within(panel()).getByRole('radio', { name: 'Deep sea' }));
    expect(backgroundId()).toBe('ocean');
  });

  it('ignores game input while the panel is open', () => {
    vi.useFakeTimers();
    try {
      renderApp({ initialGame: makeState({ tableau: [['S7'], ['H6']] }) });
      fireEvent.click(stockButton());
      expect(readout('moves')).toBe('1');
      fireEvent.click(settingsButton());
      const six = within(tableauColumn(2)).getByRole('img', { name: '6 of hearts' });
      fireEvent.click(six);
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      fireEvent.click(stockButton());
      expect(cardIdsIn(tableauColumn(2))).toEqual(['H6']);
      expect(readout('moves')).toBe('1');
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(six).not.toHaveClass('shake');
    } finally {
      vi.useRealTimers();
    }
  });
});

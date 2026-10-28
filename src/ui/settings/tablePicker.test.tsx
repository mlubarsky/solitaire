import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../../themes/useBackground';
import { readout, renderApp, stockButton } from '../../test/renderApp';

const tableButton = () => screen.getByRole('button', { name: 'Change table' });
const picker = () => screen.getByRole('dialog', { name: 'Choose a table' });
const radio = (name: string) => within(picker()).getByRole('radio', { name });
const backgroundId = () => screen.getByTestId('background').getAttribute('data-background');

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

describe('quick table picker', () => {
  it('the palette button opens the six tables with the current one focused', () => {
    renderApp({ seed: 1 });
    expect(tableButton()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(tableButton());
    expect(tableButton()).toHaveAttribute('aria-expanded', 'true');
    expect(within(picker()).getAllByRole('radio')).toHaveLength(6);
    expect(radio('Classic green')).toHaveFocus();
    expect(radio('Classic green')).toHaveAttribute('aria-checked', 'true');
  });

  it('picking a table applies and saves it, and the picker stays open to try more', () => {
    renderApp({ seed: 1 });
    fireEvent.click(tableButton());
    fireEvent.click(radio('Deep sea'));
    expect(backgroundId()).toBe('ocean');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('ocean');
    expect(radio('Deep sea')).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(radio('Deep sea'), { key: 'Home' });
    expect(backgroundId()).toBe('classic');
  });

  it('Escape or a click outside closes it, and focus returns to the palette button', () => {
    renderApp({ seed: 1 });
    tableButton().focus();
    fireEvent.click(tableButton());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(tableButton()).toHaveFocus();
    fireEvent.click(tableButton());
    fireEvent.click(screen.getByTestId('table-picker-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the game is paused underneath, and only one panel is open at a time', () => {
    renderApp({ seed: 1 });
    fireEvent.click(stockButton());
    fireEvent.click(tableButton());
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(readout('moves')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.queryByRole('dialog', { name: 'Choose a table' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  });
});

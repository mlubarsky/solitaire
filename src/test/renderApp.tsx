import { act, render, screen, within } from '@testing-library/react';
import { expect, vi } from 'vitest';
import type { GameState } from '../engine';
import { App } from '../ui/App';

export function renderApp(props: { seed?: number; initialGame?: GameState } = {}) {
  return render(<App {...props} />);
}

export function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

export const readout = (name: 'score' | 'moves') => screen.getByTestId(name).textContent;

export const tableauColumn = (n: number) =>
  screen.getByRole('group', { name: `Tableau column ${n}` });
export const foundationPile = (n: number) => screen.getByRole('group', { name: `Foundation ${n}` });
export const wastePile = () => screen.getByRole('group', { name: 'Waste' });
export const stockButton = () => screen.getByRole('button', { name: /^Stock,/ });
export const undoButton = () => screen.getByRole('button', { name: 'Undo' });
export const newGameButton = () => screen.getByRole('button', { name: 'New game' });

/** Ids of the cards rendered inside a pile element, bottom first. */
export function cardIdsIn(pile: HTMLElement): string[] {
  return Array.from(pile.querySelectorAll<HTMLElement>('[data-card-id]')).map(
    (el) => el.dataset.cardId as string,
  );
}

export function cardButton(pile: HTMLElement, label: string): HTMLElement {
  return within(pile).getByRole('button', { name: label });
}

/** SPEC §5: there is no timer or clock anywhere. Asserts nothing time-like is rendered. */
export function expectNoClock(root: HTMLElement = document.body) {
  expect(root.querySelector('[data-testid*="time"], [role="timer"], time')).toBeNull();
  expect(root.textContent ?? '').not.toMatch(/\btime\b|\bclock\b|\b\d{1,2}:\d{2}\b/i);
}

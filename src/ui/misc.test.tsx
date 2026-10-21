import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeCard } from '../engine';
import { Card } from './Card';
import { Dialog } from './Dialog';
import { useReducedMotion } from './useMedia';
import { mediaState } from '../test/setup';

describe('Card', () => {
  it('renders faces, backs, and accessible labels', () => {
    const { rerender } = render(<Card card={makeCard('hearts', 12, true)} />);
    expect(screen.getByRole('img', { name: 'Q of hearts' })).toBeInTheDocument();
    // One pixel rank in the top-left; the center is a portrait.
    expect(document.querySelectorAll('[data-part="rank"][data-rank="Q"]')).toHaveLength(1);
    expect(screen.getByTestId('portrait-queen')).toBeInTheDocument();
    rerender(<Card card={makeCard('spades', 10, false)} />);
    expect(screen.getByRole('img', { name: 'face-down card' })).toBeInTheDocument();
    rerender(<Card card={makeCard('clubs', 1, true)} hidden />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('activates interactive cards with Enter or Space', () => {
    const onActivate = vi.fn();
    render(<Card card={makeCard('diamonds', 7, true)} interactive onActivate={onActivate} />);
    const card = screen.getByRole('button', { name: '7 of diamonds' });
    fireEvent.keyDown(card, { key: ' ' });
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: 'a' });
    expect(onActivate).toHaveBeenCalledTimes(2);
  });
});

describe('Dialog', () => {
  it('focuses the first button when nothing is marked autofocus', () => {
    render(<Dialog title="Hello" actions={<button type="button">OK</button>} />);
    expect(screen.getByRole('dialog', { name: 'Hello' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus();
  });
});

describe('useReducedMotion', () => {
  it('reads the media query', () => {
    mediaState.reducedMotion = true;
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });

  it('is false when matchMedia is unavailable', () => {
    const original = window.matchMedia;
    // @ts-expect-error simulate an old browser
    delete window.matchMedia;
    try {
      expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });
});

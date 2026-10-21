import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { bitmapWidth } from '../cards/pixelGlyphs';
import { dilate, rowsOnly, SMALL_FONT, textBitmap, TITLE_FONT } from './pixelFont';
import { PixelText, PixelTitle } from './PixelText';
import { LEAVE_MS, SHOWCASE, SHOWCASE_FADE_MS, SHOWCASE_MS, TitleScreen } from './TitleScreen';

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('pixel fonts', () => {
  it.each([
    ['small', SMALL_FONT, 7],
    ['title', TITLE_FONT, 9],
  ] as const)('every %s glyph is a clean rectangle %i pixels tall', (_name, font, height) => {
    for (const [ch, glyph] of Object.entries(font)) {
      expect(glyph, ch).toHaveLength(height);
      const width = bitmapWidth(glyph);
      for (const row of glyph) {
        expect(row).toMatch(/^[X.]+$/);
        expect(row).toHaveLength(width);
      }
    }
  });

  it('covers every letter the title screen writes', () => {
    for (const text of [
      'KLONDIKE · DRAW ONE',
      'PRESS ENTER',
      'TABLE THEMES',
      ...SHOWCASE.map((t) => t.name),
    ]) {
      expect(() => textBitmap(text, SMALL_FONT)).not.toThrow();
    }
    expect(() => textBitmap('SOLITAIRE', TITLE_FONT)).not.toThrow();
    expect(() => textBitmap('▶ PLAY', TITLE_FONT)).not.toThrow();
    expect(() => textBitmap('@', SMALL_FONT)).toThrow(/No pixel glyph/);
  });

  it('lays glyphs out left to right with a gap, uppercasing the text', () => {
    const bitmap = textBitmap('il', SMALL_FONT, 2);
    expect(bitmap).toHaveLength(7);
    expect(bitmap[0]).toBe('XXXXX..X....');
  });

  it('dilates a bitmap by one pixel in every direction', () => {
    expect(dilate(['X'])).toEqual(['XXX', 'XXX', 'XXX']);
    expect(dilate(['X..', '...', '...'])).toEqual(['XXX..', 'XXX..', 'XXX..', '.....', '.....']);
  });

  it('keeps only chosen rows', () => {
    expect(rowsOnly(['XX', 'XX', 'XX'], (y) => y === 1)).toEqual(['..', 'XX', '..']);
  });
});

describe('PixelText and PixelTitle', () => {
  it('draws text as a crisp SVG sized to the bitmap', () => {
    const { container } = render(<PixelText text="AB" />);
    const svg = container.querySelector('svg.pixel-text')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 11 7');
    expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
    expect(svg).toHaveAttribute('data-text', 'AB');
    const bold = render(<PixelText text="PLAY" bold />).container.querySelector('svg')!;
    expect(bold.getAttribute('viewBox')).toMatch(/ 9$/);
  });

  it('builds the arcade title from shadow, outline, fill, highlight and shade layers', () => {
    const { container } = render(<PixelTitle />);
    const layers = [...container.querySelectorAll('path')].map((p) => p.getAttribute('data-layer'));
    expect(layers).toEqual(['shadow', 'outline', 'fill', 'highlight', 'shade']);
    for (const path of container.querySelectorAll('path'))
      expect(path.getAttribute('d')).not.toBe('');
  });
});

describe('TitleScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  const liveText = () => screen.getByText(/^Showing the/).textContent;

  it('shows the title, a fan of cards and a focused Play button', () => {
    const { container } = render(<TitleScreen onPlay={vi.fn()} reducedMotion={false} animate />);
    expect(screen.getByRole('heading', { name: 'Solitaire' })).toBeInTheDocument();
    expect(container.querySelectorAll('.title-card svg.card-face')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Play' })).toHaveFocus();
  });

  it('cycles through every pixel table, crossfading from the previous one', () => {
    const { container } = render(<TitleScreen onPlay={vi.fn()} reducedMotion={false} animate />);
    const scenes = () => container.querySelectorAll('.title-bg canvas').length;
    expect(liveText()).toBe(`Showing the ${SHOWCASE[0]!.name} table`);
    expect(scenes()).toBe(1);
    advance(SHOWCASE_MS);
    expect(liveText()).toBe(`Showing the ${SHOWCASE[1]!.name} table`);
    expect(scenes()).toBe(2); // the old one stays under the new one while it fades in
    advance(SHOWCASE_FADE_MS);
    expect(scenes()).toBe(1);
    for (let i = 2; i < SHOWCASE.length; i++) advance(SHOWCASE_MS);
    advance(SHOWCASE_MS);
    expect(liveText()).toBe(`Showing the ${SHOWCASE[0]!.name} table`); // wraps around
  });

  it('the dots jump to a table and mark it current', () => {
    render(<TitleScreen onPlay={vi.fn()} reducedMotion={false} animate />);
    const last = SHOWCASE[SHOWCASE.length - 1]!;
    const dot = screen.getByRole('button', { name: `Show the ${last.name} table` });
    fireEvent.click(dot);
    expect(liveText()).toBe(`Showing the ${last.name} table`);
    expect(dot).toHaveAttribute('aria-current', 'true');
    fireEvent.click(dot); // already showing: nothing changes
    expect(liveText()).toBe(`Showing the ${last.name} table`);
  });

  it('Play fades to black, then starts the game once', () => {
    const onPlay = vi.fn();
    const { container } = render(<TitleScreen onPlay={onPlay} reducedMotion={false} animate />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(container.querySelector('.title-screen')).toHaveClass('leaving');
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    advance(LEAVE_MS - 1);
    expect(onPlay).not.toHaveBeenCalled();
    advance(1);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('Enter starts the game; with reduced motion it starts at once', () => {
    const onPlay = vi.fn();
    const { container } = render(<TitleScreen onPlay={onPlay} reducedMotion animate />);
    expect(container.querySelector('.title-screen')).toHaveClass('reduced-motion');
    fireEvent.keyDown(window, { key: 'a' });
    expect(onPlay).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onPlay).toHaveBeenCalledTimes(1);
  });
});

describe('App start-up', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
  });

  it('opens on the title screen, and Play deals a game', () => {
    renderApp();
    expect(screen.getByTestId('title-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('board')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    advance(LEAVE_MS);
    expect(screen.queryByTestId('title-screen')).toBeNull();
    expect(screen.getByTestId('board')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Stock, 24 cards/ })).toBeInTheDocument();
  });

  it('a deal link (?seed=) or a given seed skips the title screen', () => {
    window.history.replaceState(null, '', '/?seed=7');
    const { unmount } = renderApp();
    expect(screen.queryByTestId('title-screen')).toBeNull();
    unmount();
    window.history.replaceState(null, '', '/');
    renderApp({ seed: 7 });
    expect(screen.queryByTestId('title-screen')).toBeNull();
  });
});

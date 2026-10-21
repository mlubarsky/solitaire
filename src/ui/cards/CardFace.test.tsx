import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDeck, rankLabel, suitColor, type Card as CardModel } from '../../engine';
import { renderApp } from '../../test/renderApp';
import { Card } from '../Card';
import {
  bitmapPath,
  bitmapWidth,
  LARGE_SUITS,
  RANK_GLYPHS,
  rankBitmaps,
  rankPath,
  SMALL_SUITS,
  type Bitmap,
} from './pixelGlyphs';
import { CHEST_SUITS, CLOTHES, colorsFor, HAIR, mask, PIXEL_PORTRAITS } from './PixelPortrait';
import { SUIT_COLORS } from './suitPaths';

const deck = createDeck().map((c) => ({ ...c, faceUp: true }));

/** The first "M x y" of a path. */
function firstPoint(d: string): { x: number; y: number } {
  const m = /^M([\d.]+) ([\d.]+)/.exec(d);
  if (!m) throw new Error(`no move-to in ${d}`);
  return { x: Number(m[1]), y: Number(m[2]) };
}

/** Bounding box of every "M x y h w v h" rectangle in a path. */
function bounds(d: string) {
  const rects = [...d.matchAll(/M([\d.]+) ([\d.]+)h([\d.]+)v([\d.]+)/g)].map((m) =>
    m.slice(1).map(Number),
  );
  return {
    x0: Math.min(...rects.map((r) => r[0]!)),
    y0: Math.min(...rects.map((r) => r[1]!)),
    x1: Math.max(...rects.map((r) => r[0]! + r[2]!)),
    y1: Math.max(...rects.map((r) => r[1]! + r[3]!)),
  };
}

function renderPixelCard(card: CardModel) {
  const { container } = render(<Card card={card} />);
  return container.querySelector('svg.card-face') as SVGSVGElement;
}

describe('pixel glyphs', () => {
  const all: [string, Bitmap][] = [
    ...Object.entries(RANK_GLYPHS),
    ...Object.entries(SMALL_SUITS).map(([k, v]) => [`small ${k}`, v] as [string, Bitmap]),
    ...Object.entries(LARGE_SUITS).map(([k, v]) => [`large ${k}`, v] as [string, Bitmap]),
  ];

  it.each(all)('%s is a clean rectangular bitmap', (_name, bitmap) => {
    const width = bitmapWidth(bitmap);
    for (const row of bitmap) {
      expect(row).toMatch(/^[X.]+$/);
      expect(row).toHaveLength(width);
    }
    expect(bitmap.join('')).toContain('X');
  });

  it('has a glyph for every rank label, all 9 pixels tall', () => {
    for (let rank = 1; rank <= 13; rank++) {
      const glyphs = rankBitmaps(rankLabel(rank as CardModel['rank']));
      expect(glyphs.length).toBeGreaterThan(0);
      for (const glyph of glyphs) expect(glyph).toHaveLength(9);
    }
    expect(rankBitmaps('10')).toEqual([RANK_GLYPHS['1'], RANK_GLYPHS['0']]);
  });

  it('merges each run of filled pixels in a row into one rectangle', () => {
    expect(bitmapPath(['XX.X', '.XX.'], 10, 20, 2)).toBe(
      'M10 20h4v2h-4zM16 20h2v2h-2zM12 22h4v2h-4z',
    );
    expect(bitmapPath(['....'], 0, 0, 1)).toBe('');
  });

  it('lays out "10" with one pixel between the glyphs', () => {
    const d = rankPath('10', 0, 0, 1);
    const one = bitmapWidth(RANK_GLYPHS['1']!);
    expect(bounds(d).x1).toBe(one + 1 + bitmapWidth(RANK_GLYPHS['0']!));
  });
});

describe('card faces: rank top-left, suit top-right, pixel suit or portrait center', () => {
  it.each(deck.map((c) => [c.id, c] as const))('%s', (_id, card) => {
    const svg = renderPixelCard(card);
    const color = SUIT_COLORS[suitColor(card.suit)];
    expect(svg.querySelectorAll('text')).toHaveLength(0);

    const rank = svg.querySelectorAll('[data-part="rank"]');
    expect(rank).toHaveLength(1);
    expect(rank[0]).toHaveAttribute('data-rank', rankLabel(card.rank));
    expect(rank[0]).toHaveAttribute('fill', color);
    expect(rank[0]).toHaveAttribute('shape-rendering', 'crispEdges');
    const r = bounds(rank[0]!.getAttribute('d')!);
    expect(r.x0).toBeLessThan(40);
    expect(r.y1).toBeLessThan(80); // inside the corner row

    const suit = svg.querySelectorAll('[data-part="suit"]');
    expect(suit).toHaveLength(1);
    expect(suit[0]).toHaveAttribute('fill', color);
    const s = bounds(suit[0]!.getAttribute('d')!);
    expect(s.x0).toBeGreaterThan(150);
    expect(s.x1).toBeLessThanOrEqual(240);
    expect(s.y1).toBeLessThan(80);
    // The rank never runs into the corner suit (even "10").
    expect(r.x1).toBeLessThan(s.x0);

    const center = svg.querySelectorAll('[data-part="center"]');
    expect(center).toHaveLength(1);
    if (card.rank > 10) {
      const figure = { 11: 'jack', 12: 'queen', 13: 'king' }[card.rank as 11 | 12 | 13];
      expect(center[0]).toHaveAttribute('data-testid', `portrait-${figure}`);
      expect(center[0]).toHaveAttribute('data-style', 'pixel');
      expect(center[0]).toHaveAttribute('shape-rendering', 'crispEdges');
      const fills = [...center[0]!.querySelectorAll('path')].map((p) => p.getAttribute('fill'));
      expect(fills).toContain(HAIR[card.suit]);
      expect(fills).toContain(CLOTHES[card.suit].main);
      expect(center[0]!.querySelector('[data-part="chest-suit"]')!.getAttribute('d')).not.toBe('');
    } else {
      expect(center[0]).toHaveAttribute('fill', color);
      expect(center[0]).toHaveAttribute('shape-rendering', 'crispEdges');
      const c = bounds(center[0]!.getAttribute('d')!);
      expect(Math.abs((c.x0 + c.x1) / 2 - 125)).toBeLessThan(1);
      expect(firstPoint(center[0]!.getAttribute('d')!).y).toBeGreaterThan(140);
    }
  });
});

describe('pixel portraits', () => {
  it.each(Object.entries(PIXEL_PORTRAITS))(
    '%s is a 24×24 bitmap of known color codes',
    (_name, bitmap) => {
      const codes = new Set(Object.keys(colorsFor('hearts')));
      expect(bitmap).toHaveLength(24);
      for (const row of bitmap) {
        expect(row).toHaveLength(24);
        for (const ch of row) if (ch !== '.') expect(codes.has(ch)).toBe(true);
      }
    },
  );

  it('keeps the classic cues: crown and beard, tiara and long hair, cap and feather', () => {
    const { king, queen, jack } = PIXEL_PORTRAITS;
    const eyesRow = (b: Bitmap) => b.findIndex((row) => row.includes('E'));
    const hairBelowEyes = (b: Bitmap) =>
      b.slice(eyesRow(b) + 3).filter((row) => row.includes('H')).length;
    // King: crown jewels on top, a big beard below the eyes.
    expect(king.slice(0, 5).join('')).toMatch(/R.*B.*R/);
    expect(hairBelowEyes(king)).toBeGreaterThanOrEqual(6);
    // Queen: a jewel on top and hair hanging down past the chin.
    expect(queen[0]).toContain('B');
    expect(hairBelowEyes(queen)).toBeGreaterThanOrEqual(6);
    // Jack: a cap (no jewels, no beard) with a feather.
    expect(jack.join('')).not.toMatch(/[RB]/);
    expect(jack.slice(0, 6).join('')).toContain('k');
    expect(hairBelowEyes(jack)).toBeLessThan(2);
    expect(new Set([king, queen, jack].map((b) => b.join('')))).toHaveProperty('size', 3);
  });

  it('masks one color code at a time', () => {
    expect(mask(['aXb.', 'bba.'], 'b')).toEqual(['..X.', 'XX..']);
  });

  it('has a chest suit for every suit', () => {
    for (const bitmap of Object.values(CHEST_SUITS)) {
      expect(bitmap.join('')).toContain('X');
      for (const row of bitmap) expect(row).toHaveLength(6);
    }
  });
});

describe('foundation slots', () => {
  it('each empty foundation shows its own pixel suit (♠ ♥ ♦ ♣) and names it', () => {
    renderApp({ seed: 3 });
    ['spades', 'hearts', 'diamonds', 'clubs'].forEach((suit, i) => {
      const pile = screen.getByRole('group', { name: `Foundation ${i + 1}, ${suit}` });
      expect(pile.querySelector('.slot-suit')).toHaveAttribute('data-suit', suit);
      expect(pile.querySelector('.slot-suit path')).toHaveAttribute(
        'shape-rendering',
        'crispEdges',
      );
    });
  });
});

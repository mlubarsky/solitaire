import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cardLabel, createDeck, rankLabel, suitColor, type Card as CardModel } from '../../engine';
import { Card } from '../Card';
import { SUIT_COLORS, SUIT_PATHS } from './suitPaths';

const deck = createDeck().map((c) => ({ ...c, faceUp: true }));

function renderCard(card: CardModel) {
  const { container } = render(<Card card={card} />);
  const el = container.querySelector('[data-card-id]') as HTMLElement;
  const svg = el.querySelector('svg.card-face') as SVGSVGElement;
  return { el, svg };
}

/** Center point of an element's transform `translate(x y) scale(s)` in the 250×350 box. */
function suitCenter(path: Element): { x: number; y: number; size: number } {
  const m = /translate\(([\d.-]+) ([\d.-]+)\) scale\(([\d.]+)\)/.exec(
    path.getAttribute('transform') ?? '',
  );
  if (!m) throw new Error('no transform');
  const size = Number(m[3]) * 100;
  return { x: Number(m[1]) + size / 2, y: Number(m[2]) + size / 2, size };
}

describe('card faces (SPEC §7: rank top-left, suit top-right, big symbol center)', () => {
  it.each(deck.map((c) => [c.id, c] as const))('%s', (_id, card) => {
    const { el, svg } = renderCard(card);
    const color = SUIT_COLORS[suitColor(card.suit)];
    expect(el).toHaveAttribute('aria-label', cardLabel(card));

    // Exactly one rank text, in the top-left corner.
    const rank = svg.querySelectorAll('[data-part="rank"]');
    expect(rank).toHaveLength(1);
    expect(rank[0]!.textContent).toBe(rankLabel(card.rank));
    expect(Number(rank[0]!.getAttribute('x'))).toBeLessThan(40);
    expect(Number(rank[0]!.getAttribute('y'))).toBeLessThan(90);
    expect(rank[0]).toHaveAttribute('fill', color);

    // Exactly one corner suit symbol, in the top-right corner.
    const suit = svg.querySelectorAll('[data-part="suit"]');
    expect(suit).toHaveLength(1);
    expect(suit[0]).toHaveAttribute('d', SUIT_PATHS[card.suit]);
    expect(suit[0]).toHaveAttribute('fill', color);
    const corner = suitCenter(suit[0]!);
    expect(corner.x).toBeGreaterThan(170);
    expect(corner.y).toBeLessThan(60);

    // One center element: big suit for A–10, a portrait headshot (not a letter) for J/Q/K.
    const center = svg.querySelectorAll('[data-part="center"]');
    expect(center).toHaveLength(1);
    if (card.rank > 10) {
      const figure = { 11: 'jack', 12: 'queen', 13: 'king' }[card.rank as 11 | 12 | 13];
      expect(center[0]).toHaveAttribute('data-testid', `portrait-${figure}`);
      expect(center[0]!.tagName.toLowerCase()).toBe('g');
      expect(center[0]!.textContent).toBe('');
      expect(svg.querySelectorAll('text')).toHaveLength(1); // only the corner rank
      // Clothing in the suit color family with a small suit symbol on the chest.
      expect(center[0]!.querySelector('[data-part="chest-suit"]')).toHaveAttribute(
        'd',
        SUIT_PATHS[card.suit],
      );
    } else {
      expect(center[0]).toHaveAttribute('fill', color);
      expect(center[0]).toHaveAttribute('d', SUIT_PATHS[card.suit]);
      const c = suitCenter(center[0]!);
      expect(c.x).toBe(125);
      expect(c.size / 250).toBeGreaterThanOrEqual(0.5);
      expect(c.size / 250).toBeLessThanOrEqual(0.56);
    }

    // Nothing else is drawn: only those three elements.
    expect(svg.children).toHaveLength(3);
  });

  it('a 7 has exactly two suit symbols (corner + center): no pips, no bottom index', () => {
    const { svg } = renderCard({ id: 'H7', suit: 'hearts', rank: 7, faceUp: true });
    const suitShapes = Array.from(svg.querySelectorAll('path')).filter(
      (p) => p.getAttribute('d') === SUIT_PATHS.hearts,
    );
    expect(suitShapes).toHaveLength(2);
    expect(svg.querySelectorAll('text')).toHaveLength(1);
    expect(svg.querySelector('[transform*="rotate"]')).toBeNull();
  });

  it('uses red for hearts/diamonds and near-black for spades/clubs', () => {
    expect(SUIT_COLORS).toEqual({ red: '#d32f2f', black: '#1f1f1f' });
    for (const [id, suit, color] of [
      ['HK', 'hearts', '#d32f2f'],
      ['DQ', 'diamonds', '#d32f2f'],
      ['SJ', 'spades', '#1f1f1f'],
      ['CA', 'clubs', '#1f1f1f'],
    ] as const) {
      const { svg } = renderCard({ id, suit, rank: 1, faceUp: true });
      svg.querySelectorAll('[fill]').forEach((n) => expect(n).toHaveAttribute('fill', color));
    }
  });
});

describe('face-card portraits', () => {
  const faces = deck.filter((c) => c.rank > 10);
  const portrait = (card: CardModel) =>
    renderCard(card).svg.querySelector('[data-part="center"]') as SVGGElement;

  it('the three ranks wear structurally different headwear', () => {
    for (const suit of ['hearts', 'spades'] as const) {
      const headwear = ([11, 12, 13] as const).map((rank) => {
        const p = portrait({ id: 'x', suit, rank, faceUp: true });
        const hw = p.querySelectorAll('[data-headwear]');
        expect(hw).toHaveLength(1);
        return { kind: hw[0]!.getAttribute('data-headwear'), markup: hw[0]!.innerHTML };
      });
      expect(headwear.map((h) => h.kind)).toEqual(['cap', 'tiara', 'crown']);
      expect(new Set(headwear.map((h) => h.markup)).size).toBe(3);
    }
  });

  it('the King has a beard and a tall crown; the Jack has a feather; the Queen long hair', () => {
    const king = portrait({ id: 'SK', suit: 'spades', rank: 13, faceUp: true });
    expect(king.querySelector('[data-part="beard"]')).not.toBeNull();
    expect(king.querySelector('[data-headwear="crown"]')).not.toBeNull();
    const queen = portrait({ id: 'HQ', suit: 'hearts', rank: 12, faceUp: true });
    expect(queen.querySelector('[data-part="long-hair"]')).not.toBeNull();
    expect(queen.querySelector('[data-part="beard"]')).toBeNull();
    const jack = portrait({ id: 'DJ', suit: 'diamonds', rank: 11, faceUp: true });
    expect(jack.querySelector('[data-part="feather"]')).not.toBeNull();
    expect(jack.querySelector('[data-part="beard"]')).toBeNull();
  });

  it('hair color varies per suit, so all 12 face cards are distinct', () => {
    const hair = new Set(
      (['spades', 'hearts', 'diamonds', 'clubs'] as const).map((suit) =>
        portrait({ id: 'x', suit, rank: 13, faceUp: true }).getAttribute('data-hair'),
      ),
    );
    expect(hair.size).toBe(4);
    const markup = faces.map((c) => renderCard(c).svg.outerHTML);
    expect(new Set(markup).size).toBe(12);
  });

  it('is a centered headshot about 60–65% of the card width', () => {
    const p = portrait({ id: 'CQ', suit: 'clubs', rank: 12, faceUp: true });
    const m = /translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/.exec(
      p.getAttribute('transform') ?? '',
    );
    const width = 160 * Number(m![3]);
    expect(width / 250).toBeGreaterThanOrEqual(0.6);
    expect(width / 250).toBeLessThanOrEqual(0.66);
    expect(Number(m![1]) + width / 2).toBeCloseTo(125, 5);
  });
});

describe('card back', () => {
  it('renders the same for every card', () => {
    const backs = deck.map((c) => {
      const { el } = renderCard({ ...c, faceUp: false });
      expect(el).toHaveAttribute('aria-label', 'face-down card');
      expect(el.querySelector('svg')).toBeNull();
      return el.innerHTML;
    });
    expect(new Set(backs).size).toBe(1);
    expect(backs[0]).toContain('card-back-field');
  });
});

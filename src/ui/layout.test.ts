import { describe, expect, it } from 'vitest';
import { CORNER_ROW } from './cards/CardFace';
import { pickDropTarget } from './hitTest';
import {
  CARD_SCALE,
  CARD_ASPECT,
  EDGE_RATIO,
  FACE_UP_OFFSET,
  MAX_CARD_WIDTH,
  MIN_CARD_WIDTH,
  MIN_EDGE,
  MIN_FACE_UP_OFFSET,
  columnHeight,
  computeLayout,
  fanOffsets,
  scaledCardWidth,
  slotRect,
  wasteFan,
  wasteRect,
  type Box,
  type Layout,
} from './layout';

/** Every pile's board-relative rect (tableau columns as a single card slot). */
function pileRects(l: Layout): { id: string; rect: Box }[] {
  return [
    { id: 'stock', rect: slotRect(l, l.stock) },
    { id: 'waste', rect: wasteRect(l) },
    ...l.foundations.map((p, i) => ({ id: `f${i}`, rect: slotRect(l, p) })),
    ...l.tableauX.map((x, i) => ({ id: `t${i}`, rect: slotRect(l, { x, y: l.tableauY }) })),
  ];
}

const overlaps = (a: Box, b: Box) =>
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

describe('computeLayout: card size', () => {
  it('scales card width with the viewport', () => {
    expect(computeLayout(900, 2000).cardWidth).toBeGreaterThan(computeLayout(700, 2000).cardWidth);
    expect(computeLayout(500, 2000).cardWidth).toBeGreaterThan(computeLayout(330, 2000).cardWidth);
  });

  it('respects the min and max card width', () => {
    expect(computeLayout(3000, 3000).cardWidth).toBe(MAX_CARD_WIDTH);
    expect(computeLayout(200, 600).cardWidth).toBe(MIN_CARD_WIDTH);
    expect(computeLayout(320, 568).cardWidth).toBe(MIN_CARD_WIDTH);
    expect(computeLayout(800, 100).cardWidth).toBe(MIN_CARD_WIDTH);
    for (const [w, h] of [
      [375, 667],
      [1280, 800],
      [1920, 1080],
    ] as const) {
      const { cardWidth } = computeLayout(w, h);
      expect(cardWidth).toBeGreaterThanOrEqual(MIN_CARD_WIDTH);
      expect(cardWidth).toBeLessThanOrEqual(MAX_CARD_WIDTH);
    }
  });

  it('keeps a 5:7 aspect ratio', () => {
    for (const [w, h] of [
      [375, 667],
      [1280, 800],
      [1920, 1080],
      [768, 1024],
    ] as const) {
      const l = computeLayout(w, h);
      expect(l.cardHeight / l.cardWidth).toBeCloseTo(CARD_ASPECT, 1);
    }
  });
});

describe('revision 3: card scale', () => {
  const viewports = [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
    [1024, 768],
    [800, 600],
    [375, 667],
    [320, 568],
    [3000, 3000],
  ] as const;

  it.each(viewports)('%i×%i: card width = 0.88 × the space-limited width, ≤ 105 px', (w, h) => {
    const l = computeLayout(w, h);
    expect(CARD_SCALE).toBe(0.88);
    expect(MAX_CARD_WIDTH).toBe(105);
    expect(l.cardWidth).toBeLessThanOrEqual(105);
    expect(l.cardWidth).toBeGreaterThanOrEqual(MIN_CARD_WIDTH);
    const expected = Math.min(
      MAX_CARD_WIDTH,
      Math.max(MIN_CARD_WIDTH, CARD_SCALE * l.fitCardWidth),
    );
    expect(Math.abs(l.cardWidth - expected)).toBeLessThanOrEqual(1);
    // Gaps scale with the card width.
    expect(l.gap / l.cardWidth).toBeLessThan(0.2);
  });

  it('scaledCardWidth applies the scale, then clamps', () => {
    expect(scaledCardWidth(100)).toBe(88);
    expect(scaledCardWidth(1000)).toBe(105);
    expect(scaledCardWidth(10)).toBe(MIN_CARD_WIDTH);
  });

  it.each([
    [1280, 800],
    [1920, 1080],
    [2560, 1440],
    [800, 600],
    [600, 700],
  ] as const)('%i×%i: side columns hug the viewport edges, tableau centered', (w, h) => {
    const l = computeLayout(w, h);
    const edge = Math.max(MIN_EDGE, Math.round(EDGE_RATIO * l.cardWidth));
    expect(l.stock.x).toBe(edge);
    expect(l.waste.x).toBe(edge);
    for (const f of l.foundations) expect(w - (f.x + l.cardWidth)).toBe(edge);
    // Tableau centered within 1 px.
    const left = l.tableauX[0]!;
    const right = w - (l.tableauX[6]! + l.cardWidth);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    expect(l.tableauLeft).toBe(left);
    expect(l.tableauWidth).toBe(7 * l.cardWidth + 6 * l.gap);
    // At least a normal column gap between each side column and the tableau.
    expect(left - (l.stock.x + l.cardWidth)).toBeGreaterThanOrEqual(l.gap);
    expect(l.foundations[0]!.x - (l.tableauX[6]! + l.cardWidth)).toBeGreaterThanOrEqual(l.gap);
  });
});

describe('computeLayout: side layout (width ≥ 600)', () => {
  const sizes = [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
    [1024, 768],
    [800, 600],
  ] as const;

  it.each(sizes)('%i×%i: stock/waste left, tableau center, foundations right', (w, h) => {
    const l = computeLayout(w, h);
    expect(l.mode).toBe('side');
    const rects = pileRects(l);
    // Everything fits the width and nothing overlaps.
    for (const { rect } of rects) {
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.left + rect.width).toBeLessThanOrEqual(w);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(overlaps(rects[i]!.rect, rects[j]!.rect), `${rects[i]!.id} vs ${rects[j]!.id}`).toBe(
          false,
        );
      }
    }
    // Left column: stock above the waste; both left of tableau column 1.
    expect(l.waste.x).toBe(l.stock.x);
    expect(l.waste.y).toBeGreaterThan(l.stock.y + l.cardHeight);
    expect(l.wasteFan.dx).toBe(0);
    expect(l.wasteFan.dy / l.cardHeight).toBeCloseTo(0.22, 1);
    expect(wasteRect(l).left + wasteRect(l).width).toBeLessThan(l.tableauX[0]!);
    // Right column: 4 foundations stacked top to bottom, right of tableau column 7.
    const lastColumnRight = l.tableauX[6]! + l.cardWidth;
    l.foundations.forEach((f, i) => {
      expect(f.x).toBeGreaterThan(lastColumnRight);
      if (i > 0) expect(f.y).toBeGreaterThanOrEqual(l.foundations[i - 1]!.y + l.cardHeight);
      expect(f.x).toBe(l.foundations[0]!.x);
    });
    // The 4 foundations fit the height.
    expect(l.foundations[3]!.y + l.cardHeight).toBeLessThanOrEqual(l.boardHeight);
    // Side columns at equal edge margins; board spans between them.
    const right = w - (l.boardLeft + l.boardWidth);
    expect(Math.abs(l.boardLeft - right)).toBeLessThanOrEqual(1);
    expect(l.stock.x).toBe(l.boardLeft);
    expect(l.foundations[0]!.x + l.cardWidth).toBe(l.boardLeft + l.boardWidth);
    expect(l.topBarHeight + l.boardHeight).toBe(h);
  });
});

describe('computeLayout: narrow layout (width < 600)', () => {
  it.each([375, 320, 599])('%i px wide: top row with no horizontal overflow', (w) => {
    const l = computeLayout(w, 667);
    expect(l.mode).toBe('narrow');
    const rects = pileRects(l);
    for (const { rect } of rects) {
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.left + rect.width).toBeLessThanOrEqual(w);
    }
    // Stock + horizontal waste fan at top-left, foundations at top-right, tableau below.
    expect(l.stock.y).toBe(l.waste.y);
    expect(l.wasteFan.dy).toBe(0);
    expect(l.wasteFan.dx).toBeGreaterThan(0);
    expect(wasteRect(l).left + wasteRect(l).width).toBeLessThanOrEqual(l.foundations[0]!.x);
    l.foundations.forEach((f) => expect(f.y).toBe(l.stock.y));
    expect(l.tableauY).toBeGreaterThan(l.stock.y + l.cardHeight);
    expect(l.tableauY + l.tableauMaxHeight).toBeLessThanOrEqual(l.boardHeight);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(overlaps(rects[i]!.rect, rects[j]!.rect)).toBe(false);
      }
    }
  });
});

describe('wasteFan', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);

  it.each([
    [0, []],
    [1, ['c0']],
    [2, ['c0', 'c1']],
    [3, ['c0', 'c1', 'c2']],
    [10, ['c7', 'c8', 'c9']],
  ])('waste of %i shows %j, only the newest interactive', (n, shown) => {
    const fan = wasteFan(ids(n));
    expect(fan.map((f) => f.card)).toEqual(shown);
    expect(fan.map((f) => f.slot)).toEqual(shown.map((_, i) => i));
    expect(fan.map((f) => f.index)).toEqual(shown.map((_, i) => n - shown.length + i));
    expect(fan.filter((f) => f.interactive).map((f) => f.card)).toEqual(n ? [`c${n - 1}`] : []);
  });

  it('re-forms from the remaining waste after the top card is played', () => {
    const waste = ids(10);
    expect(wasteFan(waste.slice(0, -1)).map((f) => f.card)).toEqual(['c6', 'c7', 'c8']);
    expect(wasteFan(waste.slice(0, -1)).at(-1)).toMatchObject({ card: 'c8', interactive: true });
  });
});

describe('hit-testing the vertically stacked foundations', () => {
  it('dropping on F3 in the right column targets foundation index 2', () => {
    const l = computeLayout(1280, 800);
    const targets = pileRects(l).filter((t) => t.id.startsWith('f') || t.id.startsWith('t'));
    const f3 = slotRect(l, l.foundations[2]!);
    // A dragged card slightly offset from F3 (overlapping F2/F4 a little less).
    const dragged = { ...f3, left: f3.left - 8, top: f3.top + 20 };
    expect(pickDropTarget(dragged, targets)).toBe('f2');
    expect(pickDropTarget({ ...f3, top: f3.top - 30 }, targets)).toBe('f2');
    const f1 = slotRect(l, l.foundations[0]!);
    expect(pickDropTarget({ ...f1, top: f1.top + 10 }, targets)).toBe('f0');
  });
});

describe('fanOffsets', () => {
  const down = { faceUp: false };
  const up = { faceUp: true };

  it('offsets face-down cards by ~12% and face-up by ~25% of the card height', () => {
    expect(fanOffsets([down, down, up, up], 100, 1000)).toEqual([0, 12, 24, 49]);
    expect(fanOffsets([], 100, 1000)).toEqual([]);
    expect(fanOffsets([up], 100, 50)).toEqual([0]);
  });

  it('never compresses face-up cards below the readable corner row', () => {
    expect(MIN_FACE_UP_OFFSET).toBeGreaterThanOrEqual(CORNER_ROW);
    expect(MIN_FACE_UP_OFFSET).toBeLessThanOrEqual(FACE_UP_OFFSET);
    const offsets = fanOffsets([up, up, up], 100, 80);
    expect(offsets[1]).toBeCloseTo(23, 5);
    expect(offsets[2]).toBeCloseTo(46, 5);
  });

  it('compresses a 19-card column to fit the available height', () => {
    const column = [...Array(6).fill(down), ...Array(13).fill(up)];
    for (const [w, h] of [
      [375, 667],
      [320, 568],
      [1280, 720],
      [800, 600],
      [1920, 1080],
    ] as const) {
      const l = computeLayout(w, h);
      const offsets = fanOffsets(column, l.cardHeight, l.tableauMaxHeight);
      expect(offsets).toHaveLength(19);
      expect(columnHeight(offsets, l.cardHeight)).toBeLessThanOrEqual(l.tableauMaxHeight + 0.001);
      for (let i = 1; i < offsets.length; i++) expect(offsets[i]!).toBeGreaterThan(offsets[i - 1]!);
      for (let i = 7; i < offsets.length; i++) {
        expect(offsets[i]! - offsets[i - 1]!).toBeGreaterThanOrEqual(
          MIN_FACE_UP_OFFSET * l.cardHeight - 0.001,
        );
      }
    }
  });

  it('squeezes face-down cards before face-up cards', () => {
    // Natural: 4 × 12 + 2 × 25 = 98 → needs 198px. With 170px, only face-down cards shrink.
    const column = [down, down, down, down, up, up, up];
    const offsets = fanOffsets(column, 100, 170);
    expect(offsets[4]! - offsets[3]!).toBeCloseTo(5, 5);
    expect(offsets[5]! - offsets[4]!).toBe(25);
    expect(columnHeight(offsets, 100)).toBeCloseTo(170, 5);
    // With 166px, face-down cards are at their minimum and face-up cards shrink too.
    const tight = fanOffsets(column, 100, 166);
    expect(tight[1]! - tight[0]!).toBeCloseTo(5, 5);
    expect(tight[6]! - tight[5]!).toBeCloseTo(23, 5);
  });

  it('handles all-face-down columns with little room', () => {
    const offsets = fanOffsets([down, down, down, up], 100, 110);
    expect(columnHeight(offsets, 100)).toBeCloseTo(110, 5);
    expect(offsets[1]! - offsets[0]!).toBeCloseTo(10 / 3, 5);
  });

  it('computes column height', () => {
    expect(columnHeight([], 140)).toBe(140);
    expect(columnHeight([0, 35], 140)).toBe(175);
  });
});

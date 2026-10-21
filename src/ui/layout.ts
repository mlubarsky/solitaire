/** Pure layout math: card size, pile positions, waste fan, and tableau fan offsets. */

export const CARD_ASPECT = 7 / 5; // height / width
export const MIN_CARD_WIDTH = 40;
export const MAX_CARD_WIDTH = 105;
/** Cards are drawn at 88% of the size the space allows, for breathing room (SPEC §7). */
export const CARD_SCALE = 0.88;
/** Below this viewport width the compact top-row layout is used (SPEC §2). */
export const NARROW_BREAKPOINT = 600;
export const GAP_RATIO = 0.16; // gap between tableau columns, relative to card width
export const SIDE_GAP_RATIO = 0.5; // minimum gap between the side columns and the tableau
/** Side columns are inset from the viewport edges by this × card width (at least MIN_EDGE). */
export const EDGE_RATIO = 0.25;
export const MIN_EDGE = 16;
export const FOUNDATION_GAP_RATIO = 0.12; // vertical gap between stacked foundations
export const NARROW_GAP_RATIO = 0.12;
export const FACE_DOWN_OFFSET = 0.12; // relative to card height
export const FACE_UP_OFFSET = 0.25; // relative to card height
/**
 * Compression never squeezes face-up cards below this, so the corner row (rank + suit, ≈ 22.9%
 * of the card height) of every covered card stays readable (SPEC §7).
 */
export const MIN_FACE_UP_OFFSET = 0.23;
/** Waste fan offset: ≈22% of card height (vertical, side layout). */
export const WASTE_FAN_V = 0.22;
/** Waste fan offset relative to card width (horizontal, narrow layout). */
export const WASTE_FAN_H = 0.4;

export type LayoutMode = 'side' | 'narrow';

export interface Point {
  x: number;
  y: number;
}

export interface Layout {
  mode: LayoutMode;
  viewportWidth: number;
  viewportHeight: number;
  topBarHeight: number;
  /** Board (play area below the top bar) height. */
  boardHeight: number;
  /** The largest card width the space allows (before CARD_SCALE and clamping). */
  fitCardWidth: number;
  cardWidth: number;
  cardHeight: number;
  /** Gap between tableau columns. */
  gap: number;
  /** Horizontal extent of everything on the board (relative to the board). */
  boardLeft: number;
  boardWidth: number;
  /** Left edge and width of the 7 tableau columns. */
  tableauLeft: number;
  tableauWidth: number;
  stock: Point;
  /** Position of the oldest visible waste card; newer cards step by `wasteFan`. */
  waste: Point;
  wasteFan: { dx: number; dy: number };
  foundations: readonly Point[];
  tableauX: readonly number[];
  tableauY: number;
  /** Maximum height a tableau column may occupy (from tableauY). */
  tableauMaxHeight: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Card width for a given space-limited width: scaled by CARD_SCALE, then clamped. */
export function scaledCardWidth(fitCardWidth: number): number {
  return Math.floor(clamp(fitCardWidth * CARD_SCALE, MIN_CARD_WIDTH, MAX_CARD_WIDTH));
}

function sideLayout(vw: number, vh: number): Layout {
  const topBarHeight = 56;
  const topPad = 16;
  const bottomPad = 12;
  const boardHeight = Math.max(0, vh - topBarHeight);
  // Width: edge margins + stock column + 7 tableau columns + foundation column + gaps.
  const columns = 9 + 6 * GAP_RATIO + 2 * SIDE_GAP_RATIO;
  const byWidth = Math.min(vw / (columns + 2 * EDGE_RATIO), (vw - 2 * MIN_EDGE) / columns);
  // Height: the 4 stacked foundations must fit.
  const byHeight =
    (boardHeight - topPad - bottomPad) / (4 * CARD_ASPECT + 3 * FOUNDATION_GAP_RATIO);
  const fitCardWidth = Math.min(byWidth, byHeight);
  const cardWidth = scaledCardWidth(fitCardWidth);
  const cardHeight = Math.round(cardWidth * CARD_ASPECT);
  const gap = Math.round(cardWidth * GAP_RATIO);
  const fGap = Math.round(cardWidth * FOUNDATION_GAP_RATIO);
  // Side columns hug the viewport edges; the tableau is centered between them (SPEC §2).
  const edge = Math.max(MIN_EDGE, Math.round(cardWidth * EDGE_RATIO));
  const boardLeft = edge;
  const boardWidth = vw - 2 * edge;
  const foundationX = vw - edge - cardWidth;
  const tableauWidth = 7 * cardWidth + 6 * gap;
  const tableauLeft = Math.floor((vw - tableauWidth) / 2);
  return {
    mode: 'side',
    viewportWidth: vw,
    viewportHeight: vh,
    topBarHeight,
    boardHeight,
    fitCardWidth,
    cardWidth,
    cardHeight,
    gap,
    boardLeft,
    boardWidth,
    tableauLeft,
    tableauWidth,
    stock: { x: boardLeft, y: topPad },
    waste: { x: boardLeft, y: topPad + cardHeight + Math.round(cardHeight * 0.18) },
    wasteFan: { dx: 0, dy: Math.round(cardHeight * WASTE_FAN_V) },
    foundations: [0, 1, 2, 3].map((i) => ({ x: foundationX, y: topPad + i * (cardHeight + fGap) })),
    tableauX: [0, 1, 2, 3, 4, 5, 6].map((i) => tableauLeft + i * (cardWidth + gap)),
    tableauY: topPad,
    tableauMaxHeight: Math.max(cardHeight, boardHeight - topPad - bottomPad),
  };
}

function narrowLayout(vw: number, vh: number): Layout {
  const topBarHeight = 52;
  const pad = 4;
  const topPad = 10;
  const bottomPad = 8;
  const boardHeight = Math.max(0, vh - topBarHeight);
  const gapFor = (w: number) => Math.max(3, Math.round(w * NARROW_GAP_RATIO));
  const byWidth = (vw - 2 * pad) / (7 + 6 * NARROW_GAP_RATIO);
  // Keep about 4.5 card heights of room for the top row plus the tableau.
  const byHeight = (boardHeight - topPad - bottomPad) / (4.5 * CARD_ASPECT);
  const fitCardWidth = Math.min(byWidth, byHeight);
  let cardWidth = scaledCardWidth(fitCardWidth);
  // Rounding the gap up can overflow by a pixel or two; shrink until the row fits.
  while (cardWidth > MIN_CARD_WIDTH && 7 * cardWidth + 6 * gapFor(cardWidth) > vw - 2 * pad) {
    cardWidth--;
  }
  const cardHeight = Math.round(cardWidth * CARD_ASPECT);
  const gap = gapFor(cardWidth);
  const boardWidth = 7 * cardWidth + 6 * gap;
  const boardLeft = Math.max(0, Math.floor((vw - boardWidth) / 2));
  const col = (i: number) => boardLeft + i * (cardWidth + gap);
  const tableauY = topPad + cardHeight + Math.max(gap, Math.round(cardHeight * 0.16));
  return {
    mode: 'narrow',
    viewportWidth: vw,
    viewportHeight: vh,
    topBarHeight,
    boardHeight,
    fitCardWidth,
    cardWidth,
    cardHeight,
    gap,
    boardLeft,
    boardWidth,
    tableauLeft: boardLeft,
    tableauWidth: boardWidth,
    stock: { x: col(0), y: topPad },
    waste: { x: col(1), y: topPad },
    wasteFan: { dx: Math.round(cardWidth * WASTE_FAN_H), dy: 0 },
    foundations: [3, 4, 5, 6].map((i) => ({ x: col(i), y: topPad })),
    tableauX: [0, 1, 2, 3, 4, 5, 6].map(col),
    tableauY,
    tableauMaxHeight: Math.max(cardHeight, boardHeight - tableauY - bottomPad),
  };
}

export function computeLayout(viewportWidth: number, viewportHeight: number): Layout {
  return viewportWidth < NARROW_BREAKPOINT
    ? narrowLayout(viewportWidth, viewportHeight)
    : sideLayout(viewportWidth, viewportHeight);
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Board-relative rect of a single card slot at `p`. */
export function slotRect(layout: Layout, p: Point): Box {
  return { left: p.x, top: p.y, width: layout.cardWidth, height: layout.cardHeight };
}

/** Board-relative rect covering the whole 3-card waste fan. */
export function wasteRect(layout: Layout): Box {
  const { dx, dy } = layout.wasteFan;
  return {
    left: layout.waste.x,
    top: layout.waste.y,
    width: layout.cardWidth + 2 * dx,
    height: layout.cardHeight + 2 * dy,
  };
}

/** Number of waste cards shown fanned (SPEC §2). */
export const WASTE_FAN_SIZE = 3;

export interface FanCard<C> {
  card: C;
  /** Index of the card in the waste pile. */
  index: number;
  /** Position in the fan: 0 = oldest visible. */
  slot: number;
  /** Only the newest (top) card can be played. */
  interactive: boolean;
}

/** The last ≤ 3 waste cards in display order (oldest first); only the newest is interactive. */
export function wasteFan<C>(waste: readonly C[]): FanCard<C>[] {
  const start = Math.max(0, waste.length - WASTE_FAN_SIZE);
  return waste.slice(start).map((card, slot) => ({
    card,
    index: start + slot,
    slot,
    interactive: start + slot === waste.length - 1,
  }));
}

/** Face-down offsets are squeezed down to this (relative to card height) before face-up ones. */
export const MIN_FACE_DOWN_OFFSET = 0.05;

/**
 * Vertical offsets (from the column top) of each card in a tableau column. Face-down cards
 * are fanned by ~12% of the card height, face-up by ~25%. If the column would be taller than
 * `maxHeight`, face-down offsets are compressed first (down to ~5%), then face-up offsets are
 * scaled down, but never below MIN_FACE_UP_OFFSET (the readable corner row). The layouts leave
 * enough height that a full 19-card column always fits at that minimum.
 */
export function fanOffsets(
  cards: readonly { faceUp: boolean }[],
  cardHeight: number,
  maxHeight: number,
): number[] {
  const room = Math.max(0, maxHeight - cardHeight);
  // Gaps after each card except the last one determine the column height.
  const gaps = cards.slice(0, -1);
  const downCount = gaps.filter((c) => !c.faceUp).length;
  const upTotal = (gaps.length - downCount) * FACE_UP_OFFSET * cardHeight;
  let down = FACE_DOWN_OFFSET * cardHeight;
  let upScale = 1;
  if (downCount * down + upTotal > room) {
    const minDown = MIN_FACE_DOWN_OFFSET * cardHeight;
    if (downCount > 0 && downCount * minDown + upTotal <= room) {
      // Squeezing only the face-down cards is enough.
      down = (room - upTotal) / downCount;
    } else {
      down = downCount > 0 ? Math.min(minDown, room / downCount) : 0;
      const minScale = MIN_FACE_UP_OFFSET / FACE_UP_OFFSET;
      upScale = upTotal > 0 ? Math.max(minScale, (room - downCount * down) / upTotal) : 1;
    }
  }
  const offsets: number[] = [];
  let y = 0;
  for (const card of cards) {
    offsets.push(y);
    y += card.faceUp ? FACE_UP_OFFSET * cardHeight * upScale : down;
  }
  return offsets;
}

/** Total height of a fanned column (at least one card tall, for the empty slot). */
export function columnHeight(offsets: readonly number[], cardHeight: number): number {
  return (offsets[offsets.length - 1] ?? 0) + cardHeight;
}

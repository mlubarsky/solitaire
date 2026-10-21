import { memo } from 'react';
import { rankLabel, suitColor, type Card } from '../../engine';
import { PixelPortrait, type FaceRank } from './PixelPortrait';
import {
  bitmapPath,
  bitmapWidth,
  LARGE_SUITS,
  rankPath,
  SMALL_SUITS,
  type Bitmap,
} from './pixelGlyphs';
import { SUIT_COLORS } from './suitPaths';

/** Card faces are drawn in a 250 × 350 box (5:7) and scaled to the card size. */
export const FACE_W = 250;
export const FACE_H = 350;
/** Height of the corner row (rank + suit) as a fraction of the card height. */
export const CORNER_ROW = 80 / FACE_H;
/** Pixel size (in face units) of the corner rank and suit, and of the J/Q/K portraits. */
export const PIXEL_CORNER_CELL = 6.6;
/** Size of the large center suit. */
const PIXEL_CENTER_SIZE = 136;

function Pixels(props: {
  bitmap: Bitmap;
  x: number;
  y: number;
  cell: number;
  fill: string;
  part: string;
}) {
  const { bitmap, x, y, cell, fill, part } = props;
  return (
    <path
      data-part={part}
      d={bitmapPath(bitmap, x, y, cell)}
      fill={fill}
      shapeRendering="crispEdges"
    />
  );
}

/**
 * A card face in moderately 8-bit pixel art: one rank at the top-left (a bold 9-pixel-tall font),
 * the suit at the top-right on the same pixel grid, and in the center a 13-pixel suit (A–10) or
 * a pixel-art headshot (J, Q, K). The corner row fits in the top `CORNER_ROW` of the card so it
 * stays readable in a fanned tableau column.
 */
function CardFaceView({ card }: { card: Pick<Card, 'suit' | 'rank'> }) {
  const color = SUIT_COLORS[suitColor(card.suit)];
  const rank = rankLabel(card.rank);
  const cell = PIXEL_CORNER_CELL;
  const top = 13;
  // Corner suit: right-aligned, vertically centered on the 9-pixel rank row.
  const small = SMALL_SUITS[card.suit];
  const smallX = 234 - bitmapWidth(small) * cell;
  const smallY = top + ((9 - small.length) * cell) / 2;
  // Center suit.
  const large = LARGE_SUITS[card.suit];
  const largeCell = PIXEL_CENTER_SIZE / Math.max(bitmapWidth(large), large.length);
  const largeX = FACE_W / 2 - (bitmapWidth(large) * largeCell) / 2;
  const largeY = 216 - (large.length * largeCell) / 2;
  return (
    <svg
      className="card-face"
      viewBox={`0 0 ${FACE_W} ${FACE_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      data-color={suitColor(card.suit)}
    >
      <path
        data-part="rank"
        data-rank={rank}
        d={rankPath(rank, 16, top, cell)}
        fill={color}
        shapeRendering="crispEdges"
      />
      <Pixels part="suit" bitmap={small} x={smallX} y={smallY} cell={cell} fill={color} />
      {card.rank > 10 ? (
        <PixelPortrait
          rank={card.rank as FaceRank}
          suit={card.suit}
          x={FACE_W / 2 - 12 * cell}
          y={120}
          cell={cell}
        />
      ) : (
        <Pixels part="center" bitmap={large} x={largeX} y={largeY} cell={largeCell} fill={color} />
      )}
    </svg>
  );
}

export const CardFace = memo(CardFaceView);

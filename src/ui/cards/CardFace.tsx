import { memo } from 'react';
import { rankLabel, suitColor, type Card, type Suit } from '../../engine';
import { FacePortrait, type FaceRank } from './FacePortrait';
import { SUIT_COLORS, SUIT_PATHS } from './suitPaths';

/** Card faces are drawn in a 250 × 350 box (5:7) and scaled to the card size. */
export const FACE_W = 250;
export const FACE_H = 350;
/** Height of the corner row (rank + suit) as a fraction of the card height. */
export const CORNER_ROW = 80 / FACE_H;
/** Portrait headshot width for J/Q/K (≈ 62% of the card width). */
export const PORTRAIT_W = 156;
const FONT = "Roboto, 'Helvetica Neue', Arial, sans-serif";

/** A suit symbol of `size` centered at (cx, cy), drawn from our own SVG path. */
export function SuitShape(props: {
  suit: Suit;
  cx: number;
  cy: number;
  size: number;
  fill: string;
  part?: string;
}) {
  const { suit, cx, cy, size, fill, part } = props;
  return (
    <path
      data-part={part}
      d={SUIT_PATHS[suit]}
      fill={fill}
      transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 100})`}
    />
  );
}

/**
 * Google-Solitaire-style face: one rank at the top-left, the suit at the top-right, and in the
 * center a large suit (A–10) or a portrait headshot (J, Q, K). The corner row (rank + suit) fits in
 * the top `CORNER_ROW` of the card so it stays readable in a fanned tableau column.
 */
function CardFaceView({ card }: { card: Pick<Card, 'suit' | 'rank'> }) {
  const color = SUIT_COLORS[suitColor(card.suit)];
  const rank = rankLabel(card.rank);
  const isFace = card.rank > 10;
  return (
    <svg
      className="card-face"
      viewBox={`0 0 ${FACE_W} ${FACE_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      data-color={suitColor(card.suit)}
    >
      <text
        data-part="rank"
        x={14}
        y={72}
        fontSize={82}
        fontWeight={700}
        fontFamily={FONT}
        letterSpacing={rank.length > 1 ? -6 : 0}
        fill={color}
      >
        {rank}
      </text>
      <SuitShape part="suit" suit={card.suit} cx={202} cy={42} size={60} fill={color} />
      {isFace ? (
        <FacePortrait
          rank={card.rank as FaceRank}
          suit={card.suit}
          x={(FACE_W - PORTRAIT_W) / 2}
          y={106}
          width={PORTRAIT_W}
        />
      ) : (
        <SuitShape
          part="center"
          suit={card.suit}
          cx={FACE_W / 2}
          cy={216}
          size={136}
          fill={color}
        />
      )}
    </svg>
  );
}

export const CardFace = memo(CardFaceView);

import type { ReactNode } from 'react';
import type { Suit } from '../../engine';
import { SUIT_PATHS } from './suitPaths';

export type FaceRank = 11 | 12 | 13;
type Figure = 'jack' | 'queen' | 'king';

const FIGURE: Record<FaceRank, Figure> = { 11: 'jack', 12: 'queen', 13: 'king' };

export const PORTRAIT_COLORS = {
  skin: '#f7c9a3',
  skinShade: '#e3a47c',
  cheek: '#f29a8e',
  ink: '#3b2a1e',
  mouth: '#c0504d',
  gold: '#f9a825',
  goldDark: '#e08e0b',
  white: '#ffffff',
  ruby: '#e53935',
  sapphire: '#1e88e5',
} as const;

/** Hair color per suit, so all 12 face cards look distinct. */
export const HAIR: Readonly<Record<Suit, string>> = {
  spades: '#2b2b2b',
  hearts: '#a0461e',
  diamonds: '#e3b04b',
  clubs: '#6d4325',
};

/** Clothing per suit: reds for red suits, charcoal / navy for black suits. */
export const CLOTHES: Readonly<Record<Suit, { main: string; trim: string }>> = {
  hearts: { main: '#d32f2f', trim: '#9a1b1b' },
  diamonds: { main: '#e5484d', trim: '#b3262b' },
  spades: { main: '#2f3a46', trim: '#1b232b' },
  clubs: { main: '#24345e', trim: '#151f3d' },
};

// The portrait is drawn in a 160 × 190 box; the head is centered at x = 80.
const CX = 80;

function Shoulders({ suit, collar }: { suit: Suit; collar: string }) {
  const { main, trim } = CLOTHES[suit];
  const { skin, white } = PORTRAIT_COLORS;
  return (
    <g data-part="clothes">
      <rect x={CX - 11} y={112} width={22} height={30} fill={skin} />
      <path d="M8 190 C10 152 38 138 80 136 C122 138 150 152 152 190 Z" fill={main} />
      <path d="M8 190 C10 162 22 150 40 144 L48 190 Z" fill={trim} />
      <path d="M152 190 C150 162 138 150 120 144 L112 190 Z" fill={trim} />
      <path d="M50 140 Q80 166 110 140 L102 133 Q80 152 58 133 Z" fill={collar} />
      <path
        data-part="chest-suit"
        d={SUIT_PATHS[suit]}
        fill={white}
        transform={`translate(${CX - 11} 160) scale(0.22)`}
      />
    </g>
  );
}

function Face({ smile = true }: { smile?: boolean }) {
  const { skin, skinShade, cheek, ink, mouth } = PORTRAIT_COLORS;
  return (
    <g data-part="face">
      <ellipse cx={CX - 29} cy={96} rx={5} ry={8} fill={skin} />
      <ellipse cx={CX + 29} cy={96} rx={5} ry={8} fill={skin} />
      <ellipse cx={CX} cy={92} rx={28} ry={32} fill={skin} />
      <circle cx={CX - 11} cy={92} r={3.4} fill={ink} />
      <circle cx={CX + 11} cy={92} r={3.4} fill={ink} />
      <circle cx={CX - 16} cy={104} r={5} fill={cheek} opacity={0.6} />
      <circle cx={CX + 16} cy={104} r={5} fill={cheek} opacity={0.6} />
      <path
        d={`M${CX} 95 L${CX - 3} 104 L${CX + 3} 104`}
        fill="none"
        stroke={skinShade}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {smile && (
        <path
          d={`M${CX - 7} 112 Q${CX} 117 ${CX + 7} 112`}
          fill="none"
          stroke={mouth}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

function King({ hair }: { hair: string }) {
  const { gold, goldDark, ruby, sapphire, mouth } = PORTRAIT_COLORS;
  return (
    <>
      <path d="M50 66 Q46 88 54 104 L58 102 Q54 86 58 68 Z" fill={hair} />
      <path d="M110 66 Q114 88 106 104 L102 102 Q106 86 102 68 Z" fill={hair} />
      <Face smile={false} />
      <path
        data-part="beard"
        d="M51 96 Q53 134 80 140 Q107 134 109 96 Q102 118 80 120 Q58 118 51 96 Z"
        fill={hair}
      />
      <path d="M64 110 Q80 101 96 110 Q88 112 80 109 Q72 112 64 110 Z" fill={hair} />
      <path
        d="M74 116 Q80 119 86 116"
        fill="none"
        stroke={mouth}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <g data-headwear="crown">
        <path d="M50 70 L44 24 L60 46 L70 14 L80 42 L90 14 L100 46 L116 24 L110 70 Z" fill={gold} />
        <rect x={49} y={60} width={62} height={11} rx={2} fill={goldDark} />
        <circle cx={44} cy={24} r={4.5} fill={gold} />
        <circle cx={70} cy={14} r={4.5} fill={gold} />
        <circle cx={90} cy={14} r={4.5} fill={gold} />
        <circle cx={116} cy={24} r={4.5} fill={gold} />
        <circle cx={64} cy={65.5} r={3.6} fill={ruby} />
        <circle cx={80} cy={65.5} r={3.6} fill={sapphire} />
        <circle cx={96} cy={65.5} r={3.6} fill={ruby} />
      </g>
    </>
  );
}

function Queen({ hair }: { hair: string }) {
  const { gold, goldDark, sapphire } = PORTRAIT_COLORS;
  return (
    <>
      <path
        data-part="long-hair"
        d="M47 86 Q42 54 80 52 Q118 54 113 86 L120 142 Q104 146 98 130 L62 130 Q56 146 40 142 Z"
        fill={hair}
      />
      <Face />
      <path
        d="M51 84 Q56 60 80 62 Q104 60 109 84 Q100 70 84 72 Q78 78 66 76 Q58 76 51 84 Z"
        fill={hair}
      />
      <circle cx={CX - 30} cy={106} r={3.6} fill={gold} />
      <circle cx={CX + 30} cy={106} r={3.6} fill={gold} />
      <path
        d="M62 141 Q80 156 98 141"
        fill="none"
        stroke={gold}
        strokeWidth={3}
        strokeDasharray="0.1 6"
        strokeLinecap="round"
      />
      <g data-headwear="tiara">
        <path d="M58 64 Q60 48 69 55 Q80 34 91 55 Q100 48 102 64 Z" fill={gold} />
        <rect x={57} y={60} width={46} height={6} rx={3} fill={goldDark} />
        <circle cx={80} cy={47} r={4.2} fill={sapphire} />
      </g>
    </>
  );
}

function Jack({ hair, cap }: { hair: string; cap: string }) {
  const { gold, goldDark } = PORTRAIT_COLORS;
  return (
    <>
      <path
        d="M51 90 Q50 62 80 60 Q110 62 109 90 Q106 76 96 74 L64 74 Q54 76 51 90 Z"
        fill={hair}
      />
      <Face />
      <g data-headwear="cap">
        <path
          data-part="feather"
          d="M98 62 C112 44 126 24 140 4 C142 30 128 52 108 68 Z"
          fill={gold}
          stroke={goldDark}
          strokeWidth={2}
        />
        <path d="M42 72 Q44 40 84 40 Q122 42 120 66 Q104 58 82 60 Q60 62 42 72 Z" fill={cap} />
        <rect x={44} y={64} width={74} height={8} rx={4} fill={gold} />
      </g>
    </>
  );
}

/**
 * Head-and-shoulders portrait for J, Q and K in a flat, friendly style. Headwear is the main
 * cue at small sizes: a tall pointed crown (King, with a beard), a small tiara and long hair
 * (Queen), or a cap with a feather (Jack). Clothing uses the suit color; hair color varies by
 * suit so all 12 face cards are distinct.
 */
export function FacePortrait({
  rank,
  suit,
  x,
  y,
  width,
}: {
  rank: FaceRank;
  suit: Suit;
  x: number;
  y: number;
  width: number;
}) {
  const figure = FIGURE[rank];
  const hair = HAIR[suit];
  const clothes = CLOTHES[suit];
  let head: ReactNode;
  let collar: string = PORTRAIT_COLORS.white;
  if (figure === 'king') {
    head = <King hair={hair} />;
    collar = PORTRAIT_COLORS.gold;
  } else if (figure === 'queen') {
    head = <Queen hair={hair} />;
  } else {
    head = <Jack hair={hair} cap={clothes.trim} />;
  }
  const scale = width / 160;
  return (
    <g
      data-part="center"
      data-testid={`portrait-${figure}`}
      data-hair={hair}
      transform={`translate(${x} ${y}) scale(${scale})`}
    >
      {/* The figure is enlarged around the face so the headshot fills ≈ 65% of the card width. */}
      <g transform="translate(80 100) scale(1.18) translate(-80 -100)">
        <Shoulders suit={suit} collar={collar} />
        {head}
      </g>
    </g>
  );
}

import type { Suit } from '../../engine';
import { bitmapPath, type Bitmap } from './pixelGlyphs';

export type FaceRank = 11 | 12 | 13;

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

/**
 * Pixel-art headshots for J, Q and K. Each row is one line of pixels;
 * every character is a color code (see `colorsFor`), `.` is transparent. Headwear is the main
 * cue: a jeweled crown and beard (King), a tiara, long hair and necklace (Queen),
 * a cap with a gold band and feather (Jack).
 */
export const PIXEL_PORTRAITS: Readonly<Record<'king' | 'queen' | 'jack', Bitmap>> = {
  king: [
    '.....G...G....G...G.....',
    '.....GG.GGG..GGG.GG.....',
    '.....GGGGGGGGGGGGGG.....',
    '.....gRggggBBggggRg.....',
    '.....gggggggggggggg.....',
    '....HSSSSSSSSSSSSSSH....',
    '....HSSSSSSSSSSSSSSH....',
    '...sHSSEESSSSSSEESSHs...',
    '...sHSSEESSSSSSEESSHs...',
    '...sHSPSSSSssSSSSPSHs...',
    '....HSSSHHHHHHHHSSSH....',
    '....HHHHHHMMMMHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '.....HHHHHHHHHHHHHH.....',
    '......HHHHHHHHHHHH......',
    '.......HHHHHHHHHH.......',
    '........HHHHHHHH........',
    '....CCCGGGHHHHGGGCCC....',
    '..CCCCCCGGGGGGGGCCCCCC..',
    '.CCCCCCCCGGGGGGCCCCCCCC.',
    'ccCCCCCCCCCCCCCCCCCCCCcc',
    'cccCCCCCCCCCCCCCCCCCCccc',
    'cccCCCCCCCCCCCCCCCCCCccc',
    'cccCCCCCCCCCCCCCCCCCCccc',
  ],
  queen: [
    '...........BB...........',
    '.......G..GBBG..G.......',
    '.......GGGGGGGGGG.......',
    '......HggggggggggH......',
    '.....HHHHHHHHHHHHHH.....',
    '....HHHSSSSSSSSSSHHH....',
    '....HHSSSSSSSSSSSSHH....',
    '....HHSEESSSSSSEESHH....',
    '....HHSEESSSSSSEESHH....',
    '....HHPSSSSssSSSSPHH....',
    '...HHGSSSSMMMMSSSSGHH...',
    '...HHHHSSSSSSSSSSHHHH...',
    '...HHHHHSSSSSSSSHHHHH...',
    '...HHHHHHHSSSSHHHHHHH...',
    '...HHHHCCWWWWWWCCHHHH...',
    '..HHHCCCCCGGGGCCCCCHHH..',
    '..HHCCCCCCCCCCCCCCCCHH..',
    '.cCCCCCCCCCCCCCCCCCCCCc.',
    'ccCCCCCCCCCCCCCCCCCCCCcc',
    'cccCCCCCCCCCCCCCCCCCCccc',
    'cccCCCCCCCCCCCCCCCCCCccc',
    'cccCCCCCCCCCCCCCCCCCCccc',
    'cccCCCCCCCCCCCCCCCCCCccc',
    'cccCCCCCCCCCCCCCCCCCCccc',
  ],
  jack: [
    '...................GG...',
    '..................GGg...',
    '.................GGg....',
    '......kkkkkkk...GGg.....',
    '....kkkkkkkkkkkGGg......',
    '...kkkkkkkkkkkkkkk......',
    '...GGGGGGGGGGGGGGGGG....',
    '....HHSSSSSSSSSSSSHH....',
    '....HHSEESSSSSSEESHH....',
    '....HHSEESSSSSSEESHH....',
    '....HHPSSSSssSSSSPHH....',
    '.....HSSSSMMMMSSSSH.....',
    '......SSSSSSSSSSSS......',
    '.......SSSSSSSSSS.......',
    '..........SSSS..........',
    '.....CCCCWWWWWWCCCC.....',
    '...CCCCCCWWWWWWCCCCCC...',
    '..CCCCCCCCCCCCCCCCCCCC..',
    '.cCCCCCCCCCCCCCCCCCCCCc.',
    'ccCCCCCCCCCCCCCCCCCCCCcc',
    'cccCCCCCCCCCCCCCCCCCCccc',
    'cccCCCCCCCCCCCCCCCCCCccc',
    'cccCCCCCCCCCCCCCCCCCCccc',
    'cccCCCCCCCCCCCCCCCCCCccc',
  ],
};

/** Tiny white suit symbols for the chest (6 × 4 pixels). */
export const CHEST_SUITS: Readonly<Record<Suit, Bitmap>> = {
  hearts: ['XX..XX', 'XXXXXX', '.XXXX.', '..XX..'],
  diamonds: ['..XX..', '.XXXX.', '.XXXX.', '..XX..'],
  spades: ['..XX..', '.XXXX.', 'XXXXXX', '..XX..'],
  clubs: ['..XX..', 'XXXXXX', 'XXXXXX', '..XX..'],
};

const FIGURES = { 11: 'jack', 12: 'queen', 13: 'king' } as const;

/** Color for each code in the portrait bitmaps, for a suit. */
export function colorsFor(suit: Suit): Readonly<Record<string, string>> {
  const c = PORTRAIT_COLORS;
  return {
    S: c.skin,
    s: c.skinShade,
    P: c.cheek,
    E: c.ink,
    M: c.mouth,
    H: HAIR[suit],
    G: c.gold,
    g: c.goldDark,
    R: c.ruby,
    B: c.sapphire,
    W: c.white,
    C: CLOTHES[suit].main,
    c: CLOTHES[suit].trim,
    k: CLOTHES[suit].trim,
  };
}

/** Keeps only the pixels of one color code, as an `X`/`.` bitmap. */
export function mask(bitmap: Bitmap, code: string): Bitmap {
  return bitmap.map((row) => [...row].map((ch) => (ch === code ? 'X' : '.')).join(''));
}

/**
 * A pixel headshot drawn with square pixels of `cell` face units, its top-left at (x, y). One
 * path per color, so the whole portrait is about a dozen paths.
 */
export function PixelPortrait({
  rank,
  suit,
  x,
  y,
  cell,
}: {
  rank: FaceRank;
  suit: Suit;
  x: number;
  y: number;
  cell: number;
}) {
  const figure = FIGURES[rank];
  const bitmap = PIXEL_PORTRAITS[figure];
  const colors = colorsFor(suit);
  const chest = CHEST_SUITS[suit];
  // The chest symbol sits centered on the robe, near the bottom.
  const chestX = x + ((bitmap[0] as string).length / 2 - 3) * cell;
  const chestY = y + (bitmap.length - 5) * cell;
  return (
    <g
      data-part="center"
      data-testid={`portrait-${figure}`}
      data-style="pixel"
      data-hair={HAIR[suit]}
      shapeRendering="crispEdges"
    >
      {Object.entries(colors).map(([code, fill]) => {
        const d = bitmapPath(mask(bitmap, code), x, y, cell);
        return d ? <path key={code} data-code={code} d={d} fill={fill} /> : null;
      })}
      <path
        data-part="chest-suit"
        d={bitmapPath(chest, chestX, chestY, cell)}
        fill={PORTRAIT_COLORS.white}
      />
    </g>
  );
}

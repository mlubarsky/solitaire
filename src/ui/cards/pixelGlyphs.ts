import type { Suit } from '../../engine';

/** A hand-drawn bitmap: one string per row, `X` = filled pixel, `.` = empty. */
export type Bitmap = readonly string[];

/**
 * Rank glyphs for the pixel card style: a bold 9-pixel-tall font with 2-pixel strokes, chunky
 * enough to read as pixel art but not as coarse as a classic 5×7 8-bit font.
 */
export const RANK_GLYPHS: Readonly<Record<string, Bitmap>> = {
  A: [
    '..XXX..',
    '.XXXXX.',
    'XX...XX',
    'XX...XX',
    'XXXXXXX',
    'XXXXXXX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
  ],
  '1': ['..XX..', '.XXX..', 'XXXX..', '..XX..', '..XX..', '..XX..', '..XX..', 'XXXXXX', 'XXXXXX'],
  '0': [
    '.XXXXX.',
    'XXXXXXX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XXXXXXX',
    '.XXXXX.',
  ],
  '2': [
    '.XXXXX.',
    'XXXXXXX',
    'XX...XX',
    '.....XX',
    '...XXX.',
    '.XXX...',
    'XX.....',
    'XXXXXXX',
    'XXXXXXX',
  ],
  '3': [
    'XXXXXX.',
    'XXXXXXX',
    '.....XX',
    '..XXXX.',
    '..XXXX.',
    '.....XX',
    '.....XX',
    'XXXXXXX',
    'XXXXXX.',
  ],
  '4': [
    '....XX.',
    '...XXX.',
    '..XXXX.',
    '.XX.XX.',
    'XX..XX.',
    'XXXXXXX',
    'XXXXXXX',
    '....XX.',
    '....XX.',
  ],
  '5': [
    'XXXXXXX',
    'XXXXXXX',
    'XX.....',
    'XXXXXX.',
    'XXXXXXX',
    '.....XX',
    '.....XX',
    'XXXXXXX',
    'XXXXXX.',
  ],
  '6': [
    '.XXXXX.',
    'XXXXXX.',
    'XX.....',
    'XXXXXX.',
    'XXXXXXX',
    'XX...XX',
    'XX...XX',
    'XXXXXXX',
    '.XXXXX.',
  ],
  '7': [
    'XXXXXXX',
    'XXXXXXX',
    '.....XX',
    '....XX.',
    '...XX..',
    '..XX...',
    '..XX...',
    '..XX...',
    '..XX...',
  ],
  '8': [
    '.XXXXX.',
    'XXXXXXX',
    'XX...XX',
    'XXXXXXX',
    '.XXXXX.',
    'XX...XX',
    'XX...XX',
    'XXXXXXX',
    '.XXXXX.',
  ],
  '9': [
    '.XXXXX.',
    'XXXXXXX',
    'XX...XX',
    'XX...XX',
    'XXXXXXX',
    '.XXXXXX',
    '.....XX',
    '.XXXXXX',
    '.XXXXX.',
  ],
  J: [
    '..XXXXX',
    '..XXXXX',
    '....XX.',
    '....XX.',
    '....XX.',
    '....XX.',
    'XX..XX.',
    'XXXXXX.',
    '.XXXX..',
  ],
  Q: [
    '.XXXXX.',
    'XXXXXXX',
    'XX...XX',
    'XX...XX',
    'XX...XX',
    'XX.X.XX',
    'XX..XXX',
    'XXXXXX.',
    '.XXX.XX',
  ],
  K: [
    'XX...XX',
    'XX..XX.',
    'XX.XX..',
    'XXXX...',
    'XXX....',
    'XXXX...',
    'XX.XX..',
    'XX..XX.',
    'XX...XX',
  ],
};

/** Small suits for the corner, on the same pixel grid as the rank glyphs. */
export const SMALL_SUITS: Readonly<Record<Suit, Bitmap>> = {
  hearts: [
    '.XX...XX.',
    'XXXX.XXXX',
    'XXXXXXXXX',
    'XXXXXXXXX',
    '.XXXXXXX.',
    '..XXXXX..',
    '...XXX...',
    '....X....',
  ],
  diamonds: [
    '...X...',
    '..XXX..',
    '..XXX..',
    '.XXXXX.',
    'XXXXXXX',
    '.XXXXX.',
    '..XXX..',
    '..XXX..',
    '...X...',
  ],
  spades: [
    '....X....',
    '...XXX...',
    '..XXXXX..',
    '.XXXXXXX.',
    'XXXXXXXXX',
    'XXXXXXXXX',
    '.XX.X.XX.',
    '....X....',
    '...XXX...',
  ],
  clubs: [
    '...XXX...',
    '..XXXXX..',
    '..XXXXX..',
    'XX.XXX.XX',
    'XXXXXXXXX',
    'XXXXXXXXX',
    '.XX.X.XX.',
    '....X....',
    '...XXX...',
  ],
};

/** Large suits for the card center. */
export const LARGE_SUITS: Readonly<Record<Suit, Bitmap>> = {
  hearts: [
    '..XXX...XXX..',
    '.XXXXX.XXXXX.',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    '.XXXXXXXXXXX.',
    '..XXXXXXXXX..',
    '...XXXXXXX...',
    '....XXXXX....',
    '.....XXX.....',
    '......X......',
  ],
  diamonds: [
    '.....X.....',
    '....XXX....',
    '....XXX....',
    '...XXXXX...',
    '..XXXXXXX..',
    '.XXXXXXXXX.',
    'XXXXXXXXXXX',
    '.XXXXXXXXX.',
    '..XXXXXXX..',
    '...XXXXX...',
    '....XXX....',
    '....XXX....',
    '.....X.....',
  ],
  spades: [
    '......X......',
    '.....XXX.....',
    '....XXXXX....',
    '...XXXXXXX...',
    '..XXXXXXXXX..',
    '.XXXXXXXXXXX.',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    '.XXXX.X.XXXX.',
    '..XX..X..XX..',
    '.....XXX.....',
    '....XXXXX....',
  ],
  clubs: [
    '.....XXX.....',
    '....XXXXX....',
    '....XXXXX....',
    '....XXXXX....',
    '.XXX.XXX.XXX.',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    'XXXXXXXXXXXXX',
    '.XXX.XXX.XXX.',
    '......X......',
    '.....XXX.....',
    '....XXXXX....',
  ],
};

/** Glyphs for a rank label, e.g. "10" → the "1" and "0" glyphs. */
export function rankBitmaps(label: string): Bitmap[] {
  return [...label].map((ch) => RANK_GLYPHS[ch] as Bitmap);
}

/**
 * SVG path data for a bitmap drawn at (x, y) with square pixels of size `cell`. Each run of
 * filled pixels in a row becomes one rectangle, so the path stays small.
 */
export function bitmapPath(bitmap: Bitmap, x: number, y: number, cell: number): string {
  const parts: string[] = [];
  bitmap.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (row[c] !== 'X') {
        c++;
        continue;
      }
      const start = c;
      while (row[c] === 'X') c++;
      const px = +(x + start * cell).toFixed(2);
      const py = +(y + r * cell).toFixed(2);
      const w = +((c - start) * cell).toFixed(2);
      const h = +cell.toFixed(2);
      parts.push(`M${px} ${py}h${w}v${h}h${-w}z`);
    }
  });
  return parts.join('');
}

/** Width of a bitmap in pixels (its widest row). */
export function bitmapWidth(bitmap: Bitmap): number {
  return Math.max(...bitmap.map((row) => row.length));
}

/** Path data for a rank label drawn left to right from (x, y), one pixel between glyphs. */
export function rankPath(label: string, x: number, y: number, cell: number): string {
  let left = x;
  return rankBitmaps(label)
    .map((glyph) => {
      const d = bitmapPath(glyph, left, y, cell);
      left += (bitmapWidth(glyph) + 1) * cell;
      return d;
    })
    .join('');
}

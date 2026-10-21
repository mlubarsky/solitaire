import type { Bitmap } from '../cards/pixelGlyphs';

/** A classic 5×7 pixel font (uppercase, digits, punctuation) for every label in the app. */
export const SMALL_FONT: Readonly<Record<string, Bitmap>> = {
  A: ['.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  B: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X...X', 'X...X', 'XXXX.'],
  C: ['.XXXX', 'X....', 'X....', 'X....', 'X....', 'X....', '.XXXX'],
  D: ['XXXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXX.'],
  E: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'XXXXX'],
  F: ['XXXXX', 'X....', 'X....', 'XXXX.', 'X....', 'X....', 'X....'],
  G: ['.XXXX', 'X....', 'X....', 'X.XXX', 'X...X', 'X...X', '.XXXX'],
  H: ['X...X', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  I: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', 'XXXXX'],
  J: ['..XXX', '...X.', '...X.', '...X.', '...X.', 'X..X.', '.XX..'],
  K: ['X...X', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..X.', 'X...X'],
  L: ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X.X.X', 'X...X', 'X...X', 'X...X'],
  N: ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X', 'X...X', 'X...X'],
  O: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  P: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....'],
  Q: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X.X.X', 'X..X.', '.XX.X'],
  R: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'],
  S: ['.XXXX', 'X....', 'X....', '.XXX.', '....X', '....X', 'XXXX.'],
  T: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'],
  U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  V: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.X.X.', '..X..'],
  W: ['X...X', 'X...X', 'X...X', 'X.X.X', 'X.X.X', 'XX.XX', 'X...X'],
  X: ['X...X', 'X...X', '.X.X.', '..X..', '.X.X.', 'X...X', 'X...X'],
  Y: ['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..'],
  Z: ['XXXXX', '....X', '...X.', '..X..', '.X...', 'X....', 'XXXXX'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
  '·': ['...', '...', '...', '.X.', '...', '...', '...'],
  '!': ['X', 'X', 'X', 'X', 'X', '.', 'X'],
  '▶': ['X...', 'XX..', 'XXX.', 'XXXX', 'XXX.', 'XX..', 'X...'],
  '0': ['.XXX.', 'X...X', 'X..XX', 'X.X.X', 'XX..X', 'X...X', '.XXX.'],
  '1': ['..X..', '.XX..', '..X..', '..X..', '..X..', '..X..', '.XXX.'],
  '2': ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.X...', 'XXXXX'],
  '3': ['XXXX.', '....X', '....X', '.XXX.', '....X', '....X', 'XXXX.'],
  '4': ['...X.', '..XX.', '.X.X.', 'X..X.', 'XXXXX', '...X.', '...X.'],
  '5': ['XXXXX', 'X....', 'XXXX.', '....X', '....X', 'X...X', '.XXX.'],
  '6': ['.XXX.', 'X....', 'X....', 'XXXX.', 'X...X', 'X...X', '.XXX.'],
  '7': ['XXXXX', '....X', '...X.', '..X..', '.X...', '.X...', '.X...'],
  '8': ['.XXX.', 'X...X', 'X...X', '.XXX.', 'X...X', 'X...X', '.XXX.'],
  '9': ['.XXX.', 'X...X', 'X...X', '.XXXX', '....X', '....X', '.XXX.'],
  '.': ['.', '.', '.', '.', '.', '.', 'X'],
  ',': ['..', '..', '..', '..', '..', '.X', 'X.'],
  ':': ['.', '.', 'X', '.', '.', 'X', '.'],
  "'": ['X', 'X', '.', '.', '.', '.', '.'],
  '?': ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.....', '..X..'],
  '-': ['....', '....', '....', 'XXXX', '....', '....', '....'],
  '…': ['.....', '.....', '.....', '.....', '.....', '.....', 'X.X.X'],
  '(': ['.X', 'X.', 'X.', 'X.', 'X.', 'X.', '.X'],
  ')': ['X.', '.X', '.X', '.X', '.X', '.X', 'X.'],
  '/': ['....X', '...X.', '...X.', '..X..', '.X...', '.X...', 'X....'],
  '✕': ['.....', 'X...X', '.X.X.', '..X..', '.X.X.', 'X...X', '.....'],
};

/** A bold 9-pixel-tall font with 2-pixel strokes for the big "SOLITAIRE" title and PLAY. */
export const TITLE_FONT: Readonly<Record<string, Bitmap>> = {
  S: [
    '.XXXXX.',
    'XXXXXXX',
    'XX.....',
    'XXXXXX.',
    '.XXXXXX',
    '.....XX',
    '.....XX',
    'XXXXXXX',
    '.XXXXX.',
  ],
  O: [
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
  L: [
    'XX.....',
    'XX.....',
    'XX.....',
    'XX.....',
    'XX.....',
    'XX.....',
    'XX.....',
    'XXXXXXX',
    'XXXXXXX',
  ],
  I: ['XXXXXX', 'XXXXXX', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', 'XXXXXX', 'XXXXXX'],
  T: [
    'XXXXXXXX',
    'XXXXXXXX',
    '...XX...',
    '...XX...',
    '...XX...',
    '...XX...',
    '...XX...',
    '...XX...',
    '...XX...',
  ],
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
  R: [
    'XXXXXX.',
    'XXXXXXX',
    'XX...XX',
    'XX...XX',
    'XXXXXX.',
    'XXXXX..',
    'XX.XXX.',
    'XX..XXX',
    'XX...XX',
  ],
  E: [
    'XXXXXXX',
    'XXXXXXX',
    'XX.....',
    'XXXXX..',
    'XXXXX..',
    'XX.....',
    'XX.....',
    'XXXXXXX',
    'XXXXXXX',
  ],
  P: [
    'XXXXXX.',
    'XXXXXXX',
    'XX...XX',
    'XX...XX',
    'XXXXXXX',
    'XXXXXX.',
    'XX.....',
    'XX.....',
    'XX.....',
  ],
  Y: [
    'XX...XX',
    'XX...XX',
    'XXX.XXX',
    '.XXXXX.',
    '..XXX..',
    '..XXX..',
    '..XXX..',
    '..XXX..',
    '..XXX..',
  ],
  ' ': ['...', '...', '...', '...', '...', '...', '...', '...', '...'],
  '▶': ['X....', 'XX...', 'XXX..', 'XXXX.', 'XXXXX', 'XXXX.', 'XXX..', 'XX...', 'X....'],
};

/** Lays out `text` with `font` into one bitmap, `gap` empty columns between glyphs. */
export function textBitmap(text: string, font: Readonly<Record<string, Bitmap>>, gap = 1): Bitmap {
  const glyphs = [...text.toUpperCase()].map((ch) => {
    const glyph = font[ch];
    if (!glyph) throw new Error(`No pixel glyph for "${ch}"`);
    return glyph;
  });
  const height = Math.max(...glyphs.map((g) => g.length));
  const spacer = '.'.repeat(gap);
  return Array.from({ length: height }, (_, row) =>
    glyphs.map((g) => g[row] ?? '.'.repeat((g[0] as string).length)).join(spacer),
  );
}

/** The bitmap grown by one pixel in every direction (8-neighborhood): an outline mask. */
export function dilate(bitmap: Bitmap): Bitmap {
  const h = bitmap.length;
  const w = Math.max(...bitmap.map((r) => r.length));
  const at = (x: number, y: number) => bitmap[y]?.[x] === 'X';
  return Array.from({ length: h + 2 }, (_, y) =>
    Array.from({ length: w + 2 }, (_, x) => {
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) if (at(x - 1 + dx, y - 1 + dy)) return 'X';
      return '.';
    }).join(''),
  );
}

/** Keeps only the given rows of a bitmap (others blank): for highlight and shade bands. */
export function rowsOnly(bitmap: Bitmap, keep: (row: number) => boolean): Bitmap {
  return bitmap.map((row, y) => (keep(y) ? row : '.'.repeat(row.length)));
}

import type { Suit } from '../../engine';

/** Our own suit shapes as SVG path data in a 100×100 box (no font glyphs). */
export const SUIT_PATHS: Readonly<Record<Suit, string>> = {
  hearts:
    'M50 92 C46 86 6 62 6 33 C6 16 18 6 32 6 C41 6 47 11 50 19 C53 11 59 6 68 6 C82 6 94 16 94 33 C94 62 54 86 50 92 Z',
  diamonds: 'M50 3 C59 20 72 36 88 50 C72 64 59 80 50 97 C41 80 28 64 12 50 C28 36 41 20 50 3 Z',
  spades:
    'M50 5 C57 21 93 40 93 63 C93 77 82 85 70 85 C62 85 56 81 52.5 75 C53.5 85 57.5 91 65 97 L35 97 C42.5 91 46.5 85 47.5 75 C44 81 38 85 30 85 C18 85 7 77 7 63 C7 40 43 21 50 5 Z',
  clubs:
    'M30 28 A20 20 0 1 1 70 28 A20 20 0 1 1 30 28 Z M8 59 A20 20 0 1 1 48 59 A20 20 0 1 1 8 59 Z M52 59 A20 20 0 1 1 92 59 A20 20 0 1 1 52 59 Z M40 50 A10 10 0 1 1 60 50 A10 10 0 1 1 40 50 Z M47 52 C47 76 43 88 34 97 L66 97 C57 88 53 76 53 52 Z',
};

export const SUIT_COLORS = { red: '#d32f2f', black: '#1f1f1f' } as const;

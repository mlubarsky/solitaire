import { bitmapPath } from './cards/pixelGlyphs';
import { mask } from './cards/PixelPortrait';

/**
 * The pixel-art logo mark: a blue-backed card behind a white card with a red heart. Each
 * character is a color code (see `MARK_COLORS`); `.` is transparent.
 */
export const LOGO_MARK = [
  'KKKKKKKKKK.....',
  'KWWWWWWWWK.....',
  'KWBbBbBKKKKKKKK',
  'KWbBbBbKWWWWWWK',
  'KWBbBbBKWWWWWWK',
  'KWbBbBbKWRRWRRK',
  'KWBbBbBKWRRRRRK',
  'KWbBbBbKWRRRRRK',
  'KWBbBbBKWWRRRWK',
  'KWbBbBbKWWWRWWK',
  'KWWWWWWKWWWWWWK',
  'KKKKKKKKWWWWWWK',
  '.......KWWWWWWK',
  '.......KKKKKKKK',
] as const;

export const MARK_COLORS: Readonly<Record<string, string>> = {
  K: '#1d2a22',
  W: '#ffffff',
  B: '#1a73e8',
  b: '#4a90ee',
  R: '#d32f2f',
};

/** The logo mark as crisp pixel SVG paths, one per color. */
export function LogoMark({ className }: { className?: string }) {
  const w = LOGO_MARK[0].length;
  const h = LOGO_MARK.length;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      {Object.entries(MARK_COLORS).map(([code, fill]) => (
        <path key={code} d={bitmapPath(mask(LOGO_MARK, code), 0, 0, 1)} fill={fill} />
      ))}
    </svg>
  );
}

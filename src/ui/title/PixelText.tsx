import { bitmapPath, bitmapWidth } from '../cards/pixelGlyphs';
import { dilate, rowsOnly, SMALL_FONT, textBitmap, TITLE_FONT } from './pixelFont';

/**
 * Text drawn in a pixel font (the 5×7 font, or the bold 9-tall title font), as a crisp SVG sized
 * by CSS (height; width follows).
 */
export function PixelText({
  text,
  className,
  bold = false,
}: {
  text: string;
  className?: string;
  bold?: boolean;
}) {
  const bitmap = textBitmap(text, bold ? TITLE_FONT : SMALL_FONT);
  const w = bitmapWidth(bitmap);
  const h = bitmap.length;
  return (
    <svg
      className={`pixel-text ${className ?? ''}`}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
      data-text={text}
    >
      <path d={bitmapPath(bitmap, 0, 0, 1)} fill="currentColor" />
    </svg>
  );
}

export const TITLE_COLORS = {
  shadow: 'rgba(10, 6, 2, 0.55)',
  outline: '#2e1c08',
  fill: '#f2c14e',
  highlight: '#ffe9a6',
  shade: '#cf8f22',
} as const;

/**
 * The arcade title treatment ("SOLITAIRE", "YOU WIN!"): gold pixel letters with a lighter top
 * band and a darker bottom band, a one-pixel dark outline, and a drop shadow one pixel down.
 * Uses the bold title font, or the 5×7 font for text the bold font doesn't cover.
 */
export function PixelTitle({
  text = 'SOLITAIRE',
  small = false,
  className = 'pixel-title',
}: {
  text?: string;
  small?: boolean;
  className?: string;
}) {
  const letters = textBitmap(text, small ? SMALL_FONT : TITLE_FONT);
  const outline = dilate(letters);
  const w = bitmapWidth(outline);
  const h = outline.length;
  const rows = letters.length;
  const c = TITLE_COLORS;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h + 1}`}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      <path data-layer="shadow" d={bitmapPath(outline, 0, 1, 1)} fill={c.shadow} />
      <path data-layer="outline" d={bitmapPath(outline, 0, 0, 1)} fill={c.outline} />
      <path data-layer="fill" d={bitmapPath(letters, 1, 1, 1)} fill={c.fill} />
      <path
        data-layer="highlight"
        d={bitmapPath(
          rowsOnly(letters, (y) => y < 2),
          1,
          1,
          1,
        )}
        fill={c.highlight}
      />
      <path
        data-layer="shade"
        d={bitmapPath(
          rowsOnly(letters, (y) => y >= rows - 2),
          1,
          1,
          1,
        )}
        fill={c.shade}
      />
    </svg>
  );
}

/**
 * Any interface text in the pixel font. Each word is its own small pixel image, so long text
 * wraps like normal text. The real text stays in the page for screen readers (and tests);
 * the pixel images are hidden from assistive technology. Sized by the CSS font-size.
 */
export function Pixel({ text, className }: { text: string; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={`pixel-label${className ? ` ${className}` : ''}`}>
      <span className="sr-only">{text}</span>
      <span className="pixel-words" aria-hidden="true">
        {words.map((word, i) => (
          <PixelText key={i} text={word} />
        ))}
      </span>
    </span>
  );
}

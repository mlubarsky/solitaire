import { LogoMark } from './LogoMark';
import { PixelTitle } from './title/PixelText';

/**
 * The header logo: the pixel card mark and a small version of the title screen's arcade
 * "SOLITAIRE". On narrow screens only the mark shows; the heading still reads "Solitaire".
 */
export function Logo() {
  return (
    <h1 className="logo">
      <LogoMark className="logo-mark" />
      <PixelTitle className="logo-title" />
      <span className="sr-only">Solitaire</span>
    </h1>
  );
}

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Card, Rank, Suit } from '../../engine';
import { THEMES } from '../../themes/themes';
import { PixelCanvas } from '../background/PixelBackground';
import { CardFace } from '../cards/CardFace';
import { PixelText, PixelTitle } from './PixelText';

/** How long each table background is shown, and the crossfade between them. */
export const SHOWCASE_MS = 5000;
export const SHOWCASE_FADE_MS = 900;
/** Length of the fade to black after pressing Play. */
export const LEAVE_MS = 450;

/** The pixel-art table backgrounds the title screen shows off, in order. */
export const SHOWCASE = THEMES.filter((t) => t.scene !== undefined);

const FAN: readonly Pick<Card, 'suit' | 'rank'>[] = [
  { suit: 'spades', rank: 1 },
  { suit: 'hearts', rank: 13 },
  { suit: 'clubs', rank: 12 },
  { suit: 'diamonds', rank: 11 },
] as { suit: Suit; rank: Rank }[];

export interface TitleScreenProps {
  onPlay: () => void;
  reducedMotion: boolean;
  /** Animate the showcased backgrounds (the "Animate backgrounds" setting). */
  animate: boolean;
}

/**
 * The 8-bit title screen shown when the app starts: the animated table backgrounds cycle behind
 * a pixel-art "SOLITAIRE" title and a fan of cards, with a PLAY button (Enter works too).
 * Pressing Play fades to black and starts the game.
 */
export function TitleScreen({ onPlay, reducedMotion, animate }: TitleScreenProps) {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);

  const show = useCallback(
    (next: number) => {
      if (next === index) return;
      setPrevious(index);
      setIndex(next);
    },
    [index],
  );

  // Cycle through the backgrounds; picking one with the dots restarts the timer.
  useEffect(() => {
    const id = setTimeout(() => show((index + 1) % SHOWCASE.length), SHOWCASE_MS);
    return () => clearTimeout(id);
  }, [index, show]);

  // Drop the previous background once the crossfade is done.
  useEffect(() => {
    if (previous === null) return;
    const id = setTimeout(() => setPrevious(null), SHOWCASE_FADE_MS);
    return () => clearTimeout(id);
  }, [previous]);

  const play = useCallback(() => {
    if (started.current) return;
    started.current = true;
    if (reducedMotion) onPlay();
    else setLeaving(true);
  }, [onPlay, reducedMotion]);

  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(onPlay, LEAVE_MS);
    return () => clearTimeout(id);
  }, [leaving, onPlay]);

  // Enter starts the game from anywhere on the title screen.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        play();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [play]);

  const playRef = useRef<HTMLButtonElement>(null);
  useEffect(() => playRef.current?.focus(), []);

  const current = SHOWCASE[index] as (typeof SHOWCASE)[number];
  return (
    <div
      className={`title-screen${leaving ? ' leaving' : ''}${reducedMotion ? ' reduced-motion' : ''}`}
      data-testid="title-screen"
      style={
        { '--fade-ms': `${SHOWCASE_FADE_MS}ms`, '--leave-ms': `${LEAVE_MS}ms` } as CSSProperties
      }
    >
      <div className="title-bg" aria-hidden="true">
        {[previous, index].map((i) =>
          i === null ? null : (
            <PixelCanvas
              key={(SHOWCASE[i] as (typeof SHOWCASE)[number]).id}
              scene={(SHOWCASE[i] as (typeof SHOWCASE)[number]).scene!}
              className={`title-bg-scene${i === index ? ' current' : ''}`}
              animate={animate && !reducedMotion}
            />
          ),
        )}
      </div>
      <div className="title-crt" aria-hidden="true" />

      <main className="title-center">
        <div className="title-cards" aria-hidden="true">
          {FAN.map((card, i) => (
            <div key={i} className="title-card" style={{ '--i': i } as CSSProperties}>
              <CardFace card={card} />
            </div>
          ))}
        </div>
        <h1 className="title-logo">
          <PixelTitle />
          <span className="sr-only">Solitaire</span>
        </h1>
        <PixelText text="KLONDIKE · DRAW ONE" className="title-sub" />
        <button ref={playRef} type="button" className="title-play" onClick={play} aria-label="Play">
          <PixelText text="▶ PLAY" bold />
        </button>
        <PixelText text="PRESS ENTER" className="title-hint" />
      </main>

      <footer className="title-showcase">
        <PixelText text="TABLE THEMES" className="title-showcase-caption" />
        <span className="sr-only" aria-live="polite">
          Showing the {current.name} table
        </span>
        <PixelText text={current.name} className="title-showcase-name" />
        <div className="title-dots">
          {SHOWCASE.map((theme, i) => (
            <button
              key={theme.id}
              type="button"
              className={`title-dot${i === index ? ' active' : ''}`}
              aria-label={`Show the ${theme.name} table`}
              aria-current={i === index}
              onClick={() => show(i)}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}

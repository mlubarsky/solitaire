import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type { Card, Rank, Suit } from '../../engine';
import { THEMES, type ThemeId } from '../../themes/themes';
import { FeltBackground } from '../background/FeltBackground';
import { PixelCanvas } from '../background/PixelBackground';
import { CardFace } from '../cards/CardFace';
import { RulesDialog } from '../RulesDialog';
import { PixelText, PixelTitle } from './PixelText';

/** How long each table background is shown, and the crossfade between them. */
export const SHOWCASE_MS = 5000;
export const SHOWCASE_FADE_MS = 900;
/** Length of the fade to black after pressing Play. */
export const LEAVE_MS = 450;

/** The tables the title screen shows off and lets the player pick from, in order. */
export const SHOWCASE = THEMES;

const FAN: readonly Pick<Card, 'suit' | 'rank'>[] = [
  { suit: 'spades', rank: 1 },
  { suit: 'hearts', rank: 13 },
  { suit: 'clubs', rank: 12 },
  { suit: 'diamonds', rank: 11 },
] as { suit: Suit; rank: Rank }[];

export interface TitleScreenProps {
  /** The saved table: shown first. */
  table: ThemeId;
  /** Starts the game on the table that is showing. */
  onPlay: (table: ThemeId) => void;
  reducedMotion: boolean;
  /** Animate the showcased backgrounds (the "Animate backgrounds" setting). */
  animate: boolean;
}

/**
 * The 8-bit title screen shown when the app starts: the table backgrounds cycle behind a
 * pixel-art "SOLITAIRE" title and a fan of cards, with a PLAY button (Enter works too). The
 * game starts on the table that is showing; the arrows, dots or ←/→ pick one, which also stops
 * the cycling. Pressing Play fades to black and starts the game.
 */
export function TitleScreen({ table, onPlay, reducedMotion, animate }: TitleScreenProps) {
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      SHOWCASE.findIndex((t) => t.id === table),
    ),
  );
  const [picked, setPicked] = useState(false);
  const [previous, setPrevious] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const started = useRef(false);
  const tableNoteId = useId();

  const show = useCallback(
    (next: number) => {
      if (next === index) return;
      setPrevious(index);
      setIndex(next);
    },
    [index],
  );

  const pick = useCallback(
    (next: number) => {
      setPicked(true);
      show((next + SHOWCASE.length) % SHOWCASE.length);
    },
    [show],
  );

  // Cycle through the backgrounds until the player picks one.
  useEffect(() => {
    if (picked) return;
    const id = setTimeout(() => show((index + 1) % SHOWCASE.length), SHOWCASE_MS);
    return () => clearTimeout(id);
  }, [index, show, picked]);

  // Drop the previous background once the crossfade is done.
  useEffect(() => {
    if (previous === null) return;
    const id = setTimeout(() => setPrevious(null), SHOWCASE_FADE_MS);
    return () => clearTimeout(id);
  }, [previous]);

  const current = SHOWCASE[index] as (typeof SHOWCASE)[number];
  const play = useCallback(() => {
    if (started.current) return;
    started.current = true;
    if (reducedMotion) onPlay(current.id);
    else setLeaving(true);
  }, [onPlay, reducedMotion, current.id]);

  // Nothing can change the table once leaving starts (the controls are covered by the fade).
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => onPlay(current.id), LEAVE_MS);
    return () => clearTimeout(id);
  }, [leaving, onPlay, current.id]);

  // Enter starts the game from anywhere on the title screen, and ←/→ pick the table (unless the
  // rules are open).
  useEffect(() => {
    if (rulesOpen || leaving) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        play();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        pick(index + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [play, pick, index, rulesOpen, leaving]);

  const playRef = useRef<HTMLButtonElement>(null);
  useEffect(() => playRef.current?.focus(), []);

  return (
    <div
      className={`title-screen${leaving ? ' leaving' : ''}${reducedMotion ? ' reduced-motion' : ''}`}
      data-testid="title-screen"
      style={
        { '--fade-ms': `${SHOWCASE_FADE_MS}ms`, '--leave-ms': `${LEAVE_MS}ms` } as CSSProperties
      }
    >
      <div className="title-bg" aria-hidden="true">
        {[previous, index].map((i) => {
          if (i === null) return null;
          const theme = SHOWCASE[i] as (typeof SHOWCASE)[number];
          const className = `title-bg-scene${i === index ? ' current' : ''}`;
          return theme.scene ? (
            <PixelCanvas
              key={theme.id}
              scene={theme.scene}
              className={className}
              animate={animate && !reducedMotion}
            />
          ) : (
            <FeltBackground key={theme.id} className={`${className} background-felt`} />
          );
        })}
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
        <button
          ref={playRef}
          type="button"
          className="title-play"
          onClick={play}
          aria-label="Play"
          aria-describedby={tableNoteId}
        >
          <PixelText text="▶ PLAY" bold />
        </button>
        <button type="button" className="title-rules" onClick={() => setRulesOpen(true)}>
          <PixelText text="HOW TO PLAY" />
          <span className="sr-only">How to play</span>
        </button>
        <PixelText text="PRESS ENTER" className="title-hint" />
      </main>

      <footer className="title-showcase">
        <PixelText text="PLAY ON" className="title-showcase-caption" />
        <span className="sr-only" aria-live="polite">
          Showing the {current.name} table
        </span>
        <span id={tableNoteId} className="sr-only">
          Starts on the {current.name} table
        </span>
        <div className="title-table-row">
          <button
            type="button"
            className="title-arrow"
            aria-label="Previous table"
            onClick={() => pick(index - 1)}
          >
            <PixelText text="◀" />
          </button>
          <PixelText text={current.name} className="title-showcase-name" />
          <button
            type="button"
            className="title-arrow"
            aria-label="Next table"
            onClick={() => pick(index + 1)}
          >
            <PixelText text="▶" />
          </button>
        </div>
        <div className="title-dots">
          {SHOWCASE.map((theme, i) => (
            <button
              key={theme.id}
              type="button"
              className={`title-dot${i === index ? ' active' : ''}`}
              aria-label={`Show the ${theme.name} table`}
              aria-current={i === index}
              onClick={() => pick(i)}
            />
          ))}
        </div>
      </footer>
      {rulesOpen && <RulesDialog onClose={() => setRulesOpen(false)} />}
    </div>
  );
}

import type { CSSProperties, PointerEvent, ReactNode, Ref } from 'react';
import { FOUNDATION_SUITS, type Card as CardModel, type Suit } from '../engine';
import { Card } from './Card';
import { bitmapPath, bitmapWidth, LARGE_SUITS } from './cards/pixelGlyphs';
import { wasteFan } from './layout';

export interface PileCardHandlers {
  /** Index of the card within its pile; only called for interactive cards. */
  onCardPointerDown: (index: number, event: PointerEvent<HTMLDivElement>) => void;
  onCardActivate: (index: number) => void;
}

interface PileFrameProps {
  pileKey: string;
  className: string;
  label: string;
  style: CSSProperties;
  pileRef: Ref<HTMLDivElement>;
  children: ReactNode;
}

function PileFrame({ pileKey, className, label, style, pileRef, children }: PileFrameProps) {
  return (
    <div
      ref={pileRef}
      className={`pile ${className}`}
      data-pile={pileKey}
      role="group"
      aria-label={label}
      style={style}
    >
      {children}
    </div>
  );
}

interface CommonProps extends PileCardHandlers {
  pileKey: string;
  cards: readonly CardModel[];
  style: CSSProperties;
  pileRef: Ref<HTMLDivElement>;
  /** False while input is locked (auto-complete, win). */
  interactive: boolean;
  shakingIds: ReadonlySet<string>;
}

/** Stacked pile where only the top card is visible and playable (foundations). */
function StackedCards(props: CommonProps) {
  const { cards, interactive, shakingIds, onCardPointerDown, onCardActivate } = props;
  return cards.map((card, i) => {
    const isTop = i === cards.length - 1;
    return (
      <Card
        key={card.id}
        card={card}
        style={{ zIndex: i + 1 }}
        hidden={!isTop}
        interactive={interactive && isTop}
        shaking={shakingIds.has(card.id)}
        onPointerDown={(e) => onCardPointerDown(i, e)}
        onActivate={() => onCardActivate(i)}
      />
    );
  });
}

/**
 * The waste shows its last 3 cards fanned (vertically in the side layout, horizontally in the
 * narrow one); only the newest is playable. Older cards stay mounted but hidden under the oldest
 * visible card so they can slide into view when the fan re-forms.
 */
export function WastePile(props: CommonProps & { fanDx: number; fanDy: number }) {
  const { cards, interactive, shakingIds, fanDx, fanDy } = props;
  const fan = wasteFan(cards);
  const buried = cards.slice(0, cards.length - fan.length);
  return (
    <PileFrame
      pileKey={props.pileKey}
      className="waste"
      label="Waste"
      style={props.style}
      pileRef={props.pileRef}
    >
      {buried.map((card, i) => (
        <Card key={card.id} card={card} style={{ zIndex: i + 1, visibility: 'hidden' }} hidden />
      ))}
      {fan.map(({ card, index, slot, interactive: newest }) => (
        <Card
          key={card.id}
          card={card}
          style={{ left: slot * fanDx, top: slot * fanDy, zIndex: index + 1 }}
          interactive={interactive && newest}
          shaking={shakingIds.has(card.id)}
          onPointerDown={(e) => props.onCardPointerDown(index, e)}
          onActivate={() => props.onCardActivate(index)}
        />
      ))}
    </PileFrame>
  );
}

/** A faint pixel suit in an empty foundation showing which suit belongs there. */
function SlotSuit({ suit }: { suit: Suit }) {
  const bitmap = LARGE_SUITS[suit];
  const cell = 100 / Math.max(bitmapWidth(bitmap), bitmap.length);
  const x = 50 - (bitmapWidth(bitmap) * cell) / 2;
  const y = 50 - (bitmap.length * cell) / 2;
  return (
    <svg className="slot-suit" viewBox="0 0 100 100" data-suit={suit}>
      <path d={bitmapPath(bitmap, x, y, cell)} shapeRendering="crispEdges" />
    </svg>
  );
}

export function FoundationPile(props: CommonProps & { index: number }) {
  const suit = FOUNDATION_SUITS[props.index] as Suit;
  return (
    <PileFrame
      pileKey={props.pileKey}
      className="foundation"
      label={`Foundation ${props.index + 1}, ${suit}`}
      style={props.style}
      pileRef={props.pileRef}
    >
      <div className="slot foundation-slot" aria-hidden="true">
        <SlotSuit suit={suit} />
      </div>
      <StackedCards {...props} />
    </PileFrame>
  );
}

export function TableauPile(props: CommonProps & { index: number; offsets: readonly number[] }) {
  const { cards, offsets, interactive, shakingIds, onCardPointerDown, onCardActivate } = props;
  return (
    <PileFrame
      pileKey={props.pileKey}
      className="tableau"
      label={`Tableau column ${props.index + 1}`}
      style={props.style}
      pileRef={props.pileRef}
    >
      <div className="slot" aria-hidden="true" />
      {cards.map((card, i) => (
        <Card
          key={card.id}
          card={card}
          style={{ top: offsets[i] ?? 0, zIndex: i + 1 }}
          interactive={interactive && card.faceUp}
          shaking={shakingIds.has(card.id)}
          onPointerDown={(e) => onCardPointerDown(i, e)}
          onActivate={() => onCardActivate(i)}
        />
      ))}
    </PileFrame>
  );
}

export function StockPile(props: {
  cards: readonly CardModel[];
  wasteCount: number;
  style: CSSProperties;
  pileRef: Ref<HTMLButtonElement>;
  disabled: boolean;
  onClick: () => void;
}) {
  const { cards, wasteCount, style, pileRef, disabled, onClick } = props;
  const n = cards.length;
  let label = `Stock, ${n} ${n === 1 ? 'card' : 'cards'}`;
  if (n === 0 && wasteCount > 0) label += ', click to recycle the waste';
  const empty = n === 0 && wasteCount === 0;
  return (
    <button
      ref={pileRef}
      type="button"
      className="pile stock"
      data-pile="stock"
      aria-label={label}
      aria-disabled={disabled || empty || undefined}
      style={style}
      onClick={onClick}
    >
      <span className="slot stock-slot" aria-hidden="true">
        {n === 0 &&
          (wasteCount > 0 ? (
            <svg className="recycle-icon" viewBox="0 0 48 48" aria-hidden="true">
              <path
                d="M24 8a16 16 0 1 1-15.1 10.7"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path d="M4 10 L13 22 L19 9 Z" fill="currentColor" />
            </svg>
          ) : (
            <span className="empty-mark">✕</span>
          ))}
      </span>
      {cards.map((card, i) => (
        <Card key={card.id} card={card} style={{ zIndex: i + 1 }} hidden />
      ))}
    </button>
  );
}

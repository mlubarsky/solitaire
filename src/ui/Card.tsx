import { memo, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { cardLabel, type Card as CardModel } from '../engine';
import { CardBack } from './cards/CardBack';
import { CardFace } from './cards/CardFace';

export interface CardProps {
  card: CardModel;
  style?: CSSProperties;
  /** Face-up cards that can be clicked or dragged. */
  interactive?: boolean;
  /** Hide from assistive tech (e.g. cards buried under the top of the waste). */
  hidden?: boolean;
  shaking?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onActivate?: () => void;
}

function CardView({
  card,
  style,
  interactive = false,
  hidden = false,
  shaking = false,
  onPointerDown,
  onActivate,
}: CardProps) {
  const classes = ['card', card.faceUp ? 'face-up' : 'face-down'];
  if (interactive) classes.push('interactive');
  if (shaking) classes.push('shake');
  const label = card.faceUp ? cardLabel(card) : 'face-down card';

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate?.();
    }
  };

  return (
    <div
      className={classes.join(' ')}
      style={style}
      data-card-id={card.id}
      role={interactive ? 'button' : 'img'}
      aria-label={label}
      aria-hidden={hidden || undefined}
      tabIndex={interactive ? 0 : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
      onClick={interactive ? onActivate : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
    >
      {card.faceUp ? <CardFace card={card} /> : <CardBack />}
    </div>
  );
}

export const Card = memo(CardView);

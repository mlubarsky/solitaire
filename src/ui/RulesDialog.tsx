import { useEffect, useState, type ReactNode } from 'react';
import { POINTS, type Rank, type Suit } from '../engine';
import { CardFace } from './cards/CardFace';
import { Dialog } from './Dialog';
import { Pixel } from './title/PixelText';

type MiniCard = { suit: Suit; rank: Rank };

/** Hearts building up on a foundation. */
const FOUNDATION_EXAMPLE: readonly MiniCard[] = [
  { suit: 'hearts', rank: 1 },
  { suit: 'hearts', rank: 2 },
  { suit: 'hearts', rank: 3 },
];

/** A column built down in alternating colors. */
const COLUMN_EXAMPLE: readonly MiniCard[] = [
  { suit: 'spades', rank: 13 },
  { suit: 'hearts', rank: 12 },
  { suit: 'clubs', rank: 11 },
  { suit: 'diamonds', rank: 10 },
];

const signed = (points: number) => (points > 0 ? `+${points}` : String(points));

/** Points per move (SPEC §5), in the player's words, straight from the engine's table. */
export const SCORING: readonly (readonly [string, string])[] = [
  ['Card to a suit pile', signed(POINTS.tableauToFoundation)],
  ['Deck card to a column', signed(POINTS.wasteToTableau)],
  ['Turn over a card', signed(POINTS.flip)],
  ['Suit pile back to a column', signed(POINTS.foundationToTableau)],
  ['Start the deck over', signed(POINTS.recycle)],
];

function MiniCards({ cards, layout }: { cards: readonly MiniCard[]; layout: 'row' | 'column' }) {
  return (
    <div className={`rules-cards rules-cards-${layout}`} aria-hidden="true">
      {cards.map((card) => (
        <div key={`${card.suit}${card.rank}`} className="mini-card">
          <CardFace card={card} />
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  picture,
  lines,
}: {
  title: string;
  picture?: ReactNode;
  lines: readonly string[];
}) {
  return (
    <section className={`rules-section${picture ? '' : ' no-picture'}`}>
      {picture}
      <div>
        <h3>
          <Pixel text={title} />
        </h3>
        <ul>
          {lines.map((line) => (
            <li key={line}>
              <Pixel text={line} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export interface RulesDialogProps {
  onClose: () => void;
}

/** "How to play": the Easy-mode rules in a few short lines, with small card pictures. */
export function RulesDialog({ onClose }: RulesDialogProps) {
  // Focus goes back to whatever opened the dialog (captured before the dialog takes focus).
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  useEffect(() => () => opener?.focus(), [opener]);

  return (
    <Dialog
      title="How to play"
      className="rules-dialog"
      onDismiss={onClose}
      actions={
        <button type="button" className="btn btn-primary" onClick={onClose} data-autofocus>
          <Pixel text="Got it" />
        </button>
      }
    >
      <div className="rules-body">
        <Section
          title="Goal"
          picture={<MiniCards cards={FOUNDATION_EXAMPLE} layout="row" />}
          lines={[
            'Move all 52 cards to the four suit piles on the right.',
            'Each pile goes Ace, 2, 3 and up to King.',
          ]}
        />
        <Section
          title="Columns"
          picture={<MiniCards cards={COLUMN_EXAMPLE} layout="column" />}
          lines={[
            'Stack cards one lower, red on black or black on red.',
            'Move a face-up run of cards together.',
            'Only a King can go in an empty column.',
          ]}
        />
        <Section
          title="The deck"
          lines={[
            'Click the deck to turn over one card.',
            'When it runs out, click it to start over. As often as you like.',
          ]}
        />
        <Section
          title="Handy"
          lines={[
            'Click a card to send it to its best spot, or drag it.',
            'Undo any move (Ctrl+Z).',
            'Change the table with the palette button next to the gear, or in Settings.',
            'Once every card is face up, the game finishes itself.',
          ]}
        />
        <section className="rules-section no-picture">
          <div>
            <h3>
              <Pixel text="Scoring" />
            </h3>
            <dl className="rules-scoring">
              {SCORING.map(([event, points]) => (
                <div key={event}>
                  <dt>
                    <Pixel text={event} />
                  </dt>
                  <dd className={points.startsWith('-') ? 'minus' : 'plus'}>
                    <Pixel text={points} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
    </Dialog>
  );
}

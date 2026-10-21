import { memo } from 'react';

/** Card back: a white border around a blue field with an 8-bit pixel diamond lattice. */
function CardBackView() {
  return (
    <div className="card-back" data-part="back">
      <div className="card-back-field" />
    </div>
  );
}

export const CardBack = memo(CardBackView);

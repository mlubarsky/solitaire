import { memo } from 'react';

/** Google-style flat back: white border around a blue field with a subtle lattice. */
function CardBackView() {
  return (
    <div className="card-back" data-part="back">
      <div className="card-back-field" />
    </div>
  );
}

export const CardBack = memo(CardBackView);

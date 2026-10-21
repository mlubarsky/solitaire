import { Dialog } from './Dialog';
import { Pixel } from './title/PixelText';

export interface WinDialogProps {
  score: number;
  moves: number;
  onPlayAgain: () => void;
}

export function WinDialog({ score, moves, onPlayAgain }: WinDialogProps) {
  return (
    <Dialog
      title="You win!"
      arcadeTitle
      className="win-dialog"
      actions={
        <button type="button" className="btn btn-primary" onClick={onPlayAgain} data-autofocus>
          <Pixel text="Play again" />
        </button>
      }
    >
      <dl className="win-stats">
        <div>
          <dt>
            <Pixel text="Score" />
          </dt>
          <dd data-testid="win-score">
            <Pixel text={String(score)} />
          </dd>
        </div>
        <div>
          <dt>
            <Pixel text="Moves" />
          </dt>
          <dd data-testid="win-moves">
            <Pixel text={String(moves)} />
          </dd>
        </div>
      </dl>
    </Dialog>
  );
}

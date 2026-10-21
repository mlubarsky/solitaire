import { Dialog } from './Dialog';

export interface WinDialogProps {
  score: number;
  moves: number;
  onPlayAgain: () => void;
}

export function WinDialog({ score, moves, onPlayAgain }: WinDialogProps) {
  return (
    <Dialog
      title="You win!"
      className="win-dialog"
      actions={
        <button type="button" className="btn btn-primary" onClick={onPlayAgain} data-autofocus>
          Play again
        </button>
      }
    >
      <dl className="win-stats">
        <div>
          <dt>Score</dt>
          <dd data-testid="win-score">{score}</dd>
        </div>
        <div>
          <dt>Moves</dt>
          <dd data-testid="win-moves">{moves}</dd>
        </div>
      </dl>
    </Dialog>
  );
}

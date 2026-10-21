import { Dialog } from './Dialog';
import { Pixel } from './title/PixelText';

export interface ConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog
      title="Start a new game?"
      onDismiss={onCancel}
      actions={
        <>
          <button type="button" className="btn btn-flat" onClick={onCancel}>
            <Pixel text="Cancel" />
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} data-autofocus>
            <Pixel text="New game" />
          </button>
        </>
      }
    >
      <p className="dialog-text">
        <Pixel text="Your current game will be lost." />
      </p>
    </Dialog>
  );
}

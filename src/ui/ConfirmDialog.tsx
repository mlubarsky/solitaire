import { Dialog } from './Dialog';

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
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} data-autofocus>
            New game
          </button>
        </>
      }
    >
      <p className="dialog-text">Your current game will be lost.</p>
    </Dialog>
  );
}

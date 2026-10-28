import { forwardRef, useEffect, useId, useState } from 'react';
import type { ThemeId } from '../../themes/themes';
import { Pixel } from '../title/PixelText';
import { BackgroundPicker } from './BackgroundPicker';

export interface TableButtonProps {
  expanded: boolean;
  onClick: () => void;
}

/** Paint-palette button next to the gear; opens the quick table picker. */
export const TableButton = forwardRef<HTMLButtonElement, TableButtonProps>(function TableButton(
  { expanded, onClick },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className="btn btn-icon table-button"
      aria-label="Change table"
      title="Change table"
      aria-expanded={expanded}
      aria-controls="table-picker"
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
});

export interface TablePickerProps {
  background: ThemeId;
  onSelectBackground: (id: ThemeId) => void;
  onClose: () => void;
}

/**
 * Quick table picker: a small popover under the palette button with the six backgrounds.
 * Picking one applies it at once and leaves the popover open for trying others; Escape or a
 * click outside closes it and focus returns to the palette button.
 */
export function TablePicker({ background, onSelectBackground, onClose }: TablePickerProps) {
  const titleId = useId();
  // Captured before the picker moves focus to the selected table.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  useEffect(() => () => opener?.focus(), [opener]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="table-picker-layer">
      <div
        className="table-picker-backdrop"
        data-testid="table-picker-backdrop"
        onClick={onClose}
      />
      <div
        id="table-picker"
        className="table-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId}>
          <Pixel text="Choose a table" />
        </h2>
        <BackgroundPicker
          value={background}
          onSelect={onSelectBackground}
          labelledBy={titleId}
          className="bg-grid-compact"
        />
      </div>
    </div>
  );
}

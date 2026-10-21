import { forwardRef } from 'react';

export interface SettingsButtonProps {
  expanded: boolean;
  onClick: () => void;
}

/** ☰ button at the far left of the top bar. */
export const SettingsButton = forwardRef<HTMLButtonElement, SettingsButtonProps>(
  function SettingsButton({ expanded, onClick }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className="btn btn-icon settings-button"
        aria-label="Settings"
        aria-expanded={expanded}
        aria-controls="settings-panel"
        onClick={onClick}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z" fill="currentColor" />
        </svg>
      </button>
    );
  },
);

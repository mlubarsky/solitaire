import { memo, type Ref } from 'react';
import { Pixel } from './title/PixelText';
import { Logo } from './Logo';
import { SettingsButton } from './settings/SettingsButton';
import { TableButton } from './settings/TablePicker';

export interface TopBarProps {
  score: number;
  moves: number;
  canUndo: boolean;
  onUndo: () => void;
  onUndoAll: () => void;
  onNewGame: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  settingsButtonRef: Ref<HTMLButtonElement>;
  onOpenRules: () => void;
  tablePickerOpen: boolean;
  onToggleTablePicker: () => void;
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="stat">
      <span className="stat-label">
        <Pixel text={label} />
      </span>
      <span className="stat-value" data-testid={testId}>
        <Pixel text={value} />
      </span>
    </div>
  );
}

export function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62A7.95 7.95 0 0 1 12.5 10.5c3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Two stacked back-arrows: undo everything. */
function UndoAllIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M11 18V6l-8.5 6 8.5 6zm.5-6 8.5 6V6l-8.5 6z" fill="currentColor" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"
        fill="currentColor"
      />
    </svg>
  );
}

function NewGameIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
        fill="currentColor"
      />
    </svg>
  );
}

function TopBarView({
  score,
  moves,
  canUndo,
  onUndo,
  onUndoAll,
  onNewGame,
  settingsOpen,
  onToggleSettings,
  settingsButtonRef,
  onOpenRules,
  tablePickerOpen,
  onToggleTablePicker,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <SettingsButton
          ref={settingsButtonRef}
          expanded={settingsOpen}
          onClick={onToggleSettings}
        />
        <TableButton expanded={tablePickerOpen} onClick={onToggleTablePicker} />
        <button
          type="button"
          className="btn btn-icon rules-button"
          aria-label="How to play"
          onClick={onOpenRules}
        >
          <HelpIcon />
        </button>
        <Logo />
      </div>
      <div className="stats">
        <Stat label="Score" value={String(score)} testId="score" />
        <Stat label="Moves" value={String(moves)} testId="moves" />
      </div>
      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
        >
          <UndoIcon />
          <span className="btn-text">
            <Pixel text="Undo" />
          </span>
        </button>
        <button
          type="button"
          className="btn"
          onClick={onUndoAll}
          disabled={!canUndo}
          aria-label="Undo all"
          title="Undo every move, back to the start of this game"
        >
          <UndoAllIcon />
          <span className="btn-text">
            <Pixel text="Undo all" />
          </span>
        </button>
        <button type="button" className="btn btn-primary" onClick={onNewGame} aria-label="New game">
          <NewGameIcon />
          <span className="btn-text">
            <Pixel text="New game" />
          </span>
        </button>
      </div>
    </header>
  );
}

export const TopBar = memo(TopBarView);

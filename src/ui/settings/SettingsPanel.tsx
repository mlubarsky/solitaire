import { useEffect, useId } from 'react';
import { Pixel, PixelText } from '../title/PixelText';
import type { ThemeId } from '../../themes/themes';
import { BackgroundPicker } from './BackgroundPicker';

export interface SettingsPanelProps {
  background: ThemeId;
  onSelectBackground: (id: ThemeId) => void;
  /** Pixel backgrounds play their animations. */
  animateBackground: boolean;
  onAnimateBackgroundChange: (on: boolean) => void;
  /** God mode is thinking or playing. */
  godModeActive: boolean;
  /** God mode can start (a game is in progress). */
  godModeAvailable: boolean;
  onStartGodMode: () => void;
  onStopGodMode: () => void;
  onClose: () => void;
}

/** Slide-in settings panel with the "Table background" picker (SPEC §6). */
export function SettingsPanel({
  background,
  onSelectBackground,
  animateBackground,
  onAnimateBackgroundChange,
  godModeActive,
  godModeAvailable,
  onStartGodMode,
  onStopGodMode,
  onClose,
}: SettingsPanelProps) {
  const godId = useId();
  const titleId = useId();
  const groupId = useId();

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="settings-layer">
      <div className="settings-backdrop" data-testid="settings-backdrop" onClick={onClose} />
      <aside
        id="settings-panel"
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="settings-header">
          <h2 id={titleId}>
            <Pixel text="Settings" />
          </h2>
          <button
            type="button"
            className="settings-close"
            aria-label="Close settings"
            onClick={onClose}
          >
            <PixelText text="✕" />
          </button>
        </header>
        <section className="settings-section">
          <h3 id={groupId}>
            <Pixel text="Table background" />
          </h3>
          <BackgroundPicker value={background} onSelect={onSelectBackground} labelledBy={groupId} />
          <label className="settings-switch">
            <input
              type="checkbox"
              role="switch"
              checked={animateBackground}
              aria-checked={animateBackground}
              onChange={(event) => onAnimateBackgroundChange(event.target.checked)}
            />
            <span className="switch-track" aria-hidden="true" />
            <Pixel text="Animate backgrounds" />
          </label>
        </section>
        <section className="settings-section" aria-labelledby={godId}>
          <h3 id={godId}>
            <Pixel text="God mode" />
          </h3>
          <p className="settings-note">
            <Pixel text="Let the computer play this game for you." />
          </p>
          {godModeActive ? (
            <button type="button" className="god-mode-button stop" onClick={onStopGodMode}>
              <Pixel text="Stop god mode" />
            </button>
          ) : (
            <button
              type="button"
              className="god-mode-button"
              disabled={!godModeAvailable}
              onClick={onStartGodMode}
            >
              <Pixel text="God mode" />
            </button>
          )}
        </section>
      </aside>
    </div>
  );
}

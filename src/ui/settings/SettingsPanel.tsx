import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { THEMES, type Theme, type ThemeId } from '../../themes/themes';
import { FeltBackground } from '../background/FeltBackground';
import { PixelCanvas } from '../background/PixelBackground';

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

function Thumbnail({ theme }: { theme: Theme }) {
  return theme.scene ? (
    <PixelCanvas scene={theme.scene} className="bg-thumb-image" />
  ) : (
    <FeltBackground className="bg-thumb-image background-felt" />
  );
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
  const groupRef = useRef<HTMLDivElement>(null);

  const focusOption = (id: ThemeId) =>
    groupRef.current?.querySelector<HTMLElement>(`[data-theme-id="${id}"]`)?.focus();

  // Focus moves into the panel (to the selected option) when it opens.
  useEffect(() => {
    groupRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onRadioKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = THEMES.findIndex((t) => t.id === background);
    const n = THEMES.length;
    const next: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: n - 1,
    };
    const target = next[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const theme = THEMES[(target + n) % n] as Theme;
    onSelectBackground(theme.id);
    focusOption(theme.id);
  };

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
          <h2 id={titleId}>Settings</h2>
          <button
            type="button"
            className="settings-close"
            aria-label="Close settings"
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        <section className="settings-section">
          <h3 id={groupId}>Table background</h3>
          <div
            ref={groupRef}
            className="bg-grid"
            role="radiogroup"
            aria-labelledby={groupId}
            onKeyDown={onRadioKey}
          >
            {THEMES.map((theme) => {
              const checked = theme.id === background;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  className={`bg-option${checked ? ' selected' : ''}`}
                  data-theme-id={theme.id}
                  onClick={() => onSelectBackground(theme.id)}
                >
                  <span className="bg-thumb">
                    <Thumbnail theme={theme} />
                    {checked && (
                      <span className="bg-check" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className="bg-name">{theme.name}</span>
                </button>
              );
            })}
          </div>
          <label className="settings-switch">
            <input
              type="checkbox"
              role="switch"
              checked={animateBackground}
              aria-checked={animateBackground}
              onChange={(event) => onAnimateBackgroundChange(event.target.checked)}
            />
            <span className="switch-track" aria-hidden="true" />
            <span>Animate backgrounds</span>
          </label>
        </section>
        <section className="settings-section" aria-labelledby={godId}>
          <h3 id={godId}>God mode</h3>
          <p className="settings-note">
            Let the computer finish this game for you. It knows where every card is and plays the
            shortest winning line it can find, half a second per move. Change the speed with the
            slider while it plays.
          </p>
          {godModeActive ? (
            <button type="button" className="god-mode-button stop" onClick={onStopGodMode}>
              Stop god mode
            </button>
          ) : (
            <button
              type="button"
              className="god-mode-button"
              disabled={!godModeAvailable}
              onClick={onStartGodMode}
            >
              God mode
            </button>
          )}
        </section>
      </aside>
    </div>
  );
}

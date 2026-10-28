import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Pixel } from '../title/PixelText';
import { THEMES, type Theme, type ThemeId } from '../../themes/themes';
import { FeltBackground } from '../background/FeltBackground';
import { PixelCanvas } from '../background/PixelBackground';

function Thumbnail({ theme }: { theme: Theme }) {
  return theme.scene ? (
    <PixelCanvas scene={theme.scene} className="bg-thumb-image" />
  ) : (
    <FeltBackground className="bg-thumb-image background-felt" />
  );
}

export interface BackgroundPickerProps {
  value: ThemeId;
  onSelect: (id: ThemeId) => void;
  /** Id of the element naming the radio group. */
  labelledBy: string;
  className?: string;
}

/**
 * The six table backgrounds as labeled thumbnails: a radio group with arrow-key navigation.
 * The selected option takes focus when the picker mounts. Used by the settings panel and the
 * header's quick table picker.
 */
export function BackgroundPicker({
  value,
  onSelect,
  labelledBy,
  className,
}: BackgroundPickerProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  const focusOption = (id: ThemeId) =>
    groupRef.current?.querySelector<HTMLElement>(`[data-theme-id="${id}"]`)?.focus();

  useEffect(() => {
    groupRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, []);

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = THEMES.findIndex((t) => t.id === value);
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
    onSelect(theme.id);
    focusOption(theme.id);
  };

  return (
    <div
      ref={groupRef}
      className={`bg-grid${className ? ` ${className}` : ''}`}
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKey}
    >
      {THEMES.map((theme) => {
        const checked = theme.id === value;
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={`bg-option${checked ? ' selected' : ''}`}
            data-theme-id={theme.id}
            onClick={() => onSelect(theme.id)}
          >
            <span className="bg-thumb">
              <Thumbnail theme={theme} />
              {checked && (
                <span className="bg-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor" />
                  </svg>
                </span>
              )}
            </span>
            <span className="bg-name">
              <Pixel text={theme.name} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

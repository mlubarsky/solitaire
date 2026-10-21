import { useCallback, useState } from 'react';
import { DEFAULT_THEME, isThemeId, type ThemeId } from './themes';

export const STORAGE_KEY = 'solitaire.background';

/** Reads the saved background; any problem (missing, unknown, storage throws) → default. */
export function readStoredTheme(): ThemeId {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isThemeId(value) ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeStoredTheme(id: ThemeId): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage may be unavailable (private mode, quota); the choice just won't persist.
  }
}

/** The selected table background, persisted in localStorage. */
export function useBackground(): [ThemeId, (id: ThemeId) => void] {
  const [theme, setTheme] = useState<ThemeId>(readStoredTheme);
  const select = useCallback((id: ThemeId) => {
    setTheme(id);
    writeStoredTheme(id);
  }, []);
  return [theme, select];
}

export const ANIMATE_STORAGE_KEY = 'solitaire.animateBackground';

/** Reads the saved "animate backgrounds" switch; on unless it was explicitly turned off. */
export function readStoredAnimate(): boolean {
  try {
    return window.localStorage.getItem(ANIMATE_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Whether pixel backgrounds animate, persisted in localStorage. */
export function useAnimateBackground(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState<boolean>(readStoredAnimate);
  const select = useCallback((value: boolean) => {
    setOn(value);
    try {
      window.localStorage.setItem(ANIMATE_STORAGE_KEY, value ? 'on' : 'off');
    } catch {
      // Storage may be unavailable; the choice just won't persist.
    }
  }, []);
  return [on, select];
}

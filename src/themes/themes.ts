import type { Scene } from './scene';
import { aurora } from './scenes/aurora';
import { forest } from './scenes/forest';
import { iceMountains } from './scenes/iceMountains';
import { nightCity } from './scenes/nightCity';
import { ocean } from './scenes/ocean';

export type ThemeId = 'classic' | 'night-city' | 'aurora' | 'ice-mountains' | 'forest' | 'ocean';

export interface Theme {
  id: ThemeId;
  /** Name shown in the settings menu (SPEC §7.1). */
  name: string;
  kind: 'felt' | 'pixel';
  scene?: Scene;
}

export const THEMES: readonly Theme[] = [
  { id: 'classic', name: 'Classic green', kind: 'felt' },
  { id: 'night-city', name: 'Night city', kind: 'pixel', scene: nightCity },
  { id: 'aurora', name: 'Aurora', kind: 'pixel', scene: aurora },
  { id: 'ice-mountains', name: 'Snowy peaks', kind: 'pixel', scene: iceMountains },
  { id: 'forest', name: 'Woodland', kind: 'pixel', scene: forest },
  { id: 'ocean', name: 'Deep sea', kind: 'pixel', scene: ocean },
];

export const DEFAULT_THEME: ThemeId = 'classic';

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function themeById(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) as Theme;
}

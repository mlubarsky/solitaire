import { useSyncExternalStore } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function getReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
}

function subscribeResize(callback: () => void): () => void {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

function getViewportKey(): string {
  return `${window.innerWidth}x${window.innerHeight}`;
}

/** The current viewport size; re-renders on resize. */
export function useViewport(): { width: number; height: number } {
  const key = useSyncExternalStore(subscribeResize, getViewportKey, () => '1024x768');
  const [width, height] = key.split('x').map(Number) as [number, number];
  return { width, height };
}

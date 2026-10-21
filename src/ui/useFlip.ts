import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';

export const MOVE_MS = 180;
export const RETURN_MS = 150;

function cardElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-card-id]'));
}

function animateFrom(el: HTMLElement, from: DOMRect, to: DOMRect, flip: boolean, ms: number) {
  if (typeof el.animate !== 'function') return;
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && !flip) return;
  const start = `translate(${dx}px, ${dy}px)${flip ? ' scaleX(0)' : ''}`;
  el.animate(
    [
      { transform: start, zIndex: 900 },
      { transform: 'translate(0, 0)', zIndex: 900 },
    ],
    { duration: ms, easing: 'ease-out' },
  );
}

/**
 * FLIP animations for cards: after every render where the board state changed, each card is
 * animated (with CSS transforms only) from where it was to where it now is. Face-down → face-up
 * changes get a quick scale-X flip.
 */
export function useFlip(
  rootRef: RefObject<HTMLElement | null>,
  stateKey: unknown,
  /** Changes when the layout changes or a new deal starts: re-measure without animating. */
  resetKey: string,
  disabled: boolean,
  /** Length of a card move animation. */
  moveMs: number = MOVE_MS,
) {
  const rectsRef = useRef(new Map<string, DOMRect>());
  const faceUpRef = useRef(new Map<string, boolean>());
  const pendingRef = useRef<ReadonlyMap<string, DOMRect> | null>(null);
  const resetRef = useRef(resetKey);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const elements = cardElements(root);
    const measured = new Map<string, DOMRect>();
    const faceUp = new Map<string, boolean>();
    for (const el of elements) {
      const id = el.dataset.cardId as string;
      measured.set(id, el.getBoundingClientRect());
      faceUp.set(id, el.classList.contains('face-up'));
    }
    const animate = !disabled && resetRef.current === resetKey;
    if (animate) {
      for (const el of elements) {
        const id = el.dataset.cardId as string;
        const from = pendingRef.current?.get(id) ?? rectsRef.current.get(id);
        const flipped = faceUpRef.current.get(id) === false && faceUp.get(id) === true;
        if (from) animateFrom(el, from, measured.get(id) as DOMRect, flipped, moveMs);
      }
    }
    rectsRef.current = measured;
    faceUpRef.current = faceUp;
    pendingRef.current = null;
    resetRef.current = resetKey;
  }, [rootRef, stateKey, resetKey, disabled, moveMs]);

  /** Use these rects (e.g. where cards were dropped) as the start of the next FLIP. */
  const setPending = useCallback((rects: ReadonlyMap<string, DOMRect>) => {
    pendingRef.current = rects;
  }, []);

  /** Animate cards back from `rects` to their current place (an invalid drop). */
  const animateBack = useCallback(
    (rects: ReadonlyMap<string, DOMRect>) => {
      const root = rootRef.current;
      if (!root || disabled) return;
      for (const el of cardElements(root)) {
        const from = rects.get(el.dataset.cardId as string);
        if (from) animateFrom(el, from, el.getBoundingClientRect(), false, RETURN_MS);
      }
    },
    [rootRef, disabled],
  );

  return { setPending, animateBack };
}

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { pickDropTarget, type Target } from './hitTest';

/** Movement (px) beyond which a press becomes a drag; anything less is a click. */
export const DRAG_THRESHOLD = 5;

export interface DragSource<S> {
  source: S;
  /** Card ids being moved, bottom (grabbed) card first. */
  cardIds: readonly string[];
}

export interface DropInfo<S> {
  source: S;
  cardIds: readonly string[];
  /** Id of the target with the greatest overlap, or null. */
  target: string | null;
  /** Screen rects of the dragged cards at the moment of release. */
  rects: ReadonlyMap<string, DOMRect>;
}

export interface DragOptions<S> {
  /** Root element containing the `[data-card-id]` card elements. */
  getRoot: () => HTMLElement | null;
  getTargets: () => Target<string>[];
  onDrop: (info: DropInfo<S>) => void;
}

/** One press of the pointer on a card; becomes a drag once it moves past the threshold. */
class PressSession<S> {
  dragging = false;
  private readonly startX: number;
  private readonly startY: number;

  constructor(
    readonly drag: DragSource<S>,
    readonly pointerId: number,
    start: { clientX: number; clientY: number },
    private readonly elements: HTMLElement[],
  ) {
    this.startX = start.clientX;
    this.startY = start.clientY;
  }

  /** Returns true if the pointer move was consumed by a drag. */
  move(clientX: number, clientY: number): boolean {
    const dx = clientX - this.startX;
    const dy = clientY - this.startY;
    if (!this.dragging) {
      if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return false;
      this.dragging = true;
      for (const el of this.elements) el.classList.add('dragging');
    }
    for (const el of this.elements) el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    return true;
  }

  /** Measures the dragged cards, then puts them back in their normal place. */
  release(): Map<string, DOMRect> {
    const rects = new Map<string, DOMRect>();
    this.elements.forEach((el, i) => {
      rects.set(this.drag.cardIds[i] as string, el.getBoundingClientRect());
      el.style.transform = '';
      el.classList.remove('dragging');
    });
    return rects;
  }
}

/**
 * Pointer-event drag and drop (mouse + touch). Dragged elements are moved imperatively with
 * CSS transforms so the pointer can be followed without re-rendering React.
 */
export function useDrag<S>(options: DragOptions<S>) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  const sessionRef = useRef<PressSession<S> | null>(null);
  const suppressClickRef = useRef(false);
  const detachRef = useRef<(() => void) | null>(null);

  const finish = useCallback((event: PointerEvent, cancelled: boolean) => {
    const session = sessionRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    detachRef.current?.();
    sessionRef.current = null;
    if (!session.dragging) return;

    // The browser may follow pointerup with a click on the card; that click is not a tap.
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    const rects = session.release();
    const { cardIds, source } = session.drag;
    const grabbed = rects.get(cardIds[0] as string) as DOMRect;
    const target = cancelled ? null : pickDropTarget(grabbed, optionsRef.current.getTargets());
    optionsRef.current.onDrop({ source, cardIds, target, rects });
  }, []);

  const onMove = useCallback((event: PointerEvent) => {
    const session = sessionRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    if (session.move(event.clientX, event.clientY)) event.preventDefault();
  }, []);

  const startPress = useCallback(
    (event: ReactPointerEvent, drag: DragSource<S>) => {
      // Only one drag at a time; ignore extra touches and non-primary mouse buttons.
      if (sessionRef.current || !event.isPrimary || event.button !== 0) return;
      const root = optionsRef.current.getRoot();
      const elements = drag.cardIds
        .map((id) => root?.querySelector<HTMLElement>(`[data-card-id="${id}"]`))
        .filter((el): el is HTMLElement => el != null);
      if (elements.length !== drag.cardIds.length) return;
      sessionRef.current = new PressSession(drag, event.pointerId, event, elements);
      const up = (e: PointerEvent) => finish(e, false);
      const cancel = (e: PointerEvent) => finish(e, true);
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
      detachRef.current = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        detachRef.current = null;
      };
    },
    [finish, onMove],
  );

  /** True if a click event should be ignored because it ends a drag. */
  const consumeClick = useCallback((): boolean => suppressClickRef.current, []);

  useEffect(() => () => detachRef.current?.(), []);

  return { startPress, consumeClick };
}

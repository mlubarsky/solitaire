export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Target<T> {
  id: T;
  rect: Rect;
}

/** Area of the intersection of two rectangles (0 if they don't overlap). */
export function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Picks the drop target whose rect overlaps `dragged` the most. Returns null if nothing
 * overlaps. Ties go to the earliest target in the list (deterministic).
 */
export function pickDropTarget<T>(dragged: Rect, targets: readonly Target<T>[]): T | null {
  let best: T | null = null;
  let bestArea = 0;
  for (const target of targets) {
    const area = overlapArea(dragged, target.rect);
    if (area > bestArea) {
      best = target.id;
      bestArea = area;
    }
  }
  return best;
}

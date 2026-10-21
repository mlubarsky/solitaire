import { useEffect, useRef } from 'react';
import { rankLabel, suitColor, suitSymbol, type Card, type GameState } from '../engine';

/** Hard cap on the celebration's length. */
export const CELEBRATION_MAX_MS = 7000;
const LAUNCH_EVERY_MS = 70;

interface Bouncer {
  card: Card;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const RED = '#d32f2f';
const BLACK = '#212121';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = w * 0.06;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCard(ctx: CanvasRenderingContext2D, card: Card, x: number, y: number, w: number) {
  const h = w * 1.4;
  roundRect(ctx, x, y, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#9e9e9e';
  ctx.stroke();
  ctx.fillStyle = suitColor(card.suit) === 'red' ? RED : BLACK;
  ctx.textBaseline = 'top';
  ctx.font = `bold ${Math.round(w * 0.26)}px system-ui, sans-serif`;
  ctx.fillText(rankLabel(card.rank), x + w * 0.08, y + w * 0.07);
  ctx.font = `${Math.round(w * 0.5)}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(suitSymbol(card.suit), x + w / 2, y + h * 0.58);
  ctx.textAlign = 'start';
}

/** Cards launched from the foundations in classic order: Kings first, round-robin by pile. */
function launchQueue(foundations: GameState['foundations'], origins: Box[]) {
  const queue: { card: Card; origin: Box }[] = [];
  for (let rank = 13; rank >= 1; rank--) {
    foundations.forEach((pile, i) => {
      const card = pile[rank - 1];
      const origin = origins[i];
      if (card && origin) queue.push({ card, origin });
    });
  }
  return queue;
}

function foundationBoxes(): Box[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-pile^="f"]')).map((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
}

export interface CelebrationProps {
  foundations: GameState['foundations'];
  onDone: () => void;
}

/**
 * Classic bouncing-cards win animation, drawn on a <canvas>. Cards leave trails because the
 * canvas is never cleared. Any click or key press skips it.
 */
export function Celebration({ foundations, onDone }: CelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx?.scale(dpr, dpr);

    const boxes = foundationBoxes();
    const cardWidth = boxes[0]?.width ?? 80;
    const cardHeight = cardWidth * 1.4;
    const queue = launchQueue(foundations, boxes);
    const active: Bouncer[] = [];
    const unit = cardWidth / 71; // motion tuned for 71px-wide classic cards, scaled to ours
    let finished = false;
    let frame = 0;
    let lastTime: number | null = null;
    let sinceLaunch = LAUNCH_EVERY_MS;

    const finish = () => {
      if (finished) return;
      finished = true;
      onDoneRef.current();
    };

    const step = (time: number) => {
      if (finished) return;
      const dtMs = lastTime === null ? 16 : Math.min(48, time - lastTime);
      lastTime = time;
      const dt = dtMs / 16.67;
      sinceLaunch += dtMs;
      if (sinceLaunch >= LAUNCH_EVERY_MS && queue.length > 0) {
        sinceLaunch = 0;
        const next = queue.shift() as (typeof queue)[number];
        const direction = Math.random() < 0.5 ? -1 : 1;
        active.push({
          card: next.card,
          x: next.origin.left,
          y: next.origin.top,
          vx: direction * unit * (2.5 + Math.random() * 5),
          vy: -unit * Math.random() * 10,
        });
      }
      for (let i = active.length - 1; i >= 0; i--) {
        const b = active[i] as Bouncer;
        b.vy += 0.6 * unit * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y + cardHeight > height) {
          b.y = height - cardHeight;
          b.vy = -b.vy * 0.75;
        }
        if (ctx) drawCard(ctx, b.card, b.x, b.y, cardWidth);
        if (b.x + cardWidth < 0 || b.x > width) active.splice(i, 1);
      }
      if (queue.length === 0 && active.length === 0) {
        finish();
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    const timeout = setTimeout(finish, CELEBRATION_MAX_MS);
    const skip = () => finish();
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);
    return () => {
      finished = true;
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
    };
  }, [foundations]);

  return (
    <canvas ref={canvasRef} className="celebration" data-testid="celebration" aria-hidden="true" />
  );
}

import { useEffect, useRef } from 'react';

/** The confetti never runs longer than this. */
export const CONFETTI_MAX_MS = 4500;
const PIECES = 140;
/** Gold, red, cream, green, blue and pink: the game's own accent colors. */
export const CONFETTI_COLORS = ['#f2c14e', '#e53935', '#f3ead2', '#3ddc84', '#4f9cf0', '#ff6f91'];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  spinSpeed: number;
  sway: number;
  color: string;
  delay: number;
}

function makePieces(width: number): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => ({
    x: Math.random() * width,
    y: -20 - Math.random() * 120,
    vx: (Math.random() - 0.5) * 1.2,
    vy: 1.5 + Math.random() * 2,
    size: 6 + Math.random() * 6,
    spin: Math.random() * Math.PI * 2,
    spinSpeed: 0.08 + Math.random() * 0.12,
    sway: Math.random() * Math.PI * 2,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] as string,
    delay: Math.random() * 600,
  }));
}

export interface ConfettiProps {
  onDone: () => void;
}

/**
 * A short burst of confetti falling from the top of the screen when the game is won. It never
 * blocks input (the win dialog shows at the same time) and ends once every piece has fallen out
 * of view, or after CONFETTI_MAX_MS.
 */
export function Confetti({ onDone }: ConfettiProps) {
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

    const pieces = makePieces(width);
    let finished = false;
    let frame = 0;
    let start: number | null = null;
    let last: number | null = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      onDoneRef.current();
    };

    const step = (time: number) => {
      if (finished) return;
      start ??= time;
      const dt = last === null ? 1 : Math.min(3, (time - last) / 16.67);
      last = time;
      const elapsed = time - start;
      ctx?.clearRect(0, 0, width, height);
      let falling = 0;
      for (const p of pieces) {
        if (elapsed < p.delay) {
          falling++;
          continue;
        }
        p.vy = Math.min(p.vy + 0.05 * dt, 4.5); // gentle gravity, light air resistance
        p.sway += 0.05 * dt;
        p.x += (p.vx + Math.sin(p.sway) * 0.6) * dt;
        p.y += p.vy * dt;
        p.spin += p.spinSpeed * dt;
        if (p.y < height + 20) falling++;
        if (ctx) {
          // A paper rectangle flipping over: its width shrinks and grows as it spins.
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin * 0.5);
          ctx.fillStyle = p.color;
          ctx.fillRect(
            (-p.size / 2) * Math.cos(p.spin),
            -p.size / 3,
            p.size * Math.cos(p.spin),
            (p.size * 2) / 3,
          );
          ctx.restore();
        }
      }
      if (falling === 0) {
        finish();
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    const timeout = setTimeout(finish, CONFETTI_MAX_MS);
    return () => {
      finished = true;
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, []);

  return <canvas ref={canvasRef} className="confetti" data-testid="confetti" aria-hidden="true" />;
}

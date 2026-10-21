import { useEffect, useRef } from 'react';
import { SCENE_FPS, sceneAnimator, sceneBuffer, sceneSize, type Scene } from '../../themes/scene';
import type { PixelBuffer } from '../../themes/pixelBuffer';

/** Wraps a pixel buffer for putImageData, sharing its memory when the browser allows it. */
function imageFor(
  ctx: CanvasRenderingContext2D,
  buf: PixelBuffer,
): { image: ImageData; shared: boolean } {
  if (typeof ImageData === 'function') {
    return {
      image: new ImageData(buf.data as Uint8ClampedArray<ArrayBuffer>, buf.width, buf.height),
      shared: true,
    };
  }
  return { image: ctx.createImageData(buf.width, buf.height), shared: false };
}

/**
 * A canvas at the scene's native resolution; CSS scales it with `image-rendering: pixelated`.
 * When `animate` is set and the scene has moving layers, it plays at SCENE_FPS: a
 * requestAnimationFrame loop (which the browser pauses in background tabs) that only draws
 * when the frame number changes, into one reused buffer.
 */
export function PixelCanvas({
  scene,
  className,
  animate = false,
}: {
  scene: Scene;
  className: string;
  animate?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { width, height } = sceneSize(scene);
  useEffect(() => {
    const ctx = (ref.current as HTMLCanvasElement).getContext('2d', { alpha: false });
    if (!ctx) return;
    const animator = sceneAnimator(scene);
    const moving = animate && animator.animated;
    const first = moving ? animator.frame(0) : sceneBuffer(scene);
    const { image, shared } = imageFor(ctx, first);
    const paint = (buf: PixelBuffer) => {
      if (!shared) image.data.set(buf.data);
      ctx.putImageData(image, 0, 0);
    };
    paint(first);
    if (!moving) return;

    let raf = 0;
    let start: number | null = null;
    let shown = 0;
    const tick = (now: number) => {
      start ??= now;
      const n = Math.floor(((now - start) * SCENE_FPS) / 1000);
      if (n !== shown) {
        shown = n;
        paint(animator.frame(n));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scene, animate]);
  return (
    <canvas ref={ref} className={className} width={width} height={height} aria-hidden="true" />
  );
}

/** Full-viewport pixel-art background: covers the viewport, anchored to the bottom center. */
export function PixelBackground({ scene, animate }: { scene: Scene; animate: boolean }) {
  return <PixelCanvas scene={scene} className="background-pixels" animate={animate} />;
}

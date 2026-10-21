import { GOD_MODE_FASTEST_MS, GOD_MODE_SLOWEST_MS, type GodModeStatus } from '../state/useGodMode';
import { Pixel, PixelText } from './title/PixelText';

export interface GodModeBannerProps {
  status: GodModeStatus;
  finishing: boolean;
  step: number;
  total: number;
  message: string | null;
  /** Pause between moves; the speed slider changes it. */
  delayMs: number;
  onDelayChange: (ms: number) => void;
  onStop: () => void;
  onDismiss: () => void;
}

/** Status pill at the bottom of the screen while god mode runs, or its outcome note afterwards. */
export function GodModeBanner({
  status,
  finishing,
  step,
  total,
  message,
  delayMs,
  onDelayChange,
  onStop,
  onDismiss,
}: GodModeBannerProps) {
  if (status === 'idle' && message === null) return null;
  if (status === 'idle') {
    return (
      <div className="god-banner" role="status" data-testid="god-banner">
        <span className="god-text">
          <Pixel text={message ?? ''} />
        </span>
        <button type="button" className="god-button" aria-label="Dismiss" onClick={onDismiss}>
          <PixelText text="✕" />
        </button>
      </div>
    );
  }
  const text =
    status === 'thinking'
      ? 'God mode: working out the best line…'
      : finishing
        ? 'God mode: finishing the game'
        : `God mode: move ${Math.min(step + 1, total)} of ${total}`;
  return (
    <div className="god-banner active" role="status" data-testid="god-banner">
      <span className="god-text">
        <Pixel text={text} />
      </span>
      <SpeedSlider delayMs={delayMs} onChange={onDelayChange} />
      <button type="button" className="god-button" onClick={onStop}>
        <Pixel text="Stop" />
      </button>
    </div>
  );
}

/** Seconds per move, e.g. "0.05 s", "0.5 s", "1 s". */
export function formatPace(ms: number): string {
  return `${Number((ms / 1000).toFixed(2))} s`;
}

/**
 * Speed slider: left is slowest (1 s per move), right is fastest (0.05 s). The input's value is
 * mirrored so that moving right means faster.
 */
function SpeedSlider({ delayMs, onChange }: { delayMs: number; onChange: (ms: number) => void }) {
  const mirror = GOD_MODE_SLOWEST_MS + GOD_MODE_FASTEST_MS;
  return (
    <label className="god-speed">
      <span className="god-speed-label">
        <Pixel text="Speed" />
      </span>
      <input
        type="range"
        min={GOD_MODE_FASTEST_MS}
        max={GOD_MODE_SLOWEST_MS}
        step={50}
        value={mirror - delayMs}
        aria-valuetext={`${formatPace(delayMs)} per move`}
        onChange={(event) => onChange(mirror - Number(event.target.value))}
      />
      <span className="god-speed-value" aria-hidden="true">
        <PixelText text={formatPace(delayMs)} />
      </span>
    </label>
  );
}

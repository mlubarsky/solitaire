import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, Move, SolveResult } from '../engine';
import type { Phase } from './gameReducer';
import { solveInBackground, type SolveJob, type SolverFn } from './solverClient';

/** Pause between god-mode moves by default (SPEC §6: about half a second per card). */
export const GOD_MODE_STEP_MS = 500;
/** The speed slider's range: from 1 s per move down to nearly instant. */
export const GOD_MODE_SLOWEST_MS = 1000;
export const GOD_MODE_FASTEST_MS = 50;

/** Card move animation length at a given god-mode pace: 60% of the pause, so moves never overlap. */
export function godModeAnimationMs(delayMs: number): number {
  return Math.max(30, Math.round(delayMs * 0.6));
}

export type GodModeStatus = 'idle' | 'thinking' | 'playing';

export interface GodModeApi {
  status: GodModeStatus;
  /** True while thinking or playing: the board is locked. */
  active: boolean;
  /** Moves played so far and planned in total (before auto-complete takes over). */
  step: number;
  total: number;
  /** Outcome note shown after god mode stops without winning, if any. */
  message: string | null;
  start: () => void;
  stop: () => void;
  dismissMessage: () => void;
}

export interface GodModeOptions {
  game: GameState;
  phase: Phase;
  /** Changes whenever a new position is dealt or loaded; god mode stops then. */
  dealId: number;
  tryMove: (move: Move) => boolean;
  delayMs?: number;
  solver?: SolverFn;
}

function outcomeMessage(result: SolveResult, cards: number): string {
  return result.status === 'unsolvable'
    ? `This deal can't be won. God mode got ${cards} cards to the foundations.`
    : `God mode couldn't find a win within its search limit. It got ${cards} cards to the foundations.`;
}

/**
 * God mode: solves the current position (knowing every face-down card) and plays the line one
 * move every `delayMs`. Once the line reaches a position auto-complete can finish, auto-complete
 * takes over (the app runs it at god-mode pace while `active`).
 */
export function useGodMode({
  game,
  phase,
  dealId,
  tryMove,
  delayMs = GOD_MODE_STEP_MS,
  solver = solveInBackground,
}: GodModeOptions): GodModeApi {
  const [status, setStatus] = useState<GodModeStatus>('idle');
  const [plan, setPlan] = useState<SolveResult | null>(null);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const job = useRef<SolveJob | null>(null);

  const stop = useCallback(() => {
    job.current?.cancel();
    job.current = null;
    setStatus('idle');
    setPlan(null);
    setStep(0);
  }, []);

  const start = useCallback(() => {
    if (status !== 'idle' || phase !== 'playing') return;
    setMessage(null);
    setStatus('thinking');
    const current = solver(game);
    job.current = current;
    current.promise.then(
      (result) => {
        if (job.current !== current) return;
        job.current = null;
        setPlan(result);
        setStep(0);
        setStatus('playing');
      },
      () => {
        if (job.current !== current) return;
        job.current = null;
        setStatus('idle');
        setMessage('God mode could not start. Please try again.');
      },
    );
  }, [status, phase, solver, game]);

  // A new deal (or loaded position) cancels god mode. State is reset while rendering (React's
  // "adjust state when a prop changes" pattern); the pending solve is cancelled in an effect.
  const [deal, setDeal] = useState(dealId);
  if (deal !== dealId) {
    setDeal(dealId);
    setStatus('idle');
    setPlan(null);
    setStep(0);
    setMessage(null);
  }
  useEffect(() => {
    job.current?.cancel();
    job.current = null;
  }, [dealId]);

  // Cancel any pending solve if the app unmounts.
  useEffect(() => () => job.current?.cancel(), []);

  // The line is done: the game is won, or every planned move has been played. (If auto-complete
  // took over, the phase is 'autocompleting' and the board stays locked until the win.)
  if (
    status === 'playing' &&
    plan !== null &&
    (phase === 'won' || (phase === 'playing' && step >= plan.moves.length))
  ) {
    setStatus('idle');
    setPlan(null);
    setStep(0);
    if (phase !== 'won' && plan.status !== 'solved') {
      setMessage(
        outcomeMessage(
          plan,
          game.foundations.reduce((n, p) => n + p.length, 0),
        ),
      );
    }
  }

  useEffect(() => {
    if (status !== 'playing' || plan === null || phase !== 'playing') return;
    if (step >= plan.moves.length) return;
    const id = setTimeout(() => {
      if (tryMove(plan.moves[step] as Move)) setStep((s) => s + 1);
      else {
        stop();
        setMessage('God mode stopped because the board changed.');
      }
    }, delayMs);
    return () => clearTimeout(id);
  }, [status, plan, step, phase, delayMs, tryMove, stop]);

  const dismissMessage = useCallback(() => setMessage(null), []);

  return {
    status,
    active: status !== 'idle',
    step,
    total: plan?.moves.length ?? 0,
    message,
    start,
    stop,
    dismissMessage,
  };
}

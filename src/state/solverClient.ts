import { solve, type GameState, type SolveResult } from '../engine';

/** A running solve. `cancel` stops it; a cancelled job's promise never settles. */
export interface SolveJob {
  promise: Promise<SolveResult>;
  cancel: () => void;
}

export type SolverFn = (state: GameState) => SolveJob;

/** Solves on the main thread after yielding once (used where Web Workers are unavailable). */
export const solveInline: SolverFn = (state) => {
  let id: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<SolveResult>((resolve) => {
    id = setTimeout(() => resolve(solve(state)), 0);
  });
  return { promise, cancel: () => clearTimeout(id) };
};

/** Solves in a Web Worker so the page stays responsive while god mode thinks. */
export const solveInBackground: SolverFn = (state) => {
  if (typeof Worker === 'undefined') return solveInline(state);
  const worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
  const promise = new Promise<SolveResult>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<SolveResult>) => {
      resolve(event.data);
      worker.terminate();
    };
    worker.onerror = (event) => {
      reject(new Error(event.message));
      worker.terminate();
    };
  });
  worker.postMessage(state);
  return { promise, cancel: () => worker.terminate() };
};

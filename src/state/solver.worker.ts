import { solve, type GameState } from '../engine';

/** God mode's solver, off the main thread: receives a position, replies with a SolveResult. */
self.onmessage = (event: MessageEvent<GameState>) => {
  self.postMessage(solve(event.data));
};

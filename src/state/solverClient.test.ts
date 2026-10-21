import { afterEach, describe, expect, it, vi } from 'vitest';
import { solve, type SolveResult } from '../engine';
import { makeState, upTo } from '../test/makeState';
import { solveInBackground, solveInline } from './solverClient';

const almostWon = () =>
  makeState({
    foundations: [upTo('S', 13), upTo('H', 11), upTo('D', 13), upTo('C', 12)],
    tableau: [['#HQ', 'CK'], ['HK']],
    stock: [],
  });

/** A stand-in Web Worker that records what it was sent. */
class FakeWorker {
  static last: FakeWorker | null = null;
  onmessage: ((event: { data: SolveResult }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  constructor(
    readonly url: URL,
    readonly options: unknown,
  ) {
    FakeWorker.last = this;
  }
  postMessage(data: unknown) {
    this.posted.push(data);
  }
  terminate() {
    this.terminated = true;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  FakeWorker.last = null;
});

describe('solveInline', () => {
  it('solves after yielding to the event loop', async () => {
    await expect(solveInline(almostWon()).promise).resolves.toEqual(solve(almostWon()));
  });

  it('cancel stops a solve that has not started yet', () => {
    vi.useFakeTimers();
    const resolved = vi.fn();
    const job = solveInline(almostWon());
    void job.promise.then(resolved);
    job.cancel();
    vi.runAllTimers();
    expect(resolved).not.toHaveBeenCalled();
  });
});

describe('solveInBackground', () => {
  it('falls back to solving inline without Web Workers', async () => {
    vi.stubGlobal('Worker', undefined);
    await expect(solveInBackground(almostWon()).promise).resolves.toEqual(solve(almostWon()));
  });

  it('posts the position to a module worker and resolves with its reply', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const job = solveInBackground(almostWon());
    const worker = FakeWorker.last as FakeWorker;
    expect(worker.options).toEqual({ type: 'module' });
    expect(worker.url.pathname).toMatch(/solver\.worker\.ts$/);
    expect(worker.posted).toEqual([almostWon()]);
    const result = solve(almostWon());
    worker.onmessage?.({ data: result });
    await expect(job.promise).resolves.toEqual(result);
    expect(worker.terminated).toBe(true);
  });

  it('rejects when the worker fails', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const job = solveInBackground(almostWon());
    FakeWorker.last?.onerror?.({ message: 'boom' });
    await expect(job.promise).rejects.toThrow('boom');
    expect(FakeWorker.last?.terminated).toBe(true);
  });

  it('cancel terminates the worker', () => {
    vi.stubGlobal('Worker', FakeWorker);
    solveInBackground(almostWon()).cancel();
    expect(FakeWorker.last?.terminated).toBe(true);
  });
});

describe('solver worker', () => {
  it('replies to a position with its solve result', async () => {
    const post = vi.spyOn(self, 'postMessage').mockImplementation(() => undefined);
    await import('./solver.worker');
    (self.onmessage as (e: { data: unknown }) => void)({ data: almostWon() });
    expect(post).toHaveBeenCalledWith(solve(almostWon()));
  });
});

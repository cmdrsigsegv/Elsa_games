// Asks the background worker for puzzles.

import type { PuzzleBase } from './game';
import type { GenerateRequest } from '../worker/generate';

let worker: Worker | null = null;
let lastId = 0;
const waiting = new Map<number, (puzzle: PuzzleBase) => void>();

function theWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../worker/generate.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; puzzle: PuzzleBase }>) => {
      waiting.get(e.data.id)?.(e.data.puzzle);
      waiting.delete(e.data.id);
    };
  }
  return worker;
}

export const newSeed = () => (Math.random() * 0x100000000) >>> 0;

/** Requests are answered in the order they were made. */
export function makePuzzle<P extends PuzzleBase>(game: string, target: number): Promise<P> {
  return new Promise((resolve) => {
    const request: GenerateRequest = { id: ++lastId, game, seed: newSeed(), target };
    waiting.set(request.id, resolve as (puzzle: PuzzleBase) => void);
    theWorker().postMessage(request);
  });
}

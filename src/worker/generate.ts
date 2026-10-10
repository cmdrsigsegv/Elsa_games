/// <reference lib="webworker" />
// Generates puzzles off the main thread, so the screen never freezes while a
// hard one is being made.

import { generators } from '../games/generators';

declare const self: DedicatedWorkerGlobalScope;

export interface GenerateRequest {
  id: number;
  game: string;
  seed: number;
  target: number;
}

self.onmessage = (e: MessageEvent<GenerateRequest>) => {
  const { id, game, seed, target } = e.data;
  self.postMessage({ id, puzzle: generators[game](seed, target) });
};

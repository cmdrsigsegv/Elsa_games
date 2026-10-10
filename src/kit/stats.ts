// A record of every puzzle played, per game. It feeds the statistics screen,
// and shows whether the adaptive difficulty is tracking her.

import type { Rating } from './adaptive';
import { load, save } from '../storage/kv';

export interface Played {
  /** When it ended, in milliseconds since 1970. */
  at: number;
  score: number;
  timeMs: number;
  hints: number;
  mistakes: number;
  rating: Rating | null;
  abandoned: boolean;
  /** Her level after this puzzle was counted. */
  level: number;
}

/** Old records beyond this many are dropped. */
const KEEP = 1000;

const key = (gameId: string) => `stats:${gameId}`;

export async function loadPlayed(gameId: string): Promise<Played[]> {
  return (await load<Played[]>(key(gameId))) ?? [];
}

export async function recordPlayed(gameId: string, played: Played): Promise<void> {
  await save(key(gameId), [...(await loadPlayed(gameId)), played].slice(-KEEP));
}

export interface Summary {
  solved: number;
  noHints: number;
  /** The middle time of her last twenty solved puzzles, or null if none. */
  usualMs: number | null;
  /** Her level after each puzzle, oldest first. */
  levels: number[];
}

export function summarise(played: Played[]): Summary {
  const solved = played.filter((p) => !p.abandoned);
  const times = solved.slice(-20).map((p) => p.timeMs).sort((a, b) => a - b);
  return {
    solved: solved.length,
    noHints: solved.filter((p) => p.hints === 0).length,
    usualMs: times.length ? times[Math.floor(times.length / 2)] : null,
    levels: played.map((p) => p.level),
  };
}

// Where she is in each game. Every game has ten difficulties. At each
// difficulty the puzzles come in sets of fifteen, shown on a picker; she can
// play them in any order. Finishing a set moves her up a difficulty, and she
// can step up or down herself at any time.
//
// Puzzles are not stored: each is made again from its place (game,
// difficulty, set, number), which always gives the same puzzle.

import { load, save } from '../storage/kv';

export const DIFFICULTIES = 10;
export const SET_SIZE = 15;

export interface Progress {
  /** The difficulty she is on, 1 to DIFFICULTIES. */
  difficulty: number;
  /** For each difficulty she has visited: which set she is on, and which of its puzzles are solved. */
  sets: Record<number, { set: number; solved: boolean[] }>;
}

/** One puzzle's place. */
export interface Place {
  difficulty: number;
  set: number;
  /** 0 to SET_SIZE - 1. */
  index: number;
}

const fresh = (): boolean[] => new Array<boolean>(SET_SIZE).fill(false);

export const setAt = (p: Progress, difficulty: number) => p.sets[difficulty] ?? { set: 0, solved: fresh() };

export const placeKey = (gameId: string, at: Place) => `${gameId}:${at.difficulty}:${at.set}:${at.index}`;

/** A seed from a puzzle's place, so the same place always gives the same puzzle. */
export function seedFor(gameId: string, at: Place): number {
  let hash = 0x811c9dc5;
  for (const ch of placeKey(gameId, at)) hash = Math.imul(hash ^ ch.charCodeAt(0), 0x01000193);
  return hash >>> 0;
}

/**
 * The generator level (0 to 100) for a puzzle. A difficulty covers ten
 * levels, and a set climbs gently through them. The last puzzle of a set is,
 * without saying so, a taste of the next difficulty.
 */
export function levelFor(at: Place): number {
  const preview = at.index === SET_SIZE - 1 && at.difficulty < DIFFICULTIES;
  const difficulty = preview ? at.difficulty + 1 : at.difficulty;
  const climb = preview ? 0.2 : at.index / (SET_SIZE - 1);
  return (difficulty - 1) * 10 + 1 + climb * 8;
}

const key = (gameId: string) => `progress:${gameId}`;

export async function loadProgress(gameId: string): Promise<Progress> {
  return (await load<Progress>(key(gameId))) ?? { difficulty: 3, sets: {} };
}
export const saveProgress = (gameId: string, p: Progress) => save(key(gameId), p);

export function withDifficulty(p: Progress, difficulty: number): Progress {
  return { ...p, difficulty: Math.min(DIFFICULTIES, Math.max(1, difficulty)) };
}

/** Marks a puzzle solved. */
export function withSolved(p: Progress, at: Place): Progress {
  const here = setAt(p, at.difficulty);
  if (here.set !== at.set) return p; // a puzzle from a set she has since left
  const solved = here.solved.map((done, i) => done || i === at.index);
  return { ...p, sets: { ...p.sets, [at.difficulty]: { set: here.set, solved } } };
}

export const setDone = (p: Progress, difficulty: number) => setAt(p, difficulty).solved.every(Boolean);

/**
 * After a set is finished: a new set waits at that difficulty for when she
 * comes back, and she moves up one.
 */
export function withNextSet(p: Progress, difficulty: number): Progress {
  const here = setAt(p, difficulty);
  return {
    difficulty: Math.min(DIFFICULTIES, difficulty + 1),
    sets: { ...p.sets, [difficulty]: { set: here.set + 1, solved: fresh() } },
  };
}

/** The first unsolved puzzle after `from` in its set, going round; null when the set is done. */
export function nextUnsolved(p: Progress, from: Place): Place | null {
  const here = setAt(p, from.difficulty);
  for (let step = 1; step <= SET_SIZE; step++) {
    const index = (from.index + step) % SET_SIZE;
    if (!here.solved[index]) return { difficulty: from.difficulty, set: here.set, index };
  }
  return null;
}

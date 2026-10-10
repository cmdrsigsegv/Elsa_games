// The arrow puzzle: a board packed with bent arrows. Tapping an arrow sends
// it forward, head first, its body following its own path; if nothing stands
// in the straight line ahead of its head it slides off the board. The goal is
// to clear the board. Every function here is pure.

import { tuning } from './tuning';

/** Directions an arrow's head can point: up, right, down, left. */
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export interface Arrow {
  /** The cells it lies on, tail first, head last. */
  cells: number[];
  /** Which way the head points: an index into DX / DY. */
  dir: number;
}

export interface ArrowsPuzzle {
  seed: number;
  score: number;
  w: number;
  h: number;
  arrows: Arrow[];
}

export interface ArrowsState {
  /** For each arrow, whether it has left the board. */
  gone: boolean[];
  /** How many times an arrow was sent into another. */
  bumps: number;
  /** The last bump: which arrow moved and which one stopped it. */
  lastBump: { arrow: number; into: number } | null;
}

export interface ArrowsMove {
  arrow: number;
}

/** The cells in a straight line from `cell` to the edge of the board, nearest first. */
export function ray(w: number, h: number, cell: number, dir: number): number[] {
  const out: number[] = [];
  let x = (cell % w) + DX[dir];
  let y = Math.floor(cell / w) + DY[dir];
  while (x >= 0 && y >= 0 && x < w && y < h) {
    out.push(y * w + x);
    x += DX[dir];
    y += DY[dir];
  }
  return out;
}

export const head = (a: Arrow) => a.cells[a.cells.length - 1];

/** Which arrow lies on each cell, or -1; arrows that have gone are left out. */
export function owners(p: ArrowsPuzzle, gone: boolean[]): Int16Array {
  const owner = new Int16Array(p.w * p.h).fill(-1);
  p.arrows.forEach((a, i) => {
    if (!gone[i]) for (const cell of a.cells) owner[cell] = i;
  });
  return owner;
}

/** The arrow standing in the way of arrow `i`, or -1 if its way out is clear. */
export function blocker(p: ArrowsPuzzle, s: ArrowsState, i: number, owner = owners(p, s.gone)): number {
  const a = p.arrows[i];
  for (const cell of ray(p.w, p.h, head(a), a.dir)) if (owner[cell] >= 0) return owner[cell];
  return -1;
}

export function start(p: ArrowsPuzzle): ArrowsState {
  return { gone: p.arrows.map(() => false), bumps: 0, lastBump: null };
}

/** Returns the same state object when the move changes nothing. */
export function apply(p: ArrowsPuzzle, s: ArrowsState, m: ArrowsMove): ArrowsState {
  if (m.arrow < 0 || m.arrow >= p.arrows.length || s.gone[m.arrow]) return s;
  const into = blocker(p, s, m.arrow);
  if (into >= 0) return { ...s, bumps: s.bumps + 1, lastBump: { arrow: m.arrow, into } };
  return { ...s, gone: s.gone.map((g, i) => g || i === m.arrow), lastBump: null };
}

export function status(_p: ArrowsPuzzle, s: ArrowsState): { ended: boolean } {
  return { ended: s.gone.every(Boolean) };
}

/** Sending an arrow into another counts against her, when the tuning says so. */
export function isMistake(p: ArrowsPuzzle, s: ArrowsState, m: ArrowsMove): boolean {
  return tuning.bumpsCount && !s.gone[m.arrow] && blocker(p, s, m.arrow) >= 0;
}

/** An arrow that can leave now. Arrows near the middle of the list sit deeper in the knot, so they are offered first. */
export function hint(p: ArrowsPuzzle, s: ArrowsState): ArrowsMove | null {
  const owner = owners(p, s.gone);
  for (let i = 0; i < p.arrows.length; i++) if (!s.gone[i] && blocker(p, s, i, owner) < 0) return { arrow: i };
  return null;
}

/**
 * How many rounds it takes to clear the board when every free arrow leaves at
 * once, and how many arrows are free at the start. Clearing an arrow never
 * blocks another, so a board that this clears can always be cleared.
 */
export function measure(p: ArrowsPuzzle): { solvable: boolean; rounds: number; freeAtStart: number } {
  let s = start(p);
  let rounds = 0;
  let freeAtStart = 0;
  while (!status(p, s).ended) {
    const owner = owners(p, s.gone);
    const free = p.arrows.map((_, i) => !s.gone[i] && blocker(p, s, i, owner) < 0);
    if (!free.some(Boolean)) return { solvable: false, rounds, freeAtStart };
    if (rounds === 0) freeAtStart = free.filter(Boolean).length;
    s = { ...s, gone: s.gone.map((g, i) => g || free[i]) };
    rounds++;
  }
  return { solvable: true, rounds, freeAtStart };
}

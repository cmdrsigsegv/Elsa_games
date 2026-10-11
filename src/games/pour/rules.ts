// The liquid-sorting game: vials holding layers of coloured liquid, and a
// couple of empty ones. The top colour of one vial can be poured into
// another if that vial is empty or has the same colour on top, and has room.
// The goal is every colour gathered into a vial of its own. Every function
// here is pure.

/** How many layers a vial holds. */
export const CAPACITY = 4;

export interface PourPuzzle {
  seed: number;
  score: number;
  /** Each vial's layers, bottom first; colours are numbered from 1. */
  vials: number[][];
}

export interface PourState {
  vials: number[][];
  moves: number;
}

export interface PourMove {
  from: number;
  to: number;
}

const top = (vial: number[]) => vial[vial.length - 1];

/** How many layers of the same colour sit at the top of a vial. */
export function topRun(vial: number[]): number {
  let n = 0;
  while (n < vial.length && vial[vial.length - 1 - n] === top(vial)) n++;
  return n;
}

/** A vial is sorted when it is full of one colour. */
export const sorted = (vial: number[]) => vial.length === CAPACITY && topRun(vial) === CAPACITY;

export function canPour(vials: number[][], from: number, to: number): boolean {
  if (from === to || !vials[from]?.length || !vials[to] || vials[to].length >= CAPACITY) return false;
  return vials[to].length === 0 || top(vials[to]) === top(vials[from]);
}

/** Pours as much of the top colour as will fit. */
export function pour(vials: number[][], from: number, to: number): number[][] {
  const amount = Math.min(topRun(vials[from]), CAPACITY - vials[to].length);
  return vials.map((vial, i) =>
    i === from ? vial.slice(0, vial.length - amount) : i === to ? [...vial, ...vials[from].slice(-amount)] : vial,
  );
}

export const done = (vials: number[][]) => vials.every((vial) => vial.length === 0 || sorted(vial));

export function start(p: PourPuzzle): PourState {
  return { vials: p.vials.map((vial) => [...vial]), moves: 0 };
}

/** Returns the same state object when the move changes nothing. */
export function apply(_p: PourPuzzle, s: PourState, m: PourMove): PourState {
  if (!canPour(s.vials, m.from, m.to)) return s;
  return { vials: pour(s.vials, m.from, m.to), moves: s.moves + 1 };
}

export function status(_p: PourPuzzle, s: PourState): { ended: boolean } {
  return { ended: done(s.vials) };
}

/**
 * The pours worth considering: legal ones, leaving out those that only undo
 * progress (emptying a sorted vial, or moving a vial of one colour into an
 * empty one, which changes nothing).
 */
export function usefulMoves(vials: number[][]): PourMove[] {
  const out: PourMove[] = [];
  let emptyTried = false;
  for (let to = 0; to < vials.length; to++) {
    // All empty vials are alike: one is enough.
    if (vials[to].length === 0) {
      if (emptyTried) continue;
      emptyTried = true;
    }
    for (let from = 0; from < vials.length; from++) {
      if (!canPour(vials, from, to) || sorted(vials[from])) continue;
      if (vials[to].length === 0 && topRun(vials[from]) === vials[from].length) continue;
      out.push({ from, to });
    }
  }
  return out;
}

/** Finds a way to sort the vials, searching depth first; null if there is none within the limit. */
export function solve(vials: number[][], limit = 150_000): PourMove[] | null {
  const seen = new Set<string>();
  const path: PourMove[] = [];
  let visited = 0;
  // Vials can be in any order, so positions that differ only in order count as one.
  const keyOf = (v: number[][]) => v.map((vial) => vial.join('.')).sort().join('|');
  const search = (now: number[][]): boolean => {
    if (done(now)) return true;
    const key = keyOf(now);
    if (seen.has(key) || ++visited > limit) return false;
    seen.add(key);
    // Pours onto a matching colour first: they are the ones that make progress.
    const moves = usefulMoves(now).sort((a, b) => now[b.to].length - now[a.to].length);
    for (const move of moves) {
      path.push(move);
      if (search(pour(now, move.from, move.to))) return true;
      path.pop();
    }
    return false;
  };
  return search(vials) ? [...path] : null;
}

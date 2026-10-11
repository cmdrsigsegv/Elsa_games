// Gridlock: a car park jammed with cars and lorries. Each slides only along
// its own length, forwards or back. The goal is to slide them about until the
// red car can drive out of the exit on the right. Every function here is pure.

/** The car park is N by N cells. */
export const N = 6;
/** The red car's row; the exit is at the right-hand end of it. */
export const EXIT_ROW = 2;

export interface Car {
  len: number;
  horizontal: boolean;
  /** The row it lies in if horizontal, the column if vertical. It never leaves it. */
  line: number;
}

export interface GridlockPuzzle {
  seed: number;
  score: number;
  /** Car 0 is the red car. */
  cars: Car[];
  /** Where each car starts: how far along its line its first cell is. */
  start: number[];
  /** The fewest slides that solve it. */
  par: number;
}

export interface GridlockState {
  at: number[];
  moves: number;
}

/** Slide a car so its first cell is at `to`. Any distance counts as one move. */
export interface GridlockMove {
  car: number;
  to: number;
}

/** For each cell, which car covers it, or -1. `skip` leaves one car out. */
export function cover(cars: Car[], at: number[], skip = -1): Int8Array {
  const grid = new Int8Array(N * N).fill(-1);
  cars.forEach((car, i) => {
    if (i === skip) return;
    for (let k = 0; k < car.len; k++) {
      grid[car.horizontal ? car.line * N + at[i] + k : (at[i] + k) * N + car.line] = i;
    }
  });
  return grid;
}

/** How far a car can slide either way: the lowest and highest positions it can reach. */
export function reach(cars: Car[], at: number[], i: number, grid = cover(cars, at, i)): [number, number] {
  const car = cars[i];
  const cell = (pos: number) => (car.horizontal ? car.line * N + pos : pos * N + car.line);
  let lo = at[i];
  while (lo > 0 && grid[cell(lo - 1)] < 0) lo--;
  let hi = at[i];
  while (hi + car.len < N && grid[cell(hi + car.len)] < 0) hi++;
  return [lo, hi];
}

export const solved = (cars: Car[], at: number[]) => at[0] === N - cars[0].len;

export function start(p: GridlockPuzzle): GridlockState {
  return { at: [...p.start], moves: 0 };
}

/** Returns the same state object when the move changes nothing. */
export function apply(p: GridlockPuzzle, s: GridlockState, m: GridlockMove): GridlockState {
  if (m.car < 0 || m.car >= p.cars.length || m.to === s.at[m.car]) return s;
  const [lo, hi] = reach(p.cars, s.at, m.car);
  if (m.to < lo || m.to > hi) return s;
  return { at: s.at.map((pos, i) => (i === m.car ? m.to : pos)), moves: s.moves + 1 };
}

export function status(p: GridlockPuzzle, s: GridlockState): { ended: boolean } {
  return { ended: solved(p.cars, s.at) };
}

/** Every position one slide away. */
export function neighbours(cars: Car[], at: number[]): GridlockMove[] {
  const out: GridlockMove[] = [];
  for (let i = 0; i < cars.length; i++) {
    const [lo, hi] = reach(cars, at, i);
    for (let to = lo; to <= hi; to++) if (to !== at[i]) out.push({ car: i, to });
  }
  return out;
}

/** The shortest way out from a position, as a list of slides; null if there is none. */
export function solve(cars: Car[], from: number[], limit = 200_000): GridlockMove[] | null {
  if (solved(cars, from)) return [];
  const seen = new Map<string, { prev: string | null; move: GridlockMove | null }>();
  seen.set(from.join(), { prev: null, move: null });
  let frontier = [from];
  while (frontier.length && seen.size < limit) {
    const next: number[][] = [];
    for (const at of frontier) {
      const key = at.join();
      for (const move of neighbours(cars, at)) {
        const to = at.slice();
        to[move.car] = move.to;
        const toKey = to.join();
        if (seen.has(toKey)) continue;
        seen.set(toKey, { prev: key, move });
        if (solved(cars, to)) {
          const path: GridlockMove[] = [];
          for (let k: string | null = toKey; k; ) {
            const step: { prev: string | null; move: GridlockMove | null } = seen.get(k)!;
            if (step.move) path.unshift(step.move);
            k = step.prev;
          }
          return path;
        }
        next.push(to);
      }
    }
    frontier = next;
  }
  return null;
}

// Makes a killer sudoku from a seed, aimed at a difficulty level. A full grid
// is filled at random and carved into cages. Then, for as long as the
// human-style solver cannot finish the puzzle with the techniques that level
// allows, a cage where it is stuck is cut in two, which gives it one more
// total to work with. Last, cages are joined again wherever the solver can
// still finish, until the puzzle is as hard as was asked. A puzzle that
// solver finishes needs no guessing and has one solution.

import { random, type Random } from '../../kit/random';
import { CELLS, COUNT, PEERS, bit, colOf } from '../sudoku/grid';
import { begin as beginSudoku, type Work as SudokuWork } from '../sudoku/solve';
import { score, tierFor } from './difficulty';
import type { KillerPuzzle } from './rules';
import { advance, noUses, recage, solve, type Cage, type Solved, type Work } from './solve';
import { tuning } from './tuning';

/** The cells above, left of, right of and below each cell. */
export const NEXT_TO: number[][] = Array.from({ length: CELLS }, (_, i) => {
  const out: number[] = [];
  if (i >= 9) out.push(i - 9);
  if (colOf(i) > 0) out.push(i - 1);
  if (colOf(i) < 8) out.push(i + 1);
  if (i < 72) out.push(i + 9);
  return out;
});

function fullGrid(rng: Random): Uint8Array {
  // A random first row makes every grid different; search fills the rest.
  const first = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const values = new Uint8Array(CELLS);
  first.forEach((d, c) => (values[c] = d));

  const fill = (w: SudokuWork): Uint8Array | null => {
    let best = -1;
    for (let i = 0; i < CELLS; i++) {
      if (w.values[i]) continue;
      if (!w.cands[i]) return null;
      if (best < 0 || COUNT[w.cands[i]] < COUNT[w.cands[best]]) best = i;
    }
    if (best < 0) return w.values;
    for (const d of rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (!(w.cands[best] & bit(d))) continue;
      const next: SudokuWork = { values: w.values.slice(), cands: w.cands.slice(), left: w.left - 1 };
      next.values[best] = d;
      next.cands[best] = 0;
      for (const p of PEERS[best]) next.cands[p] &= ~bit(d);
      const done = fill(next);
      if (done) return done;
    }
    return null;
  };
  return fill(beginSudoku(values)!)!;
}

/** How often to aim for a cage of 1, 2, ... 6 cells at this level. */
function sizeWeights(level: number): number[] {
  const rows = tuning.cageSizes;
  const above = Math.max(1, rows.findIndex((r) => r.level >= level));
  const [a, b] = [rows[above - 1], rows[above]];
  const t = Math.min(1, Math.max(0, (level - a.level) / (b.level - a.level)));
  return a.weights.map((w, k) => w + (b.weights[k] - w) * t);
}

function pickSize(rng: Random, weights: number[]): number {
  let at = rng.next() * weights.reduce((sum, w) => sum + w, 0);
  for (let k = 0; k < weights.length; k++) {
    at -= weights[k];
    if (at < 0) return k + 1;
  }
  return weights.length;
}

/**
 * Carves the grid into connected groups with no digit twice in a group. Null
 * when it leaves a group smaller than `smallest` that nothing can absorb.
 */
function carve(solution: Uint8Array, rng: Random, weights: number[], smallest: number): number[][] | null {
  const largest = weights.reduce((top, w, k) => (w > 0 ? k + 1 : top), 1);
  const groupOf = new Int8Array(CELLS).fill(-1);
  const groups: number[][] = [];
  const digits: number[] = [];

  for (const start of rng.shuffle(Array.from({ length: CELLS }, (_, i) => i))) {
    if (groupOf[start] >= 0) continue;
    const want = pickSize(rng, weights);
    const g = groups.length;
    const cells = [start];
    let mask = bit(solution[start]);
    groupOf[start] = g;
    while (cells.length < want) {
      const edge = new Set<number>();
      for (const i of cells) {
        for (const j of NEXT_TO[i]) if (groupOf[j] < 0 && !(mask & bit(solution[j]))) edge.add(j);
      }
      if (!edge.size) break;
      const next = [...edge][rng.int(edge.size)];
      cells.push(next);
      mask |= bit(solution[next]);
      groupOf[next] = g;
    }
    groups.push(cells);
    digits.push(mask);
  }

  // Growth that ran out of room leaves groups that are too small: each joins
  // the smallest neighbour that has room for it and none of its digits.
  for (let g = 0; g < groups.length; g++) {
    if (!groups[g].length || groups[g].length >= smallest) continue;
    let into = -1;
    for (const i of groups[g]) {
      for (const j of NEXT_TO[i]) {
        const n = groupOf[j];
        if (n === g || digits[n] & digits[g] || groups[n].length + groups[g].length > largest) continue;
        if (into < 0 || groups[n].length < groups[into].length) into = n;
      }
    }
    if (into < 0) return null;
    for (const i of groups[g]) groupOf[i] = into;
    groups[into].push(...groups[g]);
    digits[into] |= digits[g];
    groups[g] = [];
  }
  return groups.filter((cells) => cells.length);
}

const toCage = (solution: Uint8Array, cells: number[]): Cage => ({
  cells: [...cells].sort((a, b) => a - b),
  sum: cells.reduce((sum, i) => sum + solution[i], 0),
});

/** True when the cells hang together edge to edge. */
export function connected(cells: number[]): boolean {
  const reached = [cells[0]];
  for (let k = 0; k < reached.length; k++) {
    for (const j of NEXT_TO[reached[k]]) if (cells.includes(j) && !reached.includes(j)) reached.push(j);
  }
  return reached.length === cells.length;
}

/** Cuts a cage's cells into two connected parts of at least `smallest` cells; null if no cut is found. */
function cut(cells: number[], rng: Random, smallest: number): [number[], number[]] | null {
  for (let tries = 0; tries < 6; tries++) {
    const size = smallest + rng.int(cells.length - 2 * smallest + 1);
    const part = [cells[rng.int(cells.length)]];
    while (part.length < size) {
      const edge = cells.filter((j) => !part.includes(j) && NEXT_TO[j].some((i) => part.includes(i)));
      part.push(edge[rng.int(edge.length)]);
    }
    const others = cells.filter((i) => !part.includes(i));
    if (connected(others)) return [part, others];
  }
  return null;
}

type Made = { cages: Cage[]; solved: Solved };

/**
 * Cuts cages until the solver can finish the puzzle within `maxTier`. It
 * keeps both parts to at least `smallest` cells while it can; when no such
 * cut is left where it is stuck, it cuts off single cells.
 */
function settle(solution: Uint8Array, groups: number[][], rng: Random, maxTier: number, smallest: number): Made {
  let cages = groups.map((cells) => toCage(solution, cells));
  let solved = solve(cages, maxTier);
  let w: Work = solved.work;
  // After a cut the solver carries on from where it was stuck, which is much
  // quicker than starting again. But what it had worked out came partly from
  // the uncut cage, so a finished grid is checked once more from the start.
  let fromStart = true;
  for (;;) {
    if (w.left === 0) {
      if (fromStart) return { cages, solved };
      solved = solve(cages, maxTier);
      w = solved.work;
      fromStart = true;
      continue;
    }
    // Cut the cage with the most still unknown: that is where a new total tells most.
    const unknown = cages.map((cage) => cage.cells.reduce((n, i) => n + (w.values[i] ? 0 : 1), 0));
    const order = cages
      .map((_, c) => c)
      .filter((c) => unknown[c] > 0 && cages[c].cells.length > 1)
      .sort((a, b) => unknown[b] - unknown[a] || cages[b].cells.length - cages[a].cells.length || a - b);
    let parts: [number[], number[]] | null = null;
    let which = -1;
    for (const least of smallest > 1 ? [smallest, 1] : [1]) {
      for (const c of order) {
        if (parts || cages[c].cells.length < 2 * least) continue;
        parts = cut(cages[c].cells, rng, least);
        which = c;
      }
    }
    // A cage of two can always be cut, and a stuck solver has one with an unknown cell.
    cages = [...cages.filter((_, c) => c !== which), toCage(solution, parts![0]), toCage(solution, parts![1])];
    w = recage(w, cages);
    fromStart = false;
    advance(w, maxTier, noUses());
  }
}

/** The pairs of cells that touch across a border between two cages, in random order. */
function borders(cages: Cage[], rng: Random): { pairs: [number, number][]; cageOf: Map<number, Cage> } {
  const cageOf = new Map<number, Cage>();
  for (const cage of cages) for (const i of cage.cells) cageOf.set(i, cage);
  const pairs: [number, number][] = [];
  for (let i = 0; i < CELLS; i++) {
    for (const j of NEXT_TO[i]) if (cageOf.get(i) !== cageOf.get(j)) pairs.push([i, j]);
  }
  return { pairs: rng.shuffle(pairs), cageOf };
}

/** Two cages as one, if that is allowed: no more than `largest` cells and no digit twice. */
function join(solution: Uint8Array, a: Cage, b: Cage, largest: number): Cage | null {
  if (a === b || a.cells.length + b.cells.length > largest) return null;
  if (a.cells.some((x) => b.cells.some((y) => solution[x] === solution[y]))) return null;
  return toCage(solution, [...a.cells, ...b.cells]);
}

/**
 * For levels with no one-cell cages: joins each one that cutting left behind
 * to a neighbour, wherever the puzzle stays solvable. Null when one of them
 * cannot be joined to anything.
 */
function absorb(solution: Uint8Array, made: Made, rng: Random, maxTier: number, largest: number): Made | null {
  let { cages, solved } = made;
  for (;;) {
    const single = cages.find((cage) => cage.cells.length === 1);
    if (!single) return { cages, solved };
    const { pairs, cageOf } = borders(cages, rng);
    let joined = false;
    const tried = new Set<Cage>();
    for (const [i, j] of pairs) {
      if (joined || cageOf.get(i) !== single || tried.has(cageOf.get(j)!)) continue;
      const other = cageOf.get(j)!;
      tried.add(other);
      const both = join(solution, single, other, largest);
      if (!both) continue;
      const next = [...cages.filter((cage) => cage !== single && cage !== other), both];
      const result = solve(next, maxTier);
      if (!result.solved) continue;
      cages = next;
      solved = result;
      joined = true;
    }
    if (!joined) return null;
  }
}

/**
 * Joins neighbouring cages for as long as the puzzle stays solvable within
 * `maxTier` and easier than `target`: every join takes a total away from the
 * solver. `tries` bounds the work, since each try is a whole solve.
 */
function tighten(
  solution: Uint8Array,
  made: Made,
  rng: Random,
  maxTier: number,
  largest: number,
  target: number,
  tries: number,
): Made {
  let { cages, solved } = made;
  const { pairs, cageOf } = borders(cages, rng);
  for (const [i, j] of pairs) {
    if (tries <= 0 || score(solved, cages) >= target) break;
    const [a, b] = [cageOf.get(i)!, cageOf.get(j)!];
    const both = join(solution, a, b, largest);
    if (!both) continue;
    const next = [...cages.filter((cage) => cage !== a && cage !== b), both];
    const result = solve(next, maxTier);
    tries--;
    if (!result.solved) continue;
    cages = next;
    solved = result;
    for (const x of both.cells) cageOf.set(x, both);
  }
  return { cages, solved };
}

export function generate(seed: number, target: number): KillerPuzzle {
  const rng = random(seed);
  const maxTier = tierFor(target);
  const weights = sizeWeights(target);
  const smallest = weights[0] > 0 ? 1 : 2;
  const largest = weights.reduce((top, w, k) => (w > 0 ? k + 1 : top), 1);

  const make = (least: number): KillerPuzzle | null => {
    const solution = fullGrid(rng);
    const groups = carve(solution, rng, weights, least);
    if (!groups) return null;
    const cut = settle(solution, groups, rng, maxTier, least);
    const settled = least > 1 ? absorb(solution, cut, rng, maxTier, largest) : cut;
    if (!settled) return null;
    const made = tighten(solution, settled, rng, maxTier, largest, target, tuning.joins);
    // In reading order, so the same puzzle always lists its cages the same way.
    const cages = made.cages.sort((a, b) => a.cells[0] - b.cells[0]);
    return { seed, cages, solution: Array.from(solution), score: score(made.solved, cages) };
  };

  let best: KillerPuzzle | null = null;
  let made = 0;
  let failed = 0;
  while (made < tuning.attempts && failed < tuning.failures) {
    const p = make(smallest);
    if (!p) {
      failed++;
      continue;
    }
    made++;
    if (!best || Math.abs(p.score - target) < Math.abs(best.score - target)) best = p;
    if (Math.abs(best.score - target) <= tuning.closeEnough) break;
  }
  // If nothing came of all that, one-cell cages are allowed after all.
  while (!best) best = make(1);
  return best;
}

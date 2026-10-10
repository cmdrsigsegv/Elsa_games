// Makes a sudoku from a seed, aimed at a difficulty level. A full grid is
// filled at random, then givens are removed for as long as the human-style
// solver can still finish the puzzle with the techniques that level allows.
// A puzzle that solver finishes needs no guessing and has one solution.

import { random, type Random } from '../../kit/random';
import { emptiesFor, score, tierFor } from './difficulty';
import { CELLS, COUNT, PEERS, bit } from './grid';
import { begin, solve, type Work } from './solve';
import { tuning } from './tuning';

export interface SudokuPuzzle {
  seed: number;
  /** 81 digits, 0 for the cells to be filled in. */
  givens: number[];
  solution: number[];
  /** Difficulty, 0 to 100. */
  score: number;
}

function fullGrid(rng: Random): Uint8Array {
  // A random first row makes every grid different; search fills the rest.
  const first = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const values = new Uint8Array(CELLS);
  first.forEach((d, c) => (values[c] = d));

  const fill = (w: Work): Uint8Array | null => {
    let best = -1;
    for (let i = 0; i < CELLS; i++) {
      if (w.values[i]) continue;
      if (!w.cands[i]) return null;
      if (best < 0 || COUNT[w.cands[i]] < COUNT[w.cands[best]]) best = i;
    }
    if (best < 0) return w.values;
    for (const d of rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (!(w.cands[best] & bit(d))) continue;
      const next: Work = { values: w.values.slice(), cands: w.cands.slice(), left: w.left - 1 };
      next.values[best] = d;
      next.cands[best] = 0;
      for (const p of PEERS[best]) next.cands[p] &= ~bit(d);
      const done = fill(next);
      if (done) return done;
    }
    return null;
  };
  return fill(begin(values)!)!;
}

function dig(solution: Uint8Array, rng: Random, maxTier: number, maxEmpties: number): Uint8Array {
  const givens = solution.slice();
  let empties = 0;
  // With symmetry, cell i is removed together with its mirror image 80 - i.
  const order = rng.shuffle(Array.from({ length: tuning.symmetric ? 41 : CELLS }, (_, i) => i));
  for (const i of order) {
    const j = tuning.symmetric ? 80 - i : i;
    const n = i === j ? 1 : 2;
    if (empties + n > maxEmpties) continue;
    givens[i] = 0;
    givens[j] = 0;
    if (solve(givens, maxTier).solved) {
      empties += n;
    } else {
      givens[i] = solution[i];
      givens[j] = solution[j];
    }
  }
  if (maxTier >= 3) {
    // Harder puzzles get a second pass over single cells: fewer givens means
    // more of the advanced techniques, at the cost of perfect symmetry.
    for (const i of rng.shuffle(Array.from({ length: CELLS }, (_, k) => k))) {
      if (!givens[i]) continue;
      givens[i] = 0;
      if (!solve(givens, maxTier).solved) givens[i] = solution[i];
    }
  }
  return givens;
}

export function generate(seed: number, target: number): SudokuPuzzle {
  const rng = random(seed);
  const maxTier = tierFor(target);
  const maxEmpties = emptiesFor(target);
  let best: SudokuPuzzle | null = null;
  for (let attempt = 0; attempt < tuning.attempts; attempt++) {
    const solution = fullGrid(rng);
    const givens = dig(solution, rng, maxTier, maxEmpties);
    const empties = givens.reduce((n, d) => n + (d ? 0 : 1), 0);
    const s = score(solve(givens), empties);
    if (!best || Math.abs(s - target) < Math.abs(best.score - target)) {
      best = { seed, givens: Array.from(givens), solution: Array.from(solution), score: s };
    }
    if (Math.abs(best.score - target) <= 2) break;
  }
  return best!;
}

// Makes a nonogram from a seed, aimed at a difficulty level. A picture is
// made at random, its clues are read off, and it is kept only if the
// line-by-line solver can finish it: no guessing, one solution.

import { random, type Random } from '../../kit/random';
import { FILLED, clueOf, colCells, rowCells, solveGrid, type Clues } from './lines';
import { tuning } from './tuning';

export interface NonogramPuzzle extends Clues {
  seed: number;
  /** 1 for a filled cell, 0 for an empty one; row by row. */
  solution: number[];
  /** Difficulty, 0 to 100. */
  score: number;
}

export type Band = (typeof tuning.bands)[number];

export function bandFor(level: number): Band {
  return tuning.bands.find((b) => level < b.to) ?? tuning.bands[tuning.bands.length - 1];
}

export function score(band: Band, rounds: number): number {
  const t = (rounds - band.easyRounds) / (band.hardRounds - band.easyRounds);
  return band.from + Math.min(1, Math.max(0, t)) * (band.to - band.from);
}

/**
 * A random picture with some shape to it: smooth blobs rather than static,
 * which makes for longer runs and more satisfying puzzles.
 */
function picture(rng: Random, size: number): number[] {
  // Random heights on a coarse grid, blended across the cells between them,
  // plus a little per-cell noise.
  const coarse = 3 + rng.int(2);
  const knots = Array.from({ length: (coarse + 1) * (coarse + 1) }, () => rng.next());
  const knot = (x: number, y: number) => knots[y * (coarse + 1) + x];
  const heights: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const fx = (c / (size - 1)) * coarse;
      const fy = (r / (size - 1)) * coarse;
      const x0 = Math.min(coarse - 1, Math.floor(fx));
      const y0 = Math.min(coarse - 1, Math.floor(fy));
      const tx = fx - x0;
      const ty = fy - y0;
      const smooth =
        knot(x0, y0) * (1 - tx) * (1 - ty) +
        knot(x0 + 1, y0) * tx * (1 - ty) +
        knot(x0, y0 + 1) * (1 - tx) * ty +
        knot(x0 + 1, y0 + 1) * tx * ty;
      heights.push(smooth + (rng.next() - 0.5) * 0.35);
    }
  }
  // Fill the highest cells, as many as the chosen share.
  const share = tuning.minFill + rng.next() * (tuning.maxFill - tuning.minFill);
  const cut = [...heights].sort((a, b) => b - a)[Math.round(share * size * size) - 1];
  return heights.map((h) => (h >= cut ? 1 : 0));
}

export function cluesOf(w: number, h: number, solution: number[]): Clues {
  const filled = solution.map((v) => (v ? FILLED : 0));
  return {
    w,
    h,
    rows: Array.from({ length: h }, (_, r) => clueOf(rowCells({ w }, r).map((i) => filled[i]))),
    cols: Array.from({ length: w }, (_, c) => clueOf(colCells({ w, h }, c).map((i) => filled[i]))),
  };
}

export function generate(seed: number, target: number): NonogramPuzzle {
  const rng = random(seed);
  const band = bandFor(target);
  let best: NonogramPuzzle | null = null;
  for (let attempt = 0; attempt < tuning.attempts; attempt++) {
    const solution = picture(rng, band.size);
    const clues = cluesOf(band.size, band.size, solution);
    // An empty row or column is dull, and reads as a mistake.
    if ([...clues.rows, ...clues.cols].some((clue) => clue.length === 0)) continue;
    const solved = solveGrid(clues);
    if (!solved.solved) continue;
    const s = score(band, solved.rounds);
    if (!best || Math.abs(s - target) < Math.abs(best.score - target)) best = { seed, ...clues, solution, score: s };
    if (Math.abs(best.score - target) <= 1.5) break;
  }
  // Practically unreachable: the easiest pictures are nearly always solvable.
  return best ?? generate(seed + 1, target);
}

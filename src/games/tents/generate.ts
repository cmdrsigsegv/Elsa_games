// Makes a tents puzzle from a seed, aimed at a difficulty level. Tents are
// scattered so that none touch, a tree is planted beside each, and the clues
// are counted off. The grid is kept only if the step-by-step solver can
// finish it with the steps its level allows: no guessing, one solution.

import { random, type Random } from '../../kit/random';
import { around, beside, type TentsPuzzle } from './rules';
import { solve, type Clued, type Solution } from './solve';
import { tuning } from './tuning';

export type Band = (typeof tuning.bands)[number];

export function bandFor(level: number): Band {
  return [...tuning.bands].reverse().find((b) => level >= b.from) ?? tuning.bands[0];
}

/** The level at which the next band takes over; 100 for the last. */
function topOf(band: Band): number {
  return tuning.bands[tuning.bands.indexOf(band) + 1]?.from ?? 100;
}

/**
 * How hard a solved grid is, 0 to 100. Within a band, a grid scores higher
 * the more steps of the band's deepest kind it took. A grid that never
 * needed that kind is easier than the band means to be, and scores below it.
 */
export function score(band: Band, solution: Solution): number {
  const steps = solution.steps[band.depth];
  if (band.depth > 1 && steps === 0) return Math.max(0, band.from - 4);
  const t = (steps - band.easy) / (band.hard - band.easy);
  return band.from + Math.min(1, Math.max(0, t)) * (topOf(band) - band.from);
}

/** A random campsite: the trees, and the clues its tents give. Null if a tent was left with no room for its tree. */
function campsite(rng: Random, w: number, h: number): Clued | null {
  const size = { w, h };
  const n = w * h;
  const tent = new Array<boolean>(n).fill(false);
  const trees = new Array<number>(n).fill(0);
  const tents: number[] = [];
  const wanted = Math.round(n * tuning.tentShare);
  for (const cell of rng.shuffle(Array.from({ length: n }, (_, i) => i))) {
    if (tents.length >= wanted) break;
    if (around(size, cell).some((a) => tent[a])) continue;
    tent[cell] = true;
    tents.push(cell);
  }
  for (const cell of tents) {
    const free = beside(size, cell).filter((b) => !tent[b] && !trees[b]);
    if (!free.length) return null;
    trees[free[rng.int(free.length)]] = 1;
  }
  const rows = new Array<number>(h).fill(0);
  const cols = new Array<number>(w).fill(0);
  for (const cell of tents) {
    rows[Math.floor(cell / w)]++;
    cols[cell % w]++;
  }
  return { w, h, trees, rows, cols };
}

export function generate(seed: number, target: number): TentsPuzzle {
  const rng = random(seed);
  const level = Math.min(100, Math.max(0, target));
  const band = bandFor(level);
  // Scores within a band come in steps, one per deep step taken: a grid half a step from the target is as near as any will get.
  const near = (topOf(band) - band.from) / (band.hard - band.easy) / 2;
  let best: TentsPuzzle | null = null;
  let bestGap = Infinity;
  for (let attempt = 0; attempt < tuning.attempts; attempt++) {
    const made = campsite(rng, band.w, band.h);
    if (!made) continue;
    const solution = solve(made, band.depth, band.ways);
    if (!solution.solved) continue;
    const measured = score(band, solution);
    const gap = Math.abs(measured - level);
    if (gap < bestGap) {
      best = { seed, score: measured, ...made };
      bestGap = gap;
    }
    if (gap <= near) break;
  }
  return best ?? generate(seed + 1, target);
}

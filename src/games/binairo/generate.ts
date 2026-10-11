// Makes a Binairo from a seed, aimed at a difficulty level. A full grid is
// filled at random, then givens are removed one at a time for as long as the
// human-style solver can still finish the puzzle with the reasoning that
// level allows. A puzzle that solver finishes needs no guessing and has one
// solution.

import { random, type Random } from '../../kit/random';
import { DARK, LIGHT, emptyCells, type BinairoPuzzle } from './rules';
import { HARDEST_TIER, TECHNIQUES, TIER, begin, cellsOf, copy, place, run, solve, type Solved, type Work } from './solve';
import { tuning, type Band } from './tuning';

/** The band a level falls in: its grid size and the hardest reasoning allowed. */
export function bandFor(level: number): Band {
  let band = tuning.bands[0];
  for (const b of tuning.bands) if (b.from <= level) band = b;
  return band;
}

/**
 * How hard a puzzle is, 0 to 100, from its size and the reasoning the solver
 * needed: the band for that size and reasoning, and higher within the band
 * the more of the puzzle needs it.
 */
export function score(size: number, s: Solved, empties: number): number {
  const sized = tuning.bands.filter((b) => b.size === size);
  const band = sized.filter((b) => b.tier <= s.hardest).pop();
  // Easier than anything this size is meant to be: just under its lowest band.
  if (!band) return Math.max(0, sized[0].from - 1);
  const after = tuning.bands[tuning.bands.indexOf(band) + 1];
  const top = after ? after.from - 1 : 100;
  let uses = 0;
  for (const technique of TECHNIQUES) if (TIER[technique] >= band.tier) uses += s.uses[technique];
  const share = empties ? uses / empties : 0;
  return band.from + (top - band.from) * Math.min(1, share / tuning.shareForTop);
}

/** A full grid that keeps every rule, different for every seed. */
function fullGrid(size: number, rng: Random): number[] {
  // Put a random circle in a random empty cell, fill in all that follows from
  // it, and go on; if that runs into a wall, the cell takes the other circle.
  // Now and then an early choice is wrong in a way that only shows much
  // later, and undoing it step by step would take ages: after `fillSteps`
  // steps it is quicker to start again from an empty grid.
  let steps = 0;
  const fill = (w: Work): Work | null => {
    if (++steps > tuning.fillSteps) return null;
    run(w, HARDEST_TIER);
    if (w.bad) return null;
    if (!w.left) return w;
    const empty: number[] = [];
    cellsOf(w).forEach((v, i) => !v && empty.push(i));
    const cell = empty[rng.int(empty.length)];
    const first = rng.int(2) ? DARK : LIGHT;
    for (const value of [first, first === DARK ? LIGHT : DARK]) {
      const tried = copy(w);
      place(tried, cell, value);
      const done = fill(tried);
      if (done) return done;
    }
    return null;
  };
  for (;;) {
    steps = 0;
    const done = fill(begin(size, []));
    if (done) return cellsOf(done);
  }
}

/** Takes givens away, in random order, for as long as the puzzle can still be reasoned out. */
function dig(size: number, solution: number[], rng: Random, maxTier: number): number[] {
  const givens = [...solution];
  for (const cell of rng.shuffle(solution.map((_, i) => i))) {
    givens[cell] = 0;
    if (!solve(size, givens, maxTier).solved) givens[cell] = solution[cell];
  }
  return givens;
}

export function generate(seed: number, target: number): BinairoPuzzle {
  const rng = random(seed);
  const band = bandFor(target);
  // How far a score is from what was asked. A puzzle that turned out not to
  // need the band's reasoning is the wrong kind, however near its number.
  const miss = (s: number) => Math.abs(s - target) + (s < band.from ? 100 : 0);
  let best: BinairoPuzzle | null = null;
  for (let attempt = 0; attempt < tuning.attempts[band.size]; attempt++) {
    const givens = dig(band.size, fullGrid(band.size, rng), rng, band.tier);
    const s = score(band.size, solve(band.size, givens), emptyCells(givens));
    if (!best || miss(s) < miss(best.score)) best = { seed, score: s, size: band.size, givens };
    if (miss(best.score) <= tuning.closeEnough) break;
  }
  return best!;
}

// Makes a kakuro from a seed, aimed at a difficulty level, in three steps:
// a pattern of black cells, digits for the white ones, and then single
// digits are changed until the human-style solver can finish the puzzle from
// its clues alone, with the techniques that level allows. A puzzle that
// solver finishes needs no guessing and has one solution.

import { random, type Random } from '../../kit/random';
import { longestRunFor, score, sideFor, tierFor } from './difficulty';
import { COUNT, TOO_LONG, bit, layoutFault, layoutOf, sumsOf, type Layout } from './layout';
import { settle, solve, type Work } from './solve';
import { tuning } from './tuning';

export interface KakuroPuzzle {
  seed: number;
  /** Cells a side, counting the black top row and left column that hold clues. */
  size: number;
  /** One digit per cell, 0 for a black cell. */
  solution: number[];
  /** Per cell: the clue for the run to its right, and for the run below it; 0 for none. */
  across: number[];
  down: number[];
  /** Difficulty, 0 to 100. */
  score: number;
}

/**
 * A pattern of white cells: black cells are dropped in mirrored pairs, first
 * wherever a run is too long, then anywhere until there are enough. Null if
 * it gets stuck with a run still too long.
 */
function pattern(rng: Random, side: number, longest: number): Layout | null {
  const size = side + 1;
  const white = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) white[i] = i >= size && i % size !== 0 ? 1 : 0;
  // Turning the grid half a turn takes cell i to its mirror.
  const mirror = (i: number) => (size - ((i / size) | 0)) * size + (size - (i % size));
  const wanted = Math.round(side * side * tuning.blackShare);
  let blacks = 0;
  let layout = layoutOf(size, white);

  // Tries to blacken a cell and its mirror image. A run of one cell, or the
  // white cells falling apart, undoes it.
  const blacken = (cell: number): boolean => {
    const twin = mirror(cell);
    white[cell] = 0;
    white[twin] = 0;
    const next = layoutOf(size, white);
    if (!sound(next)) {
      white[cell] = 1;
      white[twin] = 1;
      return false;
    }
    layout = next;
    blacks += cell === twin ? 1 : 2;
    return true;
  };

  for (let tries = 0; tries < side * side * 4; tries++) {
    const tooLong = layout.runs.filter((run) => run.cells.length > longest);
    if (tooLong.length) {
      // Any cell of any run that is too long will do; stuck if none can go.
      const cells = rng.shuffle(tooLong.flatMap((run) => run.cells));
      if (!cells.some(blacken)) return null;
    } else if (blacks < wanted) {
      const cell = size + 1 + rng.int(size * size - size - 1);
      if (white[cell]) blacken(cell);
    } else {
      break;
    }
  }
  return layoutFault(layout) || layout.runs.some((run) => run.cells.length > longest) ? null : layout;
}

/** Fine apart from runs that may still be too long, which more black cells can fix. */
function sound(layout: Layout): boolean {
  const fault = layoutFault(layout);
  return fault === null || fault === TOO_LONG;
}

/** Digits for every white cell with none repeated in a run, by trial and error. Null if it takes too long. */
function fill(rng: Random, layout: Layout): Uint8Array | null {
  const { runs, acrossOf, downOf } = layout;
  const whites: number[] = [];
  for (let i = 0; i < layout.size * layout.size; i++) if (layout.white[i]) whites.push(i);
  const digits = new Uint8Array(layout.size * layout.size);
  const used = new Uint16Array(runs.length);
  let budget = whites.length * 20;
  // Each run leans towards small digits (-1) or large ones (+1). A run of
  // all small or all large digits has a sum few sets of digits can make,
  // which is what lets a puzzle be solved from its clues.
  const lean = runs.map(() => (rng.int(100) < tuning.leaning ? (rng.int(2) ? 1 : -1) : 0));
  const order = (pull: number): number[] => {
    const ds = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    if (!pull) return ds;
    // Mostly in order of size, with some shuffling left in.
    const keyed = ds.map((d, i) => ({ d, key: (pull > 0 ? -d : d) + i * 0.5 }));
    return keyed.sort((x, y) => x.key - y.key).map((x) => x.d);
  };

  const place = (left: number): boolean => {
    if (left === 0) return true;
    if (--budget < 0) return false;
    // The cell with the fewest digits open to it goes next: it is the one
    // most likely to be left with none.
    let cell = -1;
    let fewest = 10;
    for (const c of whites) {
      if (digits[c]) continue;
      const n = 9 - COUNT[used[acrossOf[c]] | used[downOf[c]]];
      if (n < fewest) {
        fewest = n;
        cell = c;
      }
    }
    const a = acrossOf[cell];
    const b = downOf[cell];
    for (const d of order(lean[a] + lean[b])) {
      if ((used[a] | used[b]) & bit(d)) continue;
      digits[cell] = d;
      used[a] |= bit(d);
      used[b] |= bit(d);
      if (place(left - 1)) return true;
      used[a] &= ~bit(d);
      used[b] &= ~bit(d);
    }
    digits[cell] = 0;
    return false;
  };
  return place(whites.length) ? digits : null;
}

/** How far a puzzle is from solved: the spare digits still possible, over all cells. */
function slack(s: Work): number {
  let total = 0;
  for (const m of s.cands) if (m) total += COUNT[m] - 1;
  return total;
}

/**
 * A small change to the digits that keeps every run free of repeats: `cell`
 * takes a new digit, and if one other cell in its runs already has that
 * digit, the two swap. Null when the digit picked cannot be fitted in.
 */
function change(rng: Random, layout: Layout, digits: Uint8Array, cell: number): [number, number][] | null {
  const digit = 1 + rng.int(9);
  const old = digits[cell];
  if (digit === old) return null;
  let other = -1;
  let shared = -1;
  for (const r of [layout.acrossOf[cell], layout.downOf[cell]]) {
    for (const c of layout.runs[r].cells) {
      if (digits[c] !== digit) continue;
      if (other >= 0) return null;
      other = c;
      shared = r;
    }
  }
  if (other < 0) return [[cell, digit]];
  // The swap leaves the shared run as it was; the other cell's crossing run must have room for the old digit.
  const crossing = layout.acrossOf[other] === shared ? layout.downOf[other] : layout.acrossOf[other];
  if (layout.runs[crossing].cells.some((c) => digits[c] === old)) return null;
  return [
    [cell, digit],
    [other, old],
  ];
}

/**
 * Makes small changes, at or beside a cell the solver could not settle,
 * keeping a change whenever it leaves the solver no worse off. Each change
 * alters two or three clues, which is what breaks up a spot with more than
 * one answer.
 */
function repair(rng: Random, layout: Layout, digits: Uint8Array, maxTier: number, spent: { trials: number }): boolean {
  let best = settle(layout, sumsOf(layout, digits), maxTier);
  let bestSlack = slack(best);
  const stop = spent.trials + tuning.repairs;
  let lowest = bestSlack;
  let lowestAt = spent.trials;
  // Ten picks for every trial allowed: a pick that cannot be fitted in costs next to nothing.
  for (let n = 0; n < tuning.repairs * 10 && spent.trials < stop && best.left > 0; n++) {
    // Going nowhere: a fresh grid is the better bet.
    if (spent.trials - lowestAt > tuning.patience) break;
    const open: number[] = [];
    best.cands.forEach((m, c) => {
      if (COUNT[m] > 1) open.push(c);
    });
    let cell = open[rng.int(open.length)];
    // Sometimes a neighbour in the same run instead: an open cell with no room to change needs it.
    if (rng.int(100) < tuning.neighbourShare) {
      const run = layout.runs[rng.int(2) ? layout.acrossOf[cell] : layout.downOf[cell]];
      cell = run.cells[rng.int(run.cells.length)];
    }
    const changes = change(rng, layout, digits, cell);
    if (!changes) continue;
    const before = changes.map(([c]) => digits[c]);
    for (const [c, d] of changes) digits[c] = d;
    const next = settle(layout, sumsOf(layout, digits), maxTier);
    spent.trials++;
    const nextSlack = slack(next);
    // Now and then a change for the worse is let through, to get out of a corner.
    const give = rng.int(100) < tuning.slipChance ? tuning.slipBy : 0;
    if (nextSlack <= bestSlack + give) {
      best = next;
      bestSlack = nextSlack;
      if (bestSlack < lowest) {
        lowest = bestSlack;
        lowestAt = spent.trials;
      }
    } else {
      changes.forEach(([c], i) => (digits[c] = before[i]));
    }
  }
  return best.left === 0 && !best.broken;
}

export function generate(seed: number, target: number): KakuroPuzzle {
  const rng = random(seed);
  const side = sideFor(target);
  const maxTier = tierFor(target);
  const spent = { trials: 0 };
  let best: KakuroPuzzle | null = null;
  // Stops when out of attempts or of work, but never before there is a puzzle.
  for (let attempt = 0; !best || (attempt < tuning.attempts && spent.trials < tuning.work); attempt++) {
    const layout = pattern(rng, side, longestRunFor(target));
    if (!layout) continue;
    const digits = fill(rng, layout);
    if (!digits) continue;
    if (!repair(rng, layout, digits, maxTier, spent)) continue;

    const sums = sumsOf(layout, digits);
    const s = score(solve(layout, sums), side);
    if (best && Math.abs(s - target) >= Math.abs(best.score - target)) continue;
    const cells = layout.size * layout.size;
    const across = new Array<number>(cells).fill(0);
    const down = new Array<number>(cells).fill(0);
    layout.runs.forEach((run, r) => ((run.across ? across : down)[run.clueAt] = sums[r]));
    best = { seed, size: layout.size, solution: Array.from(digits), across, down, score: s };
    if (Math.abs(s - target) <= tuning.closeEnough) break;
  }
  return best;
}

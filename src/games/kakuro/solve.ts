// A solver that works the way a person does, one named technique at a time,
// always on a single run. It has two jobs: prove a puzzle can be finished
// without guessing (which also proves it has exactly one solution), and
// measure how hard it is by the techniques it needs.
//
// It never places a digit on a hunch. Every technique only rules digits out
// of cells, and each one is sound, so a grid it finishes has no other answer.

import { ALL_DIGITS, COUNT, HIGH, LOW, SUM, bit, digitOf, type Layout } from './layout';
import { tuning } from './tuning';

export type Technique = 'sums' | 'fit' | 'bounds' | 'pair' | 'fillings' | 'longFillings';

/** How demanding each technique is, 1 (look it up) to 6. */
export const TIER: Record<Technique, number> = {
  sums: 1,
  fit: 2,
  bounds: 3,
  pair: 4,
  fillings: 5,
  longFillings: 6,
};
export const MAX_TIER = 6;
const TECHNIQUES = Object.keys(TIER) as Technique[];

/**
 * COMBOS[n][sum]: every set of n different digits that adds up to sum, as
 * masks. This is the table kakuro players learn: 2 cells making 3 is {1,2}.
 */
export const COMBOS: number[][][] = Array.from({ length: 10 }, () => Array.from({ length: 46 }, () => []));
for (let m = 1; m < 512; m++) COMBOS[COUNT[m]][SUM[m]].push(m);

/** A grid being solved: the digits still possible in each white cell. */
export interface Work {
  layout: Layout;
  sums: number[];
  cands: Uint16Array;
  /** Cells not yet down to one digit. */
  left: number;
  /** Set when a cell runs out of digits or a run cannot make its sum. */
  broken: boolean;
  /** stale[t * runs + r]: run r has changed since technique t last looked at it. */
  stale: Uint8Array;
}

export function begin(layout: Layout, sums: number[]): Work {
  const cells = layout.size * layout.size;
  const w: Work = {
    layout,
    sums,
    cands: new Uint16Array(cells),
    left: 0,
    broken: false,
    stale: new Uint8Array(TECHNIQUES.length * layout.runs.length).fill(1),
  };
  for (let i = 0; i < cells; i++) {
    if (!layout.white[i]) continue;
    w.cands[i] = ALL_DIGITS;
    w.left++;
  }
  return w;
}

/** Narrows a cell to `mask`. True if that changed it. */
function narrow(w: Work, cell: number, mask: number): boolean {
  const old = w.cands[cell];
  mask &= old;
  if (mask === old) return false;
  w.cands[cell] = mask;
  if (!mask) w.broken = true;
  else if (COUNT[mask] === 1) w.left--;
  // Both runs through the cell are worth another look, by every technique.
  const runs = w.layout.runs.length;
  for (const r of [w.layout.acrossOf[cell], w.layout.downOf[cell]]) {
    if (r >= 0) for (let t = 0; t < TECHNIQUES.length; t++) w.stale[t * runs + r] = 1;
  }
  return true;
}

/** What is settled in a run and what is not. `openOf` fills it in, and returns false when nothing in the run is left to decide. */
interface Open {
  /** The cells still undecided. */
  cells: number[];
  /** The digits already placed in the run. */
  placed: number;
  /** What the undecided cells must add up to. */
  rest: number;
}

// One Open is reused for every run looked at, since the solver looks at
// thousands and only ever at one at a time.
const open: Open = { cells: [], placed: 0, rest: 0 };

function openOf(w: Work, r: number): boolean {
  open.cells.length = 0;
  open.placed = 0;
  open.rest = w.sums[r];
  for (const c of w.layout.runs[r].cells) {
    const m = w.cands[c];
    if (COUNT[m] !== 1) {
      open.cells.push(c);
      continue;
    }
    if (open.placed & m) {
      w.broken = true; // the same digit twice
      return false;
    }
    open.placed |= m;
    open.rest -= digitOf(m);
  }
  if (open.cells.length === 0) {
    if (open.rest !== 0) w.broken = true;
    return false;
  }
  if (open.rest < 1 || open.rest > 45) {
    w.broken = true;
    return false;
  }
  return true;
}

// --- Techniques. Each looks at one run and returns true if it ruled anything out.

// The table: which digits appear in any set that makes the rest of the sum in
// the cells left, not reusing a digit already in the run. A cell where the
// across and down answers share one digit is thereby settled.
function sums(w: Work, r: number): boolean {
  if (!openOf(w, r)) return false;
  let allowed = 0;
  for (const m of COMBOS[open.cells.length][open.rest]) if (!(m & open.placed)) allowed |= m;
  let changed = false;
  for (const c of open.cells) if (narrow(w, c, allowed)) changed = true;
  return changed;
}

// The table again, but keeping only the sets the cells can actually hold:
// every digit of the set needs a cell that takes it, and every cell a digit.
// A digit in all the sets that are left, with one cell to go in, goes there.
function fit(w: Work, r: number): boolean {
  if (!openOf(w, r)) return false;
  let union = 0;
  for (const c of open.cells) union |= w.cands[c];
  let allowed = 0;
  let needed = ALL_DIGITS;
  for (const m of COMBOS[open.cells.length][open.rest]) {
    if (m & open.placed || m & ~union) continue;
    if (open.cells.some((c) => !(w.cands[c] & m))) continue;
    allowed |= m;
    needed &= m;
  }
  let changed = false;
  for (const c of open.cells) if (narrow(w, c, allowed)) changed = true;
  if (w.broken) return changed;
  for (let d = 1; d <= 9; d++) {
    if (!(needed & bit(d))) continue;
    const homes = open.cells.filter((c) => w.cands[c] & bit(d));
    if (homes.length === 1 && narrow(w, homes[0], bit(d))) changed = true;
  }
  return changed;
}

// A cell is the sum less the others: it can be no bigger than when they are
// all as small as they can be, and no smaller than when they are all as big.
function bounds(w: Work, r: number): boolean {
  if (!openOf(w, r)) return false;
  let low = 0;
  let high = 0;
  for (const c of open.cells) {
    low += LOW[w.cands[c]];
    high += HIGH[w.cands[c]];
  }
  let changed = false;
  for (const c of open.cells) {
    const m = w.cands[c];
    const least = open.rest - (high - HIGH[m]);
    const most = open.rest - (low - LOW[m]);
    let keep = 0;
    for (let d = Math.max(1, least); d <= Math.min(9, most); d++) keep |= bit(d);
    if (narrow(w, c, keep)) changed = true;
  }
  return changed;
}

// Two cells of a run that can each only be the same two digits take both of
// them, so no other cell of the run can have either.
function pair(w: Work, r: number): boolean {
  if (!openOf(w, r) || open.cells.length < 3) return false;
  let changed = false;
  for (let a = 0; a < open.cells.length; a++) {
    const m = w.cands[open.cells[a]];
    if (COUNT[m] !== 2) continue;
    for (let b = a + 1; b < open.cells.length; b++) {
      if (w.cands[open.cells[b]] !== m) continue;
      open.cells.forEach((c, i) => {
        if (i !== a && i !== b && narrow(w, c, ~m)) changed = true;
      });
    }
  }
  return changed;
}

// Scratch space for `fillings`: for each position in a run, which sets of
// digits can have been used by the cells before it.
const reach = new Uint8Array(10 * 512);
const lists: number[][] = Array.from({ length: 10 }, () => []);
const keep = new Uint16Array(9);

// Every way of filling the run that the candidates allow: a digit that no
// such filling puts in a cell cannot go there. Going through the fillings one
// by one would be slow, but all that matters after some cells are filled is
// which digits they used (their sum follows from that), so the work is done
// on sets of used digits instead.
function fillings(w: Work, r: number, mostOpen: number): boolean {
  if (!openOf(w, r) || open.cells.length > mostOpen) return false;
  const n = open.cells.length;
  const target = open.rest;

  // Forwards: the sets of digits the first i cells can use between them.
  lists[0].length = 0;
  lists[0].push(0);
  for (let i = 0; i < n; i++) {
    const next = lists[i + 1];
    next.length = 0;
    const cands = w.cands[open.cells[i]] & ~open.placed;
    for (const used of lists[i]) {
      for (let free = cands & ~used; free; free &= free - 1) {
        const set = used | (free & -free);
        if (SUM[set] > target || reach[(i + 1) * 512 + set]) continue;
        reach[(i + 1) * 512 + set] = 1;
        next.push(set);
      }
    }
  }

  // Backwards: keep only the sets that go on to make the sum, and note which
  // digit in which cell took part in one. reach = 2 marks a set that does.
  for (const set of lists[n]) if (SUM[set] === target) reach[n * 512 + set] = 2;
  keep.fill(0);
  for (let i = n - 1; i >= 0; i--) {
    const cands = w.cands[open.cells[i]] & ~open.placed;
    for (const used of lists[i]) {
      for (let free = cands & ~used; free; free &= free - 1) {
        const digit = free & -free;
        if (reach[(i + 1) * 512 + (used | digit)] !== 2) continue;
        keep[i] |= digit;
        reach[i * 512 + used] = 2;
      }
    }
  }

  // Wipe the marks, so the scratch space is clean for the next run.
  for (let i = 0; i <= n; i++) for (const set of lists[i]) reach[i * 512 + set] = 0;

  let changed = false;
  open.cells.forEach((c, i) => {
    if (narrow(w, c, keep[i])) changed = true;
  });
  return changed;
}

// Easiest first, so a puzzle is never charged for a technique it does not need.
const FINDERS: ((w: Work, r: number) => boolean)[] = [
  sums,
  fit,
  bounds,
  pair,
  (w, r) => fillings(w, r, tuning.shortFilling),
  (w, r) => fillings(w, r, 9),
];

export interface Solved {
  /** True when the techniques allowed were enough to settle every cell. */
  solved: boolean;
  /** The digit of every settled cell; 0 for black cells and those left open. */
  values: number[];
  /** What is still possible in each cell, as masks. */
  cands: Uint16Array;
  /** How many times each technique ruled something out. */
  uses: Record<Technique, number>;
  /** The tier of the hardest technique used. */
  hardest: number;
}

/**
 * Solves as far as the techniques up to `maxTier` go. The table is applied
 * everywhere it helps; a harder technique is used on one run at a time and
 * only when everything easier has run dry.
 */
export function solve(layout: Layout, runSums: number[], maxTier = MAX_TIER): Solved {
  const w = begin(layout, runSums);
  const runs = layout.runs.length;
  const used = new Array<number>(TECHNIQUES.length).fill(0);
  let hardest = 0;

  search: while (w.left > 0 && !w.broken) {
    for (let t = 0; t < maxTier; t++) {
      let found = false;
      for (let r = 0; r < runs && !w.broken; r++) {
        if (!w.stale[t * runs + r]) continue;
        w.stale[t * runs + r] = 0;
        if (!FINDERS[t](w, r)) continue;
        used[t]++;
        hardest = Math.max(hardest, t + 1);
        found = true;
        if (t > 0) break;
      }
      if (found) continue search;
    }
    break;
  }

  const values = Array.from(w.cands, (m) => (COUNT[m] === 1 ? digitOf(m) : 0));
  const uses = Object.fromEntries(TECHNIQUES.map((name, t) => [name, used[t]])) as Record<Technique, number>;
  // Every cell having one digit left is not quite enough: the sums must hold too.
  const solved = !w.broken && w.left === 0 && layout.runs.every((run, r) => sameSum(run.cells, values, runSums[r]));
  return { solved, values, cands: w.cands, uses, hardest };
}

/**
 * The same end point as `solve`, reached sooner by not keeping track of which
 * technique did what: each run gets everything allowed thrown at it at once.
 * The order makes no difference to where it ends, because every technique
 * only ever rules digits out. The generator uses this for its many trials.
 */
export function settle(layout: Layout, runSums: number[], maxTier = MAX_TIER): Work {
  const w = begin(layout, runSums);
  const runs = layout.runs.length;
  // Going through the fillings finds all that the techniques between can.
  const from = maxTier >= MAX_TIER ? MAX_TIER - 1 : 1;
  for (let busy = true; busy && w.left > 0 && !w.broken; ) {
    busy = false;
    // The table is cheap, so it goes first and as far as it will.
    for (let r = 0; r < runs && !w.broken; r++) {
      if (!w.stale[r]) continue;
      w.stale[r] = 0;
      if (sums(w, r)) busy = true;
    }
    if (busy) continue;
    for (let r = 0; r < runs && !w.broken; r++) {
      if (!w.stale[runs + r]) continue;
      w.stale[runs + r] = 0;
      for (let t = from; t < maxTier; t++) if (FINDERS[t](w, r)) busy = true;
    }
  }
  return w;
}

function sameSum(cells: number[], values: number[], sum: number): boolean {
  let seen = 0;
  let total = 0;
  for (const c of cells) {
    if (seen & bit(values[c])) return false;
    seen |= bit(values[c]);
    total += values[c];
  }
  return total === sum;
}

/**
 * Counts solutions by plain trial and error, stopping at `limit`. It shares
 * nothing with the techniques above; tests use it as an independent check
 * that generated puzzles have exactly one solution.
 */
export function countSolutions(layout: Layout, runSums: number[], limit = 2): number {
  const { runs, acrossOf, downOf } = layout;
  const whites: number[] = [];
  for (let i = 0; i < layout.size * layout.size; i++) if (layout.white[i]) whites.push(i);
  const values = new Uint8Array(layout.size * layout.size);
  // Per run: the digits in it so far, what is left of its sum, and its empty cells.
  const used = new Uint16Array(runs.length);
  const rest = Int16Array.from(runSums);
  const empty = Uint8Array.from(runs, (run) => run.cells.length);
  let found = 0;

  // Can `n` different digits, none of them in `without`, add up to `sum`?
  const memo = new Map<number, boolean>();
  const reachable = (n: number, sum: number, without: number): boolean => {
    if (n === 0) return sum === 0;
    if (sum <= 0) return false;
    const key = (without * 46 + sum) * 10 + n;
    let known = memo.get(key);
    if (known === undefined) {
      known = false;
      // Taking the digits in rising order: the next is the smallest one used.
      for (let d = 1; d <= 9 && !known; d++) {
        if (!(without & bit(d))) known = reachable(n - 1, sum - d, without | (bit(d + 1) - 1));
      }
      memo.set(key, known);
    }
    return known;
  };

  // The digits a run lets its next cell take: unused, and leaving a sum the
  // other empty cells can still reach with different digits.
  const allows = (r: number): number => {
    let mask = 0;
    for (let d = 1; d <= 9; d++) {
      if (!(used[r] & bit(d)) && reachable(empty[r] - 1, rest[r] - d, used[r] | bit(d))) mask |= bit(d);
    }
    return mask;
  };

  const search = (remaining: number) => {
    if (remaining === 0) {
      found++;
      return;
    }
    // Branch on the cell with the fewest digits open to it.
    let best = -1;
    let bestMask = 0;
    for (const c of whites) {
      if (values[c]) continue;
      const mask = allows(acrossOf[c]) & allows(downOf[c]);
      if (!mask) return;
      if (best < 0 || COUNT[mask] < COUNT[bestMask]) {
        best = c;
        bestMask = mask;
        if (COUNT[mask] === 1) break;
      }
    }
    const a = acrossOf[best];
    const b = downOf[best];
    for (let d = 1; d <= 9 && found < limit; d++) {
      if (!(bestMask & bit(d))) continue;
      values[best] = d;
      for (const r of [a, b]) {
        used[r] |= bit(d);
        rest[r] -= d;
        empty[r]--;
      }
      search(remaining - 1);
      for (const r of [a, b]) {
        used[r] &= ~bit(d);
        rest[r] += d;
        empty[r]++;
      }
      values[best] = 0;
    }
  };
  search(whites.length);
  return found;
}

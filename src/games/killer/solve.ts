// A solver for killer sudoku that works the way a person does, one named
// technique at a time. It proves a puzzle can be finished without guessing
// (which also proves it has exactly one solution), measures how hard it is by
// the techniques it needs, and finds the next step for a hint.
//
// The techniques about cages are here, with the singles and locked candidates
// every step leans on. The rarer plain sudoku ones (pairs, triples, wings)
// are borrowed from the sudoku solver.

import { ALL_DIGITS, CELLS, COUNT, PEERS, SEES, UNITS, bit, boxOf, colOf, digitOf, rowOf } from '../sudoku/grid';
import { nextStep as sudokuStep, type Technique as SudokuTechnique } from '../sudoku/solve';

/** A group of cells whose digits are all different and add up to `sum`. Cells are in ascending order. */
export interface Cage {
  cells: number[];
  sum: number;
}

export type Technique =
  | SudokuTechnique
  | 'lastInCage'
  | 'cageSums'
  | 'sum45'
  | 'sum45Wide'
  | 'cageUnit'
  | 'pair45'
  | 'pair45Wide'
  | 'triple45';

/**
 * How demanding each technique is, 0 (trivial) to 6.
 *   lastInCage   the last empty cell of a cage is its total less the rest
 *   cageSums     which digits can make a cage's total, given what its cells can still hold
 *   sum45        a row, column or box adds up to 45, so the one cell of it left
 *                over by whole cages (or the one cell sticking out) is known
 *   sum45Wide    the same over several rows, columns or boxes together
 *   cageUnit     a digit a cage must hold, confined to one row, column or box;
 *                or a digit of a row, column or box confined to one cage
 *   pair45...    the rule of 45 leaving two or three cells with a known total
 */
export const TIER: Record<Technique, number> = {
  lastInCage: 0,
  fullHouse: 1,
  hiddenSingle: 1,
  nakedSingle: 1,
  cageSums: 1,
  sum45: 2,
  sum45Wide: 3,
  locked: 3,
  pair45: 4,
  cageUnit: 4,
  nakedPair: 4,
  hiddenPair: 4,
  pair45Wide: 5,
  nakedTriple: 5,
  hiddenTriple: 5,
  triple45: 6,
  xWing: 6,
  xyWing: 6,
};
export const MAX_TIER = 6;

/** One deduction: either a digit to place, or candidates to rule out. */
export interface Step {
  technique: Technique;
  /** For placements: the cell and its digit. */
  cell?: number;
  digit?: number;
  /** The unit (index into UNITS) the reasoning happens in, when there is exactly one. */
  unit?: number;
  /** For eliminations: [cell, mask of digits to remove]. */
  remove?: [number, number][];
}

/** Cells with a known total, from the rule of 45. They need not all be different. */
interface Sum45 {
  cells: number[];
  sum: number;
  /** The single unit it comes from, or -1 when it took several together. */
  unit: number;
}

/**
 * A grid being solved. The first three fields are exactly the sudoku solver's
 * `Work`, so its techniques can read this one.
 */
export interface Work {
  values: Uint8Array;
  cands: Uint16Array;
  left: number;
  cages: Cage[];
  cageOf: Uint8Array;
  /** For each cell, every cell that may not hold the same digit: its row, column, box and cage. */
  apart: number[][];
  sums45: Sum45[];
  /** Per cage: 1 when its cells' candidates changed since its total was last checked against them. */
  stale: Uint8Array;
  /** Per cage, from that last check: the digits its empty cells hold whichever way its total is made. */
  must: Uint16Array;
}

/** COMBOS[n][sum]: every set of n different digits adding up to sum, as masks. */
const COMBOS: number[][][] = Array.from({ length: 10 }, () => Array.from({ length: 46 }, () => []));
for (let m = 1; m <= ALL_DIGITS; m++) {
  let sum = 0;
  for (let d = 1; d <= 9; d++) if (m & bit(d)) sum += d;
  COMBOS[COUNT[m]][sum].push(m);
}
const combos = (cells: number, sum: number): number[] => (sum >= 1 && sum <= 45 ? COMBOS[cells][sum] : []);

// The parts of the grid the rule of 45 is tried on: one to four neighbouring
// rows or columns (five or more are covered by the rows left over), single
// boxes, and boxes side by side.
interface Region {
  inside: Uint8Array;
  units: number;
  unit: number;
}
const REGIONS: Region[] = [];
function region(units: number[]) {
  const inside = new Uint8Array(CELLS);
  for (const u of units) for (const i of UNITS[u]) inside[i] = 1;
  REGIONS.push({ inside, units: units.length, unit: units.length === 1 ? units[0] : -1 });
}
for (let len = 1; len <= 4; len++) {
  for (const base of [0, 9]) {
    for (let from = 0; from + len <= 9; from++) region(Array.from({ length: len }, (_, k) => base + from + k));
  }
  if (len === 1) for (let b = 0; b < 9; b++) region([18 + b]);
}
for (let b = 0; b < 9; b++) {
  if (b % 3 < 2) region([18 + b, 19 + b]);
  if (b < 6) region([18 + b, 21 + b]);
  if (b % 3 < 2 && b < 6) region([18 + b, 19 + b, 21 + b, 22 + b]);
}

/** More cells than this left over by a region are never few enough to reason about. */
const MOST_45_CELLS = 6;

function sums45(cages: Cage[]): Sum45[] {
  const out: Sum45[] = [];
  for (const r of REGIONS) {
    let whole = 0; // the total of the cages wholly inside
    let straddling = 0; // the total of the cages partly inside
    const innies: number[] = [];
    const outies: number[] = [];
    for (const cage of cages) {
      let n = 0;
      for (const i of cage.cells) n += r.inside[i];
      if (n === cage.cells.length) {
        whole += cage.sum;
      } else if (n > 0) {
        straddling += cage.sum;
        for (const i of cage.cells) (r.inside[i] ? innies : outies).push(i);
      }
    }
    const total = 45 * r.units;
    if (innies.length && innies.length <= MOST_45_CELLS) out.push({ cells: innies, sum: total - whole, unit: r.unit });
    if (outies.length && outies.length <= MOST_45_CELLS) {
      out.push({ cells: outies, sum: whole + straddling - total, unit: r.unit });
    }
  }
  return out;
}

function place(w: Work, cell: number, digit: number) {
  w.values[cell] = digit;
  w.cands[cell] = 0;
  w.left--;
  const b = bit(digit);
  for (const p of w.apart[cell]) {
    if (w.cands[p] & b) {
      w.cands[p] &= ~b;
      w.stale[w.cageOf[p]] = 1;
    }
  }
  w.stale[w.cageOf[cell]] = 1;
}

/**
 * Sets up candidates for a grid of cages, with `values` already filled in
 * (none, for a fresh puzzle). Null if the filled cells contradict each other.
 */
export function begin(cages: Cage[], values?: ArrayLike<number>): Work | null {
  const w: Work = {
    values: new Uint8Array(CELLS),
    cands: new Uint16Array(CELLS).fill(ALL_DIGITS),
    left: CELLS,
    cages,
    cageOf: new Uint8Array(CELLS),
    apart: [],
    sums45: sums45(cages),
    stale: new Uint8Array(cages.length).fill(1),
    must: new Uint16Array(cages.length),
  };
  cages.forEach((cage, c) => cage.cells.forEach((i) => (w.cageOf[i] = c)));
  for (let i = 0; i < CELLS; i++) {
    w.apart.push([...PEERS[i], ...cages[w.cageOf[i]].cells.filter((j) => j !== i && !SEES[i * CELLS + j])]);
  }
  if (values) {
    for (let i = 0; i < CELLS; i++) {
      const d = values[i];
      if (!d) continue;
      if (!(w.cands[i] & bit(d))) return null;
      place(w, i, d);
    }
    for (let i = 0; i < CELLS; i++) if (!w.values[i] && !w.cands[i]) return null;
  }
  return w;
}

/**
 * The same grid under a finer set of cages (some cut in two). What has been
 * ruled out stays ruled out: cutting a cage only adds information.
 */
export function recage(w: Work, cages: Cage[]): Work {
  const next = begin(cages)!;
  next.values = w.values;
  next.cands = w.cands;
  next.left = w.left;
  return next;
}

export function apply(w: Work, step: Step) {
  if (step.cell !== undefined && step.digit !== undefined) place(w, step.cell, step.digit);
  if (step.remove) {
    for (const [cell, mask] of step.remove) {
      w.cands[cell] &= ~mask;
      w.stale[w.cageOf[cell]] = 1;
    }
  }
}

// --- Fitting digits to a total.

const picked = new Uint16Array(9);

/**
 * For the empty cells of a cage and the total they must still make: the
 * digits each cell holds in at least one arrangement, and the digits every
 * arrangement holds (`must`). `need` are digits the cage is known to hold.
 */
function cageFit(w: Work, open: number[], sum: number, need: number): { allowed: number[]; must: number } {
  const n = open.length;
  const allowed = new Array<number>(n).fill(0);
  let must = ALL_DIGITS;
  let union = 0;
  for (const i of open) union |= w.cands[i];
  const seen = new Array<number>(n).fill(0);

  // A set of n digits in n cells: any arrangement that fills the cells uses
  // the whole set, so the total needs no further checking.
  const walk = (i: number, free: number): boolean => {
    let any = false;
    for (let rest = w.cands[open[i]] & free; rest; rest &= rest - 1) {
      const b = rest & -rest;
      picked[i] = b;
      if (i === n - 1) {
        for (let k = 0; k < n; k++) seen[k] |= picked[k];
        any = true;
      } else if (walk(i + 1, free & ~b)) {
        any = true;
      }
    }
    return any;
  };

  for (const set of combos(n, sum)) {
    if ((set & union) !== set || (set & need) !== need) continue;
    // Cells that can each hold the whole set need no search.
    let roomy = true;
    for (const i of open) {
      if ((w.cands[i] & set) !== set) {
        roomy = false;
        break;
      }
    }
    if (roomy) {
      for (let k = 0; k < n; k++) allowed[k] |= set;
      must &= set;
      continue;
    }
    seen.fill(0);
    if (!walk(0, set)) continue;
    for (let k = 0; k < n; k++) allowed[k] |= seen[k];
    must &= set;
  }
  return { allowed, must: allowed[0] ? must : 0 };
}

/**
 * The same for cells from the rule of 45, which share no cage: two of them
 * may hold the same digit unless they share a row, column, box or cage.
 */
function looseFit(w: Work, open: number[], sum: number): number[] {
  const n = open.length;
  const allowed = new Array<number>(n).fill(0);
  const digits = new Uint8Array(n);
  const walk = (i: number, rest: number) => {
    const cell = open[i];
    for (let d = 1; d <= 9 && d <= rest; d++) {
      if (!(w.cands[cell] & bit(d))) continue;
      if (i === n - 1 && d !== rest) continue;
      let clash = false;
      for (let k = 0; k < i; k++) {
        if (digits[k] === d && (SEES[open[k] * CELLS + cell] || w.cageOf[open[k]] === w.cageOf[cell])) clash = true;
      }
      if (clash) continue;
      digits[i] = d;
      if (i === n - 1) for (let k = 0; k < n; k++) allowed[k] |= bit(digits[k]);
      else walk(i + 1, rest - d);
    }
  };
  walk(0, sum);
  return allowed;
}

/** A cage's empty cells and the total they must still make. */
function openOf(w: Work, cage: Cage): { open: number[]; rest: number } {
  const open: number[] = [];
  let rest = cage.sum;
  for (const i of cage.cells) {
    if (w.values[i]) rest -= w.values[i];
    else open.push(i);
  }
  return { open, rest };
}

// --- Techniques. Each returns the first step it finds, without changing the grid.

function lastInCage(w: Work): Step | null {
  for (const cage of w.cages) {
    const { open, rest } = openOf(w, cage);
    if (open.length === 1 && rest >= 1 && rest <= 9 && w.cands[open[0]] & bit(rest)) {
      return { technique: 'lastInCage', cell: open[0], digit: rest };
    }
  }
  return null;
}

/** Removes `mask` from the cells that have any of it; null if nothing changes. */
function removal(w: Work, cells: number[], mask: number): [number, number][] | null {
  const out: [number, number][] = [];
  for (const i of cells) if (w.cands[i] & mask) out.push([i, w.cands[i] & mask]);
  return out.length ? out : null;
}

/** Keeps only `allowed[k]` in cell `cells[k]`; null if nothing changes. */
function keeping(w: Work, cells: number[], allowed: number[]): [number, number][] | null {
  const out: [number, number][] = [];
  cells.forEach((i, k) => {
    if (w.cands[i] & ~allowed[k]) out.push([i, w.cands[i] & ~allowed[k]]);
  });
  return out.length ? out : null;
}

// Only cages whose candidates changed are looked at again; a cage found to
// have nothing to give is remembered as checked. That bookkeeping is the one
// thing a finder writes to the grid.
function cageSums(w: Work): Step | null {
  for (let c = 0; c < w.cages.length; c++) {
    if (!w.stale[c]) continue;
    const { open, rest } = openOf(w, w.cages[c]);
    const fit = open.length ? cageFit(w, open, rest, 0) : null;
    const remove = fit && keeping(w, open, fit.allowed);
    if (remove) return { technique: 'cageSums', remove };
    w.must[c] = fit ? fit.must : 0;
    w.stale[c] = 0;
  }
  return null;
}

// Boxes first: a digit with one home in a box is the easiest kind to spot.
const SINGLES_ORDER = [18, 19, 20, 21, 22, 23, 24, 25, 26, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

// The sudoku singles: a digit with one home in a unit, then a cell with one
// digit left. They are tried before and after nearly every other step, so
// they are written for speed.
function singles(w: Work): Step | null {
  for (const u of SINGLES_ORDER) {
    const cells = UNITS[u];
    let once = 0;
    let twice = 0;
    let empty = 0;
    for (let k = 0; k < 9; k++) {
      const m = w.cands[cells[k]];
      if (m) empty++;
      twice |= once & m;
      once |= m;
    }
    const single = once & ~twice;
    if (!single) continue;
    const b = single & -single;
    const cell = cells.find((i) => w.cands[i] & b)!;
    return { technique: empty === 1 ? 'fullHouse' : 'hiddenSingle', cell, digit: digitOf(b), unit: u };
  }
  for (let i = 0; i < CELLS; i++) {
    if (COUNT[w.cands[i]] === 1) return { technique: 'nakedSingle', cell: i, digit: digitOf(w.cands[i]) };
  }
  return null;
}

// Where a box and a line cross they share three cells. A digit that, within
// the box, fits only in those three is not in the rest of the line; one that,
// within the line, fits only in those three is not in the rest of the box.
const CROSSINGS: { shared: number[]; lineRest: number[]; boxRest: number[]; line: number; box: number }[] = [];
for (let line = 0; line < 18; line++) {
  for (let box = 18; box < 27; box++) {
    const shared = UNITS[line].filter((i) => UNITS[box].includes(i));
    if (!shared.length) continue;
    CROSSINGS.push({
      shared,
      lineRest: UNITS[line].filter((i) => !shared.includes(i)),
      boxRest: UNITS[box].filter((i) => !shared.includes(i)),
      line,
      box,
    });
  }
}

function locked(w: Work): Step | null {
  const union = (cells: number[]) => {
    let m = 0;
    for (const i of cells) m |= w.cands[i];
    return m;
  };
  for (const x of CROSSINGS) {
    const here = union(x.shared);
    if (!here) continue;
    const inLine = union(x.lineRest);
    const inBox = union(x.boxRest);
    const pointing = here & ~inBox & inLine;
    if (pointing) return { technique: 'locked', unit: x.box, remove: removal(w, x.lineRest, pointing)! };
    const claiming = here & ~inLine & inBox;
    if (claiming) return { technique: 'locked', unit: x.line, remove: removal(w, x.boxRest, claiming)! };
  }
  return null;
}

/** The rule of 45, where it leaves exactly `n` empty cells with a known total. */
function rule45(w: Work, n: number, wide: boolean, technique: Technique): Step | null {
  for (const s of w.sums45) {
    if ((s.unit < 0) !== wide || s.cells.length < n) continue;
    const open: number[] = [];
    let rest = s.sum;
    for (const i of s.cells) {
      if (w.values[i]) rest -= w.values[i];
      else open.push(i);
    }
    if (open.length !== n) continue;
    const unit = s.unit < 0 ? undefined : s.unit;
    if (n === 1) {
      if (rest >= 1 && rest <= 9 && w.cands[open[0]] & bit(rest)) return { technique, cell: open[0], digit: rest, unit };
      continue;
    }
    const remove = keeping(w, open, looseFit(w, open, rest));
    if (remove) return { technique, unit, remove };
  }
  return null;
}

/** The rows, columns and boxes that hold every one of `cells`. */
function sharedUnits(cells: number[]): number[] {
  const first = cells[0];
  const out: number[] = [];
  if (cells.every((i) => rowOf(i) === rowOf(first))) out.push(rowOf(first));
  if (cells.every((i) => colOf(i) === colOf(first))) out.push(9 + colOf(first));
  if (cells.every((i) => boxOf(i) === boxOf(first))) out.push(18 + boxOf(first));
  return out;
}

function cageUnit(w: Work): Step | null {
  // A digit the cage must hold, with all its places in the cage in one unit:
  // the rest of that unit cannot have it.
  for (let c = 0; c < w.cages.length; c++) {
    const { open, rest } = openOf(w, w.cages[c]);
    if (open.length < 2) continue;
    const must = w.stale[c] ? cageFit(w, open, rest, 0).must : w.must[c];
    for (let left = must; left; left &= left - 1) {
      const b = left & -left;
      const homes = open.filter((i) => w.cands[i] & b);
      if (!homes.length) continue;
      for (const u of sharedUnits(homes)) {
        const remove = removal(w, UNITS[u].filter((i) => !homes.includes(i)), b);
        if (remove) return { technique: 'cageUnit', unit: u, remove };
      }
    }
  }
  // The reverse: a digit whose places in a unit are all in one cage. The cage
  // holds it there, so not in its cells outside the unit, and its total must
  // be made with that digit.
  for (let u = 0; u < 27; u++) {
    const cells = UNITS[u];
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      let c = -1;
      let homes = 0;
      for (let k = 0; k < 9; k++) {
        if (!(w.cands[cells[k]] & b)) continue;
        if (homes && w.cageOf[cells[k]] !== c) {
          homes = 0;
          break;
        }
        c = w.cageOf[cells[k]];
        homes++;
      }
      if (homes < 2) continue;
      const { open, rest } = openOf(w, w.cages[c]);
      const { allowed } = cageFit(w, open, rest, b);
      open.forEach((i, k) => {
        if (!cells.includes(i)) allowed[k] &= ~b;
      });
      const remove = keeping(w, open, allowed);
      if (remove) return { technique: 'cageUnit', unit: u, remove };
    }
  }
  return null;
}

// The sudoku solver tries its techniques easiest first up to a tier of its
// own: 4 reaches the pairs, 5 the triples and 6 the wings. Its easier ones
// have by then been tried here and found nothing, so asking for one more tier
// each time finds only what is new.
const fromSudoku = (tier: number) => (w: Work) => sudokuStep(w, tier);

// Easiest first, so a puzzle is never charged for a technique it does not need.
const FINDERS: { tier: number; find: (w: Work) => Step | null }[] = [
  { tier: 0, find: lastInCage },
  { tier: 1, find: singles },
  { tier: 1, find: cageSums },
  { tier: 2, find: (w) => rule45(w, 1, false, 'sum45') },
  { tier: 3, find: (w) => rule45(w, 1, true, 'sum45Wide') },
  { tier: 3, find: locked },
  { tier: 4, find: (w) => rule45(w, 2, false, 'pair45') },
  { tier: 4, find: cageUnit },
  { tier: 4, find: fromSudoku(4) },
  { tier: 5, find: (w) => rule45(w, 2, true, 'pair45Wide') },
  { tier: 5, find: fromSudoku(5) },
  { tier: 6, find: (w) => rule45(w, 3, false, 'triple45') ?? rule45(w, 3, true, 'triple45') },
  { tier: 6, find: fromSudoku(6) },
];

/** The easiest available step using techniques up to `maxTier`, or null. */
export function nextStep(w: Work, maxTier = MAX_TIER): Step | null {
  for (const f of FINDERS) {
    if (f.tier > maxTier) break;
    const step = f.find(w);
    if (step) return step;
  }
  return null;
}

export type Uses = Record<Technique, number>;
export const noUses = () => Object.fromEntries(Object.keys(TIER).map((t) => [t, 0])) as Uses;

/** Takes steps until the grid is full or the techniques allowed run out, counting them in `uses`. */
export function advance(w: Work, maxTier: number, uses: Uses) {
  while (w.left > 0) {
    const step = nextStep(w, maxTier);
    if (!step) break;
    apply(w, step);
    uses[step.technique]++;
  }
}

export interface Solved {
  /** True when the techniques allowed were enough to fill every cell. */
  solved: boolean;
  values: Uint8Array;
  /** How many times each technique was used. */
  uses: Uses;
  /** The tier of the hardest technique used. */
  hardest: number;
  /** The grid as far as it got. */
  work: Work;
}

export function solve(cages: Cage[], maxTier = MAX_TIER): Solved {
  const uses = noUses();
  const w = begin(cages)!;
  advance(w, maxTier, uses);
  let hardest = 0;
  for (const t of Object.keys(uses) as Technique[]) if (uses[t]) hardest = Math.max(hardest, TIER[t]);
  return { solved: w.left === 0, values: w.values, uses, hardest, work: w };
}

/**
 * Counts solutions by brute force, stopping at `limit`. It shares nothing
 * with the techniques above, so tests use it as an independent check that
 * generated puzzles have exactly one solution.
 */
export function countSolutions(cages: Cage[], limit = 2): number {
  const cageOf = new Uint8Array(CELLS);
  cages.forEach((cage, c) => cage.cells.forEach((i) => (cageOf[i] = c)));
  const rows = new Uint16Array(9);
  const cols = new Uint16Array(9);
  const boxes = new Uint16Array(9);
  const used = new Uint16Array(cages.length);
  const rest = Int16Array.from(cages, (cage) => cage.sum);
  const open = Uint8Array.from(cages, (cage) => cage.cells.length);
  const values = new Uint8Array(CELLS);
  let found = 0;

  /** The digits a cell can take: free in its row, column and box, and part of some way to finish its cage. */
  const options = (i: number): number => {
    const c = cageOf[i];
    let fits = 0;
    for (const set of combos(open[c], rest[c])) if (!(set & used[c])) fits |= set;
    return fits & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]);
  };

  const search = () => {
    // Branch on the cell with the fewest options.
    let best = -1;
    let bestMask = 0;
    for (let i = 0; i < CELLS; i++) {
      if (values[i]) continue;
      const mask = options(i);
      if (!mask) return;
      if (best < 0 || COUNT[mask] < COUNT[bestMask]) {
        best = i;
        bestMask = mask;
        if (COUNT[mask] === 1) break;
      }
    }
    if (best < 0) {
      found++;
      return;
    }
    const c = cageOf[best];
    const [r, k, x] = [rowOf(best), colOf(best), boxOf(best)];
    for (let mask = bestMask; mask && found < limit; mask &= mask - 1) {
      const b = mask & -mask;
      const d = digitOf(b);
      values[best] = d;
      rows[r] |= b;
      cols[k] |= b;
      boxes[x] |= b;
      used[c] |= b;
      rest[c] -= d;
      open[c]--;
      search();
      values[best] = 0;
      rows[r] &= ~b;
      cols[k] &= ~b;
      boxes[x] &= ~b;
      used[c] &= ~b;
      rest[c] += d;
      open[c]++;
    }
  };
  search();
  return found;
}

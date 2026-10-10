// A solver that works the way a person does, one named technique at a time.
// It has three jobs: prove a puzzle can be finished without guessing (which
// also proves it has exactly one solution), measure how hard it is by the
// techniques it needs, and find the next step for a hint.

import { ALL_DIGITS, CELLS, COUNT, PEERS, SEES, UNITS, bit, boxOf, colOf, digitOf, rowOf } from './grid';

export type Technique =
  | 'fullHouse'
  | 'hiddenSingle'
  | 'nakedSingle'
  | 'locked'
  | 'nakedPair'
  | 'hiddenPair'
  | 'nakedTriple'
  | 'hiddenTriple'
  | 'xWing'
  | 'xyWing';

/** How demanding each technique is, 0 (trivial) to 6. */
export const TIER: Record<Technique, number> = {
  fullHouse: 0,
  hiddenSingle: 1,
  nakedSingle: 2,
  locked: 3,
  nakedPair: 4,
  hiddenPair: 4,
  nakedTriple: 5,
  hiddenTriple: 5,
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
  /** The unit (index into UNITS) the reasoning happens in, when there is one. */
  unit?: number;
  /** For eliminations: [cell, mask of digits to remove]. */
  remove?: [number, number][];
}

/** A grid being solved: values, and the digits still possible in each empty cell. */
export interface Work {
  values: Uint8Array;
  cands: Uint16Array;
  left: number;
}

/** Sets up candidates from the filled cells. Null if the grid contradicts itself. */
export function begin(values: ArrayLike<number>): Work | null {
  const w: Work = { values: Uint8Array.from(values), cands: new Uint16Array(CELLS), left: 0 };
  for (let i = 0; i < CELLS; i++) if (!w.values[i]) w.cands[i] = ALL_DIGITS;
  for (let i = 0; i < CELLS; i++) {
    const d = w.values[i];
    if (!d) continue;
    for (const p of PEERS[i]) {
      if (w.values[p] === d) return null;
      w.cands[p] &= ~bit(d);
    }
  }
  for (let i = 0; i < CELLS; i++) {
    if (w.values[i]) continue;
    if (!w.cands[i]) return null;
    w.left++;
  }
  return w;
}

function place(w: Work, cell: number, digit: number) {
  w.values[cell] = digit;
  w.cands[cell] = 0;
  w.left--;
  for (const p of PEERS[cell]) w.cands[p] &= ~bit(digit);
}

export function apply(w: Work, step: Step) {
  if (step.cell !== undefined && step.digit !== undefined) place(w, step.cell, step.digit);
  if (step.remove) for (const [cell, mask] of step.remove) w.cands[cell] &= ~mask;
}

// --- Techniques. Each returns the first step it finds, without changing the grid.

function fullHouse(w: Work): Step | null {
  for (let u = 0; u < 27; u++) {
    let empty = -1;
    let count = 0;
    for (const i of UNITS[u]) {
      if (!w.values[i]) {
        empty = i;
        count++;
      }
    }
    if (count === 1 && COUNT[w.cands[empty]] === 1) {
      return { technique: 'fullHouse', cell: empty, digit: digitOf(w.cands[empty]), unit: u };
    }
  }
  return null;
}

// Boxes first: a digit with one home in a box is the easiest kind to spot.
const HIDDEN_SINGLE_ORDER = [18, 19, 20, 21, 22, 23, 24, 25, 26, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

function hiddenSingle(w: Work): Step | null {
  for (const u of HIDDEN_SINGLE_ORDER) {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      let home = -1;
      let count = 0;
      for (const i of UNITS[u]) {
        if (w.cands[i] & b) {
          home = i;
          count++;
        }
      }
      if (count === 1) return { technique: 'hiddenSingle', cell: home, digit: d, unit: u };
    }
  }
  return null;
}

function nakedSingle(w: Work): Step | null {
  for (let i = 0; i < CELLS; i++) {
    if (COUNT[w.cands[i]] === 1) return { technique: 'nakedSingle', cell: i, digit: digitOf(w.cands[i]) };
  }
  return null;
}

/** Removes `mask` from the cells that have any of it; null if nothing changes. */
function removal(w: Work, cells: number[], mask: number): [number, number][] | null {
  const out: [number, number][] = [];
  for (const i of cells) if (w.cands[i] & mask) out.push([i, w.cands[i] & mask]);
  return out.length ? out : null;
}

// A digit confined to one line inside a box clears the rest of that line
// (pointing); a digit confined to one box inside a line clears the rest of
// that box (claiming).
function locked(w: Work): Step | null {
  for (let u = 0; u < 27; u++) {
    for (let d = 1; d <= 9; d++) {
      const b = bit(d);
      const homes = UNITS[u].filter((i) => w.cands[i] & b);
      if (homes.length < 2) continue;
      const first = homes[0];
      const others: number[] = [];
      if (u >= 18) {
        if (homes.every((i) => rowOf(i) === rowOf(first))) others.push(rowOf(first));
        if (homes.every((i) => colOf(i) === colOf(first))) others.push(9 + colOf(first));
      } else if (homes.every((i) => boxOf(i) === boxOf(first))) {
        others.push(18 + boxOf(first));
      }
      for (const o of others) {
        const remove = removal(w, UNITS[o].filter((i) => !homes.includes(i)), b);
        if (remove) return { technique: 'locked', unit: u, remove };
      }
    }
  }
  return null;
}

/** Calls `visit` with every way to pick `k` of `items`; stops when it returns true. */
function combos<T>(items: T[], k: number, visit: (picked: T[]) => boolean): boolean {
  const picked: T[] = [];
  const walk = (from: number): boolean => {
    if (picked.length === k) return visit(picked);
    for (let i = from; i <= items.length - (k - picked.length); i++) {
      picked.push(items[i]);
      if (walk(i + 1)) return true;
      picked.pop();
    }
    return false;
  };
  return walk(0);
}

// k cells in a unit that between them hold only k digits: those digits can be
// nowhere else in the unit.
function nakedSubset(w: Work, k: number, technique: Technique): Step | null {
  let found: Step | null = null;
  for (let u = 0; u < 27 && !found; u++) {
    const open = UNITS[u].filter((i) => !w.values[i]);
    if (open.length <= k) continue;
    const small = open.filter((i) => COUNT[w.cands[i]] <= k);
    combos(small, k, (cells) => {
      let mask = 0;
      for (const i of cells) mask |= w.cands[i];
      if (COUNT[mask] !== k) return false;
      const remove = removal(w, open.filter((i) => !cells.includes(i)), mask);
      if (remove) found = { technique, unit: u, remove };
      return found !== null;
    });
  }
  return found;
}

// k digits in a unit that between them fit in only k cells: those cells can
// hold nothing else.
function hiddenSubset(w: Work, k: number, technique: Technique): Step | null {
  let found: Step | null = null;
  for (let u = 0; u < 27 && !found; u++) {
    const cells = UNITS[u];
    // For each digit, a 9-bit mask of the positions in the unit it can go.
    const homes: { digit: number; where: number }[] = [];
    for (let d = 1; d <= 9; d++) {
      let where = 0;
      for (let p = 0; p < 9; p++) if (w.cands[cells[p]] & bit(d)) where |= 1 << p;
      if (where && COUNT[where] <= k) homes.push({ digit: d, where });
    }
    combos(homes, k, (picked) => {
      let where = 0;
      let digits = 0;
      for (const h of picked) {
        where |= h.where;
        digits |= bit(h.digit);
      }
      if (COUNT[where] !== k) return false;
      const remove = removal(w, cells.filter((_, p) => where & (1 << p)), ALL_DIGITS & ~digits);
      if (remove) found = { technique, unit: u, remove };
      return found !== null;
    });
  }
  return found;
}

// A digit with exactly two homes in each of two rows, in the same two columns,
// must take one column in each row: it clears those columns elsewhere. And
// the same with rows and columns swapped.
function xWing(w: Work): Step | null {
  for (let d = 1; d <= 9; d++) {
    const b = bit(d);
    for (const base of [0, 9]) {
      const lines: { line: number; where: number }[] = [];
      for (let l = 0; l < 9; l++) {
        let where = 0;
        for (let p = 0; p < 9; p++) if (w.cands[UNITS[base + l][p]] & b) where |= 1 << p;
        if (COUNT[where] === 2) lines.push({ line: l, where });
      }
      for (let a = 0; a < lines.length; a++) {
        for (let c = a + 1; c < lines.length; c++) {
          if (lines[a].where !== lines[c].where) continue;
          const cross = base === 0 ? 9 : 0;
          const targets: number[] = [];
          for (let p = 0; p < 9; p++) {
            if (!(lines[a].where & (1 << p))) continue;
            UNITS[cross + p].forEach((cell, l) => {
              if (l !== lines[a].line && l !== lines[c].line) targets.push(cell);
            });
          }
          const remove = removal(w, targets, b);
          if (remove) return { technique: 'xWing', remove };
        }
      }
    }
  }
  return null;
}

// A pivot cell {x,y} seeing two cells {x,z} and {y,z}: one of those two must
// be z, so any cell that sees both cannot be z.
function xyWing(w: Work): Step | null {
  for (let pivot = 0; pivot < CELLS; pivot++) {
    const pm = w.cands[pivot];
    if (COUNT[pm] !== 2) continue;
    const wings = PEERS[pivot].filter((i) => COUNT[w.cands[i]] === 2 && COUNT[w.cands[i] & pm] === 1);
    for (let a = 0; a < wings.length; a++) {
      for (let c = a + 1; c < wings.length; c++) {
        const am = w.cands[wings[a]];
        const cm = w.cands[wings[c]];
        const z = am & cm & ~pm;
        if (COUNT[z] !== 1 || (am & pm) === (cm & pm)) continue;
        const targets: number[] = [];
        for (let i = 0; i < CELLS; i++) {
          if (i !== pivot && SEES[i * CELLS + wings[a]] && SEES[i * CELLS + wings[c]]) targets.push(i);
        }
        const remove = removal(w, targets, z);
        if (remove) return { technique: 'xyWing', remove };
      }
    }
  }
  return null;
}

// Easiest first, so a puzzle is never charged for a technique it does not need.
const FINDERS: { tier: number; find: (w: Work) => Step | null }[] = [
  { tier: 0, find: fullHouse },
  { tier: 1, find: hiddenSingle },
  { tier: 2, find: nakedSingle },
  { tier: 3, find: locked },
  { tier: 4, find: (w) => nakedSubset(w, 2, 'nakedPair') },
  { tier: 4, find: (w) => hiddenSubset(w, 2, 'hiddenPair') },
  { tier: 5, find: (w) => nakedSubset(w, 3, 'nakedTriple') },
  { tier: 5, find: (w) => hiddenSubset(w, 3, 'hiddenTriple') },
  { tier: 6, find: xWing },
  { tier: 6, find: xyWing },
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

export interface Solved {
  /** True when the techniques allowed were enough to fill every cell. */
  solved: boolean;
  values: Uint8Array;
  /** How many times each technique was used. */
  uses: Record<Technique, number>;
  /** The tier of the hardest technique used. */
  hardest: number;
}

export function solve(givens: ArrayLike<number>, maxTier = MAX_TIER): Solved {
  const uses = Object.fromEntries(Object.keys(TIER).map((t) => [t, 0])) as Record<Technique, number>;
  const w = begin(givens);
  if (!w) return { solved: false, values: Uint8Array.from(givens), uses, hardest: 0 };
  let hardest = 0;
  while (w.left > 0) {
    const step = nextStep(w, maxTier);
    if (!step) break;
    apply(w, step);
    uses[step.technique]++;
    hardest = Math.max(hardest, TIER[step.technique]);
  }
  return { solved: w.left === 0, values: w.values, uses, hardest };
}

/**
 * Counts solutions by brute force, stopping at `limit`. Used by tests as an
 * independent check that generated puzzles have exactly one solution.
 */
export function countSolutions(givens: ArrayLike<number>, limit = 2): number {
  const start = begin(givens);
  if (!start) return 0;
  let found = 0;
  const search = (w: Work) => {
    // Fill forced cells, then branch on the cell with the fewest candidates.
    for (;;) {
      let best = -1;
      let progress = false;
      for (let i = 0; i < CELLS; i++) {
        if (w.values[i]) continue;
        const n = COUNT[w.cands[i]];
        if (n === 0) return;
        if (n === 1) {
          place(w, i, digitOf(w.cands[i]));
          progress = true;
        } else if (best < 0 || n < COUNT[w.cands[best]]) {
          best = i;
        }
      }
      if (progress) continue;
      if (best < 0) {
        found++;
        return;
      }
      for (let d = 1; d <= 9 && found < limit; d++) {
        if (!(w.cands[best] & bit(d))) continue;
        const copy: Work = { values: w.values.slice(), cands: w.cands.slice(), left: w.left };
        place(copy, best, d);
        search(copy);
      }
      return;
    }
  };
  search(start);
  return found;
}

// Solves a Binairo the way a person would, with named techniques from easy to
// hard. The generator uses it to promise that a puzzle needs no guessing: a
// puzzle this solver finishes has exactly one solution, because every step it
// takes is forced.
//
// A row or column is kept as two bit patterns, one bit per cell: where the
// dark circles are, and where the light ones are. That makes the common
// questions ("two alike side by side?") a couple of machine operations.

import { DARK, EMPTY, LIGHT } from './rules';
import { tuning } from './tuning';

export const TECHNIQUES = ['pair', 'gap', 'count', 'lookahead', 'duplicate', 'smallLine', 'wholeLine'] as const;
export type Technique = (typeof TECHNIQUES)[number];

/** How hard each technique is; tuning.ts describes them. */
export const TIER: Record<Technique, number> = {
  pair: 1,
  gap: 1,
  count: 2,
  lookahead: 3,
  duplicate: 4,
  smallLine: 5,
  wholeLine: 6,
};
export const HARDEST_TIER = 6;

export interface Work {
  size: number;
  /** Lines 0 to size-1 are the rows, the rest the columns. Bit k of a row is its cell in column k. */
  dark: Int32Array;
  light: Int32Array;
  /** Cells still empty. */
  left: number;
  /** Set when the grid is found to have no solution. */
  bad: boolean;
  /** For each tier, the lines that have changed since that tier last looked at them. */
  stale: Uint8Array[];
  /** How many cells each technique filled in. */
  uses: Record<Technique, number>;
  /** The hardest tier that filled in a cell. */
  hardest: number;
}

export interface Solved {
  solved: boolean;
  hardest: number;
  uses: Record<Technique, number>;
  /** The grid as far as the solver got. */
  cells: number[];
}

function bits(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

const hasThree = (x: number) => (x & (x >> 1) & (x >> 2)) !== 0;

/** Where a third of the same kind would make three in a line: beside a pair, or in a gap. */
const besidePair = (x: number) => ((x & (x >> 1)) << 2) | ((x & (x >> 1)) >> 1);
const inGap = (x: number) => (x & (x >> 2)) << 1;

const lineCache = new Map<number, Int32Array>();

/** Every way to fill one line of `size` cells within the rules, as the pattern of its dark cells. */
export function fullLines(size: number): Int32Array {
  let lines = lineCache.get(size);
  if (!lines) {
    const out: number[] = [];
    for (let x = 0; x < 1 << size; x++) {
      if (bits(x) === size / 2 && !hasThree(x) && !hasThree(~x & ((1 << size) - 1))) out.push(x);
    }
    lines = Int32Array.from(out);
    lineCache.set(size, lines);
  }
  return lines;
}

const noUses = () => Object.fromEntries(TECHNIQUES.map((t) => [t, 0])) as Record<Technique, number>;

/** Puts a circle in a cell. A cell that already holds the other kind means the grid has no solution. */
export function place(w: Work, cell: number, value: number): boolean {
  const n = w.size;
  const r = (cell / n) | 0;
  const c = cell % n;
  const now = w.dark[r] & (1 << c) ? DARK : w.light[r] & (1 << c) ? LIGHT : EMPTY;
  if (now) {
    if (now !== value) w.bad = true;
    return false;
  }
  const kind = value === DARK ? w.dark : w.light;
  kind[r] |= 1 << c;
  kind[n + c] |= 1 << r;
  w.left--;
  const full = (1 << n) - 1;
  for (const line of [r, n + c]) {
    for (const tier of w.stale) tier[line] = 1;
    // A finished line rules out its copy, which is news for every line beside it.
    if ((w.dark[line] | w.light[line]) === full) {
      const first = line < n ? 0 : n;
      for (let tier = 4; tier <= HARDEST_TIER; tier++) w.stale[tier].fill(1, first, first + n);
    }
  }
  return true;
}

export function begin(size: number, cells: ArrayLike<number>): Work {
  const w: Work = {
    size,
    dark: new Int32Array(size * 2),
    light: new Int32Array(size * 2),
    left: size * size,
    bad: false,
    stale: Array.from({ length: HARDEST_TIER + 1 }, () => new Uint8Array(size * 2).fill(1)),
    uses: noUses(),
    hardest: 0,
  };
  for (let i = 0; i < size * size; i++) if (cells[i]) place(w, i, cells[i]);
  return w;
}

export function copy(w: Work): Work {
  return { ...w, dark: w.dark.slice(), light: w.light.slice(), stale: w.stale.map((s) => s.slice()), uses: { ...w.uses } };
}

export function cellsOf(w: Work): number[] {
  const n = w.size;
  return Array.from({ length: n * n }, (_, i) => {
    const bit = 1 << (i % n);
    const r = (i / n) | 0;
    return w.dark[r] & bit ? DARK : w.light[r] & bit ? LIGHT : EMPTY;
  });
}

/** Fills the cells of `mask` in a line; returns how many were new. */
function fill(w: Work, line: number, mask: number, value: number, technique: Technique): number {
  const n = w.size;
  let placed = 0;
  for (let k = 0; k < n; k++) {
    if (!(mask & (1 << k))) continue;
    if (place(w, line < n ? line * n + k : k * n + (line - n), value)) placed++;
  }
  w.uses[technique] += placed;
  return placed;
}

/**
 * Can a line on its own still be finished? Fills in what pairs, gaps and
 * counts force, over and over, and reports false if that runs into a wall.
 */
function canFinish(size: number, dark: number, light: number): boolean {
  const full = (1 << size) - 1;
  for (;;) {
    if ((dark & light) !== 0 || hasThree(dark) || hasThree(light)) return false;
    const nDark = bits(dark);
    const nLight = bits(light);
    if (nDark > size / 2 || nLight > size / 2) return false;
    const empty = full & ~(dark | light);
    let toLight = (besidePair(dark) | inGap(dark)) & empty;
    let toDark = (besidePair(light) | inGap(light)) & empty;
    if (nDark === size / 2) toLight |= empty;
    if (nLight === size / 2) toDark |= empty;
    if (!toLight && !toDark) return true;
    dark |= toDark;
    light |= toLight;
  }
}

/** The finished lines beside this one (rows for a row, columns for a column), as dark patterns. */
function finishedBeside(w: Work, line: number): number[] {
  const n = w.size;
  const full = (1 << n) - 1;
  const first = line < n ? 0 : n;
  const out: number[] = [];
  for (let other = first; other < first + n; other++) {
    if (other !== line && (w.dark[other] | w.light[other]) === full) out.push(w.dark[other]);
  }
  return out;
}

/** Applies one tier's techniques to one line; true if a cell was filled in. */
function deduce(w: Work, line: number, tier: number): boolean {
  const n = w.size;
  const half = n / 2;
  const full = (1 << n) - 1;
  const dark = w.dark[line];
  const light = w.light[line];
  const empty = full & ~(dark | light);
  if (tier < 5 && !empty) return false;

  switch (tier) {
    case 1: {
      // A gap that is also beside a pair is counted as the pair: the easier thing to see.
      let placed = fill(w, line, besidePair(dark) & empty, LIGHT, 'pair');
      placed += fill(w, line, besidePair(light) & empty, DARK, 'pair');
      placed += fill(w, line, inGap(dark) & empty & ~besidePair(dark), LIGHT, 'gap');
      placed += fill(w, line, inGap(light) & empty & ~besidePair(light), DARK, 'gap');
      return placed > 0;
    }
    case 2: {
      if (bits(dark) > half || bits(light) > half) w.bad = true;
      else if (bits(dark) === half) return fill(w, line, empty, LIGHT, 'count') > 0;
      else if (bits(light) === half) return fill(w, line, empty, DARK, 'count') > 0;
      return false;
    }
    case 3: {
      // Try each empty cell both ways. If one way leaves the line unable to
      // be finished, the cell is the other kind.
      let toDark = 0;
      let toLight = 0;
      for (let k = 0; k < n; k++) {
        const bit = 1 << k;
        if (!(empty & bit)) continue;
        const darkWorks = canFinish(n, dark | bit, light);
        const lightWorks = canFinish(n, dark, light | bit);
        if (!darkWorks && !lightWorks) w.bad = true;
        else if (!darkWorks) toLight |= bit;
        else if (!lightWorks) toDark |= bit;
      }
      return fill(w, line, toDark, DARK, 'lookahead') + fill(w, line, toLight, LIGHT, 'lookahead') > 0;
    }
    case 4: {
      // Two cells left, one of each kind to go: if one of the two ways would
      // copy a finished line, it must be the other way.
      if (bits(empty) !== 2 || bits(dark) !== half - 1) return false;
      let placed = 0;
      for (const other of finishedBeside(w, line)) {
        if ((other & dark) !== dark || (other & light) !== 0) continue;
        placed += fill(w, line, empty & ~other, DARK, 'duplicate');
        placed += fill(w, line, empty & other, LIGHT, 'duplicate');
      }
      return placed > 0;
    }
    default: {
      // Tier 5 takes the lines with few cells left and tier 6 the rest, so no line is done twice.
      const small = bits(empty) <= tuning.smallLine;
      if (small !== (tier === 5)) return false;
      const taken = finishedBeside(w, line);
      let always = full;
      let ever = 0;
      let found = false;
      for (const way of fullLines(n)) {
        if ((way & dark) !== dark || (way & light) !== 0 || taken.includes(way)) continue;
        found = true;
        always &= way;
        ever |= way;
        // Once the ways disagree about every empty cell there is nothing to learn.
        if (!(always & empty) && (ever & empty) === empty) return false;
      }
      if (!found) {
        w.bad = true;
        return false;
      }
      const technique = small ? 'smallLine' : 'wholeLine';
      return fill(w, line, always & empty, DARK, technique) + fill(w, line, ~ever & empty, LIGHT, technique) > 0;
    }
  }
}

/**
 * Fills in everything the techniques up to `maxTier` can. A harder technique
 * is tried only when the easier ones have nothing left to say, so `hardest`
 * is what the puzzle really needs.
 */
export function run(w: Work, maxTier: number): void {
  for (;;) {
    let progressed = false;
    for (let tier = 1; tier <= maxTier && !progressed; tier++) {
      const stale = w.stale[tier];
      for (let line = 0; line < w.size * 2; line++) {
        if (!stale[line]) continue;
        stale[line] = 0;
        const filled = deduce(w, line, tier);
        if (w.bad) return;
        if (!filled) continue;
        progressed = true;
        w.hardest = Math.max(w.hardest, tier);
        // After a hard step, go back to the easy ones straight away.
        if (tier > 2) break;
      }
    }
    if (!progressed) return;
  }
}

/** Solves as far as the techniques up to `maxTier` go. */
export function solve(size: number, cells: ArrayLike<number>, maxTier = HARDEST_TIER): Solved {
  const w = begin(size, cells);
  run(w, maxTier);
  // A full grid is checked whatever the tier: every line must be a legal one, and no two alike.
  if (!w.bad && !w.left) run(w, HARDEST_TIER);
  return { solved: !w.bad && w.left === 0, hardest: w.hardest, uses: w.uses, cells: cellsOf(w) };
}

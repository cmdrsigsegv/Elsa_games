// Solves a tents puzzle the way a person does, by steps that are certain,
// never by trying something to see what happens. The generator uses it to
// keep only puzzles that can be finished this way, which also proves they
// have one solution, and to measure how hard a puzzle is: the steps come in
// four depths (described in tuning.ts), and an easier step is always taken
// before a harder one.

import { paired, type TentsPuzzle } from './rules';
import { tuning } from './tuning';

export type Clued = Pick<TentsPuzzle, 'w' | 'h' | 'trees' | 'rows' | 'cols'>;

export interface Solution {
  /** False when the allowed steps ran out before the grid was finished. */
  solved: boolean;
  /** The cells found to hold a tent. */
  tents: number[];
  /** The deepest kind of step that was needed, 1 to 4. */
  depth: number;
  /** How many steps of each depth were taken; steps[3] is the count at depth 3. */
  steps: number[];
}

const OPEN = 0;
const TENT = 1;
const GRASS = 2;
const TREE = 3;

interface Shape {
  beside: number[][];
  around: number[][];
  /** Every row, then every column, as its cells in order. */
  lines: number[][];
}

// Which cells neighbour which depends only on the grid's size, and the
// generator solves many grids of one size, so this is worked out once per size.
const shapes = new Map<number, Shape>();

function shapeOf(w: number, h: number): Shape {
  const key = w * 1000 + h;
  const known = shapes.get(key);
  if (known) return known;
  const beside: number[][] = [];
  const around: number[][] = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const b: number[] = [];
      const a: number[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if ((!dr && !dc) || r + dr < 0 || r + dr >= h || c + dc < 0 || c + dc >= w) continue;
          a.push((r + dr) * w + c + dc);
          if (!dr || !dc) b.push((r + dr) * w + c + dc);
        }
      }
      beside.push(b);
      around.push(a);
    }
  }
  const lines: number[][] = [];
  for (let r = 0; r < h; r++) lines.push(Array.from({ length: w }, (_, c) => r * w + c));
  for (let c = 0; c < w; c++) lines.push(Array.from({ length: h }, (_, r) => r * w + c));
  const shape = { beside, around, lines };
  shapes.set(key, shape);
  return shape;
}

/**
 * Solves as far as steps up to `depth` will go. `ways` is the most
 * arrangements of one line a depth 4 step may consider.
 */
export function solve(p: Clued, depth = 4, ways = 1000): Solution {
  const { w, h } = p;
  const n = w * h;
  const { beside, around, lines } = shapeOf(w, h);
  const grid = new Int8Array(n);
  /** For a tree, the tent known to be its own; for a tent, its tree; -1 while not known. */
  const mate = new Int32Array(n).fill(-1);
  /** Per line (rows, then columns): tents placed so far, and cells still open. */
  const placed = new Int32Array(h + w);
  const open = new Int32Array(h + w);
  const clue = [...p.rows, ...p.cols];
  /** Set when the clues turn out to contradict each other: not a real puzzle. */
  let broken = false;

  for (let i = 0; i < n; i++) {
    if (p.trees[i]) {
      grid[i] = TREE;
    } else {
      open[Math.floor(i / w)]++;
      open[h + (i % w)]++;
    }
  }

  const grass = (i: number) => {
    if (grid[i] !== OPEN) return;
    grid[i] = GRASS;
    open[Math.floor(i / w)]--;
    open[h + (i % w)]--;
  };
  // A new tent at once rules out a tent in every cell touching it.
  const tent = (i: number) => {
    if (grid[i] !== OPEN) {
      broken ||= grid[i] !== TENT;
      return;
    }
    grid[i] = TENT;
    for (const line of [Math.floor(i / w), h + (i % w)]) {
      open[line]--;
      placed[line]++;
    }
    for (const a of around[i]) {
      if (grid[a] === TENT) broken = true;
      grass(a);
    }
  };
  const pair = (tree: number, tentCell: number) => {
    mate[tree] = tentCell;
    mate[tentCell] = tree;
  };

  /** Depth 1: counting along the lines. */
  const counting = (): boolean => {
    let changed = false;
    lines.forEach((cells, line) => {
      if (!open[line]) return;
      const need = clue[line] - placed[line];
      if (need === 0) {
        for (const i of cells) grass(i);
      } else if (need === open[line]) {
        for (const i of cells) if (grid[i] === OPEN) tent(i);
      } else {
        broken ||= need < 0 || need > open[line];
        return;
      }
      changed = true;
    });
    return changed;
  };

  /** Depth 2: working out which tent belongs to which tree. */
  const pairing = (): boolean => {
    let changed = false;
    for (let i = 0; i < n; i++) {
      if (grid[i] === TREE && mate[i] < 0) {
        // A tree's tent is an open cell beside it, or a tent there that no other tree has claimed.
        let choices = 0;
        let only = -1;
        for (const b of beside[i]) {
          if (grid[b] === OPEN || (grid[b] === TENT && mate[b] < 0)) {
            choices++;
            only = b;
          }
        }
        if (choices === 0) broken = true;
        if (choices !== 1) continue;
        tent(only);
        pair(i, only);
        changed = true;
      } else if (grid[i] === TENT && mate[i] < 0) {
        let choices = 0;
        let only = -1;
        for (const b of beside[i]) {
          if (grid[b] === TREE && mate[b] < 0) {
            choices++;
            only = b;
          }
        }
        if (choices === 0) broken = true;
        if (choices !== 1) continue;
        pair(only, i);
        changed = true;
      } else if (grid[i] === OPEN && !beside[i].some((b) => grid[b] === TREE && mate[b] < 0)) {
        // Every tree beside this cell has its tent already: a tent here would belong to none.
        grass(i);
        changed = true;
      }
    }
    return changed;
  };

  /**
   * Depth 3: a tree whose tent can only go in cells that all touch one other
   * open cell, typically the two cells either side of a corner. Wherever the
   * tent goes, it touches that cell, so that cell is grass.
   */
  const corner = (): boolean => {
    for (let i = 0; i < n; i++) {
      if (grid[i] !== TREE || mate[i] >= 0) continue;
      // An unclaimed tent beside the tree might be its own, and then nothing follows.
      if (beside[i].some((b) => grid[b] === TENT && mate[b] < 0)) continue;
      const spots = beside[i].filter((b) => grid[b] === OPEN);
      if (spots.length < 2) continue;
      let changed = false;
      for (const x of around[spots[0]]) {
        if (grid[x] !== OPEN || spots.includes(x)) continue;
        if (!spots.every((s) => around[s].includes(x))) continue;
        grass(x);
        changed = true;
      }
      if (changed) return true;
    }
    return false;
  };

  /**
   * Depths 3 and 4: every way one line's missing tents could still be placed.
   * A cell that holds a tent in all of them is a tent; one that holds a tent
   * in none is grass; and a cell in the next line over is grass if every
   * arrangement puts a tent against it. With `tight`, only lines that need as
   * many tents as they can possibly hold are looked at: the case a person
   * spots first.
   */
  const arranging = (limit: number, tight: boolean): boolean => {
    for (let line = 0; line < lines.length; line++) {
      const need = clue[line] - placed[line];
      if (need <= 0 || !open[line]) continue;
      const cells = lines[line];
      const spots: number[] = [];
      for (let k = 0; k < cells.length; k++) if (grid[cells[k]] === OPEN) spots.push(k);
      const m = spots.length;
      // After taking spot k, the next one that does not touch it.
      const after = (k: number) => (k + 1 < m && spots[k + 1] === spots[k] + 1 ? k + 2 : k + 1);

      // count[k][j]: the ways to place j tents in spots k onwards. fits[k]: the most that fit there.
      const count: number[][] = Array.from({ length: m + 2 }, () => new Array<number>(need + 1).fill(0));
      const fits = new Array<number>(m + 2).fill(0);
      count[m][0] = count[m + 1][0] = 1;
      for (let k = m - 1; k >= 0; k--) {
        fits[k] = Math.max(fits[k + 1], 1 + fits[after(k)]);
        count[k][0] = 1;
        for (let j = 1; j <= need; j++) count[k][j] = count[k + 1][j] + count[after(k)][j - 1];
      }
      const total = count[0][need];
      if (total === 0) {
        broken = true;
        continue;
      }
      if (total > limit || (tight && fits[0] !== need)) continue;

      // Each arrangement as a set of positions along the line, one bit each.
      const found: number[] = [];
      const walk = (k: number, left: number, mask: number) => {
        if (left === 0) {
          found.push(mask);
          return;
        }
        if (k >= m || fits[k] < left) return;
        walk(after(k), left - 1, mask | (1 << spots[k]));
        walk(k + 1, left, mask);
      };
      walk(0, need, 0);

      let always = -1;
      let ever = 0;
      for (const mask of found) {
        always &= mask;
        ever |= mask;
      }
      const tents: number[] = [];
      const grasses: number[] = [];
      for (const k of spots) {
        if (always & (1 << k)) tents.push(cells[k]);
        else if (!(ever & (1 << k))) grasses.push(cells[k]);
      }
      // The same position in the line before and the line after this one.
      const row = line < h;
      const step = row ? w : 1;
      const first = row ? line > 0 : line - h > 0;
      const last = row ? line < h - 1 : line - h < w - 1;
      for (let k = 0; k < cells.length; k++) {
        const near = (7 << k) >> 1;
        if (!found.every((mask) => mask & near)) continue;
        if (first && grid[cells[k] - step] === OPEN) grasses.push(cells[k] - step);
        if (last && grid[cells[k] + step] === OPEN) grasses.push(cells[k] + step);
      }
      if (!tents.length && !grasses.length) continue;
      for (const i of tents) tent(i);
      for (const i of grasses) grass(i);
      return true;
    }
    return false;
  };

  const steps = [0, 0, 0, 0, 0];
  // A cell with no tree beside it can never hold a tent.
  for (let i = 0; i < n; i++) {
    if (grid[i] === OPEN && !beside[i].some((b) => grid[b] === TREE)) grass(i);
  }
  let deepest = 1;
  while (!broken) {
    let used = 0;
    if (counting()) used = 1;
    else if (depth >= 2 && pairing()) used = 2;
    else if (depth >= 3 && (corner() || arranging(tuning.tightWays, true))) used = 3;
    else if (depth >= 4 && arranging(ways, false)) used = 4;
    if (!used) break;
    steps[used]++;
    deepest = Math.max(deepest, used);
  }

  const tents: number[] = [];
  let left = 0;
  for (let i = 0; i < n; i++) {
    if (grid[i] === TENT) tents.push(i);
    else if (grid[i] === OPEN) left++;
  }
  const met = clue.every((want, line) => placed[line] === want);
  return { solved: !broken && left === 0 && met && paired(p, tents), tents, depth: deepest, steps };
}

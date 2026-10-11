// Makes a Bridges puzzle from a seed, aimed at a difficulty level. A map is
// built by growing bridges outward from one island, which gives the islands
// and one way of joining them. Its numbers rarely make a good puzzle as they
// stand, so the bridges are then changed one link at a time, keeping each
// change that brings the puzzle closer to what is wanted: first to a puzzle
// the solver can finish at all, then to one that takes the right amount of
// reasoning. A puzzle that solver finishes needs no guessing and has one
// solution.

import { random, type Random } from '../../kit/random';
import { MOST, linksOf, type BridgesPuzzle, type Island, type Link } from './rules';
import { TOP_TIER, shapeOf, solveShape, type Shape } from './solve';
import { tuning } from './tuning';

const fraction = (level: number) => Math.min(1, Math.max(0, level / 100));

export function sizeFor(level: number): { cols: number; rows: number } {
  const { smallest, largest } = tuning;
  return {
    cols: Math.round(smallest.cols + fraction(level) * (largest.cols - smallest.cols)),
    rows: Math.round(smallest.rows + fraction(level) * (largest.rows - smallest.rows)),
  };
}

/** How much reasoning a puzzle of this level should take. */
export const effortFor = (level: number) => Math.round(tuning.topEffort * fraction(level) ** 2);

/** The deepest kind of deduction a puzzle of this level may need. */
export const tierFor = (level: number) => (level < tuning.whatIfFrom ? 1 : TOP_TIER);

/** How much reasoning a solve took. */
export const effort = (steps: number[]) => steps[1] + tuning.whatIfWeight * steps[2];

/** Difficulty from 0 to 100: half from the size of the grid, half from the reasoning needed. */
export function score(cols: number, rows: number, steps: number[]): number {
  const { smallest, largest } = tuning;
  const least = smallest.cols * smallest.rows;
  const size = (cols * rows - least) / (largest.cols * largest.rows - least);
  const depth = Math.sqrt(Math.min(1, effort(steps) / tuning.topEffort));
  return Math.round(50 * Math.min(1, Math.max(0, size)) + 50 * depth);
}

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

interface Chart {
  /** In reading order, numbers not yet worked out. */
  islands: Island[];
  links: Link[];
  /** The bridges the builder laid, by link. */
  bridges: number[];
}

/**
 * Grows a map: from a random island, a bridge is run in a random direction
 * to a new island, or to one already standing there, over and over until
 * the map is full.
 */
function build(rng: Random, cols: number, rows: number): Chart {
  const EMPTY = -1;
  const BRIDGE = -2;
  /** What is on each cell: EMPTY, BRIDGE, or the number of the island there. */
  const grid = new Int16Array(cols * rows).fill(EMPTY);
  const spots: number[] = [];
  const built = new Map<number, number>();
  const pair = (p: number, q: number) => Math.min(p, q) * cols * rows + Math.max(p, q);
  const want = Math.round(cols * rows * tuning.crowding);
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < cols && y < rows ? grid[y * cols + x] : BRIDGE);
  // Islands never sit side by side: there would be no room to draw a bridge between them.
  const lonely = (x: number, y: number) => STEPS.every(([dx, dy]) => at(x + dx, y + dy) < 0);
  const put = (cell: number) => {
    grid[cell] = spots.length;
    spots.push(cell);
  };

  put(rng.int(cols * rows));
  for (let misses = 0; spots.length < want && misses < tuning.patience; ) {
    const from = spots[rng.int(spots.length)];
    const [dx, dy] = STEPS[rng.int(4)];
    const fx = from % cols;
    const fy = Math.floor(from / cols);
    let free = 0;
    while (at(fx + dx * (free + 1), fy + dy * (free + 1)) === EMPTY) free++;
    const hit = at(fx + dx * (free + 1), fy + dy * (free + 1));
    let to = -1;
    let reach = 0;
    if (hit >= 0 && free >= 1 && !built.has(pair(from, spots[hit])) && rng.next() < tuning.loops) {
      to = spots[hit];
      reach = free + 1;
    } else {
      const places: number[] = [];
      for (let d = 2; d <= free; d++) if (lonely(fx + dx * d, fy + dy * d)) places.push(d);
      if (!places.length) {
        misses++;
        continue;
      }
      // The nearer of two random places: short bridges leave room for more islands.
      reach = places[Math.min(rng.int(places.length), rng.int(places.length))];
      to = (fy + dy * reach) * cols + fx + dx * reach;
      put(to);
    }
    misses = 0;
    for (let d = 1; d < reach; d++) grid[(fy + dy * d) * cols + fx + dx * d] = BRIDGE;
    built.set(pair(from, to), rng.next() < tuning.doubles ? MOST : 1);
  }

  const cells = [...spots].sort((p, q) => p - q);
  const islands = cells.map((cell) => ({ x: cell % cols, y: Math.floor(cell / cols), need: 0 }));
  const links = linksOf(islands);
  return { islands, links, bridges: links.map((link) => built.get(pair(cells[link.a], cells[link.b])) ?? 0) };
}

/** Whether these bridges join every island into one group. */
function whole(shape: Shape, bridges: number[]): boolean {
  const seen = new Uint8Array(shape.around.length);
  const todo = [0];
  seen[0] = 1;
  let size = 0;
  while (todo.length) {
    const i = todo.pop()!;
    size++;
    for (const l of shape.around[i]) {
      const j = shape.a[l] === i ? shape.b[l] : shape.a[l];
      if (bridges[l] && !seen[j]) {
        seen[j] = 1;
        todo.push(j);
      }
    }
  }
  return size === seen.length;
}

interface Tuned {
  bridges: number[];
  needs: number[];
  solved: boolean;
  steps: number[];
}

/**
 * Changes the bridges on a map, one link at a time, until the puzzle their
 * numbers make can be solved with deductions up to `maxTier` and takes about
 * `want` effort, or until `budget` runs out.
 */
function tune(rng: Random, chart: Chart, maxTier: number, want: number, budget: number): Tuned {
  const shape = shapeOf(chart.islands, chart.links);
  let spent = 0;
  const judge = (bridges: number[]) => {
    const needs = shape.around.map((links) => links.reduce((sum, l) => sum + bridges[l], 0));
    const result = solveShape(shape, needs, maxTier);
    spent += result.work;
    return { bridges, needs, solved: result.solved, steps: result.steps, unknown: result.bridges.filter((n) => n < 0).length };
  };
  const off = (t: { steps: number[] }) => Math.abs(effort(t.steps) - want);

  let best = judge(chart.bridges);
  while (spent < budget && !(best.solved && off(best) <= tuning.nearEnough)) {
    const l = rng.int(chart.links.length);
    const n = (best.bridges[l] + 1 + rng.int(MOST)) % (MOST + 1);
    // The changed bridges must still be a proper solution: nothing crossing, all one group.
    if (n && !best.bridges[l] && shape.cross[l].some((c) => best.bridges[c])) continue;
    const bridges = best.bridges.map((old, i) => (i === l ? n : old));
    if (!n && !whole(shape, bridges)) continue;
    const next = judge(bridges);
    // Until the solver can finish it, fewer links left in doubt is progress;
    // after that, staying solvable and coming nearer the effort wanted is.
    // A change that is no worse is kept too, so the search can wander off a plateau.
    const keep = best.solved ? next.solved && off(next) <= off(best) : next.unknown <= best.unknown;
    if (keep) best = next;
  }
  return best;
}

export function generate(seed: number, target: number): BridgesPuzzle {
  const rng = random(seed);
  const { cols, rows } = sizeFor(target);
  const want = effortFor(target);
  let best: BridgesPuzzle | null = null;
  let bestOff = Infinity;
  for (let n = 0; n < tuning.maps && bestOff > tuning.nearEnough; n++) {
    const chart = build(rng, cols, rows);
    const tuned = tune(rng, chart, tierFor(target), want, tuning.workPerMap);
    const off = Math.abs(effort(tuned.steps) - want);
    if (!tuned.solved || off >= bestOff) continue;
    bestOff = off;
    best = {
      seed,
      score: score(cols, rows, tuned.steps),
      cols,
      rows,
      islands: chart.islands.map((island, i) => ({ ...island, need: tuned.needs[i] })),
      links: chart.links,
      solution: tuned.bridges,
    };
  }
  // Not one map could be made solvable: almost unheard of, but another seed will do it.
  return best ?? { ...generate(seed + 1, target), seed };
}

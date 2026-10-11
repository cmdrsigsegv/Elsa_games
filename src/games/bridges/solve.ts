// Solves a Bridges puzzle the way a person does: by deductions that are
// certain, never by guessing. The generator keeps a puzzle only if this
// solver finishes it, which means the puzzle has one solution and that
// solution can be reasoned out.
//
// For every link the solver keeps the fewest and the most bridges it could
// still have. Deductions only ever raise the fewest or lower the most, and
// the puzzle is solved when the two meet on every link.
//
// The deductions come in three tiers, easiest first:
//   0  counting   an island's number against what its links can still carry,
//                 and no bridge through a bridge that is certain;
//   1  joining    no group of islands may close itself off from the rest, and
//                 the only way through to part of the map must be bridged;
//   2  what-if    suppose a link takes one of its extreme values, follow the
//                 tiers above, and if that cannot be, rule the value out.

import { MOST, crosses, type Island, type Link } from './rules';

export const TOP_TIER = 2;

/** The map in the form the solver works on: who touches what. */
export interface Shape {
  a: number[];
  b: number[];
  /** For each island, its links. */
  around: number[][];
  /** For each link, the links it would cross. */
  cross: number[][];
}

/** A map with its islands' numbers. */
interface Numbered extends Shape {
  needs: number[];
}

export function shapeOf(islands: { x: number; y: number }[], links: Link[]): Shape {
  const around: number[][] = islands.map(() => []);
  links.forEach((link, i) => {
    around[link.a].push(i);
    around[link.b].push(i);
  });
  const cross = links.map((p, i) => links.flatMap((q, j) => (i !== j && crosses(islands, p, q) ? [j] : [])));
  return { a: links.map((l) => l.a), b: links.map((l) => l.b), around, cross };
}

/** Tier 0, repeated until it finds nothing more. False if the numbers cannot be met. */
function count(s: Numbered, lo: Int8Array, hi: Int8Array): boolean {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < s.needs.length; i++) {
      let sumLo = 0;
      let sumHi = 0;
      for (const l of s.around[i]) {
        sumLo += lo[l];
        sumHi += hi[l];
      }
      if (sumLo > s.needs[i] || sumHi < s.needs[i]) return false;
      for (const l of s.around[i]) {
        // If the other links carried all they could, this one must carry the rest.
        const least = s.needs[i] - (sumHi - hi[l]);
        if (least > lo[l]) {
          sumLo += least - lo[l];
          lo[l] = least;
          changed = true;
        }
        // And it can carry no more than what the others leave over.
        const most = s.needs[i] - (sumLo - lo[l]);
        if (most < hi[l]) {
          sumHi -= hi[l] - most;
          hi[l] = most;
          changed = true;
        }
      }
    }
    for (let l = 0; l < lo.length; l++) {
      if (!lo[l]) continue;
      for (const c of s.cross[l]) {
        if (lo[c]) return false;
        if (hi[c]) {
          hi[c] = 0;
          changed = true;
        }
      }
    }
  }
  return true;
}

/**
 * Whether giving link `l` its most bridges would finish off a group of
 * islands, all with their numbers met, that is not the whole map. Such a
 * group could never be joined to the rest.
 */
function closes(s: Numbered, lo: Int8Array, hi: Int8Array, l: number): boolean {
  const seen = new Uint8Array(s.needs.length);
  const todo = [s.a[l]];
  seen[s.a[l]] = 1;
  let size = 0;
  while (todo.length) {
    const i = todo.pop()!;
    size++;
    let sum = 0;
    for (const k of s.around[i]) sum += k === l ? hi[l] : lo[k];
    if (sum !== s.needs[i]) return false;
    for (const k of s.around[i]) {
      if (!(k === l ? hi[l] : lo[k])) continue;
      const j = s.a[k] === i ? s.b[k] : s.a[k];
      if (!seen[j]) {
        seen[j] = 1;
        todo.push(j);
      }
    }
  }
  return size < s.needs.length;
}

/** One tier 1 deduction. 1 if it found one, 0 if there is none, -1 if the islands can no longer all be joined. */
function join(s: Numbered, lo: Int8Array, hi: Int8Array): number {
  // Walk the map along every link that could still hold a bridge. A link
  // with no other way round it is the only road to what lies beyond, so it
  // needs a bridge.
  const n = s.needs.length;
  const order = new Int16Array(n).fill(-1);
  const low = new Int16Array(n);
  let clock = 0;
  let found = false;
  const visit = (i: number, via: number) => {
    order[i] = low[i] = clock++;
    for (const l of s.around[i]) {
      if (l === via || !hi[l]) continue;
      const j = s.a[l] === i ? s.b[l] : s.a[l];
      if (order[j] >= 0) {
        low[i] = Math.min(low[i], order[j]);
        continue;
      }
      visit(j, l);
      low[i] = Math.min(low[i], low[j]);
      if (low[j] > order[i] && !lo[l]) {
        lo[l] = 1;
        found = true;
      }
    }
  };
  visit(0, -1);
  if (clock < n) return -1;
  if (found) return 1;

  for (let l = 0; l < lo.length; l++) {
    if (lo[l] < hi[l] && closes(s, lo, hi, l)) {
      hi[l]--;
      return 1;
    }
  }
  return 0;
}

/** Tiers 0 and 1 until they find nothing more. False if the position cannot be completed. */
function settle(s: Numbered, lo: Int8Array, hi: Int8Array): boolean {
  for (;;) {
    if (!count(s, lo, hi)) return false;
    const found = join(s, lo, hi);
    if (found < 0) return false;
    if (!found) return true;
  }
}

/**
 * One tier 2 deduction: the first extreme value of a link that turns out to
 * be impossible is ruled out. Looks from link `from` onwards and round again,
 * and returns the link it settled something about, or -1 if it found nothing.
 */
function whatIf(s: Numbered, lo: Int8Array, hi: Int8Array, from: number, tally: { work: number }): number {
  for (let k = 0; k < lo.length; k++) {
    const l = (from + k) % lo.length;
    if (lo[l] === hi[l]) continue;
    for (const high of [true, false]) {
      const tryLo = lo.slice();
      const tryHi = hi.slice();
      if (high) tryLo[l] = hi[l];
      else tryHi[l] = lo[l];
      tally.work++;
      if (settle(s, tryLo, tryHi)) continue;
      if (high) hi[l]--;
      else lo[l]++;
      return l;
    }
  }
  return -1;
}

export interface Solved {
  solved: boolean;
  /** The bridges on each link, where the solver got that far; -1 where it could not tell. */
  bridges: number[];
  /** How many deductions of each tier it needed, cheaper tiers always tried first. */
  steps: number[];
  /** How many what-ifs it tried, fruitful or not: a measure of the time it took. */
  work: number;
}

/** Solves a prepared map, given its numbers, as far as the tiers up to `maxTier` will go. */
export function solveShape(shape: Shape, needs: number[], maxTier = TOP_TIER): Solved {
  const s: Numbered = { ...shape, needs };
  const lo = new Int8Array(s.a.length);
  const hi = new Int8Array(s.a.length).fill(MOST);
  const steps = [0, 0, 0];
  const tally = { work: 1 };
  let sound = true;
  // Where the last what-if paid off: the next one starts looking there, as a person would.
  let near = 0;
  for (;;) {
    sound = count(s, lo, hi);
    if (!sound) break;
    if (maxTier >= 1) {
      const found = join(s, lo, hi);
      sound = found >= 0;
      if (!sound) break;
      if (found) {
        steps[1]++;
        continue;
      }
    }
    if (maxTier < 2) break;
    near = whatIf(s, lo, hi, near, tally);
    if (near < 0) break;
    steps[2]++;
  }
  const settled = sound && lo.every((n, l) => n === hi[l]);
  // Counting alone never looks at joining, so the last word is a walk over the finished bridges.
  const whole = settled && join(s, lo, lo) >= 0;
  return { solved: whole, bridges: Array.from(lo, (n, l) => (n === hi[l] ? n : -1)), steps, work: tally.work };
}

export function solve(islands: Island[], links: Link[], maxTier = TOP_TIER): Solved {
  return solveShape(shapeOf(islands, links), islands.map((island) => island.need), maxTier);
}

/**
 * Counts solutions by trying everything, stopping at `limit`. It shares no
 * reasoning with the solver above, so the tests use it to check that solver's
 * claim of a single solution. Far too slow to use while generating.
 */
export function countSolutions(islands: Island[], links: Link[], limit = 2): number {
  const n = islands.length;
  const value = links.map(() => 0);
  const sum = islands.map(() => 0);
  /** How many of each island's links have not been tried yet. */
  const open = islands.map(() => 0);
  for (const link of links) {
    open[link.a]++;
    open[link.b]++;
  }
  const cross = links.map((p, i) => links.flatMap((q, j) => (j < i && crosses(islands, p, q) ? [j] : [])));
  const fits = (i: number) => sum[i] <= islands[i].need && sum[i] + MOST * open[i] >= islands[i].need;

  // A finished group smaller than the map: every island in it has all its
  // links decided. Seen early, it saves trying everything else around it.
  const sealed = (from: number, upTo: number): boolean => {
    const seen = new Uint8Array(n);
    const todo = [from];
    seen[from] = 1;
    let size = 0;
    while (todo.length) {
      const i = todo.pop()!;
      if (open[i]) return false;
      size++;
      for (let l = 0; l <= upTo; l++) {
        if (!value[l] || (links[l].a !== i && links[l].b !== i)) continue;
        const j = links[l].a === i ? links[l].b : links[l].a;
        if (!seen[j]) {
          seen[j] = 1;
          todo.push(j);
        }
      }
    }
    return size < n;
  };

  let found = 0;
  const search = (l: number) => {
    if (l === links.length) {
      found++;
      return;
    }
    const { a, b } = links[l];
    open[a]--;
    open[b]--;
    for (let v = 0; v <= MOST && found < limit; v++) {
      if (v && cross[l].some((c) => value[c])) break;
      value[l] = v;
      sum[a] += v;
      sum[b] += v;
      if (fits(a) && fits(b) && !sealed(a, l) && !sealed(b, l)) search(l + 1);
      sum[a] -= v;
      sum[b] -= v;
    }
    value[l] = 0;
    open[a]++;
    open[b]++;
  };
  search(0);
  return found;
}

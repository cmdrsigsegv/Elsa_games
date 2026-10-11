// The arrow puzzle: a knot of bent arrows packed tight together. Tapping an
// arrow sends it forward, head first, its body following its own path. It
// slides until it meets another arrow and stops there; if nothing is in its
// way it slides right off the board. The goal is to clear the board.
//
// Because a stopped arrow stays where it stopped, the order matters: an
// arrow nudged forward at the wrong time can come to rest across another's
// way out and lock the knot for good. Every function here is pure.

/** Directions an arrow's head can point: up, right, down, left. */
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

export interface Arrow {
  /** The cells it starts on, tail first, head last. */
  cells: number[];
  /** Which way the head points: an index into DX / DY. */
  dir: number;
}

export interface ArrowsPuzzle {
  seed: number;
  score: number;
  w: number;
  h: number;
  arrows: Arrow[];
  /** The cells that are part of the board; it need not be a rectangle. */
  cells: number[];
}

export interface ArrowsState {
  /** How many cells each arrow has slid forward from where it started. */
  slid: number[];
  /** For each arrow, whether it has left the board. */
  gone: boolean[];
  moves: number;
}

export interface ArrowsMove {
  arrow: number;
}

/** The cells in a straight line from `cell` to the edge of the board, nearest first. */
export function ray(w: number, h: number, cell: number, dir: number): number[] {
  const out: number[] = [];
  let x = (cell % w) + DX[dir];
  let y = Math.floor(cell / w) + DY[dir];
  while (x >= 0 && y >= 0 && x < w && y < h) {
    out.push(y * w + x);
    x += DX[dir];
    y += DY[dir];
  }
  return out;
}

export const head = (a: Arrow) => a.cells[a.cells.length - 1];

// Roads are worked out once per arrow and kept: the search asks for them millions of times.
const roads = new WeakMap<Arrow, number[]>();

/** An arrow's whole road: the cells it starts on, then the straight line ahead of its head to the edge. */
export function track(p: ArrowsPuzzle, a: Arrow): number[] {
  let road = roads.get(a);
  if (!road) roads.set(a, (road = [...a.cells, ...ray(p.w, p.h, head(a), a.dir)]));
  return road;
}

/** The cells an arrow lies on now. */
export function lying(p: ArrowsPuzzle, s: ArrowsState, i: number): number[] {
  const a = p.arrows[i];
  return track(p, a).slice(s.slid[i], s.slid[i] + a.cells.length);
}

/** Which arrow lies on each cell, or -1; arrows that have gone are left out. */
export function owners(p: ArrowsPuzzle, s: ArrowsState): Int16Array {
  const owner = new Int16Array(p.w * p.h).fill(-1);
  p.arrows.forEach((a, i) => {
    if (s.gone[i]) return;
    const road = track(p, a);
    for (let k = 0; k < a.cells.length; k++) owner[road[s.slid[i] + k]] = i;
  });
  return owner;
}

/**
 * What tapping an arrow does: how many cells it slides, whether it leaves
 * the board, and which arrow stops it (-1 if none).
 */
export function slide(p: ArrowsPuzzle, s: ArrowsState, i: number, owner = owners(p, s)): { by: number; leaves: boolean; into: number } {
  const a = p.arrows[i];
  const road = track(p, a);
  let at = s.slid[i] + a.cells.length - 1; // where the head is along the road
  let by = 0;
  while (at + 1 < road.length && owner[road[at + 1]] < 0) {
    at++;
    by++;
  }
  const leaves = at + 1 === road.length;
  return { by, leaves, into: leaves ? -1 : owner[road[at + 1]] };
}

export function start(p: ArrowsPuzzle): ArrowsState {
  return { slid: p.arrows.map(() => 0), gone: p.arrows.map(() => false), moves: 0 };
}

/** Returns the same state object when the arrow cannot move. */
export function apply(p: ArrowsPuzzle, s: ArrowsState, m: ArrowsMove): ArrowsState {
  if (m.arrow < 0 || m.arrow >= p.arrows.length || s.gone[m.arrow]) return s;
  const { by, leaves } = slide(p, s, m.arrow);
  if (!leaves && by === 0) return s;
  return {
    slid: s.slid.map((n, i) => (i === m.arrow ? n + by : n)),
    gone: s.gone.map((g, i) => g || (i === m.arrow && leaves)),
    moves: s.moves + 1,
  };
}

export function status(_p: ArrowsPuzzle, s: ArrowsState): { ended: boolean } {
  return { ended: s.gone.every(Boolean) };
}

/** The arrows that would move if tapped. */
export function movable(p: ArrowsPuzzle, s: ArrowsState): number[] {
  const owner = owners(p, s);
  return p.arrows.map((_, i) => i).filter((i) => !s.gone[i] && (({ by, leaves }) => leaves || by > 0)(slide(p, s, i, owner)));
}

export interface Solved {
  /** A sequence of taps that clears the board, or null if there is none. */
  way: number[] | null;
  /** True when the search ran out of room before it could be sure. */
  gaveUp: boolean;
  /** How many positions the search looked at. */
  visited: number;
  /**
   * How many times, along that way, a different arrow could also have been
   * tapped that would have locked the knot for good.
   */
  traps: number;
}

/** Searches for a way to clear the board from a position. */
export function solve(p: ArrowsPuzzle, from: ArrowsState, limit = 40_000): Solved {
  const can = new Map<string, boolean>();
  let visited = 0;
  let gaveUp = false;
  const key = (s: ArrowsState) => s.slid.map((n, i) => (s.gone[i] ? 'x' : n)).join();
  const next = new Map<string, number>();

  const clearable = (s: ArrowsState): boolean => {
    if (s.gone.every(Boolean)) return true;
    const k = key(s);
    const known = can.get(k);
    if (known !== undefined) return known;
    if (++visited > limit) {
      gaveUp = true;
      return false;
    }
    can.set(k, false); // sliding only goes forward, so no position comes round again
    // Arrows that leave are tried first: they are usually part of the answer.
    const owner = owners(p, s);
    const moves = movable(p, s).sort((a, b) => Number(slide(p, s, b, owner).leaves) - Number(slide(p, s, a, owner).leaves));
    for (const i of moves) {
      if (clearable(apply(p, s, { arrow: i }))) {
        can.set(k, true);
        next.set(k, i);
        return true;
      }
    }
    return false;
  };

  if (!clearable(from)) return { way: null, gaveUp, visited, traps: 0 };
  const way: number[] = [];
  let traps = 0;
  for (let s = from; !s.gone.every(Boolean); ) {
    const i = next.get(key(s))!;
    for (const other of movable(p, s)) {
      if (other !== i && !clearable(apply(p, s, { arrow: other })) && !gaveUp) traps++;
    }
    way.push(i);
    s = apply(p, s, { arrow: i });
  }
  return { way, gaveUp, visited, traps };
}

/**
 * Whether the board can be cleared the easy way: only ever tapping an arrow
 * whose way out is already clear. A knot that cannot be undone like that
 * needs some arrows nudged forward first to make room.
 */
export function clearsWithoutNudging(p: ArrowsPuzzle): { cleared: boolean; stuck: number[] } {
  let s = start(p);
  for (;;) {
    const owner = owners(p, s);
    const free = p.arrows.map((_, i) => i).filter((i) => !s.gone[i] && slide(p, s, i, owner).leaves);
    if (!free.length) break;
    s = { ...s, gone: s.gone.map((g, i) => g || free.includes(i)) };
  }
  return { cleared: s.gone.every(Boolean), stuck: p.arrows.map((_, i) => i).filter((i) => !s.gone[i]) };
}

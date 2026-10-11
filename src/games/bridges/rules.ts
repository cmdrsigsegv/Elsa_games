// Bridges (Hashiwokakero): numbered islands on a grid, to be joined by
// bridges. Every island must end up with exactly its number of bridges.
// Bridges run straight, across or down, between islands that face each other
// with nothing in between; there are at most two between a pair; they never
// cross; and in the end every island can be reached from every other.
// Every function here is pure.

export interface Island {
  x: number;
  y: number;
  /** How many bridges it must have. */
  need: number;
}

/**
 * Two islands that face each other, so a bridge could join them. `a` is the
 * one on the left, or on top.
 */
export interface Link {
  a: number;
  b: number;
}

export interface BridgesPuzzle {
  seed: number;
  score: number;
  cols: number;
  rows: number;
  /** In reading order: row by row, left to right. */
  islands: Island[];
  /** Every pair of facing islands. Worked out from the islands, and kept so nobody has to work it out again. */
  links: Link[];
  /** How many bridges each link has in the one solution. */
  solution: number[];
}

export interface BridgesState {
  /** How many bridges she has put on each link: 0, 1 or 2. */
  bridges: number[];
}

/** One tap on a link: none, one, two, and round again. */
export interface BridgesMove {
  link: number;
}

/** The most bridges a pair of islands may share. */
export const MOST = 2;

/** Every pair of islands that face each other: each island with the next one to its right, and the next one below. */
export function linksOf(islands: { x: number; y: number }[]): Link[] {
  const links: Link[] = [];
  islands.forEach((from, a) => {
    let right = -1;
    let below = -1;
    islands.forEach((to, b) => {
      if (to.y === from.y && to.x > from.x && (right < 0 || to.x < islands[right].x)) right = b;
      if (to.x === from.x && to.y > from.y && (below < 0 || to.y < islands[below].y)) below = b;
    });
    if (right >= 0) links.push({ a, b: right });
    if (below >= 0) links.push({ a, b: below });
  });
  return links;
}

export const across = (islands: { x: number; y: number }[], link: Link) => islands[link.a].y === islands[link.b].y;

/** Whether bridges on these two links would cross. Only one going across and one going down can. */
export function crosses(islands: { x: number; y: number }[], p: Link, q: Link): boolean {
  if (across(islands, p) === across(islands, q)) return false;
  const [h, v] = across(islands, p) ? [p, q] : [q, p];
  const row = islands[h.a].y;
  const col = islands[v.a].x;
  return islands[h.a].x < col && col < islands[h.b].x && islands[v.a].y < row && row < islands[v.b].y;
}

/** Whether a bridge already built stands in the way of this link. */
export function blocked(p: BridgesPuzzle, bridges: number[], link: number): boolean {
  return p.links.some((other, j) => j !== link && bridges[j] > 0 && crosses(p.islands, p.links[link], other));
}

/** How many bridges each island has. */
export function counts(p: BridgesPuzzle, bridges: number[]): number[] {
  const have = p.islands.map(() => 0);
  p.links.forEach((link, i) => {
    have[link.a] += bridges[i];
    have[link.b] += bridges[i];
  });
  return have;
}

/** Whether every island can be reached from the first by walking over bridges. */
export function joined(p: BridgesPuzzle, bridges: number[]): boolean {
  const reached = p.islands.map(() => false);
  const todo = [0];
  reached[0] = true;
  while (todo.length) {
    const at = todo.pop()!;
    p.links.forEach((link, i) => {
      if (!bridges[i] || (link.a !== at && link.b !== at)) return;
      const other = link.a === at ? link.b : link.a;
      if (reached[other]) return;
      reached[other] = true;
      todo.push(other);
    });
  }
  return reached.every(Boolean);
}

/** Solved: every island has its number, and they are all one group. Crossings cannot be built, so need no check. */
export function solved(p: BridgesPuzzle, bridges: number[]): boolean {
  return counts(p, bridges).every((have, i) => have === p.islands[i].need) && joined(p, bridges);
}

export function start(p: BridgesPuzzle): BridgesState {
  return { bridges: p.links.map(() => 0) };
}

/** Returns the same state object when the move changes nothing. */
export function apply(p: BridgesPuzzle, s: BridgesState, m: BridgesMove): BridgesState {
  const now = s.bridges[m.link];
  if (now === undefined) return s;
  // A first bridge cannot go through one that is already there. Too many
  // bridges on an island is allowed: it shows as a warning, and is hers to fix.
  if (now === 0 && blocked(p, s.bridges, m.link)) return s;
  return { bridges: s.bridges.map((n, i) => (i === m.link ? (n + 1) % (MOST + 1) : n)) };
}

export function status(p: BridgesPuzzle, s: BridgesState): { ended: boolean } {
  return { ended: solved(p, s.bridges) };
}

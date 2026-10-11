// Tents and Trees: a grid with trees on some cells. Every tree gets one tent
// of its own in a cell beside it (up, down, left or right), no two tents
// touch, not even at a corner, and the numbers beside the grid say how many
// tents each row and column holds. Every function here is pure.

/** What she can put in a cell. A tree's cell is always EMPTY in the state: trees live in the puzzle. */
export const EMPTY = 0;
export const TENT = 1;
/** Her note that no tent goes here. */
export const GRASS = 2;

export interface TentsPuzzle {
  seed: number;
  /** Difficulty, 0 to 100. */
  score: number;
  w: number;
  h: number;
  /** 1 where a tree stands, 0 elsewhere; row by row. */
  trees: number[];
  /** How many tents each row and each column holds. */
  rows: number[];
  cols: number[];
}

export interface TentsState {
  /** Per cell: EMPTY, TENT or GRASS. */
  cells: number[];
  /** How many taps and strokes have been made so far. */
  moves: number;
}

/** One tap or stroke: a list of [cell, new value]. A drag across several cells is one move. */
export interface TentsMove {
  changes: [number, number][];
}

type Size = Pick<TentsPuzzle, 'w' | 'h'>;

/** The cells sharing a side with a cell. */
export function beside(p: Size, cell: number): number[] {
  const r = Math.floor(cell / p.w);
  const c = cell % p.w;
  const out: number[] = [];
  if (r > 0) out.push(cell - p.w);
  if (c > 0) out.push(cell - 1);
  if (c < p.w - 1) out.push(cell + 1);
  if (r < p.h - 1) out.push(cell + p.w);
  return out;
}

/** The cells sharing a side or a corner with a cell. */
export function around(p: Size, cell: number): number[] {
  const r = Math.floor(cell / p.w);
  const c = cell % p.w;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      if (r + dr < 0 || r + dr >= p.h || c + dc < 0 || c + dc >= p.w) continue;
      out.push(cell + dr * p.w + dc);
    }
  }
  return out;
}

export function start(p: TentsPuzzle): TentsState {
  return { cells: new Array<number>(p.w * p.h).fill(EMPTY), moves: 0 };
}

/** Returns the same state object when the move changes nothing. Trees cannot be marked. */
export function apply(p: TentsPuzzle, s: TentsState, m: TentsMove): TentsState {
  const changes = m.changes.filter(
    ([cell, to]) => cell >= 0 && cell < s.cells.length && !p.trees[cell] && s.cells[cell] !== to && to >= EMPTY && to <= GRASS,
  );
  if (!changes.length) return s;
  const cells = [...s.cells];
  for (const [cell, to] of changes) cells[cell] = to;
  return { cells, moves: s.moves + 1 };
}

/** A tap steps a cell round: empty, tent, grass, empty. */
export function tap(p: TentsPuzzle, s: TentsState, cell: number): TentsMove {
  if (p.trees[cell]) return { changes: [] };
  return { changes: [[cell, (s.cells[cell] + 1) % 3]] };
}

/**
 * A finger dragged over these cells. It marks the empty ones as grass, or,
 * when the drag began on grass, clears the grass again. Tents are left alone
 * either way, so a careless drag never loses one.
 */
export function sweep(p: TentsPuzzle, s: TentsState, cells: number[]): TentsMove {
  if (!cells.length) return { changes: [] };
  const from = s.cells[cells[0]] === GRASS && !p.trees[cells[0]] ? GRASS : EMPTY;
  const to = from === GRASS ? EMPTY : GRASS;
  return { changes: cells.filter((cell) => !p.trees[cell] && s.cells[cell] === from).map((cell) => [cell, to]) };
}

/** How many tents stand in each row and column. */
export function counts(p: TentsPuzzle, s: TentsState): { rows: number[]; cols: number[] } {
  const rows = new Array<number>(p.h).fill(0);
  const cols = new Array<number>(p.w).fill(0);
  s.cells.forEach((value, cell) => {
    if (value !== TENT) return;
    rows[Math.floor(cell / p.w)]++;
    cols[cell % p.w]++;
  });
  return { rows, cols };
}

export type ClueLook = 'open' | 'done' | 'wrong';

/**
 * How each clue should look: done when its line holds the right number of
 * tents, wrong when it holds too many, or when so much of it is grass that
 * there is no longer room for enough. All of it can be seen from the board
 * alone, without knowing the answer.
 */
export function clueLooks(p: TentsPuzzle, s: TentsState): { rows: ClueLook[]; cols: ClueLook[] } {
  const have = counts(p, s);
  const room = { rows: new Array<number>(p.h).fill(0), cols: new Array<number>(p.w).fill(0) };
  s.cells.forEach((value, cell) => {
    if (value !== EMPTY || p.trees[cell]) return;
    room.rows[Math.floor(cell / p.w)]++;
    room.cols[cell % p.w]++;
  });
  const look = (clue: number, tents: number, free: number): ClueLook =>
    tents > clue || tents + free < clue ? 'wrong' : tents === clue ? 'done' : 'open';
  return {
    rows: p.rows.map((clue, r) => look(clue, have.rows[r], room.rows[r])),
    cols: p.cols.map((clue, c) => look(clue, have.cols[c], room.cols[c])),
  };
}

/** Tents that touch another tent, along a side or at a corner. */
export function touchingTents(p: TentsPuzzle, s: TentsState): Set<number> {
  const out = new Set<number>();
  s.cells.forEach((value, cell) => {
    if (value === TENT && around(p, cell).some((n) => s.cells[n] === TENT)) out.add(cell);
  });
  return out;
}

/** Tents with no tree beside them. */
export function strandedTents(p: TentsPuzzle, s: TentsState): Set<number> {
  const out = new Set<number>();
  s.cells.forEach((value, cell) => {
    if (value === TENT && !beside(p, cell).some((n) => p.trees[n])) out.add(cell);
  });
  return out;
}

/**
 * Whether the trees and these tents can be paired off, each tree with a tent
 * beside it and no tent shared. Having a tent next to every tree is not
 * enough: two trees may both be leaning on the same one. So this looks for a
 * real pairing, giving each tree a tent in turn and moving earlier trees to
 * another of their tents when that makes room.
 */
export function paired(p: Size & Pick<TentsPuzzle, 'trees'>, tents: number[]): boolean {
  const trees: number[] = [];
  p.trees.forEach((tree, cell) => {
    if (tree) trees.push(cell);
  });
  if (trees.length !== tents.length) return false;
  const isTent = new Set(tents);
  const treeOf = new Map<number, number>();
  const place = (tree: number, tried: Set<number>): boolean => {
    for (const tent of beside(p, tree)) {
      if (!isTent.has(tent) || tried.has(tent)) continue;
      tried.add(tent);
      const holder = treeOf.get(tent);
      if (holder === undefined || place(holder, tried)) {
        treeOf.set(tent, tree);
        return true;
      }
    }
    return false;
  };
  return trees.every((tree) => place(tree, new Set()));
}

/** The cells holding a tent. */
export const tentsOf = (s: TentsState): number[] => s.cells.flatMap((value, cell) => (value === TENT ? [cell] : []));

/** Every rule kept: the clues met, no tents touching, and each tree with a tent of its own. Grass does not matter. */
export function solved(p: TentsPuzzle, s: TentsState): boolean {
  const have = counts(p, s);
  if (have.rows.some((n, r) => n !== p.rows[r]) || have.cols.some((n, c) => n !== p.cols[c])) return false;
  if (touchingTents(p, s).size) return false;
  return paired(p, tentsOf(s));
}

export function status(p: TentsPuzzle, s: TentsState): { ended: boolean } {
  return { ended: solved(p, s) };
}

/**
 * True when every clue is met and no tent touches another, yet the trees and
 * tents cannot be paired off: the one rule break that marks no single tent.
 */
export function unpaired(p: TentsPuzzle, s: TentsState): boolean {
  const have = counts(p, s);
  if (have.rows.some((n, r) => n !== p.rows[r]) || have.cols.some((n, c) => n !== p.cols[c])) return false;
  return !touchingTents(p, s).size && !paired(p, tentsOf(s));
}

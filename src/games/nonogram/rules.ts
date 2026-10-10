// What the player can do in a nonogram, and what it does to the grid. Every
// function here is pure: it returns a new state and never changes its input.

import type { NonogramPuzzle } from './generate';
import { EMPTY, FILLED, UNKNOWN, clueOf, colCells, rowCells, solveLine } from './lines';
import { tuning } from './tuning';

export interface NonogramState {
  /** Per cell: UNKNOWN, FILLED, or EMPTY (crossed out). */
  cells: number[];
  /** How many strokes have been made so far. */
  moves: number;
  /** For each cell, the value of `moves` when it was last marked; 0 if untouched. */
  order: number[];
}

/** One stroke: a list of [cell, new value]. A drag across several cells is one move. */
export interface NonogramMove {
  changes: [number, number][];
}

export function start(p: NonogramPuzzle): NonogramState {
  const n = p.w * p.h;
  return { cells: new Array<number>(n).fill(UNKNOWN), moves: 0, order: new Array<number>(n).fill(0) };
}

const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** The rows and columns of a puzzle, each as its clue and its cells. */
export function lines(p: NonogramPuzzle): { kind: 'row' | 'column'; index: number; clue: number[]; at: number[] }[] {
  return [
    ...p.rows.map((clue, r) => ({ kind: 'row' as const, index: r, clue, at: rowCells(p, r) })),
    ...p.cols.map((clue, c) => ({ kind: 'column' as const, index: c, clue, at: colCells(p, c) })),
  ];
}

/** Returns the same state object when the move changes nothing. */
export function apply(p: NonogramPuzzle, s: NonogramState, m: NonogramMove): NonogramState {
  const changes = m.changes.filter(([cell, to]) => cell >= 0 && cell < s.cells.length && s.cells[cell] !== to);
  if (!changes.length) return s;
  const cells = [...s.cells];
  const order = [...s.order];
  const moves = s.moves + 1;
  for (const [cell, to] of changes) {
    cells[cell] = to;
    order[cell] = to === UNKNOWN ? 0 : moves;
  }
  if (tuning.autoCross) {
    // A line whose runs now match its clue has no more to fill: cross out the rest.
    const touched = new Set(changes.map(([cell]) => cell));
    for (const line of lines(p)) {
      if (!line.at.some((i) => touched.has(i))) continue;
      if (!same(clueOf(line.at.map((i) => cells[i])), line.clue)) continue;
      for (const i of line.at) {
        if (cells[i] !== UNKNOWN) continue;
        cells[i] = EMPTY;
        order[i] = moves;
      }
    }
  }
  return { cells, moves, order };
}

const isWrong = (p: NonogramPuzzle, cell: number, value: number) =>
  (value === FILLED && !p.solution[cell]) || (value === EMPTY && p.solution[cell] === 1);

/** Cells marked the wrong way, in the order she marked them: the first is where it went wrong. */
export function wrongCells(p: NonogramPuzzle, s: NonogramState): number[] {
  const out: number[] = [];
  s.cells.forEach((value, cell) => {
    if (isWrong(p, cell, value)) out.push(cell);
  });
  // Within one stroke, her own fills come before the crosses they caused.
  return out.sort((a, b) => s.order[a] - s.order[b] || s.cells[a] - s.cells[b]);
}

/** Crosses do not matter: the puzzle is done when exactly the right cells are filled. */
export function status(p: NonogramPuzzle, s: NonogramState): { ended: boolean } {
  return { ended: s.cells.every((value, cell) => (value === FILLED) === (p.solution[cell] === 1)) };
}

export function isMistake(p: NonogramPuzzle, s: NonogramState, m: NonogramMove): boolean {
  return m.changes.some(([cell, to]) => s.cells[cell] !== to && isWrong(p, cell, to));
}

/**
 * The lines that cannot be completed as they are marked. Like a clash in
 * sudoku, this is visible from the board alone, without knowing the answer.
 */
export function impossibleLines(p: NonogramPuzzle, s: NonogramState): { rows: Set<number>; cols: Set<number> } {
  const rows = new Set<number>();
  const cols = new Set<number>();
  for (const line of lines(p)) {
    if (solveLine(line.clue, line.at.map((i) => s.cells[i]))) continue;
    (line.kind === 'row' ? rows : cols).add(line.index);
  }
  return { rows, cols };
}

/** The lines whose filled runs already match their clue. */
export function completeLines(p: NonogramPuzzle, s: NonogramState): { rows: Set<number>; cols: Set<number> } {
  const rows = new Set<number>();
  const cols = new Set<number>();
  for (const line of lines(p)) {
    if (same(clueOf(line.at.map((i) => s.cells[i])), line.clue)) (line.kind === 'row' ? rows : cols).add(line.index);
  }
  return { rows, cols };
}

export type NonogramHint =
  | { kind: 'wrong'; cell: number; move: NonogramMove }
  | { kind: 'line'; line: 'row' | 'column'; index: number; move: NonogramMove };

/** The next thing to look at: a wrong cell if there is one, else the line with the most to give. */
export function hint(p: NonogramPuzzle, s: NonogramState): NonogramHint | null {
  const wrong = wrongCells(p, s);
  if (wrong.length) {
    const cell = wrong[0];
    return { kind: 'wrong', cell, move: { changes: [[cell, p.solution[cell] ? FILLED : EMPTY]] } };
  }
  let best: NonogramHint | null = null;
  for (const line of lines(p)) {
    const now = line.at.map((i) => s.cells[i]);
    const next = solveLine(line.clue, now);
    if (!next) continue;
    const changes: [number, number][] = [];
    line.at.forEach((cell, n) => {
      if (now[n] === UNKNOWN && next[n] !== UNKNOWN) changes.push([cell, next[n]]);
    });
    if (changes.length > (best?.move.changes.length ?? 0)) {
      best = { kind: 'line', line: line.kind, index: line.index, move: { changes } };
    }
  }
  return best;
}

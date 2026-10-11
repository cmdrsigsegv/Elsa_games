// Binairo (also called Takuzu): a square grid to be filled with two kinds of
// circle. No three alike may sit in a line, across or down; every row and
// every column holds as many of one kind as of the other; and no two rows,
// and no two columns, are the same. Every function here is pure.

export const EMPTY = 0;
/** The filled circle. */
export const DARK = 1;
/** The hollow circle. */
export const LIGHT = 2;

export interface BinairoPuzzle {
  seed: number;
  /** Difficulty, 0 to 100, measured from the reasoning the puzzle needs. */
  score: number;
  /** Cells along one side; always even. */
  size: number;
  /** size * size cells, row by row: EMPTY for the ones to be filled in. */
  givens: number[];
}

export interface BinairoState {
  /** size * size cells, row by row. Includes the givens. */
  cells: number[];
}

/** A tap on a cell. */
export interface BinairoMove {
  cell: number;
}

export function start(p: BinairoPuzzle): BinairoState {
  return { cells: [...p.givens] };
}

/** A tap turns an empty cell dark, a dark one light, and a light one empty again. */
export const next = (value: number) => (value + 1) % 3;

/** Returns the same state object when the move changes nothing. */
export function apply(p: BinairoPuzzle, s: BinairoState, m: BinairoMove): BinairoState {
  if (!(m.cell >= 0 && m.cell < s.cells.length) || p.givens[m.cell]) return s;
  const cells = [...s.cells];
  cells[m.cell] = next(cells[m.cell]);
  return { cells };
}

export type BreakKind = 'three' | 'tooMany' | 'sameRows' | 'sameColumns';

export interface Breaks {
  /** Every cell that is part of a broken rule. */
  cells: Set<number>;
  /** Which rules are broken, each named once. */
  kinds: BreakKind[];
}

/** The cells of every row, then of every column. */
function lines(size: number): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < size; r++) out.push(Array.from({ length: size }, (_, c) => r * size + c));
  for (let c = 0; c < size; c++) out.push(Array.from({ length: size }, (_, r) => r * size + c));
  return out;
}

/**
 * The rule breaks anyone can see on the board: three alike in a line, a row
 * or column with more than half of one kind, and two finished rows or columns
 * that are the same. This needs no knowledge of the answer, so a cell that is
 * merely wrong is never given away.
 */
export function breaks(size: number, cells: number[]): Breaks {
  const marked = new Set<number>();
  const kinds = new Set<BreakKind>();
  const all = lines(size);

  for (const line of all) {
    for (let i = 0; i + 2 < size; i++) {
      const v = cells[line[i]];
      if (v && v === cells[line[i + 1]] && v === cells[line[i + 2]]) {
        kinds.add('three');
        for (let k = i; k < i + 3; k++) marked.add(line[k]);
      }
    }
    for (const kind of [DARK, LIGHT]) {
      const same = line.filter((cell) => cells[cell] === kind);
      if (same.length > size / 2) {
        kinds.add('tooMany');
        for (const cell of same) marked.add(cell);
      }
    }
  }

  // Rows are compared with rows and columns with columns, and only finished ones.
  for (const [from, kind] of [[0, 'sameRows'], [size, 'sameColumns']] as const) {
    const seen = new Map<string, number[]>();
    for (const line of all.slice(from, from + size)) {
      if (line.some((cell) => !cells[cell])) continue;
      const key = line.map((cell) => cells[cell]).join('');
      const twin = seen.get(key);
      if (twin) {
        kinds.add(kind);
        for (const cell of [...twin, ...line]) marked.add(cell);
      } else {
        seen.set(key, line);
      }
    }
  }
  return { cells: marked, kinds: [...kinds] };
}

/** How many cells are still empty. */
export const emptyCells = (cells: number[]) => cells.reduce((n, v) => n + (v ? 0 : 1), 0);

/** Finished when the grid is full and breaks no rule; a puzzle has only one such filling. */
export function status(p: BinairoPuzzle, s: BinairoState): { ended: boolean } {
  return { ended: emptyCells(s.cells) === 0 && breaks(p.size, s.cells).cells.size === 0 };
}

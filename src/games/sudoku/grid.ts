// The fixed geometry of a 9x9 sudoku: which cells share a row, column or box.
// Cells are numbered 0..80, left to right, top to bottom. Digits are 1..9 and
// 0 means empty. Sets of digits are bitmasks, bit (d - 1) for digit d.

export const CELLS = 81;
export const ALL_DIGITS = 0x1ff;

export const bit = (digit: number) => 1 << (digit - 1);
export const rowOf = (cell: number) => (cell / 9) | 0;
export const colOf = (cell: number) => cell % 9;
export const boxOf = (cell: number) => ((rowOf(cell) / 3) | 0) * 3 + ((colOf(cell) / 3) | 0);

/** Number of digits in a mask. */
export const COUNT = new Uint8Array(512);
for (let m = 1; m < 512; m++) COUNT[m] = COUNT[m >> 1] + (m & 1);

/** The digit of a mask that holds exactly one. */
export const digitOf = (mask: number) => 32 - Math.clz32(mask);

export function digitsOf(mask: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (mask & bit(d)) out.push(d);
  return out;
}

/** The 27 units: rows 0..8, columns 9..17, boxes 18..26. */
export const UNITS: number[][] = [];
for (let r = 0; r < 9; r++) UNITS.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
for (let c = 0; c < 9; c++) UNITS.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
for (let b = 0; b < 9; b++) {
  const r0 = ((b / 3) | 0) * 3;
  const c0 = (b % 3) * 3;
  UNITS.push(Array.from({ length: 9 }, (_, k) => (r0 + ((k / 3) | 0)) * 9 + c0 + (k % 3)));
}

export type UnitKind = 'row' | 'column' | 'box';
export const unitKind = (unit: number): UnitKind => (unit < 9 ? 'row' : unit < 18 ? 'column' : 'box');

/** SEES[a * 81 + b] is 1 when two different cells share a unit. */
export const SEES = new Uint8Array(CELLS * CELLS);
/** The 20 cells that share a unit with each cell. */
export const PEERS: number[][] = [];
for (let a = 0; a < CELLS; a++) {
  const peers: number[] = [];
  for (let b = 0; b < CELLS; b++) {
    if (a !== b && (rowOf(a) === rowOf(b) || colOf(a) === colOf(b) || boxOf(a) === boxOf(b))) {
      SEES[a * CELLS + b] = 1;
      peers.push(b);
    }
  }
  PEERS.push(peers);
}

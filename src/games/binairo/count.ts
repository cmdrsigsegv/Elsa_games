// Counts a puzzle's solutions by trying everything. It shares nothing with
// the solver in solve.ts, so the tests can use one to check the other. The
// app itself never calls it.

import { DARK, LIGHT } from './rules';

/** How many ways the grid can be finished within the rules, counting no further than `limit`. */
export function countSolutions(size: number, givens: number[], limit = 2): number {
  const cells = [...givens];
  const half = size / 2;
  const at = (r: number, c: number) => (r < 0 || c < 0 || r >= size || c >= size ? -1 : cells[r * size + c]);

  /** May this circle go here without making three in a line or overfilling its row or column? */
  const fits = (cell: number, v: number): boolean => {
    const r = (cell / size) | 0;
    const c = cell % size;
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const before1 = at(r - dr, c - dc) === v;
      const before2 = at(r - 2 * dr, c - 2 * dc) === v;
      const after1 = at(r + dr, c + dc) === v;
      const after2 = at(r + 2 * dr, c + 2 * dc) === v;
      if ((before1 && before2) || (before1 && after1) || (after1 && after2)) return false;
    }
    let inRow = 0;
    let inCol = 0;
    for (let k = 0; k < size; k++) {
      if (cells[r * size + k] === v) inRow++;
      if (cells[k * size + c] === v) inCol++;
    }
    return inRow < half && inCol < half;
  };

  /** With the grid full: are the rows all different, and the columns? */
  const allDifferent = (): boolean => {
    const rows = new Set<string>();
    const cols = new Set<string>();
    for (let i = 0; i < size; i++) {
      let row = '';
      let col = '';
      for (let k = 0; k < size; k++) {
        row += cells[i * size + k];
        col += cells[k * size + i];
      }
      rows.add(row);
      cols.add(col);
    }
    return rows.size === size && cols.size === size;
  };

  let found = 0;
  const search = (): void => {
    // A cell that fits nothing ends this branch at once, and one that fits a
    // single circle costs no guess. Otherwise guess where a row or column is
    // nearly full: a wrong guess there is found out soonest.
    const emptyIn = new Array<number>(size * 2).fill(0);
    for (let cell = 0; cell < cells.length; cell++) {
      if (cells[cell]) continue;
      emptyIn[(cell / size) | 0]++;
      emptyIn[size + (cell % size)]++;
    }
    let best = -1;
    let bestFits: number[] = [];
    let bestRoom = Infinity;
    for (let cell = 0; cell < cells.length; cell++) {
      if (cells[cell]) continue;
      const can = [DARK, LIGHT].filter((v) => fits(cell, v));
      if (can.length === 0) return;
      const room = can.length === 1 ? 0 : Math.min(emptyIn[(cell / size) | 0], emptyIn[size + (cell % size)]);
      if (room < bestRoom) {
        best = cell;
        bestFits = can;
        bestRoom = room;
        if (room === 0) break;
      }
    }
    if (best < 0) {
      if (allDifferent()) found++;
      return;
    }
    for (const v of bestFits) {
      cells[best] = v;
      search();
      cells[best] = 0;
      if (found >= limit) return;
    }
  };

  // Givens that already break a rule leave nothing to count.
  for (let cell = 0; cell < cells.length; cell++) {
    const v = cells[cell];
    if (!v) continue;
    cells[cell] = 0;
    const ok = fits(cell, v);
    cells[cell] = v;
    if (!ok) return 0;
  }
  search();
  return found;
}

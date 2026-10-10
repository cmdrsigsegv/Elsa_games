// Nonogram logic for one line (a row or a column) and for the whole grid.
//
// A line is a list of cells, each UNKNOWN, FILLED or EMPTY, and a clue: the
// lengths of its runs of filled cells, in order. The line solver answers the
// question a person asks of a line: given what is already marked, which cells
// are the same in every arrangement that fits the clue?

export const UNKNOWN = 0;
export const FILLED = 1;
export const EMPTY = 2;

/** The clue of a finished line: the lengths of its runs of FILLED cells. */
export function clueOf(line: ArrayLike<number>): number[] {
  const clue: number[] = [];
  let run = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === FILLED) run++;
    else if (run) {
      clue.push(run);
      run = 0;
    }
  }
  if (run) clue.push(run);
  return clue;
}

/**
 * Everything that can be deduced about one line. Returns the line with every
 * forced cell marked, or null if no arrangement of the clue fits what is
 * already marked.
 */
export function solveLine(clue: number[], line: ArrayLike<number>): number[] | null {
  const n = line.length;
  const k = clue.length;

  // empties[i]: how many EMPTY cells there are before cell i.
  const empties = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) empties[i + 1] = empties[i] + (line[i] === EMPTY ? 1 : 0);
  const noEmpty = (from: number, to: number) => empties[to] === empties[from];

  // pre[j][i]: the first j runs fit in cells 0..i-1, leaving nothing FILLED uncovered.
  const pre: Uint8Array[] = [];
  for (let j = 0; j <= k; j++) {
    const row = new Uint8Array(n + 1);
    for (let i = 0; i <= n; i++) {
      if (i === 0) {
        row[i] = j === 0 ? 1 : 0;
        continue;
      }
      let ok = line[i - 1] !== FILLED && row[i - 1] === 1; // cell i-1 left empty
      if (!ok && j > 0) {
        // run j-1 ends at cell i-1
        const s = i - clue[j - 1];
        if (s >= 0 && noEmpty(s, i)) {
          ok = s === 0 ? j === 1 : line[s - 1] !== FILLED && pre[j - 1][s - 1] === 1;
        }
      }
      row[i] = ok ? 1 : 0;
    }
    pre.push(row);
  }
  if (!pre[k][n]) return null;

  // suf[j][i]: runs j..k-1 fit in cells i..n-1.
  const suf: Uint8Array[] = new Array(k + 1);
  for (let j = k; j >= 0; j--) {
    const row = new Uint8Array(n + 1);
    for (let i = n; i >= 0; i--) {
      if (i === n) {
        row[i] = j === k ? 1 : 0;
        continue;
      }
      let ok = line[i] !== FILLED && row[i + 1] === 1; // cell i left empty
      if (!ok && j < k) {
        // run j starts at cell i
        const e = i + clue[j];
        if (e <= n && noEmpty(i, e)) {
          ok = e === n ? j === k - 1 : line[e] !== FILLED && suf[j + 1][e + 1] === 1;
        }
      }
      row[i] = ok ? 1 : 0;
    }
    suf[j] = row;
  }

  // A cell can be empty if some split of the runs leaves it out; it can be
  // filled if some run, somewhere it legally fits, covers it.
  const canEmpty = new Uint8Array(n);
  for (let c = 0; c < n; c++) {
    if (line[c] === FILLED) continue;
    for (let j = 0; j <= k; j++) {
      if (pre[j][c] && suf[j][c + 1]) {
        canEmpty[c] = 1;
        break;
      }
    }
  }
  const cover = new Int32Array(n + 1);
  for (let j = 0; j < k; j++) {
    for (let s = 0; s + clue[j] <= n; s++) {
      const e = s + clue[j];
      if (!noEmpty(s, e)) continue;
      const leftOk = s === 0 ? j === 0 : line[s - 1] !== FILLED && pre[j][s - 1] === 1;
      const rightOk = e === n ? j === k - 1 : line[e] !== FILLED && suf[j + 1][e + 1] === 1;
      if (leftOk && rightOk) {
        cover[s]++;
        cover[e]--;
      }
    }
  }

  const out: number[] = new Array(n);
  let covering = 0;
  for (let c = 0; c < n; c++) {
    covering += cover[c];
    const canFill = covering > 0;
    out[c] = canFill && canEmpty[c] ? UNKNOWN : canFill ? FILLED : EMPTY;
  }
  return out;
}

export interface Clues {
  w: number;
  h: number;
  rows: number[][];
  cols: number[][];
}

export const rowCells = (p: { w: number }, r: number) => Array.from({ length: p.w }, (_, c) => r * p.w + c);
export const colCells = (p: { w: number; h: number }, c: number) => Array.from({ length: p.h }, (_, r) => r * p.w + c);

export interface GridSolved {
  /** True when line-by-line reasoning alone fills the whole grid. */
  solved: boolean;
  cells: number[];
  /** How many times the solver had to go round all the lines. */
  rounds: number;
}

/**
 * Solves by looking at one line at a time, as a person does, never guessing.
 * A puzzle this finishes has exactly one solution.
 */
export function solveGrid(p: Clues, from?: ArrayLike<number>): GridSolved {
  const cells: number[] = from ? Array.from(from) : new Array(p.w * p.h).fill(UNKNOWN);
  const lines = [
    ...p.rows.map((clue, r) => ({ clue, at: rowCells(p, r) })),
    ...p.cols.map((clue, c) => ({ clue, at: colCells(p, c) })),
  ];
  let rounds = 0;
  for (;;) {
    let progress = false;
    for (const line of lines) {
      const next = solveLine(line.clue, line.at.map((i) => cells[i]));
      if (!next) return { solved: false, cells, rounds };
      line.at.forEach((i, n) => {
        if (cells[i] !== next[n]) {
          cells[i] = next[n];
          progress = true;
        }
      });
    }
    if (!progress) break;
    rounds++;
  }
  return { solved: cells.every((v) => v !== UNKNOWN), cells, rounds };
}

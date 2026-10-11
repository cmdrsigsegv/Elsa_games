// The shape of a kakuro grid: which cells are white, and the runs they form.
// A run is a row or column of white cells between two black ones; its clue
// sits in the black cell before it.
//
// The grid is square, `size` cells a side, and its top row and left column
// are always black: they hold the clues of the runs that start at the edge.

export const bit = (digit: number) => 1 << (digit - 1);
export const ALL_DIGITS = 0x1ff;

/** For every mask of digits: how many, their sum, the smallest and the largest. */
export const COUNT = new Uint8Array(512);
export const SUM = new Uint8Array(512);
export const LOW = new Uint8Array(512);
export const HIGH = new Uint8Array(512);
for (let m = 1; m < 512; m++) {
  for (let d = 1; d <= 9; d++) {
    if (!(m & bit(d))) continue;
    COUNT[m]++;
    SUM[m] += d;
    if (!LOW[m]) LOW[m] = d;
    HIGH[m] = d;
  }
}

/** The digit of a mask that holds exactly one. */
export const digitOf = (mask: number) => LOW[mask];

export interface Run {
  across: boolean;
  /** The black cell that shows this run's clue. */
  clueAt: number;
  /** Left to right, or top to bottom. */
  cells: number[];
}

export interface Layout {
  size: number;
  /** 1 for a white cell, per cell. */
  white: Uint8Array;
  runs: Run[];
  /** For each white cell, the index of its across run and of its down run; -1 where there is none. */
  acrossOf: Int16Array;
  downOf: Int16Array;
}

/** Works out the runs of a grid; `white` is truthy for the cells that take a digit. */
export function layoutOf(size: number, white: ArrayLike<number | boolean>): Layout {
  const cells = size * size;
  const w = new Uint8Array(cells);
  for (let i = 0; i < cells; i++) w[i] = white[i] ? 1 : 0;
  const runs: Run[] = [];
  const acrossOf = new Int16Array(cells).fill(-1);
  const downOf = new Int16Array(cells).fill(-1);

  for (const across of [true, false]) {
    const step = across ? 1 : size;
    const of = across ? acrossOf : downOf;
    for (let i = 0; i < cells; i++) {
      if (!w[i]) continue;
      const first = across ? i % size === 0 : i < size;
      if (!first && w[i - step]) continue; // not the start of its run
      const run: Run = { across, clueAt: first ? -1 : i - step, cells: [] };
      for (let j = i; j < cells && w[j] && (j === i || !across || j % size !== 0); j += step) {
        run.cells.push(j);
        of[j] = runs.length;
      }
      runs.push(run);
    }
  }
  return { size, white: w, runs, acrossOf, downOf };
}

/** The sum of each run, in the order of `layout.runs`. */
export function sumsOf(layout: Layout, digits: ArrayLike<number>): number[] {
  return layout.runs.map((run) => run.cells.reduce((sum, c) => sum + digits[c], 0));
}

export const TOO_LONG = 'run longer than nine';

/**
 * Why a grid is not a proper kakuro layout, or null when it is: the edge must
 * be black, every run 2 to 9 cells long (so no white cell stands alone), and
 * the white cells all joined up.
 */
export function layoutFault(layout: Layout): string | null {
  const { size, white, runs, acrossOf, downOf } = layout;
  let first = -1;
  let whites = 0;
  for (let i = 0; i < size * size; i++) {
    if (!white[i]) continue;
    if (i < size || i % size === 0) return 'white cell on the clue edge';
    if (acrossOf[i] < 0 || downOf[i] < 0) return 'cell outside a run';
    if (first < 0) first = i;
    whites++;
  }
  if (first < 0) return 'no white cells';
  if (runs.some((run) => run.cells.length < 2)) return 'run of one cell';
  // Flood from one white cell: it must reach them all.
  const seen = new Uint8Array(size * size);
  const stack = [first];
  seen[first] = 1;
  let reached = 0;
  while (stack.length) {
    const i = stack.pop()!;
    reached++;
    for (const j of [i - size, i + size, i - 1, i + 1]) {
      // The black edge column keeps i - 1 and i + 1 from wrapping round a row.
      if (j >= 0 && j < size * size && white[j] && !seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  if (reached !== whites) return 'white cells in separate groups';
  // Last, because it is the one fault the generator can still mend.
  return runs.some((run) => run.cells.length > 9) ? TOO_LONG : null;
}

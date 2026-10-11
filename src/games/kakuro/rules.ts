// What the player can do in a kakuro, and what it does to the grid. Every
// function here is pure: it returns a new state and never changes its input.

import type { KakuroPuzzle } from './generate';
import { bit, layoutOf, type Layout } from './layout';
import { tuning } from './tuning';

export interface KakuroState {
  /** One digit per cell, 0 for empty and for black cells. */
  values: number[];
  /** Pencil notes per cell, as a bitmask of digits. */
  notes: number[];
}

export type KakuroMove =
  | { type: 'set'; cell: number; digit: number }
  | { type: 'note'; cell: number; digit: number }
  | { type: 'erase'; cell: number };

// The runs of a puzzle are worked out once and remembered: the screen asks
// for them on every repaint.
const layouts = new WeakMap<KakuroPuzzle, Layout>();

export function layoutFor(p: KakuroPuzzle): Layout {
  let layout = layouts.get(p);
  if (!layout) {
    layout = layoutOf(p.size, p.solution);
    layouts.set(p, layout);
  }
  return layout;
}

export const isWhite = (p: KakuroPuzzle, cell: number) => p.solution[cell] !== 0;

/** The cells in the same row run or column run as `cell`, itself included. */
export function runMates(p: KakuroPuzzle, cell: number): number[] {
  const layout = layoutFor(p);
  return [...layout.runs[layout.acrossOf[cell]].cells, ...layout.runs[layout.downOf[cell]].cells];
}

export function start(p: KakuroPuzzle): KakuroState {
  const cells = p.size * p.size;
  return { values: new Array<number>(cells).fill(0), notes: new Array<number>(cells).fill(0) };
}

/** Returns the same state object when the move changes nothing. */
export function apply(p: KakuroPuzzle, s: KakuroState, m: KakuroMove): KakuroState {
  if (!isWhite(p, m.cell)) return s;
  const values = [...s.values];
  const notes = [...s.notes];
  switch (m.type) {
    case 'set':
      if (values[m.cell] === m.digit) {
        values[m.cell] = 0;
        break;
      }
      values[m.cell] = m.digit;
      notes[m.cell] = 0;
      if (tuning.tidyNotes) for (const mate of runMates(p, m.cell)) notes[mate] &= ~bit(m.digit);
      break;
    case 'note':
      if (values[m.cell]) return s;
      notes[m.cell] ^= bit(m.digit);
      break;
    case 'erase':
      if (!values[m.cell] && !notes[m.cell]) return s;
      values[m.cell] = 0;
      notes[m.cell] = 0;
      break;
  }
  return { values, notes };
}

export interface Breaks {
  /** Cells whose digit is repeated in one of their runs. */
  repeats: number[];
  /** The clue cells of runs whose sum cannot come out right, across and down apart: one black cell can hold both. */
  across: number[];
  down: number[];
}

/**
 * What visibly breaks the rules: a digit twice in a run, a full run with the
 * wrong sum, and a run with cells still empty that has already reached its
 * sum. This needs no knowledge of the answer, and a digit that is merely
 * wrong is never among them.
 */
export function breaks(p: KakuroPuzzle, s: KakuroState): Breaks {
  const repeats = new Set<number>();
  const out: Breaks = { repeats: [], across: [], down: [] };
  for (const run of layoutFor(p).runs) {
    const clue = run.across ? p.across[run.clueAt] : p.down[run.clueAt];
    let sum = 0;
    let empty = 0;
    for (const c of run.cells) {
      const d = s.values[c];
      if (!d) empty++;
      sum += d;
      if (d && run.cells.some((other) => other !== c && s.values[other] === d)) repeats.add(c);
    }
    // With cells left to fill, each needing at least 1, reaching the sum is already too much.
    if (empty ? sum >= clue : sum !== clue) (run.across ? out.across : out.down).push(run.clueAt);
  }
  out.repeats = [...repeats].sort((a, b) => a - b);
  return out;
}

export function status(p: KakuroPuzzle, s: KakuroState): { ended: boolean } {
  return { ended: s.values.every((d, i) => d === p.solution[i]) };
}

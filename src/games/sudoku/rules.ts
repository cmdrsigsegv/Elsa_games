// What the player can do in a sudoku, and what it does to the grid. Every
// function here is pure: it returns a new state and never changes its input.

import type { SudokuPuzzle } from './generate';
import { CELLS, PEERS, bit, unitKind, type UnitKind } from './grid';
import { TIER, apply as applyStep, begin, nextStep } from './solve';
import { tuning } from './tuning';

export interface SudokuState {
  /** 81 digits, 0 for empty. Includes the givens. */
  values: number[];
  /** Pencil notes per cell, as a bitmask of digits. */
  notes: number[];
  /** How many numbers have been entered so far. */
  moves: number;
  /** For each cell, the value of `moves` when its number went in; 0 if empty or given. */
  order: number[];
}

export type SudokuMove =
  | { type: 'set'; cell: number; digit: number }
  | { type: 'note'; cell: number; digit: number }
  | { type: 'erase'; cell: number };

export function start(p: SudokuPuzzle): SudokuState {
  return { values: [...p.givens], notes: new Array<number>(CELLS).fill(0), moves: 0, order: new Array<number>(CELLS).fill(0) };
}

/** Returns the same state object when the move changes nothing. */
export function apply(p: SudokuPuzzle, s: SudokuState, m: SudokuMove): SudokuState {
  if (p.givens[m.cell]) return s;
  const values = [...s.values];
  const notes = [...s.notes];
  // Games saved before `order` existed have none.
  const order = [...(s.order ?? new Array<number>(CELLS).fill(0))];
  let moves = s.moves ?? 0;
  switch (m.type) {
    case 'set':
      if (values[m.cell] === m.digit) {
        values[m.cell] = 0;
        order[m.cell] = 0;
        break;
      }
      values[m.cell] = m.digit;
      order[m.cell] = ++moves;
      notes[m.cell] = 0;
      if (tuning.tidyNotes) for (const peer of PEERS[m.cell]) notes[peer] &= ~bit(m.digit);
      break;
    case 'note':
      if (values[m.cell]) return s;
      notes[m.cell] ^= bit(m.digit);
      break;
    case 'erase':
      if (!values[m.cell] && !notes[m.cell]) return s;
      values[m.cell] = 0;
      notes[m.cell] = 0;
      order[m.cell] = 0;
      break;
  }
  return { values, notes, moves, order };
}

/** The cells holding a wrong digit, in the order she entered them: the first is where it went wrong. */
export function wrongCells(p: SudokuPuzzle, s: SudokuState): number[] {
  const out: number[] = [];
  for (let i = 0; i < CELLS; i++) if (s.values[i] && s.values[i] !== p.solution[i]) out.push(i);
  return out.sort((a, b) => (s.order?.[a] ?? 0) - (s.order?.[b] ?? 0));
}

/**
 * Her numbers that visibly break the rules: the same digit is already in the
 * row, column or box. This needs no knowledge of the answer, and one of a
 * clashing pair may in fact be right.
 */
export function clashingCells(p: SudokuPuzzle, s: SudokuState): number[] {
  const out: number[] = [];
  for (let i = 0; i < CELLS; i++) {
    if (s.values[i] && !p.givens[i] && PEERS[i].some((peer) => s.values[peer] === s.values[i])) out.push(i);
  }
  return out;
}

export function status(p: SudokuPuzzle, s: SudokuState): { ended: boolean } {
  return { ended: s.values.every((d, i) => d === p.solution[i]) };
}

/** True when the move enters a wrong digit. */
export function isMistake(p: SudokuPuzzle, s: SudokuState, m: SudokuMove): boolean {
  return m.type === 'set' && !p.givens[m.cell] && s.values[m.cell] !== m.digit && p.solution[m.cell] !== m.digit;
}

export type HintWhy =
  | { kind: 'wrong' }
  | { kind: 'lastInUnit'; unit: UnitKind }
  | { kind: 'onlyPlace'; unit: UnitKind }
  | { kind: 'onlyNumber' }
  | { kind: 'advanced' };

export interface SudokuHint {
  cell: number;
  digit: number;
  why: HintWhy;
}

/** The next cell to look at, with its answer and the reasoning that finds it. */
export function hint(p: SudokuPuzzle, s: SudokuState): SudokuHint | null {
  const wrong = wrongCells(p, s);
  if (wrong.length) return { cell: wrong[0], digit: p.solution[wrong[0]], why: { kind: 'wrong' } };

  const w = begin(s.values);
  let advanced = false;
  while (w && w.left > 0) {
    const step = nextStep(w);
    if (!step) break;
    if (step.cell !== undefined && step.digit !== undefined) {
      const { cell, digit } = step;
      if (advanced || TIER[step.technique] > 2) return { cell, digit, why: { kind: 'advanced' } };
      if (step.technique === 'nakedSingle') return { cell, digit, why: { kind: 'onlyNumber' } };
      const unit = unitKind(step.unit!);
      return { cell, digit, why: { kind: step.technique === 'fullHouse' ? 'lastInUnit' : 'onlyPlace', unit } };
    }
    // An elimination: needed before the next number can be placed.
    advanced = true;
    applyStep(w, step);
  }

  const empty = s.values.findIndex((d) => !d);
  return empty < 0 ? null : { cell: empty, digit: p.solution[empty], why: { kind: 'advanced' } };
}

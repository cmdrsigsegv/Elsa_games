// What the player can do in a killer sudoku, and what it does to the grid.
// Every function here is pure: it returns a new state and never changes its input.

import { CELLS, PEERS, bit, unitKind, type UnitKind } from '../sudoku/grid';
import { TIER, apply as applyStep, begin, nextStep, type Cage } from './solve';
import { tuning } from './tuning';

export interface KillerPuzzle {
  seed: number;
  /** The cages, which between them cover every cell once. There are no given digits. */
  cages: Cage[];
  solution: number[];
  /** Difficulty, 0 to 100. */
  score: number;
}

export interface KillerState {
  /** 81 digits, 0 for empty. */
  values: number[];
  /** Pencil notes per cell, as a bitmask of digits. */
  notes: number[];
  /** How many numbers have been entered so far. */
  moves: number;
  /** For each cell, the value of `moves` when its number went in; 0 if empty. */
  order: number[];
}

export type KillerMove =
  | { type: 'set'; cell: number; digit: number }
  | { type: 'note'; cell: number; digit: number }
  | { type: 'erase'; cell: number };

export function start(_p: KillerPuzzle): KillerState {
  return {
    values: new Array<number>(CELLS).fill(0),
    notes: new Array<number>(CELLS).fill(0),
    moves: 0,
    order: new Array<number>(CELLS).fill(0),
  };
}

/** Which cage each cell is in, as an index into `p.cages`. */
export function cageMap(p: KillerPuzzle): number[] {
  const out = new Array<number>(CELLS).fill(0);
  p.cages.forEach((cage, c) => cage.cells.forEach((i) => (out[i] = c)));
  return out;
}

/** Returns the same state object when the move changes nothing. */
export function apply(p: KillerPuzzle, s: KillerState, m: KillerMove): KillerState {
  const values = [...s.values];
  const notes = [...s.notes];
  const order = [...s.order];
  let moves = s.moves;
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
      if (tuning.tidyNotes) {
        // The digit can no longer go anywhere in the row, column, box or cage.
        const cage = p.cages.find((c) => c.cells.includes(m.cell))!;
        for (const other of [...PEERS[m.cell], ...cage.cells]) notes[other] &= ~bit(m.digit);
      }
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
export function wrongCells(p: KillerPuzzle, s: KillerState): number[] {
  const out: number[] = [];
  for (let i = 0; i < CELLS; i++) if (s.values[i] && s.values[i] !== p.solution[i]) out.push(i);
  return out.sort((a, b) => s.order[a] - s.order[b]);
}

/**
 * Her numbers that visibly break the rules: the same digit is already in the
 * row, column, box or cage, or the cage's numbers add up to too much (or,
 * once it is full, to too little). This needs no knowledge of the answer, and
 * some of the numbers marked may in fact be right.
 */
export function clashingCells(p: KillerPuzzle, s: KillerState): number[] {
  const clash = new Set<number>();
  for (let i = 0; i < CELLS; i++) {
    if (s.values[i] && PEERS[i].some((peer) => s.values[peer] === s.values[i])) clash.add(i);
  }
  for (const cage of p.cages) {
    const filled = cage.cells.filter((i) => s.values[i]);
    const sum = filled.reduce((total, i) => total + s.values[i], 0);
    const full = filled.length === cage.cells.length;
    if (sum > cage.sum || (full && sum < cage.sum)) for (const i of filled) clash.add(i);
    for (const i of filled) if (filled.some((j) => j !== i && s.values[j] === s.values[i])) clash.add(i);
  }
  return [...clash].sort((a, b) => a - b);
}

export function status(p: KillerPuzzle, s: KillerState): { ended: boolean } {
  return { ended: s.values.every((d, i) => d === p.solution[i]) };
}

/** True when the move enters a wrong digit. */
export function isMistake(p: KillerPuzzle, s: KillerState, m: KillerMove): boolean {
  return m.type === 'set' && s.values[m.cell] !== m.digit && p.solution[m.cell] !== m.digit;
}

export type HintWhy =
  | { kind: 'wrong' }
  | { kind: 'lastInCage' }
  | { kind: 'lastInUnit'; unit: UnitKind }
  | { kind: 'onlyPlace'; unit: UnitKind }
  | { kind: 'onlyNumber' }
  | { kind: 'fortyFive' }
  | { kind: 'advanced' };

export interface KillerHint {
  cell: number;
  digit: number;
  why: HintWhy;
}

/** The next cell to look at, with its answer and the reasoning that finds it. */
export function hint(p: KillerPuzzle, s: KillerState): KillerHint | null {
  const wrong = wrongCells(p, s);
  if (wrong.length) return { cell: wrong[0], digit: p.solution[wrong[0]], why: { kind: 'wrong' } };

  const w = begin(p.cages, s.values);
  let advanced = false;
  while (w && w.left > 0) {
    const step = nextStep(w);
    if (!step) break;
    if (step.cell !== undefined && step.digit !== undefined) {
      const { cell, digit, technique } = step;
      const unit = step.unit === undefined ? null : unitKind(step.unit);
      // A number that took a harder trick to reach, or is one, gets no explanation.
      let why: HintWhy = { kind: 'advanced' };
      if (!advanced) {
        if (technique === 'lastInCage') why = { kind: 'lastInCage' };
        else if (technique === 'nakedSingle') why = { kind: 'onlyNumber' };
        else if (technique === 'fullHouse' && unit) why = { kind: 'lastInUnit', unit };
        else if (technique === 'hiddenSingle' && unit) why = { kind: 'onlyPlace', unit };
        else if (technique === 'sum45') why = { kind: 'fortyFive' };
      }
      return { cell, digit, why };
    }
    // An elimination: needed before the next number can be placed. Working
    // out what a cage's total allows is part of every killer; anything
    // beyond that is a harder trick.
    if (TIER[step.technique] > TIER.cageSums) advanced = true;
    applyStep(w, step);
  }

  const empty = s.values.findIndex((d) => !d);
  return empty < 0 ? null : { cell: empty, digit: p.solution[empty], why: { kind: 'advanced' } };
}

import { describe, expect, it } from 'vitest';
import { PEERS, UNITS, bit } from '../sudoku/grid';
import { tierFor } from './difficulty';
import { connected, generate } from './generate';
import { apply, clashingCells, hint, isMistake, start, status, wrongCells, type KillerPuzzle } from './rules';
import { TIER, countSolutions, solve, type Cage, type Technique } from './solve';

const LEVELS = [40, 60, 80, 100];

// One puzzle per level is made once and shared: the hard ones take a while to count by brute force.
const made = new Map<number, KillerPuzzle>();
const at = (level: number) => {
  if (!made.has(level)) made.set(level, generate(5000 + level, level));
  return made.get(level)!;
};

/** A grid cut into 81 one-cell cages: every digit is given. */
const SOLUTION = [...'534678912672195348198342567859761423426853791713924856961537284287419635345286179'].map(Number);
const singles = (): Cage[] => SOLUTION.map((sum, i) => ({ cells: [i], sum }));
/** The same with the first two cells of each listed row joined into one cage. */
const withPairs = (rows: number[]): Cage[] => {
  const paired = new Set(rows.flatMap((r) => [r * 9, r * 9 + 1]));
  return [
    ...singles().filter((cage) => !paired.has(cage.cells[0])),
    ...rows.map((r) => ({ cells: [r * 9, r * 9 + 1], sum: SOLUTION[r * 9] + SOLUTION[r * 9 + 1] })),
  ];
};

describe('solver', () => {
  it('fills one-cell cages with nothing but their totals', () => {
    const s = solve(singles(), 0);
    expect(s.solved).toBe(true);
    expect(Array.from(s.values)).toEqual(SOLUTION);
    expect(s.hardest).toBe(0);
  });

  it('works out a two-cell cage from its total and the rest of the grid', () => {
    const cages = withPairs([0, 4]);
    expect(solve(cages, 0).solved).toBe(false);
    const s = solve(cages, 1);
    expect(s.solved).toBe(true);
    expect(Array.from(s.values)).toEqual(SOLUTION);
    expect(countSolutions(cages)).toBe(1);
  });

  it('refuses to guess: gives up when a puzzle has two solutions', () => {
    // The top two rows, with each column's two cells as one cage: nine totals
    // are too few to say which way round every pair goes.
    const open = [0, 1].flatMap((r) => UNITS[r]);
    const cages: Cage[] = [
      ...singles().filter((cage) => !open.includes(cage.cells[0])),
      ...UNITS[0].map((i) => ({ cells: [i, i + 9], sum: SOLUTION[i] + SOLUTION[i + 9] })),
    ];
    expect(countSolutions(cages)).toBeGreaterThan(1);
    expect(solve(cages).solved).toBe(false);
  });

  it('counts no solutions when a total cannot be made', () => {
    const cages = singles();
    cages[0] = { cells: [0], sum: SOLUTION[0] === 9 ? 8 : SOLUTION[0] + 1 };
    expect(countSolutions(cages)).toBe(0);
    expect(solve(cages).solved).toBe(false);
  });

  it('uses the rule of 45 when a cage total alone is not enough', () => {
    const p = at(60);
    const s = solve(p.cages);
    expect(s.uses.sum45 + s.uses.sum45Wide).toBeGreaterThan(0);
    expect(solve(p.cages, 1).solved).toBe(false);
  });
});

describe('generator', () => {
  it('gives the same puzzle for the same seed', () => {
    expect(generate(123, 55)).toEqual(generate(123, 55));
    expect(generate(123, 55).cages).not.toEqual(generate(124, 55).cages);
    expect(generate(77, 90)).toEqual(generate(77, 90));
  });

  it.each(LEVELS)('makes a valid sudoku grid at level %i', (level) => {
    const p = at(level);
    expect(p.seed).toBe(5000 + level);
    for (const unit of UNITS) {
      expect(unit.map((i) => p.solution[i]).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });

  it.each(LEVELS)('makes valid cages at level %i', (level) => {
    const p = at(level);
    // Every cell is in exactly one cage.
    expect(p.cages.flatMap((cage) => cage.cells).sort((a, b) => a - b)).toEqual(Array.from({ length: 81 }, (_, i) => i));
    for (const cage of p.cages) {
      expect(connected(cage.cells)).toBe(true);
      const digits = cage.cells.map((i) => p.solution[i]);
      expect(digits.reduce((sum, d) => sum + d, 0)).toBe(cage.sum);
      expect(new Set(digits).size).toBe(digits.length);
      // The first cell is the one that shows the total: the top one, leftmost.
      expect(cage.cells[0]).toBe(Math.min(...cage.cells));
    }
  });

  it.each(LEVELS)('makes a puzzle with exactly one solution at level %i', (level) => {
    expect(countSolutions(at(level).cages)).toBe(1);
  });

  it.each(LEVELS)('needs no guessing, and no harder technique than level %i allows', (level) => {
    const p = at(level);
    const s = solve(p.cages, tierFor(level));
    expect(s.solved).toBe(true);
    expect(Array.from(s.values)).toEqual(p.solution);
  });

  it.each(LEVELS)('lands near level %i', (level) => {
    const p = at(level);
    expect(p.score).toBeGreaterThanOrEqual(0);
    expect(p.score).toBeLessThanOrEqual(100);
    expect(Math.abs(p.score - level)).toBeLessThanOrEqual(10);
  });

  it('agrees with brute force on other seeds too', () => {
    for (const [seed, level] of [[1, 45], [2, 55], [3, 65], [4, 75]]) {
      const p = generate(seed, level);
      expect(countSolutions(p.cages)).toBe(1);
      expect(Array.from(solve(p.cages).values)).toEqual(p.solution);
    }
  });

  it('keeps the easiest puzzles gentle and the hardest free of one-cell cages', () => {
    const size = (p: KillerPuzzle) => Math.max(...p.cages.map((cage) => cage.cells.length));
    expect(size(at(40))).toBeLessThanOrEqual(4);
    expect(at(40).cages.some((cage) => cage.cells.length === 1)).toBe(true);
    expect(size(at(100))).toBeGreaterThanOrEqual(5);
    expect(at(100).cages.every((cage) => cage.cells.length >= 2)).toBe(true);
  });

  it('needs harder techniques at higher levels', () => {
    const solved = LEVELS.map((level) => solve(at(level).cages));
    const hardest = solved.map((s) => s.hardest);
    for (let i = 1; i < hardest.length; i++) expect(hardest[i]).toBeGreaterThan(hardest[i - 1]);
    const scores = LEVELS.map((level) => at(level).score);
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThan(scores[i - 1]);

    // Level 40 is adding up and singles; level 100 leans on the rule of 45
    // over several units and on cages and units together.
    const uses = (level: number, tier: number) => {
      const s = solved[LEVELS.indexOf(level)];
      return (Object.keys(s.uses) as Technique[]).filter((t) => TIER[t] >= tier).reduce((n, t) => n + s.uses[t], 0);
    };
    expect(uses(40, 2)).toBe(0);
    expect(uses(100, 5)).toBeGreaterThan(0);
    expect(uses(100, 4)).toBeGreaterThan(uses(60, 4));
  });
});

describe('rules', () => {
  const p = at(40);
  const cell = 40;
  const right = p.solution[cell];
  const cage = p.cages.find((c) => c.cells.length > 1)!;

  it('starts empty: a killer has no given digits', () => {
    const s = start(p);
    expect(s.values.every((d) => d === 0)).toBe(true);
    expect(status(p, s).ended).toBe(false);
  });

  it('sets, toggles off, and erases', () => {
    const s0 = start(p);
    const s1 = apply(p, s0, { type: 'set', cell, digit: right });
    expect(s1.values[cell]).toBe(right);
    expect(s0.values[cell]).toBe(0); // the old state is untouched
    expect(apply(p, s1, { type: 'set', cell, digit: right }).values[cell]).toBe(0);
    expect(apply(p, s1, { type: 'erase', cell }).values[cell]).toBe(0);
    expect(apply(p, s0, { type: 'erase', cell })).toBe(s0);
  });

  it('keeps notes, and tidies them when a number goes in', () => {
    const peer = PEERS[cell][0];
    const other = (right % 9) + 1;
    let s = apply(p, start(p), { type: 'note', cell: peer, digit: right });
    s = apply(p, s, { type: 'note', cell: peer, digit: other });
    expect(s.notes[peer]).toBe(bit(right) | bit(other));
    s = apply(p, s, { type: 'set', cell, digit: right });
    expect(s.notes[peer]).toBe(bit(other));
    // A filled cell takes no notes.
    expect(apply(p, s, { type: 'note', cell, digit: 1 })).toBe(s);
  });

  it('tidies notes through the cage as well', () => {
    // Two cells of one cage that share no row, column or box, if this puzzle has such a cage.
    const far = p.cages.flatMap((c) => c.cells.flatMap((a) => c.cells.filter((b) => a < b && !PEERS[a].includes(b)).map((b) => [a, b])))[0];
    const [a, b] = far ?? [cage.cells[0], cage.cells[1]];
    let s = apply(p, start(p), { type: 'note', cell: b, digit: 5 });
    s = apply(p, s, { type: 'set', cell: a, digit: 5 });
    expect(s.notes[b]).toBe(0);
  });

  it('spots mistakes', () => {
    const s = start(p);
    const wrong = (right % 9) + 1;
    expect(isMistake(p, s, { type: 'set', cell, digit: wrong })).toBe(true);
    expect(isMistake(p, s, { type: 'set', cell, digit: right })).toBe(false);
    expect(isMistake(p, s, { type: 'note', cell, digit: wrong })).toBe(false);
    expect(wrongCells(p, apply(p, s, { type: 'set', cell, digit: wrong }))).toEqual([cell]);
  });

  it('marks a repeated digit in a row, and in a cage', () => {
    let s = apply(p, start(p), { type: 'set', cell: 0, digit: 1 });
    expect(clashingCells(p, s)).toEqual([]);
    s = apply(p, s, { type: 'set', cell: 8, digit: 1 });
    expect(clashingCells(p, s)).toEqual([0, 8]);

    const [a, b] = cage.cells;
    s = apply(p, start(p), { type: 'set', cell: a, digit: 1 });
    s = apply(p, s, { type: 'set', cell: b, digit: 1 });
    expect(clashingCells(p, s)).toEqual([a, b]);
  });

  it('marks a cage that adds up to too much, or is full and adds up to too little', () => {
    const two = p.cages.find((c) => c.cells.length === 2 && c.sum < 17 && c.sum > 3)!;
    const [a, b] = two.cells;
    // One cell alone, already over the total (or not: a 9 is over any total below 9).
    let s = apply(p, start(p), { type: 'set', cell: a, digit: 9 });
    expect(clashingCells(p, s)).toEqual(two.sum < 9 ? [a] : []);
    // Full and too much.
    s = apply(p, s, { type: 'set', cell: b, digit: 8 });
    expect(clashingCells(p, s)).toEqual([a, b]);
    // Full and too little.
    s = apply(p, start(p), { type: 'set', cell: a, digit: 1 });
    s = apply(p, s, { type: 'set', cell: b, digit: 2 });
    expect(clashingCells(p, s)).toEqual([a, b]);
    // Right: nothing is marked.
    s = apply(p, start(p), { type: 'set', cell: a, digit: p.solution[a] });
    s = apply(p, s, { type: 'set', cell: b, digit: p.solution[b] });
    expect(clashingCells(p, s)).toEqual([]);
  });

  it('lists wrong numbers in the order they were entered', () => {
    let s = start(p);
    for (const c of [30, 10, 20]) s = apply(p, s, { type: 'set', cell: c, digit: (p.solution[c] % 9) + 1 });
    expect(wrongCells(p, s)).toEqual([30, 10, 20]);
  });

  it('ends only when every cell is right', () => {
    let s = start(p);
    p.solution.forEach((digit, c) => {
      expect(status(p, s).ended).toBe(false);
      s = apply(p, s, { type: 'set', cell: c, digit });
    });
    expect(status(p, s).ended).toBe(true);
  });

  it('hints point at a wrong number first', () => {
    const wrong = (right % 9) + 1;
    const s = apply(p, start(p), { type: 'set', cell, digit: wrong });
    expect(hint(p, s)).toEqual({ cell, digit: right, why: { kind: 'wrong' } });
  });

  it('following hints solves the puzzle', () => {
    for (const level of [40, 100]) {
      const q = at(level);
      let s = start(q);
      for (let n = 0; n < 81 && !status(q, s).ended; n++) {
        const h = hint(q, s)!;
        expect(q.solution[h.cell]).toBe(h.digit);
        expect(s.values[h.cell]).toBe(0);
        s = apply(q, s, { type: 'set', cell: h.cell, digit: h.digit });
      }
      expect(status(q, s).ended).toBe(true);
    }
  });
});

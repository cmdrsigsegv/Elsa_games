import { describe, expect, it } from 'vitest';
import { tierFor } from './difficulty';
import { generate } from './generate';
import { PEERS, UNITS, bit } from './grid';
import { apply, clashingCells, hint, isMistake, start, status, wrongCells } from './rules';
import { countSolutions, solve } from './solve';

const parse = (s: string) => [...s].map((ch) => (ch === '.' ? 0 : Number(ch)));

// A well-known easy puzzle and its solution.
const EASY = parse('53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79');
const EASY_SOLUTION = parse('534678912672195348198342567859761423426853791713924856961537284287419635345286179');

describe('solver', () => {
  it('solves a known puzzle', () => {
    const s = solve(EASY);
    expect(s.solved).toBe(true);
    expect(Array.from(s.values)).toEqual(EASY_SOLUTION);
  });

  it('refuses to guess: gives up when the allowed techniques run out', () => {
    // Seventeen givens: filling the last cell of a unit is nowhere near enough.
    const hard = parse('.......1.4.........2...........5.4.7..8...3....1.9....3..4..2...5.1........8.6...');
    expect(countSolutions(hard)).toBe(1);
    expect(solve(hard, 0).solved).toBe(false);
    expect(solve(hard).solved).toBe(true);
  });

  it('rejects a grid that contradicts itself', () => {
    const bad = [...EASY];
    bad[2] = 5; // a second 5 in the first row
    expect(solve(bad).solved).toBe(false);
    expect(countSolutions(bad)).toBe(0);
  });

  it('counts more than one solution when givens are missing', () => {
    expect(countSolutions(new Array(81).fill(0))).toBe(2);
  });
});

describe('generator', () => {
  const targets = [8, 20, 30, 45, 60, 73, 88];

  it('gives the same puzzle for the same seed', () => {
    expect(generate(123, 45)).toEqual(generate(123, 45));
    expect(generate(123, 45).givens).not.toEqual(generate(124, 45).givens);
  });

  it.each(targets)('makes a valid puzzle with one solution at level %i', (target) => {
    for (let seed = 1; seed <= 2; seed++) {
      const p = generate(seed * 1000 + target, target);
      for (const unit of UNITS) {
        expect(unit.map((i) => p.solution[i]).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      }
      p.givens.forEach((d, i) => expect(d === 0 || d === p.solution[i]).toBe(true));
      expect(countSolutions(p.givens)).toBe(1);
    }
  });

  it.each(targets)('never needs a harder technique than level %i allows', (target) => {
    for (let seed = 1; seed <= 2; seed++) {
      const p = generate(seed * 1000 + target, target);
      const s = solve(p.givens, tierFor(target));
      expect(s.solved).toBe(true);
      expect(Array.from(s.values)).toEqual(p.solution);
    }
  });

  it.each(targets)('lands near level %i', (target) => {
    for (let seed = 1; seed <= 2; seed++) {
      expect(Math.abs(generate(seed * 1000 + target, target).score - target)).toBeLessThanOrEqual(12);
    }
  });

  it('at the very top, makes puzzles with one solution that no technique here can finish', () => {
    let beyond = 0;
    for (let seed = 1; seed <= 4; seed++) {
      const p = generate(seed * 31, 98);
      expect(countSolutions(p.givens)).toBe(1);
      p.givens.forEach((d, i) => expect(d === 0 || d === p.solution[i]).toBe(true));
      if (!solve(p.givens).solved) {
        beyond++;
        expect(p.score).toBe(100);
      }
    }
    expect(beyond).toBeGreaterThanOrEqual(3);
  });

  it('makes harder puzzles for higher levels', () => {
    const avg = (target: number) =>
      [1, 2, 3].reduce((sum, seed) => sum + generate(seed * 77 + target, target).score, 0) / 3;
    const scores = [10, 30, 50, 70, 90].map(avg);
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThan(scores[i - 1]);
  });
});

describe('rules', () => {
  const p = generate(42, 40);
  const empty = p.givens.findIndex((d) => !d);
  const given = p.givens.findIndex((d) => d);
  const right = p.solution[empty];
  const wrong = (right % 9) + 1;

  it('never changes a given', () => {
    const s = start(p);
    expect(apply(p, s, { type: 'set', cell: given, digit: 1 })).toBe(s);
    expect(apply(p, s, { type: 'erase', cell: given })).toBe(s);
  });

  it('sets, toggles off, and erases', () => {
    const s0 = start(p);
    const s1 = apply(p, s0, { type: 'set', cell: empty, digit: right });
    expect(s1.values[empty]).toBe(right);
    expect(s0.values[empty]).toBe(0); // the old state is untouched
    expect(apply(p, s1, { type: 'set', cell: empty, digit: right }).values[empty]).toBe(0);
    expect(apply(p, s1, { type: 'erase', cell: empty }).values[empty]).toBe(0);
    expect(apply(p, s0, { type: 'erase', cell: empty })).toBe(s0);
  });

  it('keeps notes, and tidies them when a number goes in', () => {
    const peer = PEERS[empty].find((i) => !p.givens[i])!;
    let s = apply(p, start(p), { type: 'note', cell: peer, digit: right });
    s = apply(p, s, { type: 'note', cell: peer, digit: wrong });
    expect(s.notes[peer]).toBe(bit(right) | bit(wrong));
    s = apply(p, s, { type: 'set', cell: empty, digit: right });
    expect(s.notes[peer]).toBe(bit(wrong));
    // A filled cell takes no notes.
    expect(apply(p, s, { type: 'note', cell: empty, digit: 1 })).toBe(s);
  });

  it('spots mistakes', () => {
    const s = start(p);
    expect(isMistake(p, s, { type: 'set', cell: empty, digit: wrong })).toBe(true);
    expect(isMistake(p, s, { type: 'set', cell: empty, digit: right })).toBe(false);
    expect(isMistake(p, s, { type: 'note', cell: empty, digit: wrong })).toBe(false);
    expect(wrongCells(p, apply(p, s, { type: 'set', cell: empty, digit: wrong }))).toEqual([empty]);
  });

  it('tells a clash, which shows on the board, from a number that is merely wrong', () => {
    // A wrong digit that is already in the cell's row, column or box clashes; one that is not, does not.
    const seen = new Set(PEERS[empty].map((i) => p.givens[i]));
    const clashing = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => d !== right && seen.has(d))!;
    const quiet = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => d !== right && !seen.has(d));
    expect(clashingCells(p, apply(p, start(p), { type: 'set', cell: empty, digit: clashing }))).toEqual([empty]);
    if (quiet) {
      const s = apply(p, start(p), { type: 'set', cell: empty, digit: quiet });
      expect(clashingCells(p, s)).toEqual([]);
      expect(wrongCells(p, s)).toEqual([empty]);
    }
  });

  it('lists wrong numbers in the order they were entered', () => {
    const cells = p.givens.flatMap((d, i) => (d ? [] : [i])).slice(0, 3);
    let s = start(p);
    for (const cell of [cells[2], cells[0], cells[1]]) s = apply(p, s, { type: 'set', cell, digit: (p.solution[cell] % 9) + 1 });
    expect(wrongCells(p, s)).toEqual([cells[2], cells[0], cells[1]]);
  });

  it('ends only when every cell is right', () => {
    let s = start(p);
    expect(status(p, s).ended).toBe(false);
    p.solution.forEach((digit, cell) => {
      if (!p.givens[cell]) s = apply(p, s, { type: 'set', cell, digit });
    });
    expect(status(p, s).ended).toBe(true);
  });

  it('hints point at a wrong number first', () => {
    const s = apply(p, start(p), { type: 'set', cell: empty, digit: wrong });
    expect(hint(p, s)).toEqual({ cell: empty, digit: right, why: { kind: 'wrong' } });
  });

  it('following hints solves the puzzle', () => {
    for (const target of [15, 45, 88]) {
      const q = generate(900 + target, target);
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

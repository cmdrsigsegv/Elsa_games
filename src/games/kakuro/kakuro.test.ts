import { describe, expect, it } from 'vitest';
import { score, sideFor, tierFor } from './difficulty';
import { generate, type KakuroPuzzle } from './generate';
import { bit, layoutFault, layoutOf, sumsOf } from './layout';
import { apply, breaks, layoutFor, runMates, start, status, type KakuroState } from './rules';
import { countSolutions, settle, solve } from './solve';

/** A grid from rows of text: a digit is a white cell with that answer, '#' a black one. */
const parse = (rows: string[]) => rows.flatMap((row) => [...row].map((ch) => (ch === '#' ? 0 : Number(ch))));

// Two by two, and solvable from the table alone: 3 across meets 4 down only at 1.
const TINY = parse(['###', '#12', '#34']);
// The same digits arranged so that swapping them gives the same four sums.
const TWINS = parse(['###', '#12', '#21']);

const laidOut = (p: KakuroPuzzle) => {
  const layout = layoutOf(p.size, p.solution);
  return { layout, sums: sumsOf(layout, p.solution) };
};

describe('layout', () => {
  it('finds the runs and where their clues go', () => {
    const layout = layoutOf(3, TINY);
    expect(layout.runs.map((r) => [r.across, r.clueAt, r.cells])).toEqual([
      [true, 3, [4, 5]],
      [true, 6, [7, 8]],
      [false, 1, [4, 7]],
      [false, 2, [5, 8]],
    ]);
    expect(sumsOf(layout, TINY)).toEqual([3, 7, 4, 6]);
    expect(layoutFault(layout)).toBeNull();
  });

  it('names what is wrong with a bad grid', () => {
    const fault = (rows: string[]) => layoutFault(layoutOf(rows.length, parse(rows)));
    expect(fault(['###', '#1#', '###'])).toBe('run of one cell');
    expect(fault(['#####', '#12##', '#34##', '#####', '#####'])).toBeNull();
    expect(fault(['######', '#12###', '#34###', '######', '####12', '####34'])).toBe('white cells in separate groups');
    expect(fault(['12', '34'])).toBe('white cell on the clue edge');
    const wide = ['#'.repeat(11), '#' + '1'.repeat(10), '#' + '2'.repeat(10)];
    while (wide.length < 11) wide.push('#'.repeat(11));
    expect(fault(wide)).toBe('run longer than nine');
  });
});

describe('solver', () => {
  it('solves a small puzzle with the easiest technique', () => {
    const layout = layoutOf(3, TINY);
    const s = solve(layout, sumsOf(layout, TINY));
    expect(s.solved).toBe(true);
    expect(s.values).toEqual(TINY);
    expect(s.hardest).toBe(1);
    expect(countSolutions(layout, sumsOf(layout, TINY))).toBe(1);
  });

  it('refuses to guess when there are two answers', () => {
    const layout = layoutOf(3, TWINS);
    const sums = sumsOf(layout, TWINS);
    expect(countSolutions(layout, sums)).toBe(2);
    expect(solve(layout, sums).solved).toBe(false);
  });

  it('rejects clues that cannot be met', () => {
    const layout = layoutOf(3, TINY);
    // 17 in two cells is 8 and 9, which 3 across cannot hold.
    expect(solve(layout, [3, 7, 17, 6]).solved).toBe(false);
    expect(countSolutions(layout, [3, 7, 17, 6])).toBe(0);
  });

  it('gives up when the techniques allowed run out', () => {
    const p = generate(11, 100);
    const { layout, sums } = laidOut(p);
    const full = solve(layout, sums);
    expect(full.solved).toBe(true);
    expect(full.hardest).toBeGreaterThan(2);
    expect(solve(layout, sums, full.hardest - 1).solved).toBe(false);
  });

  it('ends in the same place whether or not it keeps count of techniques', () => {
    const { layout, sums } = laidOut(generate(5, 80));
    for (let tier = 1; tier <= 6; tier++) {
      expect(Array.from(settle(layout, sums, tier).cands)).toEqual(Array.from(solve(layout, sums, tier).cands));
    }
  });
});

describe('generator', () => {
  const targets = [40, 60, 80, 100];
  const made = new Map<string, KakuroPuzzle>();
  const make = (seed: number, target: number) => {
    const key = `${seed}:${target}`;
    if (!made.has(key)) made.set(key, generate(seed, target));
    return made.get(key)!;
  };
  const seedsFor = (target: number) => [1000 + target, 2000 + target, 3000 + target];

  it('gives the same puzzle for the same seed', () => {
    expect(generate(123, 60)).toEqual(generate(123, 60));
    expect(generate(123, 60).solution).not.toEqual(generate(124, 60).solution);
    expect(generate(123, 60).seed).toBe(123);
  });

  it.each(targets)('lays out a proper grid at level %i', (target) => {
    for (const seed of seedsFor(target)) {
      const p = make(seed, target);
      const { layout } = laidOut(p);
      expect(layoutFault(layout)).toBeNull();
      for (const run of layout.runs) {
        expect(run.cells.length).toBeGreaterThanOrEqual(2);
        expect(run.cells.length).toBeLessThanOrEqual(9);
      }
      // Every white cell is in one run each way, so none stands alone.
      p.solution.forEach((d, i) => {
        if (d) expect(layout.acrossOf[i] >= 0 && layout.downOf[i] >= 0).toBe(true);
      });
      // The same pattern after half a turn of the white part.
      const n = p.size;
      for (let r = 1; r < n; r++) {
        for (let c = 1; c < n; c++) expect(!p.solution[r * n + c]).toBe(!p.solution[(n - r) * n + (n - c)]);
      }
    }
  });

  it.each(targets)('gives clues that match the solution at level %i', (target) => {
    for (const seed of seedsFor(target)) {
      const p = make(seed, target);
      const { layout } = laidOut(p);
      let clues = 0;
      for (const run of layout.runs) {
        const digits = run.cells.map((c) => p.solution[c]);
        expect(digits.every((d) => d >= 1 && d <= 9)).toBe(true);
        expect(new Set(digits).size).toBe(digits.length);
        expect((run.across ? p.across : p.down)[run.clueAt]).toBe(digits.reduce((a, b) => a + b, 0));
        clues++;
      }
      // No clue without a run, and none in a white cell.
      expect([...p.across, ...p.down].filter(Boolean).length).toBe(clues);
      p.solution.forEach((d, i) => {
        if (d) expect(p.across[i] + p.down[i]).toBe(0);
      });
    }
  });

  it.each(targets)('has exactly one solution at level %i, by brute force', (target) => {
    for (const seed of seedsFor(target)) {
      const { layout, sums } = laidOut(make(seed, target));
      expect(countSolutions(layout, sums)).toBe(1);
    }
  });

  it.each(targets)('never needs a harder technique than level %i allows', (target) => {
    for (const seed of seedsFor(target)) {
      const p = make(seed, target);
      const { layout, sums } = laidOut(p);
      const s = solve(layout, sums, tierFor(target));
      expect(s.solved).toBe(true);
      expect(s.values).toEqual(p.solution);
    }
  });

  it.each(targets)('scores honestly and lands near level %i', (target) => {
    for (const seed of seedsFor(target)) {
      const p = make(seed, target);
      const { layout, sums } = laidOut(p);
      expect(p.score).toBe(score(solve(layout, sums), p.size - 1));
      expect(Math.abs(p.score - target)).toBeLessThanOrEqual(15);
    }
  });

  it('also works below the levels the app asks for', () => {
    for (const target of [0, 20]) {
      const p = generate(7, target);
      const { layout, sums } = laidOut(p);
      expect(layoutFault(layout)).toBeNull();
      expect(countSolutions(layout, sums)).toBe(1);
    }
  });

  it('makes bigger grids for higher levels', () => {
    expect(sideFor(40)).toBe(7);
    expect(sideFor(100)).toBe(13);
    const sizes = targets.map((target) => make(seedsFor(target)[0], target).size);
    expect(sizes).toEqual([8, 10, 12, 14]);
    const whites = targets.map((target) => make(seedsFor(target)[0], target).solution.filter(Boolean).length);
    for (let i = 1; i < whites.length; i++) expect(whites[i]).toBeGreaterThan(whites[i - 1]);
  });

  it('makes puzzles that need harder techniques for higher levels', () => {
    const average = (target: number, of: (p: KakuroPuzzle) => number) =>
      seedsFor(target).reduce((sum, seed) => sum + of(make(seed, target)), 0) / seedsFor(target).length;
    const hardest = (p: KakuroPuzzle) => {
      const { layout, sums } = laidOut(p);
      return solve(layout, sums).hardest;
    };
    const tiers = targets.map((target) => average(target, hardest));
    const scores = targets.map((target) => average(target, (p) => p.score));
    for (let i = 1; i < targets.length; i++) {
      expect(tiers[i]).toBeGreaterThan(tiers[i - 1]);
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
    // The top level needs every filling of a run gone through; the bottom one only the table.
    expect(tiers[0]).toBeLessThanOrEqual(2);
    expect(tiers[3]).toBeGreaterThanOrEqual(5);
  });
});

describe('rules', () => {
  const p = generate(42, 40);
  const layout = layoutFor(p);
  const white = p.solution.findIndex((d) => d);
  const black = p.solution.findIndex((d) => !d);
  const right = p.solution[white];
  const wrong = (right % 9) + 1;
  const solved = (): KakuroState => {
    let s = start(p);
    p.solution.forEach((digit, cell) => {
      if (digit) s = apply(p, s, { type: 'set', cell, digit });
    });
    return s;
  };

  it('starts empty', () => {
    const s = start(p);
    expect(s.values.every((d) => d === 0)).toBe(true);
    expect(s.values.length).toBe(p.size * p.size);
    expect(breaks(p, s)).toEqual({ repeats: [], across: [], down: [] });
  });

  it('never changes a black cell', () => {
    const s = start(p);
    expect(apply(p, s, { type: 'set', cell: black, digit: 1 })).toBe(s);
    expect(apply(p, s, { type: 'note', cell: black, digit: 1 })).toBe(s);
    expect(apply(p, s, { type: 'erase', cell: black })).toBe(s);
  });

  it('sets, toggles off, and erases', () => {
    const s0 = start(p);
    const s1 = apply(p, s0, { type: 'set', cell: white, digit: right });
    expect(s1.values[white]).toBe(right);
    expect(s0.values[white]).toBe(0); // the old state is untouched
    expect(apply(p, s1, { type: 'set', cell: white, digit: right }).values[white]).toBe(0);
    expect(apply(p, s1, { type: 'erase', cell: white }).values[white]).toBe(0);
    expect(apply(p, s0, { type: 'erase', cell: white })).toBe(s0);
  });

  it('keeps notes, and tidies them when a number goes in', () => {
    const mate = runMates(p, white).find((c) => c !== white)!;
    // A cell that shares no run with `white` keeps its notes.
    const stranger = p.solution.findIndex((d, i) => d && !runMates(p, white).includes(i));
    let s = apply(p, start(p), { type: 'note', cell: mate, digit: right });
    s = apply(p, s, { type: 'note', cell: mate, digit: wrong });
    s = apply(p, s, { type: 'note', cell: stranger, digit: right });
    expect(s.notes[mate]).toBe(bit(right) | bit(wrong));
    s = apply(p, s, { type: 'set', cell: white, digit: right });
    expect(s.notes[mate]).toBe(bit(wrong));
    expect(s.notes[stranger]).toBe(bit(right));
    // A filled cell takes no notes.
    expect(apply(p, s, { type: 'note', cell: white, digit: 1 })).toBe(s);
  });

  it('marks a number repeated in a run, and nothing else about it', () => {
    const run = layout.runs[layout.acrossOf[white]];
    const [a, b] = run.cells;
    let s = apply(p, start(p), { type: 'set', cell: a, digit: 1 });
    expect(breaks(p, s).repeats).toEqual([]);
    s = apply(p, s, { type: 'set', cell: b, digit: 1 });
    expect(breaks(p, s).repeats).toEqual([a, b]);
  });

  it('does not mark a number that is merely wrong', () => {
    // 1 where the answer is something else, or 2 where it is 1: wrong, but
    // with the rest of its runs empty and clues of 3 or more, nothing shows.
    const s = apply(p, start(p), { type: 'set', cell: white, digit: right === 1 ? 2 : 1 });
    expect(status(p, s).ended).toBe(false);
    expect(breaks(p, s)).toEqual({ repeats: [], across: [], down: [] });
  });

  it('marks a full run with the wrong sum, by its clue', () => {
    const run = layout.runs.find((r) => r.across && r.cells.length === 2)!;
    const [a, b] = run.cells;
    const clue = p.across[run.clueAt];
    // Two different digits that do not make the clue.
    const first = clue === 3 ? 2 : 1;
    const second = clue === first + 2 ? 3 : 2;
    let s = apply(p, start(p), { type: 'set', cell: a, digit: first });
    s = apply(p, s, { type: 'set', cell: b, digit: second === first ? 4 : second });
    const found = breaks(p, s);
    expect(found.across).toEqual([run.clueAt]);
    expect(found.repeats).toEqual([]);
  });

  it('marks a run that has reached its sum with cells still empty', () => {
    const run = layout.runs.find((r) => !r.across && p.down[r.clueAt] <= 9)!;
    const s = apply(p, start(p), { type: 'set', cell: run.cells[0], digit: p.down[run.clueAt] });
    expect(breaks(p, s).down).toEqual([run.clueAt]);
    const under = apply(p, start(p), { type: 'set', cell: run.cells[0], digit: p.down[run.clueAt] - 1 });
    expect(breaks(p, under).down).toEqual([]);
  });

  it('ends only when every cell is right, and then nothing is marked', () => {
    const s = solved();
    expect(status(p, start(p)).ended).toBe(false);
    expect(status(p, s).ended).toBe(true);
    expect(breaks(p, s)).toEqual({ repeats: [], across: [], down: [] });
    expect(status(p, apply(p, s, { type: 'erase', cell: white })).ended).toBe(false);
  });
});

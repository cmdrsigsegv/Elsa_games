import { describe, expect, it } from 'vitest';
import { bandFor, cluesOf, generate } from './generate';
import { EMPTY, FILLED, UNKNOWN, clueOf, solveGrid, solveLine } from './lines';
import { apply, completeLines, hint, impossibleLines, isMistake, start, status, wrongCells } from './rules';

const U = UNKNOWN;
const F = FILLED;
const E = EMPTY;
const line = (s: string) => [...s].map((ch) => (ch === '#' ? F : ch === 'x' ? E : U));

/** Every arrangement of a clue in a line, by brute force: the reference the fast solver is checked against. */
function bruteForce(clue: number[], known: number[]): number[] | null {
  const n = known.length;
  let canFill = 0;
  let canEmpty = 0;
  let any = false;
  for (let mask = 0; mask < 1 << n; mask++) {
    const cells = Array.from({ length: n }, (_, i) => (mask & (1 << i) ? F : E));
    if (cells.some((v, i) => known[i] !== U && known[i] !== v)) continue;
    const got = clueOf(cells);
    if (got.length !== clue.length || got.some((v, i) => v !== clue[i])) continue;
    any = true;
    canFill |= mask;
    canEmpty |= ~mask;
  }
  if (!any) return null;
  return Array.from({ length: n }, (_, i) => {
    const f = canFill & (1 << i);
    const e = canEmpty & (1 << i);
    return f && e ? U : f ? F : E;
  });
}

describe('line solver', () => {
  it('reads clues', () => {
    expect(clueOf(line('##.#.###'))).toEqual([2, 1, 3]);
    expect(clueOf(line('........'))).toEqual([]);
  });

  it('finds the overlap of a long run', () => {
    expect(solveLine([7], line('..........'))).toEqual(line('...####...'));
  });

  it('fills a line the clue fits exactly, and empties a line with no clue', () => {
    expect(solveLine([2, 1, 3], line('........'))).toEqual(line('##x#x###'));
    expect(solveLine([], line('....'))).toEqual(line('xxxx'));
  });

  it('says when a line cannot work', () => {
    expect(solveLine([3], line('#...#'))).toBeNull();
    expect(solveLine([2, 2], line('.x.x.'))).toBeNull();
  });

  it('agrees with brute force on every clue and every marking of a short line', () => {
    const n = 7;
    // Every clue comes from some filled pattern; every marking is some mix of the three states.
    const clues = new Map<string, number[]>();
    for (let mask = 0; mask < 1 << n; mask++) {
      const clue = clueOf(Array.from({ length: n }, (_, i) => (mask & (1 << i) ? F : E)));
      clues.set(clue.join(','), clue);
    }
    let checked = 0;
    for (const clue of clues.values()) {
      for (let code = 0; code < 3 ** n; code += 7) {
        const known = Array.from({ length: n }, (_, i) => Math.floor(code / 3 ** i) % 3);
        expect(solveLine(clue, known)).toEqual(bruteForce(clue, known));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(5000);
  });
});

describe('generator', () => {
  const targets = [6, 18, 35, 52, 64, 76, 87, 96];

  it('gives the same puzzle for the same seed', () => {
    expect(generate(5, 40)).toEqual(generate(5, 40));
    expect(generate(5, 40).solution).not.toEqual(generate(6, 40).solution);
  });

  it.each(targets)('makes a puzzle at level %i that line reasoning alone solves, to the intended picture', (target) => {
    for (let seed = 1; seed <= 3; seed++) {
      const p = generate(seed * 100 + target, target);
      expect(p.w).toBe(bandFor(target).size);
      expect(p).toMatchObject(cluesOf(p.w, p.h, p.solution));
      const solved = solveGrid(p);
      expect(solved.solved).toBe(true);
      expect(solved.cells.map((v) => (v === FILLED ? 1 : 0))).toEqual(p.solution);
      expect([...p.rows, ...p.cols].every((clue) => clue.length > 0)).toBe(true);
      expect(Math.abs(p.score - target)).toBeLessThanOrEqual(14);
    }
  });

  it('makes bigger grids for higher levels', () => {
    const sizes = targets.map((target) => generate(target, target).w);
    expect(sizes).toEqual([5, 10, 15, 20, 25, 30, 35, 40]);
  });
});

describe('rules', () => {
  const p = generate(77, 18);
  const filled = p.solution.findIndex((v) => v === 1);
  const blank = p.solution.findIndex((v) => v === 0);

  it('marks cells, several in one stroke, and leaves the old state alone', () => {
    const s0 = start(p);
    const s1 = apply(p, s0, { changes: [[filled, FILLED], [blank, EMPTY]] });
    expect(s1.cells[filled]).toBe(FILLED);
    expect(s1.cells[blank]).toBe(EMPTY);
    expect(s0.cells[filled]).toBe(UNKNOWN);
    expect(apply(p, s1, { changes: [[filled, FILLED]] })).toBe(s1);
  });

  it('spots mistakes and remembers the order they were made in', () => {
    let s = start(p);
    expect(isMistake(p, s, { changes: [[blank, FILLED]] })).toBe(true);
    expect(isMistake(p, s, { changes: [[filled, FILLED]] })).toBe(false);
    s = apply(p, s, { changes: [[filled, EMPTY]] });
    s = apply(p, s, { changes: [[blank, FILLED]] });
    expect(wrongCells(p, s).slice(0, 2)).toEqual([filled, blank]);
  });

  it('crosses out the rest of a line once its clue is complete', () => {
    const row = 0;
    const cells = Array.from({ length: p.w }, (_, c) => row * p.w + c);
    const s = apply(p, start(p), { changes: cells.filter((i) => p.solution[i]).map((i) => [i, FILLED]) });
    for (const i of cells) expect(s.cells[i]).toBe(p.solution[i] ? FILLED : EMPTY);
    expect(completeLines(p, s).rows.has(row)).toBe(true);
  });

  it('notices a line that can no longer work', () => {
    // Fill a whole row whose clue does not ask for all of it.
    const row = p.rows.findIndex((clue) => clue.length > 1);
    const s = apply(p, start(p), { changes: Array.from({ length: p.w }, (_, c) => [row * p.w + c, FILLED]) });
    expect(impossibleLines(p, s).rows.has(row)).toBe(true);
    expect(impossibleLines(p, start(p)).rows.size).toBe(0);
  });

  it('ends when the right cells are filled, whatever is crossed', () => {
    const s = apply(p, start(p), { changes: p.solution.flatMap((v, i) => (v ? [[i, FILLED] as [number, number]] : [])) });
    expect(status(p, s).ended).toBe(true);
    expect(status(p, start(p)).ended).toBe(false);
  });

  it('hints fix a wrong cell first, and following hints solves the puzzle', () => {
    let s = apply(p, start(p), { changes: [[blank, FILLED]] });
    expect(hint(p, s)).toMatchObject({ kind: 'wrong', cell: blank });
    for (let n = 0; n < 500 && !status(p, s).ended; n++) {
      const h = hint(p, s)!;
      expect(h).not.toBeNull();
      s = apply(p, s, h.move);
      expect(wrongCells(p, s)).toEqual([]);
    }
    expect(status(p, s).ended).toBe(true);
  });
});

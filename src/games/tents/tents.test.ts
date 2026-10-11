import { describe, expect, it } from 'vitest';
import { bandFor, generate } from './generate';
import {
  EMPTY,
  GRASS,
  TENT,
  apply,
  around,
  beside,
  clueLooks,
  paired,
  start,
  status,
  strandedTents,
  sweep,
  tap,
  tentsOf,
  touchingTents,
  unpaired,
  type TentsPuzzle,
  type TentsState,
} from './rules';
import { solve } from './solve';

/** A puzzle from a picture: T is a tree, anything else is bare ground. */
function puzzle(rows: number[], cols: number[], ...picture: string[]): TentsPuzzle {
  const trees = [...picture.join('')].map((ch) => (ch === 'T' ? 1 : 0));
  return { seed: 0, score: 0, w: picture[0].length, h: picture.length, trees, rows, cols };
}

const withTents = (p: TentsPuzzle, tents: number[]): TentsState =>
  apply(p, start(p), { changes: tents.map((cell) => [cell, TENT]) });

const cluesMet = (p: TentsPuzzle, s: TentsState) => {
  const looks = clueLooks(p, s);
  return [...looks.rows, ...looks.cols].every((look) => look === 'done');
};

/**
 * Every solution, found by trying each cell with and without a tent: the
 * reference the step-by-step solver is checked against. It shares nothing
 * with that solver except the pairing check.
 */
function bruteForce(p: TentsPuzzle, limit = 2): number[][] {
  const { w, h } = p;
  const found: number[][] = [];
  const tent = new Array<boolean>(w * h).fill(false);
  const rowLeft = [...p.rows];
  const colLeft = [...p.cols];
  const hasTent = (cell: number) => beside(p, cell).some((b) => tent[b]);
  const go = (cell: number) => {
    if (found.length >= limit) return;
    if (cell === w * h) {
      const tents = tent.flatMap((on, i) => (on ? [i] : []));
      // The last row and the columns were only checked for room, not for being full.
      if (cluesMet(p, withTents(p, tents)) && paired(p, tents)) found.push(tents);
      return;
    }
    const r = Math.floor(cell / w);
    const c = cell % w;
    if (c === 0 && r > 0) {
      // A finished row must have met its clue, and the trees two rows up have all their neighbours settled.
      if (rowLeft[r - 1] !== 0) return;
      if (r > 1) for (let i = (r - 2) * w; i < (r - 1) * w; i++) if (p.trees[i] && !hasTent(i)) return;
    }
    // The tents still owed to this row and column must fit in what is left of them.
    if (rowLeft[r] > Math.ceil((w - c) / 2) || colLeft[c] > Math.ceil((h - r) / 2)) return;
    const free = !p.trees[cell] && beside(p, cell).some((b) => p.trees[b]) && !around(p, cell).some((a) => tent[a]);
    if (free && rowLeft[r] > 0 && colLeft[c] > 0) {
      tent[cell] = true;
      rowLeft[r]--;
      colLeft[c]--;
      go(cell + 1);
      tent[cell] = false;
      rowLeft[r]++;
      colLeft[c]++;
    }
    go(cell + 1);
  };
  go(0);
  return found;
}

// Three trees. With a tent at 1, 3 and 12 every clue is met and every tree
// has a tent beside it, but the two lower trees would have to share one.
const shared = puzzle([2, 0, 1], [0, 1, 1, 1, 0], '..T..', '.....', '.T.T.');

describe('rules', () => {
  const p = puzzle([1, 0, 2], [1, 1, 0, 0, 1], '..T..', '.....', '.T.T.');

  it('steps a cell from empty to tent to grass and back', () => {
    const s0 = start(p);
    const s1 = apply(p, s0, tap(p, s0, 0));
    const s2 = apply(p, s1, tap(p, s1, 0));
    const s3 = apply(p, s2, tap(p, s2, 0));
    expect([s0, s1, s2, s3].map((s) => s.cells[0])).toEqual([EMPTY, TENT, GRASS, EMPTY]);
    expect(s3.moves).toBe(3);
  });

  it('leaves trees alone', () => {
    const s = start(p);
    expect(apply(p, s, tap(p, s, 2))).toBe(s);
    expect(apply(p, s, { changes: [[2, TENT]] })).toBe(s);
    expect(apply(p, s, sweep(p, s, [2]))).toBe(s);
  });

  it('returns the same state when nothing changes', () => {
    const s = start(p);
    expect(apply(p, s, { changes: [[0, EMPTY]] })).toBe(s);
    expect(apply(p, s, { changes: [[99, TENT]] })).toBe(s);
    expect(apply(p, s, { changes: [] })).toBe(s);
  });

  it('marks a dragged run as grass in one move, sparing tents and trees', () => {
    const s0 = withTents(p, [1]);
    const s1 = apply(p, s0, sweep(p, s0, [0, 1, 2, 3, 4]));
    expect(s1.cells.slice(0, 5)).toEqual([GRASS, TENT, EMPTY, GRASS, GRASS]);
    expect(s1.moves).toBe(s0.moves + 1);
    // A drag that begins on grass clears grass instead, again in one move.
    const s2 = apply(p, s1, sweep(p, s1, [4, 3, 1, 0]));
    expect(s2.cells.slice(0, 5)).toEqual([EMPTY, TENT, EMPTY, EMPTY, EMPTY]);
    expect(s2.moves).toBe(s1.moves + 1);
  });

  it('sees tents that touch, also at a corner', () => {
    expect([...touchingTents(p, withTents(p, [1, 7, 14]))].sort()).toEqual([1, 7]);
    expect([...touchingTents(p, withTents(p, [3, 4]))].sort()).toEqual([3, 4]);
    expect(touchingTents(p, withTents(p, [1, 10, 14])).size).toBe(0);
  });

  it('sees a tent with no tree beside it', () => {
    // Cells 5 and 9 only touch trees at a corner, which does not count.
    expect([...strandedTents(p, withTents(p, [1, 5, 9]))].sort()).toEqual([5, 9]);
  });

  it('dims a clue that is met and warns on one that cannot be', () => {
    const looks = clueLooks(p, withTents(p, [1, 3]));
    expect(looks.rows).toEqual(['wrong', 'done', 'open']); // two tents where one belongs
    expect(looks.cols).toEqual(['open', 'done', 'done', 'wrong', 'open']);
    // Grass over the whole bottom row leaves no room for its two tents.
    const s = start(p);
    expect(clueLooks(p, apply(p, s, sweep(p, s, [10, 12, 14]))).rows[2]).toBe('wrong');
  });

  it('is finished when every rule is kept, whatever the grass', () => {
    const s = withTents(p, [1, 10, 14]);
    expect(status(p, s).ended).toBe(true);
    expect(status(p, apply(p, s, sweep(p, s, [5, 6, 7]))).ended).toBe(true);
    expect(status(p, withTents(p, [1, 10])).ended).toBe(false);
    expect(status(p, start(p)).ended).toBe(false);
  });

  it('wants a tent of its own for every tree, not just a tent nearby', () => {
    const s = withTents(shared, [1, 3, 12]);
    expect(cluesMet(shared, s)).toBe(true);
    expect(touchingTents(shared, s).size + strandedTents(shared, s).size).toBe(0);
    expect(paired(shared, tentsOf(s))).toBe(false);
    expect(unpaired(shared, s)).toBe(true);
    expect(status(shared, s).ended).toBe(false);
    // Here the first tree reaches for a tent the second one needs, and has to take its other one.
    expect(paired(puzzle([0, 2, 0], [1, 0, 1], '...', '.T.', 'T..'), [3, 5])).toBe(true);
  });
});

describe('solver', () => {
  it('will not finish a puzzle with two solutions', () => {
    const twin = puzzle([1, 0, 1], [1, 0, 1], '.T.', '...', '.T.');
    expect(bruteForce(twin, 5).length).toBe(2);
    expect(solve(twin).solved).toBe(false);
  });

  it('says so when the clues cannot be met', () => {
    expect(solve(puzzle([1, 0, 0], [0, 1, 0], '.T.', '...', '...')).solved).toBe(false);
    expect(bruteForce(shared).length).toBe(0);
    expect(solve(shared).solved).toBe(false);
  });

  it('agrees with brute force: one solution, and the same one', () => {
    for (const level of [0, 20, 40, 50, 60, 70, 80, 90]) {
      for (let seed = 1; seed <= 4; seed++) {
        const p = generate(seed * 131 + level, level);
        const all = bruteForce(p);
        expect(all.length).toBe(1);
        expect(solve(p).tents).toEqual(all[0]);
      }
    }
  });

  it('needs its deeper steps on harder puzzles', () => {
    const middling = generate(5, 55);
    expect(solve(middling, 3).solved).toBe(true);
    expect(solve(middling, 2).solved).toBe(false);
    const hard = generate(5, 100);
    expect(solve(hard, 4).solved).toBe(true);
    expect(solve(hard, 3).solved).toBe(false);
  });
});

describe('generator', () => {
  it('gives the same puzzle for the same seed', () => {
    expect(generate(8, 70)).toEqual(generate(8, 70));
    expect(generate(8, 70).trees).not.toEqual(generate(9, 70).trees);
  });

  it.each([40, 60, 80, 100])('makes a fair puzzle with one solution at level %i', (level) => {
    for (let seed = 1; seed <= 3; seed++) {
      const p = generate(seed * 17 + level, level);
      const band = bandFor(level);
      expect([p.w, p.h]).toEqual([band.w, band.h]);
      expect(p.seed).toBe(seed * 17 + level);
      expect(p.trees.length).toBe(p.w * p.h);
      // As many tents as trees, counted along the rows and along the columns.
      const trees = p.trees.reduce((sum, t) => sum + t, 0);
      expect(p.rows.reduce((sum, n) => sum + n, 0)).toBe(trees);
      expect(p.cols.reduce((sum, n) => sum + n, 0)).toBe(trees);
      // Solvable with only the steps its level allows, and not without the deepest of them.
      const solution = solve(p, band.depth, band.ways);
      expect(solution.solved).toBe(true);
      expect(solution.depth).toBe(band.depth);
      expect(p.score).toBeGreaterThanOrEqual(band.from);
      expect(p.score).toBeLessThanOrEqual(100);
      expect(Math.abs(p.score - level)).toBeLessThanOrEqual(3);
      // Playing the solution finishes the game with nothing marked as broken.
      const s = withTents(p, solution.tents);
      expect(status(p, s).ended).toBe(true);
      expect(touchingTents(p, s).size + strandedTents(p, s).size).toBe(0);
      expect(status(p, start(p)).ended).toBe(false);
      expect(bruteForce(p)).toEqual([solution.tents]);
    }
  });

  it('makes bigger and harder puzzles at higher levels', () => {
    const levels = [40, 50, 60, 70, 80, 90, 100];
    const made = levels.map((level) => generate(3, level));
    for (let i = 1; i < made.length; i++) {
      expect(made[i].w * made[i].h).toBeGreaterThan(made[i - 1].w * made[i - 1].h);
      expect(made[i].score).toBeGreaterThan(made[i - 1].score);
      expect(bandFor(levels[i]).depth).toBeGreaterThanOrEqual(bandFor(levels[i - 1]).depth);
    }
    expect([made[0].w, made[0].h]).toEqual([8, 8]);
    expect(made[6].w).toBeGreaterThanOrEqual(16);
    expect(made[6].h).toBeGreaterThanOrEqual(16);
    expect(bandFor(40).depth).toBe(2);
    expect(bandFor(100).depth).toBe(4);
  });

  it('is quick at every level', () => {
    let worst = 0;
    for (let level = 40; level <= 100; level += 4) {
      for (let seed = 1; seed <= 5; seed++) {
        const began = performance.now();
        generate(seed * 7919 + level, level);
        worst = Math.max(worst, performance.now() - began);
      }
    }
    expect(worst).toBeLessThan(1500);
  });
});

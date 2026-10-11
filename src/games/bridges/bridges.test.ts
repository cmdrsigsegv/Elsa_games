import { describe, expect, it } from 'vitest';
import { effort, effortFor, generate, sizeFor } from './generate';
import { across, apply, blocked, counts, crosses, joined, linksOf, solved, start, status, type BridgesPuzzle, type Island } from './rules';
import { countSolutions, solve } from './solve';

const puzzle = (cols: number, rows: number, islands: Island[]): BridgesPuzzle => {
  const links = linksOf(islands);
  return { seed: 0, score: 0, cols, rows, islands, links, solution: links.map(() => 0) };
};

// A plus sign: the link across the middle and the link down the middle cross.
//   . 1 .
//   1 . 1
//   . 1 .
const plus = puzzle(3, 3, [
  { x: 1, y: 0, need: 1 },
  { x: 0, y: 1, need: 1 },
  { x: 2, y: 1, need: 1 },
  { x: 1, y: 2, need: 1 },
]);

// A row of three: 1 - 2 - 1.
const row = puzzle(5, 1, [
  { x: 0, y: 0, need: 1 },
  { x: 2, y: 0, need: 2 },
  { x: 4, y: 0, need: 1 },
]);

describe('rules', () => {
  it('links each island to the next one across and the next one down, and no further', () => {
    expect(row.links).toEqual([
      { a: 0, b: 1 },
      { a: 1, b: 2 },
    ]);
    expect(plus.links).toEqual([
      { a: 0, b: 3 },
      { a: 1, b: 2 },
    ]);
  });

  it('cycles a link through none, one and two bridges, and leaves the old state alone', () => {
    const s0 = start(row);
    const s1 = apply(row, s0, { link: 0 });
    const s2 = apply(row, s1, { link: 0 });
    const s3 = apply(row, s2, { link: 0 });
    expect([s0, s1, s2, s3].map((s) => s.bridges[0])).toEqual([0, 1, 2, 0]);
    expect(s0.bridges).toEqual([0, 0]);
    expect(apply(row, s0, { link: 7 })).toBe(s0); // no such link
  });

  it('refuses a bridge that would cross another', () => {
    expect(crosses(plus.islands, plus.links[0], plus.links[1])).toBe(true);
    const s1 = apply(plus, start(plus), { link: 0 });
    expect(blocked(plus, s1.bridges, 1)).toBe(true);
    expect(apply(plus, s1, { link: 1 })).toBe(s1);
    // Once the first is taken away again, the other can be built.
    const s2 = apply(plus, apply(plus, s1, { link: 0 }), { link: 0 });
    expect(apply(plus, s2, { link: 1 }).bridges).toEqual([0, 1]);
  });

  it('counts the bridges on each island, too many included', () => {
    const s = apply(row, apply(row, start(row), { link: 0 }), { link: 0 });
    expect(counts(row, s.bridges)).toEqual([2, 2, 0]);
  });

  it('ends only when every island has its number', () => {
    let s = apply(row, start(row), { link: 0 });
    expect(status(row, s).ended).toBe(false);
    s = apply(row, s, { link: 1 });
    expect(status(row, s).ended).toBe(true);
  });

  it('does not end while the islands are in separate groups', () => {
    // Two pairs, one above the other: every number can be met without joining them.
    const pairs = puzzle(3, 3, [
      { x: 0, y: 0, need: 2 },
      { x: 2, y: 0, need: 2 },
      { x: 0, y: 2, need: 2 },
      { x: 2, y: 2, need: 2 },
    ]);
    const apart = pairs.links.map((link) => (across(pairs.islands, link) ? 2 : 0));
    expect(counts(pairs, apart)).toEqual([2, 2, 2, 2]);
    expect(joined(pairs, apart)).toBe(false);
    expect(solved(pairs, apart)).toBe(false);
    expect(solved(pairs, [1, 1, 1, 1])).toBe(true);
  });
});

describe('solver', () => {
  it('solves by counting alone when the numbers force everything', () => {
    const result = solve(row.islands, row.links);
    expect(result.solved).toBe(true);
    expect(result.bridges).toEqual([1, 1]);
    expect(result.steps.slice(1)).toEqual([0, 0]);
  });

  it('knows a group may not close itself off', () => {
    //   1 . 1      The two 1s may not join each other: they would be a
    //   . . .      group of their own, cut off from the 2s. Counting alone
    //   2 . 2      cannot see that.
    const p = puzzle(3, 3, [
      { x: 0, y: 0, need: 1 },
      { x: 2, y: 0, need: 1 },
      { x: 0, y: 2, need: 2 },
      { x: 2, y: 2, need: 2 },
    ]);
    expect(solve(p.islands, p.links, 0).solved).toBe(false);
    const result = solve(p.islands, p.links, 1);
    expect(result.solved).toBe(true);
    expect(result.bridges).toEqual([0, 1, 1, 1]);
    expect(countSolutions(p.islands, p.links)).toBe(1);
  });

  it('does not claim a puzzle with two solutions', () => {
    // A square of 2s has one solution, a single bridge on every side: double
    // bridges on two opposite sides would leave two groups. A square of 3s
    // has two: the double bridges can sit on either pair of opposite sides.
    const square = (need: number) =>
      puzzle(3, 3, [
        { x: 0, y: 0, need },
        { x: 2, y: 0, need },
        { x: 0, y: 2, need },
        { x: 2, y: 2, need },
      ]);
    expect(countSolutions(square(2).islands, square(2).links)).toBe(1);
    expect(solve(square(2).islands, square(2).links).solved).toBe(true);
    expect(countSolutions(square(3).islands, square(3).links)).toBe(2);
    expect(solve(square(3).islands, square(3).links).solved).toBe(false);
  });

  it('says so when the numbers cannot be met', () => {
    const bad = puzzle(3, 1, [
      { x: 0, y: 0, need: 1 },
      { x: 2, y: 0, need: 2 },
    ]);
    expect(solve(bad.islands, bad.links).solved).toBe(false);
    expect(countSolutions(bad.islands, bad.links)).toBe(0);
  });
});

describe('generator', () => {
  it('gives the same puzzle for the same seed', () => {
    expect(generate(8, 60)).toEqual(generate(8, 60));
    expect(generate(8, 60).islands).not.toEqual(generate(9, 60).islands);
  });

  it.each([40, 60, 80, 100])('makes a proper puzzle with one solution at level %i', (target) => {
    for (let seed = 1; seed <= 4; seed++) {
      const p = generate(seed * 31 + target, target);
      expect(p.seed).toBe(seed * 31 + target);
      expect({ cols: p.cols, rows: p.rows }).toEqual(sizeFor(target));
      expect(p.links).toEqual(linksOf(p.islands));

      // Every island is on the grid, has a sensible number, and has water between it and the next.
      for (const island of p.islands) {
        expect(island.x >= 0 && island.x < p.cols && island.y >= 0 && island.y < p.rows).toBe(true);
        expect(island.need).toBeGreaterThanOrEqual(1);
        expect(island.need).toBeLessThanOrEqual(8);
      }
      for (const link of p.links) {
        const a = p.islands[link.a];
        const b = p.islands[link.b];
        expect(b.x - a.x + (b.y - a.y)).toBeGreaterThanOrEqual(2);
      }

      // The stored solution is a real one: right numbers, one group, nothing crossing.
      expect(solved(p, p.solution)).toBe(true);
      p.links.forEach((link, i) =>
        p.links.forEach((other, j) => {
          if (p.solution[i] && p.solution[j]) expect(crosses(p.islands, link, other)).toBe(false);
        }),
      );

      // Reasoning alone finds it, and trying everything finds no other.
      const result = solve(p.islands, p.links);
      expect(result.solved).toBe(true);
      expect(result.bridges).toEqual(p.solution);
      expect(countSolutions(p.islands, p.links)).toBe(1);

      // Playing the solution in ends the game.
      let s = start(p);
      p.solution.forEach((n, link) => {
        for (let k = 0; k < n; k++) s = apply(p, s, { link });
      });
      expect(status(p, s).ended).toBe(true);
    }
  });

  it('never needs a what-if at the easiest levels, and always needs reasoning beyond counting', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const p = generate(seed, 40);
      expect(solve(p.islands, p.links, 1).solved).toBe(true);
      expect(solve(p.islands, p.links, 0).solved).toBe(false);
    }
  });

  it('needs what-ifs at the top level', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const p = generate(seed, 100);
      expect(solve(p.islands, p.links, 1).solved).toBe(false);
      expect(solve(p.islands, p.links).steps[2]).toBeGreaterThanOrEqual(4);
    }
  });

  it('makes bigger and harder puzzles at higher levels', () => {
    const area = (level: number) => sizeFor(level).cols * sizeFor(level).rows;
    expect(area(100)).toBeGreaterThan(area(70));
    expect(area(70)).toBeGreaterThan(area(40));
    expect(effortFor(100)).toBeGreaterThan(effortFor(70));
    expect(effortFor(70)).toBeGreaterThan(effortFor(40));

    const measured = (level: number) => {
      const made = [1, 2, 3, 4].map((seed) => generate(seed, level));
      const mean = (of: (p: BridgesPuzzle) => number) => made.reduce((sum, p) => sum + of(p), 0) / made.length;
      return {
        islands: mean((p) => p.islands.length),
        effort: mean((p) => effort(solve(p.islands, p.links).steps)),
        score: mean((p) => p.score),
      };
    };
    const [easy, mid, hard] = [40, 70, 100].map(measured);
    expect(mid.islands).toBeGreaterThan(easy.islands);
    expect(hard.islands).toBeGreaterThan(mid.islands);
    expect(mid.effort).toBeGreaterThan(easy.effort);
    expect(hard.effort).toBeGreaterThan(mid.effort);
    expect(mid.score).toBeGreaterThan(easy.score);
    expect(hard.score).toBeGreaterThan(mid.score);
    expect(hard.score).toBeGreaterThanOrEqual(90);
  });
});

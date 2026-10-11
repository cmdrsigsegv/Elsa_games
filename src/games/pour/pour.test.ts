import { describe, expect, it } from 'vitest';
import { coloursFor, generate } from './generate';
import { CAPACITY, apply, canPour, done, pour, solve, start, status, topRun, usefulMoves, type PourPuzzle } from './rules';

const puzzle = (vials: number[][]): PourPuzzle => ({ seed: 0, score: 0, vials });

describe('rules', () => {
  it('counts the layers of one colour at the top', () => {
    expect(topRun([1, 2, 2])).toBe(2);
    expect(topRun([3])).toBe(1);
    expect(topRun([])).toBe(0);
  });

  it('pours only onto the same colour or into an empty vial, and only where there is room', () => {
    const vials = [[1, 2], [3, 2], [], [1, 1, 1, 1], [2]];
    expect(canPour(vials, 0, 1)).toBe(true); // 2 onto 2
    expect(canPour(vials, 0, 2)).toBe(true); // into empty
    expect(canPour(vials, 1, 3)).toBe(false); // full
    expect(canPour(vials, 3, 0)).toBe(false); // 1 onto 2
    expect(canPour(vials, 2, 0)).toBe(false); // nothing to pour
    expect(canPour(vials, 0, 0)).toBe(false);
  });

  it('pours the whole top colour when it fits, and only what fits when it does not', () => {
    expect(pour([[1, 2, 2], [2], []], 0, 1)).toEqual([[1], [2, 2, 2], []]);
    expect(pour([[1, 2, 2], [3, 3, 2], []], 0, 1)).toEqual([[1, 2], [3, 3, 2, 2], []]);
  });

  it('is done when every vial is empty or full of one colour', () => {
    expect(done([[1, 1, 1, 1], [], [2, 2, 2, 2]])).toBe(true);
    expect(done([[1, 1, 1], [1], [2, 2, 2, 2]])).toBe(false);
  });

  it('plays a move, counts it, and leaves the old state alone', () => {
    const p = puzzle([[1, 1, 1], [1], []]);
    const s0 = start(p);
    const s1 = apply(p, s0, { from: 1, to: 0 });
    expect(s1.vials).toEqual([[1, 1, 1, 1], [], []]);
    expect(s1.moves).toBe(1);
    expect(s0.vials).toEqual([[1, 1, 1], [1], []]);
    expect(status(p, s1).ended).toBe(true);
    expect(apply(p, s1, { from: 1, to: 0 })).toBe(s1); // nothing to pour
  });

  it('sees a dead end: no pour left that gets anywhere', () => {
    expect(usefulMoves([[1, 2, 1, 2], [2, 1, 2, 1]])).toEqual([]);
    expect(usefulMoves([[1, 2, 1, 2], [2, 1, 2, 1], []]).length).toBeGreaterThan(0);
  });

  it('solves a small puzzle, and says so when there is no way', () => {
    const vials = [[1, 2, 1, 2], [2, 1, 2, 1], [], []];
    const way = solve(vials)!;
    let now = vials;
    for (const m of way) {
      expect(canPour(now, m.from, m.to)).toBe(true);
      now = pour(now, m.from, m.to);
    }
    expect(done(now)).toBe(true);
    expect(solve([[1, 2, 1, 2], [2, 1, 2, 1]])).toBeNull();
  });
});

describe('generator', () => {
  it('gives the same puzzle for the same seed', () => {
    expect(generate(8, 40)).toEqual(generate(8, 40));
    expect(generate(8, 40).vials).not.toEqual(generate(9, 40).vials);
  });

  it.each([5, 30, 55, 80, 97])('makes a full, mixed, solvable set of vials at level %i', (target) => {
    for (let seed = 1; seed <= 3; seed++) {
      const p = generate(seed * 17 + target, target);
      const colours = coloursFor(target);
      expect(p.vials.length).toBe(colours + 2);
      // Four layers of every colour, and two vials left empty.
      const count = new Map<number, number>();
      for (const vial of p.vials) for (const c of vial) count.set(c, (count.get(c) ?? 0) + 1);
      expect(count.size).toBe(colours);
      expect([...count.values()].every((n) => n === CAPACITY)).toBe(true);
      expect(p.vials.filter((v) => v.length === 0).length).toBe(2);
      expect(done(p.vials)).toBe(false);
      // The solution the search finds really does sort them.
      let now = p.vials;
      for (const m of solve(p.vials)!) now = pour(now, m.from, m.to);
      expect(done(now)).toBe(true);
    }
  });

  it('uses more colours at higher levels', () => {
    expect(coloursFor(0)).toBe(3);
    expect(coloursFor(100)).toBe(12);
    expect(coloursFor(60)).toBeGreaterThan(coloursFor(30));
  });
});

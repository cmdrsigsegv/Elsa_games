import { describe, expect, it } from 'vitest';
import { bandFor, generate } from './generate';
import {
  DX,
  DY,
  apply,
  clearsWithoutNudging,
  head,
  lying,
  movable,
  owners,
  ray,
  slide,
  solve,
  start,
  status,
  type ArrowsPuzzle,
  type ArrowsState,
} from './rules';

// A 4 by 3 board, cells numbered 0 to 11 row by row:
//   A A> .  C^     A (cells 0,1) points right, at C two cells away.
//   .  . .  C      C (cells 7,3) points up, straight off the board.
//   <B B .  .      B (cells 9,8) points left, straight off the board.
const small: ArrowsPuzzle = {
  seed: 0,
  score: 0,
  w: 4,
  h: 3,
  cells: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  arrows: [
    { cells: [0, 1], dir: 1 }, // A
    { cells: [9, 8], dir: 3 }, // B: lies along the bottom, pointing left, off the board
    { cells: [7, 3], dir: 0 }, // C
  ],
};
const play = (p: ArrowsPuzzle, taps: number[], from = start(p)) => taps.reduce((s, arrow) => apply(p, s, { arrow }), from);

describe('rules', () => {
  it('finds the line ahead of a cell', () => {
    expect(ray(4, 3, 4, 1)).toEqual([5, 6, 7]);
    expect(ray(4, 3, 8, 0)).toEqual([4, 0]);
    expect(ray(4, 3, 3, 0)).toEqual([]);
  });

  it('an arrow with a clear way slides off the board', () => {
    const s = start(small);
    expect(slide(small, s, 2)).toEqual({ by: 0, leaves: true, into: -1 });
    const after = apply(small, s, { arrow: 2 });
    expect(after.gone).toEqual([false, false, true]);
    expect(after.moves).toBe(1);
    expect(s.gone).toEqual([false, false, false]); // the old state is untouched
  });

  it('an arrow that meets another slides up to it and stays there', () => {
    const s = start(small);
    expect(slide(small, s, 0)).toEqual({ by: 1, leaves: false, into: 2 });
    const after = apply(small, s, { arrow: 0 });
    expect(after.slid).toEqual([1, 0, 0]);
    expect(lying(small, after, 0)).toEqual([1, 2]); // its body followed its head
    expect(owners(small, after)[0]).toBe(-1);
    // Right up against C now, it cannot move again until C has gone.
    expect(apply(small, after, { arrow: 0 })).toBe(after);
    expect(movable(small, after)).toEqual([1, 2]);
    expect(status(small, play(small, [2, 0, 1], after)).ended).toBe(true);
  });

  it('a nudged arrow can come to rest across another and lock the knot for good', () => {
    // A 4 by 4 board. X (cells 4,5) points right along the second row.
    // Z starts at cell 7, in X's way, and winds down and round to a head at cell 10 that points up, through cell 6.
    //   .  .  .  .
    //   X  X> .  Z
    //   .  .  Z^ Z
    //   .  .  Z  Z
    const knot: ArrowsPuzzle = {
      seed: 0,
      score: 0,
      w: 4,
      h: 4,
      cells: Array.from({ length: 16 }, (_, i) => i),
      arrows: [
        { cells: [4, 5], dir: 1 }, // X
        { cells: [7, 11, 15, 14, 10], dir: 0 }, // Z
      ],
    };
    // Z first, then X: cleared.
    expect(status(knot, play(knot, [1, 0])).ended).toBe(true);
    // X first: it slides one cell, onto cell 6, and stops against Z. Now it lies across Z's way out,
    // and Z lies across its own: neither can ever move again.
    const locked = play(knot, [0]);
    expect(lying(knot, locked, 0)).toEqual([5, 6]);
    expect(movable(knot, locked)).toEqual([]);
    expect(solve(knot, locked).way).toBeNull();
    // The search finds the right order, and counts the wrong first tap as a trap.
    expect(solve(knot, start(knot))).toMatchObject({ way: [1, 0], traps: 1, gaveUp: false });
  });

  it('the search finds a way, counts the traps beside it, and knows a locked knot', () => {
    // Two arrows facing each other across a gap: each can only slide up to the other. Locked.
    const locked: ArrowsPuzzle = { ...small, arrows: [{ cells: [0, 1], dir: 1 }, { cells: [3, 2], dir: 3 }] };
    expect(solve(locked, start(locked))).toMatchObject({ way: null, gaveUp: false });
    expect(clearsWithoutNudging(locked)).toEqual({ cleared: false, stuck: [0, 1] });

    const found = solve(small, start(small));
    expect(status(small, play(small, found.way!)).ended).toBe(true);
    expect(clearsWithoutNudging(small).cleared).toBe(true);
  });
});

describe('generator', () => {
  const targets = [5, 30, 55, 80, 97];

  it('gives the same puzzle for the same seed', () => {
    expect(generate(9, 55)).toEqual(generate(9, 55));
    expect(generate(9, 55).arrows).not.toEqual(generate(10, 55).arrows);
  });

  it.each(targets)('ties a dense, well-formed knot at level %i that can be undone', (target) => {
    for (let seed = 1; seed <= 3; seed++) {
      const p = generate(seed * 50 + target, target);
      const band = bandFor(target);
      expect([p.w, p.h]).toEqual([band.w, band.h]);
      // No two arrows share a cell, every arrow is on the board, and each is one unbroken path.
      const used = new Set<number>();
      const onBoard = new Set(p.cells);
      for (const a of p.arrows) {
        expect(a.cells.length).toBeGreaterThanOrEqual(2);
        for (const cell of a.cells) {
          expect(onBoard.has(cell)).toBe(true);
          expect(used.has(cell)).toBe(false);
          used.add(cell);
        }
        for (let k = 1; k < a.cells.length; k++) {
          const dx = Math.abs((a.cells[k] % p.w) - (a.cells[k - 1] % p.w));
          const dy = Math.abs(Math.floor(a.cells[k] / p.w) - Math.floor(a.cells[k - 1] / p.w));
          expect(dx + dy).toBe(1);
        }
        // The head points along the last stretch of the body, and never at its own body.
        expect(head(a) - a.cells[a.cells.length - 2]).toBe(DX[a.dir] + DY[a.dir] * p.w);
        expect(ray(p.w, p.h, head(a), a.dir).some((cell) => a.cells.includes(cell))).toBe(false);
      }
      // Packed tight: next to no gaps.
      expect(used.size).toBeGreaterThanOrEqual(p.cells.length * 0.9);
      // The search's answer, replayed tap by tap, clears the board.
      const found = solve(p, start(p));
      expect(found.way).not.toBeNull();
      let s: ArrowsState = start(p);
      for (const arrow of found.way!) {
        const next = apply(p, s, { arrow });
        expect(next).not.toBe(s);
        s = next;
      }
      expect(status(p, s).ended).toBe(true);
    }
  });

  it('at the hard end, most knots cannot be undone just by tapping arrows whose way is clear', () => {
    let needNudging = 0;
    for (let seed = 1; seed <= 10; seed++) if (!clearsWithoutNudging(generate(seed * 29, 95)).cleared) needNudging++;
    expect(needNudging).toBeGreaterThanOrEqual(6);
  });
});

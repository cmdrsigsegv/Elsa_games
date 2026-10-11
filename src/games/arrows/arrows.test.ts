import { describe, expect, it } from 'vitest';
import { bandFor, generate } from './generate';
import { DX, DY, apply, blocker, head, hint, isMistake, measure, ray, start, status, type ArrowsPuzzle } from './rules';

// A 3 by 3 board:   . A>  .      A (cells 0,1) points right at C.
//                   . .   C      C (cells 5,2) points up, off the board.
//                   B .   .      B (cell 6) points up at A's tail.
const small: ArrowsPuzzle = {
  seed: 0,
  score: 0,
  w: 3,
  h: 3,
  cells: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  arrows: [
    { cells: [0, 1], dir: 1 },
    { cells: [6], dir: 0 },
    { cells: [5, 2], dir: 0 },
  ],
};

describe('rules', () => {
  it('finds the line ahead of a cell', () => {
    expect(ray(3, 3, 3, 1)).toEqual([4, 5]);
    expect(ray(3, 3, 6, 0)).toEqual([3, 0]);
    expect(ray(3, 3, 2, 0)).toEqual([]);
  });

  it('knows which arrow is in the way', () => {
    const s = start(small);
    expect(blocker(small, s, 0)).toBe(2);
    expect(blocker(small, s, 1)).toBe(0);
    expect(blocker(small, s, 2)).toBe(-1);
  });

  it('a blocked arrow stays, and the bump is counted', () => {
    const s0 = start(small);
    expect(isMistake(small, s0, { arrow: 0 })).toBe(true);
    const s1 = apply(small, s0, { arrow: 0 });
    expect(s1.gone).toEqual([false, false, false]);
    expect(s1.bumps).toBe(1);
    expect(s1.lastBump).toEqual({ arrow: 0, into: 2 });
  });

  it('a free arrow leaves, which frees the next', () => {
    let s = start(small);
    expect(isMistake(small, s, { arrow: 2 })).toBe(false);
    s = apply(small, s, { arrow: 2 });
    expect(s.gone).toEqual([false, false, true]);
    expect(apply(small, s, { arrow: 2 })).toBe(s); // already gone
    s = apply(small, s, { arrow: 0 });
    s = apply(small, s, { arrow: 1 });
    expect(status(small, s).ended).toBe(true);
    expect(s.bumps).toBe(0);
  });

  it('is lost after three bumps, and then nothing more moves', () => {
    let s = start(small);
    for (let n = 0; n < 3; n++) s = apply(small, s, { arrow: 0 });
    expect(status(small, s)).toEqual({ ended: true, lost: true });
    expect(apply(small, s, { arrow: 2 })).toBe(s);
    expect(status(small, start(small))).toEqual({ ended: false, lost: false });
  });

  it('measures how deep the knot is', () => {
    expect(measure(small)).toEqual({ solvable: true, rounds: 3, freeAtStart: 1, stuck: [] });
    // Two arrows facing each other can never be cleared.
    const stuck: ArrowsPuzzle = { ...small, arrows: [{ cells: [0], dir: 1 }, { cells: [2], dir: 3 }] };
    expect(measure(stuck)).toMatchObject({ solvable: false, stuck: [0, 1] });
  });
});

describe('generator', () => {
  const targets = [8, 22, 40, 57, 75, 92];

  it('gives the same puzzle for the same seed', () => {
    expect(generate(9, 40)).toEqual(generate(9, 40));
    expect(generate(9, 40).arrows).not.toEqual(generate(10, 40).arrows);
  });

  it.each(targets)('makes a well-formed, clearable board at level %i', (target) => {
    for (let seed = 1; seed <= 4; seed++) {
      const p = generate(seed * 50 + target, target);
      const band = bandFor(target);
      expect([p.w, p.h]).toEqual([band.w, band.h]);
      // No two arrows share a cell, and each arrow is one unbroken path.
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
        const neck = a.cells[a.cells.length - 2];
        expect(head(a) - neck).toBe(DX[a.dir] + DY[a.dir] * p.w);
        expect(ray(p.w, p.h, head(a), a.dir).some((cell) => a.cells.includes(cell))).toBe(false);
      }
      expect(used.size).toBeGreaterThan(p.cells.length * 0.3);
      expect(measure(p).solvable).toBe(true);
      expect(Math.abs(p.score - target)).toBeLessThanOrEqual(14);
    }
  });

  it('leaves fewer arrows free to start with at the hard end of a size', () => {
    const share = (target: number) =>
      [1, 2, 3, 4, 5].reduce((sum, seed) => {
        const p = generate(seed * 13 + target, target);
        return sum + measure(p).freeAtStart / p.arrows.length;
      }, 0) / 5;
    expect(share(65)).toBeLessThan(share(49));
    expect(share(65)).toBeLessThan(0.3);
  });

  it('following hints clears the board without a bump', () => {
    const p = generate(4, 57);
    let s = start(p);
    for (let n = 0; n < p.arrows.length; n++) s = apply(p, s, hint(p, s)!);
    expect(status(p, s).ended).toBe(true);
    expect(s.bumps).toBe(0);
    expect(hint(p, s)).toBeNull();
  });
});

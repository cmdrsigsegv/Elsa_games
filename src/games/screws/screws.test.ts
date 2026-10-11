import { describe, expect, it } from 'vitest';
import { generate } from './generate';
import {
  BOARD_H,
  BOARD_W,
  BOX_SIZE,
  apply,
  covered,
  hangAngle,
  holding,
  inside,
  lie,
  start,
  status,
  takeable,
  turned,
  type Point,
  type ScrewsPuzzle,
  type ScrewsState,
} from './rules';

const bar = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];
const near = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;

// Two plates. The lower one is a flat bar held by screws 0 and 1 (red).
// The upper one is a flat bar across its right half, held by screws 2 (left end) and 3 (right end), both blue;
// it covers screw 1. A third red screw (4) and a third blue one (5) sit on a small plate of their own, off to the side.
const small: ScrewsPuzzle = {
  seed: 0,
  score: 0,
  plates: [{ outline: bar(10, 40, 60, 50), tint: 0 }, { outline: bar(40, 38, 90, 52), tint: 1 }, { outline: bar(10, 80, 40, 90), tint: 2 }],
  screws: [
    { at: [15, 45], plate: 0, colour: 0 },
    { at: [55, 45], plate: 0, colour: 0 },
    { at: [45, 41], plate: 1, colour: 1 },
    { at: [85, 45], plate: 1, colour: 1 },
    { at: [15, 85], plate: 2, colour: 0 },
    { at: [35, 85], plate: 2, colour: 1 },
  ],
  boxes: [0, 1],
  holes: 2,
  way: [],
};
const play = (p: ScrewsPuzzle, taps: number[], from = start(p)) => taps.reduce((s, screw) => apply(p, s, { screw }), from);

describe('geometry', () => {
  it('a bar hung by one end swings down to hang straight below it', () => {
    const outline = bar(0, 0, 40, 10);
    const pivot: Point = [5, 5];
    const hung = turned(outline, pivot, hangAngle(outline, pivot));
    // Its middle is now directly under the screw, and it is as long downwards as it was across.
    const mid: Point = [hung.reduce((s, q) => s + q[0], 0) / 4, hung.reduce((s, q) => s + q[1], 0) / 4];
    expect(mid[0]).toBeCloseTo(5);
    expect(mid[1]).toBeCloseTo(20);
    expect(Math.max(...hung.map((q) => q[1])) - Math.min(...hung.map((q) => q[1]))).toBeCloseTo(40);
  });

  it('a plate hung by its middle, or already hanging straight, does not turn', () => {
    expect(hangAngle(bar(0, 0, 40, 10), [20, 5])).toBe(0);
    expect(hangAngle(bar(0, 0, 10, 40), [5, 5])).toBeCloseTo(0);
  });

  it('knows whether a point is on a plate, turned or not', () => {
    const outline = bar(0, 0, 40, 10);
    expect(inside([30, 5], outline)).toBe(true);
    expect(inside([30, 15], outline)).toBe(false);
    const hung = turned(outline, [5, 5], Math.PI / 2);
    expect(inside([30, 5], hung)).toBe(false);
    expect(inside([5, 30], hung)).toBe(true);
    expect(near(turned([[10, 0]], [0, 0], Math.PI / 2)[0], [0, 10])).toBe(true);
  });
});

describe('plates', () => {
  it('a screw under a higher plate cannot be taken out', () => {
    const s = start(small);
    expect(covered(small, s.out, 1)).toBe(true);
    expect(covered(small, s.out, 0)).toBe(false);
    expect(takeable(small, s, 1)).toBe(false);
    expect(apply(small, s, { screw: 1 })).toBe(s);
  });

  it('a plate left on one screw swings from it, uncovering what it lay over', () => {
    // Take out the upper plate's left screw: it swings down from its right end, clear of screw 1.
    const s = play(small, [2]);
    const hung = lie(small, s.out, 1)!;
    expect(hung.pivot).toEqual([85, 45]);
    expect(hung.angle).not.toBe(0);
    expect(covered(small, s.out, 1)).toBe(false);
    expect(lie(small, s.out, 0)).toMatchObject({ pivot: null, angle: 0 });
  });

  it('a swinging plate can also come down over a screw that was clear', () => {
    // The lower plate is made taller here, with a screw (5) under the spot where the upper plate will hang.
    // Take out the upper plate's right screw: it swings down from its left end, and comes to rest over screw 5.
    const below: ScrewsPuzzle = { ...small, screws: [...small.screws.slice(0, 5), { at: [45, 70], plate: 0, colour: 1 }], plates: [{ outline: bar(10, 40, 60, 75), tint: 0 }, small.plates[1], small.plates[2]] };
    const before = start(below);
    expect(covered(below, before.out, 5)).toBe(false);
    const after = play(below, [3]);
    expect(lie(below, after.out, 1)!.pivot).toEqual([45, 41]);
    expect(covered(below, after.out, 5)).toBe(true);
  });

  it('a plate with no screws left is gone', () => {
    const s = play(small, [2, 3]);
    expect(holding(small, s.out, 1)).toEqual([]);
    expect(lie(small, s.out, 1)).toBeNull();
  });
});

describe('boxes and spare holes', () => {
  it('starts with the first boxes open', () => {
    expect(start(small).open).toEqual([{ colour: 0, filled: 0 }, { colour: 1, filled: 0 }]);
    const one: ScrewsPuzzle = { ...small, boxes: [0, 1] };
    expect(start(one).opened).toBe(2);
  });

  it('a screw goes into the open box of its colour', () => {
    const s = play(small, [0]);
    expect(s.open[0]).toEqual({ colour: 0, filled: 1 });
    expect(s.spare).toEqual([]);
    expect(s.moves).toBe(1);
  });

  it('a full box makes way, and winning takes every screw', () => {
    const s = play(small, [0, 4, 2, 3, 1, 5]);
    expect(s.out.every(Boolean)).toBe(true);
    expect(s.open).toEqual([]);
    expect(status(small, s)).toEqual({ ended: true, lost: false });
  });

  it('with no box of its colour open, a screw waits in a spare hole and moves in when its box opens', () => {
    // The first two boxes are both red, so at the start there is no box for blue.
    const p: ScrewsPuzzle = {
      ...small,
      screws: [...small.screws, { at: [70, 100], plate: 2, colour: 0 }, { at: [80, 100], plate: 2, colour: 0 }, { at: [90, 100], plate: 2, colour: 0 }],
      plates: [small.plates[0], small.plates[1], { outline: bar(10, 80, 95, 105), tint: 2 }],
      boxes: [0, 0, 1],
    };
    // A blue screw first: both open boxes are red, so it goes to a spare hole.
    let s = play(p, [2]);
    expect(s.spare).toEqual([1]);
    // Fill one red box: the blue box opens and the waiting blue screw moves into it.
    s = play(p, [0, 4, 6], s);
    expect(s.spare).toEqual([]);
    expect(s.open).toContainEqual({ colour: 1, filled: 1 });
  });

  it('is lost when the spare holes are full and nothing free has a box', () => {
    // Two red boxes open and one spare hole: the only free screws are blue.
    const p: ScrewsPuzzle = {
      ...small,
      holes: 1,
      boxes: [0, 0, 1, 1],
      plates: [{ outline: bar(5, 5, 95, 15), tint: 0 }, { outline: bar(5, 3, 60, 17), tint: 1 }],
      screws: [
        // Red screws on the lower plate, all under the upper plate.
        { at: [10, 10], plate: 0, colour: 0 },
        { at: [20, 10], plate: 0, colour: 0 },
        { at: [30, 10], plate: 0, colour: 0 },
        // Blue screws: one on the uncovered end of the lower plate, three holding the upper plate.
        { at: [80, 10], plate: 0, colour: 1 },
        { at: [15, 6], plate: 1, colour: 1 },
        { at: [35, 6], plate: 1, colour: 1 },
        { at: [55, 6], plate: 1, colour: 1 },
      ],
    };
    let s: ScrewsState = start(p);
    expect(status(p, s)).toEqual({ ended: false, lost: false });
    s = play(p, [3], s);
    expect(s.spare).toEqual([1]);
    // Every other free screw is blue too, there is no blue box, and the one spare hole is taken.
    expect(takeable(p, s, 4)).toBe(false);
    expect(status(p, s)).toEqual({ ended: true, lost: true });
  });
});

describe('generator', () => {
  const targets = [40, 60, 80, 100];

  it('gives the same puzzle for the same seed', () => {
    expect(generate(4, 60)).toEqual(generate(4, 60));
    expect(generate(4, 60).screws).not.toEqual(generate(5, 60).screws);
  });

  it.each(targets)('makes a sound puzzle at level %i that its own winning way wins', (target) => {
    for (let seed = 1; seed <= 3; seed++) {
      const p = generate(seed * 9 + target, target);
      // Three screws of a colour for every box of that colour.
      const perColour = new Map<number, number>();
      for (const s of p.screws) perColour.set(s.colour, (perColour.get(s.colour) ?? 0) + 1);
      const boxesOf = new Map<number, number>();
      for (const c of p.boxes) boxesOf.set(c, (boxesOf.get(c) ?? 0) + 1);
      expect(p.screws.length).toBe(p.boxes.length * BOX_SIZE);
      for (const [colour, count] of perColour) expect(count).toBe((boxesOf.get(colour) ?? 0) * BOX_SIZE);
      // Every screw is on its own plate, on the board, and far enough from the rest to tap.
      p.screws.forEach((s, i) => {
        expect(inside(s.at, p.plates[s.plate].outline)).toBe(true);
        expect(s.at[0] > 0 && s.at[1] > 0 && s.at[0] < BOARD_W && s.at[1] < BOARD_H).toBe(true);
        for (let j = 0; j < i; j++) expect(Math.hypot(s.at[0] - p.screws[j].at[0], s.at[1] - p.screws[j].at[1])).toBeGreaterThan(8);
      });
      // Every plate starts held by at least two screws, so nothing swings before she touches it.
      p.plates.forEach((_, plate) => expect(holding(p, p.screws.map(() => false), plate).length).toBeGreaterThanOrEqual(2));
      // Playing the generator's own way, tap by tap, wins without ever being refused.
      let s = start(p);
      for (const screw of p.way) {
        const next = apply(p, s, { screw });
        expect(next).not.toBe(s);
        expect(next.spare.length).toBeLessThanOrEqual(p.holes);
        s = next;
      }
      expect(status(p, s)).toEqual({ ended: true, lost: false });
    }
  });

  it('gets bigger and tighter with level', () => {
    const easy = generate(11, 40);
    const hard = generate(11, 100);
    expect(hard.plates.length).toBeGreaterThan(easy.plates.length);
    expect(hard.screws.length).toBeGreaterThan(easy.screws.length);
    expect(hard.holes).toBeLessThan(easy.holes);
    expect(new Set(hard.screws.map((s) => s.colour)).size).toBeGreaterThan(new Set(easy.screws.map((s) => s.colour)).size);
  });
});

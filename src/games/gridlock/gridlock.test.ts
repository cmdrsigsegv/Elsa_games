import { describe, expect, it } from 'vitest';
import { generate, slidesFor } from './generate';
import { N, apply, cover, reach, solve, solved, start, status, type GridlockPuzzle } from './rules';

// The red car on row 2 with one lorry standing across its way:
//   . . . L . .
//   . . . L . .
//   R R . L . .      The lorry must go down three before the red car can leave.
//   . . . . . .
const small: GridlockPuzzle = {
  seed: 0,
  score: 0,
  par: 2,
  cars: [
    { len: 2, horizontal: true, line: 2 },
    { len: 3, horizontal: false, line: 3 },
  ],
  start: [0, 0],
};

describe('rules', () => {
  it('knows how far each car can slide', () => {
    expect(reach(small.cars, small.start, 0)).toEqual([0, 1]);
    expect(reach(small.cars, small.start, 1)).toEqual([0, 3]);
  });

  it('slides a car along its line, and not through another', () => {
    const s0 = start(small);
    expect(apply(small, s0, { car: 0, to: 4 })).toBe(s0); // the lorry is in the way
    expect(apply(small, s0, { car: 0, to: 0 })).toBe(s0); // not a move
    const s1 = apply(small, s0, { car: 1, to: 3 });
    expect(s1.at).toEqual([0, 3]);
    expect(s1.moves).toBe(1);
    expect(s0.at).toEqual([0, 0]);
    const s2 = apply(small, s1, { car: 0, to: 4 });
    expect(status(small, s2).ended).toBe(true);
    expect(s2.moves).toBe(2);
  });

  it('finds the shortest way out', () => {
    expect(solve(small.cars, small.start)).toEqual([
      { car: 1, to: 3 },
      { car: 0, to: 4 },
    ]);
    // A lorry across the row that can never clear it: no way out.
    const stuck = [small.cars[0], { len: 3, horizontal: false, line: 3 }, { len: 3, horizontal: false, line: 3 }];
    expect(solve(stuck, [0, 0, 3])).toBeNull();
  });
});

describe('generator', () => {
  const targets = [5, 25, 45, 70, 95];

  it('gives the same puzzle for the same seed', () => {
    expect(generate(3, 40)).toEqual(generate(3, 40));
    expect(generate(3, 40).start).not.toEqual(generate(4, 40).start);
  });

  it.each(targets)('makes a legal car park at level %i that needs exactly the slides it says', (target) => {
    for (let seed = 1; seed <= 3; seed++) {
      const p = generate(seed * 10 + target, target);
      // No two cars overlap, and every car is inside the car park.
      const cells = p.cars.reduce((n, car) => n + car.len, 0);
      expect([...cover(p.cars, p.start)].filter((i) => i >= 0).length).toBe(cells);
      p.cars.forEach((car, i) => expect(p.start[i] + car.len).toBeLessThanOrEqual(N));
      expect(p.cars[0]).toEqual({ len: 2, horizontal: true, line: 2 });
      expect(solved(p.cars, p.start)).toBe(false);
      // The solver searches from this one position, separately from the generator's survey, and agrees on the count.
      const way = solve(p.cars, p.start)!;
      expect(way.length).toBe(p.par);
      // And playing its solution really does let the red car out.
      let s = start(p);
      for (const move of way) s = apply(p, s, move);
      expect(status(p, s).ended).toBe(true);
    }
  });

  it('asks for more slides at higher levels', () => {
    const average = (target: number) => [1, 2, 3, 4].reduce((sum, seed) => sum + generate(seed * 7 + target, target).par, 0) / 4;
    const pars = [5, 35, 65, 95].map(average);
    for (let i = 1; i < pars.length; i++) expect(pars[i]).toBeGreaterThan(pars[i - 1]);
    expect(pars[0]).toBeLessThanOrEqual(slidesFor(5) + 1);
  });
});

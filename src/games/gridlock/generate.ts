// Makes a Gridlock puzzle from a seed, aimed at a difficulty level.
//
// Cars are parked at random. From that car park every position that sliding
// can reach is explored, and each is measured by how many slides it is from
// the nearest position where the red car is out. The starting position is
// then chosen from all of those by its distance: far for a hard puzzle, near
// for an easy one. So the number of slides needed is known exactly.

import { random, type Random } from '../../kit/random';
import { EXIT_ROW, N, cover, neighbours, solved, type Car, type GridlockPuzzle } from './rules';
import { tuning } from './tuning';

export const slidesFor = (level: number) => Math.round(tuning.easiest + (level / 100) * (tuning.hardest - tuning.easiest));
export const scoreFor = (slides: number) => Math.min(100, Math.max(0, ((slides - tuning.easiest) / (tuning.hardest - tuning.easiest)) * 100));

function park(rng: Random): { cars: Car[]; at: number[] } {
  const cars: Car[] = [{ len: 2, horizontal: true, line: EXIT_ROW }];
  const at = [rng.int(3)];
  const wanted = tuning.fewestCars + rng.int(tuning.mostCars - tuning.fewestCars + 1);
  for (let tries = 0; tries < 200 && cars.length <= wanted; tries++) {
    const car: Car = { len: rng.int(100) < tuning.lorryPercent ? 3 : 2, horizontal: rng.int(2) === 0, line: rng.int(N) };
    // Nothing else lies along the red car's row: it could never be got past.
    if (car.horizontal && car.line === EXIT_ROW) continue;
    const pos = rng.int(N - car.len + 1);
    const grid = cover(cars, at);
    const cells = Array.from({ length: car.len }, (_, k) => (car.horizontal ? car.line * N + pos + k : (pos + k) * N + car.line));
    if (cells.some((cell) => grid[cell] >= 0)) continue;
    cars.push(car);
    at.push(pos);
  }
  return { cars, at };
}

/** Every position reachable from `from`, with its distance in slides from the nearest solved one. Null if too many, or none is solved. */
function survey(cars: Car[], from: number[]): { at: number[]; slides: number }[] | null {
  const index = new Map<string, number>([[from.join(), 0]]);
  const all = [from];
  const links: number[][] = [];
  for (let i = 0; i < all.length; i++) {
    const here: number[] = [];
    for (const move of neighbours(cars, all[i])) {
      const to = all[i].slice();
      to[move.car] = move.to;
      const key = to.join();
      let j = index.get(key);
      if (j === undefined) {
        j = all.length;
        if (j >= tuning.mostPositions) return null;
        index.set(key, j);
        all.push(to);
      }
      here.push(j);
    }
    links.push(here);
  }
  // Outwards from every solved position at once; sliding can always be undone, so distances run both ways.
  const slides = new Int32Array(all.length).fill(-1);
  let frontier: number[] = [];
  all.forEach((at, i) => {
    if (solved(cars, at)) {
      slides[i] = 0;
      frontier.push(i);
    }
  });
  if (!frontier.length) return null;
  for (let d = 1; frontier.length; d++) {
    const next: number[] = [];
    for (const i of frontier) {
      for (const j of links[i]) {
        if (slides[j] >= 0) continue;
        slides[j] = d;
        next.push(j);
      }
    }
    frontier = next;
  }
  return all.map((at, i) => ({ at, slides: slides[i] }));
}

export function generate(seed: number, target: number): GridlockPuzzle {
  const rng = random(seed);
  const want = slidesFor(target);
  let best: GridlockPuzzle | null = null;
  const attempts = tuning.attempts + Math.round(target * tuning.extraAttemptsPerLevel);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { cars, at } = park(rng);
    const positions = survey(cars, at);
    if (!positions) continue;
    // Of the positions nearest the wanted distance, take one at random.
    let nearest = Infinity;
    for (const p of positions) if (p.slides > 0) nearest = Math.min(nearest, Math.abs(p.slides - want));
    const choices = positions.filter((p) => p.slides > 0 && Math.abs(p.slides - want) === nearest);
    if (!choices.length) continue;
    const pick = choices[rng.int(choices.length)];
    if (!best || Math.abs(pick.slides - want) < Math.abs(best.par - want)) {
      best = { seed, score: scoreFor(pick.slides), cars, start: pick.at, par: pick.slides };
    }
    if (best.par === want) break;
  }
  return best ?? generate(seed + 1, target);
}

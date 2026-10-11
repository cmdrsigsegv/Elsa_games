// Makes a liquid-sorting puzzle from a seed, aimed at a difficulty level. The
// vials are filled at random, and the filling is kept only if a search finds
// a way to sort it.

import { random } from '../../kit/random';
import { CAPACITY, solve, sorted, type PourPuzzle } from './rules';
import { tuning } from './tuning';

export function coloursFor(level: number): number {
  const span = tuning.mostColours - tuning.fewestColours;
  return Math.min(tuning.mostColours, Math.max(tuning.fewestColours, tuning.fewestColours + Math.round((level / 100) * span)));
}

export function generate(seed: number, target: number): PourPuzzle {
  const rng = random(seed);
  const colours = coloursFor(target);
  for (let attempt = 0; attempt < tuning.attempts; attempt++) {
    const layers = rng.shuffle(Array.from({ length: colours * CAPACITY }, (_, i) => 1 + (i % colours)));
    const vials = Array.from({ length: colours }, (_, v) => layers.slice(v * CAPACITY, (v + 1) * CAPACITY));
    // A vial that starts sorted is one colour fewer to do.
    if (vials.some(sorted)) continue;
    for (let e = 0; e < tuning.emptyVials; e++) vials.push([]);
    if (!solve(vials)) continue;
    const span = tuning.mostColours - tuning.fewestColours;
    return { seed, score: ((colours - tuning.fewestColours) / span) * 100, vials };
  }
  return generate(seed + 1, target);
}

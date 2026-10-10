// Makes an arrow puzzle from a seed, aimed at a difficulty level.
//
// The board is built in the reverse of the order it will be cleared. Each
// arrow is laid on free cells with the line ahead of its head clear of every
// arrow already down. So the newest arrow can always leave first, then the
// one before it, and so on back to the first: the board is solvable by
// construction, and the arrows laid first end up deep in the knot.

import { random, type Random } from '../../kit/random';
import { DX, DY, measure, ray, type Arrow, type ArrowsPuzzle } from './rules';
import { tuning } from './tuning';

export type Band = (typeof tuning.bands)[number];

export function bandFor(level: number): Band {
  return tuning.bands.find((b) => level < b.to) ?? tuning.bands[tuning.bands.length - 1];
}

export function score(band: Band, freeShare: number): number {
  const t = (band.easyFree - freeShare) / (band.easyFree - band.hardFree);
  return band.from + Math.min(1, Math.max(0, t)) * (band.to - band.from);
}

/**
 * `tangle`, 0 to 1, is how often an arrow is pointed down the longest clear
 * line it has, across cells that later arrows will fill: the more often, the
 * more arrows start out blocked.
 */
function pack(rng: Random, w: number, h: number, tangle: number): Arrow[] {
  const taken = new Uint8Array(w * h);
  const arrows: Arrow[] = [];
  let failures = 0;
  // Late on, only odd single cells are left: fill them with one-cell arrows.
  while (failures < 400) {
    const free: number[] = [];
    for (let i = 0; i < w * h; i++) if (!taken[i]) free.push(i);
    if (!free.length) break;
    const headCell = free[rng.int(free.length)];
    const clear = rng.shuffle([0, 1, 2, 3]).filter((d) => ray(w, h, headCell, d).every((cell) => !taken[cell]));
    if (rng.next() < tangle) clear.sort((a, b) => ray(w, h, headCell, b).length - ray(w, h, headCell, a).length);
    const dir: number | undefined = clear[0];
    if (dir === undefined) {
      failures++;
      continue;
    }
    // The body may not lie in the arrow's own way out.
    const ahead = new Set(ray(w, h, headCell, dir));
    const body = [headCell];
    const open = (cell: number) => !taken[cell] && !ahead.has(cell) && !body.includes(cell);
    const step = (cell: number, d: number): number | null => {
      const x = (cell % w) + DX[d];
      const y = Math.floor(cell / w) + DY[d];
      return x >= 0 && y >= 0 && x < w && y < h && open(y * w + x) ? y * w + x : null;
    };
    // Grow backwards from the head. The first step is straight back, so the
    // head points along the last stretch of the body.
    const length = 2 + rng.int(tuning.longest - 1);
    let going = (dir + 2) % 4;
    let at = headCell;
    while (body.length < length) {
      const turns = rng.shuffle([(going + 1) % 4, (going + 3) % 4]);
      const order = body.length === 1 ? [going] : rng.next() < tuning.straightness ? [going, ...turns] : [...turns, going];
      const d = order.find((o) => step(at, o) !== null);
      if (d === undefined) break;
      at = step(at, d)!;
      going = d;
      body.push(at);
    }
    if (body.length === 1 && failures < 200) {
      failures++;
      continue;
    }
    for (const cell of body) taken[cell] = 1;
    arrows.push({ cells: body.reverse(), dir });
  }
  // Shuffled, so that the order in the list gives nothing away.
  return rng.shuffle(arrows);
}

export function generate(seed: number, target: number): ArrowsPuzzle {
  const rng = random(seed);
  const band = bandFor(target);
  let best: ArrowsPuzzle | null = null;
  for (let attempt = 0; attempt < tuning.attempts; attempt++) {
    const puzzle: ArrowsPuzzle = { seed, score: 0, w: band.w, h: band.h, arrows: pack(rng, band.w, band.h, rng.next()) };
    const m = measure(puzzle);
    if (!m.solvable || puzzle.arrows.length < 3) continue;
    puzzle.score = score(band, m.freeAtStart / puzzle.arrows.length);
    if (!best || Math.abs(puzzle.score - target) < Math.abs(best.score - target)) best = puzzle;
    if (Math.abs(best.score - target) <= 1.5) break;
  }
  return best ?? generate(seed + 1, target);
}

// Makes an arrow puzzle from a seed, aimed at a difficulty level.
//
// The board, which need not be a rectangle, is first packed solid with
// winding paths. Each path becomes an arrow by choosing which of its two ends
// is the head. On a packed board an arrow can only leave if its head looks
// straight out over the edge, so few can move at the start, and telling which
// means tracing each one's line of sight through the tangle.
//
// The heads are then swapped about until the whole board can be cleared (an
// arrow that still cannot be freed is taken off). Finally some arrows are
// lifted out to loosen the knot for the easier levels.

import { random, type Random } from '../../kit/random';
import { DX, DY, measure, ray, type Arrow, type ArrowsPuzzle } from './rules';
import { tuning } from './tuning';

export type Band = (typeof tuning.bands)[number];

export function bandFor(level: number): Band {
  return tuning.bands.find((b) => level < b.to) ?? tuning.bands[tuning.bands.length - 1];
}

/** Scored by the share of arrows that can leave at the start: the fewer, the harder. */
export function score(band: Band, freeShare: number): number {
  const t = (band.easyFree - freeShare) / (band.easyFree - band.hardFree);
  return band.from + Math.min(1, Math.max(0, t)) * (band.to - band.from);
}

/** The outline of the board: which cells of the w by h rectangle are part of it. */
function shape(rng: Random, w: number, h: number): Uint8Array {
  const kind = rng.int(6);
  const inside = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // From -1 to 1 across the board each way.
      const u = ((x + 0.5) / w) * 2 - 1;
      const v = ((y + 0.5) / h) * 2 - 1;
      const round = u * u + v * v;
      let on = true;
      if (kind === 1) on = round <= 1.02; // oval
      else if (kind === 2) on = Math.abs(u) + Math.abs(v) <= 1.08; // diamond
      else if (kind === 3) on = round <= 1.02 && round >= 0.1; // ring
      else if (kind === 4) on = Math.abs(u) <= 0.45 || Math.abs(v) <= 0.4; // cross
      else if (kind === 5) on = Math.abs(u) <= 0.3 + 0.7 * Math.abs(v); // hourglass
      inside[y * w + x] = on ? 1 : 0;
    }
  }
  return inside;
}

/** Fills the board with winding paths of two cells or more. */
function paths(rng: Random, band: Band, inside: Uint8Array): number[][] {
  const { w, h } = band;
  const taken = new Uint8Array(w * h);
  const step = (cell: number, d: number): number | null => {
    const x = (cell % w) + DX[d];
    const y = Math.floor(cell / w) + DY[d];
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    const to = y * w + x;
    return inside[to] && !taken[to] ? to : null;
  };
  const out: number[][] = [];
  const order = rng.shuffle(Array.from({ length: w * h }, (_, i) => i).filter((i) => inside[i]));
  for (const from of order) {
    if (taken[from]) continue;
    const path = [from];
    taken[from] = 1;
    const length = 3 + rng.int(band.longest - 2);
    let at = from;
    let going = rng.int(4);
    while (path.length < length) {
      const turns = rng.shuffle([(going + 1) % 4, (going + 3) % 4]);
      const tries = rng.next() < tuning.straightness ? [going, ...turns] : [...turns, going];
      const d = tries.find((o) => step(at, o) !== null);
      if (d === undefined) break;
      at = step(at, d)!;
      going = d;
      taken[at] = 1;
      path.push(at);
    }
    if (path.length >= 2) out.push(path);
    else taken[from] = 0; // a lone cell: leave it for a neighbour, or empty
  }
  return out;
}

/** A path as an arrow with its last cell as the head, or null if it would point at its own body. */
function arrowFrom(band: Band, cells: number[]): Arrow | null {
  const last = cells[cells.length - 1];
  const neck = cells[cells.length - 2];
  const dx = (last % band.w) - (neck % band.w);
  const dy = Math.floor(last / band.w) - Math.floor(neck / band.w);
  const dir = DX.findIndex((x, d) => x === dx && DY[d] === dy);
  return ray(band.w, band.h, last, dir).some((cell) => cells.includes(cell)) ? null : { cells, dir };
}

function build(rng: Random, band: Band, loosen: number): ArrowsPuzzle | null {
  const inside = shape(rng, band.w, band.h);
  const cells: number[] = [];
  inside.forEach((on, i) => on && cells.push(i));

  // Each path can be an arrow either way round, unless that way points at itself.
  let choices = paths(rng, band, inside)
    .map((path) => [arrowFrom(band, path), arrowFrom(band, [...path].reverse())].filter((a): a is Arrow => a !== null))
    .filter((ways) => ways.length > 0);
  let picks = choices.map((ways) => rng.int(ways.length));

  const board = (): ArrowsPuzzle => ({ seed: 0, score: 0, w: band.w, h: band.h, cells, arrows: choices.map((ways, i) => ways[picks[i]]) });
  /** How many arrows are left stuck when everything that can leave has left, and which. */
  const stuck = (): number[] => measure(board()).stuck;

  let left = stuck();
  for (let tries = 0; left.length && choices.length > 3; tries++) {
    // Turn a stuck arrow round; keep the change unless it makes things worse.
    const i = left[rng.int(left.length)];
    if (choices[i].length > 1 && tries % 40 !== 39) {
      picks[i] = 1 - picks[i];
      const now = stuck();
      if (now.length <= left.length) left = now;
      else picks[i] = 1 - picks[i];
    } else {
      // Turning has not worked: take the arrow off the board.
      choices = choices.filter((_, k) => k !== i);
      picks = picks.filter((_, k) => k !== i);
      left = stuck();
    }
  }

  // Lifting arrows out opens lines of sight: more arrows free, an easier board.
  for (let n = Math.floor(choices.length * loosen); n > 0 && choices.length > 4; n--) {
    const i = rng.int(choices.length);
    choices = choices.filter((_, k) => k !== i);
    picks = picks.filter((_, k) => k !== i);
  }

  const puzzle = board();
  puzzle.arrows = rng.shuffle(puzzle.arrows); // so the order in the list gives nothing away
  const m = measure(puzzle);
  if (!m.solvable || puzzle.arrows.length < 4) return null;
  puzzle.score = score(band, m.freeAtStart / puzzle.arrows.length);
  return puzzle;
}

export function generate(seed: number, target: number): ArrowsPuzzle {
  const rng = random(seed);
  const band = bandFor(target);
  // How far up its size's range the target is decides how much to loosen the knot.
  const within = (target - band.from) / (band.to - band.from);
  let best: ArrowsPuzzle | null = null;
  for (let attempt = 0; attempt < tuning.attempts; attempt++) {
    const loosen = Math.max(0, (1 - within) * tuning.mostLoosening + (rng.next() - 0.5) * 0.1);
    const puzzle = build(rng, band, loosen);
    if (!puzzle) continue;
    puzzle.seed = seed;
    if (!best || Math.abs(puzzle.score - target) < Math.abs(best.score - target)) best = puzzle;
    if (Math.abs(best.score - target) <= 1.5) break;
  }
  return best ?? generate(seed + 1, target);
}

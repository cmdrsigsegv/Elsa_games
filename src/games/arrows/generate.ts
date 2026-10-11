// Makes an arrow puzzle from a seed, aimed at a difficulty level.
//
// A round board is packed solid with winding paths, with no gaps. Each path
// becomes an arrow by choosing which of its two ends is the head. Heads are
// swapped about until a search finds a way to clear the whole board, and the
// search also counts the knot's traps: the moments where a wrong tap would
// lock it for good. Knots are kept by how many traps they have.

import { random, type Random } from '../../kit/random';
import { DX, DY, clearsWithoutNudging, ray, solve, start, type Arrow, type ArrowsPuzzle } from './rules';
import { tuning } from './tuning';

export type Band = (typeof tuning.bands)[number];

export function bandFor(level: number): Band {
  return tuning.bands.find((b) => level < b.to) ?? tuning.bands[tuning.bands.length - 1];
}

export function score(band: Band, traps: number, needsNudging: boolean): number {
  const worth = traps + (needsNudging ? tuning.nudgeWorth : 0);
  return band.from + Math.min(1, worth / band.hardTraps) * (band.to - band.from);
}

/** A round board: the cells of the w by h square that fall inside a circle. */
function ball(w: number, h: number): Uint8Array {
  const inside = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = ((x + 0.5) / w) * 2 - 1;
      const v = ((y + 0.5) / h) * 2 - 1;
      inside[y * w + x] = u * u + v * v <= 1.08 ? 1 : 0;
    }
  }
  return inside;
}

const beside = (w: number, a: number, b: number) => Math.abs((a % w) - (b % w)) + Math.abs(Math.floor(a / w) - Math.floor(b / w)) === 1;

/** Fills the board with winding paths of two cells or more, leaving no cell out if it can be helped. */
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
  const lone: number[] = [];
  const order = rng.shuffle(Array.from({ length: w * h }, (_, i) => i).filter((i) => inside[i]));
  for (const from of order) {
    if (taken[from]) continue;
    const path = [from];
    taken[from] = 1;
    const length = 2 + rng.int(band.longest - 1);
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
    else lone.push(from);
  }
  // A cell left on its own joins the end of a path beside it.
  for (const cell of lone) {
    const host = out.find((path) => beside(w, path[0], cell) || beside(w, path[path.length - 1], cell));
    if (!host) continue;
    if (beside(w, host[host.length - 1], cell)) host.push(cell);
    else host.unshift(cell);
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

function tie(rng: Random, band: Band, budget: { left: number }): { puzzle: ArrowsPuzzle; traps: number } | null {
  const inside = ball(band.w, band.h);
  const cells: number[] = [];
  inside.forEach((on, i) => on && cells.push(i));

  // Each path can be an arrow either way round, unless that way points at itself.
  const choices = paths(rng, band, inside).map((path) =>
    [arrowFrom(band, path), arrowFrom(band, [...path].reverse())].filter((a): a is Arrow => a !== null),
  );
  if (choices.some((ways) => ways.length === 0) || choices.length < 3) return null;
  const picks = choices.map((ways) => rng.int(ways.length));
  const board = (): ArrowsPuzzle => ({ seed: 0, score: 0, w: band.w, h: band.h, cells, arrows: choices.map((ways, i) => ways[picks[i]]) });

  // Turn stuck arrows round, keeping each change that leaves fewer stuck, and
  // every so often ask the full search whether the knot can now be undone.
  let stuck = clearsWithoutNudging(board()).stuck;
  for (let tries = 0; tries < 120 && budget.left > 0; tries++) {
    if (stuck.length <= 4 || tries % 10 === 9) {
      const puzzle = board();
      const found = solve(puzzle, start(puzzle), tuning.searchPerKnot);
      budget.left -= found.visited;
      if (found.way && !found.gaveUp) {
        puzzle.arrows = rng.shuffle(puzzle.arrows); // so the order in the list gives nothing away
        return { puzzle, traps: found.traps };
      }
    }
    if (!stuck.length) return null;
    const i = stuck[rng.int(stuck.length)];
    if (choices[i].length < 2) continue;
    picks[i] = 1 - picks[i];
    const now = clearsWithoutNudging(board()).stuck;
    if (now.length <= stuck.length) stuck = now;
    else picks[i] = 1 - picks[i];
  }
  return null;
}

export function generate(seed: number, target: number): ArrowsPuzzle {
  const rng = random(seed);
  const band = bandFor(target);
  let best: ArrowsPuzzle | null = null;
  const budget = { left: tuning.searchPerPuzzle };
  for (let attempt = 0; attempt < tuning.attempts && (budget.left > 0 || !best); attempt++) {
    const tied = tie(rng, band, budget);
    if (!tied) continue;
    const puzzle = { ...tied.puzzle, seed, score: score(band, tied.traps, !clearsWithoutNudging(tied.puzzle).cleared) };
    if (!best || Math.abs(puzzle.score - target) < Math.abs(best.score - target)) best = puzzle;
    if (Math.abs(best.score - target) <= 2) break;
  }
  return best ?? generate(seed + 1, target);
}

// The block game: a well of flat blocks, like Tetris pieces lying down. Each
// round she slides one block sideways. Blocks with nothing under them fall, a
// row filled from wall to wall clears, and then new blocks drop in from the
// top. The stack must not reach the top of the well. Every function here is
// pure, and what drops is decided by the seed, so a saved game resumes
// exactly as it was.

import { random, type Random } from '../../kit/random';
import { tuning } from './tuning';

export const W = tuning.width;
export const H = tuning.height;

export interface Block {
  id: number;
  /** Row 0 is the top of the well. */
  row: number;
  col: number;
  len: number;
  /** Which of the block colours it is drawn in. */
  colour: number;
}

/** A block waiting above the well: it will fall straight down from here. */
export type Coming = Omit<Block, 'id' | 'row'>;

export interface StackPuzzle {
  seed: number;
  /** The level blocks arrive at, 0 (slow) to 100 (fast). */
  score: number;
}

export interface StackState {
  blocks: Block[];
  /** The blocks that drop at the end of this round. */
  coming: Coming[];
  points: number;
  /** How many rounds have been played. */
  rounds: number;
  nextId: number;
  over: boolean;
}

/** Slide a block to a new column, or let the round go by without moving anything. */
export type StackMove = { block: number; to: number } | { pass: true };

/** There is nothing to generate ahead of time: the blocks are dealt as the game goes, at this level. */
export const generate = (seed: number, target: number): StackPuzzle => ({ seed, score: target });

/** Which block covers each cell, by its place in the list, or -1. */
export function cover(blocks: Block[]): Int16Array {
  const grid = new Int16Array(W * H).fill(-1);
  blocks.forEach((b, i) => {
    for (let k = 0; k < b.len; k++) grid[b.row * W + b.col + k] = i;
  });
  return grid;
}

/** How far a block can slide either way along its row: the lowest and highest columns it can reach. */
export function reach(blocks: Block[], id: number): [number, number] {
  const b = blocks.find((x) => x.id === id)!;
  const grid = cover(blocks);
  let lo = b.col;
  while (lo > 0 && grid[b.row * W + lo - 1] < 0) lo--;
  let hi = b.col;
  while (hi + b.len < W && grid[b.row * W + hi + b.len] < 0) hi++;
  return [lo, hi];
}

/** Lets every block with nothing under it fall as far as it can. */
export function fall(blocks: Block[]): Block[] {
  // Lowest first, so each block lands on ones that have already settled.
  const out = blocks.map((b) => ({ ...b })).sort((a, b) => b.row - a.row);
  const grid = cover(out);
  out.forEach((b, i) => {
    const free = (row: number) => {
      for (let k = 0; k < b.len; k++) if (grid[row * W + b.col + k] >= 0) return false;
      return true;
    };
    let row = b.row;
    while (row + 1 < H && free(row + 1)) row++;
    if (row === b.row) return;
    for (let k = 0; k < b.len; k++) {
      grid[b.row * W + b.col + k] = -1;
      grid[row * W + b.col + k] = i;
    }
    b.row = row;
  });
  return out;
}

/** The rows that are filled from wall to wall. */
export function fullRows(blocks: Block[]): number[] {
  const filled = new Array<number>(H).fill(0);
  for (const b of blocks) filled[b.row] += b.len;
  return filled.flatMap((n, row) => (n === W ? [row] : []));
}

/** Falls and clears until nothing more happens. Each further row in a chain reaction is worth more. */
export function settle(blocks: Block[]): { blocks: Block[]; points: number } {
  let now = fall(blocks);
  let points = 0;
  for (let chain = 1; ; ) {
    const rows = fullRows(now);
    if (!rows.length) return { blocks: now, points };
    rows.forEach(() => (points += tuning.rowPoints * chain++));
    now = fall(now.filter((b) => !rows.includes(b.row)));
  }
}

function length(rng: Random, level: number): number {
  // Short blocks are easy to fit; higher levels see more of the long ones.
  const hard = level / 100;
  const weights = [1.3 - hard * 0.6, 1.2, 0.6 + hard * 0.5, 0.2 + hard * 0.5];
  let pick = rng.next() * weights.reduce((a, b) => a + b, 0);
  return 1 + weights.findIndex((w) => (pick -= w) < 0);
}

/** The blocks for one drop: one at the kind levels, up to three at the harsh ones, never touching. */
export function deal(rng: Random, level: number, most = 3): Coming[] {
  const count = Math.min(most, 1 + (rng.next() < level / 90 ? 1 : 0) + (rng.next() < (level - 50) / 80 ? 1 : 0));
  const taken = new Uint8Array(W);
  const out: Coming[] = [];
  for (let n = 0; n < count; n++) {
    const len = length(rng, level);
    const spots: number[] = [];
    for (let col = 0; col + len <= W; col++) {
      let free = true;
      for (let k = 0; k < len; k++) if (taken[col + k]) free = false;
      if (free) spots.push(col);
    }
    if (!spots.length) continue;
    const col = spots[rng.int(spots.length)];
    for (let k = 0; k < len; k++) taken[col + k] = 1;
    out.push({ col, len, colour: rng.int(6) });
  }
  return out;
}

const dealRng = (p: StackPuzzle, round: number) => random((p.seed ^ Math.imul(round + 1, 0x9e3779b1)) >>> 0);

export function start(p: StackPuzzle): StackState {
  const rng = dealRng(p, -1);
  const blocks: Block[] = [];
  // The opening rows are dealt like drops, but fuller, and always with a gap.
  for (let r = 0; r < tuning.startRows; r++) {
    for (const c of deal(rng, 80)) blocks.push({ ...c, id: blocks.length, row: H - 1 - r });
  }
  const settled = settle(blocks).blocks;
  return { blocks: settled, coming: deal(dealRng(p, 0), p.score), points: 0, rounds: 0, nextId: blocks.length, over: false };
}

/** Returns the same state object when the move changes nothing. */
export function apply(p: StackPuzzle, s: StackState, m: StackMove): StackState {
  if (s.over) return s;
  let blocks = s.blocks;
  if (!('pass' in m)) {
    const b = s.blocks.find((x) => x.id === m.block);
    if (!b || m.to === b.col) return s;
    const [lo, hi] = reach(s.blocks, b.id);
    if (m.to < lo || m.to > hi) return s;
    blocks = s.blocks.map((x) => (x.id === b.id ? { ...x, col: m.to } : x));
  }
  const afterSlide = settle(blocks);

  // The drop. A block that finds its place at the top already taken ends the game.
  const grid = cover(afterSlide.blocks);
  let nextId = s.nextId;
  let over = false;
  const dropped = [...afterSlide.blocks];
  for (const c of s.coming) {
    for (let k = 0; k < c.len; k++) if (grid[c.col + k] >= 0) over = true;
    dropped.push({ ...c, id: nextId++, row: 0 });
  }
  if (over) return { ...s, blocks: afterSlide.blocks, points: s.points + afterSlide.points, over: true };
  const afterDrop = settle(dropped);
  const rounds = s.rounds + 1;
  return {
    blocks: afterDrop.blocks,
    coming: deal(dealRng(p, rounds), p.score),
    points: s.points + afterSlide.points + afterDrop.points,
    rounds,
    nextId,
    over: false,
  };
}

export function status(_p: StackPuzzle, s: StackState): { ended: boolean; lost: boolean } {
  return { ended: s.over, lost: s.over };
}

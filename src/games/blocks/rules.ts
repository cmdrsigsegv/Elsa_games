// The block game: pieces are dealt three at a time and placed anywhere they
// fit on the board. A full row or column clears. The game ends when none of
// the pieces left can be placed; the aim is a high score. Every function here
// is pure, and the dealing is decided by the seed, so a saved game resumes
// exactly as it was.

import { random, type Random } from '../../kit/random';
import { tuning } from './tuning';

export const SIZE = tuning.size;

export interface Piece {
  /** Its cells as [column, row] offsets from its top-left corner. */
  cells: [number, number][];
  w: number;
  h: number;
  /** Which of the piece colours it is drawn in. */
  colour: number;
}

// Each piece drawn with # for a cell, rows separated by /.
const SHAPES = [
  '#', '##', '#/#', '###', '#/#/#', '####', '#/#/#/#', '#####', '#/#/#/#/#',
  '##/##', '###/###/###', '###/###', '##/##/##',
  '##/#.', '##/.#', '#./##', '.#/##',
  '###/#../#..', '###/..#/..#', '#../#../###', '..#/..#/###',
  '###/.#.', '.#./###', '#./##/#.', '.#/##/.#',
  '##./.##', '.##/##.', '#./##/.#', '.#/##/#.',
  '#./#./##', '.#/.#/##', '##/#./#.', '##/.#/.#', '###/#..', '###/..#', '#../###', '..#/###',
];

export const PIECES: Piece[] = SHAPES.map((shape, i) => {
  const rows = shape.split('/');
  const cells: [number, number][] = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && cells.push([x, y])));
  return { cells, w: rows[0].length, h: rows.length, colour: i % 6 };
});

export interface BlocksPuzzle {
  seed: number;
  /** The level the pieces are dealt at, 0 (kind) to 100 (as they fall). */
  score: number;
}

/** There is nothing to generate ahead of time: the pieces are dealt as the game goes, at this level. */
export const generate = (seed: number, target: number): BlocksPuzzle => ({ seed, score: target });

export interface BlocksState {
  /** SIZE x SIZE cells: 0 for empty, else a piece colour plus one. */
  board: number[];
  /** The three dealt pieces as indexes into PIECES; null once placed. */
  tray: (number | null)[];
  points: number;
  /** How many placements in a row have cleared a line. */
  streak: number;
  /** How many times three pieces have been dealt. */
  deals: number;
  over: boolean;
}

/** Puts piece `slot` of the tray with its top-left corner at column x, row y. */
export interface BlocksMove {
  slot: number;
  x: number;
  y: number;
}

export function fits(board: number[], piece: Piece, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x + piece.w > SIZE || y + piece.h > SIZE) return false;
  return piece.cells.every(([cx, cy]) => !board[(y + cy) * SIZE + x + cx]);
}

export function fitsAnywhere(board: number[], piece: Piece): boolean {
  for (let y = 0; y <= SIZE - piece.h; y++) for (let x = 0; x <= SIZE - piece.w; x++) if (fits(board, piece, x, y)) return true;
  return false;
}

/** The rows and columns that are full. */
export function fullLines(board: number[]): { rows: number[]; cols: number[] } {
  const all = Array.from({ length: SIZE }, (_, i) => i);
  return {
    rows: all.filter((r) => all.every((c) => board[r * SIZE + c])),
    cols: all.filter((c) => all.every((r) => board[r * SIZE + c])),
  };
}

/** The board after a piece goes down, before any lines clear. */
export function placed(board: number[], piece: Piece, x: number, y: number): number[] {
  const next = [...board];
  for (const [cx, cy] of piece.cells) next[(y + cy) * SIZE + x + cx] = piece.colour + 1;
  return next;
}

/** How well a piece suits a board: lines it can clear count most, then how snugly it sits. -1 if it does not fit. */
function suits(board: number[], piece: Piece): number {
  let best = -1;
  for (let y = 0; y <= SIZE - piece.h; y++) {
    for (let x = 0; x <= SIZE - piece.w; x++) {
      if (!fits(board, piece, x, y)) continue;
      const lines = fullLines(placed(board, piece, x, y));
      let touching = 0;
      for (const [cx, cy] of piece.cells) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + cx + dx;
          const ny = y + cy + dy;
          if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE || board[ny * SIZE + nx]) touching++;
        }
      }
      best = Math.max(best, (lines.rows.length + lines.cols.length) * 20 + touching);
    }
  }
  return best;
}

function draw(rng: Random, level: number): number {
  // Higher levels see fewer of the little pieces and more of the big ones.
  const hard = level / 100;
  const weights = PIECES.map((p) => (p.cells.length <= 2 ? 1.6 - hard : p.cells.length >= 5 ? 0.5 + hard : 1));
  let pick = rng.next() * weights.reduce((a, b) => a + b, 0);
  return weights.findIndex((w) => (pick -= w) < 0);
}

/** The next three pieces for a board, at a level. */
export function deal(board: number[], level: number, rng: Random): number[] {
  const kind = 1 - level / 100;
  const tray: number[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const drawn = Array.from({ length: tuning.drawn }, () => draw(rng, level));
    if (rng.next() < kind) drawn.sort((a, b) => suits(board, PIECES[b]) - suits(board, PIECES[a]));
    tray.push(drawn[0]);
  }
  if (level < tuning.alwaysPlayableBelow && !tray.some((i) => fitsAnywhere(board, PIECES[i]))) {
    const playable = PIECES.map((_, i) => i).filter((i) => fitsAnywhere(board, PIECES[i]));
    if (playable.length) tray[rng.int(3)] = playable[rng.int(playable.length)];
  }
  return tray;
}

const dealRng = (p: BlocksPuzzle, deals: number) => random((p.seed ^ Math.imul(deals + 1, 0x9e3779b1)) >>> 0);

const stuck = (board: number[], tray: (number | null)[]) => !tray.some((i) => i !== null && fitsAnywhere(board, PIECES[i]));

export function start(p: BlocksPuzzle): BlocksState {
  const board = new Array<number>(SIZE * SIZE).fill(0);
  return { board, tray: deal(board, p.score, dealRng(p, 0)), points: 0, streak: 0, deals: 1, over: false };
}

/** Returns the same state object when the move changes nothing. */
export function apply(p: BlocksPuzzle, s: BlocksState, m: BlocksMove): BlocksState {
  const index = s.tray[m.slot];
  if (s.over || index === null || index === undefined) return s;
  const piece = PIECES[index];
  if (!fits(s.board, piece, m.x, m.y)) return s;

  const board = placed(s.board, piece, m.x, m.y);
  const lines = fullLines(board);
  for (const r of lines.rows) for (let c = 0; c < SIZE; c++) board[r * SIZE + c] = 0;
  for (const c of lines.cols) for (let r = 0; r < SIZE; r++) board[r * SIZE + c] = 0;
  const cleared = lines.rows.length + lines.cols.length;
  const points = s.points + piece.cells.length + tuning.linePoints * cleared * (cleared + s.streak);

  let tray = s.tray.map((i, slot) => (slot === m.slot ? null : i));
  let deals = s.deals;
  if (tray.every((i) => i === null)) {
    tray = deal(board, p.score, dealRng(p, deals));
    deals++;
  }
  return { board, tray, points, streak: cleared ? s.streak + 1 : 0, deals, over: stuck(board, tray) };
}

export function status(_p: BlocksPuzzle, s: BlocksState): { ended: boolean } {
  return { ended: s.over };
}

import { describe, expect, it } from 'vitest';
import { random } from '../../kit/random';
import { PIECES, SIZE, apply, deal, fits, fitsAnywhere, fullLines, start, status, type BlocksPuzzle, type BlocksState } from './rules';

const empty = () => new Array<number>(SIZE * SIZE).fill(0);
/** The index of the piece drawn like this: # for a cell, rows separated by /. */
const piece = (shape: string) => {
  const rows = shape.split('/');
  const cells = rows.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === '#' ? [[x, y]] : [])));
  return PIECES.findIndex((q) => JSON.stringify(q.cells) === JSON.stringify(cells));
};
const p: BlocksPuzzle = { seed: 1, score: 40 };
const state = (over: Partial<BlocksState>): BlocksState => ({ board: empty(), tray: [0, 0, 0], points: 0, streak: 0, deals: 1, over: false, ...over });

/** A player with no plan: the piece goes in the first place it fits. */
function drop(q: BlocksPuzzle, s: BlocksState, slot: number): BlocksState {
  const shape = PIECES[s.tray[slot]!];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (fits(s.board, shape, x, y)) return apply(q, s, { slot, x, y });
  return s;
}

describe('pieces', () => {
  it('are all different and sit against their top-left corner', () => {
    const seen = new Set(PIECES.map((q) => JSON.stringify(q.cells)));
    expect(seen.size).toBe(PIECES.length);
    for (const q of PIECES) {
      expect(Math.min(...q.cells.map(([x]) => x))).toBe(0);
      expect(Math.min(...q.cells.map(([, y]) => y))).toBe(0);
    }
  });

  it('fit only on free cells inside the board', () => {
    const line = PIECES[piece('###')];
    expect(fits(empty(), line, 5, 0)).toBe(true);
    expect(fits(empty(), line, 6, 0)).toBe(false);
    const board = empty();
    board[1] = 1;
    expect(fits(board, line, 0, 0)).toBe(false);
    expect(fits(board, line, 0, 1)).toBe(true);
  });
});

describe('rules', () => {
  it('places a piece, scores its cells, and empties its tray slot', () => {
    const s = apply(p, state({ tray: [piece('##/##'), 0, 0] }), { slot: 0, x: 2, y: 3 });
    expect(s.board.filter(Boolean).length).toBe(4);
    expect(s.board[3 * SIZE + 2]).toBeGreaterThan(0);
    expect(s.points).toBe(4);
    expect(s.tray).toEqual([null, 0, 0]);
  });

  it('refuses a piece that does not fit, or a slot already used', () => {
    const s = state({ tray: [piece('##/##'), null, 0] });
    expect(apply(p, s, { slot: 0, x: 7, y: 7 })).toBe(s);
    expect(apply(p, s, { slot: 1, x: 0, y: 0 })).toBe(s);
  });

  it('clears a full row and a full column together, and pays for both', () => {
    // Row 0 and column 0 are full except for their shared corner.
    const board = empty();
    for (let i = 1; i < SIZE; i++) {
      board[i] = 1;
      board[i * SIZE] = 1;
    }
    board[SIZE + 1] = 2; // a bystander that must survive
    const s = apply(p, state({ board, tray: [piece('#'), 0, 0] }), { slot: 0, x: 0, y: 0 });
    expect(s.board.filter(Boolean).length).toBe(1);
    expect(s.board[SIZE + 1]).toBe(2);
    expect(s.points).toBe(1 + 10 * 2 * 2);
    expect(s.streak).toBe(1);
    expect(fullLines(s.board)).toEqual({ rows: [], cols: [] });
  });

  it('pays more for clears in a row, and resets when one does not clear', () => {
    const board = empty();
    for (let c = 1; c < SIZE; c++) board[c] = 1;
    const s = apply(p, state({ board, streak: 2, tray: [piece('#'), piece('#'), 0] }), { slot: 0, x: 0, y: 0 });
    expect(s.points).toBe(1 + 10 * 1 * (1 + 2));
    expect(apply(p, s, { slot: 1, x: 4, y: 4 }).streak).toBe(0);
  });

  it('deals three more when the tray is empty, the same ones every time for a seed', () => {
    const play = (s: BlocksState) => [0, 1, 2].reduce((at, slot) => drop(p, at, slot), s);
    const a = play(start(p));
    const b = play(start(p));
    expect(a.deals).toBe(2);
    expect(a.tray.every((i) => i !== null)).toBe(true);
    expect(a).toEqual(b);
    expect(start({ seed: 2, score: 40 }).tray).not.toEqual(start(p).tray);
  });

  it('is over when nothing left in the tray fits', () => {
    // A checkerboard leaves room for single cells only.
    const board = empty().map((_, i) => ((i + Math.floor(i / SIZE)) % 2 ? 1 : 0));
    const s = apply(p, state({ board, tray: [piece('#'), piece('##'), piece('###')] }), { slot: 0, x: 0, y: 0 });
    expect(s.over).toBe(true);
    expect(status(p, s).ended).toBe(true);
    expect(apply(p, s, { slot: 1, x: 0, y: 0 })).toBe(s);
  });
});

describe('dealing', () => {
  it('always gives something playable at the kinder levels, when anything is', () => {
    const board = empty().map((_, i) => ((i + Math.floor(i / SIZE)) % 2 ? 1 : 0));
    for (let seed = 1; seed <= 50; seed++) {
      expect(deal(board, 30, random(seed)).some((i) => fitsAnywhere(board, PIECES[i]))).toBe(true);
    }
  });

  it('is kinder at low levels: the same simple player scores more', () => {
    const average = (level: number) => {
      let total = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const q: BlocksPuzzle = { seed, score: level };
        let s = start(q);
        for (let n = 0; n < 400 && !s.over; n++) {
          s = drop(q, s, s.tray.findIndex((i) => i !== null && fitsAnywhere(s.board, PIECES[i])));
        }
        total += s.points;
      }
      return total / 40;
    };
    const [kind, middle, harsh] = [10, 50, 90].map(average);
    console.log('simple player, average points at levels 10 / 50 / 90:', Math.round(kind), Math.round(middle), Math.round(harsh));
    expect(kind).toBeGreaterThan(middle);
    expect(middle).toBeGreaterThan(harsh);
  });
});

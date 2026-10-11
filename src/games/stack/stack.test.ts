import { describe, expect, it } from 'vitest';
import { random } from '../../kit/random';
import { H, W, apply, cover, deal, fall, fullRows, play, reach, settle, start, status, type Block, type Frame, type StackPuzzle, type StackState } from './rules';

const p: StackPuzzle = { seed: 1, score: 40 };
let ids = 0;
const block = (row: number, col: number, len: number): Block => ({ id: ids++, row, col, len, colour: 0 });
const state = (blocks: Block[], over: Partial<StackState> = {}): StackState => ({
  blocks,
  coming: [],
  points: 0,
  rounds: 0,
  nextId: 1000,
  over: false,
  ...over,
});
const at = (blocks: Block[], id: number) => blocks.find((b) => b.id === id)!;

describe('the well', () => {
  it('lets a block slide until it meets the wall or another block', () => {
    const a = block(9, 2, 2);
    const b = block(9, 6, 2);
    expect(reach([a, b], a.id)).toEqual([0, 4]);
    expect(reach([a, b], b.id)).toEqual([4, 6]);
  });

  it('drops a block that has nothing under it, and rests one that has', () => {
    const floor = block(9, 0, 3);
    const resting = block(5, 2, 3); // overlaps the floor block by one column
    const loose = block(5, 5, 2);
    const after = fall([floor, resting, loose]);
    expect(at(after, resting.id).row).toBe(8);
    expect(at(after, loose.id).row).toBe(9);
    expect(at(after, floor.id).row).toBe(9);
  });

  it('clears a row filled from wall to wall, and what was above falls', () => {
    const row = [block(9, 0, 4), block(9, 4, 4)];
    const above = block(8, 1, 2);
    expect(fullRows([...row, above])).toEqual([9]);
    const after = settle([...row, above]);
    expect(after.blocks.map((b) => b.id)).toEqual([above.id]);
    expect(after.blocks[0].row).toBe(9);
    expect(after.points).toBe(10);
  });

  it('pays double for two rows cleared together', () => {
    const after = settle([block(9, 0, 4), block(9, 4, 4), block(8, 0, 4), block(8, 4, 4)]);
    expect(after.blocks).toEqual([]);
    expect(after.points).toBe(20);
  });

  it('pays more for each link of a chain reaction, and reports every step', () => {
    // The second row from the bottom is full; the bottom row has a gap, and a block sits above it.
    // Clearing the full row lets that block fall into the gap and complete the bottom row.
    const frames: Frame[] = [];
    const plug = block(7, 6, 2);
    const after = settle([block(9, 0, 6), block(8, 0, 4), block(8, 4, 4), plug], frames);
    expect(after.blocks).toEqual([]);
    expect(after.points).toBe(10 + 20);
    expect(frames.map((f) => (f.kind === 'clear' ? `clear ${f.rows} x${f.chain} +${f.gained}` : 'move'))).toEqual([
      'clear 8 x1 +10',
      'move',
      'clear 9 x2 +20',
    ]);
  });
});

describe('a round', () => {
  it('slides, then drops what is coming, and deals the next drop', () => {
    const a = block(9, 0, 2);
    const s0 = state([a], { coming: [{ col: 5, len: 3, colour: 1 }] });
    const s1 = apply(p, s0, { block: a.id, to: 3 });
    expect(at(s1.blocks, a.id).col).toBe(3);
    expect(s1.blocks.length).toBe(2);
    expect(s1.blocks.find((b) => b.id === 1000)).toMatchObject({ row: 9, col: 5, len: 3 });
    expect(s1.rounds).toBe(1);
    expect(s1.coming.length).toBeGreaterThan(0);
    expect(s0.blocks[0].col).toBe(0); // the old state is untouched
  });

  it('refuses a slide through another block, and one that goes nowhere', () => {
    const a = block(9, 0, 2);
    const b = block(9, 3, 2);
    const s = state([a, b]);
    expect(apply(p, s, { block: a.id, to: 5 })).toBe(s);
    expect(apply(p, s, { block: a.id, to: 0 })).toBe(s);
  });

  it('a slide that completes a row clears it before the drop lands', () => {
    // The bottom row has one gap, at column 4. A single block sits beside it, one row up.
    const single = block(8, 5, 1);
    const s0 = state([block(9, 0, 4), block(9, 5, 3), single], { coming: [{ col: 0, len: 2, colour: 0 }] });
    // Slid over the gap, it falls in and completes the row.
    const s1 = apply(p, s0, { block: single.id, to: 4 });
    expect(s1.points).toBe(10);
    expect(s1.blocks.length).toBe(1); // only the dropped block is left
    expect(s1.blocks[0]).toMatchObject({ row: 9, col: 0, len: 2 });
  });

  it('reports the drop as a step, and a row it completes as the next link in the chain', () => {
    // Her slide completes the bottom row; the drop then completes the row that is left.
    const single = block(8, 5, 1);
    const s0 = state([block(9, 0, 4), block(9, 5, 3), single, block(8, 0, 4)], { coming: [{ col: 4, len: 4, colour: 0 }] });
    const { state: s1, frames } = play(p, s0, { block: single.id, to: 4 });
    expect(s1.points).toBe(10 + 20);
    expect(frames.filter((f) => f.kind === 'clear').map((f) => f.kind === 'clear' && f.chain)).toEqual([1, 2]);
    expect(play(p, s1, { block: 99999, to: 0 }).frames).toEqual([]);
  });

  it('letting the round go by still brings the drop', () => {
    const s = apply(p, state([block(9, 0, 2)], { coming: [{ col: 4, len: 1, colour: 0 }] }), { pass: true });
    expect(s.blocks.length).toBe(2);
    expect(s.rounds).toBe(1);
  });

  it('is over when a block has nowhere to drop', () => {
    // A column stacked to the top, and a block due to drop on it.
    const tower = Array.from({ length: H }, (_, row) => block(row, 0, 1));
    const s = apply(p, state(tower, { coming: [{ col: 0, len: 2, colour: 0 }] }), { pass: true });
    expect(s.over).toBe(true);
    expect(status(p, s)).toEqual({ ended: true, lost: true });
    expect(apply(p, s, { pass: true })).toBe(s);
  });
});

describe('dealing', () => {
  it('starts with a few settled rows, the same every time for a seed', () => {
    const s = start(p);
    expect(s).toEqual(start(p));
    expect(s.blocks.length).toBeGreaterThan(2);
    expect(fullRows(s.blocks)).toEqual([]);
    expect(fall(s.blocks).map((b) => b.row).sort()).toEqual(s.blocks.map((b) => b.row).sort());
    // No two blocks overlap.
    expect([...cover(s.blocks)].filter((i) => i >= 0).length).toBe(s.blocks.reduce((n, b) => n + b.len, 0));
    expect(start({ seed: 2, score: 40 }).blocks).not.toEqual(s.blocks);
  });

  it('never deals blocks that touch or overhang the well', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const coming = deal(random(seed), 95);
      const filled = new Array<number>(W).fill(0);
      for (const c of coming) for (let k = 0; k < c.len; k++) filled[c.col + k]++;
      expect(coming.length).toBeGreaterThan(0);
      expect(filled.length).toBe(W);
      expect(Math.max(...filled)).toBe(1);
    }
  });

  it('brings more, and longer, blocks at high levels', () => {
    const perRound = (level: number) => {
      let cells = 0;
      for (let seed = 1; seed <= 400; seed++) for (const c of deal(random(seed), level)) cells += c.len;
      return cells / 400;
    };
    const [slow, middle, fast] = [5, 50, 95].map(perRound);
    console.log('cells dropped a round, at levels 5 / 50 / 95:', slow.toFixed(1), middle.toFixed(1), fast.toFixed(1));
    expect(middle).toBeGreaterThan(slow * 1.3);
    expect(fast).toBeGreaterThan(middle * 1.1);
    // Never a full row in one drop: there is always somewhere to slide.
    expect(fast).toBeLessThan(W);
  });
});

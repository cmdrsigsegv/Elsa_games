import { describe, expect, it } from 'vitest';
import { random } from '../../kit/random';
import { H, W, apply, cover, deal, fall, fullRows, reach, settle, start, status, type Block, type StackPuzzle, type StackState } from './rules';

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

  it('pays more for each row of a chain reaction', () => {
    // Clearing the bottom row lets the block above fall and complete the next one.
    const bottom = [block(9, 0, 4), block(9, 4, 4)];
    const second = [block(8, 0, 4), block(8, 4, 2)];
    const plug = block(6, 6, 2); // sits on nothing yet: it falls into the gap in the second row
    const after = settle([...bottom, ...second, plug]);
    expect(after.blocks).toEqual([]);
    expect(after.points).toBe(10 + 20);
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

  it('brings blocks faster at high levels: a player who never moves lasts fewer rounds', () => {
    const rounds = (level: number) => {
      let total = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const q: StackPuzzle = { seed, score: level };
        let s = start(q);
        while (!s.over && s.rounds < 500) s = apply(q, s, { pass: true });
        total += s.rounds;
      }
      return total / 30;
    };
    const [slow, middle, fast] = [10, 50, 90].map(rounds);
    console.log('rounds survived without moving, at levels 10 / 50 / 90:', Math.round(slow), Math.round(middle), Math.round(fast));
    expect(slow).toBeGreaterThan(middle);
    expect(middle).toBeGreaterThan(fast);
  });
});

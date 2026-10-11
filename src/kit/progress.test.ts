import { describe, expect, it } from 'vitest';
import {
  DIFFICULTIES,
  EASIEST_LEVEL,
  SET_SIZE,
  levelFor,
  nextUnsolved,
  seedFor,
  setAt,
  setDone,
  withDifficulty,
  withNextSet,
  withSolved,
  type Place,
  type Progress,
} from './progress';

const at = (difficulty: number, index: number, set = 0): Place => ({ difficulty, set, index });
const fresh: Progress = { difficulty: 1, sets: {} };

describe('levels', () => {
  it('start above the trivial end and reach the top', () => {
    expect(levelFor(at(1, 0))).toBe(EASIEST_LEVEL);
    expect(levelFor(at(DIFFICULTIES, SET_SIZE - 1))).toBeGreaterThan(94);
    expect(levelFor(at(DIFFICULTIES, SET_SIZE - 1))).toBeLessThanOrEqual(100);
  });

  it('climb through a set, and from one difficulty to the next', () => {
    for (let d = 1; d <= DIFFICULTIES; d++) {
      for (let i = 1; i < SET_SIZE - 1; i++) expect(levelFor(at(d, i))).toBeGreaterThan(levelFor(at(d, i - 1)));
      if (d > 1) expect(levelFor(at(d, 0))).toBeGreaterThan(levelFor(at(d - 1, SET_SIZE - 2)));
    }
  });

  it('make the last puzzle of a set a taste of the next difficulty', () => {
    const last = levelFor(at(3, SET_SIZE - 1));
    expect(last).toBeGreaterThan(levelFor(at(4, 0)));
    expect(last).toBeLessThan(levelFor(at(4, SET_SIZE - 2)));
  });
});

describe('seeds', () => {
  it('are the same for the same place, and differ between places and games', () => {
    expect(seedFor('sudoku', at(2, 4))).toBe(seedFor('sudoku', at(2, 4)));
    const seeds = new Set([
      seedFor('sudoku', at(2, 4)),
      seedFor('sudoku', at(2, 5)),
      seedFor('sudoku', at(3, 4)),
      seedFor('sudoku', at(2, 4, 1)),
      seedFor('nonogram', at(2, 4)),
    ]);
    expect(seeds.size).toBe(5);
  });
});

describe('progress', () => {
  it('marks puzzles solved and finds the next one to play, going round', () => {
    let p = withSolved(fresh, at(1, 0));
    p = withSolved(p, at(1, 2));
    expect(setAt(p, 1).solved.slice(0, 4)).toEqual([true, false, true, false]);
    expect(nextUnsolved(p, at(1, 0))).toEqual(at(1, 1));
    expect(nextUnsolved(p, at(1, 1))).toEqual(at(1, 3));
    expect(nextUnsolved(p, at(1, SET_SIZE - 1))).toEqual(at(1, 1));
    expect(fresh.sets).toEqual({}); // the old progress is untouched
  });

  it('ignores a puzzle from a set she has since left', () => {
    expect(withSolved(fresh, at(1, 0, 3))).toBe(fresh);
  });

  it('finishing a set moves her up, and leaves a new set behind', () => {
    let p = fresh;
    for (let i = 0; i < SET_SIZE; i++) p = withSolved(p, at(1, i));
    expect(setDone(p, 1)).toBe(true);
    expect(nextUnsolved(p, at(1, 0))).toBeNull();
    p = withNextSet(p, 1);
    expect(p.difficulty).toBe(2);
    expect(setAt(p, 1)).toEqual({ set: 1, solved: new Array(SET_SIZE).fill(false) });
  });

  it('keeps the difficulty between 1 and the top', () => {
    expect(withDifficulty(fresh, 0).difficulty).toBe(1);
    expect(withDifficulty(fresh, 99).difficulty).toBe(DIFFICULTIES);
    let p = { ...fresh, difficulty: DIFFICULTIES };
    for (let i = 0; i < SET_SIZE; i++) p = withSolved(p, at(DIFFICULTIES, i));
    expect(withNextSet(p, DIFFICULTIES).difficulty).toBe(DIFFICULTIES);
  });
});

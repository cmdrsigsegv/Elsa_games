import { describe, expect, it } from 'vitest';
import { initialSkill, nextTarget, update, type AdaptiveTuning, type Result } from './adaptive';
import { random } from './random';

const t: AdaptiveTuning = {
  startLevel: 40,
  floor: 10,
  ceiling: 90,
  startStep: 8,
  minStep: 2,
  silentWeight: 0.4,
  breatherPercent: 10,
  stretchPercent: 10,
  breatherBy: 9,
  stretchBy: 6,
};

const result = (over: Partial<Result>): Result => ({
  score: 40,
  rating: null,
  timeMs: 300_000,
  hints: 0,
  mistakes: 0,
  abandoned: false,
  ...over,
});

describe('adaptive difficulty', () => {
  it('goes up on "too easy" and down on "too hard"', () => {
    const s = initialSkill(t);
    expect(update(s, result({ rating: 'easy' }), t).level).toBe(48);
    expect(update(s, result({ rating: 'hard' }), t).level).toBe(32);
    expect(update(s, result({ rating: 'right' }), t).level).toBe(40);
  });

  it('takes smaller steps after turning round, and after "just right"', () => {
    let s = update(initialSkill(t), result({ rating: 'easy' }), t);
    const before = s.step;
    s = update(s, result({ score: s.level, rating: 'hard' }), t);
    expect(s.step).toBeLessThan(before);
    expect(update(s, result({ score: s.level, rating: 'right' }), t).step).toBeLessThan(s.step);
  });

  it('settles on a player whose comfortable level is 62', () => {
    let s = initialSkill(t);
    for (let i = 0; i < 30; i++) {
      const score = s.level;
      s = update(s, result({ score, rating: score < 59 ? 'easy' : score > 65 ? 'hard' : 'right' }), t);
    }
    expect(s.level).toBeGreaterThanOrEqual(59);
    expect(s.level).toBeLessThanOrEqual(65);
  });

  it('stays inside the floor and ceiling', () => {
    let up = initialSkill(t);
    let down = initialSkill(t);
    for (let i = 0; i < 40; i++) {
      up = update(up, result({ score: up.level, rating: 'easy' }), t);
      down = update(down, result({ score: down.level, rating: 'hard' }), t);
    }
    expect(up.level).toBe(90);
    expect(down.level).toBe(10);
  });

  it('counts a rating on a breather or a stretch for less', () => {
    const s = initialSkill(t);
    expect(update(s, result({ score: 30, rating: 'easy' }), t).level).toBe(44);
    expect(update(s, result({ score: 47, rating: 'hard' }), t).level).toBe(36);
  });

  it('moves less without a rating than with one', () => {
    const s = initialSkill(t);
    const hinted = update(s, result({ hints: 3 }), t).level;
    expect(hinted).toBeLessThan(40);
    expect(hinted).toBeGreaterThan(32);
    expect(update(s, result({ abandoned: true }), t).level).toBeLessThan(40);
    expect(update(s, result({}), t).level).toBeGreaterThan(40); // a clean solve nudges up
  });

  it('reads a fast or slow solve against her usual time', () => {
    const s = { ...initialSkill(t), usualMs: 300_000 };
    expect(update(s, result({ timeMs: 150_000 }), t).level).toBeGreaterThan(40);
    expect(update(s, result({ timeMs: 600_000 }), t).level).toBeLessThan(40);
    expect(update(s, result({ timeMs: 300_000 }), t).level).toBe(40);
  });

  it('aims mostly at her level, sometimes easier or harder, never out of bounds', () => {
    const s = initialSkill(t);
    const rng = random(1);
    const targets = Array.from({ length: 400 }, () => nextTarget(s, rng, t));
    const near = targets.filter((x) => Math.abs(x - 40) <= 2).length;
    expect(near).toBeGreaterThan(280);
    expect(targets).toContain(31);
    expect(targets).toContain(46);
    const low = { ...s, level: 12 };
    for (let i = 0; i < 100; i++) expect(nextTarget(low, rng, t)).toBeGreaterThanOrEqual(10);
  });
});

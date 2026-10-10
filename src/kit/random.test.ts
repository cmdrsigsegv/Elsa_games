import { describe, expect, it } from 'vitest';
import { random } from './random';

describe('random', () => {
  it('gives the same sequence for the same seed', () => {
    const a = random(42);
    const b = random(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('gives different sequences for different seeds', () => {
    const a = Array.from({ length: 8 }, random(1).next);
    const b = Array.from({ length: 8 }, random(2).next);
    expect(a).not.toEqual(b);
  });

  it('keeps floats in [0, 1) and ints in [0, n)', () => {
    const r = random(7);
    for (let i = 0; i < 1000; i++) {
      const f = r.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = r.int(9);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(9);
    }
  });

  it('reaches every value of a small range', () => {
    const r = random(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(r.int(9));
    expect(seen.size).toBe(9);
  });

  it('shuffles without losing or repeating items', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffled = random(5).shuffle([...items]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
    expect(shuffled).not.toEqual(items);
  });
});

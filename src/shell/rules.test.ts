import { describe, expect, it } from 'vitest';
import { games } from '../games';
import { rules } from './rules';
import { languages } from './strings';

describe('rules', () => {
  it.each(games.map((g) => g.id))('%s has its rules written out in every language', (id) => {
    for (const language of Object.keys(languages) as (keyof typeof languages)[]) {
      const r = rules[id]?.[language];
      expect(r, `${id} in ${language}`).toBeDefined();
      expect(r.goal.length).toBeGreaterThan(10);
      expect(r.rules.length).toBeGreaterThanOrEqual(3);
      expect(r.how.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('says the same number of things in each language', () => {
    for (const [id, r] of Object.entries(rules)) {
      expect(r.af.rules.length, id).toBe(r.en.rules.length);
      expect(r.af.how.length, id).toBe(r.en.how.length);
    }
  });
});

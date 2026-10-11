// Turns a level from 0 to 100 into what the generator should make, and what
// the solver needed into a score on the same scale.
//
// Two things make a kakuro hard: how big it is, and the hardest technique it
// takes. The score is the average of the two, each put on the 0 to 100 scale.

import type { Solved } from './solve';
import { tuning } from './tuning';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const between = (range: { easy: number; hard: number }, level: number) =>
  range.easy + (range.hard - range.easy) * clamp(level / 100, 0, 1);

/** How many cells a side the white part of the grid is. */
export function sideFor(level: number): number {
  const s = tuning.sides;
  for (let i = 1; i < s.length; i++) {
    if (level > s[i].level) continue;
    const share = clamp((level - s[i - 1].level) / (s[i].level - s[i - 1].level), 0, 1);
    return Math.round(s[i - 1].side + share * (s[i].side - s[i - 1].side));
  }
  return s[s.length - 1].side;
}

/** The level at which grids become this size: the opposite of sideFor. */
function levelOfSide(side: number): number {
  const s = tuning.sides;
  for (let i = 1; i < s.length; i++) {
    if (side > s[i].side) continue;
    return s[i - 1].level + ((side - s[i - 1].side) / (s[i].side - s[i - 1].side)) * (s[i].level - s[i - 1].level);
  }
  return 100;
}

export const longestRunFor = (level: number) => Math.round(between(tuning.longestRun, level));

/** The hardest technique tier a puzzle aimed at `level` is allowed to need. */
export function tierFor(level: number): number {
  let tier = tuning.tiers[0].tier;
  for (const t of tuning.tiers) if (level >= t.from) tier = t.tier;
  return tier;
}

// How hard the solving was, by the hardest technique needed; within a
// technique, harder the more often it was needed.
function techniqueScore(s: Solved): number {
  const u = s.uses;
  switch (s.hardest) {
    case 0:
    case 1:
      return 10;
    case 2:
      return 26 + Math.min(16, u.fit);
    case 3:
      return 44 + Math.min(12, u.bounds * 2);
    case 4:
      return 57 + Math.min(12, u.pair * 3 + u.bounds);
    case 5:
      return 70 + Math.min(15, u.fillings * 2 + u.pair);
    default:
      return 86 + Math.min(14, u.longFillings * 3 + u.fillings);
  }
}

/** `side` is how many cells a side the white part of the grid is. */
export function score(s: Solved, side: number): number {
  return Math.round(clamp((levelOfSide(side) + techniqueScore(s)) / 2, 0, 100));
}

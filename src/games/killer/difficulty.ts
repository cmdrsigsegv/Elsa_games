// Turns "which techniques did the solver need" into one number from 0 to 100,
// and back: which techniques a puzzle aimed at a given level may need.
//
// The bands, by the hardest technique a puzzle needs:
//    5-46  cage totals and singles only; harder as the cages grow
//   48-56  the rule of 45 on one row, column or box, leaving one cell
//   58-66  the same over several, and locked candidates
//   68-76  two cells left by the rule of 45, cage and unit together, pairs
//   78-87  two cells left over several units, triples
//   89-100 three cells left by the rule of 45, wings

import type { Cage, Solved } from './solve';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function score(s: Solved, cages: Cage[]): number {
  const u = s.uses;
  const tier3 = u.sum45Wide + u.locked;
  const tier4 = u.pair45 + u.cageUnit + u.nakedPair + u.hiddenPair;
  const tier5 = u.pair45Wide + u.nakedTriple + u.hiddenTriple;
  const tier6 = u.triple45 + u.xWing + u.xyWing;
  switch (s.hardest) {
    case 0:
    case 1:
      // Nothing but adding up: what makes it harder is bigger cages.
      return Math.round(clamp(5 + (81 / cages.length - 1) * 30, 5, 46));
    case 2:
      return 48 + Math.min(8, u.sum45);
    case 3:
      return 58 + Math.min(8, tier3 * 2);
    case 4:
      return 68 + Math.min(8, tier4 + tier3 / 2);
    case 5:
      return Math.round(78 + Math.min(9, tier5 * 2 + tier4 / 2));
    default:
      return Math.round(89 + Math.min(11, tier6 * 3 + tier5));
  }
}

/** The hardest technique tier a puzzle aimed at `level` is allowed to need. */
export function tierFor(level: number): number {
  if (level < 47) return 1;
  if (level < 57) return 2;
  if (level < 67) return 3;
  if (level < 77) return 4;
  if (level < 88) return 5;
  return 6;
}

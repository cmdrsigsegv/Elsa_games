// Turns "which techniques did the solver need" into one number from 0 to 100,
// and back: which techniques a puzzle aimed at a given level may need.
//
// The bands, by the hardest technique a puzzle needs:
//    5-24  hidden singles only; harder as more cells are empty
//   26-39  naked singles
//   42-54  locked candidates
//   56-67  pairs
//   69-78  triples
//   80-92  X-wing and XY-wing
//   100    beyond all of those: one solution, but no named technique here finds the way

import type { Solved } from './solve';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function score(s: Solved, empties: number): number {
  if (!s.solved) return 100;
  const u = s.uses;
  const pairs = u.nakedPair + u.hiddenPair;
  const triples = u.nakedTriple + u.hiddenTriple;
  const wings = u.xWing + u.xyWing;
  switch (s.hardest) {
    case 0:
    case 1:
      return clamp(8 + (empties - 30) * 0.5, 5, 24);
    case 2:
      return 26 + Math.min(13, u.nakedSingle * 1.5);
    case 3:
      return 42 + Math.min(12, u.locked * 3);
    case 4:
      return 56 + Math.min(11, pairs * 3 + u.locked);
    case 5:
      return 69 + Math.min(9, triples * 3 + pairs);
    default:
      return 80 + Math.min(12, wings * 4 + triples * 2 + pairs);
  }
}

/** The tier above every named technique: a puzzle the solver cannot finish. */
export const BEYOND = 7;
const BEYOND_FROM = 93;

/** The hardest technique tier a puzzle aimed at `level` is allowed to need. */
export function tierFor(level: number): number {
  if (level < 25) return 1;
  if (level < 41) return 2;
  if (level < 55) return 3;
  if (level < 68) return 4;
  if (level < 79) return 5;
  if (level < BEYOND_FROM) return 6;
  return BEYOND;
}

/** In the easiest band difficulty is set by how many cells are left empty. */
export function emptiesFor(level: number): number {
  if (level >= 25) return 81;
  return Math.round(clamp(30 + (level - 8) * 2, 26, 62));
}

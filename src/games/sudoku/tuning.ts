// Everything about sudoku that is a matter of taste rather than rules.
// Change a value here, push, and it is on the phone at the next launch.

import type { AdaptiveTuning } from '../../kit/adaptive';

export const tuning = {
  /** Difficulty runs from 0 (trivial) to 100 (the hardest the generator makes). */
  adaptive: {
    startLevel: 34,
    floor: 8,
    ceiling: 92,
    /** How far the level moves on the first few ratings, and the least it ever moves. */
    startStep: 8,
    minStep: 2,
    /** How much a puzzle with no rating counts, against 1 for a rated one. */
    silentWeight: 0.4,
    /** Out of every 100 puzzles, how many are a breather and how many a stretch. */
    breatherPercent: 12,
    stretchPercent: 12,
    breatherBy: 9,
    stretchBy: 6,
  } satisfies AdaptiveTuning,

  /**
   * When a wrong number turns red, unless she changes it in Options:
   *   'obvious'  only when it clashes with the same number in its row, column or box
   *   'always'   as soon as it is entered
   */
  mistakes: 'obvious' as 'obvious' | 'always',
  /** With 'obvious': offer to show the slips once this many wrong numbers are sitting unnoticed. */
  offerRevealAfter: 3,
  /** Remove a number from the notes around a cell when it is filled in. */
  tidyNotes: true,
  /** Highlight every cell holding the same number as the selected one. */
  highlightSameNumber: true,
  /** Givens are removed in mirrored pairs, which makes prettier grids. */
  symmetric: true,
  /** How many puzzles the generator makes before keeping the closest to the target. */
  attempts: 80,
};

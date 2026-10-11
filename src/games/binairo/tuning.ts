// Everything about Binairo that is a matter of taste rather than rules.

/**
 * The reasoning a puzzle may need, easiest first:
 *   1  two alike side by side, or two alike with a gap between: the cell next
 *      to them, or between them, is the other kind
 *   2  a row or column that already has its half of one kind: the rest are the other
 *   3  "if this cell were dark, the rest of its row could not be finished":
 *      looking ahead inside one row or column
 *   4  a row with two cells left that would otherwise copy a finished row
 *   5  trying every way to finish a row or column that has only a few cells
 *      left, and keeping what all of them agree on
 *   6  the same, for any row or column however empty
 */
export interface Band {
  /** The band covers levels from here up to the next band. */
  from: number;
  /** Cells along one side. */
  size: number;
  /** The hardest reasoning allowed, from the list above. */
  tier: number;
}

export const tuning = {
  /**
   * Grid size and allowed reasoning by level. The app asks for levels 40 to
   * 100 only, six levels to a difficulty, so each band from 40 up is one of
   * the ten difficulties.
   */
  bands: [
    { from: 0, size: 6, tier: 1 },
    { from: 20, size: 6, tier: 2 },
    { from: 40, size: 8, tier: 2 },
    { from: 46, size: 8, tier: 3 },
    { from: 52, size: 10, tier: 3 },
    { from: 58, size: 10, tier: 4 },
    { from: 64, size: 10, tier: 5 },
    { from: 70, size: 12, tier: 4 },
    { from: 76, size: 12, tier: 5 },
    { from: 82, size: 12, tier: 6 },
    { from: 88, size: 14, tier: 5 },
    { from: 94, size: 14, tier: 6 },
  ] as Band[],
  /** Reasoning 5 looks only at rows and columns with at most this many cells left. */
  smallLine: 5,
  /**
   * How many puzzles the generator makes, by grid size, before keeping the
   * one closest to the level asked for. Bigger grids take longer to make, so
   * they get fewer tries.
   */
  attempts: { 6: 10, 8: 10, 10: 10, 12: 8, 14: 6 } as Record<number, number>,
  /**
   * Filling the solution grid normally takes well under a hundred steps. A
   * fill that has taken this many has gone astray and is started afresh.
   */
  fillSteps: 300,
  /** A puzzle in the band asked for, scoring within this much of the level, is kept without trying further. */
  closeEnough: 2,
  /**
   * Within a band the score rises with how much of the puzzle needs the
   * band's hardest reasoning: this share of the empty cells puts it at the top.
   */
  shareForTop: 0.06,
};

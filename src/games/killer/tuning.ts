// Everything about killer sudoku that is a matter of taste rather than rules.
// Change a value here, push, and it is on the phone at the next launch.

export const tuning = {
  /**
   * When a wrong number turns red, unless she changes it in Options:
   *   'obvious'  only when it visibly breaks a rule: a repeat in its row, column,
   *              box or cage, or a cage that no longer adds up
   *   'always'   as soon as it is entered
   */
  mistakes: 'obvious' as 'obvious' | 'always',
  /** With 'obvious': offer to show the slips once this many wrong numbers are sitting unnoticed. */
  offerRevealAfter: 3,
  /** Remove a number from the notes around a cell when it is filled in. */
  tidyNotes: true,
  /** Highlight every cell holding the same number as the selected one. */
  highlightSameNumber: true,

  /**
   * How big the cages are. Each row is a level and, for cages of one to six
   * cells, how often the generator aims for that size; levels in between
   * blend their neighbours. Where one-cell cages have no weight, none are made.
   */
  cageSizes: [
    { level: 0, weights: [8, 5, 2, 0, 0, 0] },
    { level: 40, weights: [3, 6, 4, 1, 0, 0] },
    { level: 75, weights: [0, 3, 5, 4, 1, 0] },
    { level: 100, weights: [0, 0.5, 2, 4, 4, 3] },
  ],
  /** How many puzzles the generator makes before keeping the closest to the target. */
  attempts: 6,
  /** It stops early at a puzzle whose measured difficulty is this near the target. */
  closeEnough: 3,
  /** How many times it may fail to make a puzzle at all before it settles for one with one-cell cages. */
  failures: 40,
  /** How many times, per puzzle made, it tries joining two cages to make it harder. */
  joins: 24,
};

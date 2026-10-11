// Everything about sudoku that is a matter of taste rather than rules.
// Change a value here, push, and it is on the phone at the next launch.

export const tuning = {
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

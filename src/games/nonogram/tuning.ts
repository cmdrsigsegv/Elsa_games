// Everything about nonograms that is a matter of taste rather than rules.

export const tuning = {
  /**
   * Grid size by level. Within a size, a puzzle scores higher the more times
   * the lines have to be gone over to finish it: `easyRounds` scores `from`,
   * `hardRounds` scores `to`.
   */
  bands: [
    { size: 5, from: 3, to: 10, easyRounds: 1, hardRounds: 4 },
    { size: 10, from: 10, to: 25, easyRounds: 2, hardRounds: 8 },
    { size: 15, from: 25, to: 46, easyRounds: 3, hardRounds: 9 },
    { size: 20, from: 46, to: 58, easyRounds: 4, hardRounds: 11 },
    { size: 25, from: 58, to: 70, easyRounds: 5, hardRounds: 13 },
    { size: 30, from: 70, to: 82, easyRounds: 6, hardRounds: 14 },
    { size: 35, from: 82, to: 92, easyRounds: 7, hardRounds: 16 },
    { size: 40, from: 92, to: 100, easyRounds: 8, hardRounds: 18 },
  ],

  /** The share of cells that are filled is picked at random between these. */
  minFill: 0.48,
  maxFill: 0.68,
  /** How many grids the generator tries before keeping the closest to the target. */
  attempts: 120,

  /** When a line's clue is complete, cross out its remaining cells for her. */
  autoCross: true,
  /**
   * When a wrong square turns red, unless she changes it in Options:
   *   'never'   squares are never marked; a clue turns red when its line cannot work
   *   'always'  as soon as it is entered
   */
  mistakes: 'never' as 'never' | 'always',
  /** With 'never': offer to show the slips once this many wrong squares are sitting unnoticed. */
  offerRevealAfter: 3,
};

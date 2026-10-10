// Everything about nonograms that is a matter of taste rather than rules.

import type { AdaptiveTuning } from '../../kit/adaptive';

export const tuning = {
  /** Difficulty runs from 0 to 100, the same scale idea as every other game. */
  adaptive: {
    startLevel: 30,
    floor: 5,
    ceiling: 96,
    startStep: 8,
    minStep: 2,
    silentWeight: 0.4,
    breatherPercent: 12,
    stretchPercent: 12,
    breatherBy: 9,
    stretchBy: 6,
  } satisfies AdaptiveTuning,

  /**
   * Grid size by level. Within a size, a puzzle scores higher the more times
   * the lines have to be gone over to finish it: `easyRounds` scores `from`,
   * `hardRounds` scores `to`.
   */
  bands: [
    { size: 5, from: 5, to: 16, easyRounds: 1, hardRounds: 4 },
    { size: 8, from: 16, to: 32, easyRounds: 2, hardRounds: 6 },
    { size: 10, from: 32, to: 54, easyRounds: 2, hardRounds: 8 },
    { size: 12, from: 54, to: 72, easyRounds: 3, hardRounds: 9 },
    { size: 15, from: 72, to: 100, easyRounds: 3, hardRounds: 11 },
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
  showTimer: false,
};

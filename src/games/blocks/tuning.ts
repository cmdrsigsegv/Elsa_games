// Everything about the block game that is a matter of taste rather than rules.

import type { AdaptiveTuning } from '../../kit/adaptive';

export const tuning = {
  /**
   * There is no puzzle to make harder, so the level sets how kind the dealt
   * pieces are: at 0 nearly every piece is picked to suit the board, at 100
   * they come as they fall, and more of them are big.
   */
  adaptive: {
    startLevel: 35,
    floor: 5,
    ceiling: 95,
    startStep: 8,
    minStep: 2,
    silentWeight: 0.4,
    breatherPercent: 0,
    stretchPercent: 0,
    breatherBy: 0,
    stretchBy: 0,
  } satisfies AdaptiveTuning,

  size: 8,
  /** For each piece dealt, this many are drawn and, on a kind deal, the one that suits the board best is kept. */
  drawn: 4,
  /** Below this level a deal always includes a piece that fits, if any piece does. */
  alwaysPlayableBelow: 70,

  /** Points: one per cell placed, plus this times lines cleared, times (lines cleared + clears in a row before it). */
  linePoints: 10,
};

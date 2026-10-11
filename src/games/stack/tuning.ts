// Everything about the block game that is a matter of taste rather than rules.

import type { AdaptiveTuning } from '../../kit/adaptive';

export const tuning = {
  /**
   * There is no puzzle to make harder, so the level sets how fast blocks
   * arrive: at 0 one short block a round, at 100 up to three, and longer.
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

  width: 8,
  height: 10,
  /** The well starts with this many rows already in it, each with gaps. */
  startRows: 3,

  /** Points for each row cleared: this, times its place in the chain reaction (first, second, ...). */
  rowPoints: 10,
};

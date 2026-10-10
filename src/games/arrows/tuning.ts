// Everything about the arrow puzzle that is a matter of taste rather than rules.

import type { AdaptiveTuning } from '../../kit/adaptive';

export const tuning = {
  adaptive: {
    startLevel: 32,
    floor: 3,
    ceiling: 98,
    startStep: 8,
    minStep: 2,
    silentWeight: 0.4,
    breatherPercent: 12,
    stretchPercent: 12,
    breatherBy: 9,
    stretchBy: 6,
  } satisfies AdaptiveTuning,

  /**
   * Board size by level. Within a size, a board scores higher the smaller the
   * share of its arrows that can leave at the start: `easyFree` scores `from`,
   * `hardFree` scores `to`.
   */
  bands: [
    { w: 5, h: 6, from: 3, to: 15, easyFree: 0.6, hardFree: 0.25 },
    { w: 6, h: 8, from: 15, to: 30, easyFree: 0.55, hardFree: 0.2 },
    { w: 8, h: 10, from: 30, to: 48, easyFree: 0.5, hardFree: 0.2 },
    { w: 10, h: 13, from: 48, to: 66, easyFree: 0.5, hardFree: 0.22 },
    { w: 12, h: 16, from: 66, to: 83, easyFree: 0.5, hardFree: 0.22 },
    { w: 14, h: 19, from: 83, to: 100, easyFree: 0.5, hardFree: 0.22 },
  ],

  /** Arrows are between two cells and this many cells long. */
  longest: 9,
  /** How likely an arrow's body is to carry straight on rather than bend, 0 to 1. */
  straightness: 0.55,
  /** How many boards the generator makes before keeping the closest to the target. */
  attempts: 80,

  /** Whether sending an arrow into another counts as a mistake for the adaptive difficulty. */
  bumpsCount: true,
};

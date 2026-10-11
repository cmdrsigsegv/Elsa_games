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
   * Board size and longest arrow by level. Bigger boards with longer, more
   * winding arrows make each arrow's way out harder to trace. Within a size,
   * a board scores higher the smaller the share of its arrows that can leave
   * at the start: `easyFree` scores `from`, `hardFree` scores `to`.
   */
  bands: [
    { w: 7, h: 9, longest: 7, from: 3, to: 15, easyFree: 0.6, hardFree: 0.3 },
    { w: 9, h: 12, longest: 10, from: 15, to: 30, easyFree: 0.5, hardFree: 0.22 },
    { w: 12, h: 16, longest: 14, from: 30, to: 48, easyFree: 0.42, hardFree: 0.16 },
    { w: 15, h: 20, longest: 18, from: 48, to: 66, easyFree: 0.36, hardFree: 0.16 },
    { w: 18, h: 24, longest: 22, from: 66, to: 83, easyFree: 0.34, hardFree: 0.15 },
    { w: 21, h: 28, longest: 26, from: 83, to: 100, easyFree: 0.32, hardFree: 0.13 },
  ],

  /** How likely an arrow's body is to carry straight on rather than bend, 0 to 1. */
  straightness: 0.5,
  /** At the easy end of a size, up to this share of the arrows are lifted out to loosen the knot. */
  mostLoosening: 0.3,
  /** How many boards the generator makes before keeping the closest to the target. */
  attempts: 12,

  /** Sending an arrow into another costs a life; with none left the puzzle is lost. */
  lives: 3,
};

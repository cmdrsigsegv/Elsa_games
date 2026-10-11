// Everything about the arrow puzzle that is a matter of taste rather than rules.

export const tuning = {
  /**
   * Board size and longest arrow by level. Within a size, a knot scores
   * higher the more traps it has: moments on the way to clearing it where a
   * wrong tap locks it for good. `hardTraps` or more scores `to`. A knot that
   * cannot be undone without first nudging arrows forward to make room counts
   * as having `nudgeWorth` more.
   */
  bands: [
    { w: 5, h: 5, longest: 4, from: 0, to: 20, hardTraps: 3 },
    { w: 6, h: 6, longest: 5, from: 20, to: 45, hardTraps: 5 },
    { w: 7, h: 7, longest: 6, from: 45, to: 70, hardTraps: 7 },
    { w: 8, h: 8, longest: 7, from: 70, to: 100, hardTraps: 9 },
  ],

  /** How likely an arrow's body is to carry straight on rather than bend, 0 to 1. */
  straightness: 0.45,
  nudgeWorth: 2,
  /** How many knots the generator ties before keeping the closest to the target. */
  attempts: 30,
  /**
   * Checking a knot means searching its positions. These cap the search: for
   * one knot, and for all the knots tried for one puzzle. Higher makes better
   * puzzles, and makes her wait longer for them.
   */
  searchPerKnot: 6000,
  searchPerPuzzle: 90_000,
};

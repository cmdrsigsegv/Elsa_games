// Everything about Bridges that is a matter of taste rather than rules.

export const tuning = {
  /** The grid at level 0 and at level 100, in cells. Taller than wide, like the phone. */
  smallest: { cols: 6, rows: 7 },
  largest: { cols: 11, rows: 15 },
  /** The most islands, as a share of the cells. The builder usually runs out of room a little before this. */
  crowding: 0.3,
  /** How often a new bridge is a double one. */
  doubles: 0.4,
  /** How often a bridge that reaches an island already there joins it, making a loop. */
  loops: 0.5,
  /** How many times in a row the builder may fail to place an island before it calls the map full. */
  patience: 200,

  /**
   * How much reasoning the hardest puzzle asks for. One "joining" deduction
   * (a group must not close itself off) counts 1 and one "what-if" deduction
   * counts `whatIfWeight`. The amount asked for grows with the square of the
   * level, so the easy levels stay gentle and the last ones are fierce.
   */
  topEffort: 30,
  whatIfWeight: 3,
  /** Below this level a puzzle never needs a what-if. */
  whatIfFrom: 50,
  /** A puzzle within this much of the effort asked for is good enough. */
  nearEnough: 1,

  /**
   * How long the generator may search, counted in what-ifs the solver tries
   * (so that the same seed stops at the same place on every machine). Each
   * map gets `workPerMap`; if that is not enough, another map is built, up
   * to `maps` of them, and the closest puzzle found is used.
   */
  workPerMap: 12000,
  maps: 4,
};

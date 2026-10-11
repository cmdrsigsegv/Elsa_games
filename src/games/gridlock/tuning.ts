// Everything about Gridlock that is a matter of taste rather than rules.

export const tuning = {
  /**
   * Difficulty is the fewest slides that solve the puzzle: `easiest` slides
   * at level 0, `hardest` at level 100, evenly in between.
   */
  easiest: 3,
  hardest: 26,

  /** How many cars and lorries share the car park with the red car, fewest and most. */
  fewestCars: 9,
  mostCars: 13,
  /** Out of 100 vehicles, how many are lorries (three cells long). */
  lorryPercent: 30,
  /** How many car parks the generator tries before keeping the closest to the target. */
  attempts: 14,
  /** Hard puzzles are rare, so higher levels get this many more tries per level. */
  extraAttemptsPerLevel: 0.5,
  /** A car park with more reachable positions than this is skipped: too slow to search on a phone. */
  mostPositions: 12_000,
};

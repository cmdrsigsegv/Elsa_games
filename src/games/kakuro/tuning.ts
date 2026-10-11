// Everything about kakuro that is a matter of taste rather than rules.

export const tuning = {
  /** Remove a number from the notes in a cell's two runs when it is filled in. */
  tidyNotes: true,

  /**
   * The white part of the grid is this many cells a side at each level, with
   * a straight line between the levels given. The clue row and column come on top.
   */
  sides: [
    { level: 0, side: 4 },
    { level: 40, side: 7 },
    { level: 100, side: 13 },
  ],
  /** The longest run allowed, at level 0 and at level 100. Long runs have many more ways to add up. */
  longestRun: { easy: 4, hard: 9 },
  /** The share of the white part's cells that are made black. Fewer, and big grids take too long to make. */
  blackShare: 0.3,

  /**
   * The hardest technique a puzzle may need, by level: `tier` applies from
   * `from` upwards. The tiers are listed in solve.ts.
   */
  tiers: [
    { from: 0, tier: 1 },
    { from: 22, tier: 2 },
    { from: 44, tier: 3 },
    { from: 57, tier: 4 },
    { from: 70, tier: 5 },
    { from: 86, tier: 6 },
  ],
  /** The "every filling of this run" technique counts as the easier kind when this many cells or fewer are open. */
  shortFilling: 4,

  /**
   * Out of 100 runs, how many are first filled with mostly small or mostly
   * large digits. Such runs have sums that few sets of digits can make, which
   * is what lets a big grid end up with a single answer.
   */
  leaning: 70,

  /** How many puzzles the generator makes before keeping the closest to the target. */
  attempts: 6,
  /** Stop early once a puzzle scores this close to the target. */
  closeEnough: 3,
  /** How many changes of a digit may be tried on one filled grid to give it a single answer. */
  repairs: 400,
  /** Give a grid up when this many changes in a row have brought it no nearer. */
  patience: 60,
  /** Once this many changes have been tried in all, the best puzzle so far is kept. This is what bounds the time taken. */
  work: 1000,
  /** Out of 100 of those changes, how many are made beside an unsettled cell rather than in it. */
  neighbourShare: 30,
  /** Out of 100 changes, how many are kept even if they leave things a little worse, and how much worse. */
  slipChance: 10,
  slipBy: 10,
};

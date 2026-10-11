// Everything about Tents and Trees that is a matter of taste rather than rules.

export const tuning = {
  /**
   * Grid size and how clever she has to be, by level. A band covers the
   * levels from its `from` up to the next band's.
   *
   * `depth` is the hardest kind of step the puzzle may need, and a puzzle
   * that never needs it is passed over when a better one turns up:
   *   1  grass where no tree is near, a clue already met, a line with
   *      exactly enough room, and no tents next to a tent
   *   2  pairing: a tree with one place left for its tent, a tent that can
   *      only belong to one tree, a cell whose trees all have their tents
   *   3  a line that needs every tent it can possibly hold, and the corner
   *      cell that touches both places a tree's tent could go
   *   4  writing out every way a line's tents could still be arranged and
   *      keeping what all of them agree on, in that line and the two beside it
   *
   * `ways` is how many arrangements of one line she may be asked to hold in
   * her head for a depth 4 step (depth 3 is the same idea with at most
   * `tightWays`). `easy` and `hard` are how many steps of the band's depth
   * make a puzzle score at the bottom and at the top of the band.
   */
  bands: [
    { from: 0, w: 5, h: 5, depth: 1, ways: 0, easy: 1, hard: 3 },
    { from: 12, w: 6, h: 6, depth: 2, ways: 0, easy: 1, hard: 2 },
    { from: 26, w: 7, h: 7, depth: 2, ways: 0, easy: 1, hard: 3 },
    { from: 40, w: 8, h: 8, depth: 2, ways: 0, easy: 1, hard: 3 },
    { from: 46, w: 8, h: 9, depth: 3, ways: 0, easy: 1, hard: 3 },
    { from: 52, w: 9, h: 10, depth: 3, ways: 0, easy: 1, hard: 4 },
    { from: 58, w: 10, h: 11, depth: 3, ways: 0, easy: 2, hard: 5 },
    { from: 64, w: 11, h: 12, depth: 4, ways: 6, easy: 1, hard: 4 },
    { from: 70, w: 12, h: 13, depth: 4, ways: 8, easy: 2, hard: 5 },
    { from: 76, w: 13, h: 14, depth: 4, ways: 10, easy: 2, hard: 6 },
    { from: 82, w: 14, h: 15, depth: 4, ways: 12, easy: 3, hard: 7 },
    { from: 88, w: 15, h: 16, depth: 4, ways: 16, easy: 4, hard: 9 },
    { from: 94, w: 16, h: 17, depth: 4, ways: 20, easy: 5, hard: 9 },
    { from: 97, w: 16, h: 18, depth: 4, ways: 24, easy: 7, hard: 10 },
  ],
  /** The most arrangements of a line that count as "needs every tent it can hold" (depth 3). */
  tightWays: 3,

  /** About this share of the cells hold a tent (and as many hold a tree). */
  tentShare: 0.2,
  /**
   * How many grids the generator tries before keeping the closest to the
   * target. It stops sooner when one lands on the target. Only the very top
   * levels use them all; this is what sets the longest wait for a puzzle.
   */
  attempts: 400,
};

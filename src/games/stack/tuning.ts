// Everything about the block game that is a matter of taste rather than rules.

export const tuning = {
  width: 8,
  height: 10,
  /** The well starts with this many rows already in it, each with gaps. */
  startRows: 3,

  /**
   * How many blocks drop each round. There is always one; each of these is
   * the chance of one more, as [chance at level 0, chance at level 100].
   */
  extraBlocks: [
    [0.55, 1],
    [0.1, 0.9],
    [0, 0.5],
  ],
  /**
   * How likely each length of block is, shortest first, as [weight at level
   * 0, weight at level 100]. Long blocks are harder to place.
   */
  lengths: [
    [1.2, 0.5],
    [1.2, 1],
    [0.7, 1.3],
    [0.3, 1.1],
  ],

  /** Points for each row cleared: this, times its place in the chain reaction (first, second, ...). */
  rowPoints: 10,
};

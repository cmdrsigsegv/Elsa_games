// Everything about the screw game that is a matter of taste rather than rules.

/** A value that changes evenly with level: [value at level 0, value at level 100]. */
type ByLevel = [number, number];

export const tuning = {
  /** How many plates are stacked up. */
  plates: [5, 26] as ByLevel,
  /** How many screw colours there are. */
  colours: [3, 9] as ByLevel,
  /** How many spare holes she has. Fewer is much harder. */
  holes: [6, 3] as ByLevel,
  /**
   * How full the spare holes get on the winning way the generator found, as a
   * share of them: the nearer to full, the less room for a wrong choice.
   */
  squeeze: [0.3, 1] as ByLevel,

  /** Screws are never closer together than this, in board units, so each can be tapped. */
  screwGap: 9,
  /** How many layouts and box orders the generator tries before keeping the best. */
  layouts: 6,
  orders: 40,
};

export const at = ([from, to]: ByLevel, level: number) => from + ((to - from) * level) / 100;

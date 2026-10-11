// Everything about the liquid-sorting game that is a matter of taste rather than rules.

export const tuning = {
  /** Difficulty is the number of colours: this many at level 0, rising to `mostColours` at level 100. */
  fewestColours: 3,
  mostColours: 12,
  /** How many empty vials she has to work with. Fewer is much harder. */
  emptyVials: 2,
  /** How many fillings the generator tries before giving up on a seed. */
  attempts: 40,
};

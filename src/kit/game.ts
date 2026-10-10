// The contract every game implements. The shell and the kit know games only
// through this, so adding a game never means changing them.

import type { ComponentType } from 'preact';
import type { AdaptiveTuning } from './adaptive';

/** What every puzzle carries, whatever the game. */
export interface PuzzleBase {
  seed: number;
  /** Difficulty on the game's own 0 to 100 scale. */
  score: number;
}

/** What the kit hands a game's screen. */
export interface ViewProps<P, S, M> {
  puzzle: P;
  state: S;
  ended: boolean;
  play(move: M): void;
  undo(): void;
  canUndo: boolean;
  /** Tells the kit a hint was used; hints feed the adaptive difficulty. */
  countHint(): void;
}

// `any` by default so games of different types can sit in one list.
export interface Game<P extends PuzzleBase = any, S = any, M = any> {
  /** Also the key for its name in strings.ts and its generator in generators.ts. */
  id: string;
  adaptive: AdaptiveTuning;
  showTimer: boolean;

  // Rules: pure functions, no drawing.
  start(puzzle: P): S;
  /** Returns the same state object when the move changes nothing. */
  apply(puzzle: P, state: S, move: M): S;
  status(puzzle: P, state: S): { ended: boolean };
  isMistake(puzzle: P, state: S, move: M): boolean;

  /** The board and its controls. */
  View: ComponentType<ViewProps<P, S, M>>;
}

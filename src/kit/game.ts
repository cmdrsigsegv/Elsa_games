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

/**
 * A choice she can change from the Options sheet while playing. The words for
 * it are in strings.ts under options.<game id>.<key>.
 */
export interface OptionDef {
  key: string;
  choices: string[];
  initial: string;
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
  /** Her current choice for each of the game's options, by key. */
  options: Record<string, string>;
}

// `any` by default so games of different types can sit in one list.
export interface Game<P extends PuzzleBase = any, S = any, M = any> {
  /** Also the key for its name in strings.ts and its generator in generators.ts. */
  id: string;
  adaptive: AdaptiveTuning;
  options: OptionDef[];

  // Rules: pure functions, no drawing.
  start(puzzle: P): S;
  /** Returns the same state object when the move changes nothing. */
  apply(puzzle: P, state: S, move: M): S;
  /** `lost` marks an ending that is a defeat (out of lives, no room left) rather than a solution. */
  status(puzzle: P, state: S): { ended: boolean; lost?: boolean };
  isMistake(puzzle: P, state: S, move: M): boolean;

  /**
   * For a game that is lost rather than solved: the closing sheet says
   * "Game over" and shows this line in place of the time taken.
   */
  endSummary?(puzzle: P, state: S): string;
  /**
   * What the adaptive difficulty compares from game to game in place of the
   * time taken. Lower means it went better than usual.
   */
  effort?(puzzle: P, state: S): number;

  /** The board and its controls. */
  View: ComponentType<ViewProps<P, S, M>>;
}

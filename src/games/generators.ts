// Puzzle generators by game id. Kept apart from games/index.ts so the
// background worker can load the generators without any screen code.

import type { PuzzleBase } from '../kit/game';
import { generate as arrows } from './arrows/generate';
import { generate as gridlock } from './gridlock/generate';
import { generate as nonogram } from './nonogram/generate';
import { generate as stack } from './stack/rules';
import { generate as sudoku } from './sudoku/generate';

export const generators: Record<string, (seed: number, target: number) => PuzzleBase> = {
  sudoku,
  nonogram,
  arrows,
  stack,
  gridlock,
};

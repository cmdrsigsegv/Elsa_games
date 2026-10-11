// Puzzle generators by game id. Kept apart from games/index.ts so the
// background worker can load the generators without any screen code.

import type { PuzzleBase } from '../kit/game';
import { generate as gridlock } from './gridlock/generate';
import { generate as nonogram } from './nonogram/generate';
import { generate as pour } from './pour/generate';
import { generate as stack } from './stack/rules';
import { generate as screws } from './screws/generate';
import { generate as bridges } from './bridges/generate';
import { generate as tents } from './tents/generate';
import { generate as binairo } from './binairo/generate';
import { generate as killer } from './killer/generate';
import { generate as kakuro } from './kakuro/generate';
import { generate as sudoku } from './sudoku/generate';

export const generators: Record<string, (seed: number, target: number) => PuzzleBase> = {
  sudoku,
  kakuro,
  killer,
  binairo,
  tents,
  bridges,
  screws,
  nonogram,
  stack,
  pour,
  gridlock,
};

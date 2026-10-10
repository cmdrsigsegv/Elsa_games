import type { Game } from '../../kit/game';
import type { SudokuPuzzle } from './generate';
import { apply, isMistake, start, status, type SudokuMove, type SudokuState } from './rules';
import { tuning } from './tuning';
import { View } from './View';

export const sudoku: Game<SudokuPuzzle, SudokuState, SudokuMove> = {
  id: 'sudoku',
  adaptive: tuning.adaptive,
  showTimer: tuning.showTimer,
  options: [{ key: 'mistakes', choices: ['obvious', 'always'], initial: tuning.mistakes }],
  start,
  apply,
  status,
  isMistake,
  View,
};
